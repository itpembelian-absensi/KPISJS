import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerCodeStartForm } from "@/components/pengajuan/CustomerCodeStartForm";
import { CustomerSheets } from "@/components/pengajuan/CustomerSheets";
import { PengajuanExportActions } from "@/components/pengajuan/PengajuanExportActions";
import { PengajuanList } from "@/components/pengajuan/PengajuanList";
import { canSeePengajuanItem } from "@/lib/pengajuan-approval-view";
import {
  customerCodesBySubmission,
  getCustomerCodeStart,
} from "@/lib/customer-ops";
import { getPengajuanType } from "@/lib/pengajuan";
import { listPengajuan } from "@/lib/pengajuan-ops";
import { requireMenu } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PengajuanTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ jenis: string }>;
  searchParams: Promise<{ sheet?: string }>;
}) {
  const { jenis } = await params;
  if (jenis === "customer_ubah") {
    redirect("/pengajuan/customer?sheet=ubah");
  }
  const { sheet } = await searchParams;
  if (jenis === "customer" && sheet === "daftar") {
    redirect("/pengajuan/customer");
  }
  const def = getPengajuanType(jenis);
  if (!def) notFound();

  const customerSheet =
    jenis !== "customer" ? null : sheet === "ubah" ? "ubah" : "tambah";
  const viewDef =
    customerSheet === "ubah" ? getPengajuanType("customer_ubah") : def;
  if (!viewDef) notFound();

  const user = await requireMenu(def.href);
  const items = listPengajuan(viewDef.type).filter((item) =>
    canSeePengajuanItem(user, item),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            className="text-sm text-brand"
            style={{ fontFamily: "var(--font-accent), serif" }}
          >
            Pengajuan
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {viewDef.label}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">{viewDef.intro}</p>
        </div>
        <div className="flex flex-col gap-2 print:hidden sm:items-end">
          <PengajuanExportActions
            pdfHref={`/api/pengajuan/export?type=${encodeURIComponent(viewDef.type)}`}
          />
          <Link
            href={
              customerSheet === "ubah"
                ? "/pengajuan/customer/baru?sheet=ubah"
                : `${def.href}/baru`
            }
            className="inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-deep sm:w-auto"
          >
            Buat pengajuan
          </Link>
        </div>
      </div>
      {customerSheet ? (
        <CustomerSheets active={customerSheet} mode="list" />
      ) : null}
      {customerSheet === "tambah" && user.role === "admin" ? (
        <CustomerCodeStartForm initial={getCustomerCodeStart()} />
      ) : null}
      <PengajuanList
        items={items}
        customerCodes={
          customerSheet === "tambah" ? customerCodesBySubmission() : undefined
        }
        viewer={{ id: user.id, role: user.role, staffId: user.staffId }}
      />
    </div>
  );
}
