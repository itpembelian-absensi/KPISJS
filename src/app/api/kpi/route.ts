import { NextResponse } from "next/server";
import { computeKpi } from "@/lib/kpi";
import { listAgents, readData } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const data = readData();
  const agents = listAgents();
  const kpi = computeKpi(data.tickets, agents);
  return NextResponse.json({ kpi, agents });
}
