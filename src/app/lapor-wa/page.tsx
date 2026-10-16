import { redirect } from "next/navigation";

export default function LaporWaHyphenShortlinkPage() {
  redirect("/kpi/departments?tab=lapor_wa");
}
