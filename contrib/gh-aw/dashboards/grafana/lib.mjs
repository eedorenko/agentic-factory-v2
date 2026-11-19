// Helpers that turn compact panel definitions into Grafana dashboard JSON.

// Prometheus names after OTLP translation: dots become underscores, units add
// a suffix (`s` -> `_seconds`) and monotonic counters add `_total`.
export const M = {
  DUR: "gh_aw_job_duration_seconds",
  ERR: "gh_aw_job_errors_total",
  TOK: "gen_ai_client_token_usage_total",
  TURNS: "gh_aw_agent_turns",
  TOOL: "gh_aw_tool_calls_total",
  OUT: "gh_aw_workflow_output_items_total",
  LIM: "gh_aw_ai_credits_limit_exceeded_total",
  RATE: "gh_aw_ai_credits_rate_limit_errors_total",
  EXP: "gh_aw_otlp_export_failures_total",
};

// Label matchers. Every metric carries gh_aw_workflow_name and gh_aw_job_name;
// engine and model labels exist only on duration and token series.
export const F = {
  W: 'gh_aw_workflow_name=~"$workflow"',
  J: 'gh_aw_job_name=~"$job"',
  AGENT: 'gh_aw_job_name="agent"',
  E: 'gh_aw_engine_id=~"$engine"',
  BAD: 'cicd_pipeline_task_run_result=~"failure|timed_out|cancelled"',
};

export const DS = { type: "prometheus", uid: "${ds}" };

export const steps = (...pairs) => ({ mode: "absolute", steps: pairs.map(([color, value]) => ({ color, value })) });

const targets = list =>
  list.map((t, i) => ({
    datasource: DS,
    refId: String.fromCharCode(65 + i),
    expr: t.expr,
    legendFormat: t.legend ?? "__auto",
    ...(t.instant ? { instant: true, range: false } : { range: true }),
    ...(t.format ? { format: t.format } : {}),
  }));

const meta = (kind, title, list, o) => ({
  type: kind,
  title,
  description: o.desc || "",
  datasource: DS,
  targets: targets(list),
  w: o.w,
  h: o.h,
});

export const stat = (title, expr, o = {}) => ({
  ...meta("stat", title, [{ expr, instant: true }], { w: 4, h: 4, ...o }),
  fieldConfig: { defaults: { unit: o.unit || "short", thresholds: o.thresholds || steps(["green", null]), ...(o.decimals !== undefined ? { decimals: o.decimals } : {}) }, overrides: [] },
  options: { reduceOptions: { calcs: ["lastNotNull"], fields: "", values: false }, colorMode: o.thresholds ? "background" : "value", graphMode: "none", textMode: "auto" },
});

export const ts = (title, list, o = {}) => ({
  ...meta("timeseries", title, list, { w: 12, h: 8, ...o }),
  fieldConfig: {
    defaults: {
      unit: o.unit || "short",
      ...(o.min !== undefined ? { min: o.min } : {}),
      ...(o.max !== undefined ? { max: o.max } : {}),
      custom: { drawStyle: o.bars ? "bars" : "line", lineWidth: 1, fillOpacity: o.stack ? 40 : 10, stacking: { mode: o.stack ? "normal" : "none" }, showPoints: "never", spanNulls: true },
      thresholds: o.thresholds || steps(["green", null]),
    },
    overrides: [],
  },
  options: { legend: { displayMode: "table", placement: "bottom", calcs: ["lastNotNull", "max"] }, tooltip: { mode: "multi", sort: "desc" } },
});

export const heatmap = (title, expr, o = {}) => ({
  ...meta("heatmap", title, [{ expr, format: "heatmap", legend: "{{le}}" }], { w: 12, h: 8, ...o }),
  fieldConfig: { defaults: { unit: o.unit || "s" }, overrides: [] },
  options: { calculate: false, yAxis: { unit: o.unit || "s" }, cellGap: 1, color: { scheme: "Spectral", mode: "scheme" } },
});

export const bar = (title, list, o = {}) => ({
  ...meta("bargauge", title, list.map(t => ({ ...t, instant: true })), { w: 12, h: 8, ...o }),
  fieldConfig: { defaults: { unit: o.unit || "short", thresholds: steps(["blue", null]), min: 0 }, overrides: [] },
  options: { displayMode: "gradient", orientation: "horizontal", reduceOptions: { calcs: ["lastNotNull"], fields: "", values: false }, showUnfilled: true },
});

