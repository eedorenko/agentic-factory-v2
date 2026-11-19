# Durable Mode Test

## What is durable mode?

Durable mode lets an agentic workflow span multiple runs. At the end of each
run the agent saves a checkpoint artifact (state, progress, and next step).
The next run restores that checkpoint and continues from where the previous
run stopped, instead of starting from scratch.

## What this verifies

Issue #587 checks that durable mode works end-to-end after the checkpoint
validation fix in github/gh-aw#78853:

1. The executor runs on the issue and does the work.
2. It emits a checkpoint (`[EXECUTOR:CHECKPOINT]`) and the checkpoint artifact
   is saved without a validation error.
3. A follow-up run can pick up the saved checkpoint.

This file is the deliverable of a single-run task; its existence on `main`
shows the flow completed.
