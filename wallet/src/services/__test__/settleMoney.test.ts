import { prismaMock } from "../../__mocks__/prisma";

jest.mock("../../config/db", () => {
  const { prismaMock } = require("../../__mocks__/prisma");
  return { prisma: prismaMock };
});

import { settlemoney } from "../../services/settle-amount";
import { BadRequestError } from "@showsphere/common";

import { Prisma } from "../../generated/prisma/client";

describe("settleMoney service", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should settle money and create 2 transactions (SETTLE + UNLOCK)", async () => {
    const wallet = {
      id: "wallet-1",
      userId: "user-1",
      total_balance: new Prisma.Decimal(1000),
      available_balance: new Prisma.Decimal(0),
      locked_balance: new Prisma.Decimal(1000),
      version: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.wallet.findUnique.mockResolvedValue(wallet);

    prismaMock.wallet.update.mockResolvedValue({
      ...wallet,
      available_balance: new Prisma.Decimal(200),
      locked_balance: new Prisma.Decimal(0),
    });

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
      id: "wallet-1",
      userId: "user-1",
      total_balance: new Prisma.Decimal(1000),
      available_balance: new Prisma.Decimal(0),
      locked_balance: new Prisma.Decimal(1000),
      version: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.wallet.findUnique.mockResolvedValue(wallet);

    await expect(settlemoney("user-1", 800, 300)).rejects.toThrow(BadRequestError);
  });

  it("should allow releaseamount of 0 (full settle, no savings)", async () => {
    const wallet = {
      id: "wallet-1",
      userId: "user-1",
      total_balance: new Prisma.Decimal(1000),
      available_balance: new Prisma.Decimal(0),
      locked_balance: new Prisma.Decimal(1000),
      version: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.wallet.findUnique.mockResolvedValue(wallet);

    prismaMock.wallet.update.mockResolvedValue({
      ...wallet,
      available_balance: new Prisma.Decimal(0),
      locked_balance: new Prisma.Decimal(0),
    });

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