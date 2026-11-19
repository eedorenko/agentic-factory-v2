# State

issue: #591
branch: executor/591-executor-587-test-verify-durable-mode-after-gh-aw-78853-fix
pr: created via safe output (run 44605468992), awaiting reviewer
phase: verification
checkpoint: wait for review; on APPROVED review call merge_pr, then verify merge + move project to Testing/Done. Address review feedback if any.
runs: 3

# Understanding

#591 = Executor Durable failure notice (branch collision with open PR #590 for #587). Architect decided: no safe-output config change; prompt-only fix in "Branch And PR Rules" of executor.md and executor-durable.md (check list_pull_requests; if open PR exists use push_to_pull_request_branch, never create_pull_request). Lock files inline only a body_hash (prompt loaded via runtime-import), so I updated body_hash in both locks with a python reimplementation (sha256 of normalized body + "\n---\n" + shared/reporting.md body), validated against the pre-edit hashes. Go 1.27.3 is not downloadable, so gh aw compile is unavailable.

# Decisions

- recreate-ref and disabling preserve-branch-name rejected (would close #590 / add hash suffix).

# Failed approaches

- Building external/gh-aw compiler: needs Go 1.27.3 + modules; network blocked.

# Run log

- run 1-2: waited on architect.
- run 3: implemented architect's prompt fix, committed, created PR, moved board to In Review.
