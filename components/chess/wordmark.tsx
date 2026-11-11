export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-6 grid-cols-2 grid-rows-2 overflow-hidden rounded-[5px]" aria-hidden>
        <span className="bg-board-light" />
        <span className="bg-board-dark" />
        <span className="bg-board-dark" />
        <span className="bg-primary" />
      </span>
      <span className="text-sm font-semibold tracking-tight">Sixty-Four</span>
    </span>
  )
}
