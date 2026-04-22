"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Bolt, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthMutations } from "@/hooks/mutations/use-auth-mutations";
import { useCurrentUserQuery } from "@/hooks/queries/use-current-user";
import { isSafePath } from "@/lib/utils";

interface AuthFormProps {
  mode: "sign-in" | "sign-up";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInMutation, signUpMutation } = useAuthMutations();
  const { data: user } = useCurrentUserQuery();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const nextPath = useMemo(() => {
    const raw = searchParams.get("next");
    return isSafePath(raw) ? raw : "/dashboard";
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      router.replace(nextPath);
    }
  }, [nextPath, router, user]);

  const isSignIn = mode === "sign-in";
  const activeMutation = isSignIn ? signInMutation : signUpMutation;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    activeMutation.mutate({
      email,
      password,
      next: nextPath,
    });
  };

  return (
    <div className="relative w-full max-w-[420px]">
      <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-14 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />

      <Card className="relative border-border/70 bg-slate-950/75">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Bolt className="h-5 w-5" />
            <p className="font-display text-base font-semibold">TradeSphere</p>
          </div>
          <CardTitle className="text-xl">
            {isSignIn
              ? "Sign in to your terminal"
              : "Create your trading account"}
          </CardTitle>
          <CardDescription>
            {isSignIn
              ? "Access live market data, order execution and wallet controls."
              : "Set up your account and start placing market and limit orders."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="trader@sphere.dev"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={4}
                maxLength={20}
                placeholder="••••••••"
                required
                autoComplete={isSignIn ? "current-password" : "new-password"}
              />
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Session secured by httpOnly JWT cookie
              </p>
            </div>

            <Button
              type="submit"
              className="w-full justify-center gap-1"
              disabled={activeMutation.isPending || !email || !password}
            >
              {activeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  {isSignIn ? "Sign In" : "Create Account"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            {isSignIn ? "New to TradeSphere?" : "Already have an account?"}{" "}
            <Link
              href={isSignIn ? "/auth/sign-up" : "/auth/sign-in"}
              className="font-medium text-primary hover:underline"
            >
              {isSignIn ? "Create one" : "Sign in"}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
