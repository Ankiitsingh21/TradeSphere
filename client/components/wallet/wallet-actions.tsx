"use client";

import { useState } from "react";
import { HandCoins, PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UseMutationResult } from "@tanstack/react-query";
import type { WalletBalance } from "@/lib/types";

interface WalletActionsProps {
  addMoneyMutation: UseMutationResult<WalletBalance, unknown, number, unknown>;
  withdrawMoneyMutation: UseMutationResult<
    WalletBalance,
    unknown,
    number,
    unknown
  >;
}

export function WalletActions({
  addMoneyMutation,
  withdrawMoneyMutation,
}: WalletActionsProps) {
  const [addAmount, setAddAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const submitAdd = () => {
    const value = Number(addAmount);
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    addMoneyMutation.mutate(value, {
      onSuccess: () => setAddAmount(""),
    });
  };

  const submitWithdraw = () => {
    const value = Number(withdrawAmount);
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    withdrawMoneyMutation.mutate(value, {
      onSuccess: () => setWithdrawAmount(""),
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" className="gap-1.5">
            <PlusCircle className="h-4 w-4" />
            Add Funds
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add money to wallet</DialogTitle>
            <DialogDescription>
              Funds are immediately reflected in your available balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="add-amount">Amount</Label>
            <Input
              id="add-amount"
              type="number"
              min={1}
              step={0.01}
              value={addAmount}
              onChange={(event) => setAddAmount(event.target.value)}
              placeholder="5000"
            />
            <Button
              onClick={submitAdd}
              disabled={addMoneyMutation.isPending || Number(addAmount) <= 0}
              className="w-full"
            >
              {addMoneyMutation.isPending ? "Processing..." : "Add Money"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              onChange={(event) => setWithdrawAmount(event.target.value)}
              placeholder="2500"
            />
            <Button
              onClick={submitWithdraw}
              disabled={
                withdrawMoneyMutation.isPending || Number(withdrawAmount) <= 0
              }
              variant="secondary"
              className="w-full"
            >
              {withdrawMoneyMutation.isPending
                ? "Processing..."
                : "Withdraw Money"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
