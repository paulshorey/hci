#!/usr/bin/env bash
# Run from the repository root with editorial writers and scheduled jobs paused.
set -euo pipefail
umask 077

if [[ $# != 2 || ! $1 =~ ^[a-z][a-z0-9_]*_test$ || ! -d $2 ]]; then
  echo 'Usage: bash scripts/rehearse-local-restore.sh SOURCE_test STORAGE_DIR' >&2
  exit 2
fi
source_db=$1
objects=$(cd "$2" && pwd -P)
if [[ "$objects" == / ]]; then
  echo 'Select the application storage directory.' >&2
  exit 2
fi
archive=$(mktemp -d)
archive=$(cd "$archive" && pwd -P)
if [[ "$archive/" == "$objects/"* ]]; then
  echo 'Set TMPDIR outside the source storage directory.' >&2
  exit 2
fi
restore_db="hci_restore_$(date -u +%Y%m%d_%H%M%S)_${RANDOM}_test"
echo "Archive and restored files: $archive"
echo "Recovery database: $restore_db"
pg=(docker compose exec -T postgres)

# Record the migration source alongside an owner-independent logical dump.
git rev-parse HEAD > "$archive/git-commit"
"${pg[@]}" pg_dump -U hci -Fc "$source_db" > "$archive/database.dump"
tar -C "$objects" -cf "$archive/objects.tar" .
(cd "$archive" && shasum -a 256 database.dump objects.tar git-commit > SHA256SUMS && shasum -a 256 -c SHA256SUMS)

# createdb must succeed. An existing database is never reused.
"${pg[@]}" createdb -U hci -T template0 "$restore_db"
"${pg[@]}" pg_restore -U hci --single-transaction --no-owner --no-privileges -d "$restore_db" < "$archive/database.dump"
mkdir "$archive/objects"
tar -C "$archive/objects" -xf "$archive/objects.tar"
diff -qr "$objects" "$archive/objects"
# A byte-identical copy can still be missing a file that the database references.
"${pg[@]}" psql -X -U hci -d "$restore_db" -v ON_ERROR_STOP=1 -v storage_driver=disk -At < scripts/restore-file-references.sql | node scripts/verify-restored-files.mjs "$archive/objects"
echo 'Database restored and storage copy verified.'
