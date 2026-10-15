import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerSheets } from "@/components/pengajuan/CustomerSheets";
import { PengajuanForm } from "@/components/pengajuan/PengajuanForm";
import { canViewAllTickets } from "@/lib/auth";
import { listAssetCategories } from "@/lib/asset-category-ops";
import { listJenisData } from "@/lib/jenis-data-ops";
import { listCustomers } from "@/lib/customer-ops";
import { getPengajuanType } from "@/lib/pengajuan";
import { requireMenu } from "@/lib/session";
import { listDepartments, listStaff } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function PengajuanBaruPage({
  params,
  searchParams,
}: {
  params: Promise<{ jenis: string }>;
  searchParams: Promise<{ sheet?: string }>;
}) {
  const { jenis } = await params;
  if (jenis === "customer_ubah") {
    redirect("/pengajuan/customer/baru?sheet=ubah");
  }
  const def = getPengajuanType(jenis);
  if (!def) notFound();

  const { sheet } = await searchParams;
  const customerChange = jenis === "customer" && sheet === "ubah";
  const formDef = customerChange ? getPengajuanType("customer_ubah") : def;
  if (!formDef) notFound();

  const user = await requireMenu(def.href);
  const assetCategories =
    formDef.type === "asset" ? listAssetCategories(true).map((item) => item.name) : null;
  const jenisData =
    formDef.type === "perubahan" ? listJenisData(true).map((item) => item.name) : null;
  const fields = formDef.fields.map((field) => {
    if (field.key === "kategoriAsset") {
      return { ...field, options: assetCategories ?? [] };
    }
    if (field.key === "objek") return { ...field, options: jenisData ?? [] };
    return field;
  });
  const departments = listDepartments(true);
  const allStaff = listStaff(true);
  const canPickOthers = canViewAllTickets(user.role);
  const staffList = canPickOthers
    ? allStaff
    : allStaff.filter((s) => s.id === user.staffId);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          {formDef.kicker}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {formDef.label}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">{formDef.intro}</p>
        <Link
          href={customerChange ? "/pengajuan/customer?sheet=ubah" : def.href}
          className="mt-3 inline-block text-sm text-brand-deep hover:underline"
        >
          ← Kembali ke daftar
        </Link>
      </div>
      <div className="space-y-2">
        {jenis === "customer" ? (
          <CustomerSheets
            active={customerChange ? "ubah" : "tambah"}
            mode="form"
          />
        ) : null}
        <PengajuanForm
          def={{
            type: formDef.type,
            fields,
            photos: formDef.photos,
          }}
          departments={departments}
          staffList={staffList}
          defaultStaffId={user.staffId ?? staffList[0]?.id ?? ""}
          lockRequester={!canPickOthers}
          customers={
            customerChange || formDef.type === "void"
              ? listCustomers()
                  .slice()
                  .sort((a, b) => a.code.localeCompare(b.code))
                  .map((customer) => ({
                    code: customer.code,
                    name: customer.name,
                    creditLimit: customer.creditLimit,
                    termOfPayment: customer.termOfPayment,
                    phone: customer.phone,
                    email: customer.email,
                    npwp: customer.npwp,
                    picName: customer.picName,
                    address: customer.address,
                  }))
              : undefined
          }
        />
      </div>
    </div>
  );
}
