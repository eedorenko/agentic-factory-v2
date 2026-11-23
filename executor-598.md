# State

issue: #598
branch: executor/598-design-grafana-dashboards-for-gh-aw-otel-metrics (local commit 973a90ab on top of remote 868a3472, which the human pushed)
pr: none yet; create_pull_request requested run 20 (may fall back to an issue because of protected files; then a human must push 973a90ab and open the PR)
phase: verification (worst-SLI gauge glance implemented; needs live Grafana check by human)
checkpoint: Wait for @eedorenko live check of the 5 worst-SLI gauges (check the topk/bottomk query renders one series per gauge with the right unit/override). Tune `warn`/`range` per SLI in slo.mjs on feedback, mark PR ready, merge flow after APPROVED review.
runs: 20

# Understanding

- Layout: observability/grafana/{definitions/slo.mjs (SLI table incl. new `warn` + `range` per SLI; gaugeSteps/gaugeLabel/gaugeUnit/marginExpr/worstSliExpr; alertRulesYaml), definitions/slo-dashboards.mjs (glance overview + 5 scan gh-aw-slo-<factor>), definitions/workflow-drilldown.mjs, definitions/common.mjs, tools/generate.mjs, tools/generate.test.js, smoke-test.mjs, seed-metrics.mjs, alerts GENERATED, README, METRICS-PROPOSAL}. Spec: specs/grafana-dashboards-spec.md.
- Glance (run 20, per human 22:26): A4 banner + 5 GAUGES (one per factor), each shows actual value of the factor's worst SLI (least headroom in warn bands). One query per gauge: topk(1, actual and on(sli) bottomk(1, margin)) with label `sli` = gaugeLabel (title + SLO), legend {{sli}}; per-SLI field overrides byName (unit, min/max range, thresholds). yellow=inside warn margin, red=breached.
- Old stateExpr/factorScoreExpr/SCORE_MAPPINGS removed.
- Smoke test was green live earlier (114 OK) before glance changes. Validation: promql-parser venv /tmp/gh-aw/agent/v (ephemeral). npm test 140 pass; generate --check ok.

# Plan

Done: spec, SLO impl, scan/commit, glance iterations. Remaining: human live check; PR; review; merge flow.

# Decisions

- Cross-SLI "worst" chosen by headroom measured in warn bands (unit-free); count SLIs margin = 3 met / -1 breached.
- Series-name override matching relies on label_replace'd `sli` label; if Grafana renders name differently live, adjust.
- Avoid writing the literal executor handle in waiting comments (loop).

# Failed approaches

- Fetching the MS article (firewall).

# Run log

- Run 20: human wanted gauges with actual values vs SLO; implemented worst-SLI gauges, tests 140 green, committed 973a90ab, requested draft PR.
- Run 19: banner + 5 stat score panels (868a3472).
- Run 18: 18 gauges (ca2c0f24).
