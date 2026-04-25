"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";

import { useCurrentUserQuery } from "@/hooks/queries/use-current-user";
import type { User } from "@/lib/types";

interface AuthGuardProps {
  children: (user: User) => React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading, isError } = useCurrentUserQuery();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) setTimedOut(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading && !user) {
      const next = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/auth/sign-in?next=${next}`);
    }
  }, [isLoading, pathname, router, user]);

  useEffect(() => {
    if (isError) {
      const next = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/auth/sign-in?next=${next}`);
    }
  }, [isError, pathname, router]);

  if (timedOut) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-8 w-8 text-amber-400" />
        <p className="text-sm text-slate-400">
          Unable to reach the server. Check your connection.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
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