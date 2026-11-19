import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dashboards } from "./definitions.mjs";

const dir = dirname(fileURLToPath(import.meta.url));

// Metrics and labels that gh-aw emits (docs/src/content/docs/reference/open-telemetry.mdx).
const METRICS = [
  "gh_aw_job_duration_seconds",
  "gh_aw_job_errors_total",
  "gen_ai_client_token_usage_total",
  "gh_aw_agent_turns",
  "gh_aw_tool_calls_total",
  "gh_aw_workflow_output_items_total",
  "gh_aw_ai_credits_limit_exceeded_total",
  "gh_aw_ai_credits_rate_limit_errors_total",
  "gh_aw_otlp_export_failures_total",
];
const HISTOGRAMS = new Set(["gh_aw_job_duration_seconds", "gh_aw_agent_turns"]);
const LABELS = new Set([
  "gh_aw_job_name",
  "gh_aw_workflow_name",
  "gh_aw_engine_id",
  "gen_ai_request_model",
  "gen_ai_token_type",
  "cicd_pipeline_task_run_result",
  "gh_aw_tool_status",
  "gh_aw_safe_output_type",
  "le",
]);

const queries = Object.entries(dashboards).flatMap(([name, d]) => d.panels.flatMap(p => (p.targets || []).map(t => ({ name, title: p.title, expr: t.expr }))));

test("committed JSON matches definitions", () => {
  for (const [name, d] of Object.entries(dashboards)) {
    const onDisk = JSON.parse(readFileSync(join(dir, `${name}.json`), "utf8"));
    assert.deepEqual(onDisk, JSON.parse(JSON.stringify(d)), `${name}.json is stale; run node build.mjs`);
  }
  const files = readdirSync(dir).filter(f => f.endsWith(".json"));
  assert.equal(files.length, Object.keys(dashboards).length);
});

test("dashboards have unique uids and panel ids", () => {
  const uids = Object.values(dashboards).map(d => d.uid);
  assert.equal(new Set(uids).size, uids.length);
  for (const d of Object.values(dashboards)) {
    const ids = d.panels.map(p => p.id);
    assert.equal(new Set(ids).size, ids.length, d.title);
    for (const p of d.panels) assert.ok(p.gridPos.x + p.gridPos.w <= 24, `${d.title}: ${p.title} overflows grid`);
  }
});

test("queries reference only known metrics", () => {
  for (const { name, title, expr } of queries) {
    const used = expr.match(/\b(?:gh_aw|gen_ai)_[a-z_]+/g) || [];
    for (const u of used) {
      const base = u.replace(/_(bucket|sum|count)$/, "");
      const known = METRICS.includes(u) || (HISTOGRAMS.has(base) && u !== base) || LABELS.has(u);
      assert.ok(known, `${name}/${title}: unknown identifier ${u}`);
    }
  }
});

test("histograms are queried through _bucket/_sum/_count only", () => {
  for (const { name, title, expr } of queries) {
    for (const h of HISTOGRAMS) {
      assert.ok(!new RegExp(`\\b${h}(?!_)`).test(expr), `${name}/${title}: bare histogram ${h}`);
    }
  }
});

test("by()/label matchers use only known labels", () => {
  for (const { name, title, expr } of queries) {
    for (const m of expr.matchAll(/\bby \(([^)]*)\)/g)) {
      for (const l of m[1].split(",").map(s => s.trim())) assert.ok(LABELS.has(l), `${name}/${title}: unknown label ${l}`);
    }
    for (const m of expr.matchAll(/([a-z_]+)(?:=~|!=|=)"/g)) assert.ok(LABELS.has(m[1]), `${name}/${title}: unknown matcher label ${m[1]}`);
  }
});

test("dashboards never query both a canonical metric and its alias", () => {
  for (const { name, title, expr } of queries) {
    assert.ok(!/gh_aw_run_|gh_aw_tokens_|gh_aw_safe_outputs/.test(expr), `${name}/${title}: alias used`);
  }
});

test("every dashboard variable referenced is defined", () => {
  for (const [name, d] of Object.entries(dashboards)) {
    const defined = new Set(d.templating.list.map(v => v.name));
    const blob = JSON.stringify(d.panels);
    for (const m of blob.matchAll(/\$(workflow|job|engine|price_[a-z_]+|ds)\b/g)) assert.ok(defined.has(m[1]), `${name}: $${m[1]} not defined`);
  }
});
