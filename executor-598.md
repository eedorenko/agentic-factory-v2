# State

issue: #598
branch: executor/598-design-grafana-dashboards-for-gh-aw-otel-metrics
pr: created in run 44630854942 (number unknown at write time; find via list_pull_requests)
phase: verification (PR open, awaiting reviewer)
checkpoint: check PR review status; address feedback by editing contrib/gh-aw/dashboards/grafana/definitions.mjs then `node build.mjs` and `node --test dashboards.test.mjs`; commit and push_to_pull_request_branch. Merge only after a review with state APPROVED.
runs: 1

# Understanding

- Metrics source of truth: contrib/gh-aw/actions/setup/js/otlp_metrics.cjs (buildBuiltinRunMetrics) and docs/.../open-telemetry.mdx. 9 built-ins; counters/histograms are DELTA temporality.
- Only duration and token series carry engine/model labels. Errors carry only failure|timed_out|cancelled.
- Dashboards generated from grafana/definitions.mjs + lib.mjs via build.mjs; test file validates names/labels/staleness.
- PromQL validated with promql-parser in venv at /tmp/gh-aw/agent/v (ephemeral).

# Plan

Done: 4 dashboards, alerts, SPECS.md, METRICS-PROPOSAL.md, README. Remaining: review feedback, merge, post-merge check.

# Decisions

- Placed under contrib/gh-aw/dashboards (mirrors upstream tree). Generator approach so JSON stays consistent.
- Cost via price textbox variables since gh-aw exports no price.

# Failed approaches

- CAO site not reachable; documented, not claimed.

# Run log

- Run 1 (44630854942): researched, built all deliverables, 76/76 repo tests, PR opened, moved to In Review.
