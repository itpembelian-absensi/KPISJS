import { ApprovalChainMaster } from "@/components/master/ApprovalChainMaster";
import { canAccessMenu } from "@/lib/auth";
import {
  listApprovalChain,
  listApprovalChainUsers,
} from "@/lib/pengajuan-approval";
import { requireUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ApprovalPengajuanPage() {
  const user = await requireUser();
  if (user.role !== "admin" || !canAccessMenu(user, "/master/approval-pengajuan")) {
    redirect("/");
  }

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-sm text-brand"
          style={{ fontFamily: "var(--font-accent), serif" }}
        >
          Setting
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Approval Pengajuan
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Atur urutan persetujuan. Satu tingkat selesai bila salah satu user
          di tingkat itu menyetujui. Pengajuan baru mengikuti rantai ini.
          Jika rantai kosong, Admin atau Manager menyetujui dalam satu tingkat.
        </p>
      </div>
      <ApprovalChainMaster
        initialLevels={listApprovalChain()}
        users={listApprovalChainUsers()}
      />
    </div>
  );
}
