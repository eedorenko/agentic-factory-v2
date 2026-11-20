# gh-aw Grafana dashboards: spec

Status: approved design (issue #598). Stage in `eedorenko/agentic-factory-v2`; final home is
`github/gh-aw` (`specs/` and `observability/grafana/`). Implementation lives in
`observability/grafana/`; see its README for usage.

Source metrics: gh-aw `specs/otel-observability-spec.md` v0.7.0 and
`actions/setup/js/otlp_metrics.cjs`.

## 1. Decisions

| Topic | Decision |
| --- | --- |
| Cost | Tokens first. Estimated cost = tokens x price variables (`$price_in`, `$price_out`, `$price_cache_read`, `$price_cache_write`, USD per 1M tokens, default 0). Credit panels sit in a collapsed Tier B row. |
| Source of truth | Definitions in `observability/grafana/definitions/*.mjs` (not YAML: Node has no built-in YAML parser). A zero-dependency script generates the importable JSON; a test fails if committed JSON is stale. |
| Tier B metrics | Defined in the spec but not emitted. Shown in collapsed rows tagged "Tier B: not emitted yet"; no alerts. |
| CAO | Mirror its design rules, not its visuals. |
| Links | `$gh_repo` variable; workflow-level panels link to the workflow's GitHub Actions run list. |

## 2. Design rules

1. At most 4 summary panels and 2 main views per dashboard; detail in collapsed "Supplemental" rows.
2. Each panel's description holds the question it answers, its metric tier, and ignored variables.
3. Each panel declares a unit.
4. Missing is not zero. Ratios use `a / (b > 0)`; no null-as-zero.
5. Canonical names only; never `gh_aw_run_*`, `gh_aw_safe_outputs`, `gen_ai_client_token_usage` or `gh_aw_tokens_*`.
6. No per-run drill-down: metrics carry no run ids.

## 3. Prerequisites

- gh-aw emits **delta** temporality; the collector needs a delta-to-cumulative processor before the Prometheus exporter.
- Name mapping: dots become `_`, histograms get unit suffix (`_seconds`) and `_bucket/_count/_sum`, counters get `_total`. All names live in one map in `definitions/common.mjs`.
- Totals use `$__range`; trends use `$__rate_interval`.

## 4. Variables

| Variable | Label | Used on |
| --- | --- | --- |
| `$workflow` | `gh_aw_workflow_name` | all workflow-scoped series |
| `$job` | `gh_aw_job_name` | all workflow-scoped series |
| `$engine` | `gh_aw_engine_id` | only `gh_aw.job.duration` |
| `$model` | `gen_ai_request_model` | duration, tokens, invoke_agent |
| `$result` | `cicd_pipeline_task_run_result` | duration, errors |
| `$gh_repo`, `$price_*` | text boxes | links and cost |

Panels that cannot honour a variable ignore it and say so in their description.

## 5. Dashboards

`F(x)` = `{gh_aw_workflow_name=~"$workflow", gh_aw_job_name=~"$job"}`.

### 5.1 Operations Overview (on-call, maintainers)
Is the fleet healthy, slow, and producing work?
Summary: Jobs completed, Failure rate (5% / 20%), p95 job duration, Safe-output items.
Main: Failure rate by workflow (top 10), Duration p50/p95 trend.
Supplemental: Jobs per hour by result, Safe-output items by type, Workflows overview table.

### 5.2 Agent Performance (workflow authors)
How hard do agents work, and where do tokens go?
Summary: Turns p50/p95, Agent duration p95, Cache-read share, Tool-call failure rate (2% / 10%; `gh_aw_tool_status="error"` over total).
Main: Tokens by type (input is non-cache: input - cache read - cache write), Tokens by model.
Supplemental: Workflows ranked by tokens per job, Tool calls by status (job-level aggregate; no tool name), Agent duration trend.

### 5.3 Cost & Efficiency (budget owners)
What does this cost, and where is it wasted?
Summary: Estimated cost, Tokens total, Tokens per safe-output item, Cache-read share.
Main: Cost by workflow (table with tokens and items), Estimated cost per hour.
Supplemental: Waste (workflows with tokens but zero items).
Tier B: Credits consumed, Credits per item, Credits per hour (`gh_aw_ai_credits_usage_total`).

### 5.4 Reliability (SRE)
What fails, at which stage, and can the telemetry be trusted?
Summary: Errors by result, Timed-out jobs, Credit limit / rate-limit events, OTLP export failures.
Main: Error rate by workflow (top 10), Agent failures by `error_type`.
Supplemental: Errors over time by result, Telemetry heartbeat, Agent failure ratio by model.

`gh_aw.otlp.export.failures` always carries `endpoint.class="configured"` and `failure.class="export"`, so panels use the total.

## 6. Alerts (Tier A only; defaults to tune)

| Alert | Expression | For |
| --- | --- | --- |
| High failure rate | failure ratio over 1h > 0.20 | 15m |
| Fleet silent | `sum(increase(gh_aw_job_duration_seconds_count[6h])) == 0` | 0m |
| Timed-out jobs | `increase(gh_aw_job_errors_total{...timed_out}[1h]) > 3` | 0m |
| Telemetry broken | `increase(gh_aw_otlp_export_failures_total[15m]) > 0` | 15m |

## 7. Verification

- `npm test`: freshness of generated JSON, schema checks (unique ids, no overlaps, variables defined, datasource variable, descriptions and units), metric-name and alias checks, Tier B confinement, PromQL sanity (balanced brackets, `histogram_quantile` over `sum by (le)`, known `by` labels, range selectors).
- `tools/smoke-test.mjs`, run by a human against a live Grafana and Prometheus: every query returns OK, NO DATA or ERROR; checks the name map against real series.
- Layout is verified visually in Grafana; the automated checks cover structure and queries only.

## 8. Upstream metric gaps

See `observability/grafana/METRICS-PROPOSAL.md`: emit `gh_aw.ai.credits.usage`; explicit buckets for `gh_aw.agent.turns`.
