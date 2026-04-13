import { prismaMock } from "../../__mocks__/prisma";

jest.mock("../../config/db", () => ({ prisma: prismaMock }));

import { settlemoney } from "../../services/settle-amount";
import { BadRequestError } from "@showsphere/common";

describe("settleMoney service", () => {
  const mockWallet = {
    id: "wallet-1",
    userId: "user-1",
    total_balance: { minus: jest.fn(), add: jest.fn(), greaterThan: jest.fn() } as any,
    available_balance: { add: jest.fn() } as any,
    locked_balance: {
      minus: jest.fn(),
      greaterThan: jest.fn(),
    } as any,
    version: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => jest.clearAllMocks());

  it("should settle money and create 2 transactions (SETTLE + UNLOCK)", async () => {
    const wallet = {
      ...mockWallet,
      available_balance: { toNumber: () => 0, add: (v: any) => 200 } as any,
      locked_balance: {
        toNumber: () => 1000,
        minus: () => 800,
        greaterThan: () => false,
      } as any,
      total_balance: { toNumber: () => 1000 } as any,
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.wallet.findUnique.mockResolvedValue(wallet);
    prismaMock.wallet.update.mockResolvedValue({ ...wallet });
    prismaMock.transactions.create
      .mockResolvedValueOnce({ id: "t1", type: "SETTLE", amount: 800 } as any)
      .mockResolvedValueOnce({ id: "t2", type: "UNLOCK", amount: 200 } as any);

    const result = await settlemoney("user-1", 800, 200);
    expect(result.tranc.type).toBe("SETTLE");
    expect(result.transc.type).toBe("UNLOCK");
    expect(prismaMock.transactions.create).toHaveBeenCalledTimes(2);
  });

  it("should throw if settle + release exceeds locked balance", async () => {
    const wallet = {
      ...mockWallet,
      locked_balance: {
        minus: jest.fn(),
        greaterThan: () => true,
      } as any,
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.wallet.findUnique.mockResolvedValue(wallet);

    await expect(settlemoney("user-1", 800, 300)).rejects.toThrow(BadRequestError);
  });

  it("should allow releaseamount of 0 (full settle, no savings)", async () => {
    const wallet = {
      ...mockWallet,
      available_balance: { add: () => 0 } as any,
      locked_balance: {
        minus: () => 0,
        greaterThan: () => false,
      } as any,
      total_balance: {} as any,
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.wallet.findUnique.mockResolvedValue(wallet);
    prismaMock.wallet.update.mockResolvedValue({ ...wallet });
    prismaMock.transactions.create
      .mockResolvedValueOnce({ id: "t1", type: "SETTLE", amount: 1000 } as any)
      .mockResolvedValueOnce({ id: "t2", type: "UNLOCK", amount: 0 } as any);

    const result = await settlemoney("user-1", 1000, 0);
    expect(result.tranc.type).toBe("SETTLE");
  });

  it("should throw if wallet not found", async () => {
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.wallet.findUnique.mockResolvedValue(null);

    await expect(settlemoney("user-1", 500, 0)).rejects.toThrow(BadRequestError);
  });
});