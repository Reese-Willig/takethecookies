'use client'

import { useState } from 'react'
import { ArrowLeftRight, Check, Loader2, RefreshCcw, Swords, Trophy, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getVariant, opposite } from '@/lib/chess/core'
import type { GameMode, PlayerSlot } from '@/lib/chess/game-state'
import type { GameController } from '@/hooks/use-game-controller'

const colorName = (c: 'white' | 'black') => (c === 'white' ? 'White' : 'Black')

export function GameStatus({ game, mode }: { game: GameController; mode: GameMode }) {
  const { state, position, turn } = game
  if (!state || !position) return null
  const { result, players } = state
  const winnerPlayer = result?.winner ? players[result.winner] : null
  const swapped = state.gameNumber > 1 && state.moves.length === 0 && !result

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-xl border bg-card p-4 transition-colors duration-500',
        result && 'border-primary/40',
      )}
      aria-live="polite"
    >
      {!result ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {`Game ${state.gameNumber} · ${getVariant(state.variant).name}`}
            </span>
            {position.isCheck() && state.variant !== 'antichess' && (
              <span className="rounded bg-destructive/20 px-2 py-0.5 text-xs font-semibold text-destructive">Check</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <TurnSwatch color={turn} />
            <div className="flex flex-col">
              <span className="text-lg font-semibold leading-tight">{`${colorName(turn)} to move`}</span>
              <span className="text-sm text-muted-foreground">
                {players[turn]?.name ?? 'Waiting…'}
                {game.thinking ? ' is thinking…' : ''}
              </span>
            </div>
          </div>
          {swapped && (
            <p className="flex items-start gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs leading-relaxed text-primary animate-in fade-in slide-in-from-top-1 duration-500">
              <ArrowLeftRight className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {`Rematch on — sides swapped. ${players.white?.name ?? 'White'} now plays White.`}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Trophy className="size-5" aria-hidden />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold leading-tight text-balance">
                {result.winner ? `${winnerPlayer?.name ?? colorName(result.winner)} wins` : 'Draw'}
              </span>
              <span className="text-sm text-muted-foreground">
                {result.winner ? `${colorName(result.winner)} · ${result.reason}` : result.reason}
              </span>
            </div>
          </div>
          <RematchPanel game={game} mode={mode} />
        </div>
      )}
    </section>
  )
}

function TurnSwatch({ color }: { color: 'white' | 'black' }) {
  return (
    <span
      className={cn(
        'size-10 shrink-0 rounded-lg ring-1 ring-border transition-colors duration-300',
        color === 'white' ? 'bg-board-light' : 'bg-background',
      )}
      aria-hidden
    />
  )
}

function RematchPanel({ game, mode }: { game: GameController; mode: GameMode }) {
  const state = game.state!
  const [adjusting, setAdjusting] = useState(false)
  const [level, setLevel] = useState(5)
  const { players, rematchOffer, rematchDeclinedBy, result } = state
  const slots = [players.white, players.black].filter(Boolean) as PlayerSlot[]
  const nameOf = (id?: string) => slots.find((p) => p.id === id)?.name ?? 'Opponent'
  const otherOf = (id: string) => slots.find((p) => p.id !== id)

  const defaultOfferer =
    mode === 'local'
      ? (result?.winner ? players[opposite(result.winner)] : players.white)?.id ?? 'p1'
      : game.viewerId

  const swapNote = `Sides swap: ${players.white?.name ?? 'White'} takes Black, ${players.black?.name ?? 'Black'} takes White.`

  if (rematchOffer) {
    const offerer = rematchOffer.by
    const responder = otherOf(offerer)
    const viewerIsOfferer = mode !== 'local' && offerer === game.viewerId

    if (mode === 'computer' && viewerIsOfferer) {
      return (
        <div className="flex items-center gap-3 rounded-lg bg-secondary px-3 py-3 text-sm">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
          Computer is considering your rematch…
        </div>
      )
    }

    if (viewerIsOfferer) {
      return (
        <div className="flex flex-col gap-3 rounded-lg bg-secondary p-3">
          <div className="flex items-center gap-3 text-sm">
            <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
            Waiting for {nameOf(responder?.id)} to respond…
          </div>
          <Button variant="ghost" size="sm" className="self-start" onClick={() => game.declineRematch(game.viewerId)}>
            Withdraw offer
          </Button>
        </div>
      )
    }

    const chooserId = mode === 'local' ? (responder?.id && !state.rematchChoices[responder.id] ? responder.id : offerer) : game.viewerId
    if (chooserId && state.rematchChoices[chooserId]) return <div className="rounded-lg bg-secondary p-3 text-sm text-muted-foreground">Difficulty locked in. Waiting for the other player…</div>

    return (
      <div className="flex flex-col gap-3 rounded-lg border border-primary/40 bg-primary/10 p-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
        <p className="text-sm leading-relaxed">
          <span className="font-semibold">{nameOf(offerer)}</span>
          {' offers a rematch'}
          {mode === 'local' && responder ? (
            <>
              {'. '}
              <span className="font-semibold">{responder.name}</span>
              {', do you accept?'}
            </>
          ) : (
            '.'
          )}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">{swapNote}</p>
        {!adjusting ? <div className="flex gap-2">
          <Button className="h-10 flex-1" onClick={() => { setLevel(state.drawbackLevels[chooserId === players.white?.id ? 'white' : 'black']); setAdjusting(true) }}>
            <Check aria-hidden />
            Adjust & accept
          </Button>
          <Button variant="outline" className="h-10 flex-1" onClick={() => game.declineRematch(responder?.id ?? game.viewerId)}><X aria-hidden />Decline</Button>
        </div> : <div className="grid gap-2 rounded-lg bg-card p-3"><label className="text-xs font-medium">Your next-round difficulty: <span className="font-mono text-primary">{level}</span><input aria-label="Next-round drawback difficulty" type="range" min="1" max="10" value={level} onChange={(e) => setLevel(Number(e.target.value))} className="mt-2 w-full accent-primary" /></label><Button className="h-10" onClick={() => game.acceptRematch(chooserId, level)}>Lock difficulty</Button>        </div>}
      </div>
    )
  }

  const declinedByOther = rematchDeclinedBy && (mode === 'local' || rematchDeclinedBy !== game.viewerId)
  const canOffer = mode !== 'online' || (players.white && players.black && !game.opponentLeft)

  return (
    <div className="flex flex-col gap-2">
      {declinedByOther && <p className="text-sm text-muted-foreground">{`${nameOf(rematchDeclinedBy)} declined the rematch.`}</p>}
      <Button
        className="h-12 text-base font-semibold shadow-lg shadow-primary/20"
        onClick={() => game.offerRematch(defaultOfferer)}
        disabled={!canOffer}
      >
        <Swords className="size-5" aria-hidden />
        Offer Rematch
      </Button>
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <RefreshCcw className="mt-0.5 size-3 shrink-0" aria-hidden />
        {swapNote}
      </p>
    </div>
  )
}
