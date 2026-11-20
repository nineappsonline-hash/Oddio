# First-run favorite genres (account onboarding)

The genre picker is an optional bilingual welcome **dialog**, no longer an inline section of Oddio Picks.

## Behaviour

- A visitor or existing account does not see the modal.
- A new account sees it after the first authenticated page load, including following email verification, even when landing away from Home.
- Up to three active genre IDs may be selected, or the step may be skipped. Skip saves an explicit empty completed preference.
- Account-scoped completion and selections are persisted in `favorite_genre_onboarding`; the modal does not reappear after reload, sign-out/sign-in or on another device.
- Choices can be updated or cleared later via `/ar/settings` or `/en/settings`, but the welcome dialog never comes back.
- Selected genres update local recommendations through an event and can be retrieved from the account on another device.
- No modal appears when the account API is unavailable; guests and demo seeds also remain unaffected.

## Migration order

Apply `supabase/migrations/20261121012500_favorite_genre_onboarding.sql` **before** releasing the code. The migration backfills **all existing profiles as completed** and revokes direct client-table access; only server-side service_role can read/write. Newly registered profiles have no completion row until the server persists their choice or skip.

## Verification

- CI database checks RLS, server-only grants, new-user uncompleted state, skip persistence and the maximum three genres.
- Browser smoke intercepts only the onboarding API to simulate a new user, selecting three genres, disabling a fourth, saving, and revisiting without a modal.
- `npm run typecheck`, unit tests, build, lint, format, and browser smoke must pass before merge.
