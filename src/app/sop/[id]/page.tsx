import { notFound } from "next/navigation";
import { SopDocumentView } from "@/components/SopDocumentView";
import { requireSopAccess } from "@/lib/session";
import { ensureSopOriginalPdf } from "@/lib/sop-ensure-pdf";
import { sopWithFilesOnDisk } from "@/lib/sop-files";
import { getSop, userCanViewSop } from "@/lib/sop-ops";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export default async function SopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSopAccess();
  const { id } = await params;
  const sop = getSop(id);
  if (!sop || !userCanViewSop(user, sop)) notFound();
  const stored = await ensureSopOriginalPdf(sop);
  const ready = sopWithFilesOnDisk(stored);
  const originalMissing = ready.attachments.length < stored.attachments.length;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          SOP · {sop.departmentName}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Baca dokumen
        </h1>
      </div>
      {originalMissing ? (
        <p className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
          File PDF/Word asli tidak ada di server. Yang ditampilkan adalah isi
          SOP yang tersimpan di sistem.
        </p>
      ) : null}
      <SopDocumentView sop={ready} />
    </div>
  );
}
