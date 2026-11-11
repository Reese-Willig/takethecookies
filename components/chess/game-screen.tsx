'use client'

import { useState } from 'react'
import { ArrowLeft, Check, Copy, Cpu, Globe, Loader2, Users, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DRAWBACK_CARDS, opposite } from '@/lib/chess/core'
import { DIFFICULTIES } from '@/lib/chess/engine'
import { useGameController, type GameConfig } from '@/hooks/use-game-controller'
import { Chessboard } from './chessboard'
import { GameControls } from './game-controls'
import { GameStatus } from './game-status'
import { MoveHistory } from './move-history'
import { PlayerBar } from './player-bar'
import { VariantSidebar } from './variant-sidebar'
import { Wordmark } from './wordmark'

const MODE_META = {
  local: { label: 'Local play', icon: Users },
  online: { label: 'Online', icon: Globe },
  computer: { label: 'Vs computer', icon: Cpu },
} as const

export function GameScreen({ config, onExit }: { config: GameConfig; onExit: () => void }) {
  const game = useGameController(config)
  const { state, position, orientation } = game
  const ownDrawback = state?.variant === 'drawback' ? DRAWBACK_CARDS.find((card) => card.id === state.drawbackCards[game.viewerColor ?? orientation]) : undefined
  const ModeIcon = MODE_META[config.mode].icon

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onExit} aria-label="Back to lobby">
            <ArrowLeft aria-hidden />
            <span className="hidden sm:inline">Lobby</span>
          </Button>
          <Wordmark />
        </div>
        <div className="flex items-center gap-2">
          {config.mode === 'online' && <RoomCodeChip code={config.roomCode} />}
          <span className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
            <ModeIcon className="size-3.5" aria-hidden />
            {MODE_META[config.mode].label}
          </span>
        </div>
      </header>

      {!state || !position ? (
        <ConnectingState code={config.mode === 'online' ? config.roomCode : ''} />
      ) : (
        <main className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 gap-6 p-4 lg:grid-cols-[260px_minmax(0,1fr)_320px] lg:p-6">
          {state.variant === 'drawback' && !state.started && <div className="fixed inset-x-4 top-20 z-50 mx-auto max-w-xl rounded-2xl border bg-card p-5 text-center shadow-2xl lg:top-24"><p className="text-xs font-medium uppercase tracking-widest text-primary">Drawback Chess setup</p><h1 className="mt-2 text-xl font-semibold">{!game.bothSeated ? 'Waiting for your opponent' : config.mode === 'online' && config.role === 'host' ? 'Ready to begin?' : 'Waiting for the host'}</h1><p className="mt-2 text-sm text-muted-foreground">{!game.bothSeated ? 'Share the room code. The host can start once both players are seated.' : config.mode === 'online' && config.role === 'host' ? 'Set both handicaps, then start the match to secretly deal the drawbacks.' : 'Choose your handicap while you wait. The host will start the match and deal the secret drawbacks.'}</p>{game.bothSeated && <div className="mx-auto mt-4 grid w-full max-w-sm gap-3 text-left">{(config.mode === 'online' && config.role === 'host' ? (['white', 'black'] as const) : [game.viewerColor ?? 'white']).map((color) => <label key={color} className="grid gap-1 text-xs font-medium"><span className="flex justify-between"><span>{color === 'white' ? 'Player 1 · White' : 'Player 2 · Black'}</span><span className="font-mono text-primary">Level {state.drawbackLevels[color]}</span></span><input aria-label={`${color} drawback difficulty in lobby`} type="range" min="1" max="10" value={state.drawbackLevels[color]} onChange={(e) => game.setDrawbackLevel(Number(e.target.value), color)} className="w-full accent-primary" /></label>)}</div>}{config.mode === 'online' && config.role === 'host' && game.bothSeated && <Button className="mt-4" onClick={game.startGame}>Start Drawback Chess</Button>}</div>}
          <div className="order-3 lg:order-1">
            <VariantSidebar
              value={state.variant}
              onChange={game.changeVariant}
              inProgress={state.moves.length > 0 && !state.result}
            >
              <>
                <ModeDetails config={config} />
                {state.variant === 'takeback' && <TakebackWidget game={game} />}
              </>
            </VariantSidebar>
          </div>

          <section className="order-1 flex flex-col items-center gap-3 lg:order-2" aria-label="Board">
            <div className="flex w-full max-w-[min(100%,calc(100dvh-15.5rem))] flex-col gap-3">
              <PlayerBar
                player={state.players[opposite(orientation)]}
                color={opposite(orientation)}
                moves={state.moves}
                active={!state.result && game.bothSeated && game.turn === opposite(orientation)}
                thinking={game.thinking}
                isViewer={config.mode !== 'local' && game.viewerColor === opposite(orientation)}
              />
              <div className="relative">
                <Chessboard
                  position={position}
                  variant={state.variant}
                  moves={state.moves}
                  orientation={orientation}
                  movableColor={game.movableColor}
                  onMove={game.playMove}
                  onDrop={game.playDrop}
                  chess960Seed={state.chess960Seed}
                  drawbackCard={state.variant === 'drawback' ? ownDrawback : undefined}
                />
                {config.mode === 'online' && !game.bothSeated && <WaitingOverlay code={config.roomCode} />}
                {config.mode === 'online' && game.opponentLeft && game.bothSeated && (
                  <div className="absolute inset-x-0 top-3 mx-auto flex w-fit items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-lg ring-1 ring-border">
                    <WifiOff className="size-3.5 text-destructive" aria-hidden />
                    Opponent disconnected
                  </div>
                )}
              </div>
              <PlayerBar
                player={state.players[orientation]}
                color={orientation}
                moves={state.moves}
                active={!state.result && game.bothSeated && game.turn === orientation}
                thinking={game.thinking}
                isViewer={config.mode !== 'local' && game.viewerColor === orientation}
              />
            </div>
          </section>

          <aside className="order-2 flex flex-col gap-4 lg:order-3">
            <GameStatus game={game} mode={config.mode} />
            {state.variant === 'drawback' && state.started && <DrawbackCards own={ownDrawback} opponent={state.drawbackRevealed ? DRAWBACK_CARDS.find((card) => card.id === state.drawbackCards[opposite(game.viewerColor ?? orientation)]) : undefined} revealed={state.drawbackRevealed} level={state.drawbackLevels[game.viewerColor ?? orientation]} onLevelChange={config.mode === 'online' ? game.setDrawbackLevel : undefined} />}
            <MoveHistory moves={state.moves} />
            <GameControls game={game} mode={config.mode} />
          </aside>
        </main>
      )}
    </div>
  )
}

