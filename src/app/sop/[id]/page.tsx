import { notFound } from "next/navigation";
import { SopDocumentView } from "@/components/SopDocumentView";
import { requireSopAccess } from "@/lib/session";
import { getSop } from "@/lib/sop-ops";

export const dynamic = "force-dynamic";

export default async function SopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSopAccess();
  const { id } = await params;
  const sop = getSop(id);
  if (!sop) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          SOP IT
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Baca dokumen
        </h1>
      </div>
      <SopDocumentView sop={sop} />
    </div>
  );
}
