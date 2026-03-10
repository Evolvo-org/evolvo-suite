# Evolvo runtime

Local worker shell for Evolvo v2.

## Environment

- `RUNTIME_ID` - stable runtime identifier
- `RUNTIME_DISPLAY_NAME` - human-readable runtime label
- `RUNTIME_CAPABILITIES` - comma-separated capability list reported to the API
- `API_BASE_URL` - API base URL
- `API_AUTH_TOKEN` - optional bearer token for future API auth enforcement
- `API_RETRY_MAX_ATTEMPTS` - retry count for retryable API calls
- `API_RETRY_BASE_DELAY_MS` - base backoff delay in milliseconds
- `REPOSITORIES_ROOT` - local root for cloned repositories and worktrees
- `HEARTBEAT_INTERVAL_MS` - planned heartbeat cadence
- `WORK_POLLING_ENABLED` - enables lease polling; defaults to `false` until execution phases are enabled
- `WORK_POLL_INTERVAL_MS` - normal work polling interval
- `WORK_POLL_IDLE_BACKOFF_MS` - initial idle backoff when no work is available
- `WORK_POLL_MAX_BACKOFF_MS` - maximum idle backoff ceiling
- `LEASE_PROGRESS_INTERVAL_MS` - lease renewal and progress update cadence while a task is active

This shell intentionally has no orchestration state. The API remains the source of truth.
