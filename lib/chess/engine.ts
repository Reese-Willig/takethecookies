import type { NormalMove } from 'chessops/types'
import { HILL_SQUARES, ROLE_VALUES, type Color, type Position, type VariantId } from './core'

export type Difficulty = 'random' | 'easy' | 'medium' | 'hard'

export const DIFFICULTIES: { id: Difficulty; label: string; depth: number }[] = [
  { id: 'random', label: 'Random', depth: 0 },
  { id: 'easy', label: 'Easy', depth: 1 },
  { id: 'medium', label: 'Medium', depth: 2 },
  { id: 'hard', label: 'Hard', depth: 3 },
]

const MATE = 100_000

function allMoves(pos: Position): NormalMove[] {
  const moves: NormalMove[] = []
  for (const [from, dests] of pos.allDests()) {
    const piece = pos.board.get(from)
    for (const to of dests) {
      const rank = Math.floor(to / 8)
      if (piece?.role === 'pawn' && (rank === 0 || rank === 7)) {
        moves.push({ from, to, promotion: 'queen' })
        moves.push({ from, to, promotion: 'knight' })
      } else {
        moves.push({ from, to })
      }
    }
  }
  return moves
}

function centerDistance(sq: number) {
  const file = sq % 8
  const rank = Math.floor(sq / 8)
  return Math.max(Math.abs(file - 3.5), Math.abs(rank - 3.5)) - 0.5
}

function evaluate(pos: Position, variant: VariantId, perspective: Color): number {
  let score = 0
  for (const [sq, piece] of pos.board) {
    const sign = piece.color === perspective ? 1 : -1
    let value = ROLE_VALUES[piece.role] * 100
    if (piece.role === 'pawn') value += (piece.color === 'white' ? Math.floor(sq / 8) - 1 : 6 - Math.floor(sq / 8)) * 6
    if (piece.role === 'knight' || piece.role === 'bishop') value += (3 - centerDistance(sq)) * 8
    if (variant === 'kingofthehill' && piece.role === 'king') value += (3 - centerDistance(sq)) * 40
    score += sign * value
  }
  return variant === 'antichess' ? -score : score
}

function negamax(pos: Position, variant: VariantId, depth: number, alpha: number, beta: number): number {
  if (pos.isEnd()) {
    const winner = pos.outcome()?.winner
    if (!winner) return 0
    return winner === pos.turn ? MATE + depth : -MATE - depth
  }
  if (depth === 0) return evaluate(pos, variant, pos.turn)

  const moves = orderMoves(pos, allMoves(pos))
  let best = -Infinity
  for (const move of moves) {
    const child = pos.clone()
    child.play(move)
    const score = -negamax(child, variant, depth - 1, -beta, -alpha)
    if (score > best) best = score
    if (best > alpha) alpha = best
    if (alpha >= beta) break
  }
  return best
}

function orderMoves(pos: Position, moves: NormalMove[]) {
  return moves
    .map((m) => ({ m, k: (pos.board.get(m.to) ? ROLE_VALUES[pos.board.get(m.to)!.role] * 10 : 0) + (m.promotion ? 50 : 0) }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.m)
}

export function pickMove(pos: Position, variant: VariantId, difficulty: Difficulty): NormalMove | null {
  const moves = allMoves(pos)
  if (moves.length === 0) return null

  const depth = DIFFICULTIES.find((d) => d.id === difficulty)?.depth ?? 2
  if (depth === 0) return moves[Math.floor(Math.random() * moves.length)]

  for (const move of moves) {
    if (variant !== 'kingofthehill') break
    const piece = pos.board.get(move.from)
    if (piece?.role === 'king' && HILL_SQUARES.includes(move.to) && pos.isLegal(move)) return move
  }

  let bestScore = -Infinity
  let bestMoves: NormalMove[] = []
  for (const move of orderMoves(pos, moves)) {
    const child = pos.clone()
    child.play(move)
    const score = -negamax(child, variant, depth - 1, -Infinity, -bestScore + 1)
    if (score > bestScore) {
      bestScore = score
      bestMoves = [move]
    } else if (score === bestScore) {
      bestMoves.push(move)
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)] ?? moves[0]
}
