'use client';

import { useState, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { PlusCircle, Loader2, ShieldCheck, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

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
import { useInitiatePaymentMutation } from '@/hooks/mutations/use-payment-mutation';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency } from '@/lib/format';

// Load Stripe outside component — prevents re-instantiation on render
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

const STRIPE_APPEARANCE = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#22d3ee',
    colorBackground: '#0a1424',
    colorText: '#e4efff',
    colorDanger: '#f43f5e',
    fontFamily: 'IBM Plex Sans, sans-serif',
    borderRadius: '8px',
  },
};

// Inner form — only rendered when clientSecret is ready
function StripePaymentForm({
  amount,
  onSuccess,
  onCancel,
}: {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Redirect URL after payment — not needed for card payments
        // but required by Stripe
        return_url: `${window.location.origin}/wallet`,
      },
      redirect: 'if_required', // Don't redirect for card payments
    });

    setIsProcessing(false);

    if (error) {
      toast.error(error.message ?? 'Payment failed');
      return;
    }

    // Payment succeeded — webhook will credit wallet
    // Show success and close. Wallet balance will update via 10s polling
    toast.success(`₹${amount.toLocaleString('en-IN')} payment initiated! Wallet will be credited shortly.`);
    onSuccess();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
        <p className="text-xs text-muted-foreground">Paying</p>
        <p className="font-display text-xl font-semibold text-cyan-400">
          {formatCurrency(amount)}
        </p>
      </div>

      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
        Secured by Stripe. Your card details never touch our servers.
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={handleSubmit}
          disabled={isProcessing || !stripe || !elements}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              Pay {formatCurrency(amount)}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function PaymentModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'amount' | 'payment'>('amount');
  const [amount, setAmount] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const initiateMutation = useInitiatePaymentMutation();

  const handleAmountSubmit = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    const result = await initiateMutation.mutateAsync(value);
    setClientSecret(result.clientSecret);
    setStep('payment');
  };

  const handleSuccess = useCallback(() => {
    setOpen(false);
    setStep('amount');
    setAmount('');
    setClientSecret(null);
    // Wallet balance will auto-update via existing 10s polling
    // But invalidate immediately for better UX
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.walletBalance });
    }, 3000); // Wait 3s for webhook to process
  }, [queryClient]);

  const handleClose = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setStep('amount');
      setAmount('');
      setClientSecret(null);
    }
    setOpen(isOpen);
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <PlusCircle className="h-4 w-4" />
          Add Funds
        </Button>
      </DialogTrigger>

      <DialogContent className="border-border/70 bg-slate-950 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'amount' ? 'Add Money to Wallet' : 'Complete Payment'}
          </DialogTitle>
          <DialogDescription>
            {step === 'amount'
              ? 'Funds are credited to your trading wallet after payment confirmation.'
              : 'Enter your card details to complete the transaction.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'amount' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-amount">Amount (₹)</Label>
              <Input
                id="add-amount"
                type="number"
                min={100}
                step={100}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000"
                onKeyDown={(e) => e.key === 'Enter' && handleAmountSubmit()}
              />
              <p className="text-xs text-muted-foreground">Minimum ₹100</p>
            </div>

            {/* Quick amount buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[1000, 5000, 10000, 25000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(String(preset))}
                  className="rounded-lg border border-border/60 bg-background/40 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-cyan-500/40 hover:text-cyan-400"
                >
                  ₹{preset.toLocaleString('en-IN')}
                </button>
              ))}
            </div>

            <Button
              onClick={handleAmountSubmit}
              disabled={initiateMutation.isPending || Number(amount) <= 0}
              className="w-full"
            >
              {initiateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparing payment...
                </>
              ) : (
                'Continue to Payment'
              )}
            </Button>
          </div>
        )}

        {step === 'payment' && clientSecret && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: STRIPE_APPEARANCE,
            }}
          >
            <StripePaymentForm
              amount={Number(amount)}
              onSuccess={handleSuccess}
              onCancel={() => {
                setStep('amount');
                setClientSecret(null);
              }}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}