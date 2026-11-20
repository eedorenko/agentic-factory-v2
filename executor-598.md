# State

issue: #598
branch: executor/598-design-grafana-dashboards-for-gh-aw-otel-metrics (old impl; DO NOT build on it; on implementation start, branch fresh from origin/main per sync rule)
pr: #599 superseded (draft); human must close. No new PR until implementation plan approved.
phase: implementation plan (spec v2+v3 APPROVED by @eedorenko in comment 'approved' 2026-11-20T17:38)
checkpoint: impl plan posted (run 44786172815... see run log). Wait for @eedorenko approval of impl plan. Then implement in chunks: (1) generator+name map+tests, (2) 4 definitions + generated JSON, (3) alerts+README+METRICS-PROPOSAL+spec file, then verify, then ONE PR "[Executor #598] ..." -> move to In Review.
runs: 6

# Understanding

- Approved spec = comments #9 (spec v2) + #11 (v3 delta) on issue #598; re-read them via issue_read get_comments if details needed (4 dashboards, panels/queries, variables, alerts, layout).
- gh-aw has NO dashboard JSON/spec. Local external/gh-aw checkout STALE (v0.5.0); read upstream (github/gh-aw specs/otel-observability-spec.md v0.7.0 §11.5, actions/setup/js/otlp_metrics.cjs) via github MCP.
- Metrics (Prom names, expected): gh_aw_job_duration_seconds_{bucket,sum,count} (gh_aw_workflow_name, gh_aw_job_name, cicd_pipeline_task_run_result, gh_aw_engine_id, gen_ai_request_model); gh_aw_job_errors_total; gen_ai_client_inference_usage_{input,output,cache_read_input,cache_write_input}_tokens_total (input INCLUDES cache); gen_ai_invoke_agent_duration_seconds_*(error_type); gh_aw_agent_turns_*; gh_aw_tool_calls_total (gh_aw_tool_status ok|error); gh_aw_workflow_output_items_total (gh_aw_safe_output_type); gh_aw_ai_credits_{limit_exceeded,rate_limit_errors}_total; gh_aw_otlp_export_failures_total. Tier B (not emitted): gh_aw_ai_credits_usage_total.
- Final: METRICS-PROPOSAL.md has 2 items (emit credits.usage; explicit buckets for agent.turns [1,2,3,5,8,13,21,34,55,89,144]) + note on job.duration buckets + "answered by existing signals" list.
- GH Actions links via $gh_repo textbox var: https://github.com/$gh_repo/actions?query=workflow:"${__field.labels.gh_aw_workflow_name}".
- Repo: node 24, `npm test` = node --test src/**/*.test.js; no deps; no specs/ or observability/ dirs yet. Tool limits: no close_pull_request safe output.

# Plan

Impl plan proposes: definitions as .mjs modules (not YAML: zero-dep Node can't parse YAML) -> tools/generate.mjs -> dashboards/*.json; tests in observability/grafana/tools/*.test.js; add to package.json test script.

# Decisions

- Cost: tokens first, price vars default 0. Tier B collapsed rows, no alerts on Tier B. Stage here, final home github/gh-aw. Deviation from spec: .mjs not YAML (flagged in plan comment).

# Failed approaches

- Building everything in one run (rejected by human). CAO rendered site not fetchable.

# Run log

- Run 6: spec approved; posted implementation plan, awaiting approval.
- Run 5: answered gap question; verified upstream code; spec v3 delta.
- Run 4: spec v2.
