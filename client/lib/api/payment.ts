import { http } from '@/lib/api/http';
import { isRecord } from '@/lib/utils';

export async function initiatePayment(amount: number): Promise<{
  clientSecret: string;
  paymentId: string;
}> {
  const response = await http.post('/api/payments/initiate', { amount });
  const payload = response.data;

  if (isRecord(payload) && isRecord(payload.data)) {
    return {
      clientSecret: payload.data.clientSecret as string,
      paymentId: payload.data.paymentId as string,
    };
  }

  throw new Error('Invalid payment response');
}

export async function getPaymentHistory(): Promise<any[]> {
  const response = await http.get('/api/payments/history');
  const payload = response.data;

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
}