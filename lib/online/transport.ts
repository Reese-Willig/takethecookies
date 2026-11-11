import type { GameState, PlayerSlot } from '@/lib/chess/game-state'

export type RoomMessage =
  | { type: 'join'; player: PlayerSlot }
  | { type: 'state'; state: GameState }
  | { type: 'leave'; playerId: string }
  | { type: 'difficulty'; playerId: string; level: number }
  | { type: 'ping'; from: string }

/**
 * Minimal real-time contract. The default implementation uses BroadcastChannel
 * so rooms work across tabs with zero setup; a Supabase Realtime or Pusher
 * channel can implement the same three methods to go truly online.
 */
export interface RoomTransport {
  send(message: RoomMessage): void
  subscribe(handler: (message: RoomMessage) => void): () => void
  close(): void
}

export function createBroadcastTransport(roomCode: string): RoomTransport {
  const channel = new BroadcastChannel(`sixtyfour-room-${roomCode}`)
  const handlers = new Set<(m: RoomMessage) => void>()
  channel.onmessage = (event: MessageEvent<RoomMessage>) => {
    handlers.forEach((h) => h(event.data))
  }
  return {
    send: (message) => channel.postMessage(message),
    subscribe: (handler) => {
      handlers.add(handler)
      return () => handlers.delete(handler)
    },
    close: () => {
      handlers.clear()
      channel.close()
    },
  }
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateRoomCode(length = 5) {
  const values = crypto.getRandomValues(new Uint32Array(length))
  return Array.from(values, (v) => ALPHABET[v % ALPHABET.length]).join('')
}

export function generateId() {
  return crypto.randomUUID()
}
