import { SLA_TARGET_HINT } from "@/lib/sla";

/** Banner ringkas target SLA — dipakai di Report KPI, Buat Tiket, Antrian Tiket */
export function SlaTargetHint({ className = "" }: { className?: string }) {
  return (
    <p
      className={`rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 ${className}`}
    >
      {SLA_TARGET_HINT}
    </p>
  );
}
