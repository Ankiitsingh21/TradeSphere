import {
  Listener,
  Subjects,
  TradeExecutedEvent,
  TradeType,
} from "@showsphere/common";
import { Message } from "node-nats-streaming";
import { prisma } from "../../config/db";
import axios from "axios";
import { BuyTradePublisher } from "../publishers/buy-trade-event";
import { SellTradePublisher } from "../publishers/sell-trade-event";
import { natsWrapper } from "../../natswrapper";
import { queueGroupName } from "../queueGroupName";


export class TradeExecutedListener extends Listener<TradeExecutedEvent> {
  subject: Subjects.TradeExecuted = Subjects.TradeExecuted;
  queueGroupName = queueGroupName;

  async onMessage(data: TradeExecutedEvent["data"], msg: Message) {
    try {
      const baseOrderId = data.orderId.replace("-remaining", "");

      const order = await prisma.order.findUnique({
        where: { id: baseOrderId },
      });

      if (!order) {
        console.error(`TradeExecutedListener: order ${baseOrderId} not found`);
        msg.ack();
        return;
      }

      if (order.status === "SUCCESS") {
        msg.ack();
        return;
      }

      if (data.type === TradeType.Buy) {
        await this.handleBuySettlement(order, data);
      } else {
        await this.handleSellCredit(order, data);
      }

      msg.ack();
    } catch (err) {
      console.error("TradeExecutedListener error, will retry:", err);
    }
  }

  private async handleBuySettlement(
    order: any,
    data: TradeExecutedEvent["data"],
  ) {
    const lockamount = Number(order.price) * Number(order.totalQuantity);
    const releaseAmount = data.releaseAmount ? Number(data.releaseAmount) : 0;
    const settleAmount = lockamount - releaseAmount;

    await callService(
      "http://wallet-srv:3000/api/wallet/settle-money",
      "patch",
      {
        settleamount: settleAmount,
        releaseamount: releaseAmount,
        userID: order.userId,
      },
    );

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: "SUCCESS", resolved: settleAmount },
    });

    await new BuyTradePublisher(natsWrapper.client).publish({
      userId: updated.userId,
      symbol: updated.symbol,
      price: updated.price,
      quantity: data.matchedQty,
      type: TradeType.Buy,
    });
  }

  private async handleSellCredit(order: any, data: TradeExecutedEvent["data"]) {
    const creditAmount = Number(data.tradePrice) * Number(data.matchedQty);

    await callService(
      "http://wallet-srv:3000/api/wallet/credit-money",
      "patch",
      {
        amount: creditAmount,
        userID: order.userId,
      },
    );

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: "SUCCESS", resolved: creditAmount },
    });

    await new SellTradePublisher(natsWrapper.client).publish({
      userId: updated.userId,
      symbol: updated.symbol,
      price: updated.price,
      quantity: data.matchedQty,
      type: TradeType.Sell,
    });
  }
}

const callService = async (url: string, method: string, payload: any) => {
  const response = await axios({ method, url, data: payload });
  if (response.status !== 201) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.data;
};