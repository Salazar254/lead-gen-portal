# LeadGen Portal

Schema-driven lead extraction portal. Client configures filters, n8n runs the Apify actor, results are saved to Supabase and displayed in the portal.

## Architecture

```
Client fills filters on portal
    → POST /api/run (Vercel)
    → Creates job in Supabase (status: running)
    → POSTs to n8n webhook with filters + jobId + callbackUrl

n8n workflow runs:
    Build Apify Input → Run Actor → Get Dataset Items → Code in JS → HTTP Request

n8n POSTs results to /api/results (Vercel webhook):
    → Bulk inserts leads into Supabase
    → Updates job status to done

Frontend polls /api/status/:jobId every 3s → detects done → shows lead count + download button
Client clicks Download → /api/export/:jobId → fetches leads from Supabase → browser PDF via print
```

## Setup

### 1. Supabase

Run this SQL in your Supabase dashboard (SQL Editor):

```sql
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
```

### 2. n8n Workflow Changes

**Trigger node:** Replace Daily Trigger with Webhook node. Set to POST.

**Last node:** Change your HTTP Request node to POST to:
```
{{ $json.callbackUrl }}
```
With body:
```json
{
  "jobId": "{{ $json.jobId }}",
  "leads": {{ JSON.stringify($input.all().map(i => i.json)) }}
}
```
With header:
```
x-webhook-secret: your-secret-here
```

**Build Apify Input node:** The filters arriving from the portal are already mapped by `mapActorPayloadToBackend`. Your existing node logic still applies on top.

### 3. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `N8N_WEBHOOK_URL`
- `NEXT_PUBLIC_APP_URL`
- `WEBHOOK_SECRET`

In Vercel dashboard → Settings → Environment Variables, add the same vars.

### 4. Deploy

```bash
npm install
npm run dev          # local development
vercel deploy        # production
```

## File Structure

```
leadgen-portal/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Main portal UI (schema-driven)
│   └── api/
│       ├── run/route.ts            # Triggers n8n, creates job
│       ├── results/route.ts        # Receives leads from n8n
│       ├── status/[jobId]/route.ts # Polling endpoint
│       └── export/[jobId]/route.ts # Fetches leads for PDF
├── lib/
│   ├── supabase.ts                 # Supabase client + types
│   └── mapPayload.ts               # mapActorPayloadToBackend (mirrors Pipeline Labs)
├── public/
│   └── input_schema.json           # Schema — edit this to add/remove filter sections
└── .env.local.example
```

## Customising the Schema

Edit `public/input_schema.json` to add or remove filter sections and fields. The UI builds itself from the schema — no code changes needed for filter additions.

Field types supported: `array` (with `itemType: "string"` or `itemType: "enum"`), `boolean`, `integer`, `enum`, `string`.
