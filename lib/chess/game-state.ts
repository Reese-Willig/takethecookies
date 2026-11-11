import { drawbackCardsForLevel, getResult, opposite, replay, type Color, type DrawbackCardId, type GameResult, type MoveRecord, type VariantId } from './core'

export type GameMode = 'local' | 'online' | 'computer'

export interface PlayerSlot {
  id: string
  name: string
  kind: 'human' | 'computer'
}

export interface GameState {
  version: number
  variant: VariantId
  moves: MoveRecord[]
  players: { white: PlayerSlot | null; black: PlayerSlot | null }
  result?: GameResult
  rematchOffer?: { by: string }
  rematchDeclinedBy?: string
  rematchChoices: Record<string, number>
  gameNumber: number
  checks: { white: number; black: number }
  chess960Seed: number
  takebackTokens: { white: number; black: number }
  takebackForbidden: string[]
  drawbackLevel: number
  drawbackLevels: { white: number; black: number }
  drawbackCards: { white: DrawbackCardId; black: DrawbackCardId }
  drawbackRevealed: boolean
  started: boolean
}

export function createGame(variant: VariantId, white: PlayerSlot | null, black: PlayerSlot | null, drawbackLevel = 5, drawbackLevels = { white: drawbackLevel, black: drawbackLevel }, started = variant !== 'drawback'): GameState {
  const pick = (level: number) => { const pool = drawbackCardsForLevel(level); return pool[Math.floor(Math.random() * pool.length)].id }
  return {
    version: 1,
    variant,
    moves: [],
    players: { white, black },
    rematchChoices: {},
    gameNumber: 1,
    checks: { white: 0, black: 0 },
    chess960Seed: variant === 'chess960' ? crypto.getRandomValues(new Uint32Array(1))[0] % 960 : 517,
    takebackTokens: { white: 3, black: 3 },
    takebackForbidden: [],
    drawbackLevel,
    drawbackLevels,
    drawbackCards: { white: pick(drawbackLevels.white), black: pick(drawbackLevels.black) },
    drawbackRevealed: false,
    started,
  }
}

const bump = (state: GameState, patch: Partial<GameState>): GameState => ({
  ...state,
  ...patch,
  version: state.version + 1,
})

export function applyMove(state: GameState, move: MoveRecord): GameState {
  if (!state.started || state.result) return state
  if (state.variant === 'takeback' && (state.takebackForbidden ?? []).includes(move.uci)) return state
  const moves = [...state.moves, move]
  const kingCapture = (state.variant === 'selfcapture' || state.variant === 'drawback') && move.captured === 'king'
  const pos = kingCapture ? undefined : replay(state.variant, moves, state.chess960Seed)
  const result = kingCapture
    ? { winner: move.color, reason: `${move.color === 'white' ? 'White' : 'Black'} captured the king` }
    : pos ? getResult(pos, state.variant) : undefined
  return bump(state, { moves, result, drawbackRevealed: state.variant === 'drawback' && !!result, takebackForbidden: [] })
}

export function undoMoves(state: GameState, plies: number): GameState {
  if (state.moves.length === 0) return state
  const moves = state.moves.slice(0, Math.max(0, state.moves.length - plies))
  return bump(state, { moves, result: undefined, rematchOffer: undefined, rematchDeclinedBy: undefined })
}

export function takeback(state: GameState, color: Color): GameState {
  if (state.variant !== 'takeback' || state.moves.length === 0 || state.takebackTokens[color] <= 0) return state
  const removed = state.moves.at(-1)
  const moves = state.moves.slice(0, -1)
  return bump(state, { moves, result: undefined, takebackForbidden: removed ? [...(state.takebackForbidden ?? []), removed.uci] : state.takebackForbidden, takebackTokens: { ...state.takebackTokens, [color]: state.takebackTokens[color] - 1 } })
}

export function resign(state: GameState, color: Color): GameState {
  if (state.result) return state
  return bump(state, { result: { winner: opposite(color), reason: `${color === 'white' ? 'White' : 'Black'} resigned` } })
}

export function startGame(state: GameState): GameState {
  return bump(state, { started: true, drawbackCards: assignDrawbacks(state.drawbackLevels), drawbackRevealed: false })
}

export function offerRematch(state: GameState, playerId: string): GameState {
  return bump(state, { rematchOffer: { by: playerId }, rematchDeclinedBy: undefined, rematchChoices: {} })
}

export function declineRematch(state: GameState, playerId: string): GameState {
  return bump(state, { rematchOffer: undefined, rematchDeclinedBy: playerId, rematchChoices: {} })
}

/** Starts the next game with sides inverted: last game's White plays Black. */
function assignDrawbacks(levels: { white: number; black: number }) {
  const pick = (level: number) => { const pool = drawbackCardsForLevel(level); return pool[Math.floor(Math.random() * pool.length)].id }
  return { white: pick(levels.white), black: pick(levels.black) }
}

export function acceptRematch(state: GameState, playerId: string, level = state.drawbackLevels.white): GameState {
  const choices = { ...state.rematchChoices, [playerId]: Math.max(1, Math.min(10, level)) }
  const ids = [state.players.white?.id, state.players.black?.id].filter(Boolean) as string[]
  if (ids.length < 2 || ids.some((id) => choices[id] === undefined)) return bump(state, { rematchChoices: choices })
  const levels = { white: choices[state.players.black!.id], black: choices[state.players.white!.id] }
  return bump(state, {
    moves: [], result: undefined, rematchOffer: undefined, rematchDeclinedBy: undefined, rematchChoices: {},
    players: { white: state.players.black, black: state.players.white }, gameNumber: state.gameNumber + 1,
    checks: { white: 0, black: 0 }, chess960Seed: state.variant === 'chess960' ? crypto.getRandomValues(new Uint32Array(1))[0] % 960 : 517,
    takebackTokens: { white: 3, black: 3 }, takebackForbidden: [], drawbackLevels: levels,
    drawbackCards: assignDrawbacks(levels), drawbackRevealed: false,
  })
}

export function changeVariant(state: GameState, variant: VariantId): GameState {
  return bump(state, {
    variant,
    moves: [],
    result: undefined,
    rematchOffer: undefined,
    rematchDeclinedBy: undefined,
    rematchChoices: {},
    checks: { white: 0, black: 0 },
    chess960Seed: variant === 'chess960' ? crypto.getRandomValues(new Uint32Array(1))[0] % 960 : 517,
    takebackTokens: { white: 3, black: 3 },
    takebackForbidden: [],
    drawbackCards: assignDrawbacks(state.drawbackLevels),
    drawbackRevealed: false,
  })
}

export function restart(state: GameState): GameState {
  return changeVariant(state, state.variant)
}

export function colorOf(state: GameState, playerId: string): Color | undefined {
  if (state.players.white?.id === playerId) return 'white'
  if (state.players.black?.id === playerId) return 'black'
  return undefined
}
