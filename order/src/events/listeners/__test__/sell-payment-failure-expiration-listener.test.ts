import { prismaMock } from "../../../__mocks__/prisma";

jest.mock("../../../config/db", () => {
  const { prismaMock } = require("../../../__mocks__/prisma");
  return { prisma: prismaMock };
});

import axios from "axios";
jest.mock("axios");
jest.mock("../../../natswrapper");

const mockedAxios = axios as jest.MockedFunction<typeof axios>;

import { SellPaymentFailureExpirationcompleteListener } from "../sell-payment-failure-expiration-listener";
import { natsWrapper } from "../../../natswrapper";
import {
  Prisma,
  OrderStatus,
  OrderType,
} from "../../../generated/prisma/client";
import { Message } from "node-nats-streaming";

const mockMsg = { ack: jest.fn() } as unknown as Message;

const baseOrder = {
  id: "order-1",
  userId: "user-1",
  symbol: "RELIANCE",
  type: OrderType.SELL,
  status: OrderStatus.PAYMENT_FAILURE,
  totalQuantity: new Prisma.Decimal(5),
  matchedQuantity: new Prisma.Decimal(5),
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
  amount: 10000,
  userId: "user-1",
  status: "PAYMENT_FAILURE",
};

let listener: SellPaymentFailureExpirationcompleteListener;

describe("SellPaymentFailureExpirationcompleteListener", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listener = new SellPaymentFailureExpirationcompleteListener(
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
      ...baseOrder,
      status: OrderStatus.EXPIRED,
    });

    await listener.onMessage(baseEventData, mockMsg);

    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
    expect(mockedAxios).not.toHaveBeenCalled();
  });

  it("should ack and skip when order is already PARTIAL_EXPIRED", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      ...baseOrder,
      status: OrderStatus.PARTIAL_EXPIRED,
    });

    await listener.onMessage(baseEventData, mockMsg);

    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
    expect(mockedAxios).not.toHaveBeenCalled();
  });

  // ─── cnt > 3 – admin alert ─────────────────────────────────────────────────
  it("should ack without credit call when cnt > 3", async () => {
    prismaMock.order.findUnique.mockResolvedValue(baseOrder);

    await listener.onMessage({ ...baseEventData, cnt: 4 }, mockMsg);

    expect(mockedAxios).not.toHaveBeenCalled();
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
  });

  // ─── Credit succeeds ───────────────────────────────────────────────────────
  it("should update order to SUCCESS when credit succeeds with PAYMENT_FAILURE status", async () => {
    prismaMock.order.findUnique.mockResolvedValue(baseOrder);
    mockedAxios.mockResolvedValueOnce({ data: { success: true }, status: 201 });
    prismaMock.order.update.mockResolvedValue({
      ...baseOrder,
      status: OrderStatus.SUCCESS,
    });

    await listener.onMessage(
      { ...baseEventData, status: "PAYMENT_FAILURE" },
      mockMsg,
    );

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("credit-money"),
        data: expect.objectContaining({ amount: 10000, userID: "user-1" }),
      }),
    );
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUCCESS" }),
      }),
    );
    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
  });

  it("should update order to PARTIAL_FILLED when credit succeeds with PARTIAL_FILLED_PAYMENT_FAILURE status", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      ...baseOrder,
      status: OrderStatus.PARTIAL_FILLED_PAYMENT_FAILURE,
    });
    mockedAxios.mockResolvedValueOnce({ data: { success: true }, status: 201 });
    prismaMock.order.update.mockResolvedValue({
      ...baseOrder,
      status: OrderStatus.PARTIAL_FILLED,
    });

    await listener.onMessage(
      { ...baseEventData, status: "PARTIAL_FILLED_PAYMENT_FAILURE" },
      mockMsg,
    );

    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PARTIAL_FILLED" }),
      }),
    );
    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
  });

  // ─── Credit fails – retry ──────────────────────────────────────────────────
  it("should increment cnt and re-publish SellPaymentFailure when credit fails with cnt < 3", async () => {
    prismaMock.order.findUnique.mockResolvedValue(baseOrder);
    mockedAxios.mockResolvedValueOnce({ data: {}, status: 500 });
    prismaMock.order.update.mockResolvedValue({
      ...baseOrder,
      status: OrderStatus.PAYMENT_FAILURE,
      userId: "user-1",
    });

    await listener.onMessage({ ...baseEventData, cnt: 2 }, mockMsg);

    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PAYMENT_FAILURE" }),
      }),
    );
    expect(natsWrapper.client.publish as jest.Mock).toHaveBeenCalled();
    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
  });

  it("should set PARTIAL_FILLED_PAYMENT_FAILURE when credit fails and status was PARTIAL_FILLED_PAYMENT_FAILURE", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      ...baseOrder,
      status: OrderStatus.PARTIAL_FILLED_PAYMENT_FAILURE,
    });
    mockedAxios.mockResolvedValueOnce({ data: {}, status: 500 });
    prismaMock.order.update.mockResolvedValue({
      ...baseOrder,
      status: OrderStatus.PARTIAL_FILLED_PAYMENT_FAILURE,
      userId: "user-1",
    });

    await listener.onMessage(
      { ...baseEventData, status: "PARTIAL_FILLED_PAYMENT_FAILURE", cnt: 1 },
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
});
