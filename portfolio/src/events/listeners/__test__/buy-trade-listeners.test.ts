jest.mock("../../../config/db", () => {
  const { prismaMock } = require("../../../__mocks__/prisma");
  return { prisma: prismaMock };
});

// Mock the service directly — listener behavior is independent of service internals
jest.mock("../../../services/create");

import { BuyTradeListener } from "../buy-trade-listeners";
import { buy } from "../../../services/create";
import { TradeType } from "@showsphere/common";
import { Prisma } from "../../../generated/prisma/client";
import { Message } from "node-nats-streaming";

const mockedBuy = buy as jest.MockedFunction<typeof buy>;

const mockMsg = { ack: jest.fn() } as unknown as Message;

const mockClient = { publish: jest.fn() } as any;

const buyEventData = {
  userId: "user-1",
  symbol: "RELIANCE",
  price: new Prisma.Decimal(2000),
  quantity: new Prisma.Decimal(5),
  type: TradeType.Buy,
};

let listener: BuyTradeListener;

describe("BuyTradeListener", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listener = new BuyTradeListener(mockClient);
  });

  it("should call buy service with correct arguments and ack on success", async () => {
    mockedBuy.mockResolvedValueOnce({} as any);

    await listener.onMessage(buyEventData, mockMsg);

    expect(mockedBuy).toHaveBeenCalledWith(
      buyEventData.userId,
      buyEventData.symbol,
      buyEventData.price,
      buyEventData.quantity,
    );
    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
  });

  it("should NOT ack when buy service throws (allows NATS re-delivery)", async () => {
    mockedBuy.mockRejectedValueOnce(new Error("DB connection failed"));

    await listener.onMessage(buyEventData, mockMsg);

    expect(mockMsg.ack).not.toHaveBeenCalled();
  });

  it("should log the error when buy service throws", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("DB unavailable");
    mockedBuy.mockRejectedValueOnce(error);

    await listener.onMessage(buyEventData, mockMsg);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("BuyTradeListener error"),
      error,
    );
    consoleSpy.mockRestore();
  });
});