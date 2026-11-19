import { M, F, steps, stat, ts, heatmap, bar, table, text, row, dashboard } from "./lib.mjs";

const S = `${F.W}, ${F.J}`; // workflow + job selection shared by every built-in metric
const R = "$__rate_interval";
const RNG = "$__range";
const inc = (metric, sel, win = R) => `increase(${metric}{${sel}}[${win}])`;
const sumBy = (by, expr) => `sum${by ? ` by (${by})` : ""}(${expr})`;
const quantile = (q, by, sel, win = R) => `histogram_quantile(${q}, sum by (le${by ? `, ${by}` : ""}) (${inc(`${M.DUR}_bucket`, sel, win)}))`;
const orZero = expr => `(${expr} or vector(0))`;

const tokSel = type => `${S}, ${F.E}, gen_ai_token_type="${type}"`;
const costByModel = win =>
  [
    ["input", "$price_input"],
    ["output", "$price_output"],
    ["input_cache_read", "$price_cache_read"],
    ["input_cache_write", "$price_cache_write"],
  ]
    .map(([type, price]) => `sum by (gen_ai_request_model) (${inc(M.TOK, tokSel(type), win)}) * ${price} / 1e6`)
    .join(" + ");
const costByWorkflow = win =>
  [
    ["input", "$price_input"],
    ["output", "$price_output"],
    ["input_cache_read", "$price_cache_read"],
    ["input_cache_write", "$price_cache_write"],
  ]
    .map(([type, price]) => `sum by (gh_aw_workflow_name) (${inc(M.TOK, tokSel(type), win)}) * ${price} / 1e6`)
    .join(" + ");
const costTotal = win =>
  [
    ["input", "$price_input"],
    ["output", "$price_output"],
    ["input_cache_read", "$price_cache_read"],
    ["input_cache_write", "$price_cache_write"],
  ]
    .map(([type, price]) => `sum(${inc(M.TOK, tokSel(type), win)}) * ${price} / 1e6`)
    .join(" + ");

const failRatio = (sel, win) => `${orZero(`sum(${inc(M.ERR, sel, win)})`)} / sum(${inc(`${M.DUR}_count`, sel, win)})`;

