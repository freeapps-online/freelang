export function MiniStat({ label, value, color, detail }: { label: string; value: string; color: string; detail: string }) {
  return (
    <div className="rounded-[0.75rem] border border-[var(--line)] bg-[var(--glass)] p-2.5">
      <div className="text-[0.6rem] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-xl font-extrabold" style={{ color }}>{value}</div>
      <div className="text-[0.6rem] text-[var(--muted)]">{detail}</div>
    </div>
  )
}
