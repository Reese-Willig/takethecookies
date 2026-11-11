import type { Piece } from '@/lib/chess/core'

const ROLE_CODE: Record<Piece['role'], string> = {
  king: 'K',
  queen: 'Q',
  rook: 'R',
  bishop: 'B',
  knight: 'N',
  pawn: 'P',
}

export function PieceImage({ piece, className, alt = '' }: { piece: Piece; className?: string; alt?: string }) {
  const src = `/pieces/${piece.color === 'white' ? 'w' : 'b'}${ROLE_CODE[piece.role]}.svg`
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} draggable={false} className={className} />
}
