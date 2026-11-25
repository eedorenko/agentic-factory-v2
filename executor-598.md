# State

issue: #598
branch: executor/598-design-grafana-dashboards-for-gh-aw-otel-metrics (local 6f5cfd3c on top of origin fc04fa56; pushed via push_to_pull_request_branch run 22)
pr: #608 (title renamed to "[Executor #598] ..." so the push tool accepts it; was "Align token metrics...")
phase: verification / review feedback
checkpoint: Wait for @reviewer re-review of the new head. If APPROVED review exists (check get_reviews state), call merge_pr(608) and post a checkpoint comment; then Run B (move board Testing -> Done after merge). Human live check of gauges still pending.
runs: 23

# Understanding

- Layout: observability/grafana/{definitions/{slo,slo-dashboards,workflow-drilldown,common}.mjs, tools/{generate,smoke-test,seed-metrics}.mjs + generate.test.js, dashboards/*.json GENERATED, alerts GENERATED, README, METRICS-PROPOSAL}. specs/grafana-dashboards-spec.md. Regenerate: node observability/grafana/tools/generate.mjs; check with --check; npm test (141 pass).
- Token contract (from contrib/gh-aw/actions/setup/js/model_costs.cjs): `input` includes cache reads, cache writes are separate. Emitter token types: input, output, input_cache_read, input_cache_write (otlp_metrics.cjs:436-439). Dashboards: total = input+output+cache_write; non-cache input = input - cache_read; cost = input*p_in + cache_read*(p_cr - p_in) + cache_write*p_cw + output*p_out.
- push_to_pull_request_branch needs repo=eedorenko/agentic-factory-v2 and PR title starting "[Executor".
- promql-parser venv at /tmp/gh-aw/agent/v (ephemeral); all 100 dashboard targets parse.

# Plan

Done in run 22: HIGH cache filter fix + seeder, token contract formulas, README, smoke-test counts variable errors, orZero parenthesised (C4), alert min-sample guards per SLI (agent jobs for R1/Q3, non-cancelled for A2/Q1), drilldown: jobs-completed keeps workflow label, failure numerators zero-filled, duration quantiles keep result label, new emitter-vs-filter test.
Remaining: re-review, merge flow, human live check.

# Decisions

- Cache-write is additive to input (not subtracted), matching gh-aw cost model.
- PR body to be refreshed only if reviewer asks (update_pull_request is limited to 1 per run; used it for title).

# Failed approaches

- Prior run's push failed due to PR title prefix; fixes were never on the branch.

# Run log

- Run 23: reviewer COMMENTED (not APPROVED) at 6f5cfd3c; no code findings open; waiting on human k3d live check. No merge. Posted dormant status comment.
- Run 22: reapplied and extended review fixes (6f5cfd3c), renamed PR, pushed.
- Run 21: red gauges fix (e86bdadd).
- Run 20: worst-SLI gauges.
