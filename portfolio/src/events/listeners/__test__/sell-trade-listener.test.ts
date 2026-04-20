jest.mock("../../../config/db", () => {
  const { prismaMock } = require("../../../__mocks__/prisma");
  return { prisma: prismaMock };
});

jest.mock("../../../services/update");

import { SellTradeListener } from "../sell-trade-listener";
import { sell } from "../../../services/update";
import { TradeType } from "@showsphere/common";
import { Prisma } from "../../../generated/prisma/client";
import { Message } from "node-nats-streaming";

const mockedSell = sell as jest.MockedFunction<typeof sell>;

const mockMsg = { ack: jest.fn() } as unknown as Message;
const mockClient = { publish: jest.fn() } as any;

const sellEventData = {
  userId: "user-1",
  symbol: "RELIANCE",
  price: new Prisma.Decimal(2000),
  quantity: new Prisma.Decimal(3),
  type: TradeType.Sell,
};

let listener: SellTradeListener;

describe("SellTradeListener", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listener = new SellTradeListener(mockClient);
  });

  it("should call sell service with correct arguments and ack on success", async () => {
    mockedSell.mockResolvedValueOnce({
      updated: null,
      profit: "600",
    } as any);

    await listener.onMessage(sellEventData, mockMsg);

    expect(mockedSell).toHaveBeenCalledWith(
      sellEventData.userId,
      sellEventData.symbol,
      sellEventData.price,
      sellEventData.quantity,
    );
    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
  });

  it("should NOT ack when sell service throws (allows NATS re-delivery)", async () => {
    mockedSell.mockRejectedValueOnce(new Error("Portfolio not found"));

    await listener.onMessage(sellEventData, mockMsg);

    expect(mockMsg.ack).not.toHaveBeenCalled();
  });

  it("should log the error when sell service throws", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Prisma error");
    mockedSell.mockRejectedValueOnce(error);

    await listener.onMessage(sellEventData, mockMsg);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("BuyTradeListener error"), 
      error,
    );
    consoleSpy.mockRestore();
  });

  it("should handle position-closed result (sell all shares) without error", async () => {
    mockedSell.mockResolvedValueOnce({
      message: "Position closed",
      profit: "2000",
    } as any);

    await listener.onMessage(sellEventData, mockMsg);

    expect(mockMsg.ack).toHaveBeenCalledTimes(1);
  });
});