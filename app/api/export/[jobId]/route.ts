import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  // Verify job exists and is done
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, status, lead_count, input, created_at")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "done") {
    return NextResponse.json({ error: "Job not complete yet" }, { status: 409 });
  }

  // Fetch all leads for this job
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("data")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });

  if (leadsError) {
    console.error("Leads fetch error:", leadsError);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }

  return NextResponse.json({
    jobId,
    leadCount: leads?.length ?? 0,
    createdAt: job.created_at,
    input: job.input,
    leads: (leads ?? []).map((l) => l.data),
  });
}
