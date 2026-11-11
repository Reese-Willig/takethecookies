import { Cpu, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { capturedBy, materialScore, opposite, type Color, type MoveRecord } from '@/lib/chess/core'
import type { PlayerSlot } from '@/lib/chess/game-state'
import { PieceImage } from './piece-image'

interface PlayerBarProps {
  player: PlayerSlot | null
  color: Color
  moves: MoveRecord[]
  active: boolean
  thinking?: boolean
  isViewer?: boolean
}

export function PlayerBar({ player, color, moves, active, thinking, isViewer }: PlayerBarProps) {
  const captured = capturedBy(moves, color)
  const opponentCaptured = capturedBy(moves, opposite(color))
  const diff = materialScore(captured) - materialScore(opponentCaptured)
  const Icon = player?.kind === 'computer' ? Cpu : User

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors duration-300',
        active ? 'border-primary/50 bg-primary/10' : 'border-border bg-card/60',
      )}
    >
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-md',
          color === 'white' ? 'bg-board-light text-background' : 'bg-background text-foreground ring-1 ring-border',
        )}
        aria-hidden
      >
        <Icon className="size-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{player?.name ?? 'Waiting for opponent…'}</span>
          {isViewer && <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">You</span>}
          <span className="sr-only">{`plays ${color}`}</span>
        </div>
        <div className="flex h-5 items-center">
          <div
            className={cn('flex items-center -space-x-1.5', captured.length > 0 && 'rounded-full bg-board-light/85 px-1')}
            aria-label={`${captured.length} pieces captured`}
          >
            {captured.map((role, i) => (
              <PieceImage key={`${role}-${i}`} piece={{ role, color: opposite(color) }} className="size-5 animate-in fade-in zoom-in-50 duration-300" />
            ))}
          </div>
          {diff > 0 && <span className="ml-2 font-mono text-xs text-muted-foreground">{`+${diff}`}</span>}
          {captured.length === 0 && <span className="text-xs text-muted-foreground">{color === 'white' ? 'White' : 'Black'}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs font-medium" aria-live="polite">
        {active && (
          <>
            <span className="relative flex size-2.5" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
            </span>
            <span className="text-primary">{thinking ? 'Thinking…' : 'To move'}</span>
          </>
        )}
      </div>
    </div>
  )
}
