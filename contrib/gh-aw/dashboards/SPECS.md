# Dashboard specs

Queries use the Prometheus names described in [README.md](./README.md#prerequisites).
`$__rate_interval` is the Grafana interval; `$__range` is the dashboard time range. Shared variables: `$workflow`, `$job`, `$engine` (all multi-select, default All).

Common building blocks:

- Jobs = `increase(gh_aw_job_duration_seconds_count[...])`
- Job failures = `increase(gh_aw_job_errors_total[...])` (`failure`, `timed_out`, `cancelled`)
- Agent runs = jobs with `gh_aw_job_name="agent"`
- Tokens = `increase(gen_ai_client_token_usage_total[...])` split by `gen_ai_token_type`

The JSON in `grafana/` is authoritative for exact query text; this file explains intent and thresholds.

## 1. Operations Overview (`operations-overview.json`)

**Who:** on-call engineers and maintainers. **Questions:** Is the fleet healthy? Is anything slow? Is work being produced?

| Panel | Viz | Query idea | Notes |
| --- | --- | --- | --- |
| Job runs / failures / success rate | stat | `sum(increase(..._count[$__range]))`, `1 - failures/jobs` | Success rate: red < 80%, orange < 95% |
| p50 / p95 job duration | stat | `histogram_quantile(q, sum by (le) (increase(..._bucket[$__range])))` | p95 orange > 10 min, red > 30 min |
| Safe-output items | stat | `sum(increase(gh_aw_workflow_output_items_total[$__range]))` | |
| Job runs by result | stacked bars | `sum by (cicd_pipeline_task_run_result) (increase(..._count[$__rate_interval]))` | |
| Agent runs by workflow | stacked bars | same, `gh_aw_job_name="agent"`, by workflow | |
| Job success rate | time series | `1 - errors/jobs` | **Alert** < 80% for 15 m |
| Safe-output items by type | stacked bars | `sum by (gh_aw_safe_output_type)` | |
| Duration percentiles | time series | p50/p95/p99 | |
| Duration distribution | heatmap | `sum by (le) (increase(..._bucket))` | |
| p95 duration by job | time series | by `gh_aw_job_name` | Finds the slow stage |
| Avg duration by workflow | time series | `_sum / _count`, agent job | |
| Workflows table | table | jobs, failures, p95, outputs by workflow | |

## 2. Agent Performance (`agent-performance.json`)

**Who:** workflow authors tuning prompts and tools. **Questions:** How hard do agents work? Where do tokens go? Do tools fail?

| Panel | Viz | Notes |
| --- | --- | --- |
| Total tokens, cache hit ratio, avg turns, tool-call error rate, tool calls, agent runs | stat | Error rate: orange > 5%, red > 20% |
| Tokens by type / model / workflow | stacked bars | Model split shows routing |
| Tokens per agent run | time series | Rising trend means context growth |
| Turns per agent run (p50/p95) | time series | Buckets are coarse (see proposal) |
| Tool calls by status | stacked bars | `gh_aw_tool_status` = `ok`/`error` |
| Tool-call error rate by workflow | time series | **Alert** > 20% over 6 h with ≥ 20 calls |
| Tool calls per agent run | time series | |
| Model usage table | table | tokens by type, runs, p95 duration per model |

Not available as metrics: checkpoint frequency and per-tool breakdowns (span attributes only).

## 3. Cost & Efficiency (`cost-efficiency.json`)

**Who:** budget owners. **Questions:** What does this cost? What produces value per token? What is wasted?

gh-aw exports tokens, not prices. Cost panels multiply token series by dashboard variables (`$price_input`, `$price_output`, `$price_cache_read`, `$price_cache_write`, USD per million tokens). Defaults are placeholders; set your contract rates. All dollar figures are estimates.

| Panel | Viz | Notes |
| --- | --- | --- |
| Estimated cost, per agent run, per safe-output item | stat | |
| AI-credit limit hits | stat | orange ≥ 1 |
| Estimated cost by model / workflow | stacked bars | |
| Cost per agent run by workflow | time series | |
| Input vs output vs cache-read tokens | time series | Falling cache share raises cost |
| Tokens per safe-output item | time series | Over `$__range` for stability |
| Run duration vs tokens | time series | Divergence points to tool/network latency |
| Tokens with no safe output | bar gauge | Waste candidates (`unless` on outputs) |
| Tokens per run by workflow | bar gauge | |
| Cost drivers table | table | cost, runs, tokens, outputs, credit-limit hits |

**Alert:** token usage over 6 h greater than 3x the same window one day earlier (and > 1M tokens). **Info:** workflow silent for a day after running earlier in the week.

## 4. Reliability (`reliability.json`)

**Who:** on-call and SRE. **Questions:** What fails, at which stage, and is telemetry itself trustworthy?

| Panel | Viz | Notes |
| --- | --- | --- |
| Failed / timed-out / cancelled jobs | stat | |
| AI-credit limit hits, rate limits | stat | rate limits orange ≥ 3 |
| OTLP export failures | stat | red ≥ 1 |
| Job errors by result / by job / failure rate by workflow / timeouts | stacked bars, time series | Failure rate orange > 10%, red > 25% |
| AI-credit limit exceeded, rate-limit errors | stacked bars | Rate limits: **alert** ≥ 3 per hour |
| Tool-call errors by workflow | stacked bars | |
| OTLP export failures | stacked bars | Gaps mean other panels undercount |
| Least reliable workflows | table | failure rate, failures, timeouts, limits, tool errors |
| Not yet observable | text | Points to the proposal |

**Alerts:** timeout in the last hour (warning), credit-limit exceeded (warning), any OTLP export failure (info). All rules are in `prometheus/alerts.rules.yml`.

## Source verification

Metric names, units, and attributes were taken from `actions/setup/js/otlp_metrics.cjs` (`buildBuiltinRunMetrics`) and `docs/src/content/docs/reference/open-telemetry.mdx` in this repository's `contrib/gh-aw` snapshot, and cross-checked against the merged PR description. Queries were parsed with a PromQL parser; they have not been run against live data (see README, known limits).

The layout (summary stats, then throughput, duration, and a per-entity table, grouped under rows) follows common operational-dashboard practice. The CAO reference dashboards (githubnext.github.io/gh-cao/cao/) could not be fetched from the build environment, so no CAO-specific panels were copied. Reviewers familiar with them should suggest panels to add.
