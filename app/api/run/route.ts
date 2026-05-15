import { NextRequest, NextResponse } from "next/server";
import { createJob } from "@/lib/jobStore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filters } = body as { filters: Record<string, unknown> };

    if (!filters || typeof filters !== "object") {
      return NextResponse.json({ error: "Missing filters" }, { status: 400 });
    }

    const jobId = crypto.randomUUID();
    createJob(jobId);

    const n8nRes = await fetch(process.env.N8N_WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        filters,
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/results`,
      }),
    });

    if (!n8nRes.ok) {
      return NextResponse.json({ error: "Failed to trigger n8n workflow" }, { status: 502 });
    }

    return NextResponse.json({ jobId });
  } catch (err) {
    console.error("/api/run error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
