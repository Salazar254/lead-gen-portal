import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const { data: job, error } = await supabase
    .from("jobs")
    .select("id, status, lead_count, error, created_at, input")
    .eq("id", jobId)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    leadCount: job.lead_count ?? 0,
    error: job.error ?? null,
    createdAt: job.created_at,
  });
}
