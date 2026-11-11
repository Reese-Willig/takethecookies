import { normalizeMove } from 'chessops/chess'
import { chessgroundDests } from 'chessops/compat'
import { makeSanAndPlay } from 'chessops/san'
import { makeSquare, makeUci, parseSquare, parseUci, opposite } from 'chessops/util'
import { defaultPosition, type Position } from 'chessops/variant'
import type { Color, DropMove, NormalMove, Piece, Role, Rules, Square, SquareName } from 'chessops/types'

export type { Color, Piece, Role, Rules, Square, SquareName, Position }

export type DrawbackCardId = 'vegan' | 'agoraphobia' | 'monarchy' | 'leftwing' | 'checkers' | 'vegetables' | 'distancing' | 'tunnel' | 'escort' | 'gravity' | 'lightweight' | 'sumo'
export interface DrawbackCard { id: DrawbackCardId; name: string; tier: 'minor' | 'intermediate' | 'extreme'; rule: string }
export const DRAWBACK_CARDS: DrawbackCard[] = [
  { id: 'vegan', name: 'Vegan', tier: 'minor', rule: 'Bishops cannot capture.' }, { id: 'agoraphobia', name: 'Agoraphobia', tier: 'minor', rule: 'Your king cannot pass your third rank.' }, { id: 'monarchy', name: 'Monarchy Only', tier: 'minor', rule: 'Your queen must share a rank or file with your king.' }, { id: 'leftwing', name: 'Left-Wing Politics', tier: 'minor', rule: 'e–h pieces freeze until a–d makes a capture.' },
  { id: 'checkers', name: 'Checkers', tier: 'intermediate', rule: 'Any available capture is mandatory.' }, { id: 'vegetables', name: 'Eat Your Vegetables', tier: 'intermediate', rule: 'No major/minor captures while the opponent has more than four pawns.' }, { id: 'distancing', name: 'Social Distancing', tier: 'intermediate', rule: 'Non-captures cannot land adjacent to enemies.' }, { id: 'tunnel', name: 'Tunnel Vision', tier: 'intermediate', rule: 'Reuse the same piece next turn when possible.' }, { id: 'escort', name: 'Royal Escort', tier: 'intermediate', rule: 'Knights and bishops must finish adjacent to your king.' },
  { id: 'gravity', name: 'Heavyweight', tier: 'extreme', rule: 'Pieces cannot move backward.' }, { id: 'lightweight', name: 'Pawn Sacrifice', tier: 'extreme', rule: 'Only pawns can capture.' }, { id: 'sumo', name: 'Sumo Wrestling', tier: 'extreme', rule: 'Only captures may enter enemy territory.' },
]
export const drawbackCardsForLevel = (level: number) => DRAWBACK_CARDS.filter((card) => level <= 3 ? card.tier === 'minor' : level <= 7 ? card.tier === 'intermediate' : card.tier === 'extreme')

export type CustomVariantId = 'chess960' | 'fogofwar' | 'checkless' | 'absorption' | 'takeback' | 'selfcapture' | 'drawback' | 'mandatoryep'
export type VariantId = Rules | CustomVariantId

export const VARIANT_LABELS: Record<VariantId, string> = {
  chess: 'Standard', antichess: 'Antichess', kingofthehill: 'King of the Hill', atomic: 'Atomic Chess', crazyhouse: 'Crazyhouse', horde: 'Horde', '3check': 'Three-Check', racingkings: 'Racing Kings', chess960: 'Chess 960', fogofwar: 'Fog of War', checkless: 'Checkless Chess', absorption: 'Absorption Chess', takeback: 'Take-Back Chess', selfcapture: 'Self-Capture Chess', drawback: 'Drawback Chess', mandatoryep: 'Mandatory En Passant',
}

/** The installed chessops board is 8x8. Custom entries retain their own identity in the UI and transport while using the standard legal-move core until a dedicated board geometry is selected. */
export const engineVariant = (variant: VariantId): Rules =>
  variant === 'chess960' || variant === 'fogofwar' || variant === 'checkless' || variant === 'absorption' || variant === 'takeback' || variant === 'selfcapture' || variant === 'drawback' || variant === 'mandatoryep' ? 'chess' : variant

