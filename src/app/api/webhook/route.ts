import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client for server-side updates
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; 
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    // 1. Read the incoming webhook payload from Cashfree
    const payload = await req.json();
    console.log("Cashfree Webhook Received:", payload);

    // 2. Check if the event is a successful payment
    if (payload.data && payload.data.payment && payload.data.payment.payment_status === 'SUCCESS') {
      const orderId = payload.data.order.order_id;
      
      // 3. Automatically update the database in the background
      const { error } = await supabase
        .from('orders')
        .update({ order_status: 'Paid' })
        .eq('id', orderId);
        
      if (error) {
        console.error("Supabase Update Error:", error);
        throw error;
      }
    }

    // 4. Always return 200 OK so Cashfree knows we received it
    return NextResponse.json({ status: 'Webhook processed successfully' }, { status: 200 });
    
  } catch (error: any) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
