import { parseUci } from 'chessops/util'
import type { NormalMove } from 'chessops/types'
import { createPosition, type MoveRecord, type Piece, type Square, type VariantId } from './core'

export interface TrackedPiece {
  id: string
  square: Square
  piece: Piece
}

type Snapshot = Map<Square, Piece>

const snapshot = (pos: ReturnType<typeof createPosition>): Snapshot => {
  const map: Snapshot = new Map()
  for (const [sq, piece] of pos.board) map.set(sq, piece)
  return map
}

const same = (a?: Piece, b?: Piece) => !!a && !!b && a.color === b.color && a.role === b.role

/**
 * Assigns stable ids to pieces across a move list so the board can animate
 * each piece from its old square to its new one (including castling rooks).
 */
export function trackPieces(variant: VariantId, moves: MoveRecord[], seed = 517): TrackedPiece[] {
  const pos = createPosition(variant, seed)
  let ids = new Map<Square, string>()
  let counter = 0
  for (const [sq] of pos.board) ids.set(sq, `p${counter++}`)

  for (const record of moves) {
    const move = parseUci(record.uci) as NormalMove | undefined
    if (!move) continue
    const before = snapshot(pos)
    pos.play(move)
    const after = snapshot(pos)

    const vacated: Square[] = []
    for (const [sq, piece] of before) if (!same(piece, after.get(sq))) vacated.push(sq)
    const arrived: Square[] = []
    for (const [sq, piece] of after) if (!same(piece, before.get(sq))) arrived.push(sq)

    const next = new Map<Square, string>()
    for (const [sq, id] of ids) if (!vacated.includes(sq)) next.set(sq, id)

    const available = [...vacated]
    for (const sq of arrived) {
      const piece = after.get(sq)!
      let sourceIdx = available.findIndex((from) => from === move.from && (same(before.get(from), piece) || (!!move.promotion && before.get(from)?.color === piece.color)),
      )
      if (sourceIdx === -1) sourceIdx = available.findIndex((from) => same(before.get(from), piece))
      if (sourceIdx === -1) {
        next.set(sq, `p${counter++}`)
        continue
      }
      const from = available.splice(sourceIdx, 1)[0]
      next.set(sq, ids.get(from) ?? `p${counter++}`)
    }
    ids = next
  }

  const result: TrackedPiece[] = []
  for (const [sq, piece] of pos.board) result.push({ id: ids.get(sq) ?? `x${sq}`, square: sq, piece })
  return result
}
