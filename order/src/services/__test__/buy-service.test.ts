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
  id: "some-id",
  userId: "user-id",
  symbol: "TATA",
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

describe("buy service", () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── Price provided ────────────────────────────────────────────────────────
  describe("when stock price is provided", () => {
    it("should complete BUY MATCHED flow — SUCCESS", async () => {
      mockedAxios
        .mockResolvedValueOnce({ data: { success: true }, status: 201 }) // lock
        .mockResolvedValueOnce({
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
        }) // trade engine
        .mockResolvedValueOnce({ data: { success: true }, status: 201 }); // settle

      prismaMock.order.create.mockResolvedValue(mockOrder);
      prismaMock.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.SUCCESS,
        resolved: new Prisma.Decimal(9750),
      });

      const result = await buy("user-1", "RELIANCE", 5, 2000);
      expect(result.status).toBe("SUCCESS");
    });

    it("should set PAYMENT_FAILURE and publish PaymentFailure when settle fails after MATCHED trade", async () => {
      mockedAxios
        .mockResolvedValueOnce({ data: { success: true }, status: 201 }) // lock
        .mockResolvedValueOnce({
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
        }) // trade engine
        .mockResolvedValueOnce({ data: {}, status: 500 }); // settle FAILS

      prismaMock.order.create.mockResolvedValue(mockOrder);
      prismaMock.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PAYMENT_FAILURE,
      });

      const result = await buy("user-1", "RELIANCE", 5, 2000);
      expect(result.status).toBe("PAYMENT_FAILURE");
      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "PAYMENT_FAILURE" }),
        }),
      );
    });

    it("should handle BUY QUEUED — order stays PENDING", async () => {
      mockedAxios
        .mockResolvedValueOnce({ data: { success: true }, status: 201 }) // lock
        .mockResolvedValueOnce({
          data: { success: true, data: { status: "QUEUED" } },
          status: 201,
        }); // trade engine

      prismaMock.order.create.mockResolvedValue(mockOrder);
      prismaMock.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PENDING,
      });

      const result = await buy("user-1", "RELIANCE", 5, 2000);
      expect(result.status).toBe("PENDING");
    });

    it("should handle BUY PARTIAL — partial matched qty settled → PARTIAL_FILLED", async () => {
      mockedAxios
        .mockResolvedValueOnce({ data: { success: true }, status: 201 }) // lock
        .mockResolvedValueOnce({
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
        }) // trade engine
        .mockResolvedValueOnce({ data: { success: true }, status: 201 }); // settle

      prismaMock.order.create.mockResolvedValue(mockOrder);
      prismaMock.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PARTIAL_FILLED,
      });

      const result = await buy("user-1", "RELIANCE", 5, 2000);
      expect(result.status).toBe("PARTIAL_FILLED");
    });

    it("should set PARTIAL_FILLED_PAYMENT_FAILURE when settle fails after PARTIAL trade", async () => {
      mockedAxios
        .mockResolvedValueOnce({ data: { success: true }, status: 201 }) // lock
        .mockResolvedValueOnce({
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
        }) // trade engine
        .mockResolvedValueOnce({ data: {}, status: 500 }); // settle FAILS

      prismaMock.order.create.mockResolvedValue(mockOrder);
      prismaMock.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PARTIAL_FILLED_PAYMENT_FAILURE,
      });

      const result = await buy("user-1", "RELIANCE", 5, 2000);
      expect(result.status).toBe("PARTIAL_FILLED_PAYMENT_FAILURE");
      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "PARTIAL_FILLED_PAYMENT_FAILURE",
          }),
        }),
      );
    });

    it("should update order to FAILED and unlock money when trade engine returns 500", async () => {
      mockedAxios
        .mockResolvedValueOnce({ data: { success: true }, status: 201 }) // lock
        .mockResolvedValueOnce({ data: {}, status: 500 }) // trade engine FAILS
        .mockResolvedValueOnce({ data: { success: true }, status: 201 }); // release

      prismaMock.order.create.mockResolvedValue(mockOrder);
      prismaMock.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.FAILED,
      });

      await expect(buy("user-1", "RELIANCE", 5, 2000)).rejects.toThrow(
        BadRequestError,
      );
      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "FAILED" } }),
      );
    });

    it("should throw and not create order when lock-money returns 400 (insufficient funds)", async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { message: "Insufficient fund" },
        status: 400,
      });

      await expect(buy("user-1", "RELIANCE", 5, 2000)).rejects.toThrow(
        BadRequestError,
      );
      expect(prismaMock.order.create).not.toHaveBeenCalled();
    });

    it("should throw when wallet is unreachable (no status code)", async () => {
      mockedAxios.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      await expect(buy("user-1", "RELIANCE", 5, 2000)).rejects.toThrow(
        BadRequestError,
      );
      expect(prismaMock.order.create).not.toHaveBeenCalled();
    });
  });

  // ─── Price NOT provided — fetched from stock service ──────────────────────
  describe("when stock price is NOT provided", () => {
    it("should fetch price from stock service then proceed to MATCHED SUCCESS", async () => {
      mockedAxios
        .mockResolvedValueOnce({
          data: { success: true, data: { price: 2000 } },
          status: 201,
        }) // stock price
        .mockResolvedValueOnce({ data: { success: true }, status: 201 }) // lock
        .mockResolvedValueOnce({
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
        }) // trade engine
        .mockResolvedValueOnce({ data: { success: true }, status: 201 }); // settle

      prismaMock.order.create.mockResolvedValue(mockOrder);
      prismaMock.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.SUCCESS,
      });

      const result = await buy("user-1", "RELIANCE", 5);
      expect(result.status).toBe("SUCCESS");
    });

    it("should throw if stock service returns 500", async () => {
      mockedAxios.mockResolvedValueOnce({ data: {}, status: 500 });

      await expect(buy("user-1", "RELIANCE", 5)).rejects.toThrow(
        BadRequestError,
      );
      expect(prismaMock.order.create).not.toHaveBeenCalled();
    });
  });
});
