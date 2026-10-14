'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { buildOrderWhatsAppMessage, getWhatsAppUrl } from '@/utils/whatsapp';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!error && data) {
        setOrder(data);
      }
      setLoading(false);
    };

    fetchOrder();

    // Real-time subscription so status updates live when Admin changes it
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => setOrder(payload.new)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfaf5] flex items-center justify-center p-6">
        <p className="text-[#18360c] font-bold animate-pulse">Loading your harvest order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#fcfaf5] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-extrabold text-[#18360c] mb-2">Order Not Found</h1>
        <p className="text-sm text-gray-600 mb-6">Please check your order link or return to the store.</p>
        <a href="/" className="bg-[#18360c] text-white px-6 py-3 rounded-xl font-bold text-sm">
          Back to Harihara Agro Farm
        </a>
      </div>
    );
  }

  const isPaid = order.payment_status === 'completed';
  const isCOD = order.payment_method === 'COD';

  const whatsappMsg = buildOrderWhatsAppMessage({
    id: order.id,
    orderCode: order.order_code,
    customerName: order.customer_name || order.name || 'Customer',
    customerPhone: order.customer_phone || order.phone || '',
    totalAmount: order.total_amount,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    deliveryDate: order.delivery_date,
  });

  return (
    <div className="min-h-screen bg-[#fcfaf5] py-10 px-4">
      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-sm border border-[#e8e4db] overflow-hidden">
        {/* Top Header */}
        <div className="bg-[#18360c] text-white p-6 text-center">
          <span className="inline-block px-3 py-1 bg-[#254d15] text-[#d4e9c7] text-[11px] font-bold uppercase tracking-widest rounded-full mb-2">
            Live Order Status
          </span>
          <h1 className="text-2xl font-extrabold">Harihara Agro Farm</h1>
          <p className="text-xs text-gray-300 mt-1">
            Order #{order.order_code || String(order.id).slice(0, 8)}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Payment Status Banner */}
          <div
            className={`p-4 rounded-2xl border ${
              isPaid
                ? 'bg-green-50 border-green-200 text-green-900'
                : 'bg-[#fcf8ec] border-[#f0e1b9] text-[#7c5e2c]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">
                {isPaid ? 'Payment Completed' : isCOD ? 'Cash on Delivery' : 'Payment Pending'}
              </span>
              <span className="text-lg font-extrabold">₹{order.total_amount}</span>
            </div>
            <p className="text-xs leading-relaxed">
              {isPaid
                ? 'Your UPI payment has been verified and received. No payment is needed upon delivery.'
                : 'Please keep ₹' + order.total_amount + ' ready in cash or UPI when your harvest is delivered.'}
            </p>
          </div>

          {/* Order Details Breakdown */}
          <div className="bg-[#fcfaf5] rounded-2xl p-4 border border-[#ece6d8] space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Order Status</span>
              <span className="font-bold text-[#18360c] uppercase">
                {order.order_status || order.status || 'Confirmed'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment Mode</span>
              <span className="font-bold text-gray-800">{order.payment_method}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment Status</span>
              <span
                className={`font-bold uppercase ${
                  isPaid ? 'text-green-700' : 'text-amber-700'
                }`}
              >
                {order.payment_status}
              </span>
            </div>
            {order.delivery_date && (
              <div className="flex justify-between">
                <span className="text-gray-500">Delivery Date</span>
                <span className="font-bold text-gray-800">{order.delivery_date}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <a
              href={getWhatsAppUrl(order.customer_phone || order.phone || '', whatsappMsg)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full block text-center bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold py-3.5 rounded-2xl shadow-sm transition-all text-sm"
            >
              Send Receipt to My WhatsApp
            </a>
            <a
              href="/"
              className="w-full block text-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3.5 rounded-2xl transition-all text-sm"
            >
              Back to Store
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
