# State

issue: #598
branch: executor/598-design-grafana-dashboards-for-gh-aw-otel-metrics (old impl; DO NOT build on it)
pr: #599 superseded (set to draft, title marked); human must close. No new PR until spec + plan approved.
phase: spec (human-directed: spec -> implementation plan -> implementation)
checkpoint: wait for @eedorenko feedback on spec draft posted in issue comment (run 44634330471). Then revise spec in comment (no code). After spec approval, post implementation plan. Only then implement.
runs: 2

# Understanding

- Human (eedorenko) said: too fast; close PR, start from scratch; spec first, then plan, then implementation.
- Metrics source: old PR branch contrib/gh-aw/actions/setup/js/otlp_metrics.cjs (buildBuiltinRunMetrics). Built-ins: gh_aw.job.duration, gh_aw.run.duration (hist, s); gh_aw.job.errors, gh_aw.run.errors (failure|timed_out|cancelled); gen_ai.client.token.usage (+alias; token.type, model, engine); gh_aw.agent.turns (hist); gh_aw.tool_calls (gh-aw.tool.status); gh_aw.ai.credits.limit_exceeded; gh_aw.ai.credits.rate_limit_errors; gh_aw.otlp.export.failures; gh_aw.workflow.output.items (+gh_aw.safe_outputs; gh-aw.safe_output.type). Delta temporality.
- Old impl artifacts (reusable ideas): 9 metric-gap proposals (ai credits used, error class, safe-output failures, harness retries, firewall requests, tool name, buckets, run.result, label coverage).
- CAO site not fetchable from runner.
- Tool limits: no close_pull_request safe output; update_pull_request only title/body/draft.

# Plan

1 spec (in issue comment, iterate) -> 2 implementation plan -> 3 implementation on canonical branch/new PR.

# Decisions

- Spec posted as issue comment, not files/PR, to avoid repeating premature implementation.

# Failed approaches

- Building everything in one run (rejected by human).

# Run log

- Run 1 (44630854942): built full impl + PR #599 (now superseded).
- Run 2 (44634330471): steered by human; PR marked superseded; spec draft posted; board back to In Progress.
