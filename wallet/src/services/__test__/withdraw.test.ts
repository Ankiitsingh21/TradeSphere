import { prismaMock } from "../../__mocks__/prisma";

jest.mock("../../config/db", () => {
  const { prismaMock } = require("../../__mocks__/prisma");
  return { prisma: prismaMock };
});

import { withdraw } from "../../services/withdraw";
import { BadRequestError } from "@showsphere/common";
import { Prisma } from "../../generated/prisma/client";

describe("withdraw service", () => {
  const mockWallet = {
    id: "wallet-1",
    userId: "user-1",
    total_balance: new Prisma.Decimal(1000),
    available_balance: new Prisma.Decimal(1000),
    locked_balance: new Prisma.Decimal(0),
    version: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
  });

  it("should withdraw successfully and create WITHDRAW transaction", async () => {
    prismaMock.wallet.findUnique
      .mockResolvedValueOnce(mockWallet) // initial read
      .mockResolvedValueOnce({
        ...mockWallet,
        available_balance: new Prisma.Decimal(700),
        total_balance: new Prisma.Decimal(700),
        version: 1,
      }); // post-update fetch

    prismaMock.wallet.updateMany.mockResolvedValue({ count: 1 });

    prismaMock.transactions.create.mockResolvedValue({
      id: "txn-1",
      type: "WITHDRAW",
      amount: 300,
    } as any);

    const result = await withdraw("user-1", 300);

    expect(prismaMock.wallet.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "wallet-1", version: 0 }),
        data: expect.objectContaining({
          available_balance: { decrement: 300 },
          total_balance: { decrement: 300 },
          version: { increment: 1 },
        }),
      }),
    );
    expect(result.tranc.type).toBe("WITHDRAW");
    expect(result.update!.available_balance.toString()).toBe("700");
  });

  it("should throw BadRequestError when available balance is insufficient", async () => {
    prismaMock.wallet.findUnique.mockResolvedValueOnce({
      ...mockWallet,
      available_balance: new Prisma.Decimal(100),
    });

    await expect(withdraw("user-1", 500)).rejects.toThrow(BadRequestError);
    expect(prismaMock.wallet.updateMany).not.toHaveBeenCalled();
  });

  it("should throw BadRequestError when wallet is not found", async () => {
    prismaMock.wallet.findUnique.mockResolvedValueOnce(null);

    await expect(withdraw("user-1", 100)).rejects.toThrow(BadRequestError);
    expect(prismaMock.wallet.updateMany).not.toHaveBeenCalled();
  });

  it("should allow withdrawing the full available balance", async () => {
    prismaMock.wallet.findUnique
      .mockResolvedValueOnce(mockWallet) // available=1000
      .mockResolvedValueOnce({
        ...mockWallet,
        available_balance: new Prisma.Decimal(0),
        total_balance: new Prisma.Decimal(0),
        version: 1,
      });

    prismaMock.wallet.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.transactions.create.mockResolvedValue({
      id: "txn-1",
      type: "WITHDRAW",
      amount: 1000,
    } as any);

    const result = await withdraw("user-1", 1000);
    expect(result.update!.available_balance.toString()).toBe("0");
  });

  it("should include a WITHDRAW transaction record in the result", async () => {
    prismaMock.wallet.findUnique
      .mockResolvedValueOnce(mockWallet)
      .mockResolvedValueOnce({ ...mockWallet, version: 1 });

    prismaMock.wallet.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.transactions.create.mockResolvedValue({
      id: "txn-99",
      userId: "user-1",
      walletId: "wallet-1",
      type: "WITHDRAW",
      amount: 200,
      createdAt: new Date(),
    } as any);

    const result = await withdraw("user-1", 200);
    expect(result.tranc).toEqual(
      expect.objectContaining({ type: "WITHDRAW", amount: 200 }),
    );
  });
});
