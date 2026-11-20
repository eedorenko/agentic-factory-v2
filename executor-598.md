# State

issue: #598
branch: executor/598-design-grafana-dashboards-for-gh-aw-otel-metrics (fresh from origin/main in run 8, 1 commit 05ab821d)
pr: draft PR opened run 8 ("[Executor #598] ..."); old #599 closed by human. Check list_pull_requests for the number.
phase: verification (live k3d validation by human)
checkpoint: Wait for @eedorenko to run tools/smoke-test.mjs (and/or paste `curl $PROM/api/v1/label/__name__/values` + label names) and report. Then fix name-map/label/query errors in definitions/common.mjs or definitions/*.mjs, run `node observability/grafana/tools/generate.mjs`, `npm test`, push_to_pull_request_branch. When validated, mark PR ready / move issue to In Review. Issue board status still In Progress until validated.
runs: 8

# Understanding

- Approved spec = specs/grafana-dashboards-spec.md in branch (consolidated). 4 dashboards: gh-aw-operations-overview, -agent-performance, -cost-efficiency, -reliability (uids = filenames).
- Layout: observability/grafana/{definitions/common.mjs (METRICS name map, LABELS, helpers sel/inc/sum/ratio/quantile/costExpr), definitions/*.mjs, dashboards/*.json generated, alerts/alerts.rules.yml, tools/generate.mjs, generate.test.js (32 tests), smoke-test.mjs, seed-metrics.mjs, README, METRICS-PROPOSAL}. package.json test script includes observability/**/*.test.js.
- Human-confirmed Prom names (canonical): gh_aw_job_duration_seconds_*, gh_aw_agent_turns_*, gh_aw_job_errors_total, gh_aw_tool_calls_total, gh_aw_workflow_output_items_total, gh_aw_otlp_export_failures_total, gen_ai_invoke_agent_duration_seconds_*, gen_ai_client_inference_usage_{input,output,cache_read_input,cache_write_input}_tokens_total. gh_aw_ai_credits_usage_total NOT present (Tier B). Labels NOT yet verified against real series.
- Human collector (otelcol-contrib 0.164, monitoring ns) needs `delta_to_cumulative` processor; prometheus exporter on :8889; fixed by human.
- Smoke test: GRAFANA_URL, GRAFANA_TOKEN, PROM_DS_UID env; human runs it; verified only against a mock server here.
- Sandbox notes: `kill %1`/pkill-style kill blocked; use async bash + stop_bash. spawnSync deadlocks mock servers.

# Plan

Done: chunks 1-3 + smoke test + seeder + docs. Remaining: live validation feedback loop, fixes, mark ready.

# Decisions

- .mjs definitions not YAML (approved). Tokens-first cost with price vars. Tier B collapsed, no alerts. Draft PR opened before live validation because human needs the code; issue stays In Progress until validated.
- Cost expr uses label_replace + `or` to keep four terms distinct; cache terms use (price_cache - price_in) because input includes cache.

# Failed approaches

- Building everything in one run (rejected earlier). CAO site not fetchable. promtool not installed.

# Run log

- Run 8: implemented everything, 108 tests pass, draft PR opened, awaiting human live validation.
- Run 7: k3d plan amendment. Run 6: impl plan. Run 5: spec v3. Run 4: spec v2.
