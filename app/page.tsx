"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SchemaOption { value: string; label: string; }
interface SchemaField {
  key: string; title: string; description: string; bestPractice?: string;
  type: "array" | "boolean" | "integer" | "enum" | "string";
  itemType?: "string" | "enum"; options?: SchemaOption[];
  placeholder?: string; min?: number; max?: number;
  default?: unknown;
}
interface SchemaGroup {
  key: string; icon: string; title: string; description: string;
  fields: SchemaField[];
}
interface Schema { groups: SchemaGroup[]; }

type Values = Record<string, unknown>;

// ─── Map payload (mirrors mapActorPayloadToBackend) ───────────────────────────

function buildActorPayload(values: Values, totalResults: number): Record<string, unknown> {
  return { ...values, totalResults };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countActiveFields(fields: SchemaField[], values: Values): number {
  return fields.filter(f => {
    const v = values[f.key];
    if (v === undefined || v === null || v === "") return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "boolean") return v === true;
    return true;
  }).length;
}

function isMeaningful(v: unknown): boolean {
  if (v === undefined || v === null || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "boolean") return v === true;
  return true;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TagInput({
  values, onChange, placeholder, options,
}: {
  values: string[]; onChange: (v: string[]) => void;
  placeholder?: string; options?: SchemaOption[];
}) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = options
    ? options.filter(o =>
        !values.includes(o.value) &&
        (o.label.toLowerCase().includes(input.toLowerCase()) ||
         o.value.toLowerCase().includes(input.toLowerCase()))
      )
    : [];

  const addValue = (val: string) => {
    const clean = val.trim();
    if (clean && !values.includes(clean)) onChange([...values, clean]);
    setInput("");
    setOpen(false);
  };
  const removeValue = (val: string) => onChange(values.filter(v => v !== val));

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && !options) {
      e.preventDefault();
      addValue(input);
    }
    if (e.key === "Backspace" && !input && values.length) {
      removeValue(values[values.length - 1]);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayLabel = (val: string) =>
    options?.find(o => o.value === val)?.label ?? val;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        className="tag-input-wrap"
        onClick={() => { inputRef.current?.focus(); if (options) setOpen(true); }}
      >
        {values.map(v => (
          <span key={v} className="tag">
            <span>{displayLabel(v)}</span>
            <span
              className="tag-x"
              onClick={e => { e.stopPropagation(); removeValue(v); }}
            >×</span>
          </span>
        ))}
        <input
          ref={inputRef}
          className="tag-ghost-input"
          value={input}
          onChange={e => { setInput(e.target.value); if (options) setOpen(true); }}
          onKeyDown={handleKey}
          onFocus={() => options && setOpen(true)}
          placeholder={values.length === 0 ? placeholder : ""}
        />
      </div>
      {options && open && filtered.length > 0 && (
        <div className="dropdown">
          {filtered.map(o => (
            <div key={o.value} className="dropdown-item" onMouseDown={() => addValue(o.value)}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldRenderer({
  field, value, onChange,
}: {
  field: SchemaField; value: unknown; onChange: (v: unknown) => void;
}) {
  const [showHelp, setShowHelp] = useState(false);

  const renderInput = () => {
    if (field.type === "boolean") {
      return (
        <label className="toggle-row">
          <div className={`toggle ${value === true ? "on" : ""}`} onClick={() => onChange(value === true ? false : true)}>
            <div className="toggle-thumb" />
          </div>
          <span className="toggle-label">{value === true ? "On" : "Off"}</span>
        </label>
      );
    }
    if (field.type === "enum" && field.options) {
      return (
        <select
          className="select-input"
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value || undefined)}
        >
          <option value="">— Select —</option>
          {field.options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    }
    if (field.type === "array") {
      return (
        <TagInput
          values={(value as string[]) ?? []}
          onChange={onChange}
          placeholder={field.placeholder}
          options={field.itemType === "enum" ? field.options : undefined}
        />
      );
    }
    if (field.type === "integer") {
      return (
        <input
          type="number"
          className="text-input"
          min={field.min}
          max={field.max}
          placeholder={field.placeholder}
          value={(value as number) ?? ""}
          onChange={e => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        />
      );
    }
    return (
      <input
        type="text"
        className="text-input"
        placeholder={field.placeholder}
        value={(value as string) ?? ""}
        onChange={e => onChange(e.target.value || undefined)}
      />
    );
  };

  return (
    <div className="field-row">
      <div className="field-label-row">
        <label className="field-label">{field.title}</label>
        <button className="help-btn" onClick={() => setShowHelp(s => !s)} title="What this does">?</button>
      </div>
      {showHelp && (
        <div className="help-box">
          <p>{field.description}</p>
          {field.bestPractice && <p className="best-practice">💡 {field.bestPractice}</p>}
        </div>
      )}
      {renderInput()}
    </div>
  );
}

function AccordionSection({
  group, values, onChange,
}: {
  group: SchemaGroup; values: Values; onChange: (key: string, v: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = countActiveFields(group.fields, values);

  return (
    <div className={`accordion ${open ? "open" : ""}`}>
      <div className="accordion-header" onClick={() => setOpen(s => !s)}>
        <div className="accordion-left">
          <span className="acc-icon">{group.icon}</span>
          <div>
            <div className="acc-title">{group.title}</div>
            <div className="acc-desc">{group.description}</div>
          </div>
        </div>
        <div className="accordion-right">
          <span className={`acc-badge ${active > 0 ? "active" : ""}`}>
            {active > 0 ? `${active} active` : "No filters"}
          </span>
          <span className="acc-chevron">{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div className="accordion-body">
          {group.fields.map(field => (
            <FieldRenderer
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={v => onChange(field.key, v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── JSON Preview ─────────────────────────────────────────────────────────────

function JsonPreview({ payload }: { payload: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [editError, setEditError] = useState("");

  const json = JSON.stringify(payload, null, 2);

  const copy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const openEdit = () => {
    setEditText(json);
    setEditError("");
    setEditing(true);
  };

  return (
    <div className="json-panel">
      <div className="json-header">
        <span className="json-title">ACTOR JSON</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button className={`json-btn ${copied ? "copied" : ""}`} onClick={copy}>
            {copied ? "Copied!" : "Copy"}
          </button>
          <button className="json-btn" onClick={openEdit}>Edit</button>
        </div>
      </div>
      <pre className="json-body">{json}</pre>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span>Edit JSON</span>
              <button className="modal-close" onClick={() => setEditing(false)}>×</button>
            </div>
            <textarea
              className="json-editor"
              value={editText}
              onChange={e => { setEditText(e.target.value); setEditError(""); }}
            />
            {editError && <div className="modal-error">{editError}</div>}
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => {
                try {
                  JSON.parse(editText);
                  setEditing(false);
                } catch {
                  setEditError("Invalid JSON — fix syntax errors and try again.");
                }
              }}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Results Panel ────────────────────────────────────────────────────────────

type RunStatus = "idle" | "running" | "done" | "failed";

function ResultsPanel({
  status, leadCount, jobId, error, onDownload,
}: {
  status: RunStatus; leadCount: number; jobId: string | null;
  error: string | null; onDownload: () => void;
}) {
  return (
    <div className="results-panel">
      <div className="results-header">
        <span className="results-title">RESULTS</span>
        <span className="results-meta">
          {status === "idle" && "No search yet."}
          {status === "running" && "Running…"}
          {status === "done" && `Job ${jobId?.slice(0, 8)}…`}
          {status === "failed" && "Failed"}
        </span>
      </div>

      <div className={`count-box ${status}`}>
        <div className="count-num">
          {status === "idle" && "—"}
          {status === "running" && <span className="pulse">…</span>}
          {status === "done" && leadCount.toLocaleString()}
          {status === "failed" && "!"}
        </div>
        <div className="count-label">
          {status === "idle" && "Matching leads for this search"}
          {status === "running" && "Extracting leads…"}
          {status === "done" && "Leads extracted"}
          {status === "failed" && "Run failed"}
        </div>
        {status === "running" && (
          <div className="progress-track">
            <div className="progress-fill" />
          </div>
        )}
      </div>

      {status === "failed" && error && (
        <div className="error-box">{error}</div>
      )}

      {status === "idle" && (
        <div className="empty-state">
          <div className="empty-icon">⌕</div>
          <div className="empty-text">Set your filters and run a search.</div>
        </div>
      )}

      {status === "running" && (
        <div className="run-log">
          <div className="log-line info">› Job dispatched to n8n workflow</div>
          <div className="log-line dim">› Apify actor starting…</div>
          <div className="log-line dim">› Waiting for results…</div>
        </div>
      )}

      {status === "done" && (
        <>
          <button className="download-btn" onClick={onDownload}>
            ↓ Download PDF Report
          </button>
          <div className="run-log" style={{ marginTop: 8 }}>
            <div className="log-line ok">› {leadCount.toLocaleString()} leads saved to Supabase</div>
            <div className="log-line ok">› Job complete</div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Run History ──────────────────────────────────────────────────────────────

interface HistoryJob {
  jobId: string; status: RunStatus; leadCount: number;
  createdAt: string; onDownload: () => void;
}

function RunHistory({ jobs }: { jobs: HistoryJob[] }) {
  if (jobs.length === 0) return null;
  return (
    <div className="history-panel">
      <div className="history-title">RUN HISTORY</div>
      {jobs.map(j => (
        <div key={j.jobId} className="history-row">
          <div className="history-left">
            <span className={`history-dot ${j.status}`} />
            <div>
              <div className="history-id">{j.jobId.slice(0, 8)}…</div>
              <div className="history-date">{new Date(j.createdAt).toLocaleString()}</div>
            </div>
          </div>
          <div className="history-right">
            <span className="history-count">{j.leadCount.toLocaleString()} leads</span>
            {j.status === "done" && (
              <button className="history-dl" onClick={j.onDownload}>↓ PDF</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function buildDefaults(schema: Schema): Values {
  const defaults: Values = {};
  for (const group of schema.groups) {
    for (const field of group.fields) {
      if (field.default !== undefined) defaults[field.key] = field.default;
    }
  }
  return defaults;
}

export default function Portal() {
  const [schema, setSchema] = useState<Schema | null>(null);
  const [values, setValues] = useState<Values>({});
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [leadCount, setLeadCount] = useState(0);
  const [runError, setRunError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryJob[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/input_schema.json")
      .then(r => r.json())
      .then((s: Schema) => {
        setSchema(s);
        setValues(buildDefaults(s));
      });
  }, []);

  const setValue = useCallback((key: string, v: unknown) => {
    setValues(prev => {
      if (!isMeaningful(v)) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: v };
    });
  }, []);

  const payload = buildActorPayload(values, (values.totalResults as number) ?? 1000);
  // Remove totalResults from display payload since it's a run option
  const displayPayload = { ...payload };

  const startPolling = useCallback((jid: string) => {
    pollRef.current && clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${jid}`);
        const data = await res.json();
        if (data.status === "done") {
          clearInterval(pollRef.current!);
          setRunStatus("done");
          setLeadCount(data.leadCount);
          setHistory(prev => [{
            jobId: jid,
            status: "done",
            leadCount: data.leadCount,
            createdAt: data.createdAt,
            onDownload: () => handleDownload(jid),
          }, ...prev.filter(h => h.jobId !== jid)]);
        } else if (data.status === "failed") {
          clearInterval(pollRef.current!);
          setRunStatus("failed");
          setRunError(data.error ?? "Unknown error");
        }
      } catch {
        // network error — keep polling
      }
    }, 3000);
  }, []);

  const handleRun = async () => {
    if (runStatus === "running") return;
    setRunStatus("running");
    setRunError(null);
    setLeadCount(0);
    setJobId(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: displayPayload }),
      });
      const data = await res.json();
      if (!res.ok || !data.jobId) throw new Error(data.error ?? "Run failed");
      setJobId(data.jobId);
      startPolling(data.jobId);
    } catch (err) {
      setRunStatus("failed");
      setRunError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleReset = () => {
    if (!schema) return;
    pollRef.current && clearInterval(pollRef.current);
    setValues(buildDefaults(schema));
    setRunStatus("idle");
    setJobId(null);
    setLeadCount(0);
    setRunError(null);
  };

  const handleDownload = async (jid: string) => {
    const res = await fetch(`/api/export/${jid}`);
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    // Client-side PDF generation using browser print
    const leads: Record<string, unknown>[] = data.leads ?? [];
    const html = buildPdfHtml(leads, data.createdAt, jid);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  };

  function buildPdfHtml(leads: Record<string, unknown>[], createdAt: string, jid: string): string {
    const rows = leads.map(l =>
      `<tr>
        <td>${l.firstName ?? ""} ${l.lastName ?? ""}</td>
        <td>${l.title ?? ""}</td>
        <td>${l.email ?? "—"}</td>
        <td>${l.companyName ?? ""}</td>
        <td>${l.personCountry ?? ""}</td>
      </tr>`
    ).join("");
    return `<!DOCTYPE html><html><head><title>Leads Export ${jid.slice(0, 8)}</title>
    <style>
      body { font-family: sans-serif; font-size: 11px; padding: 20px; }
      h1 { font-size: 16px; margin-bottom: 4px; }
      p { color: #666; margin-bottom: 16px; font-size: 10px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #111; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
      td { padding: 5px 8px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) { background: #f9f9f9; }
    </style></head><body>
    <h1>Lead Export Report</h1>
    <p>Job: ${jid} · Exported: ${new Date(createdAt).toLocaleString()} · ${leads.length} leads</p>
    <table><thead><tr><th>Name</th><th>Title</th><th>Email</th><th>Company</th><th>Country</th></tr></thead>
    <tbody>${rows}</tbody></table>
    </body></html>`;
  }

  if (!schema) {
    return (
      <div className="loading">
        <div className="loading-dot" />
        <span>Loading schema…</span>
      </div>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="portal">
        {/* Header */}
        <div className="header">
          <div className="header-left">
            <div className="logo-mark">LG</div>
            <div>
              <div className="brand-name">LeadGen <span>Portal</span></div>
              <div className="brand-sub">Schema-driven lead extraction</div>
            </div>
          </div>
          <div className="live-badge">
            <div className="live-dot" />
            Live
          </div>
        </div>

        {/* Body */}
        <div className="body">
          {/* Left — Filters */}
          <div className="filters-col">
            <div className="filters-top">
              <div>
                <div className="filters-title">Build your search</div>
                <div className="filters-sub">Configure filters to extract verified leads. All results saved to Supabase.</div>
              </div>
            </div>
            <div className="accordions">
              {schema.groups.map(group => (
                <AccordionSection
                  key={group.key}
                  group={group}
                  values={values}
                  onChange={setValue}
                />
              ))}
            </div>
            <div className="action-row">
              <button className="btn-ghost" onClick={handleReset}>↺ Reset</button>
              <button
                className={`btn-primary ${runStatus === "running" ? "loading" : ""}`}
                onClick={handleRun}
                disabled={runStatus === "running"}
              >
                {runStatus === "running" ? "⟳ Running…" : "⚡ Run Search"}
              </button>
            </div>
          </div>

          {/* Right — JSON + Results + History */}
          <div className="right-col">
            <JsonPreview payload={displayPayload} />
            <ResultsPanel
              status={runStatus}
              leadCount={leadCount}
              jobId={jobId}
              error={runError}
              onDownload={() => jobId && handleDownload(jobId)}
            />
            <RunHistory jobs={history} />
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #080810;
    --s1: #0f0f1a;
    --s2: #14141f;
    --s3: #1a1a28;
    --s4: #202030;
    --border: rgba(255,255,255,0.07);
    --border2: rgba(255,255,255,0.12);
    --border3: rgba(255,255,255,0.18);
    --text: #eeeef5;
    --text2: #9090b0;
    --text3: #55556a;
    --accent: #7c6dff;
    --accent2: #9d91ff;
    --accent-bg: rgba(124,109,255,0.1);
    --accent-border: rgba(124,109,255,0.28);
    --green: #1dd17a;
    --green-bg: rgba(29,209,122,0.1);
    --red: #ff5454;
    --red-bg: rgba(255,84,84,0.1);
    --font-mono: 'JetBrains Mono', 'Fira Mono', monospace;
  }

  body { background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; min-height: 100vh; }

  .loading { display: flex; align-items: center; gap: 10px; justify-content: center; min-height: 100vh; color: var(--text2); font-size: 14px; }
  .loading-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); animation: blink 1s infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

  .portal { min-height: 100vh; display: flex; flex-direction: column; }

  /* Header */
  .header {
    background: var(--s1); border-bottom: 1px solid var(--border);
    padding: 14px 28px; display: flex; align-items: center;
    justify-content: space-between; position: sticky; top: 0; z-index: 50;
  }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .logo-mark {
    width: 32px; height: 32px; border-radius: 8px; background: var(--accent);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; color: white; font-family: var(--font-mono); letter-spacing: -0.5px;
  }
  .brand-name { font-size: 14px; font-weight: 700; color: var(--text); }
  .brand-name span { color: var(--text2); font-weight: 400; }
  .brand-sub { font-size: 10px; color: var(--text3); margin-top: 1px; }
  .live-badge {
    display: flex; align-items: center; gap: 6px;
    background: var(--green-bg); border: 1px solid rgba(29,209,122,0.2);
    border-radius: 20px; padding: 4px 11px;
    font-size: 10px; font-weight: 700; color: var(--green);
    letter-spacing: 0.08em; text-transform: uppercase; font-family: var(--font-mono);
  }
  .live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); animation: blink 2s infinite; }

  /* Body layout */
  .body { display: grid; grid-template-columns: 1fr 340px; flex: 1; }

  /* Filters col */
  .filters-col { border-right: 1px solid var(--border); display: flex; flex-direction: column; }
  .filters-top { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); }
  .filters-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
  .filters-sub { font-size: 11px; color: var(--text2); line-height: 1.5; }

  .accordions { flex: 1; overflow-y: auto; }

  /* Accordion */
  .accordion { border-bottom: 1px solid var(--border); }
  .accordion-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 24px; cursor: pointer; transition: background 0.15s; user-select: none;
  }
  .accordion-header:hover { background: var(--s2); }
  .accordion-left { display: flex; align-items: center; gap: 12px; }
  .acc-icon { font-size: 18px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--s3); border: 1px solid var(--border2); border-radius: 8px; }
  .acc-title { font-size: 12px; font-weight: 700; color: var(--text); letter-spacing: 0.04em; text-transform: uppercase; }
  .acc-desc { font-size: 11px; color: var(--text3); margin-top: 2px; line-height: 1.4; }
  .accordion-right { display: flex; align-items: center; gap: 8px; }
  .acc-badge {
    font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
    padding: 3px 8px; border-radius: 4px; font-family: var(--font-mono);
    color: var(--text3); background: var(--s3); border: 1px solid var(--border); transition: all 0.2s;
  }
  .acc-badge.active { color: var(--accent2); background: var(--accent-bg); border-color: var(--accent-border); }
  .acc-chevron { color: var(--text3); font-size: 11px; }
  .accordion-body { padding: 4px 24px 20px; display: flex; flex-direction: column; gap: 16px; }

  /* Fields */
  .field-row { display: flex; flex-direction: column; gap: 6px; }
  .field-label-row { display: flex; align-items: center; justify-content: space-between; }
  .field-label { font-size: 11px; color: var(--text2); letter-spacing: 0.05em; text-transform: uppercase; font-weight: 600; }
  .help-btn {
    width: 16px; height: 16px; border-radius: 50%; background: var(--s3); border: 1px solid var(--border2);
    color: var(--text3); font-size: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .help-btn:hover { color: var(--accent2); border-color: var(--accent-border); }
  .help-box {
    background: var(--s3); border: 1px solid var(--border2); border-radius: 8px;
    padding: 10px 12px; font-size: 11px; color: var(--text2); line-height: 1.6;
  }
  .best-practice { color: var(--accent2); margin-top: 6px; }

  /* Tag input */
  .tag-input-wrap {
    background: var(--s2); border: 1px solid var(--border2); border-radius: 8px;
    padding: 8px 10px; min-height: 42px; display: flex; flex-wrap: wrap; gap: 5px;
    align-items: flex-start; cursor: text; transition: border-color 0.15s;
  }
  .tag-input-wrap:focus-within { border-color: var(--accent-border); }
  .tag {
    display: flex; align-items: center; gap: 4px;
    background: var(--accent-bg); border: 1px solid var(--accent-border);
    border-radius: 5px; padding: 3px 7px; font-size: 11px; color: var(--accent2);
    font-family: var(--font-mono); white-space: nowrap;
  }
  .tag-x { cursor: pointer; color: var(--accent); font-size: 13px; line-height: 1; transition: color 0.1s; }
  .tag-x:hover { color: var(--red); }
  .tag-ghost-input {
    background: transparent; border: none; outline: none; color: var(--text);
    font-size: 12px; min-width: 120px; flex: 1; font-family: inherit;
    padding: 2px 0;
  }
  .tag-ghost-input::placeholder { color: var(--text3); }

  /* Dropdown */
  .dropdown {
    position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 100;
    background: var(--s3); border: 1px solid var(--border2); border-radius: 8px;
    max-height: 200px; overflow-y: auto; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  }
  .dropdown-item {
    padding: 9px 12px; font-size: 12px; color: var(--text2); cursor: pointer;
    transition: background 0.1s; border-bottom: 1px solid var(--border);
  }
  .dropdown-item:hover { background: var(--s4); color: var(--text); }
  .dropdown-item:last-child { border-bottom: none; }

  /* Toggle */
  .toggle-row { display: flex; align-items: center; gap: 10px; cursor: pointer; }
  .toggle {
    width: 38px; height: 20px; border-radius: 10px; background: var(--s4);
    border: 1px solid var(--border2); position: relative; transition: all 0.2s; cursor: pointer;
    flex-shrink: 0;
  }
  .toggle.on { background: var(--accent); border-color: var(--accent); }
  .toggle-thumb {
    position: absolute; top: 2px; left: 2px; width: 14px; height: 14px;
    border-radius: 50%; background: white; transition: left 0.2s;
  }
  .toggle.on .toggle-thumb { left: 20px; }
  .toggle-label { font-size: 12px; color: var(--text2); }

  /* Select */
  .select-input {
    width: 100%; background: var(--s2); border: 1px solid var(--border2); border-radius: 8px;
    padding: 9px 12px; font-size: 12px; color: var(--text); outline: none;
    cursor: pointer; transition: border-color 0.15s; font-family: inherit;
  }
  .select-input:focus { border-color: var(--accent-border); }
  .select-input option { background: var(--s3); }

  /* Text input */
  .text-input {
    width: 100%; background: var(--s2); border: 1px solid var(--border2); border-radius: 8px;
    padding: 9px 12px; font-size: 12px; color: var(--text); outline: none;
    transition: border-color 0.15s; font-family: inherit;
  }
  .text-input:focus { border-color: var(--accent-border); }
  .text-input::placeholder { color: var(--text3); }

  /* Action row */
  .action-row {
    padding: 16px 24px; display: grid; grid-template-columns: 1fr 2fr; gap: 10px;
    border-top: 1px solid var(--border); background: var(--s1);
  }
  .btn-ghost {
    padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
    background: var(--s3); color: var(--text2); border: 1px solid var(--border2);
    cursor: pointer; transition: all 0.15s; font-family: inherit;
  }
  .btn-ghost:hover { background: var(--s4); color: var(--text); }
  .btn-primary {
    padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 700;
    background: var(--accent); color: white; border: none;
    cursor: pointer; transition: all 0.15s; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 7px;
  }
  .btn-primary:hover:not(:disabled) { background: var(--accent2); transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .btn-primary.loading { background: var(--s3); color: var(--accent2); border: 1px solid var(--accent-border); }

  /* Right col */
  .right-col {
    background: var(--s1); display: flex; flex-direction: column; gap: 0;
    border-left: 1px solid var(--border);
  }

  /* JSON panel */
  .json-panel { border-bottom: 1px solid var(--border); }
  .json-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px 10px;
  }
  .json-title { font-size: 10px; font-weight: 700; color: var(--text3); letter-spacing: 0.1em; text-transform: uppercase; font-family: var(--font-mono); }
  .json-btn {
    font-size: 10px; padding: 3px 9px; border-radius: 4px;
    background: var(--s3); border: 1px solid var(--border2);
    color: var(--text2); cursor: pointer; font-family: var(--font-mono); transition: all 0.15s;
    margin-left: 5px;
  }
  .json-btn:hover { color: var(--text); }
  .json-btn.copied { color: var(--green); border-color: rgba(29,209,122,0.3); }
  .json-body {
    margin: 0 18px 14px;
    background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
    padding: 12px 14px; font-size: 11px; font-family: var(--font-mono); line-height: 1.7;
    color: var(--text2); max-height: 220px; overflow-y: auto; white-space: pre-wrap; word-break: break-all;
  }

  /* Results */
  .results-panel { padding: 18px; border-bottom: 1px solid var(--border); }
  .results-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .results-title { font-size: 10px; font-weight: 700; color: var(--text3); letter-spacing: 0.1em; text-transform: uppercase; font-family: var(--font-mono); }
  .results-meta { font-size: 10px; color: var(--text3); font-family: var(--font-mono); }
  .count-box {
    background: var(--s2); border: 1px solid var(--border); border-radius: 10px;
    padding: 20px; text-align: center; margin-bottom: 12px; transition: border-color 0.3s;
  }
  .count-box.running { border-color: var(--accent-border); }
  .count-box.done { border-color: rgba(29,209,122,0.3); }
  .count-box.failed { border-color: rgba(255,84,84,0.3); }
  .count-num { font-size: 38px; font-weight: 800; color: var(--text); font-family: var(--font-mono); line-height: 1; }
  .count-box.running .count-num { color: var(--accent2); }
  .count-box.done .count-num { color: var(--green); }
  .count-box.failed .count-num { color: var(--red); }
  .count-label { font-size: 10px; color: var(--text3); letter-spacing: 0.08em; text-transform: uppercase; margin-top: 6px; font-family: var(--font-mono); }
  .pulse { animation: blink 1s infinite; }
  .progress-track { background: var(--s4); border-radius: 3px; height: 3px; overflow: hidden; margin-top: 12px; }
  .progress-fill { height: 100%; background: var(--accent); border-radius: 3px; animation: slide 2s infinite; }
  @keyframes slide { 0%{width:0%;margin-left:0} 50%{width:60%;margin-left:20%} 100%{width:0%;margin-left:100%} }
  .empty-state { text-align: center; padding: 8px 0; }
  .empty-icon { font-size: 20px; opacity: 0.3; margin-bottom: 6px; }
  .empty-text { font-size: 11px; color: var(--text3); }
  .error-box { background: var(--red-bg); border: 1px solid rgba(255,84,84,0.25); border-radius: 8px; padding: 10px 12px; font-size: 11px; color: var(--red); line-height: 1.5; margin-bottom: 10px; }
  .run-log { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; font-size: 10px; font-family: var(--font-mono); line-height: 1.9; max-height: 90px; overflow-y: auto; }
  .log-line.ok { color: var(--green); }
  .log-line.info { color: var(--accent2); }
  .log-line.dim { color: var(--text3); }
  .download-btn {
    width: 100%; padding: 10px; border-radius: 8px;
    background: var(--green-bg); border: 1px solid rgba(29,209,122,0.25);
    color: var(--green); font-size: 12px; font-weight: 700; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 7px;
    transition: all 0.15s; font-family: inherit; margin-bottom: 10px;
  }
  .download-btn:hover { background: rgba(29,209,122,0.18); }

  /* History */
  .history-panel { padding: 18px; }
  .history-title { font-size: 10px; font-weight: 700; color: var(--text3); letter-spacing: 0.1em; text-transform: uppercase; font-family: var(--font-mono); margin-bottom: 12px; }
  .history-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--s2); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 6px; }
  .history-left { display: flex; align-items: center; gap: 10px; }
  .history-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .history-dot.done { background: var(--green); }
  .history-dot.running { background: var(--accent); animation: blink 1s infinite; }
  .history-dot.failed { background: var(--red); }
  .history-id { font-size: 11px; font-family: var(--font-mono); color: var(--text2); }
  .history-date { font-size: 10px; color: var(--text3); margin-top: 2px; }
  .history-right { display: flex; align-items: center; gap: 8px; }
  .history-count { font-size: 11px; font-family: var(--font-mono); color: var(--accent2); }
  .history-dl { font-size: 10px; padding: 3px 8px; border-radius: 4px; background: var(--green-bg); border: 1px solid rgba(29,209,122,0.25); color: var(--green); cursor: pointer; font-family: var(--font-mono); transition: all 0.15s; }
  .history-dl:hover { background: rgba(29,209,122,0.18); }

  /* Modal */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .modal { background: var(--s2); border: 1px solid var(--border2); border-radius: 12px; width: 100%; max-width: 560px; overflow: hidden; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); font-size: 14px; font-weight: 600; }
  .modal-close { background: none; border: none; color: var(--text3); font-size: 20px; cursor: pointer; }
  .modal-close:hover { color: var(--text); }
  .json-editor { width: 100%; background: var(--bg); border: none; outline: none; color: var(--text2); font-family: var(--font-mono); font-size: 11px; line-height: 1.7; padding: 16px 20px; height: 280px; resize: none; }
  .modal-error { padding: 10px 20px; font-size: 11px; color: var(--red); background: var(--red-bg); }
  .modal-footer { display: flex; gap: 10px; justify-content: flex-end; padding: 14px 20px; border-top: 1px solid var(--border); }
`;
