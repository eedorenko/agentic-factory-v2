# State

issue: #598
branch: executor/598-design-grafana-dashboards-for-gh-aw-otel-metrics (local commit 868a3472 on top of remote ca2c0f24)
pr: draft PR requested run 19 via create_pull_request (may fall back to an issue because of protected files; then a human must push 868a3472 and open the PR). #599 closed/superseded.
phase: verification (glance redesign implemented; needs live Grafana check by human)
checkpoint: Wait for @eedorenko live check of the simplified overview (banner + 5 stat panels). Adjust per feedback, mark PR ready, merge flow after APPROVED review.
runs: 19

# Understanding

- Layout: observability/grafana/{definitions/slo.mjs (SLI table + GLANCE gauge names/ranges + factorScoreExpr/SCORE_MAPPINGS + alertRulesYaml), definitions/slo-dashboards.mjs (glance overview + 5 scan gh-aw-slo-<factor>), definitions/workflow-drilldown.mjs, definitions/common.mjs, tools/generate.mjs (now supports viz 'gauge'; --check), tools/generate.test.js, smoke-test.mjs, seed-metrics.mjs, alerts/alerts.rules.yml GENERATED, README, METRICS-PROPOSAL}. Spec: specs/grafana-dashboards-spec.md.
- Glance now (run 19, per human): A4 banner (y0,h3) + ONE row of 5 stat panels (y3,h9; value = factorScoreExpr 1/0.5/0, thresholds red/yellow/green, SCORE_MAPPINGS text) each linking to scan dashboard. NO SLI gauges; GLANCE table removed from slo.mjs. Other 6 dashboards unchanged.
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

- Run 19: human said 18 gauges too many; replaced with banner + 5 stat panels, tests 138 green, committed 868a3472, requested draft PR.
- Run 18: unblocked by human (7b892ded pushed). Implemented glance gauge redesign, tests green, committed ca2c0f24, requested draft PR.
- Run 17: blocked waiting for branch push.
