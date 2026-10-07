-- =========================================================================
-- 1. POSTGRESQL ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-tenancy isolation enforced by the database (Production Principle 6)
-- Session parameter: current_setting('app.org_id', true)
-- =========================================================================

-- Enable RLS on all tenant-specific tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payees ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fx_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_border_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_runs ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies
CREATE POLICY org_isolation ON organizations 
  USING (id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY org_profile_isolation ON org_profiles 
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY membership_isolation ON memberships 
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY approval_policy_isolation ON approval_policies 
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY approval_request_isolation ON approval_requests 
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY audit_log_isolation ON audit_logs 
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY payee_isolation ON payees 
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY bank_account_isolation ON bank_accounts 
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY payer_isolation ON payers 
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY bill_isolation ON bills 
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY payment_isolation ON payments 
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY refund_isolation ON refunds 
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY pay_component_isolation ON pay_components 
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY payroll_run_isolation ON payroll_runs 
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY payout_isolation ON payouts 
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY fx_quote_isolation ON fx_quotes 
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY cross_border_isolation ON cross_border_transfers 
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY ledger_account_isolation ON ledger_accounts 
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY journal_entry_isolation ON journal_entries 
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY outbox_isolation ON outbox 
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY idempotency_key_isolation ON idempotency_keys 
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY reconciliation_run_isolation ON reconciliation_runs 
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);


-- =========================================================================
-- 2. DOUBLE-ENTRY IMMUTABILITY & REVERSALS (Production Principle 2)
-- Revoke UPDATE and DELETE on journal entries and ledger lines
-- =========================================================================

REVOKE UPDATE, DELETE ON journal_entries FROM PUBLIC;
REVOKE UPDATE, DELETE ON ledger_lines FROM PUBLIC;


-- =========================================================================
-- 3. LEDGER BALANCE INVARIANT CONSTRAINT TRIGGER (Production Principle 2)
-- Ensures sum of debits = sum of credits per journal entry
-- =========================================================================

CREATE OR REPLACE FUNCTION verify_journal_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_debits BIGINT;
  v_credits BIGINT;
  v_entry_id UUID;
BEGIN
  v_entry_id := COALESCE(NEW.entry_id, OLD.entry_id);

  SELECT 
    COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN amount_minor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount_minor ELSE 0 END), 0)
  INTO v_debits, v_credits
  FROM ledger_lines
  WHERE entry_id = v_entry_id;

  IF v_debits <> v_credits THEN
    RAISE EXCEPTION 'Unbalanced journal entry %: Debits (%) <> Credits (%)', 
      v_entry_id, v_debits, v_credits;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Deferred constraint trigger checks balance at the end of the transaction
CREATE CONSTRAINT TRIGGER trg_verify_journal_balance
AFTER INSERT OR UPDATE OR DELETE ON ledger_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION verify_journal_entry_balance();
