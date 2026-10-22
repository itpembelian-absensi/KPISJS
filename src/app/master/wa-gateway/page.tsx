import { WaGatewayMaster } from "@/components/master/WaGatewayMaster";
import { WaScheduleSettings } from "@/components/master/WaScheduleSettings";
import { getGowaPublicConfig } from "@/lib/gowa";
import { requireMasterMenu } from "@/lib/session";
import { getWaScheduleView } from "@/lib/wa-schedule";

export const dynamic = "force-dynamic";

export default async function WaGatewayPage() {
  await requireMasterMenu("/master/wa-gateway");
  const config = getGowaPublicConfig();
  const schedule = getWaScheduleView();

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          WhatsApp
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Gateway WhatsApp
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">
          Pengingat bahasan rapat dikirim lewat GOWA. Atur koneksi gateway,
          lalu jadwal kirim laporan ke PIC.
        </p>
      </div>
      <WaGatewayMaster initial={config} />
      <WaScheduleSettings initial={schedule} />
    </div>
  );
}
