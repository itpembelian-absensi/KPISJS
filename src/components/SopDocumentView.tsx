import Link from "next/link";
import type { SopDocument } from "@/lib/types";
import { primarySopDocx, primarySopPdf } from "@/lib/sop-attachments";
import { formatSopDate } from "@/lib/sop-format";

/** Header + isi formal A–E (sama struktur dengan export PDF aplikasi) */
function SopFormalBody({
  sop,
  pageLabel = "1 dari 1",
}: {
  sop: SopDocument;
  pageLabel?: string;
}) {
  return (
    <div className="border border-ink bg-white text-[#0f172a]">
      {/* Header formal — proporsi & garis seperti PDF export */}
      <div className="grid border-b border-ink md:grid-cols-[1.38fr_1fr]">
        <div className="space-y-1.5 border-b border-ink px-3 py-3 md:border-r md:border-b-0 md:px-4 md:py-3.5">
          <p className="text-[11px] font-bold tracking-wide sm:text-sm">
            {sop.divisionLabel || "DIVISI"}
          </p>
          <p className="text-[10px] font-bold uppercase sm:text-xs">
            {sop.documentType || "STANDARD OPERATING PROCEDURE"}
          </p>
          <p className="pt-1 text-sm font-bold text-[#1e3a8a] sm:text-base">
            {sop.title}
          </p>
        </div>
        <table className="w-full border-collapse text-left text-[10px] sm:text-xs">
          <tbody>
            {(
              [
                ["NOMOR DOCUMENT", sop.code],
                ["MULAI BERLAKU", formatSopDate(sop.effectiveDate)],
                ["REVISI", sop.revision || "-"],
                ["TANGGAL REVISI", formatSopDate(sop.revisionDate)],
                ["HALAMAN", pageLabel],
              ] as const
            ).map(([k, v], i, arr) => (
              <tr
                key={k}
                className={i < arr.length - 1 ? "border-b border-ink" : ""}
              >
                <th className="w-[45%] border-r border-ink px-2 py-2 align-middle font-bold">
                  {k}
                </th>
                <td className="px-2 py-2 align-middle font-normal">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 px-4 py-5 sm:px-5 sm:py-6">
        <section>
          <h3 className="text-[13px] font-bold">A. TUJUAN</h3>
          <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-relaxed text-[#1e293b] sm:text-[13px]">
            {sop.purpose || "—"}
          </p>
        </section>
        <section>
          <h3 className="text-[13px] font-bold">B. BAHAN DAN PERALATAN</h3>
          <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-relaxed text-[#1e293b] sm:text-[13px]">
            {sop.materials || "—"}
          </p>
        </section>
        <section>
          <h3 className="text-[13px] font-bold">C. KUALIFIKASI PERSONEL</h3>
          <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-relaxed text-[#1e293b] sm:text-[13px]">
            {sop.qualifications || "—"}
          </p>
        </section>
        <section>
          <h3 className="text-[13px] font-bold">D. PROSEDUR PELAKSANAAN</h3>
          {sop.steps.length === 0 ? (
            <p className="mt-1.5 text-[12px] text-[#1e293b]">—</p>
          ) : (
            <ol className="mt-2 space-y-2.5">
              {sop.steps.map((step) => (
                <li
                  key={`${sop.id}-${step.order}`}
                  className="text-[12px] leading-relaxed sm:text-[13px]"
                >
                  <span className="font-bold text-[#0f172a]">
                    {step.order}. {step.title ? `${step.title}` : ""}
                  </span>
                  {step.body ? (
                    <span className="whitespace-pre-wrap text-[#1e293b]">
                      {step.title ? " " : ""}
                      {step.body}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <h3 className="text-[13px] font-bold">E. NOTE</h3>
          <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-relaxed text-[#1e293b] sm:text-[13px]">
            {sop.notes || "—"}
          </p>
        </section>

        {sop.attachments.length > 0 ? (
          <section>
            <h3 className="text-[13px] font-bold">LAMPIRAN / FILE</h3>
            <ul className="mt-1.5 space-y-1">
              {sop.attachments.map((att, i) => {
                const isFile =
                  att.kind === "file" || att.url.startsWith("/uploads/sops/");
                return (
                  <li key={`${sop.id}-att-${i}`}>
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-[#1e3a8a] underline"
                      {...(isFile
                        ? { download: att.originalName || att.label }
                        : {})}
                    >
                      • {att.originalName || att.label || att.url}
                      {att.url ? ` — ${att.url}` : ""}
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section className="pt-2">
          <div className="overflow-x-auto">
            <table className="w-full border border-ink text-left text-[10px] sm:text-xs">
              <thead>
                <tr className="border-b border-ink">
                  <th className="w-[18%] border-r border-ink px-2 py-1.5 font-bold">
                    DISPOSISI
                  </th>
                  <th className="w-[28%] border-r border-ink px-2 py-1.5 font-bold">
                    NAMA
                  </th>
                  <th className="w-[34%] border-r border-ink px-2 py-1.5 font-bold">
                    JABATAN
                  </th>
                  <th className="w-[20%] px-2 py-1.5 font-bold">TANDA TANGAN</th>
                </tr>
              </thead>
              <tbody>
                {(sop.dispositions.length > 0
                  ? sop.dispositions
                  : [
                      { role: "Dibuat Oleh", name: "", position: sop.departmentName || "Departemen" },
                      { role: "Diperiksa Oleh", name: "", position: "Manager" },
                      {
                        role: "Diperiksa Oleh",
                        name: "",
                        position: "Management Representative",
                      },
                      {
                        role: "Disetujui Oleh",
                        name: "",
                        position: "Direktur",
                      },
                    ]
                ).map((d, i) => (
                  <tr
                    key={`${sop.id}-disp-${i}`}
                    className="border-b border-ink last:border-b-0"
                  >
                    <td className="border-r border-ink px-2 py-2 align-middle">
                      {d.role}
                    </td>
                    <td className="border-r border-ink px-2 py-2 align-middle">
                      {d.name || ""}
                    </td>
                    <td className="border-r border-ink px-2 py-2 align-middle">
                      {d.position}
                    </td>
                    <td className="px-2 py-2 align-middle" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export function SopDocumentView({
  sop,
  showActions = true,
  /** Jika ada PDF lampiran, tampilkan file PDF (sama persis) sebagai isi utama */
  preferPdfFile = true,
  pageLabel,
}: {
  sop: SopDocument;
  showActions?: boolean;
  preferPdfFile?: boolean;
  pageLabel?: string;
}) {
  const pdf = preferPdfFile ? primarySopPdf(sop) : null;
  const docx = primarySopDocx(sop);

  const pdfHref = pdf
    ? pdf.url
    : `/api/sop/export?format=pdf&ids=${sop.id}&inline=1`;

  return (
    <article className="overflow-hidden rounded-none border-0 bg-transparent shadow-none">
      {showActions ? (
        <div className="mb-3 flex flex-wrap gap-2">
          <a
            href={pdf ? pdf.url : `/api/sop/export?format=pdf&ids=${sop.id}`}
            {...(pdf
              ? {
                  target: "_blank" as const,
                  rel: "noopener noreferrer",
                  download: pdf.originalName || pdf.label,
                }
              : {})}
            className="rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white"
          >
            Unduh PDF
          </a>
          <a
            href={
              docx
                ? docx.url
                : `/api/sop/export?format=docx&ids=${sop.id}`
            }
            {...(docx
              ? {
                  download: docx.originalName || docx.label,
                }
              : {})}
            className="rounded-xl border border-brand px-3 py-2 text-sm font-medium text-brand"
          >
            {docx ? "Unduh Word asli" : "Unduh Word"}
          </a>
          <Link
            href="/master/sops"
            className="rounded-xl border border-line px-3 py-2 text-sm text-ink-muted hover:bg-bg"
          >
            Kembali ke daftar
          </Link>
        </div>
      ) : null}

      {pdf || docx ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border border-ink bg-white px-3 py-2">
            <div>
              <p className="mono text-[11px] font-bold text-[#1e3a8a]">
                {sop.code}
              </p>
              <p className="text-sm font-bold text-[#0f172a]">{sop.title}</p>
            </div>
            <p className="text-[11px] text-[#64748b]">
              Tampilan PDF dari file Word asli (layout sama)
            </p>
          </div>
          <div className="border border-ink bg-[#e2e8f0]">
            <iframe
              title={`PDF ${sop.code}`}
              src={`${pdfHref}#toolbar=1&navpanes=0`}
              className="h-[min(88vh,1100px)] w-full bg-white"
            />
          </div>
          <details className="border border-ink bg-white">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-[#64748b] hover:bg-[#f8fafc]">
              Ringkasan formal A–E (data sistem) — buka jika perlu
            </summary>
            <div className="border-t border-ink">
              <SopFormalBody sop={sop} pageLabel={pageLabel} />
            </div>
          </details>
        </div>
      ) : (
        <SopFormalBody sop={sop} pageLabel={pageLabel} />
      )}
    </article>
  );
}
