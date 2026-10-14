import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildOrderWhatsAppMessage } from '@/utils/whatsapp';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const phone = (order.customer_phone || order.phone || '').replace(/\D/g, '').slice(-10);
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://harihara-agro.vercel.app').replace(/\/$/, '');

    const messageText = buildOrderWhatsAppMessage(
      {
        id: order.id,
        orderCode: order.order_code,
        customerName: order.customer_name || order.name || 'Customer',
        customerPhone: phone,
        totalAmount: order.total_amount,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        deliveryDate: order.delivery_date,
      },
      siteUrl
    );

    // Optional: If FAST2SMS_API_KEY is configured in Vercel, send instant SMS automatically
    if (process.env.FAST2SMS_API_KEY && phone.length === 10) {
      await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'q',
          message: messageText,
          language: 'english',
          flash: 0,
          numbers: phone,
        }),
      }).catch((e) => console.error('SMS Dispatch Error:', e));
    }

    return NextResponse.json({
      sent: true,
      trackingUrl: `${siteUrl}/orders/${order.id}`,
      whatsappText: messageText,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
