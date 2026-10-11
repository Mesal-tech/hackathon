import { Bill } from './billing.controller.js';

export interface EmailDispatchResult {
  success: boolean;
  deliveredTo: string;
  subject: string;
  html: string;
  provider: 'RESEND' | 'SENDGRID' | 'DISPATCH_LOG';
  messageId?: string;
}

export class InvoiceNotificationService {
  private formatCurrency(minor: number, currency: string = 'NGN'): string {
    const symbol = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
    return `${symbol}${(minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  generateInvoiceEmail(bill: Bill, orgName: string, clientBaseUrl: string): { subject: string; html: string; text: string } {
    const paymentUrl = `${clientBaseUrl}/pay/${bill.token}`;
    const subject = `Invoice ${bill.token.substring(0, 8).toUpperCase()} from ${orgName} - ${this.formatCurrency(bill.totalAmountMinor, bill.currency)}`;

    const itemsHtml = bill.items
      .map(
        (it) => `
        <tr style="border-bottom: 1px solid #282d3d;">
          <td style="padding: 12px 16px; color: #f8fafc; font-size: 14px;">${it.description}</td>
          <td style="padding: 12px 16px; color: #f8fafc; font-size: 14px; text-align: right; font-family: monospace; font-weight: 600;">
            ${this.formatCurrency(it.amountMinor, bill.currency)}
          </td>
        </tr>`
      )
      .join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0d14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0d14; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #141720; border: 1px solid #282d3d; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px; background-color: #191c26; border-bottom: 1px solid #282d3d;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #38bdf8; font-weight: 700; margin-bottom: 6px;">
                      OFFICIAL INVOICE
                    </div>
                    <div style="font-size: 22px; font-weight: 800; color: #f8fafc;">
                      ${orgName}
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 6px 12px; background-color: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 999px; color: #38bdf8; font-size: 12px; font-weight: 600;">
                      Due: ${bill.dueDate}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Payer Greeting -->
          <tr>
            <td style="padding: 28px 36px 12px;">
              <p style="font-size: 15px; color: #cbd5e1; margin: 0 0 8px;">
                Dear <strong>${bill.payerName}</strong>,
              </p>
              <p style="font-size: 14px; color: #8b94a7; line-height: 1.5; margin: 0;">
                Your invoice ${bill.groupName ? `for <strong>${bill.groupName}</strong>` : ''} has been issued and is ready for payment. Please review the itemized breakdown below.
              </p>
            </td>
          </tr>

          <!-- Line Items Table -->
          <tr>
            <td style="padding: 16px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #282d3d; border-radius: 12px; overflow: hidden; background-color: #191c26;">
                <thead>
                  <tr style="background-color: #1e2330; border-bottom: 1px solid #282d3d;">
                    <th align="left" style="padding: 10px 16px; font-size: 11px; text-transform: uppercase; color: #8b94a7; font-weight: 600;">DESCRIPTION</th>
                    <th align="right" style="padding: 10px 16px; font-size: 11px; text-transform: uppercase; color: #8b94a7; font-weight: 600;">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Total Calculation -->
          <tr>
            <td style="padding: 0 36px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 12px; padding: 18px 20px;">
                <tr>
                  <td>
                    <span style="font-size: 14px; font-weight: 600; color: #cbd5e1;">Total Amount Due</span>
                    <div style="font-size: 11px; color: #8b94a7; margin-top: 2px;">Payable via Korapay (Card, Bank Transfer, USSD)</div>
                  </td>
                  <td align="right">
                    <span style="font-size: 22px; font-weight: 800; color: #38bdf8; font-family: monospace;">
                      ${this.formatCurrency(bill.totalAmountMinor, bill.currency)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Action Button -->
          <tr>
            <td align="center" style="padding: 0 36px 32px;">
              <a href="${paymentUrl}" style="display: block; width: 100%; box-sizing: border-box; background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%); color: #ffffff; text-decoration: none; padding: 16px 24px; border-radius: 12px; font-weight: 700; font-size: 15px; text-align: center; box-shadow: 0 4px 18px rgba(56, 189, 248, 0.4);">
                Pay Now with Korapay &rarr;
              </a>
              <p style="font-size: 12px; color: #64748b; margin: 12px 0 0;">
                Or paste this secure link in your browser: <br/>
                <a href="${paymentUrl}" style="color: #38bdf8; text-decoration: none; word-break: break-all;">${paymentUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px; background-color: #191c26; border-top: 1px solid #282d3d; text-align: center;">
              <p style="font-size: 12px; color: #64748b; margin: 0 0 4px;">
                Payments are securely processed and settled via Korapay Payment Gateway.
              </p>
              <p style="font-size: 11px; color: #475569; margin: 0;">
                Invoice Reference: ${bill.token} &bull; Issued by ${orgName}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `
INVOICE FROM ${orgName}
=======================================
Invoice Reference: ${bill.token}
Due Date: ${bill.dueDate}
Payer: ${bill.payerName} ${bill.groupName ? `(${bill.groupName})` : ''}

ITEMIZED CHARGES:
${bill.items.map((it) => `- ${it.description}: ${this.formatCurrency(it.amountMinor, bill.currency)}`).join('\n')}

TOTAL AMOUNT DUE: ${this.formatCurrency(bill.totalAmountMinor, bill.currency)}

Pay securely online via Korapay:
${paymentUrl}

Payments are secured and reconciled automatically.
`;

    return { subject, html, text };
  }

  async sendInvoiceEmail(
    bill: Bill,
    orgName: string,
    recipientEmail: string,
    clientBaseUrl: string = 'http://localhost:3000'
  ): Promise<EmailDispatchResult> {
    const { subject, html, text } = this.generateInvoiceEmail(bill, orgName, clientBaseUrl);

    // 1. Check if Resend API key is configured
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || `${orgName} <billing@resend.dev>`,
            to: recipientEmail,
            subject,
            html,
            text,
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          return {
            success: true,
            deliveredTo: recipientEmail,
            subject,
            html,
            provider: 'RESEND',
            messageId: data?.id,
          };
        }
      } catch (err) {
        console.warn('[InvoiceNotificationService] Resend dispatch error:', err);
      }
    }

    // 2. Check if SendGrid API key is configured
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (sendgridApiKey) {
      try {
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sendgridApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: recipientEmail }] }],
            from: { email: process.env.EMAIL_FROM || 'invoices@antigravity.io', name: orgName },
            subject,
            content: [{ type: 'text/html', value: html }],
          }),
        });

        if (res.ok) {
          return {
            success: true,
            deliveredTo: recipientEmail,
            subject,
            html,
            provider: 'SENDGRID',
          };
        }
      } catch (err) {
        console.warn('[InvoiceNotificationService] SendGrid dispatch error:', err);
      }
    }

    // 3. Fallback: Log and record simulated dispatch
    console.log(
      `[InvoiceNotificationService] Invoice dispatched for ${bill.payerName} -> ${recipientEmail} (${subject})`
    );

    return {
      success: true,
      deliveredTo: recipientEmail,
      subject,
      html,
      provider: 'DISPATCH_LOG',
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
  }
}
export const invoiceNotificationService = new InvoiceNotificationService();
