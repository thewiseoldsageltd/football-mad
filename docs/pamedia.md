# PA Media ingestion

Job that pulls items from the PA Media Content API, upserts articles (`source='pa_media'`, `source_id` = PA item id), and uploads hero images to R2. The HTTP handler returns immediately; entity enrichment (pills) runs asynchronously in the background.

## Ingest + entity enrichment

1. **POST /api/jobs/ingest-pamedia** runs `runPaMediaIngest()`: fetches latest PA items, upserts into `articles`, uploads hero to R2. Each inserted or updated article is set to `entity_enrich_status = 'pending'`.
2. The route responds immediately with `{ ok, processed }` (no blocking).
3. **Async:** `enrichPendingArticles({ limit: 25, timeBudgetMs: 10000 })` is triggered with `setImmediate`. It processes up to 25 pending articles (newest first), matches mentions for teams, players, managers, competitions (deterministic whole-word matching from DB alias maps), and writes to `article_teams`, `article_players`, `article_managers`, `article_competitions`. Each article is marked `processing` then `done` or `error`. Enrichment is idempotent and resumable; a 10s time budget keeps the batch small.

**Env vars for enrichment:** none required; it uses the same DB and entity tables. No Ghost or Goalserve involvement.

## Environment variables

Set these in Render (or locally for testing). The job reads:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PAMEDIA_API_KEY` | Yes | — | API key for PA Media Content API |
| `PAMEDIA_API_BASE_URL` | No | `https://content.api.pressassociation.io/v1` | Base URL for the API |
| `PAMEDIA_ITEMS_PATH` | No | `/item` | Path appended to base for items listing (override without code changes) |
| `PAMEDIA_INGEST_SECRET` | Yes | — | Secret for `POST /api/jobs/ingest-pamedia` (same as used by `requireJobSecret`) |
| `PAMEDIA_INGEST_ENABLE_IMAGE_PROCESSING` | No | `false` | Set to `true` or `1` to download images, convert to WebP, upload to R2 and rewrite HTML |
| `R2_ACCOUNT_ID` | If using R2 | — | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | If using R2 | — | R2 access key |
| `R2_SECRET_ACCESS_KEY` | If using R2 | — | R2 secret key |
| `R2_BUCKET` | If using R2 | — | R2 bucket name |
| `R2_PUBLIC_BASE_URL` | No | `https://img.footballmad.co.uk` | Public base for image URLs |
| `R2_ENDPOINT` | No | `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` | S3-compatible endpoint override |
| `APP_ENV` | No | `staging` | `staging` or `production`; used as R2 key prefix |

## Triggering the job

The endpoint is protected by `requireJobSecret("PAMEDIA_INGEST_SECRET")`. Provide the secret via either:

- **Header:** `x-sync-secret: <PAMEDIA_INGEST_SECRET>`
- **Header:** `Authorization: Bearer <PAMEDIA_INGEST_SECRET>`

### Local (curl)

```bash
curl -X POST http://localhost:5055/api/jobs/ingest-pamedia \
  -H "Content-Type: application/json" \
  -H "x-sync-secret: YOUR_PAMEDIA_INGEST_SECRET"
```

### Render Cron

1. Create a Cron Job (or use a scheduled service) that runs on the desired schedule (e.g. every 15 minutes).
2. Configure the job to send an HTTP request:

   - **Method:** POST  
   - **URL:** `https://<your-service>.onrender.com/api/jobs/ingest-pamedia`  
   - **Headers:**  
     - `Content-Type: application/json`  
     - `x-sync-secret: <PAMEDIA_INGEST_SECRET>` (use Render secret env var)  
3. Ensure `PAMEDIA_INGEST_SECRET` (and other required env vars) are set in the service’s environment.

## Response

- **200** – Ingest ran. Body: `{ ok: true, processed: number }`.
- **401** – Missing or invalid secret.
- **500** – Configuration or fetch error. Body: `{ ok: false, processed: number, error: string }`.

Entity enrichment runs in the background after the response is sent; it does not affect the HTTP status or body.
