# State

issue: #598
branch: executor/598-design-grafana-dashboards-for-gh-aw-otel-metrics (commit 7b892ded on top of 05ab821d)
pr: NONE exists (run 11 verified list_pull_requests empty); human must create PR from #600 fallback; draft PR requested in run 10 via create_pull_request (may fall back to a review issue like #600 if protected files block it; check list_pull_requests / new issue next run)
phase: implementation (glance redesign requested; BLOCKED on branch push)
checkpoint: Once @eedorenko pushes 7b892ded (SLO redesign) to the remote branch, redesign ONLY gh-aw-slo-overview in definitions/slo-dashboards.mjs per the run-12 spec below; regenerate JSON, update tests (glance traceability), npm test, generate --check, push. Check origin branch head first (list_commits); if still 05ab821d, stay blocked and do not rebuild from scratch.
runs: 14

# Understanding

- Layout: observability/grafana/{definitions/slo.mjs (SLI table: id/factor/expr(ctx)/slo/amber/dir; fleetExpr, workflowExpr, scopedExpr, thresholdSteps, stateExpr, factorStateExpr, alertRulesYaml), definitions/slo-dashboards.mjs (glance gh-aw-slo-overview + 5 scan gh-aw-slo-<factor>), definitions/workflow-drilldown.mjs (commit), definitions/common.mjs (METRICS name map, LABELS, helpers, VARIABLES, TEXTBOX_VARIABLES incl slo_window), tools/generate.mjs (sections-based dashboards + alerts; --check), tools/generate.test.js, smoke-test.mjs, seed-metrics.mjs, alerts/alerts.rules.yml GENERATED, README, METRICS-PROPOSAL (G1-G4)}. Spec: specs/grafana-dashboards-spec.md (SLO/SLI version).
- Human-confirmed names/labels: Title Case workflow names (Executor, Triager, Review Agent...), job names agent/detection/safe_outputs/pre_activation/activation/conclusion/push_repo_memory, tool status `ok`, safe-output types incl noop/report_incomplete/merge_pr, results success/failure/cancelled (no timed_out seen yet). Prior smoke test (old 4 dashboards) was green on real k3d Grafana 13.3.
- Validation tools here: promql-parser in venv /tmp/gh-aw/agent/v (ephemeral), mock Grafana server. Sandbox: kill needs numeric PID.

# Glance redesign request (comment 7052569768, 22:52)
Smoke test passed live (114 OK, 3 NO DATA, 0 ERROR). Change ONLY SLO Overview: gauge panels with green/amber/red; plain titles A1 Fleet Alive, A2 Timeouts, R1 Agent Speed, T1 Work Output, T2 Run Productivity, Q1 Job Success Rate, Q2 Tool Reliability, Q3 Completion Rate, C1 Token Efficiency, C2 Burn Rate, C3 Cache Hits, C4 Rate Limits; SLI code + threshold go in panel description/subtitle; row 1 = 5 big factor gauges (Availability, Responsiveness, Throughput, Quality, Cost efficiency); below each factor a column of 2-4 small SLI gauges; every gauge links to its scan dashboard; A4 telemetry banner unchanged. Leave other 6 dashboards unchanged.

# Plan

Done: spec approved (human "approve", 22:11), implemented glance/scan/commit, alerts generated, tests (138 pass), PromQL parse check, mock smoke 117 OK. Remaining: live validation feedback loop; mark ready; merge flow after review.

# Decisions

- One SLI table drives everything. Relative SLOs for T1/C1/C2. Informational SLIs (A3, R2) have no colours. A4 is trust gate banner. Glance fleet-level, scan per-workflow with $workflow.
- Spec questions (5 scan dashboards, thresholds, GitHub gaps out of scope, alerts tied to SLOs) were answered by the single "approve"; treated as approval of defaults.
- Ratio SLIs: `(num/(den>0)) or ((den>0)*0)` so numerator-absent gives real 0 but quiet fleet gives No data.

# Failed approaches

- Fetching the MS article (firewall). Building everything in one run earlier.

# Run log

- Run 14: triggered by my run-13 comment edit/notification; no new human comment since 22:52; branch still 05ab821d, 7b892ded absent; posted waiting status WITHOUT @executor.
- Run 13: triggered by my own run-12 comment (mentioned @executor in unlock text); no new human comment; branch still 05ab821d, 7b892ded unavailable; posted waiting status WITHOUT @executor (avoid loop).
- Run 12: new glance-redesign request; found remote branch still 05ab821d (no slo.mjs), artifact download blocked by firewall; reported blocker, asked human to push 7b892ded.
- Run 11: workflow_dispatch; no new human comments; no PR exists (#600/#602 fallback issues, #602 closed as dup); remote branch still at 05ab821d, 7b892ded only in fallback bundle. Posted waiting status.
- Run 10: implemented SLO redesign, tests 138 pass, draft PR requested, commented.
- Run 9: posted SLO/SLI spec v1. Run 8: first impl + draft PR (fell back to #600).
