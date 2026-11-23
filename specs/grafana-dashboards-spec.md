# gh-aw Grafana dashboards: SLO/SLI spec

Status: SLO/SLI redesign approved on issue #598 (supersedes the four audience dashboards). Stage in `eedorenko/agentic-factory-v2`; final home is
`github/gh-aw` (`specs/` and `observability/grafana/`). Implementation lives in
`observability/grafana/`; see its README for usage.

Source metrics: gh-aw `specs/otel-observability-spec.md` v0.7.0 and
`actions/setup/js/otlp_metrics.cjs`.

## 1. Principle

Each dashboard answers "are the people relying on gh-aw happy?", not "what metrics exist?".
Every panel traces to a happiness factor -> SLI -> SLO. The flow is glance -> scan -> commit.

- **Prometheus metrics only.** Issue-board signals (stage dwell, rework) need GitHub data and are listed as gaps G1/G2, not invented SLIs.
- **No baseline yet.** Thresholds are initial defaults to tune after a week of real data. Where a fixed number would be a guess, the SLO is relative to the fleet's own trailing baseline (T1, C1, C2).
- SLO window is `$slo_window` (default `7d`). Tile colours: green = SLO met, orange = within the amber margin, red = breached.

## 2. Decisions

| Topic | Decision |
| --- | --- |
| Source of truth | `definitions/slo.mjs` holds one SLI table (id, factor, PromQL, SLO, amber margin, unit). Glance tiles, scan thresholds, SLO lines and alert rules are all generated from it, so a threshold change is one edit. |
| Definitions | `.mjs`, not YAML. `tools/generate.mjs` writes the dashboard JSON and `alerts/alerts.rules.yml`; a test fails if either is stale. |
| Cost | Tokens first. Relative SLOs (C1, C2) avoid guessing absolute budgets. Estimated dollars remain an optional panel (`$price_*`, USD per 1M tokens, default 0), not an SLO. Credit panels are Tier B. |
| Tier B | Defined upstream but not emitted (`gh_aw_ai_credits_usage_total`). Collapsed row in the drilldown, no alerts. |
| Links | `$gh_repo`; scan rows link to the commit tier, the commit tier links to the workflow's GitHub Actions run list (metrics carry no run id). |

## 3. Happiness factors, SLIs, SLOs

| Factor | Happy when | SLI | Definition | SLO | Amber |
| --- | --- | --- | --- | --- | --- |
| Availability | workflows run and are not stuck | A1 Fleet liveness | jobs reported in the last 6h | >= 1 | n/a |
| | | A2 Timeout ratio | `timed_out` jobs / non-cancelled jobs | <= 2% | <= 4% |
| | | A3 Silent workflows | active in 7d but silent in 24h | informational | n/a |
| | | A4 Telemetry health | OTLP export failures in 1h (trust gate) | 0 | n/a |
| Responsiveness | work finishes promptly | R1 Agent job p95 | p95 of `agent` job duration | <= 20 min | <= 25 min |
| | | R2 Agent job p50 | median | informational | n/a |
| Throughput | runs are productive | T1 Throughput vs baseline | successful agent runs, 24h / 7d daily average | >= 60% | >= 40% |
| | | T2 Productive outputs per run | non-`noop` safe outputs / agent runs | >= 0.5 | >= 0.3 |
| Quality | low failure rate | Q1 Job success ratio | successful / non-cancelled jobs | >= 95% | >= 90% |
| | | Q2 Tool call success ratio | `ok` / all tool calls | >= 90% | >= 80% |
| | | Q3 Incomplete-run rate | `report_incomplete` outputs / agent runs | <= 5% | <= 10% |
| Cost efficiency | reasonable burn | C1 Tokens per output vs baseline | 7d tokens-per-output / 28d | <= 1.5x | <= 2x |
| | | C2 Burn rate vs baseline | 24h tokens / 7d daily average | <= 2x | <= 3x |
| | | C3 Cache hit ratio | cache-read / input tokens | >= 40% | >= 20% |
| | | C4 Credit and rate-limit events | limit-exceeded + rate-limit errors | 0 | n/a |

The PromQL for each SLI lives in `definitions/slo.mjs` (`fleetExpr` for the glance tier, `workflowExpr` for scan tables). Ratios use `a / (b > 0)` so a quiet fleet shows "No data", not 0%.

