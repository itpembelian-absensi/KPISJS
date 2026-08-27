"use client";

import type { KpiActivityDocument } from "@/lib/types";

export function ActivityDocumentList({
  documents,
  onRemove,
}: {
  documents: KpiActivityDocument[];
  onRemove?: (url: string) => void;
}) {
  if (!documents.length) return null;
  return (
    <ul className="space-y-1">
      {documents.map((doc) => (
        <li
          key={doc.url}
          className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
        >
          <a
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 truncate text-brand hover:underline"
            title={doc.name}
          >
            {doc.name}
          </a>
          {onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(doc.url)}
              className="shrink-0 text-xs text-danger hover:underline"
            >
              Hapus
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
