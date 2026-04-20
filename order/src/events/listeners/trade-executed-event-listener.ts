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
import { PaymentFailurePublisher } from "../publishers/payment-failure-publisher";
import { SellPaymentFailurePublisher } from "../publishers/sellPaymentFailurePublisher";
import { Prisma } from "../../generated/prisma/client";

const EXPRIATION_WINDOW_SECOND = 10;

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
    // Fix: use Prisma.Decimal to avoid float precision loss on financial amounts
    const lockamountD = new Prisma.Decimal(order.price).mul(
      new Prisma.Decimal(order.totalQuantity),
    );
    const releaseAmountD = data.releaseAmount
      ? new Prisma.Decimal(data.releaseAmount)
      : new Prisma.Decimal(0);
    const settleAmountD = lockamountD.minus(releaseAmountD);

    const { status: settleStatus } = await callService(
      "http://wallet-srv:3000/api/wallet/settle-money",
      "patch",
      {
        settleamount: settleAmountD.toNumber(),
        releaseamount: releaseAmountD.toNumber(),
        userID: order.userId,
      },
    );

    const expiration = new Date();
    expiration.setSeconds(expiration.getSeconds() + EXPRIATION_WINDOW_SECOND);

    if (!settleStatus || settleStatus !== 201) {
      const cnt = 1;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "PAYMENT_FAILURE",
          resolved: settleAmountD.toNumber(),
          matchedQuantity: data.matchedQty,
          expiresAt: expiration,
        },
      });

      await new PaymentFailurePublisher(natsWrapper.client).publish({
        orderId: order.id,
        expiresAt: expiration.toISOString(),
        matchedQuantity: data.matchedQty,
        resolved: settleAmountD.toNumber(),
        settleamount: settleAmountD.toNumber(),
        releaseamount: releaseAmountD.toNumber(),
        status: "PAYMENT_FAILURE",
        userId: order.userId,
        cnt,
      });

      return;
    }

    // SUCCESS
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "SUCCESS",
        resolved: settleAmountD.toNumber(),
        matchedQuantity: data.matchedQty,
      },
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
    // Fix: use Prisma.Decimal to avoid float precision loss
    const creditAmountD = new Prisma.Decimal(data.tradePrice).mul(
      new Prisma.Decimal(data.matchedQty),
    );

    const { status: creditStatus } = await callService(
      "http://wallet-srv:3000/api/wallet/credit-money",
      "patch",
      {
        amount: creditAmountD.toNumber(),
        userID: order.userId,
      },
    );

    const expiration = new Date();
    expiration.setSeconds(expiration.getSeconds() + EXPRIATION_WINDOW_SECOND);

    if (!creditStatus || creditStatus !== 201) {
      const cnt = 1;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "PAYMENT_FAILURE",
          resolved: creditAmountD.toNumber(),
          matchedQuantity: data.matchedQty,
          expiresAt: expiration,
        },
      });

      await new SellPaymentFailurePublisher(natsWrapper.client).publish({
        orderId: order.id,
        expiresAt: expiration.toISOString(),
        amount: creditAmountD.toNumber(),
        userId: order.userId,
        status: "PAYMENT_FAILURE",
        cnt,
      });

      return;
    }

    // SUCCESS
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "SUCCESS",
        resolved: creditAmountD.toNumber(),
        matchedQuantity: data.matchedQty,
      },
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
  try {
    const response = await axios({ method, url, data: payload });
    return { data: response.data, status: response.status };
  } catch (error: any) {
    return {
      data: error.response?.data,
      status: error.response?.status,
    };
  }
};