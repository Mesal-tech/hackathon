# ADR 001: Double-Entry Immutable Ledger

## Status
Accepted

## Context
A financial platform processing multi-tenant payroll, billing, and payouts cannot rely on mutable balances (e.g., `account.balance += x`) or single-entry tracking. Floating point rounding errors and lost updates lead to unreconciled states and potential financial loss.

## Decision
1. All monetary values are strictly represented as integers in minor units paired with an ISO 4217 currency code. Floating point arithmetic is prohibited across DB, domain logic, and API payloads.
2. The core accounting engine is implemented as an immutable double-entry ledger. Every financial event generates a balanced `JournalEntry` containing at least two `LedgerLine` entries such that $\sum \text{Debits} = \sum \text{Credits}$.
3. Direct `UPDATE` and `DELETE` queries are revoked on ledger tables at the database permission level. Corrections and adjustments must be executed via balanced reversal entries referencing the original journal entry.
4. Balances are derived dynamically or maintained via rebuildable materialized projections.
