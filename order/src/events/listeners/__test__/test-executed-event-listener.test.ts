import { prismaMock } from "../../../__mocks__/prisma";

jest.mock("../../../config/db", () => {
  const { prismaMock } = require("../../../__mocks__/prisma");
  return { prisma: prismaMock };
});

import axios from "axios";
jest.mock("axios");
jest.mock("../../../natswrapper");

const mockedAxios = axios as jest.MockedFunction<typeof axios>;

import { TradeExecutedListener } from "../trade-executed-event-listener";
import { natsWrapper } from "../../../natswrapper";
import { TradeType } from "@showsphere/common";
import {
  Prisma,
  OrderStatus,
  OrderType,
} from "../../../generated/prisma/client";
import { Message } from "node-nats-streaming";

const mockMsg = { ack: jest.fn() } as unknown as Message;

const basePendingOrder = {
  id: "order-1",
  userId: "user-1",
  symbol: "RELIANCE",
  type: OrderType.BUY,
  status: OrderStatus.PENDING,
  totalQuantity: new Prisma.Decimal(10),
  matchedQuantity: new Prisma.Decimal(0),
  price: new Prisma.Decimal(2000),
  resolved: new Prisma.Decimal(0),
  expiresAt: new Date(Date.now() + 60000),
  version: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const buyEventData = {
  orderId: "order-1",
  userId: "user-1",
  symbol: "RELIANCE",
  matchedQty: 10,
  tradePrice: 1950,
  type: TradeType.Buy,
  releaseAmount: 500,
};

const sellEventData = {
  orderId: "order-1",
  userId: "user-1",
  symbol: "RELIANCE",
  matchedQty: 5,
  tradePrice: 2000,
  type: TradeType.Sell,
};

let listener: TradeExecutedListener;

describe("TradeExecutedListener", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listener = new TradeExecutedListener((natsWrapper as any).client);
  });

  // ─── Order not found ───────────────────────────────────────────────────────
  describe("order not found", () => {
    it("should ack and skip when order does not exist", async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);

      await listener.onMessage(buyEventData, mockMsg);

      expect(mockMsg.ack).toHaveBeenCalledTimes(1);
      expect(prismaMock.order.update).not.toHaveBeenCalled();
      expect(mockedAxios).not.toHaveBeenCalled();
    });
  });

  // ─── orderId with -remaining suffix ────────────────────────────────────────
  describe("-remaining suffix stripping", () => {
    it("should strip -remaining and query base orderId", async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        ...basePendingOrder,
        status: OrderStatus.SUCCESS,
      });

      await listener.onMessage(
        { ...buyEventData, orderId: "order-1-remaining" },
        mockMsg,
      );

      expect(prismaMock.order.findUnique).toHaveBeenCalledWith({
        where: { id: "order-1" },
      });
      expect(mockMsg.ack).toHaveBeenCalled();
    });
  });

  // ─── Idempotency – NON_PROCESSABLE statuses ────────────────────────────────
  describe("idempotency guards", () => {
    const skippedStatuses = [
      OrderStatus.SUCCESS,
      OrderStatus.PARTIAL_FILLED,
      OrderStatus.FAILED,
      OrderStatus.EXPIRED,
      OrderStatus.PARTIAL_EXPIRED,
      OrderStatus.PAYMENT_FAILURE,
      OrderStatus.PARTIAL_FILLED_PAYMENT_FAILURE,
    ];

    skippedStatuses.forEach((status) => {
      it(`should ack and skip without calling wallet when status is ${status}`, async () => {
        prismaMock.order.findUnique.mockResolvedValue({
          ...basePendingOrder,
          status,
        });

        await listener.onMessage(buyEventData, mockMsg);

        expect(mockMsg.ack).toHaveBeenCalledTimes(1);
        expect(mockedAxios).not.toHaveBeenCalled();
        expect(prismaMock.order.update).not.toHaveBeenCalled();
      });
    });
  });

  // ─── BUY settlement ────────────────────────────────────────────────────────
  describe("handleBuySettlement", () => {
    it("should call settle-money, update order to SUCCESS, and publish BuyTrade", async () => {
      prismaMock.order.findUnique.mockResolvedValue(basePendingOrder);
      mockedAxios.mockResolvedValueOnce({
        data: { success: true },
        status: 201,
      });
      prismaMock.order.update.mockResolvedValue({
        ...basePendingOrder,
        status: OrderStatus.SUCCESS,
        userId: "user-1",
        symbol: "RELIANCE",
        price: new Prisma.Decimal(2000),
      });

      await listener.onMessage(buyEventData, mockMsg);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("settle-money"),
          data: expect.objectContaining({
            userID: "user-1",
            settleamount: expect.any(Number),
            releaseamount: expect.any(Number),
          }),
        }),
      );
      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "SUCCESS" }),
        }),
      );
      // BuyTrade published via NATS
      expect(natsWrapper.client.publish as jest.Mock).toHaveBeenCalled();
      expect(mockMsg.ack).toHaveBeenCalledTimes(1);
    });

    it("should update order to PAYMENT_FAILURE and publish PaymentFailure when settle returns 500", async () => {
      prismaMock.order.findUnique.mockResolvedValue(basePendingOrder);
      mockedAxios.mockResolvedValueOnce({ data: {}, status: 500 });
      prismaMock.order.update.mockResolvedValue({
        ...basePendingOrder,
        status: OrderStatus.PAYMENT_FAILURE,
      });

      await listener.onMessage(buyEventData, mockMsg);

      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "PAYMENT_FAILURE" }),
        }),
      );
      expect(natsWrapper.client.publish as jest.Mock).toHaveBeenCalled();
      expect(mockMsg.ack).toHaveBeenCalledTimes(1);
    });

    it("should default releaseAmount to 0 when not provided", async () => {
      prismaMock.order.findUnique.mockResolvedValue(basePendingOrder);
      mockedAxios.mockResolvedValueOnce({
        data: { success: true },
        status: 201,
      });
      prismaMock.order.update.mockResolvedValue({
        ...basePendingOrder,
        status: OrderStatus.SUCCESS,
        userId: "user-1",
        symbol: "RELIANCE",
        price: new Prisma.Decimal(2000),
      });

      await listener.onMessage(
        { ...buyEventData, releaseAmount: undefined } as any,
        mockMsg,
      );

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ releaseamount: 0 }),
        }),
      );
      expect(mockMsg.ack).toHaveBeenCalled();
    });

    it("should compute settleAmount as lockAmount minus releaseAmount", async () => {
      // price=2000 * qty=10 = lockAmount=20000, releaseAmount=500 → settleAmount=19500
      prismaMock.order.findUnique.mockResolvedValue(basePendingOrder);
      mockedAxios.mockResolvedValueOnce({
        data: { success: true },
        status: 201,
      });
      prismaMock.order.update.mockResolvedValue({
        ...basePendingOrder,
        status: OrderStatus.SUCCESS,
        userId: "user-1",
        symbol: "RELIANCE",
        price: new Prisma.Decimal(2000),
      });

      await listener.onMessage(
        { ...buyEventData, releaseAmount: 500 },
        mockMsg,
      );

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settleamount: 19500,
            releaseamount: 500,
          }),
        }),
      );
    });
  });

  // ─── SELL credit ───────────────────────────────────────────────────────────
  describe("handleSellCredit", () => {
    it("should call credit-money, update order to SUCCESS, and publish SellTrade", async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        ...basePendingOrder,
        type: OrderType.SELL,
      });
      mockedAxios.mockResolvedValueOnce({
        data: { success: true },
        status: 201,
      });
      prismaMock.order.update.mockResolvedValue({
        ...basePendingOrder,
        type: OrderType.SELL,
        status: OrderStatus.SUCCESS,
        userId: "user-1",
        symbol: "RELIANCE",
        price: new Prisma.Decimal(2000),
      });

      await listener.onMessage(sellEventData, mockMsg);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("credit-money"),
          data: expect.objectContaining({
            amount: 10000, // 2000 * 5
            userID: "user-1",
          }),
        }),
      );
      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "SUCCESS" }),
        }),
      );
      expect(natsWrapper.client.publish as jest.Mock).toHaveBeenCalled();
      expect(mockMsg.ack).toHaveBeenCalledTimes(1);
    });

    it("should update order to PAYMENT_FAILURE and publish SellPaymentFailure when credit returns 500", async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        ...basePendingOrder,
        type: OrderType.SELL,
      });
      mockedAxios.mockResolvedValueOnce({ data: {}, status: 500 });
      prismaMock.order.update.mockResolvedValue({
        ...basePendingOrder,
        type: OrderType.SELL,
        status: OrderStatus.PAYMENT_FAILURE,
        userId: "user-1",
      });

      await listener.onMessage(sellEventData, mockMsg);

      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "PAYMENT_FAILURE" }),
        }),
      );
      expect(natsWrapper.client.publish as jest.Mock).toHaveBeenCalled();
      expect(mockMsg.ack).toHaveBeenCalledTimes(1);
    });

    it("should compute credit as tradePrice * matchedQty", async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        ...basePendingOrder,
        type: OrderType.SELL,
      });
      mockedAxios.mockResolvedValueOnce({
        data: { success: true },
        status: 201,
      });
      prismaMock.order.update.mockResolvedValue({
        ...basePendingOrder,
        type: OrderType.SELL,
        status: OrderStatus.SUCCESS,
        userId: "user-1",
        symbol: "RELIANCE",
        price: new Prisma.Decimal(2000),
      });

      // tradePrice=2000, matchedQty=5 → credit=10000
      await listener.onMessage(
        { ...sellEventData, tradePrice: 2000, matchedQty: 5 },
        mockMsg,
      );

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ amount: 10000 }),
        }),
      );
    });
  });
});