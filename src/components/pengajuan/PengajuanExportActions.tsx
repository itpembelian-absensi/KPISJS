"use client";

export function PengajuanExportActions({ pdfHref }: { pdfHref: string }) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-xl border border-line bg-bg-elevated px-4 py-2.5 text-sm font-medium"
      >
        Cetak
      </button>
      <a
        href={pdfHref}
        className="rounded-xl border border-line bg-bg-elevated px-4 py-2.5 text-sm font-medium"
      >
        Export PDF
      </a>
    </div>
  );
}
