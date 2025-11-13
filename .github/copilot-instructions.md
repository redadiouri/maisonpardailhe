## Purpose

Concise, actionable guidance to make an AI coding agent immediately productive in this repo.

## Big picture (what this repo is and why)

- Frontend: static site in `maisonpardailhe/` (vanilla HTML/CSS/JS). Admin UI is a small SPA under `maisonpardailhe/admin/`.
- Backend: Node + Express (CommonJS) in `server/`. MySQL 8+ via `mysql2/promise` (pool in `server/models/db.js`).
- Real-time: SSE pushes from `server/utils/eventEmitter.js` to the admin SPA; a 10s heartbeat avoids Cloudflare 100s timeouts (see `/api/admin/commandes/stream`).
- Payments: Optional Stripe integration (loaded conditionally if `STRIPE_SECRET_KEY` is set). Webhook validation required for production.

## Key files to read first

- `server/server.js` — bootstrap, Helmet CSP (dynamic nonces), session (MySQL store), CSRF and route mounting.
- `server/routes/commandes.js` — CRITICAL: complex order validation and transactional stock updates (uses `SELECT ... FOR UPDATE`).
- `server/models/menu.js` — prices as integer cents, slug generation, stock semantics.
- `server/models/db.js` — DB pool; tests/scripts import this.
- `server/data/schedules.js` — pickup locations and 15‑minute slot rules.

## Developer workflows (explicit)

Always run commands from the `server/` directory (many scripts/tests assume cwd=server).

PowerShell quick start (Windows):

    cd server
    copy .env.example .env
    # Edit .env with your DB credentials and secrets
    npm install
    npm run migrate:latest
    npm run dev
    npm test -- --runInBand

Bash quick start (Linux/Mac):

    cd server
    cp .env.example .env
    # Edit .env with your DB credentials and secrets
    npm install
    npm run migrate:latest
    npm run dev
    npm test -- --runInBand

Environment setup: Copy `server/.env.example` → `server/.env`. Required: `DB_*`, `SESSION_SECRET`. Optional: `STRIPE_*` (for payments), `SMTP_*` (for emails), `EMAIL_SECRET` (for unsubscribe tokens).

Helpful npm scripts: `migrate:latest`, `migrate:rollback`, `db:backup`, `db:backup:docker`, `images:optimize`, `css:minify`, `build`, `benchmark:all` (see `package.json`).

## Repo-specific conventions (do NOT change lightly)

- Prices: stored as integer cents in `menus.price_cents` — divide by 100 for presentation.
- Orders: preferred payload `items: [{menu_id, qty}]`. Legacy `produit` string format still supported.
- Dates & slots: `date_retrait` accepts `YYYY-MM-DD` or `DD/MM/YYYY`; not in the past or >30 days ahead. `creneau` must be 15‑minute aligned (see `server/data/schedules.js`).
- Module system: CommonJS. Keep user-facing text in French where present.

## Integration points & gotchas

- Email: `server/utils/email.js` (Nodemailer). Unsubscribe tokens signed with HMAC-SHA256 using `EMAIL_SECRET` or `SESSION_SECRET`.
- Sessions: `express-session` + `express-mysql-session`; prod cookie domain configured in `server/server.js` (cross-subdomain behavior matters for admin).
- SSE: `server/utils/eventEmitter.js` → admin SPA (`maisonpardailhe/admin/js/admin.js`). In production use a DNS-only subdomain `sse.xn--maisonpardailh-okb.fr` to bypass Cloudflare.
- Stripe: conditionally loaded in `routes/payment.js`; webhooks validated against `STRIPE_WEBHOOK_SECRET`.

## Files to avoid editing lightly

- `server/routes/commandes.js` (transactional stock + validation)
- `server/models/menu.js` (price/stock/slug logic)
- `server/server.js` (CSP nonces, session/CSRF, CORS)

## Tests & where to add them

- Tests live in `server/__tests__/`. Follow existing Jest + supertest patterns. Mock CSRF by setting `req.session._csrf` (see `security.test.js`).
- For DB tests use a separate test DB (`DB_NAME=maisonpardailhe_test`) or mock `server/models/db.js`.
- Run tests with `npm test -- --runInBand` (sequential execution required for DB tests).
- Test files: `*.test.js` (Jest auto-discovers). Key examples: `commandes.transaction.test.js` (transactional stock), `schedules.test.js` (pickup slot validation), `security.test.js` (CSRF + sanitization).

## Deployment notes

- Dockerfile in `server/`; use `deploy/build-and-push.ps1` to build/push the image. `deploy/docker-compose.yml` runs Node + MySQL (+ optional Nginx).
- Ensure `PROD_ALLOWED_ORIGINS`, `APP_URL`, `APP_HOST`, `EMAIL_SECRET` and SSE subdomain are set in production env.

---
Last updated: 2025-11-12
