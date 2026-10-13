import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export async function POST(request: Request) {
  try {
    // 1. Validate Secret from URL Search Params
    const secret = new URL(request.url).searchParams.get('secret');
    if (!process.env.PAYMENT_WEBHOOK_SECRET || secret !== process.env.PAYMENT_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse SMS Body & Extract Amount
    let body: { smsBody?: unknown } | null = null;
    try {
      body = (await request.json()) as { smsBody?: unknown };
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const smsBody = body?.smsBody;
    if (!smsBody || typeof smsBody !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing smsBody' }, { status: 400 });
    }

    // Robust regex to extract payment amount in standard Indian bank SMS formats (Rs, INR, ₹)
    const match = smsBody.match(/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d+)?)/i);
    if (!match || !match[1]) {
      return NextResponse.json({ error: 'No valid payment amount found' }, { status: 400 });
    }

    const cleanedAmount = match[1].replace(/,/g, '');
    const amount = Number(cleanedAmount);

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }

    // 3. Initialize Supabase Admin Client (bypassing RLS)
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Query oldest pending order with matching total_amount
    const { data: initialOrders, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, total_amount, payment_status, order_status, created_at')
      .in('payment_status', ['Pending', 'pending', 'unpaid', 'Unpaid'])
      .eq('total_amount', amount)
      .order('created_at', { ascending: true })
      .limit(1);

    let orders = initialOrders;

    if (fetchError) {
      console.error('Error fetching order:', fetchError);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    // Fallback: check case-insensitively with ilike if .in didn't find any
    if (!orders || orders.length === 0) {
      const fallbackResult = await supabaseAdmin
        .from('orders')
        .select('id, total_amount, payment_status, order_status, created_at')
        .ilike('payment_status', 'pending')
        .eq('total_amount', amount)
        .order('created_at', { ascending: true })
        .limit(1);

      if (fallbackResult.data && fallbackResult.data.length > 0) {
        orders = fallbackResult.data;
      }
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ error: 'No matching pending order found' }, { status: 404 });
    }

    const targetOrder = orders[0];

    // Update order status
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'Completed',
        order_status: 'Paid',
      })
      .eq('id', targetOrder.id);

    if (updateError) {
      console.error('Error updating order:', updateError);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    return NextResponse.json({ success: true, updatedAmount: amount });
  } catch (error) {
    console.error('Unexpected webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
