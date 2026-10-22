import { MeetingWorkspace } from "@/components/MeetingWorkspace";
import { getEffectiveDepartmentScope } from "@/lib/auth";
import { listMeetingNotes } from "@/lib/meeting-ops";
import { requireMenu } from "@/lib/session";
import { listDepartments, listStaff } from "@/lib/store";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const user = await requireMenu("/kpi/meetings");
  const deptScope = getEffectiveDepartmentScope(user);
  if (deptScope !== "all" && deptScope.length === 0) redirect("/");

  const allDepartments = listDepartments(true);
  const departments =
    deptScope === "all"
      ? allDepartments
      : allDepartments.filter((d) => deptScope.includes(d.id));
  if (departments.length === 0) redirect("/");

  const deptIds = new Set(departments.map((d) => d.id));
  const allStaff = listStaff(true);
  const staff = allStaff
    .filter((s) => deptIds.has(s.departmentId))
    .map((s) => ({ id: s.id, name: s.name, departmentId: s.departmentId }));
  const phoneBook = allStaff.map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
  }));

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Weekly meeting
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Meeting & Notulen
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">
          Semua notulen rapat dikumpulkan di sini. Bahasan bisa dilacak mana
          yang on progress, mana yang overdue, dan mana yang dibahas berulang.
          Isi bahasan yang belum selesai dikirim otomatis ke WhatsApp masing-masing
          PIC, memakai nomor HP di data karyawan.
        </p>
      </div>
      <MeetingWorkspace
        departments={departments}
        companyWide={deptScope === "all"}
        staff={staff}
        phoneBook={phoneBook}
        initialMeetings={listMeetingNotes(
          deptScope === "all" ? undefined : deptScope,
        )}
      />
    </div>
  );
}
