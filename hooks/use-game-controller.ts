'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildDrop, buildMove, replay, DRAWBACK_CARDS, type Color, type Role, type Square, type VariantId } from '@/lib/chess/core'
import { pickMove, type Difficulty } from '@/lib/chess/engine'
import * as G from '@/lib/chess/game-state'
import { createBroadcastTransport, type RoomMessage, type RoomTransport } from '@/lib/online/transport'

export type GameConfig =
  | { mode: 'local'; variant: VariantId; drawbackLevel?: number; drawbackLevels?: { white: number; black: number } }
  | { mode: 'computer'; variant: VariantId; difficulty: Difficulty; drawbackLevel?: number; drawbackLevels?: { white: number; black: number } }
  | { mode: 'online'; variant: VariantId; roomCode: string; role: 'host' | 'guest'; me: G.PlayerSlot; drawbackLevel?: number; drawbackLevels?: { white: number; black: number } }

const LOCAL_P1: G.PlayerSlot = { id: 'p1', name: 'Player 1', kind: 'human' }
const LOCAL_P2: G.PlayerSlot = { id: 'p2', name: 'Player 2', kind: 'human' }
const HUMAN: G.PlayerSlot = { id: 'you', name: 'You', kind: 'human' }
const CPU: G.PlayerSlot = { id: 'cpu', name: 'Computer', kind: 'computer' }

function initialState(config: GameConfig): G.GameState | null {
  if (config.mode === 'local') return G.createGame(config.variant, LOCAL_P1, LOCAL_P2, config.drawbackLevel, config.drawbackLevels)
  if (config.mode === 'computer') return G.createGame(config.variant, HUMAN, CPU, config.drawbackLevel, config.drawbackLevels)
  return config.role === 'host' ? G.createGame(config.variant, config.me, null, config.drawbackLevel, config.drawbackLevels, config.variant !== 'drawback') : null
}

