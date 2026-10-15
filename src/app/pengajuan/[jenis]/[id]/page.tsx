import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PengajuanDetail } from "@/components/pengajuan/PengajuanDetail";
import { PengajuanExportActions } from "@/components/pengajuan/PengajuanExportActions";
import { canAccessMenu } from "@/lib/auth";
import {
  canActOnPengajuan,
  canSeePengajuanItem,
  canUnapprovePengajuan,
} from "@/lib/pengajuan-approval-view";
import { getCustomerCodeBySubmission } from "@/lib/customer-ops";
import { getPengajuanType } from "@/lib/pengajuan";
import { getPengajuan } from "@/lib/pengajuan-ops";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PengajuanDetailPage({
  params,
}: {
  params: Promise<{ jenis: string; id: string }>;
}) {
  const { jenis, id } = await params;
  const def = getPengajuanType(jenis);
  if (!def) notFound();

  const user = await requireUser();
  if (!canAccessMenu(user, def.href)) redirect("/");
  const item = getPengajuan(id);
  if (!item || item.type !== def.type) notFound();
  if (!canSeePengajuanItem(user, item)) {
    redirect(
      def.type === "customer_ubah" ? "/pengajuan/customer?sheet=ubah" : def.href,
    );
  }

  const viewer = { id: user.id, role: user.role, staffId: user.staffId };
  const canReview = canActOnPengajuan(viewer, item);
  const canUnapprove = canUnapprovePengajuan(viewer, item);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          {def.label}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Detail pengajuan
        </h1>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={
              def.type === "customer_ubah"
                ? "/pengajuan/customer?sheet=ubah"
                : def.href
            }
            className="inline-block text-sm text-brand-deep hover:underline print:hidden"
          >
            ← Kembali ke daftar
          </Link>
          <PengajuanExportActions pdfHref={`/api/pengajuan/export?id=${item.id}`} />
        </div>
      </div>
      <PengajuanDetail
        item={item}
        displayCode={
          item.type === "customer"
            ? (getCustomerCodeBySubmission(item.id) ?? undefined)
            : undefined
        }
        def={{ label: def.label, fields: def.fields, photos: def.photos }}
        canReview={canReview}
        canUnapprove={canUnapprove}
      />
    </div>
  );
}