// Each column is a query; rows are joined on the `key` label.
export const table = (title, key, keyTitle, columns, o = {}) => {
  const rename = { [key]: keyTitle };
  const overrides = columns.map((c, i) => {
    rename[`Value #${String.fromCharCode(65 + i)}`] = c.name;
    return { matcher: { id: "byName", options: c.name }, properties: [{ id: "unit", value: c.unit || "short" }] };
  });
  return {
    ...meta("table", title, columns.map(c => ({ expr: c.expr, instant: true, format: "table" })), { w: 24, h: 9, ...o }),
    fieldConfig: { defaults: {}, overrides },
    options: { showHeader: true, sortBy: [{ displayName: columns[0].name, desc: true }] },
    transformations: [
      { id: "joinByField", options: { byField: key, mode: "outer" } },
      { id: "organize", options: { excludeByName: { Time: true }, renameByName: rename } },
    ],
  };
};

export const text = (title, content, o = {}) => ({ type: "text", title, description: "", w: o.w || 24, h: o.h || 4, options: { mode: "markdown", content } });

export const row = title => ({ type: "row", title, collapsed: false, panels: [] });

const textbox = (name, label, value) => ({ name, label, type: "textbox", query: value, current: { text: value, value }, options: [{ selected: true, text: value, value }] });

const queryVar = (name, label, q, current) => ({
  name,
  label,
  type: "query",
  datasource: DS,
  query: { query: q, refId: `${name}-q`, qryType: 1 },
  definition: q,
  includeAll: true,
  allValue: ".*",
  multi: true,
  refresh: 2,
  sort: 1,
  current: current || { selected: true, text: ["All"], value: ["$__all"] },
});

const VARS = {
  ds: () => ({ name: "ds", label: "Data source", type: "datasource", query: "prometheus", current: {}, refresh: 1 }),
  workflow: () => queryVar("workflow", "Workflow", `label_values(${M.DUR}_count, gh_aw_workflow_name)`),
  job: () => queryVar("job", "Job", `label_values(${M.DUR}_count, gh_aw_job_name)`),
  engine: () => queryVar("engine", "Engine", `label_values(${M.DUR}_count{${F.AGENT}}, gh_aw_engine_id)`),
  price_input: () => textbox("price_input", "USD per 1M input tokens", "3"),
  price_output: () => textbox("price_output", "USD per 1M output tokens", "15"),
  price_cache_read: () => textbox("price_cache_read", "USD per 1M cache-read tokens", "0.3"),
  price_cache_write: () => textbox("price_cache_write", "USD per 1M cache-write tokens", "3.75"),
};

// Flows panels left to right in a 24-column grid; a row panel resets the cursor.
function layout(items) {
  const out = [];
  let x = 0;
  let y = 0;
  let rowH = 0;
  let id = 1;
  for (const p of items) {
    if (p.type === "row") {
      y += rowH;
      x = 0;
      rowH = 0;
      out.push({ ...p, id: id++, gridPos: { h: 1, w: 24, x: 0, y } });
      y += 1;
      continue;
    }
    if (x + p.w > 24) {
      y += rowH;
      x = 0;
      rowH = 0;
    }
    const { w, h, ...rest } = p;
    out.push({ ...rest, id: id++, gridPos: { h, w, x, y } });
    x += w;
    rowH = Math.max(rowH, h);
  }
  return out;
}

export function dashboard({ uid, title, description, tags = [], vars, panels }) {
  return {
    uid,
    title,
    description,
    tags: ["gh-aw", "otel", ...tags],
    schemaVersion: 39,
    version: 1,
    editable: true,
    timezone: "browser",
    graphTooltip: 1,
    time: { from: "now-7d", to: "now" },
    refresh: "5m",
    templating: { list: vars.map(n => VARS[n]()) },
    annotations: { list: [{ builtIn: 1, datasource: { type: "grafana", uid: "-- Grafana --" }, enable: true, hide: true, iconColor: "rgba(0, 211, 255, 1)", name: "Annotations & Alerts", type: "dashboard" }] },
    panels: layout(panels),
  };
}
