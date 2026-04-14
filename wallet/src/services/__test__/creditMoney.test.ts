import { prismaMock } from "../../__mocks__/prisma";

jest.mock("../../config/db", () => {
  const { prismaMock } = require("../../__mocks__/prisma");
  return { prisma: prismaMock };
});

import { credit } from "../../services/creditMoney";
import { BadRequestError } from "@showsphere/common";

describe("creditMoney service", () => {
  const mockWallet = {
    id: "wallet-1",
    userId: "user-1",
    total_balance: { toNumber: () => 0 } as any,
    available_balance: { toNumber: () => 0 } as any,
    locked_balance: { toNumber: () => 0 } as any,
    version: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => jest.clearAllMocks());

  it("should credit money and create CREDIT transaction", async () => {
    prismaMock.wallet.findUnique.mockResolvedValue(mockWallet);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.wallet.update.mockResolvedValue({
      ...mockWallet,
      available_balance: 5000 as any,
      total_balance: 5000 as any,
    });
    prismaMock.transactions.create.mockResolvedValue({
      id: "txn-1",
      type: "CREDIT",
      amount: 5000,
    } as any);

    const result = await credit("user-1", 5000);
    expect(result.tranc.type).toBe("CREDIT");
    expect(result.update.available_balance).toBe(5000);
  });

  it("should throw if wallet not found", async () => {
    prismaMock.wallet.findUnique.mockResolvedValue(null);

    await expect(credit("user-1", 5000)).rejects.toThrow(BadRequestError);
  });
});
