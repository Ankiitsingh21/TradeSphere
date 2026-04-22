"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useCurrentUserQuery } from "@/hooks/queries/use-current-user";
import type { User } from "@/lib/types";

interface AuthGuardProps {
  children: (user: User) => React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading, isFetching, isError } = useCurrentUserQuery();

  useEffect(() => {
    if (!isLoading && !user) {
      const next = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/auth/sign-in?next=${next}`);
    }
  }, [isLoading, pathname, router, user]);

  if (isLoading || isFetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Connecting terminal...
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return null;
  }

  return <>{children(user)}</>;
}
