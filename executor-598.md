# State

issue: #598
branch: executor/598-design-grafana-dashboards-for-gh-aw-otel-metrics (old impl; DO NOT build on it)
pr: #599 superseded (draft); human must close. No new PR until spec + plan approved.
phase: spec (human-directed: spec -> implementation plan -> implementation)
checkpoint: wait for @eedorenko feedback on spec v1 (run 44637560711). Then finalize spec -> post implementation plan -> wait approval -> implement. No code before approval.
runs: 3

# Understanding

- Human answers (run 3 trigger): scope=all 4 dashboards; Prometheus only (no Loki/Tempo); layout=my call; CAO ref from githubnext/gh-cao; asked to check if gh-aw already has dashboards/specs.
- gh-aw has NO dashboard JSON/spec. specs/otel-observability-spec.md (v0.7.0) says vendor dashboards out of scope (§1.2). Only Grafana MCP usage in workflows (Daily AIC report, grafana-otel-advisor issues).
- Upstream spec has moved since old impl: §11.5 built-in metrics use attrs gh-aw.job.name, gh-aw.workflow.name, cicd.pipeline.task.run.result, gh-aw.engine.id, gen_ai.request.model; new counters gen_ai.client.inference.usage.{input,output,cache_read.input,cache_write.input}_tokens (input INCLUDES cache; do not sum with gen_ai.client.token.usage); gen_ai.invoke_agent.duration (hist, explicit buckets, error.type on failure); spec-only (code search finds only spec): gh_aw.ai.credits.usage, gh_aw.adoption.evaluations/resolution.duration/zero_touch. Aliases (gh_aw.run.*, gh_aw.safe_outputs) must not be summed with canonical. Metrics must not carry run IDs (§8.3/11.1) -> no per-run panels. Delta temporality.
- gh-cao dashboards are NOT Grafana: declarative Dashboard Language (YAML/JSON IR): queries -> pages -> views; marks metric/table/line/pie/swimlane/treemap; <=4 essential views/page; summary-first; essential vs supplemental disclosure; units declared (AIC); missing != zero; data from `gh aw logs` JSONL. Files: .github/skills/dashboard-authoring/SKILL.md, generate-dashboard-ir/corpus/examples/*.dashboard.yml (workflow-cost-inventory, failed-run-investigation, triage-review-readiness, workflow-hardening-attainment), .github/cao/instructions/dashboard-analysis.md.
- Tool limits: no close_pull_request safe output.

# Plan

1 spec v1 (posted) -> iterate -> 2 implementation plan -> 3 implementation (new PR, branch executor/598-...; sync branch rule). Proposed layout: specs/grafana-dashboards-spec.md, observability/grafana/{definitions,dashboards,alerts,README}.

# Decisions

- Spec lives in issue comments until approved. Tier A (implemented) vs Tier B (spec-only, verify) metric labelling in panels. Tokens-first cost; credits panels guarded. Recommend definitions-file + generator.

# Failed approaches

- Building everything in one run (rejected). CAO rendered site not fetchable; used repo instead.

# Run log

- Run 1: built impl + PR #599 (superseded).
- Run 2: steered; spec v0 posted.
- Run 3 (44637560711): researched gh-aw + gh-cao; posted spec v1 with answers.
