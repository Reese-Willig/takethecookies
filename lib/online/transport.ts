import type { GameState, PlayerSlot } from '@/lib/chess/game-state'

export type RoomMessage =
  | { type: 'join'; player: PlayerSlot }
  | { type: 'state'; state: GameState; playerId?: string }
  | { type: 'leave'; playerId: string }
  | { type: 'difficulty'; playerId: string; level: number }
  | { type: 'ping'; from: string }

export interface RoomTransport {
  send(message: RoomMessage): void
  subscribe(handler: (message: RoomMessage) => void): () => void
  close(): void
}

export function createOnlineTransport(roomCode: string, role: 'host' | 'guest', initialState?: GameState): RoomTransport {
  const endpoint = `/api/rooms/${encodeURIComponent(roomCode)}`
  const handlers = new Set<(message: RoomMessage) => void>()
  let closed = false
  let lastVersion = initialState?.version ?? -1
  let pollTimer: ReturnType<typeof setTimeout> | undefined
  let writeQueue = Promise.resolve()

  const post = (body: Record<string, unknown>) => {
    writeQueue = writeQueue.then(async () => {
      try {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          cache: 'no-store',
        })
      } catch {
        // The next poll or state commit retries the room sync.
      }
    })
    return writeQueue
  }

  if (role === 'host' && initialState) void post({ type: 'create', state: initialState })

  const poll = async () => {
    if (closed) return
    try {
      const response = await fetch(endpoint, { cache: 'no-store' })
      if (response.ok) {
        const payload = (await response.json()) as { state?: GameState }
        const state = payload.state
        if (state && state.version > lastVersion) {
          lastVersion = state.version
          handlers.forEach((handler) => handler({ type: 'state', state }))
        }
      }
    } catch {
      // Network errors are transient; continue polling the same room.
    } finally {
      if (!closed) pollTimer = setTimeout(poll, 700)
    }
  }
  void poll()

  return {
    send: (message) => {
      if (closed) return
      if (message.type === 'state' && message.playerId) void post({ type: 'state', state: message.state, playerId: message.playerId })
      else if (message.type === 'join') void post({ type: 'join', player: message.player })
      else if (message.type === 'difficulty') void post({ type: 'difficulty', playerId: message.playerId, level: message.level })
    },
    subscribe: (handler) => {
      handlers.add(handler)
      return () => handlers.delete(handler)
    },
    close: () => {
      closed = true
      if (pollTimer) clearTimeout(pollTimer)
      handlers.clear()
    },
  }
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateRoomCode(length = 8) {
  const values = crypto.getRandomValues(new Uint32Array(length))
  return Array.from(values, (value) => ALPHABET[value % ALPHABET.length]).join('')
}

export function generateId() {
  return crypto.randomUUID()
}
