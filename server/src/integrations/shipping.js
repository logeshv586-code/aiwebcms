import { prisma } from '../lib/prisma.js';
import { getEnabledConnections } from './service.js';

async function shiprocketToken(connection) {
  const response = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: connection.config?.email, password: connection.secrets?.password })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.token) throw new Error(data.message || `Shiprocket login failed (${response.status}).`);
  return data.token;
}

async function weightForItems(lines, connection) {
  const ids = [...new Set((lines || []).map((line) => line.productId).filter(Boolean))];
  if (!ids.length) return Number(connection.config?.defaultWeightKg || 0.5);
  const products = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, shippingInfo: true, variants: { select: { id: true, shippingInfo: true } } } });
  const map = new Map(products.map((product) => [product.id, product]));
  return Math.max(lines.reduce((sum, line) => {
    const product = map.get(line.productId);
    const variant = product?.variants?.find((item) => item.id === line.variantId);
    const info = variant?.shippingInfo || product?.shippingInfo || {};
    return sum + Number(info.weightKg || connection.config?.defaultWeightKg || 0.5) * Number(line.quantity || 1);
  }, 0), 0.01);
}

export async function quoteShipping({ items = [], address = {}, orderValue = 0, paymentMethod = 'PREPAID' }) {
  const [connection] = await getEnabledConnections('SHIPPING');
  const config = await prisma.storeConfig.findFirst();
  const commerce = config?.commerceSettings || {};
  if (!connection || connection.status !== 'CONNECTED') {
    const threshold = Number(commerce.freeShippingThreshold ?? 999);
    return { provider: 'FLAT_RATE', amount: Number(orderValue) >= threshold ? 0 : Number(commerce.shippingFee ?? 80), currency: config?.currency || 'INR', estimatedDays: commerce.estimatedDeliveryDays || null };
  }
  if (connection.provider === 'CUSTOM_API' && connection.config?.quoteUrl) {
    const response = await fetch(connection.config.quoteUrl, {
      method: 'POST', headers: { 'content-type': 'application/json', ...(connection.secrets?.bearerToken ? { Authorization: `Bearer ${connection.secrets.bearerToken}` } : {}) },
      body: JSON.stringify({ items, address, orderValue, currency: config?.currency || 'INR', paymentMethod })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `Shipping quote failed (${response.status}).`);
    const options = Array.isArray(data.options) ? data.options : [];
    const cheapest = options.length ? [...options].sort((a,b)=>Number(a.amount||0)-Number(b.amount||0))[0] : null;
    return { provider: 'CUSTOM_API', ...data, amount: data.amount !== undefined ? Number(data.amount) : Number(cheapest?.amount || 0), options };
  }
  if (connection.provider === 'SHIPROCKET') {
    if (!connection.config?.pickupPostcode || !address.postalCode) throw new Error('Pickup and delivery postcodes are required for Shiprocket quotes.');
    const token = await shiprocketToken(connection);
    const weight = await weightForItems(items, connection);
    const params = new URLSearchParams({ pickup_postcode: String(connection.config.pickupPostcode), delivery_postcode: String(address.postalCode), weight: String(weight), cod: String(paymentMethod === 'COD' ? 1 : 0) });
    const response = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/serviceability/?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `Shiprocket quote failed (${response.status}).`);
    const couriers = data?.data?.available_courier_companies || [];
    const options = couriers.slice(0, 8).map((item) => ({ courierId: item.courier_company_id, name: item.courier_name, amount: Number(item.freight_charge || item.rate || 0), estimatedDays: item.estimated_delivery_days || null }));
    const cheapest = options.length ? [...options].sort((a,b)=>Number(a.amount||0)-Number(b.amount||0))[0] : null;
    if (!cheapest) throw new Error('No Shiprocket courier is currently serviceable for this address.');
    return { provider: 'SHIPROCKET', currency: config?.currency || 'INR', amount: cheapest.amount, selected: cheapest, options };
  }
  const threshold = Number(commerce.freeShippingThreshold ?? 999);
  return { provider: 'FLAT_RATE', amount: Number(orderValue) >= threshold ? 0 : Number(commerce.shippingFee ?? 80), currency: config?.currency || 'INR' };
}

export async function createShipment(order) {
  const [connection] = await getEnabledConnections('SHIPPING');
  if (!connection || connection.status !== 'CONNECTED') throw new Error('No connected shipping provider is enabled.');
  if (connection.provider === 'CUSTOM_API' && connection.config?.createShipmentUrl) {
    const response = await fetch(connection.config.createShipmentUrl, {
      method: 'POST', headers: { 'content-type': 'application/json', ...(connection.secrets?.bearerToken ? { Authorization: `Bearer ${connection.secrets.bearerToken}` } : {}) },
      body: JSON.stringify(order)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `Shipment creation failed (${response.status}).`);
    return { provider: 'CUSTOM_API', ...data };
  }
  if (connection.provider === 'SHIPROCKET') {
    const token = await shiprocketToken(connection);
    const shipmentWeight = await weightForItems(order.items || [], connection);
    const address = order.shippingAddress || {};
    const customer = order.customerSnapshot || {};
    const payload = {
      order_id: order.orderNumber,
      order_date: new Date(order.createdAt).toISOString().slice(0, 10),
      pickup_location: connection.config?.pickupLocation || 'Primary',
      billing_customer_name: address.fullName || customer.name,
      billing_last_name: '', billing_address: address.line1, billing_address_2: address.line2 || '', billing_city: address.city,
      billing_pincode: address.postalCode, billing_state: address.state, billing_country: address.country,
      billing_email: customer.email, billing_phone: address.phone || customer.phone,
      shipping_is_billing: true,
      order_items: order.items.map((item) => ({ name: item.variantName ? `${item.productName} - ${item.variantName}` : item.productName, sku: item.sku || item.productId || item.id, units: item.quantity, selling_price: Number(item.unitPrice) })),
      payment_method: order.paymentMethod === 'COD' ? 'COD' : 'Prepaid', sub_total: Number(order.subtotal),
      length: Number(connection.config?.defaultLengthCm || 10), breadth: Number(connection.config?.defaultBreadthCm || 10), height: Number(connection.config?.defaultHeightCm || 10),
      weight: shipmentWeight
    };
    const response = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `Shiprocket shipment creation failed (${response.status}).`);
    return { provider: 'SHIPROCKET', providerOrderId: data.order_id, shipmentId: data.shipment_id, status: data.status, trackingNumber: data.awb_code || null, raw: data };
  }
  throw new Error('Enabled shipping provider does not support shipment creation.');
}
