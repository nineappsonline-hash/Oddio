# Oddio Phase 4 — consented music intelligence dataset and release gate

**Status:** training/evaluation pipeline implemented; **no authorized real-audio dataset has been provided** and **no real-audio genre/mood model has been deployed**. Never claim a tested model from synthetic signals.

## What is required from artists

Ask artists to opt in explicitly to **local music-feature model training**, separately from agreeing to stream or publish music. Keep the permission records privately with an identifier; preserve the permission text and date, artist/recording ownership evidence, whether the person is the original rights holder or has a license expressly permitting model training, and withdrawal/contact process. A public upload does **not** imply consent to train. The platform supports only AI music, but the rights of collaborators, samples, vocals, producers, labels and other owners must still be verified.

For each song, a reviewer records the exact **genre** and up to five **mood** slugs that exist in Oddio's catalog. Avoid guessing broad labels (e.g. treating all Arabic or high-BPM audio as Mahraganat). Record ambiguous/multigenre cases for review; never force a single-label assignment without the artist's agreement. Keep raw audio and the private dataset outside the Git repository and outside the public website.

## Required input manifest (private JSON)

Each entry must have the following fields:

```json
{
  "id": "recording-identifier",
  "artistId": "artist-identifier",
  "filePath": "/private/approved-track.wav",
  "genreSlug": "ambient",
  "moodSlugs": ["calm"],
  "consent": true,
  "artistReviewed": true,
  "rightsBasis": "original_creator",
  "consentScope": "local_audio_feature_training",
  "consentRef": "private-signed-consent-001",
  "consentedAt": "2026-11-01T12:00:00.000Z"
}
```

**The example is documentation, not proof of actual permission.** `rightsBasis` must be `original_creator` or `licensed_for_training`. A reviewer must check the corresponding record before marking true. Consent identifiers are only references to private evidence. A withdrawn permission means excluding that material and rebuilding both the fingerprint index and model under a defined retention process.

## Prepare and evaluate locally — no paid model or upload

Prepare **two different** artist-separated manifests and write to separate non-public paths:

```bash
node scripts/prepare-music-dataset.mjs /private/train-manifest.json --output /private/train.json
node scripts/prepare-music-dataset.mjs /private/holdout-manifest.json --output /private/holdout.json
node scripts/train-music-classifier.mjs /private/train.json --holdout /private/holdout.json --output /private/oddio-reviewed-model.json
```

Preparing a dataset uses local FFmpeg (the existing worker dependency) for the first 90 seconds of each track and writes only the permitted metadata and bounded spectral fingerprints — never the audio path or raw audio. Training additionally checks that **training and held-out sets have no artists, recordings or matching fingerprints in common**. Each genre needs at least four independent contributing artists in the training set, and the held-out set separately needs four new artists and four samples per tested genre.

The model is **not written at all** unless the independent holdout passes: coverage ≥65%, macro genre recall ≥70%, genre precision ≥80%, mood precision ≥70%, mood recall ≥60%, and per-genre recall ≥50%. Abstentions are counted as misses in recall, not silently dropped. The current similarity classifier is an experimental small-data baseline; these thresholds **do not establish general accuracy** without a diverse, representative ground truth (including separate Arabic subgenres). The whole heldout report, consent provenance, failure cases and reviewer sign-off must be documented before enabling the worker.

Only after a human review of the verified data and safe database migration/worker deployment in **isolated staging**, set `ODDIO_CLASSIFIER_MODEL_PATH` to the private model file. If absent, invalid or not independently validated, the worker makes **no Genre/Mood suggestions**. No automatic changes to artist-selected tags.

## Release checklist

- [ ] Confirm actual consent and rights for each song and document withdrawal/data retention; do not import user music without permission.
- [ ] Collect balanced **real** AI music for each intended Genre and Mood; keep artist-disjoint blind holdout.
- [ ] Verify labels, metrics, abstention, per-genre errors and common confusion cases (Arabic genres must be represented explicitly).
- [ ] Test true R2 upload, FFmpeg job processing, signed URLs and audio seeking in **non-production**.
- [ ] Apply pending migrations to staging in chronological order after a restorable backup; verify service-only fingerprint/suggestion access, owned Studio review and aggregate privacy.
- [ ] Obtain explicit approval for any production rollout or model training on artist uploads.

No production data, R2 objects, or user music should be copied into test/training without appropriate authorization.