## 4. Dashboards: glance -> scan -> commit

| Tier | Dashboard (uid) | Question |
| --- | --- | --- |
| Glance | `gh-aw-slo-overview` | Is the fleet meeting expectations right now, and which factor is not? |
| Scan | `gh-aw-slo-availability`, `-responsiveness`, `-throughput`, `-quality`, `-cost` | Which workflows violate this SLO, and since when? |
| Commit | `gh-aw-workflow-drilldown` | Why is this workflow violating the SLO? |

**Glance** (one screen, no scrolling): a telemetry-health banner (A4, trust gate), then five large factor gauges (Availability, Responsiveness, Throughput, Quality, Cost efficiency; full green = every SLO met, half orange = at risk, empty red = breached), each with a column of 1-4 small SLI gauges below it with plain titles (A1 Fleet Alive, A2 Timeouts, R1 Agent Speed, T1 Work Output, T2 Run Productivity, Q1 Job Success Rate, Q2 Tool Reliability, Q3 Completion Rate, C1 Token Efficiency, C2 Burn Rate, C3 Cache Hits, C4 Rate Limits). The SLI code and SLO live in the panel description. Every gauge links to its factor's scan dashboard.

**Scan** (one per factor): a per-workflow table of the factor's SLIs sorted worst first with cells coloured against the SLO and a sample-size column; an SLI-vs-SLO time series per SLI with the SLO (dashed red) and amber margin (dashed orange); a distribution panel where it fits (duration heatmap, token mix). Clicking a workflow opens the drilldown with `var-workflow` set. Throughput shows `create_pull_request` and `merge_pr` counts as a proxy for "issues completed"; they are not an SLO.

**Commit** (`$workflow`, `$job`, `$model`, `$result`): duration by result, jobs/errors by job, agent failures by `error_type` and model, tool calls by status, turns, tokens by type and model, safe-output types, estimated cost, Tier B credits in a collapsed row.

Every panel description records the question it answers, its metric tier, the SLI id(s) it traces to, the SLO text, and the variables it ignores.

## 5. Variables

| Variable | Label | Used on |
| --- | --- | --- |
| `$workflow` | `gh_aw_workflow_name` | scan and commit tiers (the glance tier is fleet level) |
| `$job`, `$model`, `$result` | `gh_aw_job_name`, `gen_ai_request_model`, `cicd_pipeline_task_run_result` | commit tier |
| `$slo_window` | text box, default `7d` | glance and scan |
| `$gh_repo`, `$price_*` | text boxes | links and optional cost |

## 6. Alerts (one rule per breached SLO)

Generated from the SLI table; thresholds equal the SLO. Rules on ratios also require a minimum job count so a quiet fleet does not page.

| Alert | SLI | Window | For |
| --- | --- | --- | --- |
| `GhAwFleetSilent` | A1 | 6h | 0m |
| `GhAwTimedOutJobs` | A2 | 6h | 15m |
| `GhAwTelemetryBroken` | A4 | 15m | 15m |
| `GhAwSlowAgentJobs` | R1 | 6h | 30m |
| `GhAwHighFailureRate` | Q1 | 1h | 15m |
| `GhAwHighIncompleteRate` | Q3 | 6h | 30m |
| `GhAwTokenBurnSpike` | C2 | 1d vs 7d | 1h |

## 7. Verification

- `npm test`: freshness of generated JSON and alerts; SLI table coherence (amber beyond SLO) and the approved thresholds; every glance tile has an SLO and links to its scan dashboard; every scan panel traces to an SLI of its own factor; the SLO line is drawn; alert thresholds come from the table; schema checks (unique ids, no overlaps, variables defined, datasource variable, descriptions, units); metric-name, alias and Tier B checks; PromQL sanity.
- `tools/smoke-test.mjs`, run by a human against a live Grafana and Prometheus: every query returns OK, NO DATA or ERROR, and the name map is checked against real series.
- Layout is verified visually in Grafana.

## 8. Upstream metric gaps

See `observability/grafana/METRICS-PROPOSAL.md` (credits usage, turns buckets, and gaps G1-G4 surfaced by the SLO design).
