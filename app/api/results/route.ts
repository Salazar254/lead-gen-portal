import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret to prevent unauthorized posts
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

    // Handle n8n reporting an error
    if (n8nError) {
      await supabase
        .from("jobs")
        .update({ status: "failed", error: n8nError })
        .eq("id", jobId);
      return NextResponse.json({ ok: true });
    }

    if (!Array.isArray(leads) || leads.length === 0) {
      await supabase
        .from("jobs")
        .update({ status: "failed", error: "No leads returned from workflow" })
        .eq("id", jobId);
      return NextResponse.json({ error: "No leads in payload" }, { status: 400 });
    }

    // Bulk insert leads — chunk to avoid Supabase payload limits
    const CHUNK_SIZE = 100;
    for (let i = 0; i < leads.length; i += CHUNK_SIZE) {
      const chunk = leads.slice(i, i + CHUNK_SIZE).map((lead) => ({
        job_id: jobId,
        data: lead,
      }));
      const { error: insertError } = await supabase.from("leads").insert(chunk);
      if (insertError) {
        console.error("Lead insert error:", insertError);
      }
    }

    // Mark job done
    await supabase
      .from("jobs")
      .update({ status: "done", lead_count: leads.length })
      .eq("id", jobId);

    return NextResponse.json({ ok: true, count: leads.length });
  } catch (err) {
    console.error("/api/results error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
