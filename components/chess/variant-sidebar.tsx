import { Check, Crown, EyeOff, Gem, Mountain, Shuffle, Sparkles, SunMedium, WandSparkles, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VARIANTS, type VariantId } from '@/lib/chess/core'

export const VARIANT_ICONS: Record<VariantId, typeof Crown> = {
  chess: Crown,
  antichess: Shuffle,
  kingofthehill: Mountain,
  atomic: Sparkles,
  crazyhouse: WandSparkles,
  horde: Users,
  '3check': SunMedium,
  racingkings: Gem,
  chess960: Shuffle,
  fogofwar: EyeOff,
  checkless: SunMedium,
  absorption: Sparkles,
  takeback: Shuffle,
  selfcapture: Sparkles,
  drawback: Gem,
  mandatoryep: Check,
}

interface VariantSidebarProps {
  value: VariantId
  onChange: (variant: VariantId) => void
  inProgress?: boolean
  children?: React.ReactNode
}

export function VariantSidebar({ value, onChange, inProgress, children }: VariantSidebarProps) {
  return (
    <aside className="flex flex-col gap-4" aria-labelledby="variant-heading">
      <div className="rounded-xl border bg-card p-2">
        <h2 id="variant-heading" className="px-2 pb-2 pt-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Variant
        </h2>
        <div role="radiogroup" aria-labelledby="variant-heading" className="flex flex-col gap-1">
          {VARIANTS.map((variant) => {
            const active = variant.id === value
            const Icon = VARIANT_ICONS[variant.id]
            return (
              <button
                key={variant.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => !active && onChange(variant.id)}
                className={cn(
                  'group flex flex-col gap-2 rounded-lg px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'bg-secondary' : 'hover:bg-secondary/50',
                )}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-md transition-colors',
                      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="flex-1 text-sm font-semibold">{variant.name}</span>
                  {active && <Check className="size-4 text-primary" aria-hidden />}
                </span>
                <span
                  className={cn(
                    'grid transition-all duration-300 ease-out',
                    active ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                  )}
                >
                  <span className="overflow-hidden">
                    <span className="block pb-1 text-xs leading-relaxed text-muted-foreground">{variant.tagline}</span>
                    <ul className="flex flex-col gap-1 pb-1">
                      {variant.rules.map((rule) => (
                        <li key={rule} className="flex gap-2 text-xs leading-relaxed text-foreground/80">
                          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" aria-hidden />
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        {inProgress && (
          <p className="px-3 pb-1.5 pt-2 text-xs leading-relaxed text-muted-foreground">Switching variant starts a fresh game.</p>
        )}
      </div>
      {children}
    </aside>
  )
}
