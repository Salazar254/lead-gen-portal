import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const TTL = 60 * 60 * 24 * 30; // 30 days

export type JobStatus = "running" | "done" | "failed";

export interface Job {
  jobId: string;
  status: JobStatus;
  leads: Record<string, unknown>[];
  leadCount: number;
  error?: string;
  createdAt: string;
  input?: Record<string, unknown>;
}

export async function createJob(jobId: string, input: Record<string, unknown>) {
  await redis.set(`job:${jobId}`, {
    jobId,
    status: "running",
    leads: [],
    leadCount: 0,
    createdAt: new Date().toISOString(),
    input,
  }, { ex: TTL });
}

export async function completeJob(jobId: string, leads: Record<string, unknown>[]) {
  const existing = await redis.get<Job>(`job:${jobId}`);
  await redis.set(`job:${jobId}`, {
    ...existing,
    jobId,
    status: "done",
    leads,
    leadCount: leads.length,
  }, { ex: TTL });
}

export async function failJob(jobId: string, error: string) {
  const existing = await redis.get<Job>(`job:${jobId}`);
  await redis.set(`job:${jobId}`, {
    ...existing,
    jobId,
    status: "failed",
    leads: [],
    leadCount: 0,
    error,
  }, { ex: TTL });
}

export async function getJob(jobId: string): Promise<Job | null> {
  return redis.get<Job>(`job:${jobId}`);
}

export async function registerJob(jobId: string) {
  await redis.lpush("jobs:all", jobId);
  await redis.expire("jobs:all", TTL);
}

export async function getAllJobs(): Promise<Job[]> {
  const jobIds = await redis.lrange<string>("jobs:all", 0, 49);
  if (!jobIds.length) return [];
  const jobs = await Promise.all(jobIds.map((id: string) => redis.get<Job>(`job:${id}`)));
  return jobs.filter((j): j is Job => j !== null);
}
