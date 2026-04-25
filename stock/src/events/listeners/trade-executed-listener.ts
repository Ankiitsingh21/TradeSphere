import { Listener, Subjects, TradeExecutedEvent } from "@showsphere/common";
import { Message } from "node-nats-streaming";
import { prisma } from "../../config/db";
import { broadcastStockPrice } from "../../sse/sse-manager";

export class TradeExecutedStockListener extends Listener<TradeExecutedEvent> {
  subject: Subjects.TradeExecuted = Subjects.TradeExecuted;
  queueGroupName = "stock-service";

  async onMessage(data: TradeExecutedEvent["data"], msg: Message) {
    try {
      const symbol = data.symbol;
      const newPrice = Number(data.tradePrice);

      if (!symbol || !Number.isFinite(newPrice) || newPrice <= 0) {
        msg.ack();
        return;
      }

      const existing = await prisma.stock.findUnique({ where: { symbol } });
      if (!existing) {
        msg.ack();
        return;
      }

      const previousPrice = existing.price.toNumber();

      const result = await prisma.stock.updateMany({
        where: { symbol, version: existing.version },
        data: { price: newPrice, version: { increment: 1 } },
      });

      if (result.count === 0) {
        msg.ack();
        return;
      }

      broadcastStockPrice({
        symbol,
        price: newPrice,
        previousPrice,
        updatedAt: new Date().toISOString(),
      });

      msg.ack();
    } catch (err) {
      console.error("TradeExecutedStockListener error:", err);
      msg.ack();
    }
  }
}