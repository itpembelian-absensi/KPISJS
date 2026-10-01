import Link from "next/link";
import { PengajuanExportActions } from "@/components/pengajuan/PengajuanExportActions";
import { PengajuanList } from "@/components/pengajuan/PengajuanList";
import { canSeePengajuan } from "@/lib/auth";
import { PENGAJUAN_TYPES } from "@/lib/pengajuan";
import { listPengajuan } from "@/lib/pengajuan-ops";
import { requireMenu } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PengajuanPage() {
  const user = await requireMenu("/pengajuan");
  const ownOnly = user.role === "staff" || user.role === "assessor";
  const items = listPengajuan().filter((item) => canSeePengajuan(user, item));
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
  }

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Formulir permintaan
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {ownOnly ? "Pengajuan Saya" : "Semua Pengajuan"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Approve dan void transaksi, penambahan master, asset IT, dan akses sistem.
          Alur: diajukan, disetujui atasan atau IT, lalu ditandai selesai setelah
          diproses di sistem.
        </p>
        <div className="mt-3">
          <PengajuanExportActions pdfHref="/api/pengajuan/export" />
        </div>
      </div>

      <div className="grid gap-3 print:hidden sm:grid-cols-2 xl:grid-cols-3">
        {PENGAJUAN_TYPES.filter((type) => type.listed !== false).map((type) => {
          const count =
            (counts.get(type.type) ?? 0) +
            (type.type === "customer" ? (counts.get("customer_ubah") ?? 0) : 0);
          return (
            <Link
              key={type.type}
              href={type.href}
              className="panel block p-4 transition hover:ring-1 hover:ring-brand/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{type.label}</div>
                  <p className="mt-1 text-xs text-ink-muted">{type.menuHint}</p>
                </div>
                <span className="rounded-lg bg-brand-soft px-2 py-1 text-sm font-semibold text-brand-deep">
                  {count}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <PengajuanList
        items={items}
        showType
        canApprove={user.role === "admin" || user.role === "manager"}
        approverStaffId={user.staffId}
        allowSelfApprove={user.role === "admin"}
      />
    </div>
  );
}