export interface VariantInfo {
  id: VariantId
  name: string
  short: string
  tagline: string
  rules: string[]
}

export const VARIANTS: VariantInfo[] = [
  {
    id: 'chess',
    name: 'Standard',
    short: 'STD',
    tagline: 'The classical game. Checkmate the enemy king.',
    rules: ['Checkmate wins the game.', 'Stalemate and insufficient material are draws.', 'Castling and en passant apply.'],
  },
  {
    id: 'antichess',
    name: 'Antichess',
    short: 'ANT',
    tagline: 'Lose every piece to win. Captures are compulsory.',
    rules: [
      'If you can capture, you must.',
      'The king has no royal power and can be captured.',
      'Lose all your pieces, or get stalemated, to win.',
    ],
  },
  {
    id: 'kingofthehill', name: 'King of the Hill', short: 'KOH', tagline: 'March your king to the centre four squares.', rules: ['Standard rules apply.', 'Reach d4, e4, d5 or e5 with your king to win instantly.'],
  },
  { id: 'atomic', name: 'Atomic Chess', short: 'ATOM', tagline: 'Captures explode the surrounding pieces.', rules: ['Captures trigger a one-square explosion.', 'Pawns survive adjacent explosions.'] },
  { id: 'crazyhouse', name: 'Crazyhouse', short: 'CRAZY', tagline: 'Captured pieces return as drops.', rules: ['Captured pieces enter your pocket.', 'Drop a pocket piece onto any empty square.'] },
  { id: 'horde', name: 'Horde', short: 'HORDE', tagline: 'Thirty-six pawns against a full army.', rules: ['White wins by checkmating Black.', 'Black wins by capturing every white pawn.'] },
  { id: '3check', name: 'Three-Check', short: '3CHK', tagline: 'Give check three times to win.', rules: ['Standard chess rules apply.', 'Three checks wins instantly.'] },
  { id: 'racingkings', name: 'Racing Kings', short: 'RACE', tagline: 'Race your king to the eighth rank.', rules: ['Checks are illegal.', 'Reach the eighth rank first to win.'] },
  { id: 'chess960', name: 'Chess 960', short: '960', tagline: 'Fischer Random castling and a shuffled back rank.', rules: ['Back-rank pieces start in a randomized legal order.', 'Castling keeps the standard Chess 960 destinations.'] },
  { id: 'fogofwar', name: 'Fog of War', short: 'FOG', tagline: 'Only squares visible to your army remain clear.', rules: ['Hidden squares are covered by a tactical fog.', 'Capture the opposing king to win.'] },
  { id: 'checkless', name: 'Checkless Chess', short: 'SAFE', tagline: 'Checks are forbidden unless they are checkmate.', rules: ['A move that gives check is illegal.', 'Checkmate remains an immediate win.'] },
  { id: 'absorption', name: 'Absorption Chess', short: 'ABS', tagline: 'Captures permanently add the captured piece’s abilities.', rules: ['A capturing piece keeps the captured movement abilities.', 'Compound movement grows throughout the game.'] },
  { id: 'takeback', name: 'Take-Back Chess', short: 'UNDO', tagline: 'Spend one of three tokens to rewind the last move.', rules: ['Three undo tokens per player.', 'Only the player whose opponent just moved may rewind.'] },
  { id: 'selfcapture', name: 'Self-Capture Chess', short: 'SELF', tagline: 'Same-color pieces may capture one another.', rules: ['Friendly pieces of the same color may be captured.', 'The captured piece is removed normally.'] },
  { id: 'drawback', name: 'Drawback Chess', short: 'FREEZE', tagline: 'Capturing pieces sit out their next turn.', rules: ['A capturing piece is frozen for one turn.', 'Frozen pieces are visibly dimmed.'] },
  { id: 'mandatoryep', name: 'Mandatory En Passant', short: 'EN PASSANT', tagline: 'En passant opportunities must be taken.', rules: ['A legal en passant capture overrides every other move.', 'Normal moves return after the opportunity expires.'] },
]

export const getVariant = (id: VariantId) => VARIANTS.find((v) => v.id === id) ?? VARIANTS[0]

export const HILL_SQUARES: Square[] = ['d4', 'e4', 'd5', 'e5'].map((s) => parseSquare(s as SquareName))

