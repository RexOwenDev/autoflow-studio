# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| `main` (latest) | ✅ |
| All prior tags | ❌ — portfolio project, no backports |

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email: **owenquintenta@gmail.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Impact assessment (which tenants, which data, what operations)
- Any proof-of-concept code (responsible disclosure only)

Acknowledgement within 48 hours, resolution timeline within 7 days.

---

## Security architecture

### Tenant isolation (RLS)

Every table has `ENABLE` and `FORCE ROW LEVEL SECURITY`. Posture is **deny by default** — no policy means no access.

Policies use the `is_organization_member(uuid)` SECURITY DEFINER helper, which performs an `EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND organization_id = target_org)` check. This pattern was a Gemini Phase 0 audit HIGH constraint — it replaces the more common scalar `app_metadata.org_id` JWT claim, which would otherwise let up-to-1-hour-stale tokens retain access after a user was evicted from an org.

**pgTAP coverage** (`supabase/tests/rls/`):

- `cross-tenant-denial.test.sql` — 34 assertions across 3 tenants covering `organizations`, `organization_members`, `organization_invites`, `workflows`, `workflow_versions`, `executions`, `execution_events`, `webhook_inbox`, `billing_subscriptions`, `webhook_events`, `audit_events`. Cross-tenant reads return 0 rows; cross-tenant writes raise SQLSTATE 42501.
- `append-only-audit.test.sql` — 11 assertions proving `UPDATE`, `DELETE`, `TRUNCATE`, `INSERT ... ON CONFLICT DO UPDATE`, and `MERGE ... WHEN MATCHED THEN UPDATE/DELETE` all raise SQLSTATE 42501 with the audit-trigger's exact error message.

### Privilege escalation defenses (Codex adversarial fixes)

The Phase 2 Codex gate found four privilege paths that the initial schema permitted. All were fixed before Phase 2 closed:

- **Admin → owner self-promotion** (CRITICAL) — `organization_members` UPDATE policy split: admins manage non-owner rows only; owner transitions require the actor to already hold `owner`.
- **Last owner orphaning** (HIGH) — `BEFORE DELETE` and `BEFORE UPDATE` triggers reject the final owner's removal or demotion (SQLSTATE 23001).
- **Cross-tenant `workflow_versions`** (HIGH) — Composite FK `(workflow_id, organization_id) → workflows(id, organization_id)` rejects rows whose two tenant references disagree.
- **Audit diff leak to all members** (HIGH) — SELECT policy tightened to `has_organization_role(...,'admin')`. Phase 5+ redacted member-safe feed is tracked.

Full gate report: [`docs/phase-2-council-gate.md`](./docs/phase-2-council-gate.md).

### Webhook integrity

Both `/api/webhooks/n8n` and `/api/webhooks/stripe` follow the same pipeline:

1. **Size guard.** Content-Length and raw-body length both capped (5 MB n8n, 1 MB Stripe) before any parsing.
2. **Required headers.** Signature header and (n8n only) idempotency key must be present and well-formed.
3. **HMAC-SHA256 verification.** `timingSafeEqual` from Node `crypto`. Header format is `t=<unix_ts>,v1=<64 hex>` — identical to Stripe's own convention.
4. **Replay window.** Timestamp must be within ±300s of now; stale = reject.
5. **Shape validation.** JSON body must be a non-null, non-array object (Stripe also requires `id:string` + `type:string`).
6. **Idempotency dedup.** Live mode: UNIQUE on `(source, lower(idempotency_key))` (n8n) or `(provider, event_id)` (Stripe). Fixture synthesizes duplicates via well-known prefixes for tests.
7. **No oracle.** All auth failures return an identical `{received:false, error:"unauthorized"}` shape with status 401 — the response never reveals which control tripped (bad signature / stale timestamp / wrong secret).

Vitest coverage: `src/tests/webhooks/` — 41 assertions (n8n-signature: 12, n8n-route: 15, stripe-route: 14).

### Audit log integrity

`audit_events` is append-only at the trigger layer:

- `BEFORE UPDATE` trigger → raise `insufficient_privilege` (42501)
- `BEFORE DELETE` trigger → raise `insufficient_privilege` (42501)
- `BEFORE TRUNCATE` trigger → raise `insufficient_privilege` (42501) — Gemini HIGH addition; naive patterns only protect UPDATE + DELETE

