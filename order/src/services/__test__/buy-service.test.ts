import { prismaMock } from "../../__mocks__/prisma";

jest.mock("../../config/db", () => {
  const { prismaMock } = require("../../__mocks__/prisma");
  return { prisma: prismaMock };
});

import axios from "axios";
jest.mock("axios");

jest.mock("../../natswrapper");

const mockedAxios = axios as jest.MockedFunction<typeof axios>;

import { buy } from "../../services/buy-service";
import { BadRequestError } from "@showsphere/common";

import { Prisma, OrderStatus, OrderType } from "../../generated/prisma/client";

const mockOrder = {
  id: 'some-id',
  userId: 'user-id',
  symbol: 'TATA',
  // Use the Prisma enums directly:
  type: OrderType.BUY,       // or 'BUY' as OrderType
  status: OrderStatus.CREATED, // or 'CREATED' as OrderStatus
  totalQuantity: new Prisma.Decimal(10),
  matchedQuantity: new Prisma.Decimal(0),
  price: new Prisma.Decimal(100),
  resolved: new Prisma.Decimal(0),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  version: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("buy service", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("when stock price is provided", () => {
    it("should complete BUY MATCHED flow correctly", async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { success: true },
        status: 201,
      });

      prismaMock.order.create.mockResolvedValue(mockOrder);

      mockedAxios.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            status: "MATCHED",
            matchedQty: 5,
            tradePrice: 1950,
            releaseAmount: 250,
          },
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
        resolved: new Prisma.Decimal(9750),
      });

      const result = await buy("user-1", "RELIANCE", 5, 2000);
      expect(result.status).toBe("SUCCESS");
    });

    it("should handle BUY QUEUED — order stays PENDING", async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { success: true },
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

      const result = await buy("user-1", "RELIANCE", 5, 2000);
      expect(result.status).toBe("PENDING");
    });

    it("should handle BUY PARTIAL — only matched qty settled", async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { success: true },
        status: 201,
      });
      prismaMock.order.create.mockResolvedValue(mockOrder);

      mockedAxios.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            status: "PARTIAL",
            matchedQty: 3,
            tradePrice: 1950,
            releaseAmount: 150,
          },
        },
        status: 201,
      });

      mockedAxios.mockResolvedValueOnce({
        data: { success: true },
        status: 201,
      });

      prismaMock.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PENDING,
      });

      const result = await buy("user-1", "RELIANCE", 5, 2000);
      expect(result.status).toBe("PENDING");
    });

    it("should unlock money and set FAILED if matching engine fails", async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { success: true },
        status: 201,
      });
      prismaMock.order.create.mockResolvedValue(mockOrder);

      mockedAxios.mockResolvedValueOnce({ data: {}, status: 500 });

      mockedAxios.mockResolvedValueOnce({
        data: { success: true },
        status: 201,
      });

      prismaMock.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.FAILED,
      });

      await expect(buy("user-1", "RELIANCE", 5, 2000)).rejects.toThrow(
        BadRequestError,
      );

      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: OrderStatus.FAILED } }),
      );
    });

    it("should throw and stop if lock money fails (insufficient funds)", async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { message: "Insufficient fund" },
        status: 400,
      });

      await expect(buy("user-1", "RELIANCE", 5, 2000)).rejects.toThrow(
        BadRequestError,
      );

      expect(prismaMock.order.create).not.toHaveBeenCalled();
    });
  });

  describe("when stock price is NOT provided (fetch from stock service)", () => {
    it("should fetch price from stock service then proceed", async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { success: true, data: { price: 2000 } },
        status: 201,
      });

      mockedAxios.mockResolvedValueOnce({
        data: { success: true },
        status: 201,
      });
      prismaMock.order.create.mockResolvedValue(mockOrder);

      mockedAxios.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            status: "MATCHED",
            matchedQty: 5,
            tradePrice: 2000,
            releaseAmount: 0,
          },
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

      const result = await buy("user-1", "RELIANCE", 5);
      expect(result.status).toBe("SUCCESS");
    });

    it("should throw if stock service is down", async () => {
      mockedAxios.mockResolvedValueOnce({ data: {}, status: 500 });

      await expect(buy("user-1", "RELIANCE", 5)).rejects.toThrow(
        BadRequestError,
      );

      expect(prismaMock.order.create).not.toHaveBeenCalled();
    });
  });
});
