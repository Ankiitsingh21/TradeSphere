"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser } from "@/lib/api/auth";
import { queryKeys } from "@/lib/query-keys";

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: queryKeys.authUser,
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
    retry: false,
  });
}
