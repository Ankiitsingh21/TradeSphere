"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/lib/api/errors";
import {  withdrawMoney } from "@/lib/api/wallet";
import { queryKeys } from "@/lib/query-keys";

export function useWalletMutations() {
  const queryClient = useQueryClient();
  const withdrawMoneyMutation = useMutation({
    mutationFn: withdrawMoney,
    onSuccess: async (wallet) => {
      queryClient.setQueryData(queryKeys.walletBalance, wallet);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.walletBalance,
      });
      toast.success("Funds withdrawn successfully");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to withdraw money"));
    },
  });

  return {
    withdrawMoneyMutation,
  };
}
