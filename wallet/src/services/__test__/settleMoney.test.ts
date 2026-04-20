import { prismaMock } from "../../__mocks__/prisma";

jest.mock("../../config/db", () => {
  const { prismaMock } = require("../../__mocks__/prisma");
  return { prisma: prismaMock };
});

import { settlemoney } from "../../services/settle-amount";
import { BadRequestError } from "@showsphere/common";
import { Prisma } from "../../generated/prisma/client";

describe("settleMoney service", () => {
  const baseWallet = {
    id: "wallet-1",
    userId: "user-1",
    total_balance: new Prisma.Decimal(1000),
    available_balance: new Prisma.Decimal(0),
    locked_balance: new Prisma.Decimal(1000),
    version: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => jest.clearAllMocks());

  it("should settle money and create 2 transactions (SETTLE + UNLOCK)", async () => {
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.wallet.findUnique
      .mockResolvedValueOnce(baseWallet) // initial read
      .mockResolvedValueOnce({
        ...baseWallet,
        available_balance: new Prisma.Decimal(200),
        locked_balance: new Prisma.Decimal(0),
      }); // post-update fetch

    prismaMock.wallet.updateMany.mockResolvedValue({ count: 1 });

    prismaMock.transactions.create
      .mockResolvedValueOnce({ id: "t1", type: "SETTLE", amount: 800 } as any)
      .mockResolvedValueOnce({ id: "t2", type: "UNLOCK", amount: 200 } as any);

    const result = await settlemoney("user-1", 800, 200);

    expect(result.tranc.type).toBe("SETTLE");
    expect(result.transc.type).toBe("UNLOCK");
    expect(prismaMock.transactions.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.wallet.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ version: 0 }) }),
    );
  });

  it("should throw if settle + release exceeds locked balance", async () => {
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.wallet.findUnique.mockResolvedValueOnce(baseWallet);

    await expect(settlemoney("user-1", 800, 300)).rejects.toThrow(
      BadRequestError,
    );
    expect(prismaMock.wallet.updateMany).not.toHaveBeenCalled();
  });

  it("should allow releaseamount of 0 (full settle, no savings)", async () => {
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.wallet.findUnique
      .mockResolvedValueOnce(baseWallet)
      .mockResolvedValueOnce({
        ...baseWallet,
        available_balance: new Prisma.Decimal(0),
        locked_balance: new Prisma.Decimal(0),
      });

    prismaMock.wallet.updateMany.mockResolvedValue({ count: 1 });

    prismaMock.transactions.create
      .mockResolvedValueOnce({ id: "t1", type: "SETTLE", amount: 1000 } as any)
      .mockResolvedValueOnce({ id: "t2", type: "UNLOCK", amount: 0 } as any);

    const result = await settlemoney("user-1", 1000, 0);
    expect(result.tranc.type).toBe("SETTLE");
  });

  it("should throw if wallet not found", async () => {
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.wallet.findUnique.mockResolvedValueOnce(null);

    await expect(settlemoney("user-1", 500, 0)).rejects.toThrow(BadRequestError);
  });
});