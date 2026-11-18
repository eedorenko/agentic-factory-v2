# State

issue: #581
branch: none (verification-only, no code change expected)
pr: none
phase: verification
checkpoint: wait for @eedorenko to confirm Prometheus contents / endpoint path; re-check artifacts of the next run (look for otel-metrics.jsonl)
runs: 5

# Understanding

- Issue is a verification test: OTLP metrics from workflows compiled against gh-aw main (PR github/gh-aw#78433).
- Triager run 44203096004 (head 36422ad) conclusion=cancelled. Artifacts have no otel-metrics.jsonl.
- Executor run 44204261394: otlp-export-errors.jsonl showed ngrok host returning HTTP 404.
- Executor run 44205437719 (8 artifacts) and Reviewer run 44206898590 (7 artifacts: agent, usage, agent-output-fallback, info, safe-outputs-items, detection, activation) also have no otel-metrics.jsonl.
- Executor runtime has only /tmp/gh-aw/otel.jsonl (spans); no metrics file, no export-errors file in run 3.
- Executor cannot query Prometheus (firewall); needs human.

# Plan

1. Post findings (done). 2. Await user on Prometheus / endpoint. 3. Re-verify on next run; close issue if all three expectations pass.

# Decisions

- No PR: no code change needed for verification issue.
- Do not keep re-running the same artifact checks without new input; only re-check when a new human comment or new workflow run exists.

# Failed approaches

none

# Run log

- Run 5 (44209753398): triggered by own checkpoint; still no human reply; local /tmp/gh-aw has otel.jsonl only (no metrics, no export-errors). Posted status.
- Run 1: found OTLP 404 and no metrics artifact; posted findings.
- Run 2: no new human comment; artifacts still lack metrics file; posted status.
- Run 4 (44208536916): still no human reply; Executor run 44206898601 (8 artifacts incl. repo-memory-default) has no otel-metrics.jsonl; local /tmp/gh-aw has otel.jsonl only. Posted status; no repeated @mention spam beyond one ask.
- Run 3: triggered by own checkpoint; still no human reply. Reviewer run 44206898590 artifacts also lack otel-metrics.jsonl. Posted status.
