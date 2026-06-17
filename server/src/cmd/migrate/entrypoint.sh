#!/bin/sh
set -e
PATH="/app:$PATH"

# With args (e.g. "down 1", "version"): run migrate with those args
if [ $# -gt 0 ]; then
  exec /app/migrate -path /app/migrations "$@"
fi

# Default: apply pending migrations (no auto force; see golang-migrate docs for dirty DB)
exec /app/migrate -path /app/migrations up