Plus `REVOKE update, delete, truncate ON audit_events FROM public, authenticated, anon` as belt-and-braces against grant-table bypasses.

**Documented DBA-tier caveat.** A Postgres DBA with table ownership can still `ALTER TABLE audit_events DISABLE TRIGGER ALL` or `SET session_replication_role = replica`. True tamper-evident audit requires ownership lockdown (migrator role only) + WAL archiving + offline hash-chain verification — tracked for Phase 8+ ops doc.

**App-layer diff redaction.** `emitAuditEvent()` recursively redacts fields whose keys match `/token|password|secret|key|api.?key|authorization/i` before persisting, as defense in depth against callers that forget to strip sensitive data.

### Session handling

- Edge proxy (`src/proxy.ts`) matches session cookies against two patterns: `sb-<ref>-auth-token` (Supabase SSR) and the legacy `sb-access-token`. Any other `sb-*` cookie (e.g., locale) is rejected — no prefix abuse.
- No header-smuggling path: the proxy checks only `request.cookies`, never any other header value.
- Fixture mode auto-issues a session via `FixtureAuthAdapter`; the proxy passes through.
- `requireSession()` in server components redirects unauthenticated users to `/auth/sign-in?redirect=<path>`.

Vitest coverage: `src/tests/auth/bypass-attempt.test.ts` — 22 assertions covering protected-path redirects, cookie spec strictness, public-path allowance, fixture bypass.

### Plan + role gates

Features are gated at three layers:

1. **Database.** RLS policies grant access based on role (e.g., `has_organization_role(..., 'owner')` for billing subscriptions, SSO tables).
2. **Application.** `planAllowsFeature(plan, feature)` from `src/lib/billing/plans.ts` is the single source of truth. Server actions check both role and plan before any mutation.
3. **UI.** Upgrade prompts and disabled controls inform users but are never the security boundary.

### Transport + headers

From `next.config.ts`:

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy` — per-route; `'unsafe-inline'` currently permitted for Next.js RSC inline scripts (tighten in a follow-up with nonces)

### Secrets management

- No secrets in the repo under any circumstances.
- `.env.example` documents every required env var with empty values.
- `gitleaks protect --staged` runs in the pre-commit hook (install instruction in `CONTRIBUTING.md`); `gitleaks detect` runs in CI on every push.
- `npm audit --audit-level=moderate` fails CI on moderate+ advisories (tightened from the default `high` per Gemini Phase 0).
- Service-role Supabase client is **only** used by webhook handlers and background jobs. User-context reads use `createServerClient(cookies)` with the user's session JWT (Gemini Phase 0 CRITICAL constraint).

### Input validation

- Every server action starts with `requireSession()` + `z.object({...}).safeParse(formData)`.
- Every route handler validates headers, content-length, body shape before any business logic.
- Template config validation strips `__proto__`, `constructor`, `prototype` keys and rejects unknown fields (`src/lib/templates/validator.ts` + 30 fuzz assertions in `src/tests/templates/schema-fuzz.test.ts`).
- CSV exports prefix cells starting with `= + - @ TAB CR` with a single quote to defuse Excel/Sheets formula injection (OWASP CSV Injection guidance).

---

## CODEOWNERS

The following paths require explicit review from a security-aware reviewer:

```
supabase/migrations/              RLS changes
src/proxy.ts                      Edge session guard
src/app/api/webhooks/             Webhook receivers
src/app/api/audit/export/         Audit export (CSV/JSON)
src/app/api/sso/                  SCIM token actions
src/lib/auth/                     Auth utilities
src/lib/audit/                    Audit emitter + serializer
src/lib/billing/                  Plan definitions
src/lib/stripe/                   Stripe adapter + signature
src/lib/sso/                      WorkOS adapter
.github/workflows/                CI + security workflows
```

See [`CODEOWNERS`](CODEOWNERS) for the canonical list.

---

## Threat model

Full STRIDE analysis lives in [`docs/threat-model.md`](./docs/threat-model.md).

---

## Planned reviews

A second independent review of the database policies, the webhook handling and the whole repository is planned before the live adapters are wired. The Phase 2 review report in `docs/phase-2-council-gate.md` lists the 11 findings already fixed.
