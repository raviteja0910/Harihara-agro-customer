import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');

    if (!webhookSecret) {
      console.error('Missing PAYMENT_WEBHOOK_SECRET');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { amount, utr } = body;

    // Check if amount is present and loosely matches a number
    if (amount === undefined || amount === null) {
      return NextResponse.json({ error: 'Missing amount' }, { status: 400 });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase Service Role Key');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Initialize Supabase Admin client bypassing RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Find the oldest pending order with the matching amount
    const { data: orders, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, total_amount, payment_status, created_at')
      .eq('payment_status', 'pending')
      .eq('total_amount', parsedAmount)
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching order:', fetchError);
      return NextResponse.json({ error: 'Failed to find matching order' }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ error: 'No matching pending order found' }, { status: 404 });
    }

    const targetOrder = orders[0];

    // Update the order to completed and store UTR if available
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ 
        payment_status: 'completed',
        utr: utr ? String(utr) : null
      })
      .eq('id', targetOrder.id);

    if (updateError) {
      console.error('Error updating order:', updateError);
      return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Order updated successfully',
      orderId: targetOrder.id
    }, { status: 200 });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