export interface MoveRecord {
  uci: string
  san: string
  color: Color
  from?: Square
  to: Square
  role?: Role
  captured?: Role
}

export interface GameResult {
  winner?: Color
  reason: string
}

export const ROLE_VALUES: Record<Role, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 0,
}

function chess960BackRank(seed = Math.floor(Math.random() * 960)): Role[] {
  const pieces: Role[] = Array(8).fill('rook')
  const dark = [0, 2, 4, 6]
  const light = [1, 3, 5, 7]
  const bishopDark = dark[seed % dark.length]
  seed = Math.floor(seed / dark.length)
  const bishopLight = light[seed % light.length]
  seed = Math.floor(seed / light.length)
  pieces[bishopDark] = 'bishop'
  pieces[bishopLight] = 'bishop'
  const empty = () => pieces.map((p, i) => (p === 'rook' && ![bishopDark, bishopLight].includes(i) ? i : -1)).filter((i) => i >= 0)
  const queenIndex = seed % 6
  const queenSquare = empty()[queenIndex]
  pieces[queenSquare] = 'queen'
  seed = Math.floor(seed / 6)
  const knights = empty()
  const knightA = knights[seed % 5]
  pieces[knightA] = 'knight'
  seed = Math.floor(seed / 5)
  const knightB = empty()[seed % 4]
  pieces[knightB] = 'knight'
  const remaining = empty()
  pieces[remaining[0]] = 'rook'
  pieces[remaining[1]] = 'king'
  pieces[remaining[2]] = 'rook'
  return pieces
}

function setupChess960(pos: Position, seed: number) {
  const backRank = chess960BackRank(seed)
  for (let file = 0; file < 8; file++) {
    pos.board.take(file)
    pos.board.take(56 + file)
    pos.board.set(file, { color: 'white', role: backRank[file] })
    pos.board.set(56 + file, { color: 'black', role: backRank[file] })
  }
  return pos
}

export function createPosition(variant: VariantId, seed = 517): Position {
  const pos = defaultPosition(engineVariant(variant))
  return variant === 'chess960' ? setupChess960(pos, seed) : pos
}

function playSelfCapture(pos: Position, move: NormalMove) {
  const mover = pos.board.get(move.from)
  const target = pos.board.get(move.to)
  if (!mover || mover.role === 'king' || !target || target.color !== mover.color || target.role === 'king') return false
  pos.board.take(move.to)
  pos.board.take(move.from)
  pos.board.set(move.to, mover)
  pos.turn = pos.turn === 'white' ? 'black' : 'white'
  return true
}

function playSelfCaptureCastle(pos: Position, move: NormalMove) {
  const king = pos.board.get(move.from)
  if (!king || king.role !== 'king' || Math.abs(move.to - move.from) !== 2) return false
  const rank = king.color === 'white' ? 0 : 7
  const kingTo = move.to > move.from ? rank * 8 + 6 : rank * 8 + 2
  const rookFrom = move.to > move.from ? rank * 8 + 7 : rank * 8
  const rookTo = move.to > move.from ? rank * 8 + 5 : rank * 8 + 3
  const rook = pos.board.get(rookFrom)
  if (!rook || rook.role !== 'rook' || rook.color !== king.color) return false
  pos.board.take(move.from); pos.board.take(rookFrom); pos.board.take(kingTo); pos.board.take(rookTo)
  pos.board.set(kingTo, king); pos.board.set(rookTo, rook)
  pos.turn = pos.turn === 'white' ? 'black' : 'white'
  return true
}

export function replay(variant: VariantId, moves: MoveRecord[], seed = 517): Position {
  const pos = createPosition(variant, seed)
  for (const m of moves) {
    const move = parseUci(m.uci)
    if (!move) continue
    const mover = 'from' in move ? pos.board.get(move.from) : undefined
    const isCastling = 'from' in move && mover?.role === 'king' && Math.abs(move.to - move.from) === 2
    if (variant === 'selfcapture' && isCastling && playSelfCaptureCastle(pos, move)) continue
    if (variant === 'selfcapture' && 'from' in move && playSelfCapture(pos, move)) continue
    pos.play(move)
  }
  return pos
}

