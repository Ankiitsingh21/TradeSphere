import { prismaMock } from "../../__mocks__/prisma";

jest.mock("../../config/db", () => {
  const { prismaMock } = require("../../__mocks__/prisma");
  return { prisma: prismaMock };
});

import { buy } from "../../services/create";
import { sell } from "../../services/update";
import { verifyy } from "../../services/verify-holdings";
import { BadRequestError } from "@showsphere/common";
import { Prisma } from "../../generated/prisma/client";

const mockPortfolio = {
  id: "some-id",
  userId: "user-id",
  symbol: "TATA",
  avgBuyPrice: new Prisma.Decimal(100),
  quantity: new Prisma.Decimal(10),
  totalInvested: new Prisma.Decimal(1000),
  version: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Portfolio buy service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
  });

  it("should create new portfolio entry if stock not owned", async () => {
    prismaMock.portfolio.findUnique.mockResolvedValue(null);
    prismaMock.portfolio.create.mockResolvedValue(mockPortfolio);

    await buy("user-1", "TATA", 2000, 5);

    expect(prismaMock.portfolio.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user-1", symbol: "TATA" }),
      }),
    );
  });

  it("should update existing portfolio with OCC version check when buying more", async () => {
    prismaMock.portfolio.findUnique
      .mockResolvedValueOnce(mockPortfolio) // initial read
      .mockResolvedValueOnce({
        ...mockPortfolio,
        quantity: new Prisma.Decimal(15),
        avgBuyPrice: new Prisma.Decimal(1983),
        version: 1,
      }); // post-update fetch

    prismaMock.portfolio.updateMany.mockResolvedValue({ count: 1 });

    await buy("user-1", "TATA", 1950, 5);

    expect(prismaMock.portfolio.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ version: 0 }),
      }),
    );
  });

  it("should throw if quantity is 0 or negative", async () => {
    await expect(buy("user-1", "TATA", 2000, 0)).rejects.toThrow(
      BadRequestError,
    );
    expect(prismaMock.portfolio.create).not.toHaveBeenCalled();
  });
});

describe("Portfolio sell service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
  });

  it("should reduce quantity on partial sell", async () => {
    prismaMock.portfolio.findUnique
      .mockResolvedValueOnce(mockPortfolio)
      .mockResolvedValueOnce({
        ...mockPortfolio,
        quantity: new Prisma.Decimal(8),
        version: 1,
      });

    prismaMock.portfolio.updateMany.mockResolvedValue({ count: 1 });

    await sell("user-1", "TATA", 2000, 2);

    expect(prismaMock.portfolio.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ version: 0 }),
        data: expect.objectContaining({ version: { increment: 1 } }),
      }),
    );
  });

  it("should delete portfolio entry using deleteMany (OCC) when all shares sold", async () => {
    const existing = { ...mockPortfolio, quantity: new Prisma.Decimal(5) };

    prismaMock.portfolio.findUnique.mockResolvedValueOnce(existing);
    // deleteMany returns count, not the record
    prismaMock.portfolio.deleteMany.mockResolvedValue({ count: 1 });

    const result = await sell("user-1", "TATA", 2000, 5);

    expect(prismaMock.portfolio.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ version: 0 }),
      }),
    );
    expect(result.message).toBe("Position closed");
  });

  it("should throw if user tries to sell more than owned", async () => {
    prismaMock.portfolio.findUnique.mockResolvedValueOnce({
      ...mockPortfolio,
      quantity: new Prisma.Decimal(5),
    });

    await expect(sell("user-1", "TATA", 2000, 100)).rejects.toThrow(
      BadRequestError,
    );
    expect(prismaMock.portfolio.updateMany).not.toHaveBeenCalled();
  });

  it("should throw if stock not in portfolio", async () => {
    prismaMock.portfolio.findUnique.mockResolvedValueOnce(null);

    await expect(sell("user-1", "TATA", 2000, 5)).rejects.toThrow(
      BadRequestError,
    );
  });
});

describe("Portfolio verify service", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should return stock if user owns it", async () => {
    prismaMock.portfolio.findUnique.mockResolvedValue(mockPortfolio);

    const result = await verifyy("user-1", "TATA");

    expect(result.symbol).toBe("TATA");
    expect(result.userId).toBe("user-id");
  });

  it("should throw if stock not owned", async () => {
    prismaMock.portfolio.findUnique.mockResolvedValue(null);

    await expect(verifyy("user-1", "TATA")).rejects.toThrow(BadRequestError);
  });
});