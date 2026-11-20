# State

issue: #598
branch: executor/598-design-grafana-dashboards-for-gh-aw-otel-metrics (fresh from origin/main in run 8, 1 commit 05ab821d)
pr: none open (#599 closed; fallback issue #600). Branch has old 4-dashboard impl, smoke-tested green by human.
phase: spec (SLO/SLI redesign)
checkpoint: WAIT for @eedorenko to approve SLO/SLI spec v1 (comment run 44821278416; 5 factors, 14 SLIs, 7 dashboards: 1 glance + 5 scan + 1 drilldown). Then implement: definitions/slo.mjs SLI table, new dashboards, update tests/alerts/README/spec/METRICS-PROPOSAL (G1-G4), keep common.mjs. Do NOT code before approval.
runs: 9

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

- Run 9: Prometheus-only SLIs; relative SLOs (vs trailing baseline) for throughput/cost since no baseline; GitHub-data signals (stage dwell, rework) listed as gaps G1/G2 not invented. Questions pending: 5 vs fewer scan dashboards, thresholds, scope of GitHub gaps, alerts tied to SLOs.
- .mjs definitions not YAML (approved). Tokens-first cost with price vars. Tier B collapsed, no alerts. Draft PR opened before live validation because human needs the code; issue stays In Progress until validated.
- Cost expr uses label_replace + `or` to keep four terms distinct; cache terms use (price_cache - price_in) because input includes cache.

# Failed approaches

- Building everything in one run (rejected earlier). CAO site not fetchable. promtool not installed.

# Run log

- Run 9: human paused impl (same comment posted 3x) and asked for SLO/SLI-driven redesign (MS IoT Edge observability article, unfetchable from firewalled runner). Posted SLO/SLI spec v1, no code.
- Run 8: implemented everything, 108 tests pass, draft PR opened, awaiting human live validation.
- Run 7: k3d plan amendment. Run 6: impl plan. Run 5: spec v3. Run 4: spec v2.
