import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { api, ApiError } from './api/client';
import type { Bill } from './api/types';
import { formatDateTime, formatMoney } from './Format'

/** The page a student/patient/customer opens from their bill link. No login, no navigation. */
export default function PayPage({ token }: { token: string }) {
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBill(await api.getBillByToken(token));
      setNotFound(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setNotFound(true);
      else setError(e instanceof Error ? e.message : 'Could not load this bill');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // While the bill is unpaid, re-check every 4 seconds. After Kora's webhook lands, this flips to "Paid" by itself.
  useEffect(() => {
    if (bill?.status !== 'PENDING') return;
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [bill?.status, load]);

  async function handlePay() {
    if (!bill) return;
    setPaying(true);
    setError(null);
    try {
      const { checkoutUrl } = await api.getCheckoutUrl(bill.id);
      if (checkoutUrl.includes('mock-session')) {
        await load();                       // mock mode: payment is instant, just refresh
      } else {
        window.location.href = checkoutUrl; // live mode: go to Kora's checkout page
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start payment');
    } finally {
      setPaying(false);
    }
  }

  return (
    <>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-panel" style={{ padding: '32px', width: '100%', maxWidth: '440px' }}>
          {loading && <p style={{ color: 'var(--text-muted)' }}>Loading your bill…</p>}

          {!loading && notFound && (
            <>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>Bill not found</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                This payment link is invalid or has been removed. Ask the organization to send you a new link.
              </p>
            </>
          )}

          {!loading && !notFound && bill && (
            <>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>Bill for {bill.payerName}</p>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '20px' }}>{bill.description}</h1>

              <div className="mono-figure" style={{ fontSize: '2.2rem', fontWeight: 700, color: '#34d399', marginBottom: '24px' }}>
                {formatMoney(bill.amountMinor, bill.currency)}
              </div>

              {bill.status === 'PAID' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#34d399' }}>
                  <CheckCircle2 size={22} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Payment confirmed</div>
                    {bill.paidAt && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatDateTime(bill.paidAt)}</div>
                    )}
                  </div>
                </div>
              ) : bill.status === 'PENDING' ? (
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handlePay} disabled={paying}>
                  {paying ? 'Opening checkout…' : `Pay ${formatMoney(bill.amountMinor, bill.currency)}`}
                </button>
              ) : (
                <p style={{ color: '#fbbf24', fontSize: '0.9rem' }}>
                  This bill is {bill.status.toLowerCase()} and can no longer be paid.
                </p>
              )}
            </>
          )}

          {error && <p style={{ color: '#fbbf24', fontSize: '0.85rem', marginTop: '16px' }}>{error}</p>}
        </div>
      </div>
    </>
  );
}
