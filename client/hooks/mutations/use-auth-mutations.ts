"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/lib/api/errors";
import { signIn, signUp } from "@/lib/api/auth";
import { queryKeys } from "@/lib/query-keys";
import type { AuthPayload } from "@/lib/types";
import { isSafePath } from "@/lib/utils";

interface AuthMutationPayload extends AuthPayload {
  next?: string;
}

function stripNext(payload: AuthMutationPayload): AuthPayload {
  const { next, ...authPayload } = payload;
  void next;
  return authPayload;
}

export function useAuthMutations() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleAuthSuccess = async (nextPath?: string) => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.authUser });
    toast.success("Welcome to TradeSphere");
    if (isSafePath(nextPath ?? null)) {
      router.replace(nextPath as string);
    } else {
      router.replace("/dashboard");
    }
  };

  const signInMutation = useMutation({
    mutationFn: (values: AuthMutationPayload) => signIn(stripNext(values)),
    onSuccess: (_, variables) => handleAuthSuccess(variables.next),
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Sign in failed"));
    },
  });

  const signUpMutation = useMutation({
    mutationFn: (values: AuthMutationPayload) => signUp(stripNext(values)),
    onSuccess: (_, variables) => handleAuthSuccess(variables.next),
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Sign up failed"));
    },
  });

  return {
    signInMutation,
    signUpMutation,
  };
}
