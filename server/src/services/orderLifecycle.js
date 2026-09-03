import { prisma } from '../lib/prisma.js';
import { httpError } from '../utils/http.js';

const RESTOCK_STATUSES = new Set(['CANCELLED', 'RETURNED', 'REFUNDED']);

async function restoreStock(tx, order) {
  if (order.stockRestored) return false;
  for (const item of order.items) {
    if (item.variantId) {
      await tx.productVariant.updateMany({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
    } else if (item.productId) {
      await tx.product.updateMany({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    }
  }
  if (order.couponCode) {
    await tx.coupon.updateMany({ where: { code: order.couponCode, usageCount: { gt: 0 } }, data: { usageCount: { decrement: 1 } } });
  }
  await tx.order.update({ where: { id: order.id }, data: { stockRestored: true } });
  return true;
}

export async function setOrderStatus(orderId, status, extra = {}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw httpError(404, 'Order not found.');
    if (RESTOCK_STATUSES.has(status)) await restoreStock(tx, order);
    return tx.order.update({ where: { id: orderId }, data: { status, ...extra }, include: { items: true } });
  });
}

export async function requestCustomerOrderAction({ orderNumber, email, userId, action, reason }) {
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: { items: true } });
  if (!order) throw httpError(404, 'Order not found.');
  const checkoutEmail = String(order.customerSnapshot?.email || '').toLowerCase();
  const authorized = (userId && order.userId === userId) || (email && checkoutEmail === String(email).toLowerCase());
  if (!authorized) throw httpError(404, 'Order not found.');
  if (action === 'CANCEL') {
    if (!['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status)) throw httpError(400, 'This order can no longer be cancelled from the storefront. Contact the store for help.');
    return prisma.order.update({ where: { id: order.id }, data: { status: 'CANCEL_REQUESTED', customerRequest: { type: 'CANCEL', reason: reason || '', requestedAt: new Date().toISOString() } }, include: { items: true } });
  }
  if (action === 'RETURN') {
    if (order.status !== 'DELIVERED') throw httpError(400, 'A return can be requested after the order is delivered.');
    return prisma.order.update({ where: { id: order.id }, data: { status: 'RETURN_REQUESTED', customerRequest: { type: 'RETURN', reason: reason || '', requestedAt: new Date().toISOString() } }, include: { items: true } });
  }
  throw httpError(400, 'Unsupported order request.');
}
