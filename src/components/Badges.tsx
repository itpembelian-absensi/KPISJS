import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/sla";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/lib/types";

const statusClass: Record<TicketStatus, string> = {
  open: "bg-info-soft text-info",
  in_progress: "bg-brand-soft text-brand-deep",
  pending: "bg-warn-soft text-warn",
  resolved: "bg-ok-soft text-ok",
  closed: "bg-line text-ink-muted",
};

const priorityClass: Record<TicketPriority, string> = {
  critical: "bg-danger-soft text-danger",
  high: "bg-accent-soft text-accent",
  medium: "bg-warn-soft text-warn",
  low: "bg-line text-ink-muted",
  day2: "bg-info-soft text-info",
  day4: "bg-info-soft text-info",
  week1: "bg-brand-soft text-brand-deep",
  week2: "bg-brand-soft text-brand-deep",
  week3: "bg-brand-soft text-brand-deep",
  week4: "bg-brand-soft text-brand-deep",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide ${statusClass[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ${priorityClass[priority]}`}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function CategoryBadge({ category }: { category: TicketCategory }) {
  return (
    <span className="inline-flex rounded-md bg-bg px-2 py-0.5 text-[11px] text-ink-muted">
      {CATEGORY_LABEL[category]}
    </span>
  );
}
