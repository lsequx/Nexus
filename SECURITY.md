# Security

NEXUS is a local development and demonstration application. Docker uses a privately generated database password and a non-superuser application role. The administrative database role accepts only local Unix-socket peer access from OS root/postgres. Existing data volumes are migrated without deleting records. Application code and root boot scripts are not writable by application users.

The Docker configuration publishes only `127.0.0.1:3000`; the database and backend listen on container loopback. Do not publish the internal database/backend ports or expose the development server publicly.

## Access controls

- Browser API calls use an authenticated Next.js `/backend` route, not an open rewrite. Anonymous clients can read only the minimal health response. Viewer accounts cannot submit events, change incidents, or write notes; inventory edits require an administrator.
- FastAPI data, mutation, documentation, and OpenAPI routes require a private server-to-server key. That key is attached only by the server proxy and never returned to browsers.
- Session-signing and backend keys are random per installation and persisted in the private app-data directory. There is no shared default signing key. Environment overrides must be private random values of at least 32 characters.
- Logout, password changes, and role promotion revoke previous sessions. Existing users must sign in again after upgrading to the secured session format.
- Production self-registration is disabled unless explicitly enabled. The loopback-only Compose demo enables operator registration; no HTTP signup, including the first one, creates an administrator.
- Password recovery over HTTP is disabled because verified email delivery is not implemented. Reset codes are never returned to a client. Only the project owner can create/promote administrators or reset passwords through the local maintenance command.
- JSON mutation requests have bounded body sizes and origin checks. Login attempts, registration, and API writes are throttled. Limits are in process memory and assume this application's single-instance deployment; a distributed/public deployment needs shared throttling or a gateway.

## Owner account commands

Run these in your own interactive terminal. Password prompts do not echo and passwords must never be placed in command arguments, logs, tickets, or chat.

```sh
# Create an administrator directly (prompts for name, email, and password)
docker compose exec --user nexus nexus /opt/venv/bin/python /app/docker/manage-user.py create-admin

# Promote an existing operator; sign in again afterward
docker compose exec --user nexus nexus /opt/venv/bin/python /app/docker/manage-user.py promote-admin your-email@example.com

# Reset an existing account password; old sessions are revoked
docker compose exec --user nexus nexus /opt/venv/bin/python /app/docker/manage-user.py reset-password your-email@example.com
```

For local non-Docker development, use `python docker/manage-user.py <command>` from the repository root with the same `NEXUS_DATA_DIR` used by the frontend. New passwords require 12–128 characters. Existing accounts and administrator roles are retained; review them if an older version was previously exposed. Account files and key files must remain private and outside Git/build contexts.

## Before any external deployment

Use HTTPS and secure cookies, disable open self-registration unless deliberately needed, and set `NEXUS_APP_ORIGIN` to the exact external origin (for example `https://nexus.example.com`) when using a reverse proxy. Remove the Compose local-HTTP cookie override. Establish administrator access through the owner command, not a visitor signup. This file-based account/inventory store is intended for one trusted application instance; production multi-user hosting needs a separate deployment/security review.

## Dependency review

The security update uses patched Next.js 16.3.8 and refreshed compatible dependencies. Runtime npm dependencies and the Python backend requirements passed their vulnerability audits at the time of review.

A development-only upstream `braces` advisory ([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)) remains in the ESLint toolchain through `fast-glob`/`micromatch`. No patched `braces` release was available in the registry during the review. Five npm dependency entries report this single root advisory. Public application requests do not supply glob patterns to these tooling packages. Keep lint/build inputs trusted; do not expose development tooling as a public service. Recheck the advisory when updating dependencies rather than suppressing integrity checks or removing lint rules.

To reproduce the dependency checks:

```sh
cd frontend
npm audit --omit=dev
npm audit
# From the repository root in a separate audit environment:
pip-audit -r backend/requirements.txt
```

## Repository hygiene and reporting

Secrets, `.env` files, account stores, signing keys, live inventories, and generated output are excluded from Git and Docker build contexts. Reference IP addresses are documentation/private-network demo addresses, not connection credentials. A credential-pattern scan of reachable Git history found no matching live credentials during this review; that does not prove a previously deployed instance was never accessed.

GitHub account settings, Actions secrets, access tokens, branch protections, and secret-scanning settings are outside the checked-out code. GitHub API access was unavailable during this review, so those settings were not verified or changed. Enable Dependabot alerts and secret scanning/push protection in repository settings where available.

Do not post credentials or working exploit details in a public issue. If a live credential is ever exposed, rotate/revoke it with its provider; deleting it from the latest commit is insufficient. For code vulnerabilities, use GitHub private vulnerability reporting when the repository owner has enabled it, or contact the owner privately.
