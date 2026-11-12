# R2 direct-upload setup (production)

Oddio uses two **private** Cloudflare R2 buckets:

- `ai-music-originals`: source audio, including temporary `incoming/{userId}/{uuid}` uploads.
- `ai-music-streaming`: media-worker-generated playable renditions (not public).

Configure `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` as **server-only** deployment secrets. The R2 token must have Object Read/Write permissions limited to the required buckets. Never put credentials in `NEXT_PUBLIC_*` variables.

## Browser CORS

In the Cloudflare R2 dashboard, open **ai-music-originals → Settings → CORS Policy** and allow only the actual Oddio website origins (production and any trusted staging origin). Example:

```json
[
  {
    "AllowedOrigins": ["https://YOUR-ODDIO-DOMAIN"],
    "AllowedMethods": ["PUT", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 300
  }
]
```

Replace the placeholder with the real HTTPS origin. Do not use wildcard origins in production.

## Upload grant

An authenticated user with an approved artist application calls `POST /api/studio/uploads/authorize` with `filename`, `contentType`, and `bytes`. The server validates the declared type/size and returns a short-lived (300-second) SigV4 presigned PUT URL. Upload directly to that URL with the **exact** returned `Content-Type` header.

**Security warning:** the authorization endpoint only checks the *declared* size and MIME type. A presigned PUT does **not** enforce those declarations as trustworthy audio metadata, nor does it by itself reserve a daily quota. Do not publish or process a track based solely on the client's reported upload result. The finalize endpoint must verify the stored object's real size and metadata, validate the audio server-side, check ownership and quota, and create an unpublished review record. Until that flow exists, direct uploads are **not a complete production publishing path**.

Uploaded objects are private; configure a lifecycle policy for unused `incoming/` objects once finalize/reconciliation is implemented. Never make either bucket public.
