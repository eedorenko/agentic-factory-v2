# State

issue: #608 (PR, branch executor/598-design-grafana-dashboards-for-gh-aw-otel-metrics, linked issue #598)
pr: 608
phase: verification (review feedback addressed)
checkpoint: Wait for reviewer re-review; if APPROVED review exists, merge_pr(608) then post-merge flow. Otherwise address new feedback.
runs: 1

# Understanding

- Reviewer HIGH finding: cache token types must be input_cache_read / input_cache_write (emitter contract/otlp_metrics.cjs:439-440). Fixed in common.mjs, seed-metrics.mjs, regenerated dashboards (commit fa360b0f), added emitter-contract test in tools/generate.test.js. README Tier A row fixed. PR body corrected (collector/ServiceMonitor not in diff).
- Tests: npm test 141 pass; generate --check ok.
- safeoutputs push_to_pull_request_branch needs repo=eedorenko/agentic-factory-v2.

# Run log

- Run 1: addressed reviewer findings, pushed fa360b0f, updated PR body.
