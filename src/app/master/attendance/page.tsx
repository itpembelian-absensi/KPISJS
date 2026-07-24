import { AttendanceMaster } from "@/components/master/AttendanceMaster";
import {
  listAttendancePeriods,
  listAttendanceSummaries,
} from "@/lib/attendance-ops";
import { requireMasterAccess } from "@/lib/session";
import { listDepartments } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  await requireMasterAccess();

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
          Absensi & Kedisiplinan
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Impor data absensi/lembur dari Excel, hitung skor kedisiplinan, dan
          sinkron ke penilaian KPI per staf.
        </p>
      </div>
      <AttendanceMaster
        departments={listDepartments(true)}
        initialSummaries={listAttendanceSummaries()}
        periods={listAttendancePeriods()}
      />
    </div>
  );
}
