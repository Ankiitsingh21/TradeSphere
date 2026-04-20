// tests/services/lockMoney.test.ts

import { prismaMock } from "../../__mocks__/prisma";

jest.mock("../../config/db", () => {
  const { prismaMock } = require("../../__mocks__/prisma");
  return { prisma: prismaMock };
});

import { lockmoney } from "../../services/lockMoney";
import { BadRequestError } from "@showsphere/common";

describe("lockMoney service", () => {
  const mockWallet = {
    id: "wallet-1",
    userId: "user-1",
    total_balance: { toNumber: () => 1000 } as any,
    available_balance: { toNumber: () => 1000 } as any,
    locked_balance: { toNumber: () => 0 } as any,
    version: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // default transaction mock
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock)
    );
  });

  it("should lock money successfully when balance is sufficient", async () => {
    prismaMock.wallet.findUnique
      .mockResolvedValueOnce(mockWallet) // read
      .mockResolvedValueOnce({
        ...mockWallet,
        available_balance: 700 as any,
        locked_balance: 300 as any,
      }); 

    prismaMock.wallet.updateMany.mockResolvedValue({ count: 1 });

    prismaMock.transactions.create.mockResolvedValue({
      id: "txn-1",
      type: "LOCK",
      amount: 300 as any,
    } as any);

    const result = await lockmoney("user-1", 300);

    expect(result.tranc.type).toBe("LOCK");
    expect(result.update!.available_balance).toBe(700);
    expect(result.update!.locked_balance).toBe(300);
  });

  it("should throw if available balance is insufficient", async () => {
    prismaMock.wallet.findUnique.mockResolvedValue(mockWallet);

    await expect(lockmoney("user-1", 5000)).rejects.toThrow(BadRequestError);
  });

  it("should throw if wallet not found", async () => {
    prismaMock.wallet.findUnique.mockResolvedValue(null);

    await expect(lockmoney("user-1", 300)).rejects.toThrow(BadRequestError);
  });

  it("should allow locking full balance (available becomes 0)", async () => {
    prismaMock.wallet.findUnique
      .mockResolvedValueOnce(mockWallet)
      .mockResolvedValueOnce({
        ...mockWallet,
        available_balance: 0 as any,
        locked_balance: 1000 as any,
      });

    prismaMock.wallet.updateMany.mockResolvedValue({ count: 1 });

    prismaMock.transactions.create.mockResolvedValue({
      id: "txn-1",
      type: "LOCK",
      amount: 1000 as any,
    } as any);

    const result = await lockmoney("user-1", 1000);

    expect(result.update!.available_balance).toBe(0);
    expect(result.update!.locked_balance).toBe(1000);
  });
});