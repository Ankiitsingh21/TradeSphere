<div align="center">

<img src="https://img.shields.io/badge/TradeSphere-Pro%20Trading%20Terminal-00d4ff?style=for-the-badge&logo=bolt&logoColor=white" alt="TradeSphere" />

# ⚡ TradeSphere

### Production-Grade Microservices Trading Platform

<p align="center">
  A full-stack <strong>Zerodha-inspired</strong> trading terminal built on event-driven microservices,<br/>
  featuring a heap-based order matching engine, real-time SSE price feeds,<br/>
  optimistic concurrency control, a Stripe payment gateway, and a resilient payment retry system.
</p>

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=flat-square&logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![NATS](https://img.shields.io/badge/NATS-27AAE1?style=flat-square&logo=natsdotio&logoColor=white)](https://nats.io/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=flat-square&logo=stripe&logoColor=white)](https://stripe.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

<br/>

```
   ╔════════════════════════════════════════════════════════════════╗
   ║   8 Microservices  ·  NATS Streaming  ·  OCC Pattern         ║
   ║   Heap Order Book  ·  SSE Price Feed  ·  Stripe Payments     ║
   ╚════════════════════════════════════════════════════════════════╝
```

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-system-architecture)
- [Services](#-services-breakdown)
- [Event Flows](#-event-driven-flows)
- [ER Diagrams](#-entity-relationship-diagrams)
- [Order Matching Engine](#-order-matching-engine)
- [Concurrency & Safety](#-concurrency--safety-patterns)
- [API Reference](#-api-reference)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Testing](#-testing)
- [Frontend](#-frontend-terminal)

---

## 🌟 Overview

TradeSphere is a **production-grade microservices trading platform** that simulates the core infrastructure of a stock exchange terminal. Every architectural decision is deliberate, every pattern purposeful.

### What Makes It Production-Grade?

| Pattern | Implementation |
|---|---|
| **Event Sourcing** | Every state change publishes a NATS event — services are fully decoupled |
| **Optimistic Concurrency Control** | `version` field on all mutable records prevents double-spend under concurrent load |
| **Reserved Balance Pattern** | Funds locked at order placement, settled on execution, released on expiry |
| **Idempotent Consumers** | Status guards prevent NATS redelivery from causing duplicate settlements |
| **Payment Retry System** | Failed settlements re-queued via Bull with exponential back-off (max 3 retries) |
| **In-Memory Order Book** | Heap-based price-time priority matching engine — O(log n) per operation |
| **Real-time Price Feed** | Server-Sent Events push price changes the moment a trade executes |
| **Partial Fill Support** | Orders can match partially, queue the remainder, and expire gracefully |
| **Stripe Webhook Pattern** | Payments confirmed only via signed Stripe webhooks — no client-side trust |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         KUBERNETES CLUSTER (k3d / k3s)                          │
│                      NGINX Ingress  ─  sphere.dev                               │
│                                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  CLIENT  │  │   AUTH   │  │  WALLET  │  │  ORDER   │  │  STOCK   │          │
│  │ Next.js  │  │ Express  │  │ Express  │  │ Express  │  │ Express  │          │
│  │  :3000   │  │  :3000   │  │  :3000   │  │  :3000   │  │  :3000   │          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
│       │             │             │             │             │                  │
│  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐          │
│  │  React   │  │ MongoDB  │  │PostgreSQL│  │PostgreSQL│  │PostgreSQL│          │
│  │  Query   │  │  (auth)  │  │ (wallet) │  │ (order)  │  │ (stock)  │          │
│  │  Zustand │  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│  └──────────┘                                                                    │
│                                                                                  │
│  ┌──────────┐  ┌──────────┐                                                      │
│  │ PAYMENT  │  │PORTFOLIO │                                                      │
│  │ Express  │  │ Express  │                                                      │
│  │  :3000   │  │  :3000   │                                                      │
│  └────┬─────┘  └────┬─────┘                                                      │
│       │             │                                                             │
│  ┌────▼─────┐  ┌────▼─────┐                                                      │
│  │PostgreSQL│  │PostgreSQL│                                                      │
│  │(payment) │  │(portfolio│                                                      │
│  └──────────┘  └──────────┘                                                      │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                      NATS STREAMING  (Event Bus)                          │   │
│  │  UserCreated · BuyTrade · SellTrade · TradeExecuted                      │   │
│  │  TradeOrderCreated · ExpirationComplete · OrderCancelled                 │   │
│  │  PaymentFailure · SellPaymentFailure · StockPriceUpdated · Seed          │   │
│  │  PaymentInitiated · PaymentCompleted                                     │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────────┐         │
│  │  PORTFOLIO   │  │ TRADEENGINE  │  │          EXPIRATION             │         │
│  │   Express    │  │   Express    │  │  Bull Queue  +  Redis           │         │
│  │    :3000     │  │    :3000     │  │  3 Queues (order/pfail/sell)    │         │
│  └──────┬───────┘  └──────┬───────┘  └────────────────────────────────┘         │
│         │                 │                                                       │
│  ┌──────▼───────┐  ┌──────▼───────┐                                              │
│  │  PostgreSQL  │  │  PostgreSQL  │                                              │
│  │ (portfolio)  │  │(tradeengine) │                                              │
│  └──────────────┘  └──────────────┘                                              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Ingress Routing

```
sphere.dev
│
├── /api/users/**      → auth-srv:3000
├── /api/wallet/**     → wallet-srv:3000
├── /api/orders/**     → order-srv:3000
├── /api/stocks/**     → stock-srv:3000
├── /api/portfolio/**  → portfolio-srv:3000
├── /api/tradeengine/**→ tradeengine-srv:3000
├── /api/payments/**   → payment-srv:3000
└── /**                → client-srv:3000
```

---

## 🔧 Services Breakdown

### 1. 🔐 Auth Service
**Runtime:** Node.js + Express + TypeScript  
**Database:** MongoDB (via Mongoose)  
**Publishes:** `UserCreated`

Handles user registration and authentication using **scrypt password hashing** and **JWT sessions via httpOnly cookies**.

```
POST /api/users/sign-up      → Register, publish UserCreated
POST /api/users/sign-in      → Authenticate, set cookie session
POST /api/users/sign-out     → Clear session
GET  /api/users/current-user → Validate JWT, return user
```

---

### 2. 💰 Wallet Service
**Runtime:** Node.js + Express + TypeScript  
**Database:** PostgreSQL (via Prisma + PrismaPg)  
**Listens:** `UserCreated`, `PaymentCompleted`

Manages all fund operations. Every operation uses **Optimistic Concurrency Control** with a `version` field and up to **3 retry attempts** on conflict. When a Stripe payment completes, `PaymentCompleted` is consumed here to credit the wallet — the payment service never touches wallet internals.

```
PATCH /api/wallet/add-money      → Increment total + available balance
PATCH /api/wallet/withdraw       → Decrement available balance
PATCH /api/wallet/lock-money     → Move funds: available → locked
PATCH /api/wallet/settle-money   → Release locked: deduct settle, return savings
PATCH /api/wallet/credit-money   → Increment available (SELL proceeds)
GET   /api/wallet/check-balance  → Return all three balances
```

**Balance Invariant:**
```
total_balance = available_balance + locked_balance
```

---

### 3. 💳 Payment Service *(new)*
**Runtime:** Node.js + Express + TypeScript  
**Database:** PostgreSQL (via Prisma)  
**Publishes:** `PaymentInitiated`, `PaymentCompleted`  
**External:** Stripe API (PaymentIntents + Webhooks)

Handles real-money wallet top-ups via Stripe. The entire payment flow is event-driven — the client never directly credits the wallet. Only a **signed Stripe webhook** triggers `PaymentCompleted`, which the Wallet Service consumes.

```
POST /api/payments/initiate  → Create Stripe PaymentIntent, record PENDING payment
POST /api/payments/webhook   → Stripe webhook (raw body, signed) → publish PaymentCompleted
GET  /api/payments/history   → User's payment history (last 50)
```

**Payment State Machine:**
```
            ┌─────────┐
            │ PENDING │  ← created on /initiate
            └────┬────┘
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
 COMPLETED               FAILED
(webhook: succeeded)  (webhook: failed)
      │
      │ PaymentCompleted event
      ▼
 Wallet Service credits available_balance
```

**Why Webhooks?**  
Client-side confirmation can be intercepted or spoofed. Stripe signs every webhook with `STRIPE_WEBHOOK_SECRET`. The service verifies this signature via `stripe.webhooks.constructEvent()` — only Stripe can produce a valid signature, making this tamper-proof.

**Idempotency:**
- `PaymentIntent` is created with an `idempotencyKey = ${userId}-${amount}-${timestamp}` preventing duplicate charges on retry
- Webhook handler checks `payment.status === 'COMPLETED'` before crediting — safe against Stripe redelivery
- DB update uses `updateMany` with `version` OCC guard

---

### 4. 📋 Order Service
**Runtime:** Node.js + Express + TypeScript  
**Database:** PostgreSQL (via Prisma)  
**Publishes:** `TradeOrderCreated`, `BuyTrade`, `SellTrade`, `PaymentFailure`, `SellPaymentFailure`  
**Listens:** `TradeExecuted`, `TradeOrderCancelled`, `PaymentFailureExpirationComplete`, `SellPaymentFailureComplete`

The most complex service. Orchestrates the full order lifecycle across wallet → trade engine → settlement.

```
POST /api/orders/buy    → Lock funds → call TradeEngine → settle/queue
POST /api/orders/sell   → Verify holdings → call TradeEngine → credit/queue
```

**Order State Machine:**
```
                          ┌─────────┐
                          │ CREATED │
                          └────┬────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
          QUEUED          MATCHED           FAILED
         (→PENDING)      immediately     (trade engine
              │                            error)
              │ (TradeExecuted event)
              ▼
     ┌────────────────────────────────────┐
     │ settle/credit wallet               │
     ├───────────────┬────────────────────┤
     │   SUCCESS     │  PAYMENT_FAILURE   │
     │               │ (wallet unreachable│
     │  PARTIAL_FILLED│  → retry via Bull) │
     │               └────────────────────┤
     │  EXPIRED      │ PARTIAL_EXPIRED    │
     │               │                    │
     │  PARTIAL_FILLED_PAYMENT_FAILURE    │
     └────────────────────────────────────┘
```

---

### 5. 📈 Stock Service
**Runtime:** Node.js + Express + TypeScript  
**Database:** PostgreSQL (via Prisma)  
**Publishes:** `Seed`, `StockPriceUpdated`  
**Listens:** `TradeExecuted`

Seeds from **NSE India API** (NIFTY 500) on startup. Updates stock price on every trade execution and **broadcasts via Server-Sent Events**.

```
GET  /api/stocks/all            → All stocks (authenticated)
GET  /api/stocks/stream         → SSE price stream
GET  /api/stocks/symbol?symbol= → Single stock by symbol
POST /api/stocks/create         → Create stock (market must be open)
PATCH /api/stocks/update        → Manual price update
POST /api/stocks/toggle         → Toggle market open/closed
```

---

### 6. 📊 Portfolio Service
**Runtime:** Node.js + Express + TypeScript  
**Database:** PostgreSQL (via Prisma)  
**Listens:** `BuyTrade`, `SellTrade`

Maintains per-user stock holdings with **weighted average buy price** calculation and OCC-protected updates.

```
GET /api/portfolio/stocks   → All holdings for user
GET /api/portfolio/verify   → Verify user owns a symbol (used by order service)
```

---

### 7. ⚙️ TradeEngine Service
**Runtime:** Node.js + Express + TypeScript  
**Database:** PostgreSQL (via Prisma) — persists OrderBook entries  
**In-Memory:** Priority Queues (heaps) per symbol  
**Publishes:** `TradeExecuted`, `TradeOrderCancelled`  
**Listens:** `ExpirationComplete`, `Seed`

The core matching engine. Uses **two min/max heaps per symbol** — max-heap for buys (highest price first), min-heap for sells (lowest price first).

**Heap Comparators:**
```typescript
// BUY heap: highest price wins; tie → earliest time wins
compareBuy  = (a, b) => b.price.cmp(a.price) || a.createdAt - b.createdAt

// SELL heap: lowest price wins; tie → earliest time wins
compareSell = (a, b) => a.price.cmp(b.price) || a.createdAt - b.createdAt
```

---

### 8. ⏰ Expiration Service
**Runtime:** Node.js + TypeScript  
**Queue:** Bull (Redis-backed)  
**Listens:** `TradeOrderCreated`, `PaymentFailure`, `SellPaymentFailure`  
**Publishes:** `ExpirationComplete`, `PaymentFailureExpirationComplete`, `SellPaymentFailureComplete`

Three Bull queues handle different expiration scenarios. Uses `delay = expiresAt - now` so jobs fire exactly at expiry.

---

## 🔄 Event-Driven Flows

### 💳 Wallet Top-Up Flow (Stripe)

```
┌──────┐      ┌─────────┐     ┌─────────┐       ┌────────┐       ┌────────┐
│Client│      │ Payment │     │  Stripe │       │  NATS  │       │ Wallet │
│      │      │ Service │     │   API   │       │        │       │Service │
└──┬───┘      └────┬────┘     └────┬────┘       └───┬────┘       └───┬────┘
   │               │               │                │                │
   │ POST /initiate│               │                │                │
   │   {amount}    │               │                │                │
   ├──────────────►│               │                │                │
   │               │ PaymentIntent │                │                │
   │               │ .create()     │                │                │
   │               ├──────────────►│                │                │
   │               │◄──────────────┤                │                │
   │               │  clientSecret │                │                │
   │               │               │                │                │
   │               │ INSERT Payment│                │                │
   │               │ status=PENDING│                │                │
   │               │               │                │                │
   │               │ PaymentInitiated event         │                │
   │               ├───────────────────────────────►│                │
   │               │               │                │                │
   │ {clientSecret}│               │                │                │
   │◄──────────────┤               │                │                │
   │               │               │                │                │
   │ Card details  │               │                │                │
   │ entered in    │               │                │                │
   │ Stripe UI     │               │                │                │
   │──────────────────────────────►│                │                │
   │               │               │                │                │
   │               │               │ payment_intent │                │
   │               │ POST /webhook │  .succeeded    │                │
   │               │◄──────────────┤ (signed)       │                │
   │               │               │                │                │
   │               │ Verify sig    │                │                │
   │               │ updateMany    │                │                │
   │               │ (OCC guard)   │                │                │
   │               │               │                │                │
   │               │ PaymentCompleted event         │                │
   │               ├───────────────────────────────►│                │
   │               │               │                │  PaymentCompleted
   │               │               │                ├───────────────►│
   │               │               │                │                │
   │               │               │                │  credit wallet │
   │               │               │                │  (OCC, retry)  │
   │               │               │                │                │
```

---

### 🛒 BUY Order Lifecycle

```
┌──────┐   ┌───────┐   ┌────────┐   ┌──────────────┐   ┌────────┐   ┌──────────┐
│Client│   │ Order │   │ Wallet │   │ TradeEngine  │   │  NATS  │   │Portfolio │
│      │   │Service│   │Service │   │              │   │        │   │ Service  │
└──┬───┘   └───┬───┘   └───┬────┘   └──────┬───────┘   └───┬────┘   └────┬─────┘
   │           │           │               │               │              │
   │ POST /buy │           │               │               │              │
   ├──────────►│           │               │               │              │
   │           │PATCH lock │               │               │              │
   │           │  -money   │               │               │              │
   │           ├──────────►│               │               │              │
   │           │◄──────────┤               │               │              │
   │           │           │               │               │              │
   │           │ INSERT Order (CREATED)    │               │              │
   │           │           │               │               │              │
   │           │ POST /buy │               │               │              │
   │           ├───────────────────────────►               │              │
   │           │           │               │               │              │
   │           │           │           ┌───┴───┐           │              │
   │           │           │           │QUEUED?│           │              │
   │           │           │           └───┬───┘           │              │
   │           │           │               │               │              │
   │           │           │     TradeOrderCreated event   │              │
   │           │           │               ├──────────────►│              │
   │           │           │               │               │              │
   │           │ UPDATE    │               │       ExpirationService      │
   │           │ (PENDING) │               │       queues with delay      │
   │           │           │               │               │              │
   │           │           │           ┌───┴──────┐        │              │
   │           │           │           │ MATCHED? │        │              │
   │           │           │           └───┬──────┘        │              │
   │           │           │               │               │              │
   │           │PATCH settle               │               │              │
   │           │  -money   │               │               │              │
   │           ├──────────►│               │               │              │
   │           │           │               │               │              │
   │           │  ┌────────┴──────┐        │               │              │
   │           │  │ SUCCESS (201)?│        │               │              │
   │           │  └────────┬──────┘        │               │              │
   │           │           │               │               │              │
   │           │  UPDATE (SUCCESS)         │               │              │
   │           │           │               │               │              │
   │           │           │     BuyTrade event            │              │
   │           │           │               ├──────────────►│BuyTrade      │
   │           │           │               │               ├─────────────►│
   │           │           │               │               │   upsert     │
   │           │           │               │               │  Portfolio   │
   │           │           │               │               │  (OCC)       │
   │           │           │               │               │              │
   │           │  ┌────────┴──────┐        │               │              │
   │           │  │ FAILED (5xx)? │        │               │              │
   │           │  └────────┬──────┘        │               │              │
   │           │           │               │               │              │
   │           │ UPDATE (PAYMENT_FAILURE)  │               │              │
   │           │           │               │               │              │
   │           │           │  PaymentFailure event (cnt=1) │              │
   │           │           │               ├──────────────►│              │
   │           │           │               │               │              │
   │           │           │  ExpirationService queues retry              │
   │           │           │               │   (delay × cnt)              │
   │           │           │               │               │              │
   │           │           │  ← retry up to 3× →          │              │
   │           │           │               │               │              │
```

---

### 📤 SELL Order Lifecycle

```
┌──────┐   ┌───────┐   ┌──────────┐   ┌──────────────┐   ┌────────┐   ┌────────┐
│Client│   │ Order │   │Portfolio │   │ TradeEngine  │   │ Wallet │   │  NATS  │
│      │   │Service│   │ Service  │   │              │   │Service │   │        │
└──┬───┘   └───┬───┘   └────┬─────┘   └──────┬───────┘   └───┬────┘   └───┬────┘
   │           │            │                │               │             │
   │ POST /sell│            │                │               │             │
   ├──────────►│            │                │               │             │
   │           │ GET /verify│                │               │             │
   │           ├───────────►│                │               │             │
   │           │◄───────────┤                │               │             │
   │           │  {holdings}│                │               │             │
   │           │            │                │               │             │
   │           │ INSERT Order (CREATED)      │               │             │
   │           │            │                │               │             │
   │           │ POST /sell  │               │               │             │
   │           ├────────────────────────────►│               │             │
   │           │            │                │               │             │
   │           │            │            ┌───┴──────┐        │             │
   │           │            │            │ MATCHED? │        │             │
   │           │            │            └───┬──────┘        │             │
   │           │            │                │               │             │
   │           │            │    PATCH credit-money          │             │
   │           │            │                ├──────────────►│             │
   │           │            │                │◄──────────────┤             │
   │           │            │                │               │             │
   │           │            │  SellTrade event               │             │
   │           │            │                ├───────────────────────────► │
   │           │            │◄──────────────────────────────────SellTrade  │
   │           │            │  reduce qty /  │               │             │
   │           │            │  close position│               │             │
   │           │            │                │               │             │
   │           │ UPDATE (SUCCESS)            │               │             │
   │           │            │                │               │             │
```

---

### ⏰ Order Expiration Flow

```
┌──────────────┐      ┌───────┐      ┌──────────────┐      ┌───────┐
│  Expiration  │      │ NATS  │      │ TradeEngine  │      │ Order │
│   Service    │      │       │      │              │      │Service│
│(Bull + Redis)│      │       │      │              │      │       │
└──────┬───────┘      └───┬───┘      └──────┬───────┘      └───┬───┘
       │                  │                  │                  │
       │  [delay elapsed] │                  │                  │
       │                  │                  │                  │
       │ ExpirationComplete event            │                  │
       ├─────────────────►│                  │                  │
       │                  │ ExpirationComplete                  │
       │                  ├─────────────────►│                  │
       │                  │                  │                  │
       │                  │            ┌─────┴────┐             │
       │                  │            │ PENDING? │             │
       │                  │            └─────┬────┘             │
       │                  │                  │                  │
       │                  │           cancelledOrders.add()     │
       │                  │           updateMany EXPIRED (OCC)  │
       │                  │                  │                  │
       │                  │    OrderCancelled event             │
       │                  │◄─────────────────┤                  │
       │                  │ OrderCancelled   │                  │
       │                  ├──────────────────────────────────►  │
       │                  │                  │  settle-money    │
       │                  │                  │  (release all    │
       │                  │                  │   locked funds)  │
       │                  │                  │                  │
       │                  │            ┌─────┴────┐             │
       │                  │            │ PARTIAL? │             │
       │                  │            └─────┬────┘             │
       │                  │                  │                  │
       │                  │  cancelledOrders.add(-remaining)    │
       │                  │  updateMany EXPIRED (OCC)           │
       │                  │                  │                  │
       │                  │    OrderCancelled event             │
       │                  │◄─────────────────┤                  │
       │                  │ OrderCancelled   │                  │
       │                  ├──────────────────────────────────►  │
       │                  │                  │  settle-money    │
       │                  │                  │  (release        │
       │                  │                  │  unmatched qty   │
       │                  │                  │  * price only)   │
       │                  │                  │                  │
```

---

### 💸 Payment Failure Retry Flow

```
TradeExecuted → settle/credit wallet
│
├─ SUCCESS (201) → done
│
└─ FAILURE (non-201)
     │
     ├─ UPDATE Order: PAYMENT_FAILURE
     │
     ├─ Publish PaymentFailure { cnt: 1, expiresAt: now+10s }
     │
     └─ Expiration Service queues with delay
          │
          └─ PaymentFailureExpirationComplete fires
               │
               ├─ cnt ≤ 3: retry settle
               │    ├─ SUCCESS → UPDATE SUCCESS / PARTIAL_FILLED
               │    └─ FAIL   → Publish again with cnt+1
               │               (delay × cnt for exponential back-off)
               └─ cnt > 3: LOG CRITICAL ALERT (admin intervention)
```

---

## 🗃️ Entity Relationship Diagrams

### Auth Service — MongoDB

```
┌─────────────────────────────────────┐
│               User                  │
├─────────────────────────────────────┤
│  _id        ObjectId    PK          │
│  email      String      UNIQUE      │
│  password   String      (hashed)    │
│  createdAt  Date                    │
│  updatedAt  Date                    │
└─────────────────────────────────────┘
Password Hashing: scrypt(password, salt, 64)
Stored as: "<hex_hash>.<hex_salt>"
```

---

### Wallet Service — PostgreSQL

```
┌─────────────────────────────────────────────────┐
│                    wallet                        │
├─────────────────────────────────────────────────┤
│  id                TEXT        PK (uuid)         │
│  userId            TEXT        UNIQUE            │
│  total_balance     Decimal     DEFAULT 0.0       │
│  available_balance Decimal     DEFAULT 0.0       │
│  locked_balance    Decimal     DEFAULT 0.0       │
│  version           Int         DEFAULT 0  (OCC)  │
│  createdAt         DateTime                      │
│  updatedAt         DateTime    @updatedAt        │
└───────────────────────────┬─────────────────────┘
                            │ 1
                            │ has many
                            │ N
┌───────────────────────────▼─────────────────────┐
│                  transactions                    │
├─────────────────────────────────────────────────┤
│  id         TEXT        PK (uuid)               │
│  userId     TEXT                                │
│  walletId   TEXT        FK → wallet.id          │
│  type       Enum        ADD | WITHDRAW | CREDIT  │
│             │           DEBIT | LOCK | UNLOCK    │
│             │           SETTLE                   │
│  amount     Decimal                             │
│  createdAt  DateTime                            │
└─────────────────────────────────────────────────┘

Balance Invariant:
  total_balance = available_balance + locked_balance
```

---

### Payment Service — PostgreSQL *(new)*

```
┌──────────────────────────────────────────────────────┐
│                       Payment                        │
├──────────────────────────────────────────────────────┤
│  id                    TEXT          PK (uuid)       │
│  userId                TEXT          FK (logical)    │
│  amount                Decimal       Decimal(18,2)   │
│  status                Enum          PENDING         │
│                        │             COMPLETED       │
│                        │             FAILED          │
│  stripePaymentIntentId TEXT          UNIQUE          │
│  type                  Enum          TOPUP           │
│  version               Int           DEFAULT 0 (OCC) │
│  createdAt             DateTime                      │
│  updatedAt             DateTime      @updatedAt      │
│                                                      │
│  @@index([userId])                                   │
│  @@index([status])                                   │
└──────────────────────────────────────────────────────┘

Payment State Transitions:
  PENDING  →  COMPLETED  (webhook: payment_intent.succeeded)
  PENDING  →  FAILED     (webhook: payment_intent.payment_failed)

OCC Guard on status transition:
  updateMany({ where: { id, version }, data: { status, version: +1 } })
  if count === 0 → skip (already processed)
```

---

### Order Service — PostgreSQL

```
┌──────────────────────────────────────────────────────────────┐
│                           Order                              │
├──────────────────────────────────────────────────────────────┤
│  id               TEXT         PK (uuid)                     │
│  userId           TEXT         FK (logical → Auth.User)      │
│  symbol           TEXT         e.g. "RELIANCE"               │
│  type             Enum         BUY | SELL                    │
│  status           Enum         CREATED | PENDING | SUCCESS   │
│                   │            FAILED | EXPIRED              │
│                   │            PARTIAL_EXPIRED               │
│                   │            PARTIAL_FILLED                │
│                   │            PARTIAL_FILLED_PAYMENT_FAILURE│
│                   │            PAYMENT_FAILURE               │
│  totalQuantity    Decimal      requested shares              │
│  matchedQuantity  Decimal?     actually filled               │
│  price            Decimal      limit or market price         │
│  resolved         Decimal      settled amount (default 0)    │
│  expiresAt        DateTime?    for queued orders             │
│  version          Int          DEFAULT 0  (OCC)              │
│  createdAt        DateTime                                   │
│  updatedAt        DateTime     @updatedAt                    │
└──────────────────────────────────────────────────────────────┘
```

---

### Portfolio Service — PostgreSQL

```
┌────────────────────────────────────────────────────────────┐
│                        Portfolio                           │
├────────────────────────────────────────────────────────────┤
│  id            TEXT       PK (uuid)                        │
│  userId        TEXT       FK (logical → Auth.User)         │
│  symbol        TEXT       e.g. "TCS"                       │
│  avgBuyPrice   Decimal    Decimal(18,6)                    │
│  quantity      Decimal    Decimal(18,6)                    │
│  totalInvested Decimal    Decimal(18,6)                    │
│  version       Int        DEFAULT 0  (OCC)                 │
│  createdAt     DateTime                                    │
│  updatedAt     DateTime   @updatedAt                       │
│                                                            │
│  @@unique([userId, symbol])  ← one row per user per stock  │
│  @@index([userId])                                         │
│  @@index([symbol])                                         │
└────────────────────────────────────────────────────────────┘
```

---

### TradeEngine Service — PostgreSQL

```
┌────────────────────────────────────────────────────────────┐
│                        OrderBook                           │
├────────────────────────────────────────────────────────────┤
│  id               TEXT        PK (uuid)                    │
│  orderId          TEXT        UNIQUE (FK → Order.id)       │
│  userId           TEXT                                     │
│  symbol           TEXT        e.g. "INFY"                  │
│  totalQuantity    Decimal     Decimal(18,6)                │
│  matchedQuantity  Decimal?    Decimal(18,6)                │
│  price            Decimal     Decimal(18,6)                │
│  type             Enum        BUY | SELL                   │
│  status           Enum        PENDING | PARTIAL | MATCHED  │
│                   │           EXPIRED | CANCELLED          │
│  expiresAt        DateTime?                                │
│  version          Int         DEFAULT 0  (OCC)             │
│  createdAt        DateTime                                  │
│  updatedAt        DateTime    @updatedAt                   │
└────────────────────────────────────────────────────────────┘

In-Memory State (per symbol, recovered via Seed event on pod restart):
┌────────────────────────────────────────────────────────────┐
│  OrderBook Map<symbol, OrderBook>                          │
│  ├── buyHeap:         MaxHeap<OrderNode>                   │
│  ├── sellHeap:        MinHeap<OrderNode>                   │
│  ├── marketPrice:     Decimal  (seed price)                │
│  ├── seedSellQuantity: Decimal  (100,000 units)            │
│  ├── seedBuyQuantity:  Decimal  (100,000 units)            │
│  └── cancelledOrders: Set<string> (expired order IDs)     │
└────────────────────────────────────────────────────────────┘
```

---

### Stock Service — PostgreSQL

```
┌─────────────────────────────────────┐
│                  stock              │
├─────────────────────────────────────┤
│  id        TEXT      PK (uuid)      │
│  symbol    TEXT      UNIQUE         │
│  price     Decimal   Decimal(10,4)  │
│  version   Int       DEFAULT 0 (OCC)│
│  createdAt DateTime                 │
│  updatedAt DateTime  @updatedAt     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│             marketConfig            │
├─────────────────────────────────────┤
│  id        TEXT      PK (uuid)      │
│  isOpen    Boolean   market status  │
│  createdAt DateTime                 │
│  updatedAt DateTime  @updatedAt     │
└─────────────────────────────────────┘
```

---

### Complete Cross-Service Entity Relationship

```
Auth.User ─────────────────────────────────────────────────────────────┐
  │ userId (logical FK, no DB join across services)                    │
  │                                                                    │
  ├──── Wallet.wallet (1:1)                                           │
  │        └── Wallet.transactions (1:N)                              │
  │                                                                    │
  ├──── Payment.Payment (1:N) ← funded via Stripe                     │
  │        (PaymentCompleted event → Wallet.wallet credited)          │
  │                                                                    │
  ├──── Order.Order (1:N)                                             │
  │        └── TradeEngine.OrderBook (1:1 per orderId)                │
  │                                                                    │
  └──── Portfolio.Portfolio (1:N, one per symbol)                     │
             (symbol links to Stock.stock)                             │
                                                                       │
Stock.stock ──────────────────────────────────────────────────────────-┘
  symbol (shared key across services for stock identity)
```

---

## ⚙️ Order Matching Engine

### Matching Algorithm (Buy Side)

```
buy(orderId, userId, symbol, quantity, price):
│
├─ Case A: Sell heap EMPTY
│    ├─ Seed liquidity available AND buyPrice ≥ marketPrice?
│    │    └─ MATCHED with seed (no counterparty event needed)
│    └─ else → QUEUED (add to buy heap)
│
├─ Case B: Sell heap has orders
│    └─ Top seller price > buyPrice? → QUEUED
│
└─ Case C: Match loop
     while remainingQty > 0 AND sellHeap not empty:
       seller = sellHeap.front()
       ├─ seller is cancelled? → skip (dequeue)
       ├─ Exact match: seller.qty == remaining
       │    → seller: MATCHED, dequeue
       │    → Publish TradeExecuted (Sell)
       ├─ Buyer gets more: remaining > seller.qty
       │    → seller: MATCHED, dequeue
       │    → Publish TradeExecuted (Sell)
       │    → remainingQty -= seller.qty
       └─ Seller gets more: remaining < seller.qty
            → seller stays, qty reduced, re-enqueue
     │
     ├─ totalMatchedQty > 0 AND remainingQty > 0 → PARTIAL
     └─ totalMatchedQty > 0 AND remainingQty = 0 → MATCHED
```

### Price-Time Priority

```
BUY book (Max-Heap):
  ┌──────────────────────────────────┐
  │  Price ↓  │  Time ↑  │ Priority │
  ├──────────────────────────────────┤
  │  ₹3200    │  09:00   │  HIGHEST │  ← front()
  │  ₹3150    │  09:01   │          │
  │  ₹3150    │  09:05   │          │
  │  ₹3000    │  08:59   │  LOWEST  │
  └──────────────────────────────────┘

SELL book (Min-Heap):
  ┌──────────────────────────────────┐
  │  Price ↑  │  Time ↑  │ Priority │
  ├──────────────────────────────────┤
  │  ₹3100    │  09:02   │  HIGHEST │  ← front()
  │  ₹3100    │  09:07   │          │
  │  ₹3200    │  09:00   │          │
  │  ₹3500    │  08:58   │  LOWEST  │
  └──────────────────────────────────┘

Trade executes when:  BUY.price >= SELL.price (top of each heap)
Trade price:          seller's ask price (protects buyer's savings)
Release amount:       (buyPrice - tradePrice) × matchedQty
```

---

## 🔒 Concurrency & Safety Patterns

### Optimistic Concurrency Control

Every mutable record carries a `version` integer. Updates use `updateMany` with a version predicate:

```typescript
const result = await prisma.entity.updateMany({
  where: { id: entity.id, version: entity.version },  // ← OCC guard
  data: {
    ...changes,
    version: { increment: 1 },                        // ← bump version
  },
});

if (result.count === 0) {
  // Another instance won the race — retry or ack safely
}
```

Applied across: Wallet, Order, Portfolio, Stock, TradeEngine, **Payment**.

### Idempotency Guards

```typescript
// All NATS listeners check terminal states before processing
const TERMINAL = ["SUCCESS", "FAILED", "EXPIRED", "PARTIAL_EXPIRED",
                  "PAYMENT_FAILURE", "PARTIAL_FILLED_PAYMENT_FAILURE"];

if (TERMINAL.includes(order.status)) {
  msg.ack();  // Already processed — safe to skip
  return;
}
```

### Stripe Webhook Signature Verification

```typescript
// Only Stripe can produce a valid HMAC-SHA256 signature
event = stripe.webhooks.constructEvent(
  req.body,   // raw Buffer — must NOT pass through express.json()
  sig,        // stripe-signature header
  process.env.STRIPE_WEBHOOK_SECRET!,
);
// Any tampered payload throws — rejected before business logic runs
```

---

## 📡 API Reference

### Auth Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/users/sign-up` | ❌ | Register with email + password |
| `POST` | `/api/users/sign-in` | ❌ | Login, returns JWT cookie |
| `POST` | `/api/users/sign-out` | ❌ | Clear session |
| `GET` | `/api/users/current-user` | ❌ | Get current user from cookie |

### Wallet Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/wallet/check-balance` | ✅ | Total, available, locked balance |
| `PATCH` | `/api/wallet/add-money` | ✅ | Add funds directly (amount > 0) |
| `PATCH` | `/api/wallet/withdraw` | ✅ | Withdraw available funds |
| `PATCH` | `/api/wallet/lock-money` | Internal | Lock funds for order |
| `PATCH` | `/api/wallet/settle-money` | Internal | Release locked funds post-trade |
| `PATCH` | `/api/wallet/credit-money` | Internal | Credit sell proceeds |

### Payment Endpoints *(new)*
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/payments/initiate` | ✅ | Create Stripe PaymentIntent, get clientSecret |
| `POST` | `/api/payments/webhook` | Stripe | Signed Stripe webhook — confirms payment |
| `GET` | `/api/payments/history` | ✅ | Last 50 payments for user |

### Order Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/orders/buy` | ✅ | Place buy order (symbol, quantity, price?) |
| `POST` | `/api/orders/sell` | ✅ | Place sell order (symbol, quantity, price?) |

### Stock Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/stocks/all` | ✅ | All stocks with prices |
| `GET` | `/api/stocks/stream` | ❌ | SSE price stream |
| `GET` | `/api/stocks/symbol?symbol=` | ✅ | Single stock by symbol |

### Portfolio Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/portfolio/stocks` | ✅ | User's holdings |
| `GET` | `/api/portfolio/verify?userId=&symbol=` | Internal | Verify ownership |

---

## 🛠️ Tech Stack

### Backend
| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Node.js 18 + TypeScript | All services |
| Framework | Express.js v5 | HTTP server |
| ORM | Prisma v7 + PrismaPg | PostgreSQL access |
| MongoDB | Mongoose v9 | Auth user storage |
| Auth | jsonwebtoken + cookie-session | JWT via httpOnly cookie |
| Validation | express-validator | Request body validation |
| Messaging | node-nats-streaming | Event bus |
| Queuing | Bull + Redis | Delayed job scheduling |
| Password | Node.js crypto (scrypt) | Password hashing |
| **Payments** | **Stripe SDK** | **PaymentIntents + Webhooks** |

### Frontend
| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 15 (App Router) | React SSR/CSR |
| State | TanStack Query v5 | Server state, cache |
| Store | Zustand v5 | Order ledger (persisted) |
| HTTP | Axios | API calls |
| Realtime | EventSource (SSE) | Live price feed |
| UI | Tailwind CSS v3 | Styling |
| Components | Radix UI primitives | Accessible UI |
| Animation | Framer Motion | Page animations |
| Toast | Sonner | Notifications |
| **Payments** | **@stripe/react-stripe-js** | **Payment Element UI** |

### Infrastructure
| Layer | Technology | Purpose |
|---|---|---|
| Containers | Docker | Service packaging |
| Orchestration | Kubernetes (k3d) | Local cluster |
| Ingress | NGINX Ingress Controller | Routing + TLS |
| Dev Workflow | Skaffold | Hot-reload k8s dev |
| Secrets | Kubernetes Secrets | JWT key, Stripe keys |

---

## 📁 Project Structure

```
tradesphere/
│
├── auth/                    # Auth service (MongoDB)
├── wallet/                  # Wallet service (PostgreSQL)
│   └── src/events/listeners/
│       ├── user-created-listener.ts      # auto-creates wallet on signup
│       └── payment-completed-listener.ts # credits wallet on Stripe success
│
├── payment/                 # Payment service (PostgreSQL + Stripe) ← new
│   ├── src/
│   │   ├── controller/
│   │   │   ├── initiate-payment.ts  # POST /initiate → PaymentIntent
│   │   │   ├── webhook.ts           # POST /webhook → signature verify + event
│   │   │   └── get-history.ts       # GET /history
│   │   ├── events/publishers/
│   │   │   ├── payment-initiated-publisher.ts
│   │   │   └── payment-completed-publisher.ts
│   │   ├── stripe.ts                # Stripe SDK singleton
│   │   └── app.ts                   # raw body middleware for /webhook
│   ├── prisma/schema.prisma         # Payment model
│   └── Dockerfile
│
├── order/                   # Order service (PostgreSQL)
├── stock/                   # Stock service (PostgreSQL + SSE)
├── portfolio/               # Portfolio service (PostgreSQL)
├── tradeengine/             # Matching engine (PostgreSQL + in-memory)
├── expiration/              # Expiration service (Bull + Redis)
│
├── client/                  # Next.js frontend
│   ├── components/wallet/
│   │   ├── payment-modal.tsx    # Stripe Elements UI (card input)
│   │   └── wallet-actions.tsx   # Add Funds / Withdraw buttons
│   └── hooks/mutations/
│       └── use-payment-mutation.ts
│
└── infra/k8s/               # Kubernetes manifests
    ├── payment-depl.yaml           # Payment service + secrets
    └── payment-postgres-depl.yaml  # Payment PostgreSQL
```

---

## 🚀 Getting Started

### Prerequisites

```bash
kubectl   >= 1.28
k3d       >= 5.6
skaffold  >= 2.10
docker    >= 24.0
node      >= 18.0
```

### 1. Create Cluster

```bash
k3d cluster create tradesphere \
  --port "80:80@loadbalancer" \
  --port "443:443@loadbalancer"
```

### 2. Install NGINX Ingress

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml
```

### 3. Configure Host

```bash
echo "127.0.0.1 sphere.dev" | sudo tee -a /etc/hosts
```

### 4. Create Secrets

```bash
# JWT secret
kubectl create secret generic jwt-secret \
  --from-literal=JWT_KEY=your-super-secret-jwt-key

# Stripe secrets (get from stripe.com dashboard)
kubectl create secret generic stripe-secret \
  --from-literal=STRIPE_KEY=sk_test_... \
  --from-literal=STRIPE_WEBHOOK_SECRET=whsec_...
```

### 5. Configure Stripe Webhook (Local Development)

```bash
# Install Stripe CLI and forward webhook events to the payment service
stripe listen --forward-to http://sphere.dev/api/payments/webhook
```

### 6. Start Development

```bash
skaffold dev
```

---

## 🧪 Testing

```bash
cd wallet    && npm test   # 7 service files — all balance ops
cd order     && npm test   # buy/sell services + 3 listener files
cd portfolio && npm test   # buy/sell services + 2 listener files
cd stock     && npm test   # SSE manager — broadcast + heartbeat
```

### Test Coverage Areas

| Service | Test Files | Coverage |
|---|---|---|
| Wallet | addMoney, checkBalance, createWallet, creditMoney, lockMoney, settleMoney, withdraw | All success + failure paths |
| Order | buy-service, sell-service, order-cancelled-listener, trade-executed-listener, payment-failure-listeners | OCC, partial fills, payment failures, idempotency |
| Portfolio | buy/sell services, buy-trade-listener, sell-trade-listener | OCC, position close, error paths |
| Stock | sse-manager | Broadcast, heartbeat, disconnected client cleanup |

---

## 🖥️ Frontend Terminal

The Next.js client provides a **professional trading terminal UI** with:

### Stripe Payment Flow (Frontend)

```typescript
// 1. User clicks "Add Funds" → enters amount
// 2. POST /api/payments/initiate → returns clientSecret
// 3. Stripe Elements renders secure card form (PCI compliant)
// 4. User submits → stripe.confirmPayment() with redirect: 'if_required'
// 5. Stripe processes → fires payment_intent.succeeded webhook
// 6. Wallet credited → TanStack Query invalidates walletBalance
```

**Key design:** Card details never touch the server. Stripe Elements renders an iframe hosted on Stripe's domain. The backend only receives a `paymentIntentId` — never raw card data.

### Frontend Architecture

```
useTerminalData()                   ← single hook aggregates all data
  ├── useWalletBalanceQuery()       ← refetch every 10s
  ├── useStocksQuery()             ← refetch every 30s (+ SSE updates)
  ├── usePortfolioQuery()          ← refetch every 12s
  └── useOrderStore()              ← Zustand (persisted)
        └── usePendingOrderPoller()← reconcile every 3s if pending orders exist
              └── useStockStream() ← SSE connection lifecycle

PaymentModal (Stripe Elements)
  ├── useInitiatePaymentMutation() ← POST /api/payments/initiate
  └── Elements + PaymentElement   ← Stripe-hosted secure card input
```

---

## 📊 Key Decisions

| Decision | Rationale |
|---|---|
| **Stripe Webhooks over client confirmation** | Only signed server-to-server events can be trusted for wallet credits |
| **Payment as separate service** | Isolates Stripe credentials, PCI scope, and retry logic from core trading flow |
| **NATS Streaming over Kafka** | Simpler ops for this scale; built-in message replay |
| **Separate PostgreSQL per service** | True data isolation; each schema evolves independently |
| **MongoDB for Auth only** | Mongoose `pre('save')` hook for password hashing is elegant for a simple user document |
| **In-memory order book** | Nanosecond matching; O(log n) heap ops; state recovered via `Seed` event on pod restart |
| **Bull over NATS delays** | Precise delay scheduling (exact `expiresAt`); Redis persistence survives pod restarts |
| **OCC over DB locks** | Avoids deadlocks under high concurrency; scales horizontally |
| **SSE over WebSocket** | Unidirectional (price push only); works through HTTP/2; no handshake overhead |
| **Zustand for order ledger** | Persists across refreshes; works without a history API endpoint |

---

<div align="center">

**Built by [Ankit Singh](https://github.com/Ankiitsingh21)**

[![GitHub](https://img.shields.io/badge/GitHub-Ankiitsingh21-181717?style=flat-square&logo=github)](https://github.com/Ankiitsingh21)
[![Portfolio](https://img.shields.io/badge/Portfolio-Visit-00d4ff?style=flat-square)](https://portfolio-seven-gray-l6gk9z1m1w.vercel.app)
[![npm](https://img.shields.io/badge/npm-@showsphere/common-CB3837?style=flat-square&logo=npm)](https://www.npmjs.com/package/@showsphere/common)

```
Node.js · TypeScript · Next.js · Prisma · PostgreSQL · MongoDB
NATS Streaming · Bull/Redis · Kubernetes · Docker · Skaffold · Stripe
```

</div>