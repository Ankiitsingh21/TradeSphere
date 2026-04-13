import { prismaMock } from "../../__mocks__/prisma";

jest.mock("../../config/db", () => {
  const { prismaMock } = require("../../__mocks__/prisma");
  return { prisma: prismaMock };
});


import { addmoney } from "../../services/addMoney";
import { BadRequestError } from "@showsphere/common";

describe("addMoney service", () => {
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

  beforeEach(() => jest.clearAllMocks());

  it("should add money and create transaction", async () => {
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock)
    );
    prismaMock.wallet.findUnique.mockResolvedValue(mockWallet);
    prismaMock.wallet.update.mockResolvedValue({
      ...mockWallet,
      total_balance: 1500 as any,
      available_balance: 1500 as any,
    });
    prismaMock.transactions.create.mockResolvedValue({
      id: "txn-1",
      userId: "user-1",
      walletId: "wallet-1",
      type: "ADD",
      amount: 500 as any,
      createdAt: new Date(),
    } as any);

    const result = await addmoney("user-1", 500);
    expect(result.addmoney.total_balance).toBe(1500);
    expect(result.createtransactions.type).toBe("ADD");
  });

  it("should throw if wallet not found", async () => {
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock)
    );
    prismaMock.wallet.findUnique.mockResolvedValue(null);

    await expect(addmoney("user-1", 500)).rejects.toThrow(BadRequestError);
  });
});