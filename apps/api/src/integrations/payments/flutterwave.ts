import crypto from 'node:crypto';
import { env } from '../../config/env';
import type { PaymentGateway, InitializePaymentParams, InitializePaymentResult, PaymentWebhookEvent, GatewayVerifyResult } from './index';

export function getFlutterwaveGateway(): PaymentGateway | null {
  if (!env.FLUTTERWAVE_SECRET_KEY) return null;
  return new FlutterwaveGateway();
}

class FlutterwaveGateway implements PaymentGateway {
  private base = 'https://api.flutterwave.com/v3';

  private async post(path: string, body: Record<string, unknown>) {
    const res = await fetch(`${this.base}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as any;
    if (!res.ok || json.status !== 'success') {
      throw new Error(`Flutterwave error: ${json.message ?? res.statusText}`);
    }
    return json;
  }

  async init(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    const body: Record<string, unknown> = {
      tx_ref: params.reference,
      amount: (params.amount / 100).toFixed(2),
      currency: params.currency,
      redirect_url: params.returnUrl,
      customer: { email: params.customer.email, name: [params.customer.firstName, params.customer.lastName].filter(Boolean).join(' ') },
      customizations: { title: params.description, description: params.description },
    };
    if (params.method === 'MOBILE_MONEY') {
      body.payment_options = 'mobilemoneygh';
    }
    const json = await this.post('/payments', body);
    const data = json.data as any;
    return {
      provider: 'FLUTTERWAVE',
      checkoutUrl: data.link,
      paymentIntentId: data.id,
    };
  }

  async verifyWebhook(event: PaymentWebhookEvent): Promise<{ reference?: string; status: 'SUCCEEDED' | 'FAILED'; gatewayTransactionId?: string }> {
    const secret = env.FLUTTERWAVE_WEBHOOK_SECRET;
    if (secret) {
      const hash = crypto.createHmac('sha256', secret).update(event.rawBody).digest('hex');
      // Flutterwave sends verif-hash header, not signature in body.
      if (event.signature && event.signature !== hash) throw new Error('Invalid Flutterwave signature');
    }
    const payload = event.payload as any;
    const status = payload?.data?.status;
    const mapped = status === 'successful' ? 'SUCCEEDED' : status === 'failed' ? 'FAILED' : 'FAILED';
    return {
      reference: payload?.data?.tx_ref,
      status: mapped as never,
      gatewayTransactionId: payload?.data?.id,
    };
  }

  async refund(params: { reference: string; amount: number; currency: string; reason?: string }) {
    const json = await this.post('/refunds', {
      id: params.reference,
      amount: (params.amount / 100).toFixed(2),
    });
    return { gatewayRefundId: String((json.data as any)?.id ?? json.data) };
  }

  async verify(reference: string): Promise<GatewayVerifyResult> {
    const res = await fetch(`${this.base}/transactions/verify_by_reference/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${env.FLUTTERWAVE_SECRET_KEY}` },
    });
    const json = (await res.json()) as any;
    const status = json?.data?.status;
    const mapped = status === 'successful' ? 'SUCCEEDED' : status === 'failed' ? 'FAILED' : 'PENDING';
    return { status: mapped, gatewayTransactionId: json?.data?.id };
  }
}
