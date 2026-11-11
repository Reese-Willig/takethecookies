'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, Cpu, Globe, LogIn, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { VARIANTS, createPosition, getVariant, type VariantId } from '@/lib/chess/core'
import { DIFFICULTIES, type Difficulty } from '@/lib/chess/engine'
import { generateId, generateRoomCode } from '@/lib/online/transport'
import type { GameConfig } from '@/hooks/use-game-controller'
import { Chessboard } from './chessboard'
import { VARIANT_ICONS } from './variant-sidebar'
import { Wordmark } from './wordmark'

export function Dashboard({ onStart }: { onStart: (config: GameConfig) => void }) {
  const [variant, setVariant] = useState<VariantId>('chess')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [drawbackLevels, setDrawbackLevels] = useState({ white: 5, black: 5 })
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const previewPosition = useMemo(() => createPosition(variant), [variant])
  const info = getVariant(variant)

  const me = () => ({ id: generateId(), name: name.trim() || 'Guest', kind: 'human' as const })
  const cleanCode = joinCode.trim().toUpperCase()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3 lg:px-8">
        <Wordmark />
        <span className="font-mono text-xs text-muted-foreground">16 variants · 3 modes</span>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-16 lg:px-8">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Three rulebooks.
              <br />
              <span className="text-primary">Sixteen ways to play.</span>
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground text-pretty">
              Play classical chess, remix the rules with Chess 960, Fog of War, Checkless, Take-Back, and more, or race your king to the centre in King of the
              Hill. Win a game, then offer a rematch — sides swap automatically.
            </p>
          </div>

          <fieldset className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500 [animation-delay:80ms] [animation-fill-mode:both]">
            <legend className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">Choose a variant</legend>
            <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {VARIANTS.map((v) => {
                const Icon = VARIANT_ICONS[v.id]
                const active = v.id === variant
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setVariant(v.id)}
                    className={cn(
                      'flex flex-col items-start gap-3 rounded-xl border p-3 text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring',
                      active ? 'border-primary/60 bg-primary/10' : 'bg-card hover:border-foreground/20',
                    )}
                  >
                    <Icon className={cn('size-5', active ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
                    <span className="text-sm font-semibold leading-tight">{v.name}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-sm text-muted-foreground">{info.tagline}</p>
          </fieldset>

          {variant === 'drawback' && (
            <section className="rounded-xl border bg-card p-4 animate-in fade-in slide-in-from-bottom-2" aria-label="Drawback difficulty setup">
              <div><h2 className="text-sm font-semibold">Player handicaps</h2><p className="mt-1 text-xs text-muted-foreground">Choose each player&apos;s secret card tier independently.</p></div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {(['white', 'black'] as const).map((color) => (
                  <label key={color} className="grid gap-2 text-xs font-medium"><span className="flex justify-between"><span>{color === 'white' ? 'Player 1 · White' : 'Player 2 · Black'}</span><span className="font-mono text-primary">Level {drawbackLevels[color]}</span></span><input aria-label={`${color} drawback difficulty`} type="range" min="1" max="10" value={drawbackLevels[color]} onChange={(e) => setDrawbackLevels((current) => ({ ...current, [color]: Number(e.target.value) }))} className="w-full accent-primary" /></label>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] leading-tight text-muted-foreground"><span>1–3<br /><b className="text-foreground">Minor</b></span><span>4–7<br /><b className="text-foreground">Intermediate</b></span><span>8–10<br /><b className="text-foreground">Extreme</b></span></div>
            </section>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 animate-in fade-in slide-in-from-bottom-2 duration-500 [animation-delay:160ms] [animation-fill-mode:both]">
            <ModeCard icon={Users} title="Local Play" description="Pass and play on one screen.">
              <Button className="mt-auto h-10 w-full" onClick={() => onStart({ mode: 'local', variant, drawbackLevels })}>
                Start game
                <ArrowRight aria-hidden />
              </Button>
            </ModeCard>

            <ModeCard icon={Cpu} title="Vs Computer" description="Minimax engine for solo testing.">
              <div role="radiogroup" aria-label="Engine strength" className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    role="radio"
                    aria-checked={difficulty === d.id}
                    onClick={() => setDifficulty(d.id)}
                    className={cn(
                      'rounded-md py-1 text-[11px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                      difficulty === d.id ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <Button className="mt-auto h-10 w-full" onClick={() => onStart({ mode: 'computer', variant, difficulty, drawbackLevels })}>
                Play engine
                <ArrowRight aria-hidden />
              </Button>
            </ModeCard>

            <ModeCard icon={Globe} title="Online" description="Real-time room codes.">
              <label className="sr-only" htmlFor="player-name">
                Your name
              </label>
              <input
                id="player-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={20}
                className="h-9 rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button
                className="h-9 w-full"
                onClick={() => onStart({ mode: 'online', variant, roomCode: generateRoomCode(), role: 'host', me: me(), drawbackLevels })}
              >
                <Plus aria-hidden />
                Create room
              </Button>
              <form
                className="flex gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (cleanCode.length < 4) return
                  onStart({ mode: 'online', variant, roomCode: cleanCode, role: 'guest', me: me(), drawbackLevels })
                }}
              >
                <label className="sr-only" htmlFor="room-code">
                  Room code
                </label>
                <input
                  id="room-code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="CODE"
                  maxLength={8}
                  autoComplete="off"
                  className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 font-mono text-sm uppercase tracking-widest outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button type="submit" variant="outline" className="h-9" disabled={cleanCode.length < 4} aria-label="Join room">
                  <LogIn aria-hidden />
                </Button>
              </form>
            </ModeCard>
          </div>
        </div>

        <div className="order-first flex flex-col gap-3 lg:order-none animate-in fade-in zoom-in-95 duration-700">
          <div className="mx-auto w-full max-w-sm lg:max-w-none">
            <Chessboard
              position={previewPosition}
              variant={variant}
              moves={[]}
              orientation="white"
              movableColor={null}
            />
          </div>
          <p className="text-center font-mono text-xs text-muted-foreground">
            {variant === 'kingofthehill' ? 'The hill: d4 · e4 · d5 · e5' : variant === 'fogofwar' ? 'Visibility follows your legal moves' : `Starting position · ${info.name}`}
          </p>
        </div>
      </main>
    </div>
  )
}

function ModeCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Users
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}
