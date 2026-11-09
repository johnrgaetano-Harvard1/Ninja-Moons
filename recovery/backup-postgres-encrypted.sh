#!/usr/bin/env bash
# NINJA MOONS: encrypted PostgreSQL backup. Requires pg_dump, age, sha256sum.
# Required environment: NINJA_DATABASE_URL and NINJA_AGE_RECIPIENT.
# No plaintext database dump is written to disk.
set -Eeuo pipefail
: "${NINJA_DATABASE_URL:?Set a read-only backup-capable PostgreSQL connection URL in your shell or secret manager}"
: "${NINJA_AGE_RECIPIENT:?Set an age public recipient key (age1...)}"
for bin in age sha256sum; do command -v "$bin" >/dev/null || { echo "Missing $bin" >&2; exit 1; }; done
umask 077
destination="${1:-./private-backups}"
mkdir -p "$destination"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="$destination/ninja-moons-postgres-$timestamp.dump.age"
if [[ "${NINJA_USE_DOCKER_PGDUMP:-0}" == "1" ]]; then
  command -v docker >/dev/null || { echo "Docker required for PostgreSQL 17 backup" >&2; exit 1; }
  dump=(docker run --rm -i -e NINJA_DATABASE_URL postgres:17 sh -c 'exec pg_dump --dbname="$NINJA_DATABASE_URL" --format=custom --no-owner --no-acl' )
else
  command -v pg_dump >/dev/null || { echo "pg_dump missing" >&2; exit 1; }
  dump=(pg_dump --dbname="${NINJA_DATABASE_URL}" --format=custom --no-owner --no-acl)
fi
if ! "${dump[@]}" | age -r "$NINJA_AGE_RECIPIENT" -o "$output"; then
  rm -f "$output"
  echo "Backup failed; partial output removed" >&2
  exit 1
fi
test -s "$output"
sha256sum "$output" > "$output.sha256"
echo "Encrypted backup written: $output"
echo "Store both files off GitHub/Vercel; keep the age private identity separately."
echo "Also back up Supabase Storage objects and separately verify an isolated restore."
