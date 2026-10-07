# ADR 003: Tenant Isolation via PostgreSQL Row-Level Security (RLS)

## Status
Accepted

## Context
In a multi-tenant platform managing payroll and bills for multiple organizations (schools, hospitals, enterprises), accidental data leakage across tenant boundaries represents a catastrophic compliance and security breach. Relying purely on application-layer `WHERE organization_id = ?` clauses is prone to human error and developer omission.

## Decision
1. All tenant tables require an `organization_id` column.
2. PostgreSQL Row-Level Security (RLS) is enabled on all tenant tables with policies evaluated against `current_setting('app.org_id')`.
3. The API request pipeline sets the transaction-scoped session variable `SET LOCAL app.org_id = :orgId` immediately upon authenticating and verifying tenant membership.
4. The application DB user has RLS strictly enforced, making it mathematically impossible for application queries to leak cross-tenant rows even if an application filter is omitted.
