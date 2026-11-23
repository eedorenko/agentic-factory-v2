# State

issue: #598
branch: executor/598-design-grafana-dashboards-for-gh-aw-otel-metrics (local commit ca2c0f24 on top of remote 7b892ded)
pr: NONE open (#599 closed/superseded; #600 was a fallback review issue). Run 18 requested a draft PR via create_pull_request; if it again becomes a fallback issue, a human must push ca2c0f24 / open the PR.
phase: verification (glance redesign implemented; needs live Grafana check by human)
checkpoint: Wait for @eedorenko to import the regenerated gh-aw-slo-overview.json into k3d Grafana and report gauge rendering/feedback. Then adjust gauge ranges (GLANCE in definitions/slo.mjs) as needed, mark PR ready, merge flow after review.
runs: 18

# Understanding

- Layout: observability/grafana/{definitions/slo.mjs (SLI table + GLANCE gauge names/ranges + factorScoreExpr/SCORE_MAPPINGS + alertRulesYaml), definitions/slo-dashboards.mjs (glance overview + 5 scan gh-aw-slo-<factor>), definitions/workflow-drilldown.mjs, definitions/common.mjs, tools/generate.mjs (now supports viz 'gauge'; --check), tools/generate.test.js, smoke-test.mjs, seed-metrics.mjs, alerts/alerts.rules.yml GENERATED, README, METRICS-PROPOSAL}. Spec: specs/grafana-dashboards-spec.md.
- Glance now: A4 banner (y0,h3) -> 5 factor gauges (y3,h6; score = 1 - state/2: 1 green, .5 orange, 0 red) -> per-factor column of SLI gauges (h5): A1 Fleet Alive, A2 Timeouts, R1 Agent Speed, T1 Work Output, T2 Run Productivity, Q1 Job Success Rate, Q2 Tool Reliability, Q3 Completion Rate, C1 Token Efficiency, C2 Burn Rate, C3 Cache Hits, C4 Rate Limits. SLI code+SLO in description. Responsiveness has only R1 (R2 informational excluded). Other 6 dashboards unchanged.
- Human-confirmed names/labels earlier; smoke test was green live (114 OK).
- Validation tools: promql-parser venv /tmp/gh-aw/agent/v (ephemeral). npm test 138 pass; generate --check ok.

# Plan

Done: spec, SLO impl, scan/commit, glance gauge redesign (run 18). Remaining: human live check; PR; review; merge flow.

# Decisions

- Gauge ranges are per-SLI in GLANCE (slo.mjs). Factor gauge uses percentunit 0-1 with value mappings SLO met/At risk/Breached.
- Avoid writing the literal executor handle in waiting comments (loop).

# Failed approaches

- Fetching the MS article (firewall).

# Run log

- Run 18: unblocked by human (7b892ded pushed). Implemented glance gauge redesign, tests green, committed ca2c0f24, requested draft PR.
- Run 17: blocked waiting for branch push.
