import crypto from 'node:crypto';
import {
  PaymentGateway,
  ChargeInput,
  ChargeInit,
  ChargeStatusResult,
  RefundInput,
  RefundResult,
  PayoutInput,
  PayoutResult,
  ResolvedAccount,
  RateQuery,
  FxQuoteResult,
  ConversionResult,
  DateRange,
  Settlement,
} from '../ports/payment-gateway.interface.js';
import { PaymentStatus, PayoutStatus, SupportedCurrency } from '../../shared/index.js';

export interface KoraConfig {
  secretKey: string;
  publicKey?: string;
  webhookSecret?: string;
  baseUrl?: string;
}

export class KoraGateway implements PaymentGateway {
  private readonly baseUrl: string;

  constructor(private readonly config: KoraConfig) {
    this.baseUrl = config.baseUrl || 'https://api.korapay.com/merchant/api/v1';
  }

  private getHeaders(): Record<string, string> {
    if (!this.config.secretKey) {
      throw new Error('Kora secretKey must be configured to execute gateway requests');
    }
    return {
      Authorization: `Bearer ${this.config.secretKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = {
      ...this.getHeaders(),
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const responseText = await response.text();
    let body: any;
    try {
      body = JSON.parse(responseText);
    } catch {
      body = { message: responseText };
    }

    if (!response.ok) {
      const msg = body?.message || body?.error || response.statusText || 'Unknown Kora error';
      const details = body?.data ? ` - ${JSON.stringify(body.data)}` : body?.errors ? ` - ${JSON.stringify(body.errors)}` : '';
      throw new Error(`Kora API request failed [${response.status}] ${url}: ${msg}${details}`);
    }

    if (body && typeof body === 'object' && body.status === false) {
      throw new Error(`Kora API error: ${body.message || 'Operation failed'}`);
    }

    return body;
  }

  verifyWebhook(rawBody: string, signature: string): boolean {
    if (!this.config.webhookSecret || !signature) {
      return false;
    }
    const hash = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(rawBody)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  }

  async initializeCharge(i: ChargeInput): Promise<ChargeInit> {
    const sanitizedName = (i.customer.name || 'Customer')
      .replace(/[<>()&"'/\\;:{}[\]|`~#%^*+=?]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Customer';

    const payload = {
      reference: i.reference,
      amount: i.amountMinor / 100,
      currency: i.currency,
      customer: {
        name: sanitizedName,
        email: i.customer.email,
      },
      notification_url: i.redirectUrl,
      redirect_url: i.redirectUrl,
      metadata: i.metadata,
    };

    const res = await this.request('/charges/initialize', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const data = res.data;
    if (!data?.checkout_url && !data?.authorization_url) {
      throw new Error(`Kora did not return a valid checkout URL for reference: ${i.reference}`);
    }

    return {
      checkoutUrl: data.checkout_url || data.authorization_url,
      reference: data.reference || i.reference,
    };
  }

  async getCharge(ref: string): Promise<ChargeStatusResult> {
    const res = await this.request(`/charges/${encodeURIComponent(ref)}`, {
      method: 'GET',
    });

    const data = res.data;
    if (!data) {
      throw new Error(`No charge data found for reference: ${ref}`);
    }

    let status = PaymentStatus.PROCESSING;
    const s = String(data.status || '').toLowerCase();
    if (s === 'success' || s === 'successful') {
      status = PaymentStatus.SUCCESS;
    } else if (s === 'failed' || s === 'error') {
      status = PaymentStatus.FAILED;
    }

    return {
      reference: data.reference || ref,
      amountMinor: Math.round(Number(data.amount || 0) * 100),
      currency: (data.currency || 'NGN') as SupportedCurrency,
      status,
      paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
      rawResponse: data,
    };
  }

  async refundCharge(i: RefundInput): Promise<RefundResult> {
    const payload = {
      reference: i.paymentReference,
      amount: i.amountMinor / 100,
      reason: i.reason,
      refund_reference: i.refundReference,
    };

    const res = await this.request('/charges/refund', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const data = res.data || {};
    let status: 'PENDING' | 'SUCCESS' | 'FAILED' = 'PENDING';
    const s = String(data.status || '').toLowerCase();
    if (s === 'success' || s === 'successful') {
      status = 'SUCCESS';
    } else if (s === 'failed' || s === 'error') {
      status = 'FAILED';
    }

    return {
      refundReference: data.refund_reference || i.refundReference,
      status,
    };
  }

  async disburse(i: PayoutInput): Promise<PayoutResult> {
    const payload = {
      reference: i.deterministicReference,
      destination: {
        type: 'bank_account',
        amount: i.amountMinor / 100,
        currency: i.currency,
        narration: i.narration,
        bank_account: {
          bank: i.destination.bankCode,
          account: i.destination.accountNumber,
        },
      },
    };

    const res = await this.request('/transactions/disburse', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const data = res.data;
    let status = PayoutStatus.SENT;
    const s = String(data?.status || '').toLowerCase();
    if (s === 'success' || s === 'successful') {
      status = PayoutStatus.SUCCESS;
    } else if (s === 'failed') {
      status = PayoutStatus.FAILED;
    } else if (s === 'processing' || s === 'pending') {
      status = PayoutStatus.SENT;
    }

    return {
      providerReference: data?.reference || data?.transaction_reference || i.deterministicReference,
      status,
    };
  }

  async getPayout(ref: string): Promise<PayoutStatus> {
    const res = await this.request(`/transactions/disburse/${encodeURIComponent(ref)}`, {
      method: 'GET',
    });

    const data = res.data;
    const s = String(data?.status || '').toLowerCase();
    if (s === 'success' || s === 'successful') {
      return PayoutStatus.SUCCESS;
    }
    if (s === 'failed') {
      return PayoutStatus.FAILED;
    }
    if (s === 'pending' || s === 'processing') {
      return PayoutStatus.SENT;
    }
    return PayoutStatus.UNKNOWN;
  }

  async resolveBankAccount(bank: string, acct: string): Promise<ResolvedAccount> {
    const res = await this.request('/misc/banks/resolve', {
      method: 'POST',
      body: JSON.stringify({
        bank,
        account: acct,
      }),
    });

    const data = res.data;
    if (!data?.account_name) {
      throw new Error(`Unable to resolve bank account ${acct} with bank code ${bank}`);
    }

    return {
      accountNumber: data.account_number || acct,
      accountName: data.account_name,
      bankCode: bank,
      currency: (data.currency || 'NGN') as SupportedCurrency,
    };
  }

  async getRate(q: RateQuery): Promise<FxQuoteResult> {
    const query = new URLSearchParams({
      source_currency: q.sourceCurrency,
      target_currency: q.targetCurrency,
      amount: String(q.amountMinor / 100),
    });

    const res = await this.request(`/fx/rate?${query.toString()}`, {
      method: 'GET',
    });

    const data = res.data;
    if (!data || data.rate === undefined) {
      throw new Error(`Unable to obtain FX rate from Kora for ${q.sourceCurrency}/${q.targetCurrency}`);
    }

    const rate = Number(data.rate);
    const targetMinor = data.target_amount
      ? Math.round(Number(data.target_amount) * 100)
      : Math.round(q.amountMinor * rate);

    return {
      quoteId: data.quote_id || data.id || `quote-${Date.now()}`,
      rate,
      sourceAmountMinor: q.amountMinor,
      targetAmountMinor: targetMinor,
      expiresAt: data.expires_at ? new Date(data.expires_at) : new Date(Date.now() + 10 * 60 * 1000),
    };
  }

  async convert(q: FxQuoteResult): Promise<ConversionResult> {
    const res = await this.request('/fx/convert', {
      method: 'POST',
      body: JSON.stringify({ quote_id: q.quoteId }),
    });

    const data = res.data;
    const isSuccess = data?.status === 'successful' || data?.status === 'success' || !data?.status;

    return {
      conversionReference: data?.conversion_reference || data?.reference || `conv-${q.quoteId}`,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
    };
  }

  async listSettlements(range: DateRange): Promise<Settlement[]> {
    const query = new URLSearchParams({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    });

    const res = await this.request(`/settlements?${query.toString()}`, {
      method: 'GET',
    });

    const list = Array.isArray(res.data) ? res.data : [];
    return list.map((item: any) => ({
      id: item.id || item.reference,
      amountMinor: Math.round(Number(item.amount || 0) * 100),
      currency: (item.currency || 'NGN') as SupportedCurrency,
      channel: item.channel || 'KORA',
      settledAt: new Date(item.settled_at || item.created_at || Date.now()),
    }));
  }
}