function absorptionAbilities(moves: MoveRecord[]) {
  const abilities = new Map<Square, Set<Role>>()
  for (const move of moves) {
    if (move.from === undefined) continue
    const inherited = new Set(abilities.get(move.from) ?? [])
    if (move.captured) inherited.add(move.captured)
    abilities.delete(move.from)
    abilities.set(move.to, inherited)
  }
  return abilities
}

function abilityDests(pos: Position, from: Square, roles: Set<Role>): Square[] {
  const out = new Set<Square>()
  const file = from % 8
  const rank = Math.floor(from / 8)
  const add = (f: number, r: number, sliding = false) => {
    let x = f
    let y = r
    while (x >= 0 && x < 8 && y >= 0 && y < 8) {
      const sq = y * 8 + x
      const target = pos.board.get(sq)
      if (!target) out.add(sq)
      else { if (target.color !== pos.turn) out.add(sq); break }
      if (!sliding) break
      x += Math.sign(f - file)
      y += Math.sign(r - rank)
    }
  }
  if (roles.has('knight')) for (const [df, dr] of [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]]) add(file + df, rank + dr)
  if (roles.has('king')) for (const [df, dr] of [[1,1],[1,0],[1,-1],[0,1],[0,-1],[-1,1],[-1,0],[-1,-1]]) add(file + df, rank + dr)
  if (roles.has('pawn')) {
    const direction = pos.turn === 'white' ? 1 : -1
    const forward = (rank + direction) * 8 + file
    if (rank + direction >= 0 && rank + direction < 8 && !pos.board.get(forward)) out.add(forward)
    for (const df of [-1, 1]) {
      const target = pos.board.get((rank + direction) * 8 + file + df)
      if (target && target.color !== pos.turn) out.add((rank + direction) * 8 + file + df)
    }
  }
  if (roles.has('bishop') || roles.has('queen')) for (const [df, dr] of [[1,1],[-1,1],[1,-1],[-1,-1]]) add(file + df, rank + dr, true)
  if (roles.has('rook') || roles.has('queen')) for (const [df, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) add(file + df, rank + dr, true)
  return [...out]
}

export function dropRoles(pos: Position): Role[] {
  if (pos.rules !== 'crazyhouse' || !pos.pockets) return []
  return (['queen', 'rook', 'bishop', 'knight', 'pawn'] as Role[]).filter((role) => pos.pockets![pos.turn][role] > 0)
}

export function dropDests(pos: Position, role: Role): Square[] {
  if (pos.rules !== 'crazyhouse' || !pos.pockets || pos.pockets[pos.turn][role] === 0) return []
  return [...pos.dropDests()].filter((sq) => {
    const rank = Math.floor(sq / 8)
    return role !== 'pawn' || (rank !== 0 && rank !== 7)
  })
}

export function buildDrop(pos: Position, role: Role, to: Square): MoveRecord | null {
  const move: DropMove = { role, to }
  if (!pos.isLegal(move)) return null
  const clone = pos.clone()
  clone.play(move)
  return { uci: makeUci(move), san: `@${makeSquare(to)}`, color: pos.turn, to, role }
}

function canSelfCapture(pos: Position, from: Square, to: Square, allowEnemyKing = false): boolean {
  const piece = pos.board.get(from)
  const target = pos.board.get(to)
  if (!piece || !target || (!allowEnemyKing && target.color !== piece.color) || (allowEnemyKing && target.color === piece.color)) return false
  if (!allowEnemyKing && target.role === 'king') return false
  if (!allowEnemyKing && piece.role === 'king') return false
  const ff = from % 8, fr = Math.floor(from / 8), tf = to % 8, tr = Math.floor(to / 8)
  const df = tf - ff, dr = tr - fr
  if (piece.role === 'pawn') return Math.abs(df) === 1 && dr === (piece.color === 'white' ? 1 : -1)
  if (piece.role === 'knight') return (Math.abs(df) === 1 && Math.abs(dr) === 2) || (Math.abs(df) === 2 && Math.abs(dr) === 1)
  const diagonal = Math.abs(df) === Math.abs(dr)
  const straight = df === 0 || dr === 0
  if ((piece.role === 'bishop' && !diagonal) || (piece.role === 'rook' && !straight) || (piece.role === 'queen' && !diagonal && !straight)) return false
  const stepFile = Math.sign(df), stepRank = Math.sign(dr)
  let f = ff + stepFile, r = fr + stepRank
  while (f !== tf || r !== tr) { if (pos.board.get(r * 8 + f)) return false; f += stepFile; r += stepRank }
  return true
}

