import { and, eq, gt, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chessRooms } from '@/lib/db/schema'
import type { GameState, PlayerSlot } from '@/lib/chess/game-state'

export const runtime = 'nodejs'

function validRoomCode(value: string) {
  return /^[A-Z0-9]{4,8}$/.test(value)
}

function validState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<GameState>
  return typeof state.version === 'number' && Array.isArray(state.moves) && !!state.players && !!state.drawbackLevels
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(_request: Request, context: { params: Promise<{ roomCode: string }> }) {
  const { roomCode: rawCode } = await context.params
  const roomCode = rawCode.toUpperCase()
  if (!validRoomCode(roomCode)) return error('Invalid room code', 400)

  const [room] = await db.select({ gameState: chessRooms.gameState })
    .from(chessRooms)
    .where(and(eq(chessRooms.roomCode, roomCode), gt(chessRooms.createdAt, new Date(Date.now() - 48 * 60 * 60 * 1000))))
    .limit(1)

  if (!room) return error('Room not found or expired', 404)
  return NextResponse.json({ state: room.gameState }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request, context: { params: Promise<{ roomCode: string }> }) {
  const { roomCode: rawCode } = await context.params
  const roomCode = rawCode.toUpperCase()
  if (!validRoomCode(roomCode)) return error('Invalid room code', 400)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON body', 400)
  }

  if (body.type === 'create') {
    if (!validState(body.state)) return error('Invalid game state', 400)
    const [room] = await db.insert(chessRooms)
      .values({ roomCode, gameState: body.state })
      .onConflictDoNothing()
      .returning({ roomCode: chessRooms.roomCode })
    return room ? NextResponse.json({ ok: true }, { status: 201 }) : error('Room code already in use', 409)
  }

  const [room] = await db.select({ gameState: chessRooms.gameState })
    .from(chessRooms)
    .where(and(eq(chessRooms.roomCode, roomCode), gt(chessRooms.createdAt, new Date(Date.now() - 48 * 60 * 60 * 1000))))
    .limit(1)
  if (!room) return error('Room not found or expired', 404)

  const current = room.gameState
  if (body.type === 'join') {
    const player = body.player as PlayerSlot | undefined
    if (!player || typeof player.id !== 'string' || typeof player.name !== 'string' || player.kind !== 'human') return error('Invalid player', 400)
    const existingSeat = current.players.white?.id === player.id || current.players.black?.id === player.id
    if (!existingSeat && current.players.white && current.players.black) return error('Room is full', 409)
    const nextState: GameState = existingSeat ? current : {
      ...current,
      players: current.players.white ? { ...current.players, black: player } : { ...current.players, white: player },
      version: current.version + 1,
    }
    if (nextState !== current) await db.update(chessRooms).set({ gameState: nextState, updatedAt: new Date() }).where(eq(chessRooms.roomCode, roomCode))
    return NextResponse.json({ state: nextState })
  }

  if (body.type === 'state') {
    const playerId = body.playerId
    const nextState = body.state
    if (typeof playerId !== 'string' || !validState(nextState)) return error('Invalid game state', 400)
    const isSeated = current.players.white?.id === playerId || current.players.black?.id === playerId
    const rosterMatches = current.players.white?.id === nextState.players.white?.id && current.players.black?.id === nextState.players.black?.id
    if (!isSeated || !rosterMatches || nextState.version <= current.version) return error('State update is not authorized or is stale', 409)
    await db.update(chessRooms).set({ gameState: nextState, updatedAt: new Date() }).where(eq(chessRooms.roomCode, roomCode))
    return NextResponse.json({ ok: true })
  }

  if (body.type === 'difficulty') {
    const playerId = body.playerId
    const level = body.level
    if (typeof playerId !== 'string' || typeof level !== 'number' || !Number.isInteger(level) || level < 1 || level > 10) return error('Invalid difficulty', 400)
    const color = current.players.white?.id === playerId ? 'white' : current.players.black?.id === playerId ? 'black' : null
    if (!color || current.variant !== 'drawback' || current.started) return error('Difficulty cannot be changed now', 409)
    const [updated] = await db.update(chessRooms).set({
      gameState: sql`jsonb_set(
        jsonb_set(${chessRooms.gameState}, ARRAY['drawbackLevels', ${color}], to_jsonb(${level}::int), true),
        '{version}',
        to_jsonb((${chessRooms.gameState}->>'version')::int + 1),
        true
      )`,
      updatedAt: new Date(),
    }).where(and(
      eq(chessRooms.roomCode, roomCode),
      sql`${chessRooms.gameState}->'players'->${color}->>'id' = ${playerId}`,
      sql`${chessRooms.gameState}->>'variant' = 'drawback'`,
      sql`${chessRooms.gameState}->>'started' = 'false'`,
    )).returning({ gameState: chessRooms.gameState })
    if (!updated) return error('Difficulty cannot be changed now', 409)
    return NextResponse.json({ state: updated.gameState })
  }

  return error('Unsupported room operation', 400)
}