const operations = dashboard({
  uid: "gh-aw-operations",
  title: "gh-aw / Operations Overview",
  description: "Run health for operators: job volume, success rate, duration distribution, and safe-output throughput. Requires delta-to-cumulative conversion before Prometheus; see dashboards/README.md.",
  tags: ["operations"],
  vars: ["ds", "workflow", "job"],
  panels: [
    stat("Job runs", `sum(${inc(`${M.DUR}_count`, S, RNG)})`, { desc: "Jobs that exported metrics in the selected range (every job counts, not only agent jobs)." }),
    stat("Job failures", orZero(`sum(${inc(M.ERR, S, RNG)})`), { thresholds: steps(["green", null], ["orange", 1], ["red", 10]), desc: "failure + timed_out + cancelled jobs." }),
    stat("Job success rate", `1 - ${failRatio(S, RNG)}`, { unit: "percentunit", decimals: 1, thresholds: steps(["red", null], ["orange", 0.8], ["green", 0.95]), desc: "1 - failed jobs / all jobs. Cancelled jobs count as failures." }),
    stat("p50 job duration", quantile(0.5, "", S, RNG), { unit: "s" }),
    stat("p95 job duration", quantile(0.95, "", S, RNG), { unit: "s", thresholds: steps(["green", null], ["orange", 600], ["red", 1800]) }),
    stat("Safe-output items", orZero(`sum(${inc(M.OUT, S, RNG)})`), { desc: "Items written by the conclusion job." }),

    row("Throughput and outcomes"),
    ts("Job runs by result", [{ expr: sumBy("cicd_pipeline_task_run_result", inc(`${M.DUR}_count`, S)), legend: "{{cicd_pipeline_task_run_result}}" }], { stack: true, bars: true, desc: "Job results per interval. A job can fail while the agent run itself succeeded." }),
    ts("Agent runs by workflow", [{ expr: sumBy("gh_aw_workflow_name", inc(`${M.DUR}_count`, `${F.W}, ${F.AGENT}`)), legend: "{{gh_aw_workflow_name}}" }], { stack: true, bars: true, desc: "Agent-job runs, the closest proxy for workflow executions." }),
    ts("Job success rate", [{ expr: `1 - ${failRatio(S, R)}`, legend: "success rate" }], { unit: "percentunit", min: 0, max: 1, thresholds: steps(["red", null], ["orange", 0.8], ["green", 0.95]), desc: "Alert: success rate below 80% for 15 minutes (see prometheus/alerts.rules.yml)." }),
    ts("Safe-output items by type", [{ expr: sumBy("gh_aw_safe_output_type", inc(M.OUT, S)), legend: "{{gh_aw_safe_output_type}}" }], { stack: true, bars: true }),

    row("Duration"),
    ts("Job duration percentiles", [
      { expr: quantile(0.5, "", S), legend: "p50" },
      { expr: quantile(0.95, "", S), legend: "p95" },
      { expr: quantile(0.99, "", S), legend: "p99" },
    ], { unit: "s", desc: "Buckets are fixed at 1s to 1h, so values are interpolated within a bucket." }),
    heatmap("Job duration distribution", `sum by (le) (${inc(`${M.DUR}_bucket`, S)})`),
    ts("p95 duration by job", [{ expr: quantile(0.95, "gh_aw_job_name", S), legend: "{{gh_aw_job_name}}" }], { unit: "s", desc: "Shows which job (activation, agent, detection, safe_outputs, conclusion) dominates wall-clock time." }),
    ts("Average duration by workflow (agent)", [{ expr: `sum by (gh_aw_workflow_name) (${inc(`${M.DUR}_sum`, `${F.W}, ${F.AGENT}`)}) / sum by (gh_aw_workflow_name) (${inc(`${M.DUR}_count`, `${F.W}, ${F.AGENT}`)})`, legend: "{{gh_aw_workflow_name}}" }], { unit: "s" }),

    row("Per-workflow summary"),
    table(
      "Workflows",
      "gh_aw_workflow_name",
      "Workflow",
      [
        { name: "Jobs", expr: `sum by (gh_aw_workflow_name) (${inc(`${M.DUR}_count`, S, RNG)})` },
        { name: "Failures", expr: `sum by (gh_aw_workflow_name) (${inc(M.ERR, S, RNG)})` },
        { name: "p95 duration", unit: "s", expr: quantile(0.95, "gh_aw_workflow_name", S, RNG) },
        { name: "Safe outputs", expr: `sum by (gh_aw_workflow_name) (${inc(M.OUT, S, RNG)})` },
      ],
      { desc: "Workflows with no failures in the range have no Failures value (blank, not zero)." }
    ),
  ],
});

