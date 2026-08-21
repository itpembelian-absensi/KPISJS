import { UserMaster } from "@/components/master/UserMaster";
import { requireMasterMenu } from "@/lib/session";
import {
  listDepartments,
  listPendingPasswordResets,
  listStaff,
  listUsers,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireMasterMenu("/master/users");
  const users = listUsers();
  const staff = listStaff(true);
  const departments = listDepartments(true);
  const passwordResetRequests = listPendingPasswordResets();

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Akses sistem
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          User & Role
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Atur username, password, role, menu yang boleh diakses, dan batasan
          departemen per user. Hanya Admin & IT Staf yang boleh mengubah.
          Permintaan lupa password dari halaman login muncul di sini.
        </p>
      </div>
      <UserMaster
        initial={users}
        staff={staff}
        departments={departments}
        initialResets={passwordResetRequests}
      />
    </div>
  );
}
