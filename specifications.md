I'm working from memory on Kora's API. Verify endpoint names, webhook events, settlement report availability, and supported corridors against their current docs before committing to any of this. Licensing and KYC also need a real answer from Kora and a Nigerian fintech lawyer, not from me.

---

## 1. Production principles

1. **Money is integers in minor units**, always paired with a currency code. No floats anywhere, including JSON (send as strings or integers).
2. **Double-entry, immutable ledger.** Every money event is a balanced journal entry. Corrections are reversal entries, never updates or deletes.
3. **Never trust a callback.** Webhooks are verified by signature, then confirmed by re-querying Kora before the ledger moves.
4. **No dual writes.** Anything that changes our DB and calls Kora goes through a transactional outbox.
5. **Maker-checker on every outbound money action.**
6. **Tenant isolation enforced by the database** (Postgres RLS), not just by application `where` clauses.
7. **Org type is configuration, not code.** Business logic never branches on school, hospital, or company.
8. **Everything is auditable.** Every state change and every access to sensitive data leaves a trail.

---

## 2. System architecture

Still a **modular monolith**, but deployed as three processes from one codebase: API, worker, and scheduler. This isolates slow or failing money jobs from user-facing traffic without the overhead of microservices.

```
                    ┌───────────────────────────────┐
   Browser ────────▶│ CDN / WAF (rate limit, bot    │
                    │ protection, TLS)              │
                    └──────────────┬────────────────┘
                                   │
          ┌────────────────────────▼───────────────────────┐
          │ React.js Web (dashboard + public bill pay page)│
          └────────────────────────┬───────────────────────┘
                                   │ REST + session/JWT
 ┌─────────────────────────────────▼──────────────────────────────┐
 │                       API process (NestJS)                     │
 │  Auth/MFA · RBAC · Org scope · Idempotency · Validation        │
 │  Modules: payroll, billing, cross-border, approvals, reporting,│
 │  assistant, payees, payers, compliance                         │
 │  Webhook ingress (verify → persist raw → enqueue → 200)        │
 └──────┬──────────────────────┬──────────────────────────┬───────┘
        │                      │                          │
 ┌──────▼──────┐        ┌──────▼───────┐           ┌──────▼───────┐
 │ PostgreSQL  │◀───────│ Worker       │──────────▶│ Redis        │
 │ (RLS, PITR  │        │ process      │           │ (BullMQ)     │
 │  backups)   │        │ - outbox     │           └──────────────┘
 │ ledger +    │        │   dispatcher │
 │ domain data │        │ - webhook    │           ┌──────────────┐
 └─────────────┘        │   processor  │──────────▶│ Kora API     │
        ▲               │ - payout     │           └──────────────┘
        │               │   poller     │
 ┌──────┴──────┐        └──────────────┘           ┌──────────────┐
 │ Scheduler   │ overdue marking, stuck-payout     │ KMS / Secrets│
 │ process     │ sweeps, daily reconciliation,     │ Manager      │
 └─────────────┘ statement generation              └──────────────┘
                                                   ┌──────────────┐
 Observability: OpenTelemetry → logs, metrics,     │ LLM provider │
 traces, alerting (Sentry/Grafana/PagerDuty)       │ (read tools) │
                                                   └──────────────┘
```

### Key design decisions

**Tenant isolation.** Every tenant table carries `organization_id`. Postgres RLS policies read `current_setting('app.org_id')`, which a request-scoped transaction sets after auth. The app's DB role cannot bypass RLS. Cross-tenant admin access (support staff) uses a separate, audited role.

**Outbox pattern.** Approving a payroll run writes the ledger reservation and the outbox rows in one DB transaction. The worker reads the outbox, calls Kora using a **deterministic reference** (`payout-<payoutId>`), and marks the row sent. If the worker crashes mid-call, the retry reuses the same reference, so Kora de-duplicates it.