const perf = dashboard({
  uid: "gh-aw-agent-performance",
  title: "gh-aw / Agent Performance",
  description: "How agents behave: token usage and mix, turns, tool-call success, model usage. Token metrics come from agent and detection jobs only.",
  tags: ["agent"],
  vars: ["ds", "workflow", "job", "engine"],
  panels: [
    stat("Total tokens", `sum(${inc(M.TOK, `${S}, ${F.E}`, RNG)})`, { w: 4, desc: "All four token types added together." }),
    stat("Cache hit ratio", `sum(${inc(M.TOK, tokSel("input_cache_read"), RNG)}) / (sum(${inc(M.TOK, tokSel("input"), RNG)}) + sum(${inc(M.TOK, tokSel("input_cache_read"), RNG)}))`, {
      unit: "percentunit",
      decimals: 1,
      desc: "cache_read / (input + cache_read). Assumes `input` excludes cached tokens; verify for your engine.",
    }),
    stat("Avg turns / agent run", `sum(${inc(`${M.TURNS}_sum`, `${F.W}, ${F.AGENT}`, RNG)}) / sum(${inc(`${M.TURNS}_count`, `${F.W}, ${F.AGENT}`, RNG)})`, { decimals: 1 }),
    stat("Tool-call error rate", `${orZero(`sum(${inc(M.TOOL, `${F.W}, ${F.J}, gh_aw_tool_status="error"`, RNG)})`)} / sum(${inc(M.TOOL, `${F.W}, ${F.J}`, RNG)})`, {
      unit: "percentunit",
      decimals: 1,
      thresholds: steps(["green", null], ["orange", 0.05], ["red", 0.2]),
    }),
    stat("Tool calls", `sum(${inc(M.TOOL, `${F.W}, ${F.J}`, RNG)})`, { desc: "Gateway-reported tool calls (MCP and safe-output tools)." }),
    stat("Agent runs", `sum(${inc(`${M.DUR}_count`, `${F.W}, ${F.AGENT}, ${F.E}`, RNG)})`),

    row("Tokens"),
    ts("Tokens by type", [{ expr: sumBy("gen_ai_token_type", inc(M.TOK, `${S}, ${F.E}`)), legend: "{{gen_ai_token_type}}" }], { stack: true, bars: true }),
    ts("Tokens by model", [{ expr: sumBy("gen_ai_request_model", inc(M.TOK, `${S}, ${F.E}`)), legend: "{{gen_ai_request_model}}" }], { stack: true, bars: true, desc: "Model routing: shows how traffic splits across models." }),
    ts("Tokens by workflow", [{ expr: sumBy("gh_aw_workflow_name", inc(M.TOK, `${S}, ${F.E}`)), legend: "{{gh_aw_workflow_name}}" }], { stack: true, bars: true }),
    ts("Tokens per agent run", [{ expr: `sum(${inc(M.TOK, `${F.W}, ${F.AGENT}, ${F.E}`)}) / sum(${inc(`${M.DUR}_count`, `${F.W}, ${F.AGENT}, ${F.E}`)})`, legend: "tokens / run" }], { desc: "Rising values without a workflow change indicate prompt or context growth." }),

    row("Turns and tools"),
    ts("Turns per agent run", [
      { expr: `histogram_quantile(0.5, sum by (le) (${inc(`${M.TURNS}_bucket`, `${F.W}, ${F.AGENT}`)}))`, legend: "p50" },
      { expr: `histogram_quantile(0.95, sum by (le) (${inc(`${M.TURNS}_bucket`, `${F.W}, ${F.AGENT}`)}))`, legend: "p95" },
    ], { desc: "Default buckets top out at 3600, so turn counts are coarse; see METRICS-PROPOSAL.md." }),
    ts("Tool calls by status", [{ expr: sumBy("gh_aw_tool_status", inc(M.TOOL, `${F.W}, ${F.J}`)), legend: "{{gh_aw_tool_status}}" }], { stack: true, bars: true }),
    ts("Tool-call error rate by workflow", [{ expr: `sum by (gh_aw_workflow_name) (${inc(M.TOOL, `${F.W}, ${F.J}, gh_aw_tool_status="error"`)}) / sum by (gh_aw_workflow_name) (${inc(M.TOOL, `${F.W}, ${F.J}`)})`, legend: "{{gh_aw_workflow_name}}" }], { unit: "percentunit", min: 0, desc: "Alert: > 20% over 6 hours with at least 20 calls." }),
    ts("Tool calls per agent run", [{ expr: `sum(${inc(M.TOOL, `${F.W}, ${F.J}`)}) / sum(${inc(`${M.DUR}_count`, `${F.W}, ${F.AGENT}`)})`, legend: "calls / run" }], { desc: "Tool-call volume relative to agent runs. Per-tool breakdown is not available; see METRICS-PROPOSAL.md." }),

    row("Models"),
    table(
      "Model usage",
      "gen_ai_request_model",
      "Model",
      [
        { name: "Input", expr: `sum by (gen_ai_request_model) (${inc(M.TOK, tokSel("input"), RNG)})` },
        { name: "Output", expr: `sum by (gen_ai_request_model) (${inc(M.TOK, tokSel("output"), RNG)})` },
        { name: "Cache read", expr: `sum by (gen_ai_request_model) (${inc(M.TOK, tokSel("input_cache_read"), RNG)})` },
        { name: "Cache write", expr: `sum by (gen_ai_request_model) (${inc(M.TOK, tokSel("input_cache_write"), RNG)})` },
        { name: "Runs", expr: `sum by (gen_ai_request_model) (${inc(`${M.DUR}_count`, `${F.W}, ${F.AGENT}, ${F.E}`, RNG)})` },
        { name: "p95 duration", unit: "s", expr: quantile(0.95, "gen_ai_request_model", `${F.W}, ${F.AGENT}, ${F.E}`, RNG) },
      ]
    ),
  ],
});

