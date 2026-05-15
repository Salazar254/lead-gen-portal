import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobStore";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const job = await getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    jobId,
    status: job.status,
    leadCount: job.leadCount,
    leads: job.status === "done" ? job.leads : [],
    error: job.error ?? null,
    createdAt: job.createdAt,
  });
}
