import { notFound } from "next/navigation";
import { UserForm } from "@/components/master/UserForm";
import { requireMasterMenu } from "@/lib/session";
import { getUserById, listDepartments, listStaff } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reset?: string }>;
}) {
  await requireMasterMenu("/master/users");
  const { id } = await params;
  const query = await searchParams;
  const user = getUserById(id);
  if (!user) notFound();

  const staff = listStaff(true);
  const departments = listDepartments(true);

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
          Edit user
        </h1>
        <p className="mt-2 text-sm text-ink-muted">{user.username}</p>
      </div>
      <UserForm
        staff={staff}
        departments={departments}
        initial={user}
        passwordRequired={query.reset === "1"}
      />
    </div>
  );
}