export function forcedSquares(pos: Position, variant: VariantId, moves: MoveRecord[] = []): Set<Square> {
  if (variant !== 'antichess' && variant !== 'mandatoryep') return new Set()
  const dests = legalDests(pos, variant, moves)
  if (variant === 'mandatoryep') {
    const previous = moves.at(-1)
    const epTarget = previous?.from !== undefined && previous.color !== pos.turn && previous.role === 'pawn' && Math.abs(previous.to - previous.from) === 16
      ? previous.to + (pos.turn === 'white' ? 8 : -8)
      : undefined
    if (epTarget === undefined) return new Set()
    return new Set([...dests].filter(([from, tos]) => pos.board.get(from)?.role === 'pawn' && tos.includes(epTarget)).map(([from]) => from))
  }
  const captureSources = new Set<Square>()
  for (const [from, tos] of dests) {
    if (tos.some((to) => pos.board.get(to)?.color !== undefined && pos.board.get(to)?.color !== pos.turn)) captureSources.add(from)
  }
  return captureSources
}

function drawbackAllows(pos: Position, source: Square, to: Square, card: DrawbackCard | undefined, moves: MoveRecord[], forcedCapture: boolean): boolean {
  if (!card) return true
  const piece = pos.board.get(source)
  const target = pos.board.get(to)
  if (!piece) return false
  const capture = !!target && target.color !== piece.color
  const file = source % 8, targetFile = to % 8
  const rank = Math.floor(source / 8), targetRank = Math.floor(to / 8)
  const king = [...pos.board].find(([sq, p]) => p.color === pos.turn && p.role === 'king')?.[0]
  const adjacentToKing = king !== undefined && Math.max(Math.abs((to % 8) - (king % 8)), Math.abs(Math.floor(to / 8) - Math.floor(king / 8))) <= 1
  if (forcedCapture && !capture) return false
  if (card.id === 'vegan' && piece.role === 'bishop' && capture) return false
  if (card.id === 'agoraphobia' && piece.role === 'king' && (pos.turn === 'white' ? targetRank > 2 : targetRank < 5)) return false
  if (card.id === 'monarchy' && piece.role === 'queen' && king !== undefined && targetRank !== Math.floor(king / 8) && targetFile !== king % 8) return false
  if (card.id === 'leftwing' && file >= 4 && !moves.some((m) => m.captured && m.from !== undefined && m.from % 8 < 4)) return false
  if (card.id === 'vegetables' && capture && piece.role !== 'pawn' && [...pos.board].filter(([_, p]) => p.color !== pos.turn && p.role === 'pawn').length > 4) return false
  if (card.id === 'distancing' && !capture && [...pos.board].some(([sq, p]) => p.color !== pos.turn && Math.max(Math.abs((sq % 8) - targetFile), Math.abs(Math.floor(sq / 8) - targetRank)) <= 1)) return false
  if (card.id === 'tunnel' && moves.at(-1)?.color !== pos.turn && moves.at(-1)?.to !== source && moves.at(-1)?.from !== undefined) return false
  if (card.id === 'escort' && (piece.role === 'knight' || piece.role === 'bishop') && !adjacentToKing) return false
  if (card.id === 'gravity' && (pos.turn === 'white' ? targetRank < rank : targetRank > rank)) return false
  if (card.id === 'lightweight' && capture && piece.role !== 'pawn') return false
  if (card.id === 'sumo' && !capture && (pos.turn === 'white' ? targetRank >= 4 : targetRank <= 3)) return false
  return true
}

