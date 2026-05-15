import { NextResponse } from "next/server";
import { getAllJobs } from "@/lib/jobStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const jobs = await getAllJobs();
  return NextResponse.json({ jobs });
}
