import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import LoginClient from "./login-client";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/");
  }

  return <LoginClient />;
}