**Webhook pipeline.**
1. API verifies the HMAC signature on the raw body.
2. Stores a `WebhookEvent` row (unique on provider and event ID).
3. Enqueues a job and returns 200 immediately.
4. The worker re-fetches the transaction from Kora, validates amount and currency against our records, then applies the state change and ledger entry in one DB transaction.
5. Failures retry with backoff, then go to a dead-letter queue that alerts someone.

**Reconciliation.** A daily job compares our ledger and payout and charge records to Kora's settlement data (report or API list endpoints, depending on what exists). Mismatches create `ReconciliationBreak` records for an operator to resolve. This is your safety net for everything else.

**Gateway port.** `PaymentGateway` stays as an interface with `KoraGateway`, `MockGateway`, and a `FaultInjectingGateway` for chaos testing (timeouts, duplicate webhooks, out-of-order events).

**AI assistant.** Read-only, fixed tools over a reporting read model, scoped by the user's permissions, with full logging. Details in section 6.

**Infrastructure.** Containers on a managed platform (ECS/Fargate, Cloud Run, or Kubernetes if you already have the skills). Managed Postgres with point-in-time recovery, managed Redis, IaC via Terraform, and separate dev, staging, and prod environments. Staging uses Kora's sandbox. Prod uses live keys that exist only in the secrets manager.

---

## 3. Domain model (OOAD)

### Identity and access
```
Organization   (id, name, type, baseCurrency, country, status, kybStatus)
OrgProfile     (orgType → terminology, bill templates, dashboard labels)  // config
User           (id, email, passwordHash, mfaSecret, status)
Membership     (userId, orgId, role)
Role           OWNER | ADMIN | FINANCE_MAKER | FINANCE_APPROVER | VIEWER | AUDITOR
ApprovalPolicy (orgId, actionType, thresholdMinor, requiredApprovals, allowSelfApproval=false)
ApprovalRequest(id, orgId, actionType, subjectId, requestedBy, status, decidedBy, decidedAt)
AuditLog       (id, orgId, actorId, action, subjectType, subjectId, before, after, ip, at)  // append-only
```

### Parties
```
Payee          (id, orgId, name, kind: EMPLOYEE|VENDOR|CONTRACTOR, country, status)
BankAccount    (id, payeeId, bankCode, accountNumberEncrypted, accountNameResolved,
                currency, verifiedAt)
Employee extends Payee (grossSalaryMinor, payFrequency, department, taxProfile, startDate)
Payer          (id, orgId, name, email, phone, externalRef)  // student/patient/customer
```

### Billing
```
Bill        (id, orgId, payerId, reference, currency, totalMinor, paidMinor,
             dueDate, status, version)
BillItem    (billId, label, amountMinor)
Payment     (id, billId, providerReference, amountMinor, currency, status, channel, paidAt)
Refund      (id, paymentId, amountMinor, reason, status, providerReference, approvedBy)
```

### Payroll
```
PayComponent (orgId, code, kind: EARNING|DEDUCTION|EMPLOYER_CONTRIBUTION, calcRule)
PayrollRun   (id, orgId, period, status, grossMinor, deductionsMinor, netMinor,
              createdBy, approvedBy, version)
PayrollItem  (id, runId, employeeId, grossMinor, netMinor, lines[], payoutId, status)
Payslip      (id, itemId, documentRef, generatedAt)
Payout       (id, orgId, payeeId, bankAccountId, amountMinor, currency,
              providerReference, status, failureReason, attempts)
```

### Cross-border
```
FxQuote             (id, orgId, sourceCcy, targetCcy, rate, sourceMinor, targetMinor,
                     expiresAt, providerQuoteRef)
CrossBorderTransfer (id, orgId, payeeId, quoteId, status, conversionRef, payoutId,
                     purposeCode, failureStage)
```

### Ledger (the core)
```
LedgerAccount (id, orgId, code, name, type: ASSET|LIABILITY|INCOME|EXPENSE, currency)
JournalEntry  (id, orgId, postedAt, description, sourceType, sourceId, idempotencyKey,
               reversalOf?)
LedgerLine    (id, entryId, accountId, direction: DEBIT|CREDIT, amountMinor)
```
Invariants:
- Sum of debits equals sum of credits per entry (enforced by a DB constraint trigger).
- `UPDATE` and `DELETE` on both ledger tables are revoked.
- Balances are derived (or cached in a materialized table that is rebuildable from lines).

