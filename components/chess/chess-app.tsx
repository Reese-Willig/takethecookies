'use client'

import { useState } from 'react'
import type { GameConfig } from '@/hooks/use-game-controller'
import { Dashboard } from './dashboard'
import { GameScreen } from './game-screen'

export function ChessApp() {
  const [session, setSession] = useState<{ key: number; config: GameConfig } | null>(null)

  if (!session) return <Dashboard onStart={(config) => setSession({ key: Date.now(), config })} />
  return <GameScreen key={session.key} config={session.config} onExit={() => setSession(null)} />
}
