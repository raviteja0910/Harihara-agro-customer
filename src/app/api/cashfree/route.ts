import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, orderId, customerName, customerPhone, customerEmail } = await req.json();

    // 1. Read keys and strip any accidental quotes, spaces, or hidden newlines
    let rawId = (process.env.CASHFREE_APP_ID || process.env.NEXT_PUBLIC_CASHFREE_APP_ID || '')
      .replace(/['"\s]/g, '');
    let rawSecret = (process.env.CASHFREE_SECRET_KEY || process.env.NEXT_PUBLIC_CASHFREE_SECRET_KEY || '')
      .replace(/['"\s]/g, '');

    if (!rawId || !rawSecret) {
      return NextResponse.json(
        { error: 'Missing Keys in Vercel! Ensure CASHFREE_APP_ID and CASHFREE_SECRET_KEY are set in Vercel Environment Variables.' },
        { status: 500 }
      );
    }

    // 2. Auto-correct if App ID and Secret Key were accidentally swapped
    if (rawId.startsWith('cfsk_') && !rawSecret.startsWith('cfsk_')) {
      const temp = rawId;
      rawId = rawSecret;
      rawSecret = temp;
    }

    // 3. Auto-detect Sandbox vs Production from key signature
    const isTestKey =
      rawId.toUpperCase().startsWith('TEST') ||
      rawSecret.toLowerCase().includes('_test_');

    const primaryEnv = isTestKey ? 'sandbox' : 'production';
    const fallbackEnv = isTestKey ? 'production' : 'sandbox';

    const urls = {
      sandbox: 'https://sandbox.cashfree.com/pg/orders',
      production: 'https://api.cashfree.com/pg/orders',
    };

    const cleanPhone = (customerPhone || '9999999999').replace(/\D/g, '').slice(-10) || '9999999999';
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://harihara-agro.vercel.app').replace(/\/$/, '');

    const orderPayload = {
      order_id: `order_${orderId || 'hh'}_${Date.now()}`,
      order_amount: Number(amount),
      order_currency: 'INR',
      customer_details: {
        customer_id: `cust_${cleanPhone}`,
        customer_name: (customerName || 'Harihara Customer').trim(),
        customer_email: customerEmail || 'orders@hariharaagro.com',
        customer_phone: cleanPhone,
      },
      order_meta: {
        return_url: `${siteUrl}/?order_id={order_id}&db_order_id=${orderId}`,
        notify_url: `${siteUrl}/api/webhook`,
      },
    };

    const callCashfree = async (env: 'sandbox' | 'production') => {
      const res = await fetch(urls[env], {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-client-id': rawId,
          'x-client-secret': rawSecret,
          'x-api-version': '2022-09-01',
        },
        body: JSON.stringify(orderPayload),
      });
      const data = await res.json();
      return { ok: res.ok, status: res.status, data, env };
    };

    // 4. Try primary environment first, then auto-fallback if authentication fails
    let attempt = await callCashfree(primaryEnv);

    if (!attempt.ok && attempt.data?.message?.toLowerCase().includes('authentication')) {
      const retryAttempt = await callCashfree(fallbackEnv);
      if (retryAttempt.ok) {
        attempt = retryAttempt;
      }
    }

    if (!attempt.ok) {
      const idPreview = `${rawId.slice(0, 5)}...${rawId.slice(-3)} (len:${rawId.length})`;
      const secretPreview = `${rawSecret.slice(0, 12)}... (len:${rawSecret.length})`;
      return NextResponse.json(
        {
          error: `${attempt.data?.message || 'Cashfree API Error'} | Checked ID=[${idPreview}], Secret=[${secretPreview}] on ${attempt.env.toUpperCase()}.`,
        },
        { status: attempt.status }
      );
    }

    return NextResponse.json({
      payment_session_id: attempt.data.payment_session_id,
      environment: attempt.env,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
