import { BackupMaster } from "@/components/master/BackupMaster";
import { requireMasterMenu } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BackupPage() {
  await requireMasterMenu("/master/backup");

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Pemeliharaan
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Backup & Restore
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Unduh database dari server ke komputer, atau unggah file .db lokal
          untuk menimpa database server (dan sebaliknya).
        </p>
      </div>
      <BackupMaster />
    </div>
  );
}
