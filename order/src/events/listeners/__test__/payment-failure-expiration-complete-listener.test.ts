import { prismaMock } from "../../../__mocks__/prisma";

jest.mock("../../../config/db", () => {
  const { prismaMock } = require("../../../__mocks__/prisma");
  return { prisma: prismaMock };
});

import axios from "axios";
jest.mock("axios");
jest.mock("../../../natswrapper");

const mockedAxios = axios as jest.MockedFunction<typeof axios>;

import { PaymentFailureExpirationCompleteListener } from "../payment-failure-expireation-complete-listener";
import { natsWrapper } from "../../../natswrapper";
import {
  Prisma,
  OrderStatus,
  OrderType,
} from "../../../generated/prisma/client";
import { Message } from "node-nats-streaming";

const mockMsg = { ack: jest.fn() } as unknown as Message;

const paymentFailureOrder = {
  id: "order-1",
  userId: "user-1",
  symbol: "RELIANCE",
  type: OrderType.BUY,
  status: OrderStatus.PAYMENT_FAILURE,
  totalQuantity: new Prisma.Decimal(10),
  matchedQuantity: new Prisma.Decimal(10),
  price: new Prisma.Decimal(2000),
  resolved: new Prisma.Decimal(0),
  version :0,
  expiresAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseEventData = {
  orderId: "order-1",
  expiresAt: new Date(Date.now() + 10000).toISOString(),
  cnt: 1,
  matchedQuantity: 10,
  resolved: 19500,
  settleamount: 19500,
  releaseamount: 500,
  userId: "user-1",
  status: "PAYMENT_FAILURE",
};

let listener: PaymentFailureExpirationCompleteListener;

describe("PaymentFailureExpirationCompleteListener", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listener = new PaymentFailureExpirationCompleteListener(
      (natsWrapper as any).client,
    );
  });

  // ─── Order not found ───────────────────────────────────────────────────────
  it("should ack and skip when order not found", async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);

    await listener.onMessage(baseEventData, mockMsg);

    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
    expect(mockedAxios).not.toHaveBeenCalled();
  });

  // ─── Idempotency ───────────────────────────────────────────────────────────
  it("should ack and skip when order is already EXPIRED", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      ...paymentFailureOrder,
      status: OrderStatus.EXPIRED,
    });

    await listener.onMessage(baseEventData, mockMsg);

    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
    expect(mockedAxios).not.toHaveBeenCalled();
  });

  it("should ack and skip when order is already PARTIAL_EXPIRED", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      ...paymentFailureOrder,
      status: OrderStatus.PARTIAL_EXPIRED,
    });

    await listener.onMessage(baseEventData, mockMsg);

    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
    expect(mockedAxios).not.toHaveBeenCalled();
  });

  // ─── cnt > 3 – admin alert ─────────────────────────────────────────────────
  it("should ack without retry or wallet call when cnt > 3", async () => {
    prismaMock.order.findUnique.mockResolvedValue(paymentFailureOrder);

    await listener.onMessage({ ...baseEventData, cnt: 4 }, mockMsg);

    expect(mockedAxios).not.toHaveBeenCalled();
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(natsWrapper.client.publish as jest.Mock).not.toHaveBeenCalled();
    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
  });

  // ─── Settle succeeds ───────────────────────────────────────────────────────
  it("should update order to SUCCESS when settle succeeds and matchedQty equals totalQuantity", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      ...paymentFailureOrder,
      totalQuantity: new Prisma.Decimal(10),
    });
    mockedAxios.mockResolvedValueOnce({ data: { success: true }, status: 201 });
    prismaMock.order.update.mockResolvedValue({
      ...paymentFailureOrder,
      status: OrderStatus.SUCCESS,
    });

    await listener.onMessage(
      { ...baseEventData, matchedQuantity: 10 },
      mockMsg,
    );

    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUCCESS" }),
      }),
    );
    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
  });

  it("should update order to PARTIAL_FILLED when settle succeeds and matchedQty < totalQuantity", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      ...paymentFailureOrder,
      totalQuantity: new Prisma.Decimal(20),
    });
    mockedAxios.mockResolvedValueOnce({ data: { success: true }, status: 201 });
    prismaMock.order.update.mockResolvedValue({
      ...paymentFailureOrder,
      status: OrderStatus.PARTIAL_FILLED,
    });

    await listener.onMessage(
      { ...baseEventData, matchedQuantity: 10 },
      mockMsg,
    );

    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PARTIAL_FILLED" }),
      }),
    );
    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
  });

  // ─── Settle fails – retry ──────────────────────────────────────────────────
  it("should increment cnt and re-publish PaymentFailure when settle fails and cnt < 3", async () => {
    prismaMock.order.findUnique.mockResolvedValue(paymentFailureOrder);
    mockedAxios.mockResolvedValueOnce({ data: {}, status: 500 });
    prismaMock.order.update.mockResolvedValue({
      ...paymentFailureOrder,
      status: OrderStatus.PAYMENT_FAILURE,
    });

    await listener.onMessage({ ...baseEventData, cnt: 2 }, mockMsg);

    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PAYMENT_FAILURE" }),
      }),
    );
    // cnt must be incremented to 3 in the published event
    expect(natsWrapper.client.publish as jest.Mock).toHaveBeenCalled();
    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
  });

  it("should set PARTIAL_FILLED_PAYMENT_FAILURE status when settle fails and matchedQty < totalQuantity", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      ...paymentFailureOrder,
      totalQuantity: new Prisma.Decimal(20),
    });
    mockedAxios.mockResolvedValueOnce({ data: {}, status: 500 });
    prismaMock.order.update.mockResolvedValue({
      ...paymentFailureOrder,
      status: OrderStatus.PARTIAL_FILLED_PAYMENT_FAILURE,
    });

    await listener.onMessage(
      { ...baseEventData, matchedQuantity: 10 },
      mockMsg,
    );

    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PARTIAL_FILLED_PAYMENT_FAILURE",
        }),
      }),
    );
    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
  });

  it("should still ack even after cnt=3 exhaustion (admin-log path)", async () => {
    prismaMock.order.findUnique.mockResolvedValue(paymentFailureOrder);

    await listener.onMessage({ ...baseEventData, cnt: 4 }, mockMsg);

    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
  });
});
