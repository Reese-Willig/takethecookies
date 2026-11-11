import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import type { GameState } from '@/lib/chess/game-state'

export const chessRooms = pgTable('chess_rooms', {
  roomCode: text('room_code').primaryKey(),
  gameState: jsonb('game_state').$type<GameState>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