const cost = dashboard({
  uid: "gh-aw-cost-efficiency",
  title: "gh-aw / Cost & Efficiency",
  description: "Estimated token spend, cost drivers, and waste. Dollar figures are estimates from the price variables at the top of the dashboard; gh-aw does not export billing data. Set the prices to match your contract.",
  tags: ["cost"],
  vars: ["ds", "workflow", "job", "engine", "price_input", "price_output", "price_cache_read", "price_cache_write"],
  panels: [
    stat("Estimated cost", costTotal(RNG), { unit: "currencyUSD", decimals: 2, w: 6, desc: "tokens x price variables. An estimate, not a bill." }),
    stat("Cost per agent run", `(${costTotal(RNG)}) / sum(${inc(`${M.DUR}_count`, `${F.W}, ${F.AGENT}, ${F.E}`, RNG)})`, { unit: "currencyUSD", decimals: 3, w: 6 }),
    stat("Cost per safe-output item", `(${costTotal(RNG)}) / sum(${inc(M.OUT, S, RNG)})`, { unit: "currencyUSD", decimals: 3, w: 6, desc: "Spend divided by items produced; the main efficiency signal." }),
    stat("AI-credit limit hits", orZero(`sum(${inc(M.LIM, S, RNG)})`), { w: 6, thresholds: steps(["green", null], ["orange", 1]), desc: "Runs stopped by the AI-credit limit." }),

    row("Spend"),
    ts("Estimated cost by model", [{ expr: costByModel(R), legend: "{{gen_ai_request_model}}" }], { unit: "currencyUSD", stack: true, bars: true }),
    ts("Estimated cost by workflow", [{ expr: costByWorkflow(R), legend: "{{gh_aw_workflow_name}}" }], { unit: "currencyUSD", stack: true, bars: true }),
    ts("Cost per agent run by workflow", [{ expr: `(${costByWorkflow(R)}) / on (gh_aw_workflow_name) sum by (gh_aw_workflow_name) (${inc(`${M.DUR}_count`, `${F.W}, ${F.AGENT}`)})`, legend: "{{gh_aw_workflow_name}}" }], { unit: "currencyUSD", desc: "A rising line without a workflow change signals context growth." }),
    ts("Output tokens vs input tokens", [
      { expr: `sum(${inc(M.TOK, tokSel("input"))})`, legend: "input" },
      { expr: `sum(${inc(M.TOK, tokSel("output"))})`, legend: "output" },
      { expr: `sum(${inc(M.TOK, tokSel("input_cache_read"))})`, legend: "cache read" },
    ], { desc: "Healthy runs reuse the cache; a falling cache-read share raises cost." }),

    row("Efficiency and waste"),
    ts("Tokens per safe-output item", [{ expr: `sum by (gh_aw_workflow_name) (${inc(M.TOK, `${S}, ${F.E}`, "$__range")}) / sum by (gh_aw_workflow_name) (${inc(M.OUT, S, "$__range")})`, legend: "{{gh_aw_workflow_name}}" }], { desc: "Evaluated over the selected range for stable ratios. Higher means less output per token." }),
    ts("Run duration vs tokens", [
      { expr: `sum(${inc(`${M.DUR}_sum`, `${F.W}, ${F.AGENT}, ${F.E}`)}) / sum(${inc(`${M.DUR}_count`, `${F.W}, ${F.AGENT}, ${F.E}`)})`, legend: "avg duration (s)" },
      { expr: `sum(${inc(M.TOK, `${F.W}, ${F.AGENT}, ${F.E}`)}) / sum(${inc(`${M.DUR}_count`, `${F.W}, ${F.AGENT}, ${F.E}`)}) / 1000`, legend: "ktokens / run" },
    ], { desc: "Shows whether duration tracks token volume. Divergence suggests tool or network latency." }),
    bar("Tokens spent by workflows with no safe output", [{ expr: `sum by (gh_aw_workflow_name) (${inc(M.TOK, `${S}, ${F.E}`, RNG)}) unless on (gh_aw_workflow_name) sum by (gh_aw_workflow_name) (${inc(M.OUT, S, RNG)})`, legend: "{{gh_aw_workflow_name}}" }], {
      desc: "Waste candidates: tokens consumed while no safe-output item was produced in the range.",
    }),
    bar("Tokens per run by workflow", [{ expr: `sum by (gh_aw_workflow_name) (${inc(M.TOK, `${F.W}, ${F.AGENT}, ${F.E}`, RNG)}) / sum by (gh_aw_workflow_name) (${inc(`${M.DUR}_count`, `${F.W}, ${F.AGENT}`, RNG)})`, legend: "{{gh_aw_workflow_name}}" }]),

    row("Per-workflow cost"),
    table(
      "Cost drivers",
      "gh_aw_workflow_name",
      "Workflow",
      [
        { name: "Est. cost", unit: "currencyUSD", expr: costByWorkflow(RNG) },
        { name: "Runs", expr: `sum by (gh_aw_workflow_name) (${inc(`${M.DUR}_count`, `${F.W}, ${F.AGENT}`, RNG)})` },
        { name: "Tokens", expr: `sum by (gh_aw_workflow_name) (${inc(M.TOK, `${S}, ${F.E}`, RNG)})` },
        { name: "Safe outputs", expr: `sum by (gh_aw_workflow_name) (${inc(M.OUT, S, RNG)})` },
        { name: "Credit-limit hits", expr: `sum by (gh_aw_workflow_name) (${inc(M.LIM, S, RNG)})` },
      ]
    ),
  ],
});

