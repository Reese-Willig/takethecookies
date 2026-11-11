'use client'

import { useEffect, useState } from 'react'
import { Flag, FlipVertical2, RotateCcw, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GameMode } from '@/lib/chess/game-state'
import type { GameController } from '@/hooks/use-game-controller'

export function GameControls({ game, mode }: { game: GameController; mode: GameMode }) {
  const [confirmResign, setConfirmResign] = useState(false)
  const playing = !!game.state && !game.state.result && game.state.moves.length > 0 && game.bothSeated

  useEffect(() => {
    if (!confirmResign) return
    const t = setTimeout(() => setConfirmResign(false), 3000)
    return () => clearTimeout(t)
  }, [confirmResign])

  const takebackAvailable = game.state?.variant === 'takeback' && game.turn === (mode === 'local' ? game.turn : game.viewerColor) && !!game.state.takebackTokens[game.turn]

  return (
    <div className="grid grid-cols-2 gap-2">
      {game.state?.variant === 'takeback' && (
        <div className="col-span-2 flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-xs">
          <span className="font-medium">Undo tokens</span>
          <span className="font-mono text-primary">White {game.state.takebackTokens.white} · Black {game.state.takebackTokens.black}</span>
        </div>
      )}
      <Button variant="outline" className="h-10" onClick={game.flip}>
        <FlipVertical2 aria-hidden />
        Flip board
      </Button>
      {mode !== 'online' ? (
        <Button variant="outline" className="h-10" onClick={game.state?.variant === 'takeback' ? game.takeback : game.undo} disabled={game.state?.variant === 'takeback' ? !takebackAvailable : !game.canUndo}>
          <Undo2 aria-hidden />
          Undo
        </Button>
      ) : (
        <Button variant="outline" className="h-10" onClick={game.restart} disabled={playing}>
          <RotateCcw aria-hidden />
          New game
        </Button>
      )}
      {mode !== 'online' && (
        <Button variant="outline" className="h-10" onClick={game.restart} disabled={!game.state?.moves.length}>
          <RotateCcw aria-hidden />
          Restart
        </Button>
      )}
      <Button
        variant="destructive"
        className={mode === 'online' ? 'col-span-2 h-10' : 'h-10'}
        disabled={!playing}
        onClick={() => {
          if (confirmResign) {
            game.resign()
            setConfirmResign(false)
          } else {
            setConfirmResign(true)
          }
        }}
      >
        <Flag aria-hidden />
        {confirmResign ? 'Confirm resign' : 'Resign'}
      </Button>
    </div>
  )
}
