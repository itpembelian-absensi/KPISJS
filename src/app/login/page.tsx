import { redirect } from "next/navigation";
import { getAppBranding } from "@/lib/branding";
import { getSessionUser } from "@/lib/session";
import LoginClient from "./login-client";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/");
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
