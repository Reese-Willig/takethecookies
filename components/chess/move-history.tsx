'use client'

import { useEffect, useRef } from 'react'
import { ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MoveRecord } from '@/lib/chess/core'

export function MoveHistory({ moves }: { moves: MoveRecord[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [moves.length])

  const rows: { n: number; white?: MoveRecord; black?: MoveRecord; wi: number }[] = []
  for (let i = 0; i < moves.length; i += 2) rows.push({ n: i / 2 + 1, white: moves[i], black: moves[i + 1], wi: i })
  const last = moves.length - 1

  return (
    <section className="flex min-h-0 flex-col rounded-xl border bg-card" aria-labelledby="history-heading">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 id="history-heading" className="flex items-center gap-2 text-sm font-semibold">
          <ScrollText className="size-4 text-muted-foreground" aria-hidden />
          Move history
        </h2>
        <span className="font-mono text-xs text-muted-foreground">{`${moves.length} ply`}</span>
      </header>
      <div ref={scrollRef} className="h-48 overflow-y-auto px-2 py-2 lg:h-64">
        {rows.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">No moves yet. White opens.</p>
        ) : (
          <ol className="flex flex-col font-mono text-sm">
            {rows.map((row) => (
              <li key={row.n} className="grid grid-cols-[2.5rem_1fr_1fr] items-center rounded-md odd:bg-secondary/40">
                <span className="px-2 py-1 text-xs text-muted-foreground">{`${row.n}.`}</span>
                <MoveCell move={row.white} current={row.wi === last} />
                <MoveCell move={row.black} current={row.wi + 1 === last} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}

function MoveCell({ move, current }: { move?: MoveRecord; current: boolean }) {
  if (!move) return <span />
  return (
    <span
      className={cn(
        'mx-1 rounded px-2 py-1 transition-colors',
        current ? 'bg-primary text-primary-foreground' : 'text-foreground',
      )}
      aria-current={current ? 'step' : undefined}
    >
      {move.san}
    </span>
  )
}
