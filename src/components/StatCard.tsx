import { formatDuration } from "@/lib/sla";

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "ok" | "warn" | "danger" | "brand";
}) {
  const tones = {
    default: "border-line",
    ok: "border-ok/30 bg-ok-soft/40",
    warn: "border-warn/30 bg-warn-soft/50",
    danger: "border-danger/30 bg-danger-soft/40",
    brand: "border-brand/25 bg-brand-soft/50",
  };

  return (
    <div className={`panel p-4 ${tones[tone]}`}>
      <p className="text-[11px] tracking-[0.14em] text-ink-muted uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function formatPercent(n: number | null | undefined, digits = 0) {
  if (n == null) return "—";
  return `${n.toFixed(digits)}%`;
}

export function formatScore(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toFixed(1);
}

export function formatHours(n: number | null | undefined) {
  return formatDuration(n);
}
