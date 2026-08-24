import { BrandingMaster } from "@/components/master/BrandingMaster";
import { getAppBranding } from "@/lib/branding";
import { requireMasterMenu } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BrandingPage() {
  await requireMasterMenu("/master/branding");
  const branding = getAppBranding();

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Identitas perusahaan
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Identitas & Tema
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Nama perusahaan, logo header, dan warna aplikasi. Default mengembalikan
          palet mint sage asli.
        </p>
      </div>
      <BrandingMaster initial={branding} />
    </div>
  );
}
