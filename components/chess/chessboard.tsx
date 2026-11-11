'use client'

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { cn } from '@/lib/utils'
import {
  HILL_SQUARES,
  checkedKingSquare,
  dropDests,
  forcedSquares,
  type DrawbackCard,
  isPromotion,
  legalDests,
  makeSquare,
  promotionRoles,
  type Color,
  type MoveRecord,
  type Position,
  type Role,
  type Square,
  type VariantId,
} from '@/lib/chess/core'
import { trackPieces } from '@/lib/chess/piece-ids'
import { PieceImage } from './piece-image'

interface ChessboardProps {
  position: Position
  variant: VariantId
  moves: MoveRecord[]
  orientation: Color
  movableColor: Color | null
  onMove?: (from: Square, to: Square, promotion?: Role) => void
  onDrop?: (role: Role, to: Square) => void
  className?: string
  chess960Seed?: number
  drawbackCard?: DrawbackCard
}

interface DragState {
  from: Square
  x: number
  y: number
  moved: boolean
}

const FILES = 'abcdefgh'

export function Chessboard({ position, variant, moves, orientation, movableColor, onMove, onDrop, className, chess960Seed = 517, drawbackCard }: ChessboardProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<Square | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [hover, setHover] = useState<Square | null>(null)
  const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null)
  const [dropRole, setDropRole] = useState<Role | null>(null)

  const pieces = useMemo(() => trackPieces(variant, moves, chess960Seed), [variant, moves, chess960Seed])
  const dests = useMemo(() => (movableColor ? legalDests(position, variant, moves, drawbackCard) : new Map<Square, Square[]>()), [position, movableColor, variant, moves])
  const forced = useMemo(() => forcedSquares(position, variant, moves), [position, variant, moves])
  const lastMove = moves.at(-1)
  const checkSquare = checkedKingSquare(position, variant)
  const frozenSquare = variant === 'drawback' && moves.at(-1)?.captured && moves.at(-1)?.color === position.turn ? moves.at(-1)?.to : undefined
  const fogEnabled = variant === 'fogofwar' && !!movableColor
  const visibleSquares = useMemo(() => {
    if (!fogEnabled) return new Set<number>(Array.from({ length: 64 }, (_, i) => i))
    const visible = new Set<number>()
    for (const [sq, piece] of position.board) if (piece.color === movableColor) visible.add(sq)
    for (const [from, tos] of dests) { visible.add(from); tos.forEach((to) => visible.add(to)) }
    return visible
  }, [dests, fogEnabled])

  const activeFrom = drag?.from ?? selected
  const activeDests = activeFrom !== null ? (dests.get(activeFrom) ?? []) : []

  const toDisplay = (sq: Square) => {
    const file = sq % 8
    const rank = Math.floor(sq / 8)
    return orientation === 'white' ? { x: file, y: 7 - rank } : { x: 7 - file, y: rank }
  }

  const squareFromPoint = (clientX: number, clientY: number): Square | null => {
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) return null
    const x = Math.floor(((clientX - rect.left) / rect.width) * 8)
    const y = Math.floor(((clientY - rect.top) / rect.height) * 8)
    if (x < 0 || x > 7 || y < 0 || y > 7) return null
    return orientation === 'white' ? (7 - y) * 8 + x : y * 8 + (7 - x)
  }

  const localPoint = (clientX: number, clientY: number) => {
    const rect = boardRef.current!.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const attemptMove = (from: Square, to: Square) => {
    if (!(dests.get(from) ?? []).includes(to)) return false
    setSelected(null)
    if (isPromotion(position, from, to)) {
      setPromotion({ from, to })
      return true
    }
    onMove?.(from, to)
    return true
  }

  const ownPieceAt = (sq: Square) => {
    const piece = position.board.get(sq)
    return !!piece && piece.color === movableColor && dests.has(sq)
  }

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (promotion || !movableColor || e.button !== 0) return
    const sq = squareFromPoint(e.clientX, e.clientY)
    if (sq === null) return
    if (dropRole) {
      if (dropDests(position, dropRole).includes(sq)) onDrop?.(dropRole, sq)
      setDropRole(null)
      return
    }
    if (selected !== null && selected !== sq && attemptMove(selected, sq)) return
    if (ownPieceAt(sq)) {
      e.currentTarget.setPointerCapture(e.pointerId)
      setSelected(sq)
      setDrag({ from: sq, ...localPoint(e.clientX, e.clientY), moved: false })
    } else {
      setSelected(null)
    }
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return
    const p = localPoint(e.clientX, e.clientY)
    const moved = drag.moved || Math.hypot(p.x - drag.x, p.y - drag.y) > 4
    setDrag({ ...drag, ...p, moved })
    setHover(squareFromPoint(e.clientX, e.clientY))
  }

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return
    const sq = squareFromPoint(e.clientX, e.clientY)
    if (drag.moved && sq !== null && sq !== drag.from && !attemptMove(drag.from, sq)) setSelected(null)
    setDrag(null)
    setHover(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, sq: Square) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    if (selected !== null && attemptMove(selected, sq)) return
    setSelected(ownPieceAt(sq) ? sq : null)
  }

  const squares = Array.from({ length: 64 }, (_, i) => {
    const x = i % 8
    const y = Math.floor(i / 8)
    const sq = orientation === 'white' ? (7 - y) * 8 + x : y * 8 + (7 - x)
    return { sq, x, y }
  })

  return (
    <div
      ref={boardRef}
      className={cn('relative aspect-square w-full touch-none select-none overflow-hidden rounded-md shadow-2xl shadow-background', className)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        setDrag(null)
        setHover(null)
      }}
    >
      {variant === 'crazyhouse' && movableColor && (
        <div className="absolute left-2 top-2 z-50 flex gap-1 rounded-md bg-background/90 p-1 shadow-lg ring-1 ring-border" aria-label="Pocket pieces">
          {(['queen', 'rook', 'bishop', 'knight', 'pawn'] as Role[]).map((role) => {
            const count = position.pockets?.[position.turn][role] ?? 0
            const active = dropRole === role
            return (
              <button
                key={role}
                type="button"
                aria-label={`Drop ${role}`}
                aria-pressed={active}
                disabled={count === 0}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  if (count === 0) return
                  setSelected(null)
                  setDropRole(active ? null : role)
                }}
                className={cn('relative size-10 rounded-md p-1 transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-30', active && 'bg-primary/25 ring-2 ring-primary')}
              >
                <PieceImage piece={{ color: movableColor, role }} className="size-full" />
                <span className="absolute bottom-0 right-0 rounded bg-background px-1 font-mono text-[10px] text-foreground">{count}</span>
              </button>
            )
          })}
        </div>
      )}
      <div className="grid size-full grid-cols-8 grid-rows-8" role="grid" aria-label="Chessboard">
        {squares.map(({ sq, x, y }) => {
          const light = (x + y) % 2 === 0
          const piece = position.board.get(sq)
          const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq)
          const isDest = activeDests.includes(sq)
          const isOwnTarget = isDest && piece && piece.color === position.turn && variant !== 'selfcapture'
          const isHill = variant === 'kingofthehill' && HILL_SQUARES.includes(sq)
          const isFogged = fogEnabled && !visibleSquares.has(sq)
          const name = makeSquare(sq)
          return (
            <button
              key={sq}
              type="button"
              tabIndex={movableColor ? 0 : -1}
              aria-label={isFogged ? `${name} hidden by fog of war` : `${name}${piece ? ` ${piece.color} ${piece.role}` : ''}`}
              aria-pressed={selected === sq}
              onKeyDown={(e) => handleKeyDown(e, sq)}
              className={cn(
                'relative outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                light ? 'bg-board-light' : 'bg-board-dark',
              )}
            >
              {isLast && <span className="absolute inset-0 bg-highlight/45" aria-hidden />}
              {frozenSquare === sq && <span className="absolute inset-0 z-30 bg-blue-950/55" aria-label="Frozen after capturing" />}
              {isFogged && <span className="absolute inset-0 z-20 bg-black" aria-label="Hidden by fog of war" />}
              {selected === sq && <span className="absolute inset-0 bg-highlight/70" aria-hidden />}
              {isHill && <span className="absolute inset-[6%] rounded-sm border-2 border-dashed border-primary/80" aria-hidden />}
              {forced.has(sq) && piece && <span className="pointer-events-none absolute inset-1 z-20 rounded-sm border-2 border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.45)]" aria-label="Forced move available" />}
              {checkSquare === sq && (
                <span
                  className="absolute inset-0"
                  style={{ background: 'radial-gradient(circle, var(--destructive) 0%, transparent 72%)' }}
                  aria-hidden
                />
              )}
              {drag?.moved && hover === sq && isDest && (
                <span className="absolute inset-0 ring-4 ring-inset ring-foreground/50" aria-hidden />
              )}
              {isDest && !isOwnTarget && !piece && (
                <span className="absolute left-1/2 top-1/2 size-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-background/35" aria-hidden />
              )}
              {isDest && !isOwnTarget && piece && (
                <span className="absolute inset-[4%] rounded-full border-[5px] border-background/35" aria-hidden />
              )}
              {x === 0 && (
                <span
                  className={cn(
                    'absolute left-1 top-0.5 font-mono text-[10px] font-semibold sm:text-xs',
                    light ? 'text-board-dark' : 'text-board-light',
                  )}
                  aria-hidden
                >
                  {Math.floor(sq / 8) + 1}
                </span>
              )}
              {y === 7 && (
                <span
                  className={cn(
                    'absolute bottom-0.5 right-1 font-mono text-[10px] font-semibold sm:text-xs',
                    light ? 'text-board-dark' : 'text-board-light',
                  )}
                  aria-hidden
                >
                  {FILES[sq % 8]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {pieces.map(({ id, square, piece }) => {
          const { x, y } = toDisplay(square)
          const dragging = drag?.moved && drag.from === square
          const size = boardRef.current ? boardRef.current.clientWidth / 8 : 0
          const transform = dragging
            ? `translate(${drag.x - size / 2}px, ${drag.y - size / 2}px) scale(1.12)`
            : `translate(${x * 100}%, ${y * 100}%)`
          return (
            <div
              key={id}
              className={cn(
                'absolute left-0 top-0 size-[12.5%] will-change-transform',
                dragging ? 'z-30 drop-shadow-2xl' : 'z-10 transition-transform duration-200 ease-out',
              )}
              style={{ transform }}
            >
              <PieceImage piece={piece} className="size-full p-[4%]" />
            </div>
          )
        })}
      </div>

      {promotion && (
        <PromotionPicker
          color={position.turn}
          roles={promotionRoles(variant)}
          column={toDisplay(promotion.to).x}
          fromTop={toDisplay(promotion.to).y === 0}
          onPick={(role) => {
            onMove?.(promotion.from, promotion.to, role)
            setPromotion(null)
          }}
          onCancel={() => setPromotion(null)}
        />
      )}
    </div>
  )
}

function PromotionPicker({
  color,
  roles,
  column,
  fromTop,
  onPick,
  onCancel,
}: {
  color: Color
  roles: Role[]
  column: number
  fromTop: boolean
  onPick: (role: Role) => void
  onCancel: () => void
}) {
  return (
    <div
      className="absolute inset-0 z-40 bg-background/60 backdrop-blur-[2px] animate-in fade-in duration-150"
      onPointerDown={(e) => {
        e.stopPropagation()
        if (e.target === e.currentTarget) onCancel()
      }}
      role="dialog"
      aria-label="Choose promotion piece"
    >
      <div
        className={cn('absolute flex w-[12.5%] flex-col overflow-hidden rounded-md bg-card shadow-2xl ring-1 ring-border', fromTop ? 'top-0' : 'bottom-0 flex-col-reverse')}
        style={{ left: `${column * 12.5}%` }}
      >
        {roles.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => onPick(role)}
            className="aspect-square p-[8%] transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
            aria-label={`Promote to ${role}`}
          >
            <PieceImage piece={{ color, role }} className="size-full" />
          </button>
        ))}
      </div>
    </div>
  )
}
