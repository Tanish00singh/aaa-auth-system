# VeriGate — an AAA (Authentication, Authorization, Accounting) demo

A small Node.js/Express portal demonstrating the three pillars of the **AAA security
model**: who you are, what you're allowed to do, and a provable record of what happened.
Dark, card-based dashboard UI (no framework/build step — plain CSS).

## Run it

```
npm install
npm start
```

Then open **http://localhost:3000**.

Seeded demo accounts:

| Role   | Username | Password    |
| ------ | -------- | ----------- |
| Admin  | root     | Root@98765  |
| Member | jordan   | Member@456  |

The SQLite file is created automatically on first run at `db/verigate.db`. Delete it
anytime to reset to the seed data.

## Deploying

This is a standard Node/Express app with no external services beyond a local SQLite
file, so it deploys anywhere that runs Node 18+ (Render, Railway, Fly.io, a VPS, etc.):

1. Push this folder to its own GitHub repo (or upload directly to your host).
2. Set the start command to `npm start` and build command to `npm install`.
3. Optionally set a `SESSION_SECRET` environment variable to something random —
   the app falls back to a dev default if it's not set.
4. The app listens on `process.env.PORT` if set, otherwise `3000`.

Note: `better-sqlite3` is a native module, so on first deploy the host needs to run
`npm install` (not just copy `node_modules`) so it can compile/download the right
binary for its platform.

## How the three pillars map to the code

### 1. Authentication — "who are you?"
- `routes/auth.js` hashes passwords with **bcrypt** (12 salt rounds) before they touch
  the database; login re-hashes and compares digests, plaintext is never stored.
- On successful login, `req.session.regenerate()` issues a **new session ID**,
  preventing session-fixation.
- `express-session` cookies are `httpOnly` and `sameSite: 'lax'`.
- `express-rate-limit` throttles login attempts per IP.

### 2. Authorization — "what are you allowed to do?"
- `middleware/auth.js` exports `requireAuth` and `requireRole(...roles)`.
- `routes/admin.js` protects every admin route with `requireRole('admin')`. A
  logged-in member hitting `/admin` gets an explicit **403**, distinct from an
  unauthenticated visitor getting redirected to `/login`.
- The dashboard query itself is scoped by role at the **data layer**, not just hidden
  in the UI.

### 3. Accounting — "what happened, and can we prove it?"
- `record()` in `middleware/auth.js` writes every security-relevant event to the
  `audit_log` table: timestamp, actor, action, success/failure, IP, detail.
- Logged events: register, login (success/failure), logout, denied auth, denied
  authorization, resource views, role changes.
- A separate in-memory `activeSessions` map (refreshed by `trackActivity`) powers the
  "who's online right now" panel — distinct from the permanent `audit_log` history and
  from the full `users` table of registered accounts.
- The admin console renders all three: **Currently logged in**, **Registered users &
  access levels**, and the **Accounting register** (audit trail), plus summary stats.

## Things to try
- Trigger 11 rapid failed logins and watch the rate limiter kick in.
- Log in as `jordan`, hit `/admin` directly, see the 403 and the resulting
  `AUTHORIZATION_DENIED` row in the ledger.
- Promote a member to admin from the console and see the `ROLE_CHANGE` audit entry.
- Extend it: email verification, 2FA, password reset, lockout after N failures,
  CSV export of the audit log.

## Stack
Node.js, Express, EJS, `better-sqlite3`, `bcryptjs`, `express-session`,
`express-rate-limit`.
