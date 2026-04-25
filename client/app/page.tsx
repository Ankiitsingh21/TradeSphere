"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bolt,
  Clock3,
  GitBranch,
  Layers3,
  Lock,
  RefreshCw,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";
import { useCurrentUserQuery } from "@/hooks/queries/use-current-user";

const FEATURES = [
  {
    icon: Zap,
    title: "Real-time Order Matching",
    description:
      "Heap-based price-time priority matching engine handles BUY/SELL instantly. Partial fills, QUEUED orders, and expiration all handled automatically.",
  },
  {
    icon: RefreshCw,
    title: "Live Price Streaming",
    description:
      "Server-Sent Events push stock price changes from every trade directly to your browser. No polling lag — prices update the moment a trade executes.",
  },
  {
    icon: GitBranch,
    title: "Microservices Architecture",
    description:
      "7 independent services — Auth, Wallet, Order, Stock, Portfolio, TradeEngine, Expiration — communicating via NATS Streaming with guaranteed delivery.",
  },
  {
    icon: Lock,
    title: "Optimistic Concurrency Control",
    description:
      "Every balance update, portfolio change, and order state transition is protected by OCC version checks. Zero double-spend risk under concurrent load.",
  },
  {
    icon: Wallet,
    title: "Reserved Balance Pattern",
    description:
      "Funds are locked at order placement, settled on trade execution, and released on expiry. Total balance always equals available + locked.",
  },
  {
    icon: ShieldCheck,
    title: "Idempotent Event Consumers",
    description:
      "Status guards and processed event checks ensure NATS message redelivery never causes duplicate settlements or incorrect state transitions.",
  },
];

const STATS = [
  { value: "7", label: "Microservices" },
  { value: "NATS", label: "Event Bus" },
  { value: "OCC", label: "Concurrency Model" },
  { value: "SSE", label: "Real-time Feed" },
];

