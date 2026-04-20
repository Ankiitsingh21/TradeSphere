import {
  ExpirationCompleteEvent,
  Listener,
  Subjects,
  TradeStatus,
} from "@showsphere/common";
import { queueGroupName } from "../queueGroupname";
import { Message } from "node-nats-streaming";
import { prisma } from "../../config/db";
import { getOrderBook } from "../../orderBook/map";
import { OrderCancelledPublisher } from "../publishers/Order-cancelledevent";
import { natsWrapper } from "../../natswrapper";

export class ExpirationCompleteListener extends Listener<ExpirationCompleteEvent> {
  subject: Subjects.ExpirationComplete = Subjects.ExpirationComplete;
  queueGroupName: string = queueGroupName;
  async onMessage(data: ExpirationCompleteEvent["data"], msg: Message) {
    const orderRecord = await prisma.orderBook.findUnique({
      where: {
        orderId: data.orderId,
      },
    });

    if (!orderRecord) {
      msg.ack();
      return;
    }

    if (orderRecord.status === TradeStatus.MATCHED) {
      msg.ack();
      return;
    }

    const book = getOrderBook(orderRecord.symbol);

    if (orderRecord.status === TradeStatus.PENDING) {
      book.cancelledOrders.add(data.orderId);
      const r1 = await prisma.orderBook.updateMany({
        where: {
          id: orderRecord.id,
          version: orderRecord.version,
        },
        data: {
          status: "EXPIRED",
          version: { increment: 1 },
        },
      });

      if (r1.count === 0) {
        msg.ack();
        return;
      }

      const releaseamount =
        Number(orderRecord.totalQuantity) * Number(orderRecord.price);

      await new OrderCancelledPublisher(natsWrapper.client).publish({
        orderId: data.orderId,
        releaseAmount: releaseamount,
      });
    }

    if (orderRecord.status === TradeStatus.PARTIAL) {
      book.cancelledOrders.add(`${data.orderId}-remaining`);

      const r2 = await prisma.orderBook.updateMany({
        where: {
          id: orderRecord.id,
          version: orderRecord.version,
        },
        data: {
          status: "EXPIRED",
          version: { increment: 1 },
        },
      });

      if (r2.count === 0) {
        msg.ack();
        return;
      }

      const unmatchedQty =
        Number(orderRecord.totalQuantity) - Number(orderRecord.matchedQuantity);

      const releaseamount = Number(orderRecord.price) * unmatchedQty;

      await new OrderCancelledPublisher(natsWrapper.client).publish({
        orderId: data.orderId,
        releaseAmount: releaseamount,
      });
    }

    msg.ack();
  }
}