Example chart of accounts per org: `KORA_WALLET` (asset), `RECEIVABLES` (asset), `KORA_CLEARING` (asset, funds collected but not yet settled), `PAYOUTS_IN_FLIGHT` (liability), `PAYROLL_EXPENSE`, `STATUTORY_PAYABLE` (liability), `FEES_EXPENSE`, `FX_GAIN_LOSS`, `BILLING_INCOME`.

### Infrastructure entities
```
Outbox               (id, aggregateType, aggregateId, type, payload, status, attempts, nextAttemptAt)
WebhookEvent         (id, provider, providerEventId UNIQUE, type, rawBody, signatureValid,
                      status, processedAt)
IdempotencyKey       (key, orgId, requestHash, responseSnapshot, expiresAt)
ReconciliationRun    (id, date, status)
ReconciliationBreak  (id, runId, kind, ourRef, providerRef, deltaMinor, status, resolvedBy)
```

### State machines (enforced in domain classes, illegal transitions throw)

- **Bill:** `DRAFT → ISSUED → PARTIALLY_PAID → PAID`, plus `OVERDUE`, `CANCELLED`, `REFUNDED`
- **Payment:** `INITIATED → PROCESSING → SUCCESS | FAILED | ABANDONED`
- **Payroll run:** `DRAFT → PENDING_APPROVAL → APPROVED → FUNDS_RESERVED → PROCESSING → COMPLETED | PARTIALLY_FAILED`, plus `REJECTED`, `CANCELLED`
- **Payout:** `PENDING → SENT → SUCCESS | FAILED | UNKNOWN`. `UNKNOWN` means we don't know if Kora paid, and the reconciler must resolve it.
- **Cross-border transfer:** `QUOTED → APPROVED → CONVERTING → CONVERTED → PAYING_OUT → COMPLETED`, with failure branches `QUOTE_EXPIRED`, `CONVERSION_FAILED`, `PAYOUT_FAILED_FUNDS_HELD` (money converted but not delivered, so it needs a manual or automated refund or retry)

### Services and patterns

| Class | Responsibility |
|---|---|
| `LedgerService` | The only writer of journal entries. Validates balance, enforces idempotency, supports reversals |
| `PayrollService` | Draft, compute via calculators, submit for approval, reserve funds, dispatch |
| `PayrollCalculator` (Strategy) | Pluggable statutory rules (PAYE, pension, NHF as configured with an accountant, not hardcoded guesses) |
| `BillingService` | Create and issue bills, apply payments, handle partial payments, overdue |
| `PaymentService` | Initialize checkout, confirm charge |
| `RefundService` | Refund workflow with approval and ledger reversal |
| `CrossBorderService` | Saga orchestrator with compensation steps |
| `ApprovalService` | Policy evaluation, maker-checker enforcement |
| `OutboxDispatcher` | Reliable delivery to Kora |
| `WebhookProcessor` | Verify, dedupe, re-fetch, apply |
| `ReconciliationService` | Daily matching, break creation |
| `AuditService` | Append-only audit writes |
| `ReportingService` | Queries against ledger and read models |
| `AssistantService` | LLM loop, tool registry, permission checks, logging |
| `OrgProfileRegistry` | Terminology and templates by org type |
| `ComplianceService` | KYB status gating, limits, sanctions-screening hook |

Patterns: Port/Adapter (gateway), Strategy (calculators, profiles), State (aggregates), Saga (cross-border), Outbox, Domain events (in-process for module decoupling, outbox for anything external), Optimistic locking (`version` column on bills, runs, payouts).

