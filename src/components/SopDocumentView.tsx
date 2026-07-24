import Link from "next/link";
import type { SopDocument } from "@/lib/types";
import { formatSopDate } from "@/lib/sop-format";

export function SopDocumentView({
  sop,
  showActions = true,
}: {
  sop: SopDocument;
  showActions?: boolean;
}) {
  return (
    <article className="panel overflow-hidden p-0">
      {showActions ? (
        <div className="flex flex-wrap gap-2 border-b border-line px-4 py-3">
          <a
            href={`/api/sop/export?format=pdf&ids=${sop.id}`}
            className="rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white"
          >
            Unduh PDF
          </a>
          <a
            href={`/api/sop/export?format=docx&ids=${sop.id}`}
            className="rounded-xl border border-brand px-3 py-2 text-sm font-medium text-brand"
          >
            Unduh Word
          </a>
          <Link
            href="/master/sops"
            className="rounded-xl border border-line px-3 py-2 text-sm text-ink-muted hover:bg-bg"
          >
            Kembali ke daftar
          </Link>
        </div>
      ) : null}

      {/* Header formal seperti dokumen SOP */}
      <div className="grid border-b border-ink md:grid-cols-[1.35fr_1fr]">
        <div className="space-y-2 border-b border-ink p-4 md:border-r md:border-b-0">
          <p className="text-sm font-bold tracking-wide">
            {sop.divisionLabel || "DIVISI IT"}
          </p>
          <p className="text-xs font-bold uppercase">
            {sop.documentType || "STANDARD OPERATING PROCEDURE"}
          </p>
          <p className="pt-2 text-base font-bold text-brand-deep">
            {sop.title}
          </p>
        </div>
        <table className="w-full text-left text-xs">
          <tbody>
            {(
              [
                ["NOMOR DOCUMENT", sop.code],
                ["MULAI BERLAKU", formatSopDate(sop.effectiveDate)],
                ["REVISI", sop.revision || "-"],
                ["TANGGAL REVISI", formatSopDate(sop.revisionDate)],
                ["HALAMAN", "1 dari 1"],
              ] as const
            ).map(([k, v], i, arr) => (
              <tr
                key={k}
                className={i < arr.length - 1 ? "border-b border-ink" : ""}
              >
                <th className="w-[45%] border-r border-ink px-2 py-2 font-bold">
                  {k}
                </th>
                <td className="px-2 py-2">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-5 p-5 md:p-6">
        <section>
          <h3 className="text-sm font-bold">A. TUJUAN</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {sop.purpose || "—"}
          </p>
        </section>
        <section>
          <h3 className="text-sm font-bold">B. BAHAN DAN PERALATAN</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {sop.materials || "—"}
          </p>
        </section>
        <section>
          <h3 className="text-sm font-bold">C. KUALIFIKASI PERSONEL</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {sop.qualifications || "—"}
          </p>
        </section>
        <section>
          <h3 className="text-sm font-bold">D. PROSEDUR PELAKSANAAN</h3>
          {sop.steps.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">—</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {sop.steps.map((step) => (
                <li key={`${sop.id}-${step.order}`} className="text-sm">
                  <span className="font-bold">
                    {step.order}. {step.title ? `${step.title} ` : ""}
                  </span>
                  <span className="whitespace-pre-wrap leading-relaxed">
                    {step.body}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <h3 className="text-sm font-bold">E. NOTE</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {sop.notes || "—"}
          </p>
        </section>

        {sop.attachments.length > 0 ? (
          <section>
            <h3 className="text-sm font-bold">LAMPIRAN / LINK</h3>
            <ul className="mt-2 space-y-1">
              {sop.attachments.map((att, i) => (
                <li key={`${sop.id}-att-${i}`}>
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand underline"
                  >
                    {att.label || att.url}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <div className="overflow-x-auto">
            <table className="w-full border border-ink text-left text-xs">
              <thead>
                <tr className="border-b border-ink">
                  <th className="w-[18%] border-r border-ink px-2 py-1 font-bold">
                    DISPOSISI
                  </th>
                  <th className="w-[28%] border-r border-ink px-2 py-1 font-bold">
                    NAMA
                  </th>
                  <th className="w-[34%] border-r border-ink px-2 py-1 font-bold">
                    JABATAN
                  </th>
                  <th className="w-[20%] px-2 py-1 font-bold">TANDA TANGAN</th>
                </tr>
              </thead>
              <tbody>
                {sop.dispositions.map((d, i) => (
                  <tr
                    key={`${sop.id}-disp-${i}`}
                    className="border-b border-ink last:border-b-0"
                  >
                    <td className="border-r border-ink px-2 py-1.5 align-middle">
                      {d.role}
                    </td>
                    <td className="border-r border-ink px-2 py-1.5 align-middle">
                      {d.name || ""}
                    </td>
                    <td className="border-r border-ink px-2 py-1.5 align-middle">
                      {d.position}
                    </td>
                    <td className="px-2 py-1.5 align-middle" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </article>
  );
}
