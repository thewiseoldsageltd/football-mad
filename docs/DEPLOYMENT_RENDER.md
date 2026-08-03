# Render.com deployment (Football Mad)

This document describes a **safe branch → service** workflow so **staging deploys do not update production**.

GitHub remains the source of truth. Application code does not encode Render service IDs; behaviour is controlled in the Render dashboard and environment variables.

## Recommended setup

| Environment | Git branch | Render service | Auto-deploy |
|-------------|------------|----------------|-------------|
| Staging | `staging` (or `develop`) | Dedicated web service (e.g. `football-mad-staging`) | **On commit** to staging branch |
| Production | `main` | Dedicated web service (e.g. `football-mad`) | **Manual deploy** only, *or* auto-deploy from `main` only |

**Critical:** Each environment must be a **separate Render Web Service**, each with its own:

- Branch mapping (Dashboard → Service → Settings → Build & Deploy → Branch)
- Environment variables (including `DATABASE_URL`, secrets, `DEPLOYMENT_ENV`, etc.)
- Public URL (staging vs production hostname)

## Why production sometimes tracked staging before

If **two services pointed at the same branch**, or **production’s branch was set to `staging`**, pushes to staging would redeploy both. Fix by verifying **each service’s connected branch** in the Render UI.

## Branch strategy

1. **`main`** — release-ready code; production service tracks this branch (manual or guarded auto-deploy).
2. **`staging`** — integration / QA; staging service tracks only this branch.
3. Feature branches merge into `staging` first, then `main` when ready to release.

## Manual-only production (strictest)

In Render → Production service → **Settings → Build & Deploy**:

- Set branch to `main`
- Disable automatic deploys, **or** restrict to `main` and use GitHub branch protection so only maintainers merge to `main`

Trigger production deploys with **Manual Deploy** after QA on staging.

## Environment variables to preserve

Copy existing vars from the current staging and production services to the new services as needed. Do not commit secrets.

SEO-related vars used by this codebase:

| Variable | Purpose |
|----------|---------|
| `DEPLOYMENT_ENV=staging` | Staging service: blocked from search indexing |
| `DEPLOYMENT_ENV=production` | Production service: indexable |
| `SEO_INDEXING=allow` | Optional override: force allow indexing |
| `SEO_INDEXING=block` | Optional override: force block indexing |

If unsure, set **`DEPLOYMENT_ENV`** explicitly on each Render service.

## Checklist (dashboard)

- [ ] Staging service branch = `staging` (not `main`)
- [ ] Production service branch = `main` (not `staging`)
- [ ] Two distinct URLs (staging vs prod)
- [ ] `DEPLOYMENT_ENV` set per service
- [ ] Production deploy not triggered by staging branch pushes

No repository change replaces these checks; they are **Render configuration**.

## Player membership reconciliation

Operational command for auditing / closing stale multi-open `player_team_memberships` using live Goalserve evidence (squad feeds + `soccerstats/player` `teamid`). Dry-run is the default. Writes require explicit confirmation and only apply `SAFE_*` classifications.

```bash
# Audit only (default)
npm run reconcile:player-memberships

# Explicit dry-run
npm run reconcile:player-memberships -- --dry-run

# Apply only SAFE_* closes (after reviewing dry-run output)
npm run reconcile:player-memberships -- --write --confirm-safe-repairs
```

Requires `DATABASE_URL` and `GOALSERVE_FEED_KEY`. Memberships are closed via `end_date` (never deleted). Conflict and insufficient-evidence players are left untouched.

After a write, re-run dry-run and confirm `safeWritableCloses` is ~0 (idempotent).

### Production rollout checklist (membership integrity)

1. Deploy migration-compatible app code (nullable `player_team_memberships.last_seen_at`).
2. Apply migration `0018_player_memberships_last_seen_at` through the normal migrate process for that environment.
3. Run squad ingest so `last_seen_at` begins populating and absentee closes use the ≥18 completeness guard.
4. `npm run reconcile:player-memberships -- --dry-run` — review classification counts, conflicts, and insufficient cases.
5. Only if SAFE_* set is acceptable: `npm run reconcile:player-memberships -- --write --confirm-safe-repairs`.
6. Re-run dry-run to confirm idempotency; spot-check Player Hub for a known multi-membership case.
