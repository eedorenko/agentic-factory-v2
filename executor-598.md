# State

issue: #598
branch: executor/598-design-grafana-dashboards-for-gh-aw-otel-metrics (old impl; DO NOT build on it)
pr: #599 superseded (draft); human must close. No new PR until spec + plan approved.
phase: spec (human-directed: spec -> implementation plan -> implementation)
checkpoint: spec v2 posted (run 44640825219) with all open decisions resolved by me ("your call"). Wait for @eedorenko approval of spec v2. Then post implementation plan (files, generator design, tests, verification) -> wait approval -> implement. No code before both approvals.
runs: 4

# Understanding

- Human: scope=all 4 dashboards; Prometheus only; layout my call; CAO ref from githubnext/gh-cao; "your call on all bullets. Update the spec" (run 4 trigger).
- gh-aw has NO dashboard JSON/spec. Upstream specs/otel-observability-spec.md v0.7.0 §1.2 vendor dashboards out of scope. Local external/gh-aw checkout is STALE (v0.5.0) - read upstream via github MCP get_file_contents (saved to tmp, parse with python).
- Metric contract §11.5 (Tier A): gh_aw.job.duration (hist s; attrs gh-aw.job.name, gh-aw.workflow.name, cicd.pipeline.task.run.result, gh-aw.engine.id, gen_ai.request.model), gh_aw.job.errors, gen_ai.client.inference.usage.{input,output,cache_read.input,cache_write.input}_tokens (input INCLUDES cache; attrs op name, provider, modality, model, job, workflow), gen_ai.invoke_agent.duration (hist, bucket list, agent.name, error.type), gh_aw.agent.turns (job, workflow only), gh_aw.tool_calls (+gh-aw.tool.status), gh_aw.workflow.output.items (+gh-aw.safe_output.type), gh_aw.ai.credits.limit_exceeded/rate_limit_errors, gh_aw.otlp.export.failures (+gh-aw.otlp.endpoint.class, failure.class). Aliases gh_aw.run.*, gh_aw.safe_outputs, gen_ai.client.token.usage must not be summed with canonical. Tier B (§11.3 only): gh_aw.ai.credits.usage, gh_aw.adoption.{evaluations,resolution.duration,zero_touch}. No run/job IDs as dims. Delta temporality -> collector deltatocumulative.
- Prometheus names (to verify vs real collector, #581): dots->_, unit suffix _seconds, counters _total, {unit} dropped, hist _bucket/_sum/_count.
- gh-cao: Dashboard Language (queries->pages->views), <=4 essential views/page, summary-first, supplemental disclosure, units, missing != zero.
- Tool limits: no close_pull_request safe output.

# Plan

1 spec v2 (posted) -> approval -> 2 implementation plan -> approval -> 3 implementation (new PR on executor/598-..., sync branch rule).

# Decisions (all chosen by me per "your call")

- Cost: tokens first; est. cost via price vars ($price_in/out/cache_read/cache_write per 1M, default 0 -> "set prices" hint); credits in collapsed Tier B row.
- Definitions YAML + zero-dep Node generator -> JSON committed; CI/test checks JSON up to date.
- Layout: specs/grafana-dashboards-spec.md + observability/grafana/{README,definitions,dashboards,alerts,METRICS-PROPOSAL.md,tools}.
- Tier B: collapsed, tagged rows; no alerts on Tier B.
- Variable applicability matrix: $engine/$model only on duration/token series.

# Failed approaches

- Building everything in one run (rejected). CAO rendered site not fetchable; used repo instead.

# Run log

- Run 2: steered; spec v0 posted.
- Run 3 (44637560711): research; spec v1.
- Run 4 (44640825219): re-verified §11 upstream; posted spec v2 with decisions resolved.
