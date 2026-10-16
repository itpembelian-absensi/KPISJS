import { redirect } from "next/navigation";
import { getSafeRedirect } from "@/lib/auth";
import { getAppBranding } from "@/lib/branding";
import { getSessionUser } from "@/lib/session";
import LoginClient from "./login-client";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const user = await getSessionUser();
  if (user) {
    const sp = searchParams ? await searchParams : undefined;
    const next = typeof sp?.next === "string" ? sp.next : undefined;
    redirect(getSafeRedirect(next, "/"));
  }

  const branding = getAppBranding();
  return (
    <LoginClient
      logoUrl={branding.logoUrl}
      companyName={branding.companyName}
      appTitle={branding.appTitle}
    />
  );
}
