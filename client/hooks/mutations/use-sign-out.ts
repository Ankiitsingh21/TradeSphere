"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { signOut } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import { useOrderStore } from "@/lib/order-store";

export function useSignOutMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearOrders = useOrderStore((state) => state.clearOrders);

  return useMutation({
    mutationFn: signOut,
    onSuccess: async () => {
      clearOrders();
      await queryClient.invalidateQueries({ queryKey: queryKeys.authUser });
      toast.success("Signed out");
      router.replace("/auth/sign-in");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not sign out. Try again."));
    },
  });
}
