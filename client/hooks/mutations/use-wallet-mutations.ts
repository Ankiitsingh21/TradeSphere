"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/lib/api/errors";
import { addMoney, withdrawMoney } from "@/lib/api/wallet";
import { queryKeys } from "@/lib/query-keys";

export function useWalletMutations() {
  const queryClient = useQueryClient();

  const addMoneyMutation = useMutation({
    mutationFn: addMoney,
    onSuccess: async (wallet) => {
      queryClient.setQueryData(queryKeys.walletBalance, wallet);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.walletBalance,
      });
      toast.success("Funds added successfully");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to add money"));
    },
  });

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
    addMoneyMutation,
    withdrawMoneyMutation,
  };
}
