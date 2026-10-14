import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { cfOrderId, dbOrderId } = await req.json();

    let rawId = (process.env.CASHFREE_APP_ID || process.env.NEXT_PUBLIC_CASHFREE_APP_ID || '').replace(/['"\s]/g, '');
    let rawSecret = (process.env.CASHFREE_SECRET_KEY || process.env.NEXT_PUBLIC_CASHFREE_SECRET_KEY || '').replace(/['"\s]/g, '');

    if (rawId.startsWith('cfsk_') && !rawSecret.startsWith('cfsk_')) {
      [rawId, rawSecret] = [rawSecret, rawId];
    }

    const isTestKey = rawId.toUpperCase().startsWith('TEST') || rawSecret.toLowerCase().includes('_test_');
    const baseUrl = isTestKey
      ? `https://sandbox.cashfree.com/pg/orders/${cfOrderId}`
      : `https://api.cashfree.com/pg/orders/${cfOrderId}`;

    // Verify order status directly with Cashfree (as shown in Cashfree docs/video at 07:30)
    const res = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-client-id': rawId,
        'x-client-secret': rawSecret,
        'x-api-version': '2022-09-01',
      },
    });

    const data = await res.json();

    // Extract actual database ID if not explicitly passed (from format: order_<dbOrderId>_<timestamp>)
    const targetDbId = dbOrderId || (cfOrderId?.startsWith('order_') ? cfOrderId.split('_')[1] : cfOrderId);

    if (res.ok && data.order_status === 'PAID' && targetDbId) {
      const { error } = await supabase
        .from('orders')
        .update({
          payment_method: 'UPI',
          payment_status: 'completed',
        })
        .eq('id', targetDbId);

      if (error) throw error;

      return NextResponse.json({ verified: true, payment_status: 'completed' });
    }

    return NextResponse.json({ verified: false, order_status: data.order_status || 'PENDING' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
