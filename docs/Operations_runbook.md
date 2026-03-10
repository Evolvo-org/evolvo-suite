# Operations Runbook

## Runtime offline recovery

1. Open the project overview runtime dashboard and identify the offline runtime ID and last heartbeat age.
2. Inspect the runtime host or container and restart the runtime process if it is no longer sending heartbeats.
3. Confirm the runtime can still authenticate, reach the API, and access the expected repository/worktree paths.
4. Re-register the runtime if needed, then verify that heartbeats resume and the runtime returns to an online state.

## Stale lease recovery

1. Inspect scheduler logs for `scheduler.lease.recovered`, `scheduler.lease.renewal_failed`, or repeated `runtime.work.unavailable` events.
2. Use the scheduler recovery flow to recover expired leases before allowing new work to be dispatched.
3. Confirm the affected work item transitioned back into a schedulable state and that no runtime still believes it owns the old lease token.
4. Re-run automation only after the recovered lease and work item state are consistent.

## Stale worktree cleanup

1. Identify worktrees that were left behind after runtime failures, release cancellations, or interrupted retries.
2. Mark the stale worktree explicitly and request cleanup through the worktree management API.
3. Verify the cleanup timestamp and archived/stale details so later runs do not reuse the abandoned worktree.
4. If cleanup fails, remove the filesystem residue manually and then update the worktree status in the API.

## Failed release handling

1. Review the release dashboard entry, release summary, latest tag state, and related intervention or runtime failure details.
2. Inspect the recorded release error, merge commit SHA, and release note/version data to determine whether the failure was pre-tag, post-tag, or branch-conflict related.
3. Resolve the underlying issue, including repository protection rules, credentials, or merge conflicts, before retrying.
4. Retry only after verifying the work item is back in a valid release-ready or operator-approved state.

## Intervention resolution flow

1. Open the intervention dashboard and prioritize the oldest open intervention cases first.
2. Review the intervention summary, reason, attempts made, evidence, and suggested action.
3. Decide whether the work should be retried to planning or ready for dev, or whether the intervention should be resolved without retry.
4. Record resolution notes so the timeline and audit history explain the operator decision.
5. Re-run automation and confirm that the work item leaves the intervention queue and resumes the expected workflow.