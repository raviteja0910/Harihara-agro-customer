import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    if (payload?.data?.payment?.payment_status === 'SUCCESS') {
      const cfOrderId: string = payload.data.order?.order_id || '';
      // Extract the real Supabase row ID from "order_<dbOrderId>_<timestamp>"
      const parts = cfOrderId.split('_');
      const dbOrderId = parts.length >= 3 ? parts[1] : cfOrderId;

      const { error } = await supabase
        .from('orders')
        .update({
          payment_method: 'UPI',
          payment_status: 'completed',
        })
        .eq('id', dbOrderId);

      if (error) {
        console.error('Webhook Supabase Update Error:', error);
      }
    }

    return NextResponse.json({ status: 'OK' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
