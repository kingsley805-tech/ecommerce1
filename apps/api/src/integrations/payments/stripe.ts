import { env } from '../../config/env';
import type { PaymentGateway, InitializePaymentParams, InitializePaymentResult, PaymentWebhookEvent, GatewayVerifyResult } from './index';

export function getStripeGateway(): PaymentGateway | null {
  if (!env.STRIPE_SECRET_KEY) return null;
  return new StripeGateway();
}

class StripeGateway implements PaymentGateway {
  private stripe: any;

  constructor() {
    // Lazily load the official SDK. It is optional based on config.
    this.stripe = null;
  }

  private async client() {
    if (!this.stripe) {
      const mod = await import('stripe');
      this.stripe = new mod.default(env.STRIPE_SECRET_KEY!);
    }
    return this.stripe;
  }

  async init(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    const stripe = await this.client();
    const customer = await stripe.customers.create({
      email: params.customer.email,
      name: [params.customer.firstName, params.customer.lastName].filter(Boolean).join(' '),
      metadata: { orderId: params.orderId, reference: params.reference },
    });
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(params.amount),
      currency: env.STRIPE_CURRENCY || params.currency.toLowerCase(),
      payment_method_types: ['card'],
      customer: customer.id,
      metadata: { orderId: params.orderId, reference: params.reference },
      description: params.description,
    });
    return {
      provider: 'STRIPE',
      clientSecret: (intent as any).client_secret,
      paymentIntentId: (intent as any).id,
    };
  }

  async verifyWebhook(event: PaymentWebhookEvent): Promise<{ reference?: string; status: 'SUCCEEDED' | 'FAILED'; gatewayTransactionId?: string }> {
    const stripe = await this.client();
    let parsed: any;
    try {
      parsed = stripe.webhooks.constructEvent(
        event.rawBody,
        event.signature ?? '',
        env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch {
      throw new Error('Invalid Stripe signature');
    }
    const intent = parsed.data?.object;
    const reference = intent?.metadata?.reference;
    const status = parsed.type === 'payment_intent.succeeded' ? 'SUCCEEDED' : 'FAILED';
    return { reference, status, gatewayTransactionId: intent?.payment_intent ?? intent?.id };
  }

  async refund(params: { reference: string; amount: number; currency: string; reason?: string }) {
    const stripe = await this.client();
    const intent = await stripe.paymentIntents.retrieve(params.reference);
    const refund = await stripe.refunds.create({
      payment_intent: (intent as any).id,
      amount: Math.round(params.amount),
      reason: params.reason === 'duplicate' ? 'duplicate' : 'requested_by_customer',
    });
    return { gatewayRefundId: (refund as any).id };
  }

  async verify(reference: string): Promise<GatewayVerifyResult> {
    const stripe = await this.client();
    const intent = await stripe.paymentIntents.retrieve(reference);
    const status = (intent as any).status;
    const mapped = status === 'succeeded' ? 'SUCCEEDED' : status === 'requires_payment_method' || status === 'canceled' ? 'FAILED' : 'PENDING';
    return { status: mapped, gatewayTransactionId: (intent as any).id };
  }
}