function ModeDetails({ config }: { config: GameConfig }) {
  let body: React.ReactNode
  if (config.mode === 'local') body = 'Pass the device between moves. The board stays oriented to Player 1 — flip it any time.'
  if (config.mode === 'computer')
    body = `Engine strength: ${DIFFICULTIES.find((d) => d.id === config.difficulty)?.label}. Undo takes back your last move and the reply.`
  if (config.mode === 'online')
    body = 'Rooms sync across computers through the shared online room. Share the room code with your opponent to play.'
  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">About this mode</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/80">{body}</p>
    </div>
  )
}

function DrawbackCards({ own, opponent, revealed, level, onLevelChange }: { own?: { name: string; rule: string; tier: string }; opponent?: { name: string; rule: string; tier: string }; revealed: boolean; level: number; onLevelChange?: (level: number) => void }) {
  return <section className="rounded-xl border bg-card p-4"><h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Secret drawbacks</h2><div className="mt-3 grid gap-2"><div className="rounded-lg border border-primary/30 bg-primary/5 p-3"><p className="text-[10px] uppercase tracking-widest text-primary">Your card</p><p className="mt-1 text-sm font-semibold">{own?.name ?? 'Assigned'}</p><p className="mt-1 text-xs text-muted-foreground">{own?.rule}</p></div><div className="rounded-lg border border-dashed p-3"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Opponent card</p><p className="mt-1 text-sm font-semibold">{revealed ? opponent?.name : 'Locked card  ?'}</p>{revealed && <p className="mt-1 text-xs text-muted-foreground">{opponent?.rule}</p>}</div></div>{onLevelChange && <label className="mt-3 block text-xs font-medium">Your live difficulty: <span className="font-mono text-primary">{level}</span><input aria-label="Your live drawback difficulty" type="range" min="1" max="10" value={level} onChange={(e) => onLevelChange(Number(e.target.value))} className="mt-2 w-full accent-primary" /></label>}</section>
}

function TakebackWidget({ game }: { game: ReturnType<typeof useGameController> }) {
  const color = game.viewerColor ?? game.turn
  const enabled = !!game.state && game.turn === color && game.state.takebackTokens[color] > 0 && game.state.moves.length > 0
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Undo tokens</h2>
        <span className="font-mono text-xs text-primary">{game.state?.takebackTokens[color] ?? 0} / 3</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Spend one after your opponent moves to force a different reply.</p>
      <Button className="mt-3 w-full" variant="outline" onClick={game.takeback} disabled={!enabled}>
        Use Undo Token
      </Button>
    </div>
  )
}

function RoomCodeChip({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 font-mono text-xs font-semibold tracking-widest transition-colors hover:bg-secondary/70"
      aria-label={`Copy room code ${code}`}
    >
      {code}
      {copied ? <Check className="size-3.5 text-primary" aria-hidden /> : <Copy className="size-3.5 text-muted-foreground" aria-hidden />}
    </button>
  )
}

function WaitingOverlay({ code }: { code: string }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center rounded-md bg-background/75 p-6 backdrop-blur-sm">
      <div className="flex max-w-xs flex-col items-center gap-4 text-center">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Share this room code</p>
          <p className="font-mono text-4xl font-semibold tracking-[0.3em] text-primary">{code}</p>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
          Waiting for an opponent. To test solo, open this app in another tab, choose Online and join with this code.
        </p>
        <RoomCodeChip code={code} />
      </div>
    </div>
  )
}

function ConnectingState({ code }: { code: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
      <p className="text-lg font-semibold">{`Joining room ${code}…`}</p>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        Looking for the host. Make sure the room is open in another tab of this browser.
      </p>
    </main>
  )
}
