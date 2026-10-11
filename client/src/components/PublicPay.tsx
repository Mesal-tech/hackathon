import React, { useState, useEffect } from 'react';
import {
  Receipt,
  CheckCircle2,
  Calendar,
  AlertCircle,
  CreditCard,
  Building2,
  ArrowRight,
  ShieldCheck,
  Printer,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  Zap,
  Lock,
} from 'lucide-react';

interface BillItemLine {
  itemId?: string;
  description: string;
  amountMinor: number;
}

interface PublicBillData {
  id?: string;
  token: string;
  orgId?: string;
  payerName: string;
  payerEmail?: string;
  groupName?: string;
  items: BillItemLine[];
  amountMinor: number;
  currency: string;
  dueDate: string;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  paidAt?: string;
  koraReference?: string;
  koraCheckoutUrl?: string;
}

interface PublicPayProps {
  token: string;
}

export const PublicPay: React.FC<PublicPayProps> = ({ token }) => {
  const [bill, setBill] = useState<PublicBillData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [activeReference, setActiveReference] = useState<string | null>(null);

  // Check URL query parameters for Korapay return
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isReturn = urlParams.get('kora_return') === 'true';
    const ref = urlParams.get('reference') || urlParams.get('trxref');

    if (isReturn || ref) {
      verifyKoraReturn(ref || undefined);
    } else {
      fetchBill();
    }
  }, [token]);

  const fetchBill = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/public/bills/${token}`);
      if (!res.ok) {
        throw new Error('Invoice not found or expired');
      }
      const data = await res.json();
      setBill(data);
      if (data.status === 'PAID') {
        setPaymentSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyKoraReturn = async (reference?: string) => {
    try {
      setIsLoading(true);
      const query = reference ? `?reference=${encodeURIComponent(reference)}` : '';
      const res = await fetch(`/api/v1/public/bills/${token}/verify-kora${query}`);
      const data = await res.json();
      if (data.success && data.status === 'PAID') {
        setBill(data.bill);
        setPaymentSuccess(true);
        setActiveReference(reference || data.bill?.koraReference || null);
      } else {
        await fetchBill();
      }
    } catch {
      await fetchBill();
    } finally {
      setIsLoading(false);
    }
  };

  // Korapay Checkout Flow
  const handleKoraCheckout = async () => {
    try {
      setIsProcessing(true);
      const redirectUrl = `${window.location.origin}/pay/${token}?kora_return=true`;
      const res = await fetch(`/api/v1/public/bills/${token}/checkout/kora`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectUrl }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || 'Failed to initialize Korapay checkout');
      }

      const data = await res.json();

      if (data.isLiveKora && data.checkoutUrl) {
        // Redirect payer directly to Korapay's secure hosted payment page
        window.location.href = data.checkoutUrl;
      } else {
        // Demo / Sandbox mode: Open interactive sandbox modal
        setActiveReference(data.reference);
        setShowDemoModal(true);
      }
    } catch (err: any) {
      alert(err.message || 'Payment initiation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm demo payment simulation
  const handleConfirmDemoPayment = async () => {
    try {
      setIsProcessing(true);
      const res = await fetch(`/api/v1/public/bills/${token}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: 'korapay_sandbox' }),
      });
      if (!res.ok) throw new Error('Payment confirmation failed');
      const data = await res.json();
      setBill(data.bill);
      setPaymentSuccess(true);
      setShowDemoModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to finalize test payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (minor: number, currency: string = 'NGN') => {
    const major = minor / 100;
    const symbol = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
    return `${symbol}${major.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0d14' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px', borderColor: 'rgba(56, 189, 248, 0.2)', borderTopColor: '#38bdf8' }} />
          <div style={{ color: '#8b94a7', fontSize: '0.9rem' }}>Retrieving invoice & Korapay session...</div>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0d14', padding: '24px' }}>
        <div className="glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '36px', textAlign: 'center', borderRadius: '24px', background: '#141720', border: '1px solid #282d3d' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <AlertCircle size={28} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
            Invoice Not Found
          </h2>
          <p style={{ color: '#8b94a7', fontSize: '0.86rem', lineHeight: 1.5, marginBottom: '24px' }}>
            {error || 'This payment link may have expired or is invalid. Please contact the billing organization for a new link.'}
          </p>
          <a href="/" className="btn btn-secondary" style={{ display: 'inline-flex', justifyContent: 'center', width: '100%' }}>
            Return to Homepage
          </a>
        </div>
      </div>
    );
  }

  const isPaid = bill.status === 'PAID' || paymentSuccess;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d14', color: '#f8fafc', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Container */}
      <div style={{ width: '100%', maxWidth: '640px' }}>
        {/* Brand Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Receipt size={18} />
            </div>
            <div>
              <span style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#f8fafc' }}>
                X-Flow
              </span>
              <span style={{ fontSize: '0.75rem', color: '#8b94a7', marginLeft: '6px' }}>
                Secure Payment Portal
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.08)', padding: '4px 10px', borderRadius: '999px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            <ShieldCheck size={14} />
            <span>Korapay Verified</span>
          </div>
        </div>

        {/* Invoice Card */}
        <div
          className="glass-panel"
          style={{
            background: '#141720',
            border: '1px solid #282d3d',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Status Header Banner */}
          <div
            style={{
              padding: '28px 32px',
              borderBottom: '1px solid #282d3d',
              background: isPaid ? 'rgba(16, 185, 129, 0.08)' : 'rgba(56, 189, 248, 0.04)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: '#8b94a7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Invoice Reference
                </span>
                <button
                  type="button"
                  onClick={copyToken}
                  style={{ background: 'none', border: 'none', color: '#8b94a7', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                  title="Copy reference token"
                >
                  {copiedToken ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  <span style={{ fontFamily: 'monospace' }}>{bill.token.substring(0, 12)}...</span>
                </button>
              </div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                {bill.payerName}
              </h1>
              {bill.payerEmail && (
                <div style={{ fontSize: '0.8rem', color: '#8b94a7', marginTop: '2px' }}>
                  {bill.payerEmail}
                </div>
              )}
              {bill.groupName && (
                <div style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#38bdf8' }}>
                  <Building2 size={13} />
                  <span>{bill.groupName}</span>
                </div>
              )}
            </div>

            <div>
              {isPaid ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '6px 14px', borderRadius: '999px', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 600, fontSize: '0.85rem' }}>
                  <CheckCircle2 size={16} />
                  <span>PAID & SETTLED</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', padding: '6px 14px', borderRadius: '999px', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: 600, fontSize: '0.85rem' }}>
                  <Calendar size={16} />
                  <span>DUE: {bill.dueDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Itemized Fee Breakdown Table */}
          <div style={{ padding: '28px 32px' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8b94a7', marginBottom: '16px' }}>
              Itemized Charges
            </h3>

            <div style={{ borderRadius: '14px', border: '1px solid #282d3d', overflow: 'hidden', marginBottom: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#191c26', borderBottom: '1px solid #282d3d' }}>
                    <th style={{ textAlign: 'left', padding: '12px 18px', color: '#8b94a7', fontWeight: 500, fontSize: '0.78rem' }}>
                      DESCRIPTION
                    </th>
                    <th style={{ textAlign: 'right', padding: '12px 18px', color: '#8b94a7', fontWeight: 500, fontSize: '0.78rem' }}>
                      AMOUNT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: idx < bill.items.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none' }}>
                      <td style={{ padding: '14px 18px', color: '#f8fafc', fontWeight: 500 }}>
                        {item.description}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', color: '#f8fafc', fontFamily: 'monospace', fontWeight: 600 }}>
                        {formatCurrency(item.amountMinor, bill.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Calculation */}
            <div style={{ background: '#191c26', padding: '20px 24px', borderRadius: '16px', border: '1px solid #282d3d', marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.86rem', color: '#8b94a7' }}>
                <span>Subtotal</span>
                <span style={{ fontFamily: 'monospace', color: '#f8fafc' }}>
                  {formatCurrency(bill.amountMinor, bill.currency)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', fontSize: '0.86rem', color: '#8b94a7' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Korapay Processing Fee</span>
                  <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>Zero fee</span>
                </span>
                <span style={{ color: '#10b981', fontWeight: 600 }}>₦0.00 (Waived)</span>
              </div>
              <div style={{ borderTop: '1px solid #282d3d', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                  Total Amount Due
                </span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
                  {formatCurrency(bill.amountMinor, bill.currency)}
                </span>
              </div>
            </div>

            {/* State: Already Paid */}
            {isPaid ? (
              <div
                style={{
                  padding: '24px',
                  borderRadius: '16px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  textAlign: 'center',
                }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <CheckCircle2 size={24} />
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 6px' }}>
                  Payment Settled Successfully
                </h4>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 12px', lineHeight: 1.5 }}>
                  This bill was verified and settled via Korapay on {bill.paidAt ? new Date(bill.paidAt).toLocaleDateString() : 'today'}. A transaction record has been reconciled into the double-entry immutable ledger.
                </p>

                {(activeReference || bill.koraReference) && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#141720', padding: '6px 14px', borderRadius: '8px', border: '1px solid #282d3d', fontSize: '0.78rem', color: '#8b94a7', marginBottom: '18px', fontFamily: 'monospace' }}>
                    <span>Ref:</span>
                    <span style={{ color: '#38bdf8' }}>{activeReference || bill.koraReference}</span>
                  </div>
                )}

                <div>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Printer size={15} /> Print Official Receipt
                  </button>
                </div>
              </div>
            ) : (
              /* State: Ready to Pay with Korapay */
              <div>
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.1) 0%, rgba(56, 189, 248, 0.05) 100%)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#f8fafc' }}>Korapay Checkout</div>
                        <div style={{ fontSize: '0.76rem', color: '#8b94a7' }}>Cards, Bank Transfer, USSD & Virtual Accounts</div>
                      </div>
                    </div>
                    <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>PCI-DSS Certified</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                    Instant automated reconciliation. Your payment will be confirmed and an official receipt issued immediately.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleKoraCheckout}
                  disabled={isProcessing}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 8px 24px rgba(56, 189, 248, 0.3)',
                  }}
                >
                  {isProcessing ? (
                    <>
                      <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                      <span>Connecting to Korapay...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      <span>Pay {formatCurrency(bill.amountMinor, bill.currency)} with Korapay</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <p style={{ textAlign: 'center', fontSize: '0.76rem', color: '#64748b', marginTop: '14px' }}>
                  Secured by Korapay end-to-end 256-bit encryption. Handled via automated double-entry ledger settlement.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Demo Sandbox Checkout Modal */}
      {showDemoModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Zap size={26} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                Korapay Sandbox Checkout
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#8b94a7', lineHeight: 1.5 }}>
                Simulating Korapay payment authorization for invoice <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{token.substring(0, 8)}</span>
              </p>
            </div>

            <div style={{ background: '#191c26', borderRadius: '14px', padding: '16px', border: '1px solid #282d3d', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.84rem' }}>
                <span style={{ color: '#8b94a7' }}>Payer:</span>
                <span style={{ color: '#f8fafc', fontWeight: 600 }}>{bill.payerName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.84rem' }}>
                <span style={{ color: '#8b94a7' }}>Amount:</span>
                <span style={{ color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(bill.amountMinor, bill.currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <span style={{ color: '#8b94a7' }}>Reference:</span>
                <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.78rem' }}>{activeReference || 'inv_demo_ref'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handleConfirmDemoPayment}
                disabled={isProcessing}
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', justifyContent: 'center' }}
              >
                {isProcessing ? 'Authorizing & Reconciling...' : 'Simulate Successful Authorization'}
              </button>
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicPay;
