import { prismaMock } from "../../__mocks__/prisma";

jest.mock("../../config/db", () => {
  const { prismaMock } = require("../../__mocks__/prisma");
  return { prisma: prismaMock };
});

import { createwallet } from "../../services/createWallet";
import { BadRequestError } from "@showsphere/common";
import { Prisma } from "../../generated/prisma/client";

describe("createWallet service", () => {
  const mockWallet = {
    id: "wallet-1",
    userId: "user-1",
    total_balance: new Prisma.Decimal(0),
    available_balance: new Prisma.Decimal(0),
    locked_balance: new Prisma.Decimal(0),
    version: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => jest.clearAllMocks());

  it("should create a new wallet when user has none (upsert inserts)", async () => {
    prismaMock.wallet.upsert.mockResolvedValue(mockWallet);

    const result = await createwallet("user-1");

    expect(prismaMock.wallet.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      update: {},
      create: { userId: "user-1" },
    });
    expect(result.userId).toBe("user-1");
    expect(result.total_balance.toString()).toBe("0");
  });

  it("should return existing wallet without modification when user already has one (upsert no-op)", async () => {
    const existingWallet = {
      ...mockWallet,
      total_balance: new Prisma.Decimal(5000),
    };
    prismaMock.wallet.upsert.mockResolvedValue(existingWallet);

    const result = await createwallet("user-1");

    // update: {} ensures no fields are touched for existing wallets
    expect(prismaMock.wallet.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: {} }),
    );
    expect(result.total_balance.toString()).toBe("5000");
  });

  it("should throw BadRequestError when upsert throws (db unreachable)", async () => {
    prismaMock.wallet.upsert.mockRejectedValue(new Error("connection refused"));

    await expect(createwallet("user-1")).rejects.toThrow(BadRequestError);
  });
});
