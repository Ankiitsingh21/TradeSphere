import { prismaMock } from "../../../__mocks__/prisma";

jest.mock("../../../config/db", () => {
  const { prismaMock } = require("../../../__mocks__/prisma");
  return { prisma: prismaMock };
});

import axios from "axios";
jest.mock("axios");
jest.mock("../../../natswrapper");

const mockedAxios = axios as jest.MockedFunction<typeof axios>;

import { OrderCancelledListener } from "../order-cancelled-listener";
import { natsWrapper } from "../../../natswrapper";
import {
  Prisma,
  OrderStatus,
  OrderType,
} from "../../../generated/prisma/client";
import { Message } from "node-nats-streaming";

const mockMsg = { ack: jest.fn() } as unknown as Message;

const pendingOrder = {
  id: "order-1",
  userId: "user-1",
  symbol: "RELIANCE",
  type: OrderType.BUY,
  status: OrderStatus.PENDING,
  totalQuantity: new Prisma.Decimal(10),
  matchedQuantity: new Prisma.Decimal(0),
  price: new Prisma.Decimal(2000),
  resolved: new Prisma.Decimal(0),
  expiresAt: new Date(),
  version: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

let listener: OrderCancelledListener;

describe("OrderCancelledListener", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listener = new OrderCancelledListener((natsWrapper as any).client);
  });

  // ─── Order not found ───────────────────────────────────────────────────────
  it("should ack and skip when order not found", async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);

    await listener.onMessage(
      { orderId: "nonexistent", releaseAmount: 1000 },
      mockMsg,
    );

    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
    expect(mockedAxios).not.toHaveBeenCalled();
  });

  // ─── Idempotency ───────────────────────────────────────────────────────────
  it("should ack and skip without re-processing when order already EXPIRED", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      ...pendingOrder,
      status: OrderStatus.EXPIRED,
    });

    await listener.onMessage(
      { orderId: "order-1", releaseAmount: 1000 },
      mockMsg,
    );

    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
    expect(mockedAxios).not.toHaveBeenCalled();
  });

  it("should ack and skip without re-processing when order already PARTIAL_EXPIRED", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      ...pendingOrder,
      status: OrderStatus.PARTIAL_EXPIRED,
    });

    await listener.onMessage(
      { orderId: "order-1", releaseAmount: 1000 },
      mockMsg,
    );

    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
    expect(mockedAxios).not.toHaveBeenCalled();
  });

  // ─── Status computation ────────────────────────────────────────────────────
  it("should set EXPIRED when matchedQuantity is null (no shares matched)", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      ...pendingOrder,
      matchedQuantity: null,
    });
    
    // Prisma's updateMany returns a BatchPayload ({ count: number })
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
    mockedAxios.mockResolvedValueOnce({ data: { success: true }, status: 201 });

    await listener.onMessage(
      { orderId: "order-1", releaseAmount: 20000 },
      mockMsg,
    );

    expect(prismaMock.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "EXPIRED" } }),
    );
    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
  });

  it("should set EXPIRED when matchedQuantity is 0", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      ...pendingOrder,
      matchedQuantity: new Prisma.Decimal(0),
    });
    
    // Prisma's updateMany returns a BatchPayload ({ count: number })
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
    mockedAxios.mockResolvedValueOnce({ data: { success: true }, status: 201 });

    await listener.onMessage(
      { orderId: "order-1", releaseAmount: 20000 },
      mockMsg,
    );

    expect(prismaMock.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "EXPIRED" } }),
    );
  });

  it("should set PARTIAL_EXPIRED when matchedQuantity > 0 (partial fill before expiry)", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      ...pendingOrder,
      matchedQuantity: new Prisma.Decimal(5),
    });
    
    // Prisma's updateMany returns a BatchPayload ({ count: number })
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
    mockedAxios.mockResolvedValueOnce({ data: { success: true }, status: 201 });

    await listener.onMessage(
      { orderId: "order-1", releaseAmount: 10000 },
      mockMsg,
    );

    expect(prismaMock.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "PARTIAL_EXPIRED" } }),
    );
    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
  });

  // ─── Wallet settle call ────────────────────────────────────────────────────
  it("should call settle-money with settleamount=0 and correct releaseAmount and userID", async () => {
    prismaMock.order.findUnique.mockResolvedValue(pendingOrder);
    
    // Prisma's updateMany returns a BatchPayload ({ count: number })
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
    mockedAxios.mockResolvedValueOnce({ data: { success: true }, status: 201 });

    await listener.onMessage(
      { orderId: "order-1", releaseAmount: 15000 },
      mockMsg,
    );

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("settle-money"),
        data: expect.objectContaining({
          settleamount: 0,
          releaseamount: 15000,
          userID: "user-1",
        }),
      }),
    );
  });

  it("should ack even when settle-money returns 500 (log and move on)", async () => {
    prismaMock.order.findUnique.mockResolvedValue(pendingOrder);
    
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
    mockedAxios.mockResolvedValueOnce({ data: {}, status: 500 });

    await listener.onMessage(
      { orderId: "order-1", releaseAmount: 20000 },
      mockMsg,
    );

    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
  });
});