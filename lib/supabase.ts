import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type JobStatus = "running" | "done" | "failed";

export interface Job {
  id: string;
  status: JobStatus;
  created_at: string;
  input: Record<string, unknown>;
  lead_count?: number;
  error?: string;
}

export interface Lead {
  id: string;
  job_id: string;
  data: Record<string, unknown>;
  created_at: string;
}

// SQL to create tables — run once in Supabase dashboard:
/*
create table jobs (
  id          uuid primary key default gen_random_uuid(),
  status      text not null default 'running',
  created_at  timestamptz not null default now(),
  input       jsonb,
  lead_count  integer,
  error       text
);

create table leads (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid references jobs(id) on delete cascade,
  data        jsonb not null,
  created_at  timestamptz not null default now()
);

create index leads_job_id_idx on leads(job_id);
*/
