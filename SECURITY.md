# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| `main` (latest) | ✅ |
| All prior tags | ❌ (portfolio project — no backports) |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email: **owenquintenta@gmail.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Impact assessment (which tenants, which data, what operations)
- Any proof-of-concept code (responsible disclosure only)

You will receive an acknowledgement within **48 hours** and a resolution timeline within **7 days**.

## Security Architecture

### Tenant Isolation (RLS)

Every table in the Supabase schema has **Row-Level Security enabled by default**. The RLS posture is **deny by default** — no policy means no access.

All cross-tenant access is provably denied via pgTAP tests in `tests/rls/`. Three tenant scenarios are tested:
- Tenant A cannot read Tenant B's workflows
- Tenant A cannot read Tenant B's execution events
- Tenant A cannot insert into Tenant B's audit log
- Service role is the only principal that can write to `audit_events`

### Webhook Integrity

All inbound webhooks (n8n, Stripe) are verified before any processing:

1. **Signature verification** — HMAC-SHA256 (n8n) or Stripe-Signature header (Stripe)
2. **Replay protection** — 5-minute window enforced via `webhook_inbox.received_at` timestamp
3. **Idempotency** — duplicate event IDs silently ignored (upsert-or-skip pattern)
4. **Raw body preservation** — all webhook routes use `runtime: "nodejs"` to prevent body parsing before signature verification

### Audit Log Integrity

`audit_events` is append-only at the database level. A PostgreSQL trigger blocks `UPDATE` and `DELETE` operations on this table — no application code can override this. Log entries include:
- Actor (user ID + org ID)
- Action type (enum — no free-text injection)
- Target resource (table + row ID)
- Timestamp (DB-generated, not client-supplied)
- Previous state (JSON snapshot for mutations)

### Transport Security

- **TLS 1.2+** enforced on all connections
- **HSTS** header with `max-age=63072000; includeSubDomains; preload`
- **SameSite=Strict** on all auth cookies
- **Content-Security-Policy** — strict, no `unsafe-inline` or `unsafe-eval`

### Secrets Management

- No secrets are committed to this repository under any circumstances
- `.env.example` documents all required variables; no values
- `gitleaks` runs in CI on every push and pull request
- `STRIPE_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` files are in CODEOWNERS — any PR touching them requires explicit review

### Input Validation

Every server action and API route handler validates input with **Zod** before processing. No raw user input reaches the database layer. SQL injection is structurally prevented by Supabase's parameterized query API.

## Threat Model

Full STRIDE analysis: [`docs/threat-model.md`](docs/threat-model.md)

## Dependency Scanning

- **Dependabot** — weekly dependency updates with auto-merge for patch versions
- **`pnpm audit --audit-level=high`** — fails CI on HIGH or CRITICAL vulnerabilities
- **Snyk** — runs on pull requests (optional; enable via repository settings)

## CODEOWNERS

The following paths require explicit review from a security-aware reviewer:

```
supabase/migrations/        — RLS changes
src/middleware.ts           — session guard
src/app/api/webhooks/       — webhook receivers
src/lib/auth/               — auth utilities
src/lib/stripe/             — billing/payment
```

See [`CODEOWNERS`](CODEOWNERS) for the full list.
