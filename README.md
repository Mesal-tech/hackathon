# Enterprise Financial Platform (Modular Monolith)

A production-grade multi-tenant financial ledger, payroll, billing, and Kora integration platform built on institutional financial principles.

## 🏛️ Architecture Overview

The system is organized into dedicated `client` and `server` applications:

1. **`client/` (React.js SPA with Vite & TypeScript)**: High-performance administrative treasury dashboard with Clerk SSO authentication (`<ClerkProvider>`, `<SignedIn>`, `<SignedOut>`, `<UserButton>`), protected routes for double-entry ledger and payroll, and a public tokenized bill payment portal.
2. **`server/` (NestJS API + Double-Entry Ledger + Workers)**:
   * **API Process**: REST API (`/api/v1`), Clerk JWT authentication guard (`ClerkAuthGuard`), PostgreSQL Row-Level Security (RLS) tenant isolation, RBAC, maker-checker authorization, and cryptographic HMAC webhook ingress.
   * **Protected Routes**: `/api/v1/ledger/*` and `/api/v1/payroll/*` (authenticated via Clerk Bearer tokens); `/api/v1/public/*` and `/api/v1/health/*` (public unauthenticated).
   * **Domain Engine**: Pure TypeScript double-entry ledger invariants ($\sum \text{Debits} = \sum \text{Credits}$), `Money` value object (integer minor units, zero floats), and state machines.
   * **Gateway Adapters**: `PaymentGateway` port with `KoraGateway` (production HTTP client with HMAC-SHA256 signature verification) and `FaultInjectingGateway`.
   * **Worker Process (BullMQ + Redis)**: Asynchronous transactional outbox delivery to Kora, webhook re-query verification, and payout polling.
   * **Scheduler Process (Cron)**: Automated overdue bill transitions, stuck payout sweeps, and daily settlement reconciliation.
   * **Prisma ORM**: PostgreSQL schema with automated RLS policies, ledger triggers, and immutable REVOKE rules.

## 🚀 Getting Started

### Prerequisites

* Node.js v20+ or v24+
* npm v10+
* Docker & Docker Compose

### Installation

```bash
# Install dependencies for both client and server
npm install
```

### Starting Infrastructure (PostgreSQL & Redis)

```bash
npm run docker:up
```

### Running Applications

```bash
# Start React.js Web Client (Vite)
npm run dev:client

# Start NestJS Backend Server
npm run dev:server
```

### Building & Type-Checking

```bash
# Type-check client and server
npm run typecheck

# Build client and server
npm run build
```

### Running Invariant & Domain Tests

```bash
npm test
```