export function legalDests(pos: Position, variant: VariantId = 'chess', moves: MoveRecord[] = [], drawbackCard?: DrawbackCard): Map<Square, Square[]> {
  const result = new Map<Square, Square[]>()
  if (pos.isEnd() && variant !== 'drawback') return result
  const standardDests = chessgroundDests(pos)
  const previous = moves.at(-1)
  const epTarget = previous?.from !== undefined && previous.color !== pos.turn && previous.role === 'pawn' && Math.abs(previous.to - previous.from) === 16
    ? previous.to + (pos.turn === 'white' ? 8 : -8)
    : undefined
  const hasLegalEp = epTarget !== undefined && [...standardDests.values()].some((tos) => tos.includes(makeSquare(epTarget)))
  const mandatoryEp = variant === 'mandatoryep' && hasLegalEp ? new Set([epTarget]) : undefined
  const forcedCapture = drawbackCard?.id === 'checkers' && [...standardDests.values()].some((targets) => targets.some((name) => {
    const target = pos.board.get(parseSquare(name))
    return target !== undefined && target.color !== pos.turn
  }))
  for (let source = 0; source < 64; source++) {
    const piece = pos.board.get(source)
    if (!piece || piece.color !== pos.turn) continue
    const tos = standardDests.get(makeSquare(source)) ?? []
    let destinations = tos.map((t) => parseSquare(t))
    if (variant === 'selfcapture' && piece.role !== 'king') {
      for (let target = 0; target < 64; target++) if (!destinations.includes(target) && canSelfCapture(pos, source, target)) destinations.push(target)
    }
    if (variant === 'drawback') {
      for (let target = 0; target < 64; target++) {
        const distance = Math.max(Math.abs((target % 8) - (source % 8)), Math.abs(Math.floor(target / 8) - Math.floor(source / 8)))
        if (piece.role === 'king' && distance === 1 && pos.board.get(target)?.color !== piece.color && !destinations.includes(target)) destinations.push(target)
        if (pos.board.get(target)?.role === 'king' && canSelfCapture(pos, source, target, true) && !destinations.includes(target)) destinations.push(target)
      }
    }
    if (variant === 'drawback' && previous?.captured && previous.to === source && previous.color === pos.turn) destinations = []
    if (mandatoryEp?.size) {
      destinations = destinations.filter((to) => mandatoryEp.has(to) && !pos.board.get(to) && Math.abs(to - source) % 8 === 1 && Math.abs(Math.floor(to / 8) - Math.floor(source / 8)) === 1)
    }
    if (variant === 'absorption') {
      const extra = abilityDests(pos, source, absorptionAbilities(moves).get(source) ?? new Set())
      for (const to of extra) if (!destinations.includes(to)) destinations.push(to)
    }
    const filtered = destinations.filter((to) => {
      if (variant === 'drawback' && !drawbackAllows(pos, source, to, drawbackCard, moves, forcedCapture)) return false
      const promotionOptions = isPromotion(pos, source, to) ? promotionRoles(variant) : [undefined]
      for (const promotion of promotionOptions) {
        const move = normalizeMove(pos, { from: source, to, promotion }) as NormalMove
        const standardLegal = pos.isLegal(move)
        const drawbackKingMove = variant === 'drawback' && (pos.board.get(to)?.role === 'king' || (pos.board.get(source)?.role === 'king' && Math.max(Math.abs((to % 8) - (source % 8)), Math.abs(Math.floor(to / 8) - Math.floor(source / 8))) === 1))
        const customLegal = (variant === 'absorption' || variant === 'selfcapture' || drawbackKingMove) && (!pos.board.get(to) || variant === 'selfcapture' || (variant === 'drawback' && pos.board.get(to)?.role === 'king') || pos.board.get(to)?.color !== pos.board.get(source)?.color)
        if (!standardLegal && !customLegal) continue
        const movingPiece = pos.board.get(source)
        const capturedPiece = pos.board.get(to)
        if (variant === 'selfcapture' && movingPiece?.role === 'king' && capturedPiece?.color === movingPiece.color) {
          const child = pos.clone()
          child.board.take(to)
          child.board.take(source)
          child.board.set(to, movingPiece)
          child.turn = child.turn === 'white' ? 'black' : 'white'
          if (child.isCheck()) continue
        }
        if (variant !== 'checkless') return true
        const child = pos.clone()
        child.play(move)
        if (!child.isCheck() || child.isCheckmate()) return true
      }
      return false
    })
    if (filtered.length) result.set(source, filtered)
  }
  return result
}

