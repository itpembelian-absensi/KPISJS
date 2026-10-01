import { PENGAJUAN_STATUS_LABEL } from "@/lib/pengajuan";
import type { PengajuanStatus } from "@/lib/types";

const statusClass: Record<PengajuanStatus, string> = {
  submitted: "bg-warn-soft text-warn",
  approved: "bg-info-soft text-info",
  rejected: "bg-danger-soft text-danger",
  done: "bg-ok-soft text-ok",
};

export function PengajuanStatusBadge({ status }: { status: PengajuanStatus }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide ${statusClass[status]}`}
    >
      {PENGAJUAN_STATUS_LABEL[status]}
    </span>
  );
}
