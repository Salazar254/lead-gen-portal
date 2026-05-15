import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { mapActorPayloadToBackend } from "@/lib/mapPayload";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filters } = body as { filters: Record<string, unknown> };

    if (!filters || typeof filters !== "object") {
      return NextResponse.json({ error: "Missing filters" }, { status: 400 });
    }

    // Create job in Supabase
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert({ status: "running", input: filters })
      .select()
      .single();

    if (jobError || !job) {
      console.error("Supabase job insert error:", jobError);
      return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
    }

    // Map actor payload to backend format for n8n
    const backendPayload = mapActorPayloadToBackend(filters);

    // Fire n8n webhook — include jobId so n8n can POST results back
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL!;
    const n8nRes = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: job.id,
        filters: backendPayload,
        // Callback URL for n8n to POST results back
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/results`,
      }),
    });

    if (!n8nRes.ok) {
      // Mark job failed
      await supabase
        .from("jobs")
        .update({ status: "failed", error: `n8n webhook failed: ${n8nRes.status}` })
        .eq("id", job.id);
      return NextResponse.json({ error: "Failed to trigger n8n workflow" }, { status: 502 });
    }

    return NextResponse.json({ jobId: job.id });
  } catch (err) {
    console.error("/api/run error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
