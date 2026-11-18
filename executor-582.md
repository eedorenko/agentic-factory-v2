# State

issue: #582
branch: executor/582-review-and-update-gh-aw-otlp-docs-to-match-metrics-implementation
pr: #585 (open, docs-only)
phase: verification (PR awaiting review)
checkpoint: after push of review-fix commit, wait for reviewer/Copilot APPROVED review (verify via get_reviews state APPROVED); then merge_pr; Run B post-merge verify; Done
runs: 5

# Understanding

- Only doc changed: contrib/gh-aw/docs/src/content/docs/reference/open-telemetry.mdx (Metrics section split into subsections).
- Sources: actions/setup/js/otlp_metrics.cjs (buildBuiltinRunMetrics), send_otlp_span.cjs (buildOTLPResourceAttributes always adds service.name/version).

# Decisions

- Doc-only, append commits to same branch.
- Copilot review (COMMENTED, 3 low items) addressed in run 5: zero token values emitted, job vs run result semantics, service.* resource attrs bypass allowlist.

# Failed approaches

- none active

# Run log

- Run 3: created PR #585.
- Run 4: no action, waiting for review.
- Run 5: fixed 3 Copilot review comments, pushed to PR branch.
