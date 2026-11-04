import type { PaymentGateway, InitializePaymentParams, PaymentWebhookEvent } from './index';

/** Bank transfer: async confirmation, admin marks paid via verified record. */
export function getBankTransferGateway(): PaymentGateway {
  return {
    async init(params: InitializePaymentParams) {
      return {
        provider: 'BANK_TRANSFER',
        instruct: `Transfer ${(params.amount / 100).toFixed(2)} ${params.currency} using reference ${params.reference}. Your order is reserved while we await confirmation.`,
      };
    },
    async verifyWebhook(event: PaymentWebhookEvent) {
      const payload = event.payload as any;
      return { reference: payload?.reference, status: payload?.status === 'SUCCEEDED' ? 'SUCCEEDED' : 'FAILED' };
    },
    async refund() {
      throw new Error('Bank transfer refunds are processed manually.');
    },
    async verify() {
      return { status: 'PENDING' };
    },
  };
}

/** Cash on delivery: payment is not collected online; order is marked COD. */
export function getCodGateway(): PaymentGateway {
  return {
    async init(params: InitializePaymentParams) {
      return { provider: 'CASH_ON_DELIVERY', instruct: 'Pay cash upon delivery.' };
    },
    async verifyWebhook(event: PaymentWebhookEvent) {
      const payload = event.payload as any;
      return { reference: payload?.reference, status: payload?.status === 'SUCCEEDED' ? 'SUCCEEDED' : 'FAILED' };
    },
    async refund() {
      throw new Error('COD returns are refunded manually or in store credit.');
    },
    async verify() {
      return { status: 'PENDING' };
    },
  };
}
