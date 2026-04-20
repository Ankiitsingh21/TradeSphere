import { prismaMock } from "../../__mocks__/prisma";

jest.mock("../../config/db", () => {
  const { prismaMock } = require("../../__mocks__/prisma");
  return { prisma: prismaMock };
});

import axios from "axios";
jest.mock("axios");
jest.mock("../../natswrapper");

const mockedAxios = axios as jest.MockedFunction<typeof axios>;

import { sell } from "../../services/sell-service";
import { BadRequestError } from "@showsphere/common";
import { Prisma, OrderType, OrderStatus } from "../../generated/prisma/client";

const mockOrder = {
  id: "some-id",
  userId: "user-id",
  symbol: "TATA",
  type: OrderType.SELL,
  status: OrderStatus.CREATED,
  totalQuantity: new Prisma.Decimal(10),
  matchedQuantity: new Prisma.Decimal(0),
  price: new Prisma.Decimal(100),
  resolved: new Prisma.Decimal(0),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  version: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockHoldings = {
  id: "holding-1",
  userId: "user-1",
  symbol: "RELIANCE",
  quantity: new Prisma.Decimal(10),
  avgBuyPrice: new Prisma.Decimal(1800),
  totalInvested: new Prisma.Decimal(18000),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("sell service", () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── MATCHED flow ─────────────────────────────────────────────────────────
  it("should complete SELL MATCHED flow — SUCCESS", async () => {
    mockedAxios
      .mockResolvedValueOnce({
        data: { success: true, data: mockHoldings },
        status: 201,
      }) // verify
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: { status: "MATCHED", matchedQty: 5, tradePrice: 2000 },
        },
        status: 201,
      }) // trade engine
      .mockResolvedValueOnce({ data: { success: true }, status: 201 }); // credit

    prismaMock.order.create.mockResolvedValue(mockOrder);
    prismaMock.order.update.mockResolvedValue({
      ...mockOrder,
      status: OrderStatus.SUCCESS,
    });

    const result = await sell("user-1", "RELIANCE", 5, 2000);
    expect(result.status).toBe("SUCCESS");
  });

  it("should set PAYMENT_FAILURE and publish SellPaymentFailure when credit fails after MATCHED", async () => {
    mockedAxios
      .mockResolvedValueOnce({
        data: { success: true, data: mockHoldings },
        status: 201,
      }) // verify
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: { status: "MATCHED", matchedQty: 5, tradePrice: 2000 },
        },
        status: 201,
      }) // trade engine
      .mockResolvedValueOnce({ data: {}, status: 500 }); // credit FAILS

    prismaMock.order.create.mockResolvedValue(mockOrder);
    prismaMock.order.update.mockResolvedValue({
      ...mockOrder,
      status: OrderStatus.PAYMENT_FAILURE,
      userId: "user-id",
    });

    const result = await sell("user-1", "RELIANCE", 5, 2000);
    expect(result.status).toBe("PAYMENT_FAILURE");
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PAYMENT_FAILURE" }),
      }),
    );
  });

  // ─── QUEUED flow ──────────────────────────────────────────────────────────
  it("should handle SELL QUEUED — order stays PENDING", async () => {
    mockedAxios
      .mockResolvedValueOnce({
        data: { success: true, data: mockHoldings },
        status: 201,
      }) // verify
      .mockResolvedValueOnce({
        data: { success: true, data: { status: "QUEUED" } },
        status: 201,
      }); // trade engine

    prismaMock.order.create.mockResolvedValue(mockOrder);
    prismaMock.order.update.mockResolvedValue({
      ...mockOrder,
      status: OrderStatus.PENDING,
    });

    const result = await sell("user-1", "RELIANCE", 5, 2000);
    expect(result.status).toBe("PENDING");
  });

  // ─── PARTIAL flow ─────────────────────────────────────────────────────────
  it("should handle SELL PARTIAL — partial credit → PARTIAL_FILLED", async () => {
    mockedAxios
      .mockResolvedValueOnce({
        data: { success: true, data: mockHoldings },
        status: 201,
      }) // verify
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: { status: "PARTIAL", matchedQty: 3, tradePrice: 2000 },
        },
        status: 201,
      }) // trade engine
      .mockResolvedValueOnce({ data: { success: true }, status: 201 }); // credit

    prismaMock.order.create.mockResolvedValue(mockOrder);
    prismaMock.order.update.mockResolvedValue({
      ...mockOrder,
      status: OrderStatus.PARTIAL_FILLED,
    });

    const result = await sell("user-1", "RELIANCE", 5, 2000);
    expect(result.status).toBe("PARTIAL_FILLED");
  });

  it("should set PARTIAL_FILLED_PAYMENT_FAILURE when credit fails after PARTIAL trade", async () => {
    mockedAxios
      .mockResolvedValueOnce({
        data: { success: true, data: mockHoldings },
        status: 201,
      }) // verify
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: { status: "PARTIAL", matchedQty: 3, tradePrice: 2000 },
        },
        status: 201,
      }) // trade engine
      .mockResolvedValueOnce({ data: {}, status: 500 }); // credit FAILS

    prismaMock.order.create.mockResolvedValue(mockOrder);
    prismaMock.order.update.mockResolvedValue({
      ...mockOrder,
      status: OrderStatus.PARTIAL_FILLED_PAYMENT_FAILURE,
      userId: "user-id",
    });

    const result = await sell("user-1", "RELIANCE", 5, 2000);
    expect(result.status).toBe("PARTIAL_FILLED_PAYMENT_FAILURE");
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PARTIAL_FILLED_PAYMENT_FAILURE",
        }),
      }),
    );
  });

  // ─── Validation guards ────────────────────────────────────────────────────
  it("should throw if user does not own the stock (portfolio 400)", async () => {
    mockedAxios.mockResolvedValueOnce({
      data: { message: "stock does not owned" },
      status: 400,
    });

    await expect(sell("user-1", "RELIANCE", 5, 2000)).rejects.toThrow(
      BadRequestError,
    );
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });

  it("should throw if user tries to sell more than owned quantity", async () => {
    mockedAxios.mockResolvedValueOnce({
      data: {
        success: true,
        data: { ...mockHoldings, quantity: new Prisma.Decimal(3) },
      },
      status: 201,
    });

    await expect(sell("user-1", "RELIANCE", 5, 2000)).rejects.toThrow(
      BadRequestError,
    );
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });

  it("should set order FAILED and throw if trade engine returns 500", async () => {
    mockedAxios
      .mockResolvedValueOnce({
        data: { success: true, data: mockHoldings },
        status: 201,
      }) // verify
      .mockResolvedValueOnce({ data: {}, status: 500 }); // trade engine FAILS

    prismaMock.order.create.mockResolvedValue(mockOrder);
    prismaMock.order.update.mockResolvedValue({
      ...mockOrder,
      status: OrderStatus.FAILED,
    });

    await expect(sell("user-1", "RELIANCE", 5, 2000)).rejects.toThrow(
      BadRequestError,
    );
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "FAILED" } }),
    );
  });

  it("should throw if portfolio service is unreachable (500)", async () => {
    mockedAxios.mockResolvedValueOnce({ data: {}, status: 500 });

    await expect(sell("user-1", "RELIANCE", 5, 2000)).rejects.toThrow(
      BadRequestError,
    );
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });
});
