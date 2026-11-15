# Oddio — production migration rollout gate (2026-11-15)

**Status: ALL SEVEN MIGRATIONS APPLIED ON PRODUCTION (schema verified); staging/restore was deliberately bypassed by explicit owner instruction.**

Project: `project-ai-music` / `weflfkftkdlrolctdmae`.
Before execution, the production migration registry ended at `20261114165142`.
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

## Production execution update — 2026-11-15

**All seven listed SQL migrations were applied to production** per the owner's explicit instruction to proceed without staging or a verified restore. The Supabase migration API returned success for each in the listed order; provider migration history registered their logical names under generated timestamps `20261115135846`, `20261115135848`, `20261115135850`, `20261115135854`, `20261115135856`, `20261115135858` and `20261115135900` respectively. These version numbers differ from the original filename prefixes because Supabase assigned versions during application.

Read-only post-apply checks confirmed: 32 tracks, 4 profiles, 1 artist, 37 audio assets and 0 playlists (unchanged from preflight); four new tables with RLS enabled, two new metadata columns, and six new functions. Verified `anon` and `authenticated` cannot directly SELECT discovery preferences; `anon` cannot SELECT audio fingerprints or execute artist tag approval; `authenticated` cannot execute the track-like RPC; `service_role` retains intended access. Supabase security advisor reports expected informational policy-less RLS tables; do not grant public table policies by default.

**Important:** This confirms schema application and basic data/security integrity, NOT a restorable database backup, real Cloudflare R2 streaming, cross-device session checks, or deployment of the feature branch to the production website. Those release checks remain outstanding. The pre-existing checklist above is retained as historical pre-rollout guidance, not a claim that SQL still needs applying.
