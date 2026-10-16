import { redirect } from "next/navigation";

export default function LaporWaShortlinkPage() {
  redirect("/kpi/departments?tab=lapor_wa");
}
