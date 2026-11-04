import type { Request, Response } from 'express';
import { ok } from '../../lib/response';
import * as cartService from './cart.service';
import type { CartContext } from './cart.service';

function resolveContext(req: Request): CartContext {
  return {
    userId: req.user?.id,
    sessionId: (req.headers['x-session-id'] as string) || undefined,
  };
}

export async function get(req: Request, res: Response) {
  const context = resolveContext(req);
  const { subtotal, itemCount } = await cartService.cartSummary(context);
  const { items } = await cartService.getCart(context);
  return ok(res, { items, subtotal, itemCount });
}

export async function addItem(req: Request, res: Response) {
  const { productId, variantId, quantity } = req.body;
  const result = await cartService.addItem(resolveContext(req), productId, variantId, quantity);
  return ok(res, result, undefined, 201);
}

export async function updateItem(req: Request, res: Response) {
  const itemId = typeof req.params.id === 'string' ? req.params.id : '';
  const result = await cartService.updateItem(resolveContext(req), itemId, req.body.quantity);
  return ok(res, result);
}

export async function removeItem(req: Request, res: Response) {
  const itemId = typeof req.params.id === 'string' ? req.params.id : '';
  const result = await cartService.removeItem(resolveContext(req), itemId);
  return ok(res, result);
}

export async function clear(req: Request, res: Response) {
  const result = await cartService.clearCart(resolveContext(req));
  return ok(res, result);
}

export async function applyCoupon(req: Request, res: Response) {
  const result = await cartService.applyCoupon(resolveContext(req), req.body.code);
  return ok(res, result);
}

export async function mergeGuest(req: Request, res: Response) {
  const sessionId = (req.headers['x-session-id'] as string) || undefined;
  const result = await cartService.mergeGuestCart(req.user!.id, sessionId ?? '');
  return ok(res, result);
}
