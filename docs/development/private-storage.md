# Private storage for local development

User, Document, Communication and Calendar use the existing configured S3 bucket/region and application IAM credentials. AI fetches files through authorized Document/Communication APIs. Keep AWS_S3_BUCKET_NAME, AWS_REGION, AWS_ACCESS_KEY and AWS_SECRET_KEY in the owning backend env, never the frontend. NEXT_PUBLIC_ASSET_HOST is a hostname, not a credential. Local private storage does not depend on a public CloudFront fallback.

## Bucket configuration

- Enable all four Block Public Access settings and Bucket owner enforced ownership; disable ACLs.
- Use SSE-S3 encryption. SSE-KMS requires additional KMS permissions.
- Allow the actual frontend origin in CORS for PUT/GET/HEAD and the signed upload headers. Expose ETag, Content-Length, Content-Range and Accept-Ranges.
- Limit application IAM permissions to the configured bucket: read/write/delete under avatars, documents, chat-media and recordings; read under pomodoro-audio. Multipart recordings need list/abort-part permissions. Copy requires source read and destination write. Runtime credentials do not need bucket/IAM administration.

## Avatars

~~~text
avatars/staging/{userId}/{uploadId}.ext
avatars/users/{userId}/{fileId}.ext
~~~

Presigned PUT uploads first enter staging. Confirmation verifies bytes, MIME and limits before copying to the final key; only confirmed avatars can be attached to a profile. Cleanup distinguishes staging from active profile images.

New avatar references use /api/users/avatars/{userId}/{fileId}.ext. An authenticated session resolves the current avatar or the owner's confirmed preview to a short-lived S3 read URL (120 seconds). The client stores the stable reference, not the signed URL, in profiles/JWT snapshots. Existing Google avatars remain Google-managed. Channel avatar upload is not part of this flow.

## Chat, audio and recordings

- Chat media resolves through /api/medias/access-url?key=... after checking a non-deleted/non-recalled message and channel, direct-message or meeting access. Read URLs last 120 seconds. Dependency failures do not bypass checks.
- Pomodoro includes five bundled CC BY 4.0 tracks in frontend/web/public/assets/sounds. Matching database tracks take precedence; a disabled record does not fall back to its bundled counterpart. The adjacent credits.txt and Music credits UI contain attribution.
- Additional database audio uses an authenticated audio-ID reference. Only active records under pomodoro-audio receive signed URLs, with a one-hour lifetime. Switching buckets does not copy audio or create its metadata.
- Recording URLs retain their existing permission checks. Communication supplies recording storage credentials to Egress. Document browser downloads remain authorized backend streams; internal AI access uses the existing short-lived delivery contract.

Signed URLs are bearer capabilities until expiry. Logout/revocation prevents new issuance but cannot recall downloaded bytes or guarantee immediate invalidation of an already issued S3 URL. Partition client caches by account, refresh URLs when needed and do not put private signed URLs through the Next image optimizer.

## Changing storage

Before changing credentials/buckets, stop affected processes yourself and back up configuration. Restart the relevant applications after the deliberate change. Old public URLs must not bypass private access. This refactor does not copy objects, delete buckets or modify IAM/CDN policy. Production storage rollout must be reviewed separately; source configuration does not establish the state of a deployed bucket.
