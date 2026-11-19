# Proposed new metrics for gh-aw

Gaps found while designing the dashboards. Each proposal names the dashboard panel it would enable. The data already exists in spans or the runtime, so these are mostly re-emissions as bounded metrics.

All proposals respect the existing guards: at most 8 attributes, no run/job/trace identifiers, 128-character values, bounded value sets.

## Summary

| # | Metric | Type | Unit | Priority |
| --- | --- | --- | --- | --- |
| 1 | `gh_aw.ai.credits.used` | counter | `{credit}` | High |
| 2 | `gh_aw.job.errors` attribute `gh-aw.error.class` | attribute | n/a | High |
| 3 | `gh_aw.safe_output.failures` | counter | `{item}` | High |
| 4 | `gh_aw.harness.retries` | counter | `{retry}` | Medium |
| 5 | `gh_aw.firewall.requests` | counter | `{request}` | Medium |
| 6 | `gh_aw.tool_calls` attribute `gh-aw.tool.name` | attribute | n/a | Medium |
| 7 | `gh_aw.agent.turns` and duration buckets | histogram config | `{turn}` | Low |
| 8 | `gh_aw.run.result` | counter | `{run}` | Medium |
| 9 | Labels `gh-aw.engine.id`, `gen_ai.request.model` on more series | attribute | n/a | Low |

## 1. `gh_aw.ai.credits.used` (counter, `{credit}`)

- **Attributes:** `gh-aw.job.name`, `gh-aw.workflow.name`, `gh-aw.engine.id`, `gen_ai.request.model`.
- **Why:** AI credits (`gh-aw.aic`, `GH_AW_AIC`) are the only real cost signal in the runtime, but they exist only as a span attribute. The Cost dashboard has to estimate from tokens and user-supplied prices. A metric makes cost exact and removes the price variables.
- **Enables:** exact cost per workflow, model, and run; budget burn-down; alerts on spend rate.

## 2. Error class on `gh_aw.job.errors`

- **Attribute:** `gh-aw.error.class`, a fixed set such as `agent`, `firewall`, `safe_output`, `credits`, `auth`, `network`, `timeout`, `unknown`.
- **Why:** Today errors only say `failure`, `timed_out`, or `cancelled`. Operators cannot tell a model failure from a policy block. The runtime already classifies several causes (`gh-aw.model_routing.failure_code`, `gh-aw.detection.reason`, credit-limit state).
- **Enables:** "errors by failure type" panel (Reliability), targeted alerts.

## 3. `gh_aw.safe_output.failures` (counter, `{item}`)

- **Attributes:** `gh-aw.job.name`, `gh-aw.workflow.name`, `gh-aw.safe_output.type`, `gh-aw.safe_output.reason` (`validation`, `permission`, `api_error`, `blocked`).
- **Why:** `gh_aw.workflow.output.items` counts what was produced, not what was rejected. Failed or blocked safe outputs are invisible, and they are the main failure mode of agentic workflows that "succeed" but change nothing.
- **Enables:** safe-output success rate, per-type failure breakdown (Reliability).

## 4. `gh_aw.harness.retries` (counter, `{retry}`)

- **Attributes:** `gh-aw.workflow.name`, `gh-aw.engine.id`, `gh-aw.retry.reason` (bounded; from `gh-aw.harness.retry_reasons`).
- **Why:** Retry reasons are span-only. Retries inflate cost and duration silently.
- **Enables:** retry rate and cost of retries (Reliability, Cost).

## 5. `gh_aw.firewall.requests` (counter, `{request}`)

- **Attributes:** `gh-aw.workflow.name`, `gh-aw.firewall.outcome` (`allowed`, `blocked`). Do **not** include domain (unbounded).
- **Why:** `gh-aw.firewall.blocked_requests` is a span attribute. A rising block rate shows agents hitting policy or new unapproved dependencies.
- **Enables:** firewall block-rate panel and alert.

## 6. Tool name on `gh_aw.tool_calls`

- **Attribute:** `gh-aw.tool.name` limited to the configured tool set, with `other` as the overflow value to stay inside the 100-series cap.
- **Why:** Tool patterns (which tools dominate, which fail) are the core of "tool call patterns". Current metric has only `ok`/`error`.
- **Enables:** per-tool volume and error rate (Agent Performance).

## 7. Better histogram buckets

- `gh_aw.agent.turns` reuses the duration buckets `1..3600`, which suit seconds, not turns. Propose explicit buckets `1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144`.
- Duration buckets could add `10, 20, 45, 90` for finer p95 in the common 10 s to 2 min range.
- **Enables:** accurate turn and duration percentiles.

## 8. `gh_aw.run.result` (counter, `{run}`)

- **Attributes:** `gh-aw.workflow.name`, `gh-aw.engine.id`, `cicd.pipeline.task.run.result`.
- **Why:** `gh_aw.job.*` counts every job. Workflow-level success needs the agent job filter and cannot represent a run whose agent succeeded but downstream failed, or the reverse. One counter per completed run (emitted by `conclusion`) gives an unambiguous success rate. Existing `gh_aw.run.*` aliases are job-level observations, so they do not fill this gap.
- **Enables:** a single authoritative success-rate stat.

## 9. More label coverage

- `gen_ai.request.model` and `gh-aw.engine.id` appear only on duration and token series. Adding `gh-aw.engine.id` to `gh_aw.tool_calls`, `gh_aw.agent.turns`, and the failure counters lets the `$engine` filter apply on every panel.

## Compatibility and rollout

- Items 2, 6, and 9 add attributes to existing metrics; dashboards remain valid because queries aggregate with `sum by`.
- New names follow the `gh_aw.*` convention and the OpenTelemetry GenAI semantic conventions where one exists (for example `gen_ai.client.token.usage`).
- Suggested order: 1, 2, 3 (cost and failure visibility), then 4, 5, 8, then 6, 7, 9.