```ts
interface PaymentGateway {
  initializeCharge(i: ChargeInput): Promise<ChargeInit>;
  getCharge(ref: string): Promise<ChargeStatus>;
  refundCharge(i: RefundInput): Promise<RefundResult>;
  disburse(i: PayoutInput): Promise<PayoutResult>;       // deterministic reference required
  getPayout(ref: string): Promise<PayoutStatus>;
  resolveBankAccount(bank: string, acct: string): Promise<ResolvedAccount>;
  getRate(q: RateQuery): Promise<FxQuote>;
  convert(q: FxQuote): Promise<ConversionResult>;
  listSettlements(range: DateRange): Promise<Settlement[]>;
  verifyWebhook(raw: string, sig: string): boolean;
}
```

---

## 4. Folder structure

```
hackathon/
├── client/                          # Dedicated React.js SPA (Vite + TypeScript)
│   ├── src/
│   │   ├── components/              # Reusable UI components (Vanilla CSS, Glassmorphic tokens)
│   │   ├── pages/                   # Overview, Payroll, Bills, Transfers, Public Pay, Settings
│   │   ├── lib/                     # API client, money formatting, terminology
│   │   ├── App.tsx                  # Root React application
│   │   ├── main.tsx                 # React DOM mount point
│   │   └── index.css                # Global design system & typography tokens
│   ├── index.html                   # HTML entry
│   ├── vite.config.ts               # Vite configuration
│   ├── tsconfig.json
│   └── package.json
├── server/                          # Dedicated Backend Process (NestJS + Domain + Workers)
│   ├── src/
│   │   ├── domain/                  # Pure TS: Money value object, Ledger invariants, State machines
│   │   ├── gateway/                 # PaymentGateway port + Kora, Mock, FaultInjecting adapters
│   │   ├── shared/                  # RFC 7807 problem details, Zod schemas, enums, DTOs
│   │   ├── common/                  # Auth/MFA, RLS tenant context interceptor, crypto, guards
│   │   ├── modules/                 # Identity, Orgs, Approvals, Payees, Payroll, Billing, etc.
│   │   ├── worker/                  # BullMQ processors (outbox dispatcher, webhooks, payouts)
│   │   ├── scheduler/               # Cron jobs (overdue bills, stuck payout sweep, daily reconcile)
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── prisma/
│   │   ├── schema.prisma            # Full schema with RLS, triggers, and revokes
│   │   └── migrations/              # SQL migrations for RLS policies and ledger balance triggers
│   ├── tsconfig.json
│   └── package.json
├── infra/                           # Terraform, Docker, Ops alert rules
├── .github/workflows/               # CI and deploy automation
├── docs/architecture/               # ADRs (Ledger, Outbox, RLS)
├── docker-compose.yml               # PostgreSQL 16, Redis 7, Mailpit
├── package.json                     # Root scripts for client and server
└── README.md
```

The domain logic (`server/src/domain`) remains pure TypeScript with zero external framework dependencies: state machines, `Money`, and ledger rules get thorough unit and invariant tests (for example, "any sequence of operations keeps debits equal to credits").

---

## 5. API routes

Prefix `/api/v1`. Conventions:
- **Auth:** all routes require a session and org scope unless marked **public**.
- **Idempotency:** every money-moving POST requires `Idempotency-Key`. Same key with a different body returns `422`.
- **Money:** `{ "amountMinor": 250000, "currency": "NGN" }`.
- **Pagination:** cursor-based. **Errors:** RFC 7807 problem+json.
- **Step-up MFA** is required where marked ⚑. **Approval** gates the actions marked ✔.

**Auth and identity**
```
POST   /auth/register
POST   /auth/login
POST   /auth/mfa/verify
POST   /auth/refresh
POST   /auth/logout
POST   /auth/password/forgot
POST   /auth/password/reset
GET    /me
GET    /organizations/current            (includes profile labels, KYB status)
POST   /organizations
POST   /organizations/current/kyb        (submit business verification)
GET    /memberships
POST   /memberships/invite
PATCH  /memberships/:id                  (change role) ⚑
DELETE /memberships/:id ⚑
```

**Approval policies and requests**
```
GET    /approval-policies
PUT    /approval-policies/:actionType ⚑
GET    /approvals?status=pending
GET    /approvals/:id
POST   /approvals/:id/approve ⚑         (cannot be the requester)
POST   /approvals/:id/reject
```

