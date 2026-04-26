'use client';

import { useState } from 'react';
import { HandCoins } from 'lucide-react';
import { toast } from 'sonner';
import type { UseMutationResult } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { WalletBalance } from '@/lib/types';
import { PaymentModal } from './payment-modal';

interface WalletActionsProps {
  withdrawMoneyMutation: UseMutationResult<WalletBalance, unknown, number, unknown>;
}

export function WalletActions({ withdrawMoneyMutation }: WalletActionsProps) {
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const submitWithdraw = () => {
    const value = Number(withdrawAmount);
    if (!Number.isFinite(value) || value <= 0) return;

    withdrawMoneyMutation.mutate(value, {
      onSuccess: () => setWithdrawAmount(''),
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Add Funds — now uses Stripe payment */}
      <PaymentModal />

      {/* Withdraw — unchanged */}
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="secondary" className="gap-1.5">
            <HandCoins className="h-4 w-4" />
            Withdraw
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw from wallet</DialogTitle>
            <DialogDescription>
              Withdrawals reduce available and total wallet balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="withdraw-amount">Amount</Label>
            <Input
              id="withdraw-amount"
              type="number"
              min={1}
              step={0.01}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="2500"
            />
            <Button
              onClick={submitWithdraw}
              disabled={withdrawMoneyMutation.isPending || Number(withdrawAmount) <= 0}
              variant="secondary"
              className="w-full"
            >
              {withdrawMoneyMutation.isPending ? 'Processing...' : 'Withdraw Money'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}