import type { PaymentProvider, PaymentMethod } from '@commerce/shared-types';

export interface InitializePaymentParams {
  reference: string;
  amount: number; // minor units
  currency: string;
  method: PaymentMethod;
  provider: PaymentProvider;
  description: string;
  customer: { email: string; firstName?: string; lastName?: string; phone?: string };
  returnUrl: string;
  orderId: string;
}

export interface InitializePaymentResult {
  provider: PaymentProvider;
  checkoutUrl?: string;
  clientSecret?: string;
  paymentIntentId?: string;
  mobileMoneyDetails?: { provider: string; phone: string };
  instruct?: string;
}

export interface PaymentWebhookEvent {
  provider: PaymentProvider;
  eventId: string;
  type: string;
  payload: Record<string, unknown>;
  signature?: string;
  rawBody: string;
}

export interface GatewayVerifyResult {
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
  gatewayTransactionId?: string;
}

export interface PaymentGateway {
  init: (params: InitializePaymentParams) => Promise<InitializePaymentResult>;
  verifyWebhook: (event: PaymentWebhookEvent) => Promise<{
    reference?: string;
    status: 'SUCCEEDED' | 'FAILED';
    gatewayTransactionId?: string;
  }>;
  refund: (params: { reference: string; amount: number; currency: string; reason?: string }) => Promise<{ gatewayRefundId: string }>;
  verify: (reference: string) => Promise<GatewayVerifyResult>;
}

type GatewayRegistry = Record<PaymentProvider, PaymentGateway>;

function notConfigured(provider: PaymentProvider): PaymentGateway {
  const methods: PaymentGateway = {
    async init() {
      throw new Error(`${provider} gateway is not configured. Add merchant credentials to enable it.`);
    },
    async verifyWebhook() {
      throw new Error(`${provider} gateway is not configured.`);
    },
    async refund() {
      throw new Error(`${provider} gateway is not configured.`);
    },
    async verify() {
      return { status: 'PENDING' };
    },
  };
  return methods;
}

let registry: GatewayRegistry | null = null;

export async function getGateway(provider: PaymentProvider): Promise<PaymentGateway> {
  if (!registry) {
    const { getStripeGateway } = await import('./stripe');
    const { getPaystackGateway } = await import('./paystack');
    const { getFlutterwaveGateway } = await import('./flutterwave');
    const { getBankTransferGateway, getCodGateway } = await import('./manual');
    registry = {
      STRIPE: getStripeGateway() ?? notConfigured('STRIPE'),
      PAYPAL: notConfigured('PAYPAL'),
      PAYSTACK: getPaystackGateway() ?? notConfigured('PAYSTACK'),
      FLUTTERWAVE: getFlutterwaveGateway() ?? notConfigured('FLUTTERWAVE'),
      MOBILE_MONEY: getPaystackGateway() ?? getFlutterwaveGateway() ?? notConfigured('MOBILE_MONEY'),
      BANK_TRANSFER: getBankTransferGateway(),
      CASH_ON_DELIVERY: getCodGateway(),
    };
  }
  const gateway = registry[provider];
  if (!gateway) throw new Error(`Unsupported payment provider: ${provider}`);
  return gateway;
}

export function providerForMethod(method: PaymentMethod): PaymentProvider {
  switch (method) {
    case 'CARD':
      return 'STRIPE';
    case 'MOBILE_MONEY':
      return 'MOBILE_MONEY';
    case 'BANK_TRANSFER':
      return 'BANK_TRANSFER';
    case 'CASH_ON_DELIVERY':
      return 'CASH_ON_DELIVERY';
  }
}

export function isAsyncGateway(provider: PaymentProvider): boolean {
  return provider === 'BANK_TRANSFER' || provider === 'CASH_ON_DELIVERY';
}

export { notConfigured };