export function useGameController(config: GameConfig) {
  const [state, setState] = useState<G.GameState | null>(() => initialState(config))
  const [flipped, setFlipped] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [opponentLeft, setOpponentLeft] = useState(false)
  const transportRef = useRef<RoomTransport | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  const viewerId = config.mode === 'local' ? LOCAL_P1.id : config.mode === 'computer' ? HUMAN.id : config.me.id

  const commit = useCallback((updater: (s: G.GameState) => G.GameState) => {
    const current = stateRef.current
    if (!current) return
    const next = updater(current)
    if (next === current) return
    stateRef.current = next
    setState(next)
    transportRef.current?.send({ type: 'state', state: next })
  }, [])

  useEffect(() => {
    if (config.mode !== 'online') return
    const transport = createBroadcastTransport(config.roomCode)
    transportRef.current = transport
    const me = config.me

    const unsubscribe = transport.subscribe((msg: RoomMessage) => {
      const current = stateRef.current
      if (msg.type === 'join' && config.role === 'host' && current) {
        setOpponentLeft(false)
        const { white, black } = current.players
        const seated = white?.id === msg.player.id || black?.id === msg.player.id
        if (seated) {
          transport.send({ type: 'state', state: current })
        } else if (!black || !white) {
          const players = white ? { white, black: msg.player } : { white: msg.player, black }
          commit((s) => ({ ...s, players, version: s.version + 1 }))
        }
      }
      if (msg.type === 'state') {
        const seated = msg.state.players.white?.id === me.id || msg.state.players.black?.id === me.id
        if (!seated) return
        if (!current || msg.state.version > current.version) {
          stateRef.current = msg.state
          setState(msg.state)
        }
      }
      if (msg.type === 'difficulty' && config.role === 'host' && current && current.players.white && current.players.black) {
        const color = G.colorOf(current, msg.playerId)
        if (color) commit((s) => ({ ...s, drawbackLevels: { ...s.drawbackLevels, [color]: Math.max(1, Math.min(10, msg.level)) }, version: s.version + 1 }))
      }
      if (msg.type === 'leave' && msg.playerId !== me.id) setOpponentLeft(true)
    })

    let joinTimer: ReturnType<typeof setInterval> | undefined
    if (config.role === 'guest') {
      const announce = () => transport.send({ type: 'join', player: me })
      announce()
      joinTimer = setInterval(() => {
        if (stateRef.current) clearInterval(joinTimer)
        else announce()
      }, 1200)
    }

    const leave = () => transport.send({ type: 'leave', playerId: me.id })
    window.addEventListener('beforeunload', leave)

    return () => {
      leave()
      window.removeEventListener('beforeunload', leave)
      if (joinTimer) clearInterval(joinTimer)
      unsubscribe()
      transport.close()
      transportRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const position = useMemo(() => (state ? replay(state.variant, state.moves, state.chess960Seed) : null), [state])
  const turn: Color = position?.turn ?? 'white'
  const viewerColor = state ? G.colorOf(state, viewerId) : undefined
  const bothSeated = !!state?.players.white && !!state?.players.black

  const baseOrientation: Color = viewerColor ?? 'white'
  const orientation: Color = flipped ? (baseOrientation === 'white' ? 'black' : 'white') : baseOrientation

  let movableColor: Color | null = null
  if (state && state.started && !state.result && bothSeated) {
    if (config.mode === 'local') movableColor = turn
    else if (viewerColor === turn && !thinking) movableColor = turn
  }

  const cpuColor = state && config.mode === 'computer' ? G.colorOf(state, CPU.id) : undefined
  const difficulty = config.mode === 'computer' ? config.difficulty : 'medium'

  useEffect(() => {
    if (!state || !position || config.mode !== 'computer' || state.result || turn !== cpuColor) return
    setThinking(true)
    const timer = setTimeout(() => {
      const move = pickMove(position, state.variant, difficulty)
      setThinking(false)
      if (!move) return
      const card = state.variant === 'drawback' ? DRAWBACK_CARDS.find((entry) => entry.id === state.drawbackCards[position.turn]) : undefined
      const record = buildMove(position, move.from, move.to, move.promotion, state.variant, state.moves, card)
      if (record) commit((s) => (s.version === state.version ? G.applyMove(s, record) : s))
    }, 450)
    return () => {
      clearTimeout(timer)
      setThinking(false)
    }
  }, [state, position, turn, cpuColor, difficulty, config.mode, commit])

  useEffect(() => {
    if (config.mode !== 'computer' || !state?.rematchOffer || state.rematchOffer.by === CPU.id) return
    const timer = setTimeout(() => commit((s) => G.acceptRematch(s, CPU.id, config.drawbackLevels?.black ?? config.drawbackLevel ?? 5)), 900)
    return () => clearTimeout(timer)
  }, [state?.rematchOffer, config.mode, commit])

  const playMove = useCallback(
    (from: Square, to: Square, promotion?: Role) => {
      const pos = position
      if (!pos) return
      const currentState = stateRef.current
    const card = currentState?.variant === 'drawback' ? DRAWBACK_CARDS.find((entry) => entry.id === currentState.drawbackCards[pos.turn]) : undefined
    const record = buildMove(pos, from, to, promotion, currentState?.variant ?? 'chess', currentState?.moves ?? [], card)
      if (record) commit((s) => G.applyMove(s, record))
    },
    [position, commit],
  )

  const playDrop = useCallback(
    (role: Role, to: Square) => {
      const pos = position
      if (!pos) return
      const record = buildDrop(pos, role, to)
      if (record) commit((s) => G.applyMove(s, record))
    },
    [position, commit],
  )

  const takeback = useCallback(() => {
    const color = config.mode === 'local' ? turn : viewerColor
    if (color && turn === color) commit((s) => G.takeback(s, color))
  }, [config.mode, turn, viewerColor, commit])

  const resign = useCallback(() => {
    const color = config.mode === 'local' ? turn : viewerColor
    if (color) commit((s) => G.resign(s, color))
  }, [config.mode, turn, viewerColor, commit])

  const undo = useCallback(() => {
    if (config.mode === 'local') commit((s) => G.undoMoves(s, 1))
    if (config.mode === 'computer') {
      const plies = turn === viewerColor ? 2 : 1
      commit((s) => {
        const undone = G.undoMoves(s, plies)
        return undone.moves.length === 0 && cpuColor === 'white' ? s : undone
      })
    }
  }, [config.mode, turn, viewerColor, cpuColor, commit])

  return {
    state,
    position,
    turn,
    viewerId,
    viewerColor,
    orientation,
    movableColor,
    thinking,
    bothSeated,
    opponentLeft,
    flip: () => setFlipped((f) => !f),
    playMove,
    playDrop,
    resign,
    undo,
    takeback,
    canUndo: config.mode !== 'online' && !!state && state.moves.length > 0 && !thinking,
    restart: () => commit(G.restart),
    changeVariant: (variant: VariantId) => commit((s) => G.changeVariant(s, variant)),
    startGame: () => { if (config.mode === 'online' && config.role === 'host') commit(G.startGame) },
    offerRematch: (by: string) => commit((s) => G.offerRematch(s, by)),
    acceptRematch: (playerId = viewerId, level = config.drawbackLevels?.white ?? config.drawbackLevel ?? 5) => commit((s) => G.acceptRematch(s, playerId, level)),
    setDrawbackLevel: (level: number, color?: 'white' | 'black') => {
      const safeLevel = Math.max(1, Math.min(10, level))
      if (config.mode === 'online' && config.role === 'guest') transportRef.current?.send({ type: 'difficulty', playerId: viewerId, level: safeLevel })
      else commit((s) => ({ ...s, drawbackLevels: { ...s.drawbackLevels, [color ?? G.colorOf(s, viewerId) ?? 'white']: safeLevel }, version: s.version + 1 }))
    },
    declineRematch: (by: string) => commit((s) => G.declineRematch(s, by)),
  }
}

export type GameController = ReturnType<typeof useGameController>
