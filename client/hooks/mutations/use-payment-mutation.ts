'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { initiatePayment } from '@/lib/api/payment';
import { getApiErrorMessage } from '@/lib/api/errors';

export function useInitiatePaymentMutation() {
  return useMutation({
    mutationFn: initiatePayment,
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Payment initiation failed'));
    },
  });
}