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
