import { redirect } from "next/navigation";
import { getAppBranding } from "@/lib/branding";
import { getSessionUser } from "@/lib/session";
import { listDepartments } from "@/lib/store";
import { SignupForm } from "./signup-client";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  const branding = getAppBranding();
  const departments = listDepartments(true).map((d) => ({
    id: d.id,
    name: d.name,
  }));

  return (
    <SignupForm
      logoUrl={branding.logoUrl}
      companyName={branding.companyName}
      appTitle={branding.appTitle}
      departments={departments}
    />
  );
}