export default function LandingPage() {
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUserQuery();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070c15]">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Bolt className="h-4 w-4 animate-pulse text-cyan-400" />
          Loading TradeSphere...
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#070c15] text-slate-100">
      {/* Background gradients */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-0 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-[500px] w-[500px] translate-x-1/4 rounded-full bg-blue-600/10 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 h-[400px] w-[400px] -translate-x-1/2 translate-y-1/4 rounded-full bg-teal-500/8 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-16">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
            <Bolt className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">
            TradeSphere
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/auth/sign-in"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            Sign In
          </Link>
          <Link
            href="/auth/sign-up"
            className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-all hover:brightness-110"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-6 pb-24 pt-20 text-center lg:px-16 lg:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,0.7)]" />
            Production-grade microservices trading platform
          </div>

          <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
            Execute trades at{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 bg-clip-text text-transparent">
              institutional speed
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            TradeSphere is a full-stack Zerodha-clone built on microservices, NATS
            event streaming, real-time SSE price feeds, and an in-memory order
            matching engine with heap-based price-time priority.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/auth/sign-up"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-8 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_0_40px_-12px_rgba(34,211,238,0.6)] transition-all hover:brightness-110 sm:w-auto"
            >
              Start Trading
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/sign-in"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-8 py-3.5 text-sm font-semibold text-slate-200 backdrop-blur transition-all hover:border-slate-600 hover:bg-slate-800/60 sm:w-auto"
            >
              Sign In
            </Link>
          </div>
        </motion.div>

        {/* Terminal preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative mx-auto mt-20 max-w-5xl"
        >
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-1.5 shadow-[0_48px_120px_-32px_rgba(0,0,0,0.8)] backdrop-blur">
            {/* Window chrome */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-700/40 bg-slate-950/80 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-amber-500/70" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
              </div>
              <div className="mx-auto font-mono text-xs text-slate-500">
                TradeSphere — Execution Terminal
              </div>
            </div>

            {/* Fake terminal content */}
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl p-3 lg:grid-cols-4">
              {[
                { label: "Wallet", value: "₹2,48,000", sub: "₹12,000 locked", color: "emerald" },
                { label: "Portfolio Value", value: "₹4,12,500", sub: "12 positions", color: "blue" },
                { label: "Day P&L", value: "+₹8,240", sub: "+2.04%", color: "emerald" },
                { label: "Orders", value: "47", sub: "2 pending", color: "amber" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-slate-700/40 bg-slate-900/60 p-3 text-left"
                >
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">
                    {stat.label}
                  </p>
                  <p
                    className={`mt-1 font-display text-lg font-semibold ${
                      stat.color === "emerald"
                        ? "text-emerald-300"
                        : stat.color === "blue"
                          ? "text-blue-300"
                          : stat.color === "amber"
                            ? "text-amber-300"
                            : "text-white"
                    }`}
                  >
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-slate-500">{stat.sub}</p>
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl p-3 pt-0">
              {[
                { symbol: "RELIANCE", price: "₹2,847.50", change: "+1.24%", up: true },
                { symbol: "TCS", price: "₹3,612.00", change: "+0.87%", up: true },
                { symbol: "INFY", price: "₹1,421.75", change: "-0.43%", up: false },
              ].map((stock) => (
                <div
                  key={stock.symbol}
                  className="flex items-center justify-between rounded-lg border border-slate-700/40 bg-slate-900/60 px-3 py-2"
                >
                  <div>
                    <p className="font-mono text-xs font-semibold text-slate-200">
                      {stock.symbol}
                    </p>
                    <p className="font-mono text-[11px] text-slate-400">{stock.price}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      stock.up
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-rose-500/15 text-rose-300"
                    }`}
                  >
                    {stock.change}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Glow under terminal */}
          <div className="pointer-events-none absolute -bottom-8 left-1/2 h-24 w-3/4 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
        </motion.div>
      </section>

      {/* Stats */}
      <section className="relative z-10 border-y border-slate-800/60 bg-slate-900/30 px-6 py-12 backdrop-blur lg:px-16">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 lg:grid-cols-4">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <p className="font-display text-3xl font-bold text-cyan-400 lg:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-slate-400">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 py-24 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="font-display text-3xl font-bold text-white lg:text-4xl">
              Built for production. Designed for interviews.
            </h2>
            <p className="mt-4 text-slate-400">
              Every architectural decision has a reason. Every pattern has a
              purpose.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 backdrop-blur transition-colors hover:border-cyan-500/30 hover:bg-slate-900/80"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 transition-colors group-hover:bg-cyan-500/25">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-display text-base font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture callout */}
      <section className="relative z-10 px-6 py-16 lg:px-16">
        <div className="mx-auto max-w-4xl rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 p-8 backdrop-blur lg:p-12">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="font-display text-2xl font-bold text-white lg:text-3xl">
                Event-driven all the way down
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Every significant action — user signup, order placement, trade
                execution, wallet settlement — publishes a NATS event. Services
                are fully decoupled and can scale independently.
              </p>
              <Link
                href="/auth/sign-up"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition-all hover:brightness-110"
              >
                Try the Terminal
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {[
                { step: "01", label: "User signs up", detail: "→ UserCreated event → Wallet auto-created" },
                { step: "02", label: "BUY order placed", detail: "→ Funds locked → TradeEngine queried" },
                { step: "03", label: "Trade matched", detail: "→ TradeExecuted event → Stock price updated via SSE" },
                { step: "04", label: "Settlement", detail: "→ Wallet settled → Portfolio updated → OCC verified" },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <span className="font-mono text-xs font-bold text-cyan-500">
                    {item.step}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {item.label}
                    </p>
                    <p className="text-xs text-slate-500">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 py-24 text-center lg:px-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-3xl font-bold text-white lg:text-4xl">
            Ready to trade?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-slate-400">
            Create an account, add funds to your wallet, and start placing market
            or limit orders — all in under a minute.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/auth/sign-up"
              className="flex items-center gap-2 rounded-xl bg-cyan-500 px-8 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_0_40px_-12px_rgba(34,211,238,0.5)] transition-all hover:brightness-110"
            >
              Create Account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/sign-in"
              className="flex items-center gap-2 rounded-xl border border-slate-700 px-8 py-3.5 text-sm font-semibold text-slate-300 transition-all hover:border-slate-600 hover:text-white"
            >
              Sign In
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/60 px-6 py-8 lg:px-16">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-slate-500">
            <Bolt className="h-4 w-4 text-cyan-500/60" />
            <span className="text-sm">TradeSphere</span>
          </div>
          <p className="text-xs text-slate-600">
            Built with Node.js · TypeScript · Prisma · PostgreSQL · NATS ·
            Kubernetes
          </p>
        </div>
      </footer>
    </div>
  );
}