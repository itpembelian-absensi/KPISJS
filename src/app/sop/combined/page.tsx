import Link from "next/link";
import { SopDocumentView } from "@/components/SopDocumentView";
import { requireSopAccess } from "@/lib/session";
import { primarySopPdf } from "@/lib/sop-attachments";
import { ensureSopOriginalPdf } from "@/lib/sop-ensure-pdf";
import { getSopsByIds, userCanViewSop } from "@/lib/sop-ops";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export default async function SopCombinedPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const user = await requireSopAccess();
  const sp = await searchParams;
  const ids = (sp.ids || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const sops = [];
  for (const sop of getSopsByIds(ids).filter((s) => userCanViewSop(user, s))) {
    sops.push(await ensureSopOriginalPdf(sop));
  }
  const idsQuery = sops.map((s) => s.id).join(",");
  const hasOriginalPdf = sops.some((s) => primarySopPdf(s));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          SOP
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Tampilan gabungan
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {sops.length} dokumen ditampilkan berurutan
          {hasOriginalPdf
            ? " — PDF dari file Word asli (layout sama)."
            : "."}
        </p>
        {sops.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`/api/sop/export?format=pdf&ids=${encodeURIComponent(idsQuery)}`}
              className="rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white"
            >
              Unduh PDF gabungan
            </a>
            <a
              href={`/api/sop/export?format=docx&ids=${encodeURIComponent(idsQuery)}`}
              className="rounded-xl border border-brand px-3 py-2 text-sm font-medium text-brand"
            >
              Unduh Word gabungan
            </a>
            <Link
              href="/master/sops"
              className="rounded-xl border border-line px-3 py-2 text-sm text-ink-muted hover:bg-bg"
            >
              Kembali ke daftar
            </Link>
          </div>
        ) : null}
      </div>

      {sops.length === 0 ? (
        <div className="panel p-6 text-sm text-ink-muted">
          Tidak ada SOP dipilih. Centang dokumen di{" "}
          <Link href="/master/sops" className="text-brand underline">
            daftar SOP
          </Link>{" "}
          lalu klik Lihat gabungan.
        </div>
      ) : (
        <div className="space-y-8">
          {sops.map((sop, i) => (
            <SopDocumentView
              key={sop.id}
              sop={sop}
              showActions={false}
              pageLabel={`${i + 1} dari ${sops.length}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
