import { AssetCategoryMaster } from "@/components/master/AssetCategoryMaster";
import { listAssetCategories } from "@/lib/asset-category-ops";
import { requireMasterAccess } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AssetCategoriesPage() {
  await requireMasterAccess();
  const categories = listAssetCategories();

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Master data
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Master Kategori Aset
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Kelola pilihan kategori pada pengajuan asset IT. Kategori nonaktif
          tidak muncul di form baru.
        </p>
      </div>
      <AssetCategoryMaster initial={categories} />
    </div>
  );
}
