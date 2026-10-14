import { load } from '@cashfreepayments/cashfree-js';

// Automatically matches Sandbox or Production based on your env variable
export const getCashfree = async () => {
  const mode = process.env.NEXT_PUBLIC_CASHFREE_MODE === 'production' ? 'production' : 'sandbox';
  return await load({ mode });
};
