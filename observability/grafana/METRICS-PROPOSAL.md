# Proposed upstream metric changes

Gaps found while designing the Grafana dashboards, checked against gh-aw
`specs/otel-observability-spec.md` v0.7.0 (§10.4, §10.6, §11.3-11.5) and
`actions/setup/js/otlp_metrics.cjs`. These are meant to be contributed to `github/gh-aw`.

## 1. Emit `gh_aw.ai.credits.usage`

| | |
| --- | --- |
| Type | counter, unit `{credit}` |
| Attributes | `gh-aw.workflow.name`, `gh-aw.job.name`, `gen_ai.request.model` |
| Prometheus name | `gh_aw_ai_credits_usage_total` |

The spec defines it (§11.3) but `otlp_metrics.cjs` only emits `gh_aw.ai.credits.limit_exceeded`
and `gh_aw.ai.credits.rate_limit_errors`. Without it, cost can only be estimated from tokens
times user-set prices. A real credit counter gives provider-independent cost and enables the
Tier B panels already in the Cost & Efficiency dashboard ("Credits consumed", "Credits per
safe-output item", "Credits per hour").

## 2. Explicit histogram buckets for `gh_aw.agent.turns`

Proposed buckets: `[1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144]`.

Turns currently reuse the seconds-shaped default buckets (`[1, 5, 15, 30, 60, ...]`), so
quantiles above 30 turns fall into coarse buckets and the p95 turns panel is inaccurate at the
high end.

## Minor: buckets for `gh_aw.job.duration`

Defaults are `[1, 5, 15, 30, 60, 120, 300, 600, 1800, 3600]` seconds. That is fine for p50 and
p95 up to one hour; only jobs longer than an hour are coarse. Low priority.

## Answered by existing signals (do not re-propose)

| Idea | Already covered by |
| --- | --- |
| Tool name on `gh_aw.tool_calls` | `gen_ai.tool.name` on tool spans (§10.4); high cardinality for a metric. Use traces or the §12.6 custom-metric API. |
| Safe-output failure counter | `gh_aw.job.errors` with `gh_aw_job_name="safe_outputs"`. |
| Harness retry counter | span events `gh_aw.agent.retry` / `gh_aw.model.retry` (§10.6): traces and logs, not metrics. |
| Firewall block counter | Not part of the OTEL spec; a separate feature. |
| `error.type` on `gh_aw.job.errors` | `cicd.pipeline.task.run.result` (failure / timed_out / cancelled); `error.type` already exists on `gen_ai.invoke_agent.duration`. |
| `engine.id` on more series | Cosmetic; `$model` covers most of the breakdown. |
