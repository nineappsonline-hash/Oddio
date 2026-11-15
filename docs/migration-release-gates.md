# Oddio — production migration rollout gate (2026-11-15)

**Status: BLOCKED — no production migrations applied.**

Project: `project-ai-music` / `weflfkftkdlrolctdmae`.
The production migration registry currently ends at `20261114165142`.
No Supabase development branches exist. An attempted staging branch creation was
refused by the provider before creating resources because the API requires explicit
cost confirmation. Never create a paid branch or apply SQL to production without
the owner's approval and recovery verification.

## Exact outstanding migrations (apply in this order)

1. `20261115183000_atomic_social_interactions.sql`
2. `20261115190000_player_resume_states.sql`
3. `20261115191000_artist_search_aliases.sql`
4. `20261115192000_audio_features.sql`
5. `20261115193000_audio_fingerprints.sql`
6. `20261115194000_music_tag_approval.sql`
7. `20261115210000_discovery_preferences.sql`

These migrations are tracked on `feature/master-plan-phase-0-1` and have been
exercised in disposable PostgreSQL CI, but disposable CI cannot validate the
actual production dataset, provider configuration, R2 playback or rollback.

## Baseline captured before migration

- 32 tracks, 4 profiles, 1 artist, 37 audio asset rows, zero playlists.
- Database version PostgreSQL 17, project healthy.
- Read-only schema check confirmed new tables, columns and functions absent.
- Security advisor: 7 RLS tables with intentionally/possibly policy-less deny-all
  configurations (INFO); leaked-password protection disabled (WARN).
  Do not grant policies indiscriminately.

## Required steps before touching production

- [ ] Verify automated/downloadable backup availability in Supabase Dashboard.
- [ ] Export a separately stored, restorable copy of database schema and data
      using a supported backup mechanism (not a screenshot or counts-only check).
- [ ] Restore that backup to an **isolated disposable PostgreSQL environment**,
      verify representative track/profile/artist/audio metadata and counts,
      and document the restore timestamp and location securely.
- [ ] Obtain approval for the cost of any managed Supabase staging branch
      **before** creating it. Alternatively prepare an isolated local/free Postgres
      staging environment with matching schema/extensions and nonproduction data.
- [ ] Run all seven migrations in version order on staging, verify direct table
      access is denied to `anon`/`authenticated` and that privileged RPC
      execution is available only to `service_role`.
- [ ] Run `scripts/test-db.sh` on disposable database and staging integration
      tests using real authorized identities for social transactions,
      player resume, artist aliases, audio features, tag approval and exclusions.
- [ ] Verify Cloudflare R2 streaming and the permanent media worker independently.
- [ ] Review the coordinated application rollout: RPC-dependent web code must
      never ship ahead of its SQL migrations; keep a tested rollback.
- [ ] Take/verify a final pre-deploy backup, apply missing migrations in order
      to production only during the approved release window, reconcile all data
      counts and permissions, then deploy matching web and worker code.
- [ ] Monitor errors and independently recheck real device/browser playback.

**Do not** run `restore_project` on the existing production project as a
backup verification test: that action could affect the live database.

Useful entry point:
https://supabase.com/dashboard/project/weflfkftkdlrolctdmae/database/backups