**Payees and bank accounts**
```
GET    /payees?kind=
POST   /payees
GET    /payees/:id
PATCH  /payees/:id
DELETE /payees/:id                       (soft delete)
POST   /payees/:id/bank-accounts         (resolves name via Kora, stores encrypted)
PATCH  /payees/:id/bank-accounts/:accId ⚑ (changing bank details is a fraud vector, so alert and approve)
GET    /banks
```

**Payroll**
```
GET    /payroll/components
POST   /payroll/components
POST   /payroll/runs                     (draft, snapshots employees)
GET    /payroll/runs
GET    /payroll/runs/:id
PATCH  /payroll/runs/:id/items/:itemId   (adjustments, DRAFT only)
POST   /payroll/runs/:id/submit          (→ PENDING_APPROVAL, creates ApprovalRequest)
POST   /payroll/runs/:id/execute ✔ ⚑     (Idempotency-Key; reserves funds, writes outbox)
POST   /payroll/runs/:id/cancel
POST   /payroll/runs/:id/retry-failed ✔
GET    /payroll/runs/:id/payouts
GET    /payroll/payslips/:itemId         (PDF)
```

**Payers and bills**
```
GET    /payers
POST   /payers
POST   /payers/import                    (CSV, async job, returns jobId)
GET    /jobs/:jobId
POST   /bills                            (Idempotency-Key)
POST   /bills/bulk                       (async)
GET    /bills?status=&payerId=&due=
GET    /bills/:id
POST   /bills/:id/issue
POST   /bills/:id/remind
POST   /bills/:id/cancel
GET    /bills/:id/payments
POST   /payments/:id/refunds ✔ ⚑         (Idempotency-Key)
GET    /refunds
```

