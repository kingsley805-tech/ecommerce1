import crypto from 'node:crypto';
import { env } from '../../config/env';
import type { PaymentGateway, InitializePaymentParams, InitializePaymentResult, PaymentWebhookEvent, GatewayVerifyResult } from './index';

export function getPaystackGateway(): PaymentGateway | null {
  if (!env.PAYSTACK_SECRET_KEY) return null;
  return new PaystackGateway();
}

class PaystackGateway implements PaymentGateway {
  private base = 'https://api.paystack.co';

  private async post(path: string, body: Record<string, unknown>) {
    const res = await fetch(`${this.base}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as any;
    if (!res.ok || !json.status) {
      throw new Error(`Paystack error: ${json.message ?? res.statusText}`);
    }
    return json;
  }

  async init(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    // Paystack supports card and mobile money (Ghana) transactions.
    const isMobileMoney = params.method === 'MOBILE_MONEY';
    const body: Record<string, unknown> = {
      email: params.customer.email,
      amount: Math.round(params.amount),
      currency: params.currency,
      reference: params.reference,
      callback_url: params.returnUrl,
      metadata: { orderId: params.orderId, custom_fields: [] },
    };
    if (isMobileMoney) {
      body.channel = 'mobile_money';
      if (params.customer.phone) body.mobile_money = { phone: params.customer.phone, provider: 'mtn' };
    }
    const json = await this.post('/transaction/initialize', body);
    return {
      provider: 'PAYSTACK',
      checkoutUrl: (json.data as any).authorization_url,
      mobileMoneyDetails: isMobileMoney ? { provider: 'mtn', phone: params.customer.phone ?? '' } : undefined,
    };
  }

  async verifyWebhook(event: PaymentWebhookEvent): Promise<{ reference?: string; status: 'SUCCEEDED' | 'FAILED'; gatewayTransactionId?: string }> {
    const secret = env.PAYSTACK_WEBHOOK_SECRET;
    if (secret) {
      const hash = crypto.createHmac('sha512', secret).update(event.rawBody).digest('hex');
      if (hash !== event.signature) throw new Error('Invalid Paystack signature');
    }
    const payload = event.payload as any;
    const reference = payload?.data?.reference;
    const status = payload?.event === 'charge.success' ? 'SUCCEEDED' : 'FAILED';
    return { reference, status, gatewayTransactionId: payload?.data?.id };
  }

  async refund(params: { reference: string; amount: number; currency: string; reason?: string }) {
    const json = await this.post('/refund', {
      transaction: params.reference,
      amount: Math.round(params.amount),
    });
    return { gatewayRefundId: (json.data as any)?.id };
  }

  async verify(reference: string): Promise<GatewayVerifyResult> {
    const res = await fetch(`${this.base}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
    });
    const json = (await res.json()) as any;
    const status = json?.data?.status;
    const mapped = status === 'success' ? 'SUCCEEDED' : status === 'failed' || status === 'abandoned' ? 'FAILED' : 'PENDING';
    return { status: mapped, gatewayTransactionId: json?.data?.id };
  }
}
