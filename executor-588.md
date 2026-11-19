# State

issue: #588 (auto fallback for #587 unsigned push failure; pipeline issue, not code)
pr: none for #588; #587 has PR #590 (open, head 261e918, 2 commits, mergeable clean, only a COMMENTED Copilot review, no APPROVED)
phase: blocked
checkpoint: wait for @eedorenko signing-policy decision / @sre diagnosis; on #587 track PR #590 review (needs APPROVED state before merge_pr)
runs: 2

# Understanding

Triager marked blocked: needs human choice (enable signing for Executor identity vs change publish path). Executor made no workflow changes. Copilot Low finding on PR #590: docs should not claim durable verification without checkpoint upload/restore evidence.

# Run log

1: read issue/comments, confirmed PR #590 exists, posted status comment (no @executor).
2: re-read comments; no new direction; PR #590 still unreviewed (no APPROVED); posted status comment, no @executor.
