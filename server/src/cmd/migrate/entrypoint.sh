#!/bin/sh
set -e
PATH="/app:$PATH"

# With args (e.g. "down 1", "version"): run migrate with those args
if [ $# -gt 0 ]; then
  exec /app/migrate -path /app/migrations "$@"
fi

# Default: run "up"; on failure (e.g. dirty state) reset to "no version" and retry
/app/migrate -path /app/migrations up || {
  echo "migrate up failed, resetting to clean state (force -1) and retrying..."
  /app/migrate -path /app/migrations force -1
  exec /app/migrate -path /app/migrations up
}
