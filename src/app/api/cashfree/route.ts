import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, orderId, customerName, customerPhone, customerEmail } = await req.json();

    const response = await fetch('https://sandbox.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.CASHFREE_APP_ID!,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
        'x-api-version': '2026-01-01',
      },
      body: JSON.stringify({
        order_amount: amount,
        order_currency: 'INR',
        order_id: orderId || `ORDER_${Date.now()}`,
        customer_details: {
          customer_id: customerPhone || 'GUEST',
          customer_phone: customerPhone || '9999999999',
          customer_name: customerName || 'Customer',
          customer_email: customerEmail || 'customer@hariharaagro.com',
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Error creating Cashfree order');

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
