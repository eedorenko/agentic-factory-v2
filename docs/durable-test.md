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

## Status

Durable verification is **pending**. This file's existence on `main` does not
show that checkpoint saving or restoration works. In
[durable run 44595466518](https://github.com/eedorenko/agentic-factory-v2/actions/runs/44595466518/job/135813703224),
checkpoint validation failed and checkpoint upload was skipped. Verification
is complete only once a run uploads a checkpoint successfully and a follow-up
run restores it.
