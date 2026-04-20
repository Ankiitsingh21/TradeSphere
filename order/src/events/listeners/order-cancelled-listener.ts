import {
  BadRequestError,
  Listener,
  OrderCancelledEvent,
  Subjects,
  TradeOrderCancelledEvent,
} from "@showsphere/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import { prisma } from "../../config/db";
import axios from "axios";

export class OrderCancelledListener extends Listener<TradeOrderCancelledEvent> {
  subject: Subjects.TradeOrderCancelled = Subjects.TradeOrderCancelled;
  queueGroupName: string = queueGroupName;
  async onMessage(data: TradeOrderCancelledEvent["data"], msg: Message) {
    const order = await prisma.order.findUnique({
      where: {
        id: data.orderId,
      },
    });

    if (!order) {
      msg.ack();
      console.log("critical error alert");
      return;
    }

    if (order.status === "EXPIRED" || order.status === "PARTIAL_EXPIRED") {
      msg.ack();
      return;
    }

    const finalStatus =
      Number(order.matchedQuantity) > 0 ? "PARTIAL_EXPIRED" : "EXPIRED";
    const occResult = await prisma.order.updateMany({
      where: { id: order.id, version: order.version },
      data: { status: finalStatus, version: { increment: 1 } },
    });
    if (occResult.count === 0) {
      msg.ack();
      return;
    }
    const { data: settleData, status: settleStatus } = await callService(
      "http://wallet-srv:3000/api/wallet/settle-money",
      "patch",
      {
        settleamount: 0,
        releaseamount: data.releaseAmount,
        userID: order.userId,
      },
    );
    //     console.log(settleData)

    if (!settleStatus || settleStatus !== 201) {
      console.log("problem in settling money");
      msg.ack();
      return;
    }

    //     console.log(data);
    msg.ack();
  }
}

const callService = async (url: string, method: string, payload: any) => {
  try {
    const response = await axios({ method, url, data: payload, timeout: 5000 });
    return { data: response.data, status: response.status };
  } catch (error: any) {
    return {
      data: error.response?.data,
      status: error.response?.status,
    };
  }
};
