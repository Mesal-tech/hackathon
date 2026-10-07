# ADR 002: Transactional Outbox Pattern for Payment Gateway Dispatch

## Status
Accepted

## Context
When performing money actions that interface with third-party payment gateways like Kora, dual writes (updating PostgreSQL and calling an external HTTP API in the same request handler) suffer from partial failure states: the database commit may succeed while the API call fails or times out, or vice versa.

## Decision
1. Any state transition triggering an outbound call to Kora (e.g. executing payroll, issuing payouts, initiating refunds) writes the domain state and an `Outbox` table row in a single atomic PostgreSQL transaction.
2. The asynchronous `apps/worker` background process consumes the outbox queue, dispatches the request to Kora using a deterministic idempotent reference (`payout-<payoutId>`), and records the provider response.
3. If the worker encounters network timeouts or crashes mid-flight, retries reuse the deterministic reference, ensuring Kora de-duplicates the transaction.
