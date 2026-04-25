<div align="center">

<img src="https://img.shields.io/badge/TradeSphere-Pro%20Trading%20Terminal-00d4ff?style=for-the-badge&logo=bolt&logoColor=white" alt="TradeSphere" />

# ⚡ TradeSphere

### Production-Grade Microservices Trading Platform

<p align="center">
  A full-stack <strong>Zerodha-inspired</strong> trading terminal built on event-driven microservices,<br/>
  featuring a heap-based order matching engine, real-time SSE price feeds,<br/>
  optimistic concurrency control, and a resilient payment retry system.
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
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

<br/>

```
   ╔══════════════════════════════════════════════════════════╗
   ║   7 Microservices  ·  NATS Streaming  ·  OCC Pattern   ║
   ║   Heap Order Book  ·  SSE Price Feed  ·  Bull Queues   ║
   ╚══════════════════════════════════════════════════════════╝
```

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-system-architecture)
- [Services](#-services-breakdown)
- [Event Flow](#-event-driven-flow)
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

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        KUBERNETES CLUSTER (k3d / k3s)                       │
│                    NGINX Ingress  ─  sphere.dev                              │
│                                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐  │
│  │  CLIENT  │   │   AUTH   │   │  WALLET  │   │  ORDER   │   │  STOCK   │  │
│  │ Next.js  │   │ Express  │   │ Express  │   │ Express  │   │ Express  │  │
│  │  :3000   │   │  :3000   │   │  :3000   │   │  :3000   │   │  :3000   │  │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘  │
│       │              │              │              │              │          │
│  ┌────▼─────┐   ┌────▼─────┐   ┌────▼─────┐   ┌────▼─────┐   ┌────▼─────┐  │
│  │          │   │ MongoDB  │   │PostgreSQL│   │PostgreSQL│   │PostgreSQL│  │
│  │  React   │   │  (auth)  │   │ (wallet) │   │ (order)  │   │ (stock)  │  │
│  │  Query   │   └──────────┘   └──────────┘   └──────────┘   └──────────┘  │
│  │  Zustand │                                                                │
│  └──────────┘                                                                │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    NATS STREAMING  (Event Bus)                        │   │
│  │    UserCreated · BuyTrade · SellTrade · TradeExecuted                │   │
│  │    TradeOrderCreated · ExpirationComplete · OrderCancelled           │   │
│  │    PaymentFailure · SellPaymentFailure · StockPriceUpdated · Seed   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────────────┐    │
│  │  PORTFOLIO   │   │ TRADEENGINE  │   │         EXPIRATION           │    │
│  │   Express    │   │   Express    │   │  Bull Queue  +  Redis        │    │
│  │    :3000     │   │    :3000     │   │  3 Queues (order/pfail/sell) │    │
│  └──────┬───────┘   └──────┬───────┘   └──────────────────────────────┘    │
│         │                  │                                                 │
│  ┌──────▼───────┐   ┌──────▼───────┐                                        │
│  │  PostgreSQL  │   │  PostgreSQL  │                                        │
│  │ (portfolio)  │   │(tradeengine) │                                        │
│  └──────────────┘   └──────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Ingress Routing

```
sphere.dev
│
├── /api/users/**     → auth-srv:3000
├── /api/wallet/**    → wallet-srv:3000
├── /api/orders/**    → order-srv:3000
├── /api/stocks/**    → stock-srv:3000
├── /api/portfolio/** → portfolio-srv:3000
├── /api/tradeengine/**→ tradeengine-srv:3000
└── /**               → client-srv:3000
```

---

## 🔧 Services Breakdown

### 1. 🔐 Auth Service
**Runtime:** Node.js + Express + TypeScript  
**Database:** MongoDB (via Mongoose)  
**Publishes:** `UserCreated`

Handles user registration and authentication using **scrypt password hashing** and **JWT sessions via httpOnly cookies**.

```
POST /api/users/sign-up    → Register, publish UserCreated
POST /api/users/sign-in    → Authenticate, set cookie session
POST /api/users/sign-out   → Clear session
GET  /api/users/current-user → Validate JWT, return user
```

---

### 2. 💰 Wallet Service
**Runtime:** Node.js + Express + TypeScript  
**Database:** PostgreSQL (via Prisma + PrismaPg)  
**Listens:** `UserCreated`

Manages all fund operations. Every operation uses **Optimistic Concurrency Control** with a `version` field and up to **3 retry attempts** on conflict.

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

### 3. 📋 Order Service
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

### 4. 📈 Stock Service
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

**SSE Client Management:**
```
sseClients (Set<Response>)
    ├── New connection → add to set, send heartbeat every 30s
    ├── TradeExecuted → updateMany(OCC) → broadcastStockPrice()
    └── Client disconnect → remove from set automatically
```

---

### 5. 📊 Portfolio Service
**Runtime:** Node.js + Express + TypeScript  
**Database:** PostgreSQL (via Prisma)  
**Listens:** `BuyTrade`, `SellTrade`

Maintains per-user stock holdings with **weighted average buy price** calculation and OCC-protected updates.

```
GET /api/portfolio/stocks   → All holdings for user
GET /api/portfolio/verify   → Verify user owns a symbol (used by order service)
```

**Average Price Calculation on BUY:**
```
newAvgPrice = (oldTotal + buyPrice × qty) / (oldQty + qty)
```

**On SELL (close position):**
```
profit = (sellPrice - avgBuyPrice) × quantity
```

---

### 6. ⚙️ TradeEngine Service
**Runtime:** Node.js + Express + TypeScript  
**Database:** PostgreSQL (via Prisma) — persists OrderBook entries  
**In-Memory:** Priority Queues (heaps) per symbol  
**Publishes:** `TradeExecuted`, `TradeOrderCancelled`  
**Listens:** `ExpirationComplete`, `Seed`

The core matching engine. Uses **two min/max heaps per symbol** — max-heap for buys (highest price first), min-heap for sells (lowest price first).

```
POST /api/tradeengine/buy    → Match against sell book
POST /api/tradeengine/sell   → Match against buy book
```

**Heap Comparators:**
```typescript
// BUY heap: highest price wins; tie → earliest time wins
compareBuy  = (a, b) => b.price.cmp(a.price) || a.createdAt - b.createdAt

// SELL heap: lowest price wins; tie → earliest time wins
compareSell = (a, b) => a.price.cmp(b.price) || a.createdAt - b.createdAt
```

**Seed Liquidity:**  
On startup, 100,000 seed units per symbol provide initial liquidity at market price — enabling the first real trades without needing matching counterparties.

---

### 7. ⏰ Expiration Service
**Runtime:** Node.js + TypeScript  
**Queue:** Bull (Redis-backed)  
**Listens:** `TradeOrderCreated`, `PaymentFailure`, `SellPaymentFailure`  
**Publishes:** `ExpirationComplete`, `PaymentFailureExpirationComplete`, `SellPaymentFailureComplete`

Three Bull queues handle different expiration scenarios. Uses `delay` = `expiresAt - now` so jobs fire exactly at expiry.

```
Queue 1: order:expiration            → fires ExpirationComplete
Queue 2: paymentfailure:expiration   → retry BUY wallet settle
Queue 3: Sellpaymentfailure:expiration → retry SELL wallet credit
```

---

## 🔄 Event-Driven Flow

### Complete BUY Order Lifecycle

```
User → POST /api/orders/buy
│
├─ 1. Lock funds in wallet
│      PATCH /api/wallet/lock-money
│      (funds: available → locked)
│
├─ 2. Create Order record (status: CREATED)
│
├─ 3. Call TradeEngine
│      POST /api/tradeengine/buy
│      │
│      ├── MATCHED ──────────────────────────────────────┐
│      │   (seller found in heap)                        │
│      │                                                 │
│      ├── PARTIAL ────────────────────────────────────┐ │
│      │   (partial fill, remainder queued)            │ │
│      │                                               │ │
│      └── QUEUED ──────┐                              │ │
│                        │                              │ │
│                 Publish TradeOrderCreated             │ │
│                        │                              │ │
│               Expiration Service                      │ │
│                 adds to Bull queue                    │ │
│                 (delay = expiresAt)                   │ │
│                        │                              │ │
│              [order expires]                          │ │
│              ExpirationComplete                       │ │
│              → TradeEngine cancels                    │ │
│              → OrderCancelled pub                     │ │
│              → Order: EXPIRED                         │ │
│              → Wallet: release locked funds           │ │
│                                                       │ │
│                 4. Settle wallet ◄────────────────────┘ │
│                    settle-money                         │
│                    (locked → deducted, savings returned)│
│                                                         │
│                 Publish TradeExecuted ◄─────────────────┘
│                 (to Order + Stock + Portfolio services)
│
├─ 5. Order Service receives TradeExecuted
│      → settle-money API call
│      ├── SUCCESS → Update Order: SUCCESS
│      │            Publish BuyTrade
│      └── FAIL    → Update Order: PAYMENT_FAILURE
│                    Publish PaymentFailure (cnt=1)
│                    Expiration adds to retry queue
│                    (retries up to 3x with back-off)
│
├─ 6. Portfolio Service receives BuyTrade
│      → Upsert Portfolio (OCC protected)
│      → Recalculate avgBuyPrice
│
└─ 7. Stock Service receives TradeExecuted
       → Update price (OCC updateMany)
       → Broadcast via SSE to all connected clients
```

### Complete SELL Order Lifecycle

```
User → POST /api/orders/sell
│
├─ 1. Verify holdings (portfolio verify endpoint)
│
├─ 2. Call TradeEngine
│      POST /api/tradeengine/sell
│      → Match against buy heap
│
├─ 3. Credit wallet on match
│      PATCH /api/wallet/credit-money
│      (total + available += tradePrice × matchedQty)
│
├─ 4. Publish SellTrade → Portfolio Service
│      → sell() service: reduce quantity
│      → If qty reaches 0: deleteMany (OCC) to close position
│
└─ 5. If credit fails → SellPaymentFailure retry flow
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
│                                                              │
│  @@index([userId])                                           │
│  @@index([status])                                           │
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

In-Memory State (per symbol, lost on pod restart → recovered via Seed event):
┌────────────────────────────────────────────────────────────┐
│  OrderBook Map<symbol, OrderBook>                          │
│  ├── buyHeap:   MaxHeap<OrderNode>   (price DESC, time ASC)│
│  ├── sellHeap:  MinHeap<OrderNode>   (price ASC,  time ASC)│
│  ├── marketPrice: Decimal            (seed price)          │
│  ├── seedSellQuantity: Decimal       (100,000 units)       │
│  ├── seedBuyQuantity:  Decimal       (100,000 units)       │
│  └── cancelledOrders:  Set<string>  (expired order IDs)   │
└────────────────────────────────────────────────────────────┘
```

---

### Stock Service — PostgreSQL

```
┌─────────────────────────────────────────┐
│                  stock                  │
├─────────────────────────────────────────┤
│  id        TEXT      PK (uuid)          │
│  symbol    TEXT      UNIQUE             │
│  price     Decimal   Decimal(10,4)      │
│  version   Int       DEFAULT 0  (OCC)   │
│  createdAt DateTime                     │
│  updatedAt DateTime  @updatedAt         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│             marketConfig                │
├─────────────────────────────────────────┤
│  id        TEXT      PK (uuid)          │
│  isOpen    Boolean   market status      │
│  createdAt DateTime                     │
│  updatedAt DateTime  @updatedAt         │
└─────────────────────────────────────────┘
```

---

### Complete Cross-Service Entity Relationship

```
Auth.User ─────────────────────────────────────────────────┐
  │ userId (logical FK, no DB join across services)        │
  │                                                        │
  ├──── Wallet.wallet (1:1)                               │
  │        └── Wallet.transactions (1:N)                  │
  │                                                        │
  ├──── Order.Order (1:N)                                 │
  │        └── TradeEngine.OrderBook (1:1 per orderId)    │
  │                                                        │
  └──── Portfolio.Portfolio (1:N, one per symbol)         │
             (symbol links to Stock.stock)                 │
                                                          │
Stock.stock ─────────────────────────────────────────────-┘
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
       │
       ├─ seller is cancelled? → skip (dequeue)
       │
       ├─ Exact match: seller.qty == remaining
       │    → seller: MATCHED, dequeue
       │    → Publish TradeExecuted (Sell)
       │
       ├─ Buyer gets more: remaining > seller.qty
       │    → seller: MATCHED, dequeue
       │    → Publish TradeExecuted (Sell)
       │    → remainingQty -= seller.qty
       │
       └─ Seller gets more: remaining < seller.qty
            → seller stays, qty reduced, re-enqueue
            → (no TradeExecuted yet — seller still PENDING)
     │
     ├─ totalMatchedQty > 0 AND remainingQty > 0 → PARTIAL
     │    └─ Queue remaining as "{orderId}-remaining"
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
// Pattern used across Wallet, Order, Portfolio, Stock, TradeEngine
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

### Payment Retry System

```
TradeExecuted → settle/credit wallet
│
├─ SUCCESS (201) → done
│
└─ FAILURE (non-201)
     │
     ├─ Publish PaymentFailure { cnt: 1, expiresAt: now+10s }
     │
     └─ Expiration Service queues with delay
          │
          └─ PaymentFailureExpirationComplete fires
               │
               ├─ cnt ≤ 3: retry settle
               │    ├─ SUCCESS → order: SUCCESS / PARTIAL_FILLED
               │    └─ FAIL   → Publish again with cnt+1
               │               (delay *= cnt for back-off)
               └─ cnt > 3: LOG CRITICAL ALERT (admin intervention)
```

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
| `PATCH` | `/api/wallet/add-money` | ✅ | Add funds (amount > 0) |
| `PATCH` | `/api/wallet/withdraw` | ✅ | Withdraw available funds |
| `PATCH` | `/api/wallet/lock-money` | Internal | Lock funds for order |
| `PATCH` | `/api/wallet/settle-money` | Internal | Release locked funds post-trade |
| `PATCH` | `/api/wallet/credit-money` | Internal | Credit sell proceeds |

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

### Infrastructure
| Layer | Technology | Purpose |
|---|---|---|
| Containers | Docker | Service packaging |
| Orchestration | Kubernetes (k3d) | Local cluster |
| Ingress | NGINX Ingress Controller | Routing + TLS |
| Dev Workflow | Skaffold | Hot-reload k8s dev |
| Secrets | Kubernetes Secrets | JWT key |

---

## 📁 Project Structure

```
tradesphere/
│
├── auth/                    # Auth service (MongoDB)
│   ├── src/
│   │   ├── controller/      # signIn, signOut, signUp controllers
│   │   ├── events/          # UserCreatedPublisher
│   │   ├── middlewares/     # Password hashing (scrypt)
│   │   ├── models/          # User (Mongoose)
│   │   ├── routes/          # /api/users/**
│   │   └── services/        # sign-in-service, sign-up
│   └── Dockerfile
│
├── wallet/                  # Wallet service (PostgreSQL)
│   ├── src/
│   │   ├── controller/      # add, withdraw, lock, settle, credit
│   │   ├── events/          # UserCreatedListener → createWallet
│   │   └── services/        # addMoney, lockMoney, settlemoney, etc.
│   ├── prisma/schema.prisma # wallet + transactions models
│   └── Dockerfile
│
├── order/                   # Order service (PostgreSQL)
│   ├── src/
│   │   ├── events/
│   │   │   ├── listeners/   # TradeExecuted, OrderCancelled, PaymentFailure*
│   │   │   │   └── __test__/# Jest tests for all listeners
│   │   │   └── publishers/  # BuyTrade, SellTrade, PaymentFailure, etc.
│   │   └── services/
│   │       ├── buy-service.ts   # Full BUY orchestration
│   │       ├── sell-service.ts  # Full SELL orchestration
│   │       └── __test__/        # Jest tests for buy/sell
│   ├── prisma/schema.prisma # Order model (9 statuses)
│   └── Dockerfile
│
├── stock/                   # Stock service (PostgreSQL + SSE)
│   ├── src/
│   │   ├── events/          # TradeExecutedStockListener
│   │   ├── sse/             # sse-manager.ts (Set<Response>)
│   │   └── services/        # create, update, seed, get, NSE fetch
│   ├── prisma/schema.prisma # stock + marketConfig models
│   └── Dockerfile
│
├── portfolio/               # Portfolio service (PostgreSQL)
│   ├── src/
│   │   ├── events/          # BuyTradeListener, SellTradeListener
│   │   └── services/        # create (buy), update (sell), verify
│   ├── prisma/schema.prisma # Portfolio model
│   └── Dockerfile
│
├── tradeengine/             # Matching engine (PostgreSQL + in-memory)
│   ├── src/
│   │   ├── orderBook/       # map.ts, queue.ts, addInQueue, seedOrderBook
│   │   ├── services/        # buy.ts, sell.ts (heap matching logic)
│   │   └── events/          # ExpirationCompleteListener, SeedEventListener
│   ├── prisma/schema.prisma # OrderBook model
│   └── Dockerfile
│
├── expiration/              # Expiration service (Bull + Redis)
│   ├── src/
│   │   ├── queues/          # 3 Bull queues (order / pf / sell-pf)
│   │   └── events/          # 3 listeners + 3 publishers
│   └── Dockerfile
│
├── client/                  # Next.js frontend
│   ├── app/                 # App Router (auth, terminal pages)
│   ├── components/          # UI components (dashboard, orders, stocks)
│   ├── hooks/               # useTerminalData, useStockStream, mutations
│   ├── lib/                 # API clients, order store, portfolio metrics
│   └── Dockerfile
│
└── infra/k8s/               # Kubernetes manifests
    ├── ingress-srv.yaml     # NGINX ingress rules
    ├── nats-depl.yaml       # NATS Streaming
    ├── auth-depl.yaml       # Auth + MongoDB
    ├── wallet-depl.yaml     # Wallet + PostgreSQL
    ├── order-depl.yaml      # Order + PostgreSQL
    ├── stock-depl.yaml      # Stock + PostgreSQL
    ├── portfolio-depl.yaml  # Portfolio + PostgreSQL
    ├── tradeEngine-depl.yaml# TradeEngine + PostgreSQL
    └── expiration-depl.yaml # Expiration + Redis
```

---

## 🚀 Getting Started

### Prerequisites

```bash
# Required tools
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
# Add to /etc/hosts
echo "127.0.0.1 sphere.dev" | sudo tee -a /etc/hosts
```

### 4. Create Secrets

```bash
kubectl create secret generic jwt-secret \
  --from-literal=JWT_KEY=your-super-secret-jwt-key
```

### 5. Start Development

```bash
skaffold dev
```

Skaffold will:
- Build all 8 Docker images locally
- Apply all Kubernetes manifests
- Watch TypeScript files and sync changes without rebuilding

### 6. Access the App

```
http://sphere.dev → TradeSphere terminal
```

---

## 🧪 Testing

The project includes **unit tests** for all critical service logic using **Jest** + **jest-mock-extended** for Prisma mocking.

```bash
# Run tests for a specific service
cd wallet && npm test
cd order && npm test
cd portfolio && npm test
cd stock && npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Coverage Areas

| Service | Test Files | Coverage |
|---|---|---|
| Wallet | addMoney, checkBalance, createWallet, creditMoney, lockMoney, settleMoney, withdraw | All success + failure paths |
| Order | buy-service, sell-service, order-cancelled-listener, trade-executed-listener, payment-failure-listeners | OCC, partial fills, payment failures, idempotency |
| Portfolio | buy/sell services, buy-trade-listener, sell-trade-listener | OCC, position close, error paths |
| Stock | sse-manager | Broadcast, heartbeat, disconnected client cleanup |

### Testing Philosophy

```typescript
// Every critical listener test validates:
// 1. Order not found → ack + skip
// 2. Terminal status → idempotency (no re-processing)
// 3. OCC version conflict (count=0) → ack + return
// 4. Success path → correct status + correct wallet call
// 5. Failure path → correct retry publishing
```

---

## 🖥️ Frontend Terminal

The Next.js client provides a **professional trading terminal UI** with:

### Key Frontend Patterns

**Resilient Order Tracking**  
Since the backend doesn't expose order history endpoints, a **Zustand store persisted to localStorage** tracks all placed orders. A polling hook reconciles order status against wallet + portfolio changes every 3 seconds.

```typescript
// Pending order poller infers status from side-effects:
// BUY SUCCESS → portfolio quantity increased
// SELL SUCCESS → portfolio quantity decreased
// EXPIRED → no change after expiresAt
```

**SSE with Polling Fallback**  
```typescript
// Primary: EventSource → /api/stocks/stream
// On disconnect: reconnect after 3s
// Fallback: React Query refetchInterval 30s keeps prices moving
```

**Auth Guard Pattern**  
```typescript
// AuthGuard wraps all terminal pages
// Renders children only when user is authenticated
// Redirects to /auth/sign-in?next=<current-path> on failure
// 8s timeout shows "server unreachable" UI
```

### Frontend Architecture

```
useTerminalData()                    ← single hook aggregates all data
  ├── useWalletBalanceQuery()        ← refetch every 10s
  ├── useStocksQuery()              ← refetch every 30s (+ SSE updates)
  ├── usePortfolioQuery()           ← refetch every 12s
  └── useOrderStore()               ← Zustand (persisted)
        └── usePendingOrderPoller() ← reconcile every 3s if pending orders exist
              └── useStockStream()  ← SSE connection lifecycle
```

---

## 📊 Key Metrics & Decisions

| Decision | Rationale |
|---|---|
| **NATS Streaming over Kafka** | Simpler ops for this scale; built-in message replay; matches course architecture |
| **Separate PostgreSQL per service** | True data isolation; each service can evolve its schema independently |
| **MongoDB for Auth only** | User document is simple; Mongoose's built-in `pre('save')` hook for password hashing is elegant |
| **In-memory order book** | Nanosecond matching latency; O(log n) heap operations; state recovered via `Seed` event on pod restart |
| **Bull over NATS delays** | Precise delay scheduling (exact `expiresAt`); Redis persistence survives pod restarts |
| **OCC over DB locks** | Avoids deadlocks under high concurrency; scales horizontally; predictable retry behavior |
| **SSE over WebSocket** | Unidirectional (price push only); works through HTTP/2; no handshake overhead |
| **Zustand for order ledger** | Persists across refreshes; O(1) lookups by order ID; works without a history API |

---

<div align="center">

**Built by [Ankit Singh](https://github.com/Ankiitsingh21)**

[![GitHub](https://img.shields.io/badge/GitHub-Ankiitsingh21-181717?style=flat-square&logo=github)](https://github.com/Ankiitsingh21)
[![Portfolio](https://img.shields.io/badge/Portfolio-Visit-00d4ff?style=flat-square)](https://portfolio-seven-gray-l6gk9z1m1w.vercel.app)
[![npm](https://img.shields.io/badge/npm-@showsphere/common-CB3837?style=flat-square&logo=npm)](https://www.npmjs.com/package/@showsphere/common)

```
Node.js · TypeScript · Next.js · Prisma · PostgreSQL · MongoDB
NATS Streaming · Bull/Redis · Kubernetes · Docker · Skaffold
```

</div>