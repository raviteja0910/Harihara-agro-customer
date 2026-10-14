import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, orderId, customerName, customerPhone, customerEmail } = await req.json();

    const appId = (process.env.CASHFREE_APP_ID || '').trim();
    const secretKey = (process.env.CASHFREE_SECRET_KEY || '').trim();

    if (!appId || !secretKey) {
      return NextResponse.json(
        { error: 'API keys are missing in Vercel Environment Variables.' },
        { status: 500 }
      );
    }

    // Auto-detect environment from key prefix or env variable so it never mismatches
    const isSandbox = appId.startsWith('TEST') || process.env.NEXT_PUBLIC_CASHFREE_MODE === 'sandbox';
    const baseUrl = isSandbox
      ? 'https://sandbox.cashfree.com/pg/orders'
      : 'https://api.cashfree.com/pg/orders';

    // Exact structure from the Cashfree video (03:06 - 03:51)
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2022-09-01',
      },
      body: JSON.stringify({
        order_id: `order_${orderId}_${Date.now()}`, // Unique ID per attempt
        order_amount: Number(amount),
        order_currency: 'INR',
        customer_details: {
          customer_id: (customerPhone || 'guest_user').replace(/[^a-zA-Z0-9_-]/g, ''),
          customer_name: customerName || 'Harihara Customer',
          customer_email: customerEmail || 'orders@hariharaagro.com',
          customer_phone: customerPhone || '9999999999',
        },
        order_meta: {
          return_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://harihara-agro.vercel.app'}/?order_id={order_id}&db_order_id=${orderId}`,
          notify_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://harihara-agro.vercel.app'}/api/webhook`,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Cashfree rejected the request' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      payment_session_id: data.payment_session_id,
      environment: isSandbox ? 'sandbox' : 'production',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