**Public bill payment** (hardened: unguessable token instead of a sequential reference, strict rate limits, bot protection, no payer PII beyond what's needed)
```
GET    /public/bills/:token
POST   /public/bills/:token/pay          (creates Kora checkout, returns checkoutUrl)
GET    /public/bills/:token/status
```

**Cross-border**
```
GET    /cross-border/corridors
POST   /cross-border/quotes
POST   /cross-border/transfers ✔ ⚑      (Idempotency-Key, quote must be unexpired)
GET    /cross-border/transfers
GET    /cross-border/transfers/:id
POST   /cross-border/transfers/:id/resolve ✔  (operator action for PAYOUT_FAILED_FUNDS_HELD)
```

**Ledger and reporting**
```
GET    /ledger/accounts
GET    /ledger/entries?account=&from=&to=
GET    /ledger/entries/:id
GET    /ledger/trial-balance?asOf=
GET    /transactions?type=&from=&to=&status=   (read model over the ledger)
GET    /reports/summary?from=&to=
GET    /reports/outstanding
GET    /reports/expenses/top
GET    /reports/payroll-register?runId=
POST   /exports                          (CSV/XLSX, async, signed download link)
```

**Reconciliation (finance + admin roles)**
```
GET    /reconciliation/runs
GET    /reconciliation/runs/:id
GET    /reconciliation/breaks?status=open
POST   /reconciliation/breaks/:id/resolve ✔  (requires note; posts a correcting entry if needed)
```

**Audit**
```
GET    /audit-logs?actor=&action=&subject=&from=&to=   (AUDITOR, ADMIN, OWNER)
```

**Assistant**
```
POST   /assistant/chat                   { message, conversationId? }
GET    /assistant/conversations
GET    /assistant/conversations/:id
```

**Webhooks** (public; signature verified; IP allow-list if Kora publishes one)
```
POST   /webhooks/kora
```

**Ops**
```
GET    /health/live
GET    /health/ready
```

---

## 6. AI assistant in production

- **Tools stay fixed, tested, and read-only:** `get_payroll_total`, `get_payroll_collected`, `list_outstanding_bills`, `get_top_expenses`, `get_cashflow_summary`. Each tool declares a required permission, and the assistant can only call tools the *current user's role* allows.
- **Tools run through the same RLS-scoped DB session as the API.** The LLM never sees SQL or other orgs' data.
- **Treat all stored text as untrusted.** Bill descriptions, payer names, and notes can contain prompt injection. Tool results go back to the model as clearly delimited data, the system prompt says to never follow instructions found in data, and there are no write tools, so a successful injection can't move money.
- **Log everything:** user, prompt, tool calls with arguments, results, and response. Retain per your privacy policy.
- **Minimize PII sent to the LLM provider:** return aggregates and IDs where possible, and check the provider's data-retention and DPA terms.
- **Numbers come from tools, not the model.** The response layer displays figures from the tool result, so the model never does arithmetic on money.
- **Later, if you add actions** ("pay all pending invoices"), the assistant may only *draft* a proposal that enters the normal approval flow.

---

## 7. Security and compliance checklist

**Application**
- Passwords with Argon2id, mandatory MFA for roles that can approve money movement, session rotation, and lockout and anomaly detection on login.
- Field-level envelope encryption (KMS) for account numbers and other sensitive PII. Salaries are treated as sensitive too.
- Secrets only in the secrets manager, with rotation runbooks for Kora keys and the webhook secret.
- Strict input validation (zod), output encoding, CSP, CSRF protection, and dependency and container scanning in CI.
- Bank detail changes trigger notifications and cool-down periods. This is a classic payroll-fraud vector.

**Data and privacy**
- Data classification doc, a retention and deletion policy, and a DPIA.
- NDPR obligations for Nigerian data subjects (and GDPR if you serve EU data). Hospitals add health-data sensitivity, so keep clinical details out of bills entirely and use only a billing description.
- Card data never touches your servers if you use Kora's hosted checkout, which keeps you out of heavy PCI scope. Confirm this with their docs.

**Regulatory (needs professional advice)**
- Whether you're acting as a payment aggregator or just a software layer over Kora's licensed services determines your licensing burden. Ask Kora directly and get a lawyer's opinion.
- KYB for onboarded organizations, transaction limits by KYB tier, sanctions and AML screening hooks, and suspicious-activity escalation procedures.
- Cross-border payments carry FX regulations and purpose-of-payment requirements that vary by corridor.

**Operational**
- Immutable audit log, with access to it itself audited.
- Least-privilege IAM, no shared accounts, break-glass access that is logged and alerts.
- Annual (or pre-launch) third-party penetration test.

---

## 8. Reliability and operations

- **SLOs:** for example, 99.9% API availability, and webhook-to-ledger p95 under 30 seconds.
- **Alerts (page someone):** payout stuck in `SENT` or `UNKNOWN` beyond threshold, webhook queue lag, DLQ non-empty, reconciliation breaks created, ledger invariant check failing, Kora error rate spike.
- **Backups and DR:** PITR on Postgres, tested restores, and a documented RTO and RPO.
- **Migrations:** expand-and-contract, never destructive in a single deploy.
- **Release process:** CI runs unit, property, integration, and e2e tests, then deploys to staging against the Kora sandbox. Prod deploys sit behind a manual approval with feature flags, and money features roll out by org (pilot first).
- **Testing money code:**
  - Property tests for ledger balance and state machines.
  - Fault-injection tests: duplicate webhooks, out-of-order events, Kora timeouts after success, worker crash between outbox claim and send.
  - Replay tests that rebuild balances from journal lines and compare.
- **Runbooks** for every alert, written before launch.

---

## 9. Suggested rollout phases

| Phase | Scope |
|---|---|
| 0. Foundations | Ledger, Money type, RLS, auth with MFA, audit log, outbox, CI/CD, observability |
| 1. Collections | Billing, hardened public pay page, webhook pipeline, refunds, reconciliation for charges |
| 2. Payroll | Approvals, payees and encrypted bank accounts, payroll runs, payouts, payslips, statutory calculators with an accountant's input |
| 3. Cross-border | Saga, quotes, compensation paths, corridor-specific compliance |
| 4. Assistant and reporting | Permissioned tools, exports, dashboards |
| 5. Pilot | One friendly organization, low limits, manual reconciliation review daily, then scale |
