type JobStatus = "running" | "done" | "failed";

interface Job {
  status: JobStatus;
  leads: Record<string, unknown>[];
  error?: string;
  createdAt: string;
}

const store = new Map<string, Job>();

export function createJob(jobId: string) {
  store.set(jobId, { status: "running", leads: [], createdAt: new Date().toISOString() });
}

export function completeJob(jobId: string, leads: Record<string, unknown>[]) {
  store.set(jobId, {
    status: "done",
    leads,
    createdAt: store.get(jobId)?.createdAt ?? new Date().toISOString(),
  });
}

export function failJob(jobId: string, error: string) {
  const existing = store.get(jobId);
  store.set(jobId, {
    status: "failed",
    leads: [],
    error,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  });
}

export function getJob(jobId: string) {
  return store.get(jobId) ?? null;
}
