# Evolvo runtime

Local worker shell for Evolvo v2.

## Environment

- `RUNTIME_ID` - stable runtime identifier
- `API_BASE_URL` - API base URL
- `REPOSITORIES_ROOT` - local root for cloned repositories and worktrees
- `HEARTBEAT_INTERVAL_MS` - planned heartbeat cadence

This shell intentionally has no orchestration state. The API remains the source of truth.