const reliability = dashboard({
  uid: "gh-aw-reliability",
  title: "gh-aw / Reliability",
  description: "Failure classification, timeouts, AI-credit limits, tool errors, and telemetry pipeline health.",
  tags: ["reliability"],
  vars: ["ds", "workflow", "job"],
  panels: [
    stat("Failed jobs", orZero(`sum(${inc(M.ERR, `${S}, cicd_pipeline_task_run_result="failure"`, RNG)})`), { thresholds: steps(["green", null], ["orange", 1], ["red", 10]) }),
    stat("Timed-out jobs", orZero(`sum(${inc(M.ERR, `${S}, cicd_pipeline_task_run_result="timed_out"`, RNG)})`), { thresholds: steps(["green", null], ["orange", 1]) }),
    stat("Cancelled jobs", orZero(`sum(${inc(M.ERR, `${S}, cicd_pipeline_task_run_result="cancelled"`, RNG)})`)),
    stat("AI-credit limit hits", orZero(`sum(${inc(M.LIM, S, RNG)})`), { thresholds: steps(["green", null], ["orange", 1]) }),
    stat("AI-credit rate limits", orZero(`sum(${inc(M.RATE, S, RNG)})`), { thresholds: steps(["green", null], ["orange", 3]) }),
    stat("OTLP export failures", orZero(`sum(${inc(M.EXP, `${F.W}`, RNG)})`), { thresholds: steps(["green", null], ["red", 1]), desc: "Only reaches collectors that accepted another batch; a fully dead collector shows nothing." }),

    row("Failure classification"),
    ts("Job errors by result", [{ expr: sumBy("cicd_pipeline_task_run_result", inc(M.ERR, S)), legend: "{{cicd_pipeline_task_run_result}}" }], { stack: true, bars: true }),
    ts("Job errors by job", [{ expr: sumBy("gh_aw_job_name", inc(M.ERR, S)), legend: "{{gh_aw_job_name}}" }], { stack: true, bars: true, desc: "Which stage fails: activation, agent, detection, safe_outputs, or conclusion." }),
    ts("Failure rate by workflow", [{ expr: `sum by (gh_aw_workflow_name) (${inc(M.ERR, S)}) / sum by (gh_aw_workflow_name) (${inc(`${M.DUR}_count`, S)})`, legend: "{{gh_aw_workflow_name}}" }], { unit: "percentunit", min: 0, thresholds: steps(["green", null], ["orange", 0.1], ["red", 0.25]) }),
    ts("Timeouts by workflow", [{ expr: sumBy("gh_aw_workflow_name", inc(M.ERR, `${S}, cicd_pipeline_task_run_result="timed_out"`)), legend: "{{gh_aw_workflow_name}}" }], { stack: true, bars: true, desc: "Alert: any timeout in the last hour." }),

    row("Budget and rate limits"),
    ts("AI-credit limit exceeded", [{ expr: sumBy("gh_aw_workflow_name", inc(M.LIM, S)), legend: "{{gh_aw_workflow_name}}" }], { stack: true, bars: true }),
    ts("AI-credit rate-limit errors", [{ expr: sumBy("gh_aw_workflow_name", inc(M.RATE, S)), legend: "{{gh_aw_workflow_name}}" }], { stack: true, bars: true, desc: "Repeated rate limits suggest concurrency is too high for the account." }),

    row("Tools and telemetry"),
    ts("Tool-call errors by workflow", [{ expr: sumBy("gh_aw_workflow_name", inc(M.TOOL, `${F.W}, ${F.J}, gh_aw_tool_status="error"`)), legend: "{{gh_aw_workflow_name}}" }], { stack: true, bars: true }),
    ts("OTLP export failures", [{ expr: sumBy("gh_aw_workflow_name", inc(M.EXP, F.W)), legend: "{{gh_aw_workflow_name}}" }], { stack: true, bars: true, desc: "Telemetry gaps: when this is non-zero, other panels undercount." }),

    row("Workflow reliability ranking"),
    table(
      "Least reliable workflows",
      "gh_aw_workflow_name",
      "Workflow",
      [
        { name: "Failure rate", unit: "percentunit", expr: `sum by (gh_aw_workflow_name) (${inc(M.ERR, S, RNG)}) / sum by (gh_aw_workflow_name) (${inc(`${M.DUR}_count`, S, RNG)})` },
        { name: "Failures", expr: `sum by (gh_aw_workflow_name) (${inc(M.ERR, S, RNG)})` },
        { name: "Timeouts", expr: `sum by (gh_aw_workflow_name) (${inc(M.ERR, `${S}, cicd_pipeline_task_run_result="timed_out"`, RNG)})` },
        { name: "Credit-limit hits", expr: `sum by (gh_aw_workflow_name) (${inc(M.LIM, S, RNG)})` },
        { name: "Rate limits", expr: `sum by (gh_aw_workflow_name) (${inc(M.RATE, S, RNG)})` },
        { name: "Tool errors", expr: `sum by (gh_aw_workflow_name) (${inc(M.TOOL, `${F.W}, ${F.J}, gh_aw_tool_status="error"`, RNG)})` },
      ]
    ),
    text(
      "Not yet observable",
      "Retry rates, safe-output failures, firewall-blocked requests, and per-tool or per-error-class breakdowns are only recorded as span attributes today. See `dashboards/METRICS-PROPOSAL.md` for the proposed metrics that would populate panels here."
    ),
  ],
});

export const dashboards = {
  "operations-overview": operations,
  "agent-performance": perf,
  "cost-efficiency": cost,
  reliability,
};
