# .github/copilot-instructions.md

Purpose
-------
Concise, actionable guidance to make an AI coding agent immediately productive in this repository. Focus on repository-specific patterns and commands that are discoverable in the codebase.

Big picture (what this repo is and why)
------------------------------------
- Frontend: static site in `maisonpardailhe/` (plain HTML/CSS/vanilla JS). Admin UI in `maisonpardailhe/admin/`.
- Backend: Node + Express (CommonJS) in `server/`. MySQL via `mysql2/promise` (connection in `server/models/db.js`).
- Real‑time: SSE for admin notifications: `server/utils/eventEmitter.js` → `maisonpardailhe/admin/js/admin.js`.

Key files to read first
----------------------
- `server/server.js` — app bootstrap, sessions, CSRF, route mounting.
- `server/routes/commandes.js` — order validation and transactional stock updates (SELECT ... FOR UPDATE). Read before modifying order flows.
- `server/models/menu.js` — price_cents semantics and `menus.stock` behavior.
- `server/models/db.js` — DB pool setup used by scripts/tests.
- `server/data/schedules.js` — pickup locations and 15‑minute slot rules used by validation.

Developer workflows (explicit)
----------------------------
Always run these from `server/` (many scripts/tests assume cwd=server):

PowerShell example:

    cp .env.example .env    # fill DB_*, SESSION_SECRET, optional SMTP_*
    npm install
    npm run dev             # dev server (pino-pretty logging in dev)
    npm run migrate:latest  # apply knex migrations
    npm test                # Jest + supertest tests

Testing notes
-------------
- Tests live under `server/__tests__/`. Many tests bypass CSRF; follow existing test patterns to avoid csurf 403s.
- For DB tests, prefer a dedicated test DB or mocking `server/models/db.js`.

Repo-specific conventions (do NOT change lightly)
----------------------------------------------
- Prices: stored as integer cents in `menus.price_cents`. Convert to decimal only for presentation (divide by 100).
- Orders payloads:
  - Preferred: `items: [{menu_id, qty}]` — used by transactional stock flow.
  - Legacy: `produit` string (e.g. `"pate×2;jambon×1"`) — retained for backward compatibility.
- Dates & slots: `date_retrait` accepts `YYYY-MM-DD` or `DD/MM/YYYY`; must not be past or >30 days ahead. `creneau` must be 15‑minute aligned (see `server/data/schedules.js`).
- Booleans: DB tinyint(0|1) → JS boolean mapping in models.
- Module system: CommonJS. Keep user-facing text in French where present.

Integration and external points
------------------------------
- MySQL (`mysql2/promise`) — connection and pool in `server/models/db.js`.
- Sessions: `express-session` with a MySQL-backed store (see `server/server.js`). Changes affect admin UI behavior.
- Email: `server/utils/email.js` (SMTP used when `SMTP_HOST` present).
- SSE: `server/utils/eventEmitter.js` → `maisonpardailhe/admin/js/admin.js` (browser listens to SSE endpoint exposed by admin routes).

Files to avoid editing lightly
----------------------------
- `server/routes/commandes.js` — contains transactional stock logic and complex validation.
- `server/models/menu.js` — price & stock semantics relied on by multiple modules.
- `server/server.js` and `middleware/auth.js` — session, CSRF and SSE wiring.

Concrete example (use when testing or reproducing flows)
----------------------------------------------------
Preferred order payload (JSON):

    { "nom_complet":"Alice", "telephone":"0600000000", "date_retrait":"2025-11-10", "creneau":"12:30", "location":"roquettes", "items":[{"menu_id":2,"qty":1}] }

Where to add tests
------------------
- Add focused tests in `server/__tests__/` using existing Jest + supertest patterns. When changing commandes or stock behavior, cover transactional flows and edge cases (out-of-stock mid-transaction, invalid dates/slots).

If something is unclear
----------------------
- Say which area to expand (runbook for DB setup, focused transactional tests, or French translation) and I will add it.

Last updated: automated merge — preserved original points and added concise, repo-specific instructions.
