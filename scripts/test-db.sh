#!/usr/bin/env bash
# Apply the Supabase schema to a fresh PostgreSQL database and run RLS tests.
# Intended for CI or a throwaway local database, not a real Supabase project.
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to a fresh PostgreSQL database}"

PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q)

if [[ "${TEST_DB_SKIP_STUBS:-0}" != "1" ]]; then
  echo "==> Supabase role/schema stubs"
  "${PSQL[@]}" -f supabase/tests/stubs.sql
fi

for migration in supabase/migrations/*.sql; do
  echo "==> ${migration}"
  "${PSQL[@]}" -f "$migration"
done

echo "==> supabase/seed.sql"
"${PSQL[@]}" -f supabase/seed.sql

echo "==> supabase/tests/rls.sql"
"${PSQL[@]}" -f supabase/tests/rls.sql

echo "==> supabase/tests/social_atomic.sql"
"${PSQL[@]}" -f supabase/tests/social_atomic.sql

echo "==> supabase/tests/playback_qualified.sql"
"${PSQL[@]}" -f supabase/tests/playback_qualified.sql

echo "==> supabase/tests/history_erasure.sql"
"${PSQL[@]}" -f supabase/tests/history_erasure.sql

echo "==> supabase/tests/player_resume.sql"
"${PSQL[@]}" -f supabase/tests/player_resume.sql

echo "==> supabase/tests/discovery_preferences.sql"
"${PSQL[@]}" -f supabase/tests/discovery_preferences.sql

echo "==> supabase/tests/audio_features.sql"
"${PSQL[@]}" -f supabase/tests/audio_features.sql

echo "==> supabase/tests/music_intelligence.sql"
"${PSQL[@]}" -f supabase/tests/music_intelligence.sql

echo "==> scripts/test-social-concurrency.sh"
bash scripts/test-social-concurrency.sh

echo "Database tests passed."