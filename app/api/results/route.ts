import { NextRequest, NextResponse } from "next/server";
import { completeJob, failJob } from "@/lib/jobStore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-webhook-secret");
    if (secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { jobId, leads, error: n8nError } = body as {
      jobId: string;
      leads?: Record<string, unknown>[];
      error?: string;
    };

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    if (n8nError) {
      await failJob(jobId, n8nError);
      return NextResponse.json({ ok: true });
    }

    if (!Array.isArray(leads) || leads.length === 0) {
      await failJob(jobId, "No leads returned from workflow");
      return NextResponse.json({ error: "No leads in payload" }, { status: 400 });
    }

    await completeJob(jobId, leads);
    return NextResponse.json({ ok: true, count: leads.length });
  } catch (err) {
    console.error("/api/results error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
