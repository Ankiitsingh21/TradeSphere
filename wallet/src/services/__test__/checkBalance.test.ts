import { prismaMock } from "../../__mocks__/prisma";

jest.mock("../../config/db", () => {
  const { prismaMock } = require("../../__mocks__/prisma");
  return { prisma: prismaMock };
});

import { checkbalance } from "../../services/checkBalance";
import { BadRequestError } from "@showsphere/common";
import { Prisma } from "../../generated/prisma/client";

describe("checkBalance service", () => {
  const mockWallet = {
    id: "wallet-1",
    userId: "user-1",
    total_balance: new Prisma.Decimal(2500),
    available_balance: new Prisma.Decimal(2000),
    locked_balance: new Prisma.Decimal(500),
    version: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => jest.clearAllMocks());

  it("should return wallet record including all balance fields", async () => {
    prismaMock.wallet.findUnique.mockResolvedValue(mockWallet);

    const result = await checkbalance("user-1");

    expect(prismaMock.wallet.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(result.userId).toBe("user-1");
    expect(result.total_balance.toString()).toBe("2500");
    expect(result.available_balance.toString()).toBe("2000");
    expect(result.locked_balance.toString()).toBe("500");
  });

  it("should throw BadRequestError when wallet is not found", async () => {
    prismaMock.wallet.findUnique.mockResolvedValue(null);

    await expect(checkbalance("user-1")).rejects.toThrow(BadRequestError);
  });

  it("should query by userId not wallet id", async () => {
    prismaMock.wallet.findUnique.mockResolvedValue(mockWallet);

    await checkbalance("user-abc");

    expect(prismaMock.wallet.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-abc" },
    });
  });
});
