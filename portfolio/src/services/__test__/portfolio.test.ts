import { prismaMock } from "../../__mocks__/prisma";
jest.mock("../../config/db", () => ({ prisma: prismaMock }));

import { buy } from "../../services/create";
import { sell } from "../../services/update";
import { verifyy } from "../../services/verify-holdings";
import { BadRequestError } from "@showsphere/common";

const mockPortfolio = {
  id: "p-1",
  userId: "user-1",
  symbol: "RELIANCE",
  avgBuyPrice: { toNumber: () => 2000, mul: jest.fn(), plus: jest.fn(), div: jest.fn() } as any,
  quantity: { toNumber: () => 5, plus: jest.fn(), minus: jest.fn(), gt: jest.fn(), eq: jest.fn(), lte: jest.fn() } as any,
  totalInvested: { toNumber: () => 10000, plus: jest.fn(), minus: jest.fn() } as any,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Portfolio buy service", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should create new portfolio entry if stock not owned", async () => {
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.portfolio.findUnique.mockResolvedValue(null);
    prismaMock.portfolio.create.mockResolvedValue(mockPortfolio);

    const result = await buy("user-1", "RELIANCE", 2000, 5);
    expect(prismaMock.portfolio.create).toHaveBeenCalled();
  });

  it("should update existing portfolio with correct avg price when buying more", async () => {
    // User already owns 5 shares at avg 2000
    const existing = {
      ...mockPortfolio,
      quantity: { lte: () => false, plus: (v: any) => ({ div: () => 1983 }) } as any,
      totalInvested: { plus: () => 19900 } as any,
      avgBuyPrice: { mul: jest.fn() } as any,
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.portfolio.findUnique.mockResolvedValue(existing);
    prismaMock.portfolio.update.mockResolvedValue({
      ...mockPortfolio,
      quantity: 10 as any,
      avgBuyPrice: 1983 as any,
    });

    await buy("user-1", "RELIANCE", 1950, 5);
    expect(prismaMock.portfolio.update).toHaveBeenCalled();
  });

  it("should throw if quantity is 0 or negative", async () => {
    await expect(buy("user-1", "RELIANCE", 2000, 0)).rejects.toThrow(BadRequestError);
  });
});

describe("Portfolio sell service", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should reduce quantity on partial sell", async () => {
    const existing = {
      ...mockPortfolio,
      quantity: {
        lte: () => false,
        minus: () => ({ eq: () => false, toString: () => "3" }),
        gt: () => false,
      } as any,
      avgBuyPrice: { mul: () => ({ toString: () => "6000" }) } as any,
      totalInvested: { minus: () => 6000 } as any,
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.portfolio.findUnique.mockResolvedValue(existing);
    prismaMock.portfolio.update.mockResolvedValue({ ...mockPortfolio, quantity: 3 as any });

    const result = await sell("user-1", "RELIANCE", 2000, 2);
    expect(prismaMock.portfolio.update).toHaveBeenCalled();
  });

  it("should delete portfolio entry when all shares sold", async () => {
    const existing = {
      ...mockPortfolio,
      quantity: {
        lte: () => false,
        minus: () => ({ eq: () => true, toString: () => "0" }),
        gt: () => false,
      } as any,
      avgBuyPrice: { mul: () => ({ toString: () => "10000" }) } as any,
      totalInvested: { minus: () => 10000 } as any,
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.portfolio.findUnique.mockResolvedValue(existing);
    prismaMock.portfolio.delete.mockResolvedValue(existing);

    const result = await sell("user-1", "RELIANCE", 2000, 5);
    expect(prismaMock.portfolio.delete).toHaveBeenCalled();
    expect(result.message).toBe("Position closed");
  });

  it("should throw if user tries to sell more than owned", async () => {
    const existing = {
      ...mockPortfolio,
      quantity: {
        lte: () => false,
        gt: () => true,
      } as any,
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.portfolio.findUnique.mockResolvedValue(existing);

    await expect(sell("user-1", "RELIANCE", 2000, 100)).rejects.toThrow(BadRequestError);
  });

  it("should throw if stock not in portfolio", async () => {
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.portfolio.findUnique.mockResolvedValue(null);

    await expect(sell("user-1", "RELIANCE", 2000, 5)).rejects.toThrow(BadRequestError);
  });
});

describe("Portfolio verify service", () => {
  it("should return stock if user owns it", async () => {
    prismaMock.portfolio.findUnique.mockResolvedValue(mockPortfolio);

    const result = await verifyy("user-1", "RELIANCE");
    expect(result.symbol).toBe("RELIANCE");
  });

  it("should throw if stock not owned", async () => {
    prismaMock.portfolio.findUnique.mockResolvedValue(null);

    await expect(verifyy("user-1", "RELIANCE")).rejects.toThrow(BadRequestError);
  });
});