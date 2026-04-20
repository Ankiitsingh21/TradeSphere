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

import {
  Prisma,
  OrderType,
  OrderStatus,
} from "../../../src/generated/prisma/client";

const mockOrder = {
  id: 'some-id',
  userId: 'user-id',
  symbol: 'TATA',
  type: OrderType.BUY,       
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

  it("should complete SELL MATCHED flow correctly", async () => {
    mockedAxios.mockResolvedValueOnce({
      data: { success: true, data: mockHoldings },
      status: 201,
    });

    prismaMock.order.create.mockResolvedValue(mockOrder);

    mockedAxios.mockResolvedValueOnce({
      data: {
        success: true,
        data: { status: "MATCHED", matchedQty: 5, tradePrice: 2000 },
      },
      status: 201,
    });

    mockedAxios.mockResolvedValueOnce({
      data: { success: true },
      status: 201,
    });

    prismaMock.order.update.mockResolvedValue({
      ...mockOrder,
      status: OrderStatus.SUCCESS,
    });

    const result = await sell("user-1", "RELIANCE", 5, 2000);
    expect(result.status).toBe("SUCCESS");
  });

  it("should handle SELL QUEUED — order stays PENDING", async () => {
    mockedAxios.mockResolvedValueOnce({
      data: { success: true, data: mockHoldings },
      status: 201,
    });

    prismaMock.order.create.mockResolvedValue(mockOrder);

    mockedAxios.mockResolvedValueOnce({
      data: { success: true, data: { status: "QUEUED" } },
      status: 201,
    });

    prismaMock.order.update.mockResolvedValue({
      ...mockOrder,
      status: OrderStatus.PENDING,
    });

    const result = await sell("user-1", "RELIANCE", 5, 2000);
    expect(result.status).toBe("PENDING");
  });

  it("should throw if user does not own the stock", async () => {
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

  it("should set order FAILED if matching engine fails", async () => {
    mockedAxios.mockResolvedValueOnce({
      data: { success: true, data: mockHoldings },
      status: 201,
    });

    prismaMock.order.create.mockResolvedValue(mockOrder);

    mockedAxios.mockResolvedValueOnce({
      data: {},
      status: 500,
    });

    prismaMock.order.update.mockResolvedValue({
      ...mockOrder,
      status: OrderStatus.FAILED,
    });

    await expect(sell("user-1", "RELIANCE", 5, 2000)).rejects.toThrow(
      BadRequestError,
    );

    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: OrderStatus.FAILED },
      }),
    );
  });

  it("should throw if portfolio service is down", async () => {
    mockedAxios.mockResolvedValueOnce({
      data: {},
      status: 500,
    });

    await expect(sell("user-1", "RELIANCE", 5, 2000)).rejects.toThrow(
      BadRequestError,
    );
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });
});
