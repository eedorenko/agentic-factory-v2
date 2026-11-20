# State

issue: #598
branch: executor/598-design-grafana-dashboards-for-gh-aw-otel-metrics (commit 7b892ded on top of 05ab821d)
pr: draft PR requested in run 10 via create_pull_request (may fall back to a review issue like #600 if protected files block it; check list_pull_requests / new issue next run)
phase: verification (SLO/SLI redesign implemented; awaiting human live validation)
checkpoint: WAIT for @eedorenko to re-run tools/smoke-test.mjs on k3d + screenshots of glance and a scan dashboard. Fix whatever it shows (queries, layout, thresholds), push to same branch, then mark PR ready. Board stays In Progress until validated.
runs: 10

# Understanding

- Layout: observability/grafana/{definitions/slo.mjs (SLI table: id/factor/expr(ctx)/slo/amber/dir; fleetExpr, workflowExpr, scopedExpr, thresholdSteps, stateExpr, factorStateExpr, alertRulesYaml), definitions/slo-dashboards.mjs (glance gh-aw-slo-overview + 5 scan gh-aw-slo-<factor>), definitions/workflow-drilldown.mjs (commit), definitions/common.mjs (METRICS name map, LABELS, helpers, VARIABLES, TEXTBOX_VARIABLES incl slo_window), tools/generate.mjs (sections-based dashboards + alerts; --check), tools/generate.test.js, smoke-test.mjs, seed-metrics.mjs, alerts/alerts.rules.yml GENERATED, README, METRICS-PROPOSAL (G1-G4)}. Spec: specs/grafana-dashboards-spec.md (SLO/SLI version).
- Human-confirmed names/labels: Title Case workflow names (Executor, Triager, Review Agent...), job names agent/detection/safe_outputs/pre_activation/activation/conclusion/push_repo_memory, tool status `ok`, safe-output types incl noop/report_incomplete/merge_pr, results success/failure/cancelled (no timed_out seen yet). Prior smoke test (old 4 dashboards) was green on real k3d Grafana 13.3.
- Validation tools here: promql-parser in venv /tmp/gh-aw/agent/v (ephemeral), mock Grafana server. Sandbox: kill needs numeric PID.

# Plan

Done: spec approved (human "approve", 22:11), implemented glance/scan/commit, alerts generated, tests (138 pass), PromQL parse check, mock smoke 117 OK. Remaining: live validation feedback loop; mark ready; merge flow after review.

# Decisions

- One SLI table drives everything. Relative SLOs for T1/C1/C2. Informational SLIs (A3, R2) have no colours. A4 is trust gate banner. Glance fleet-level, scan per-workflow with $workflow.
- Spec questions (5 scan dashboards, thresholds, GitHub gaps out of scope, alerts tied to SLOs) were answered by the single "approve"; treated as approval of defaults.
- Ratio SLIs: `(num/(den>0)) or ((den>0)*0)` so numerator-absent gives real 0 but quiet fleet gives No data.

# Failed approaches

- Fetching the MS article (firewall). Building everything in one run earlier.

# Run log

- Run 10: implemented SLO redesign, tests 138 pass, draft PR requested, commented.
- Run 9: posted SLO/SLI spec v1. Run 8: first impl + draft PR (fell back to #600).
