export interface OrderNotificationData {
  id: string | number;
  orderCode?: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  paymentMethod: 'UPI' | 'COD' | string;
  paymentStatus: 'completed' | 'pending' | string;
  deliveryDate?: string;
  itemsSummary?: string;
  orderStatus?: string;
}

export function buildOrderWhatsAppMessage(order: OrderNotificationData, siteOrigin = 'https://harihara-agro.vercel.app') {
  const trackingUrl = `${siteOrigin}/orders/${order.id}`;
  const isPaid = order.paymentStatus === 'completed' || order.paymentMethod === 'UPI';

  const paymentLine = isPaid
    ? `✅ *Payment Status:* Completed (₹${order.totalAmount} Paid via UPI)`
    : `💵 *Payment Status:* Cash on Delivery (Please keep ₹${order.totalAmount} ready at delivery)`;

  return [
    `🌼 *HARIHARA AGRO FARM - ORDER CONFIRMED* 🌼`,
    ``,
    `Hello *${order.customerName || 'Valued Customer'}*,`,
    `Your fresh marigold harvest order has been reserved!`,
    ``,
    `📦 *Order ID:* #${order.orderCode || order.id}`,
    order.itemsSummary ? `🌺 *Items:* ${order.itemsSummary}` : null,
    `💰 *Total Amount:* ₹${order.totalAmount}`,
    paymentLine,
    order.deliveryDate ? `📅 *Scheduled Delivery:* ${order.deliveryDate}` : null,
    ``,
    `🔗 *View Live Order & Receipt:*`,
    trackingUrl,
    ``,
    `Thank you for choosing Harihara Agro Farm! 🌱`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function getWhatsAppUrl(phone: string, message: string) {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
}