export function isPromotion(pos: Position, from: Square, to: Square): boolean {
  const piece = pos.board.get(from)
  if (!piece || piece.role !== 'pawn') return false
  const rank = Math.floor(to / 8)
  return (piece.color === 'white' && rank === 7) || (piece.color === 'black' && rank === 0)
}

export function promotionRoles(variant: VariantId): Role[] {
  const roles: Role[] = ['queen', 'rook', 'bishop', 'knight']
  return variant === 'antichess' ? [...roles, 'king'] : roles
}

/** Plays a move on a clone and returns the new record, or null if illegal. */
export function buildMove(pos: Position, from: Square, to: Square, promotion?: Role, variant: VariantId = 'chess', moves: MoveRecord[] = [], drawbackCard?: DrawbackCard): MoveRecord | null {
  const raw: NormalMove = { from, to, promotion }
  const move = normalizeMove(pos, raw) as NormalMove
  const standardLegal = pos.isLegal(move)
  const moverPiece = pos.board.get(from)
  if (variant === 'drawback' && !legalDests(pos, variant, moves, drawbackCard).get(from)?.includes(to)) return null
  if (!standardLegal) {
    const allowed = (variant === 'absorption' || variant === 'selfcapture' || variant === 'drawback') && legalDests(pos, variant, moves, drawbackCard).get(from)?.includes(to)
    if (!allowed) return null
  }

  const mover = pos.board.get(move.from)
  const target = pos.board.get(move.to)
  if (variant === 'selfcapture' && mover && target && target.color === mover.color && target.role === 'king') return null
  if (variant === 'selfcapture' && mover?.role === 'king' && target?.color === mover.color) {
    const safetyCheck = pos.clone()
    safetyCheck.board.take(to)
    safetyCheck.board.take(from)
    safetyCheck.board.set(to, mover)
    safetyCheck.turn = safetyCheck.turn === 'white' ? 'black' : 'white'
    if (safetyCheck.isCheck()) return null
  }
  let captured: Role | undefined
  if (target && mover) captured = target.role
  else if (mover?.role === 'pawn' && !target && move.from % 8 !== move.to % 8) captured = 'pawn'

  const clone = pos.clone()
  const san = standardLegal ? makeSanAndPlay(clone, move) : `${makeSquare(move.from)}-${makeSquare(move.to)}${captured ? 'x' : ''}`
  return {
    uci: makeUci(move),
    san,
    color: pos.turn,
    from: move.from,
    to: move.to,
    role: mover?.role,
    captured,
  }
}

export function getResult(pos: Position, variant: VariantId): GameResult | undefined {
  if (variant === 'drawback') return undefined
  if (!pos.isEnd()) {
    if (pos.halfmoves >= 100) return { reason: 'Fifty-move rule' }
    return undefined
  }
  const outcome = pos.outcome()
  const winner = outcome?.winner

  if (variant === 'antichess') {
    if (!winner) return { reason: 'Draw' }
    const piecesLeft = pos.board[winner].size()
    return { winner, reason: piecesLeft === 0 ? 'Gave away every piece' : 'No legal moves left' }
  }
  if (variant === 'kingofthehill' && pos.isVariantEnd()) {
    return { winner, reason: 'King reached the hill' }
  }
  if (pos.isCheckmate()) return { winner, reason: 'Checkmate' }
  if (pos.isStalemate()) return { reason: 'Stalemate' }
  if (pos.isInsufficientMaterial()) return { reason: 'Insufficient material' }
  return { winner, reason: winner ? 'Game over' : 'Draw' }
}

export function checkedKingSquare(pos: Position, variant: VariantId): Square | undefined {
  if (variant === 'antichess' || !pos.isCheck()) return undefined
  return pos.board.kingOf(pos.turn)
}

export function capturedBy(moves: MoveRecord[], color: Color): Role[] {
  const order: Role[] = ['queen', 'rook', 'bishop', 'knight', 'pawn', 'king']
  return moves
    .filter((m) => m.color === color && m.captured)
    .map((m) => m.captured as Role)
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
}

export function materialScore(roles: Role[]) {
  return roles.reduce((sum, r) => sum + ROLE_VALUES[r], 0)
}

export { makeSquare, opposite, parseUci }
