import {
  Listener,
  PaymentFailureExpirationCompleteEvent,
  Subjects,
} from "@showsphere/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import { prisma } from "../../config/db";
import axios from "axios";
import { PaymentFailurePublisher } from "../publishers/payment-failure-publisher";
import { natsWrapper } from "../../natswrapper";

const EXPRIATION_WINDOW_SECOND = 10;

export class PaymentFailureExpirationCompleteListener extends Listener<PaymentFailureExpirationCompleteEvent> {
  subject: Subjects.PaymentFailureExpirationComplete =
    Subjects.PaymentFailureExpirationComplete;
  queueGroupName: string = queueGroupName;

  async onMessage(
    data: PaymentFailureExpirationCompleteEvent["data"],
    msg: Message,
  ) {
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
    });

    if (!order) {
      console.log("critical error alert order not found of payment failure");
      msg.ack();
      return;
    }

    if (order.status === "EXPIRED" || order.status === "PARTIAL_EXPIRED") {
      msg.ack();
      return;
    }

    if (data.cnt > 3) {
      for (let i = 0; i < 5; i++) {
        console.log(
          "critical error alert please watch this situation gracefully",
        );
        console.log(data);
      }
      msg.ack();
      return;
    }

    const { data: settleData, status: settleStatus } = await callService(
      "http://wallet-srv:3000/api/wallet/settle-money",
      "patch",
      {
        settleamount: data.settleamount,
        releaseamount: data.releaseamount,
        userID: data.userId,
      },
    );

    if (!settleStatus || settleStatus !== 201) {
      const cnt = data.cnt + 1;
      const expiration = new Date();
      expiration.setSeconds(
        expiration.getSeconds() + EXPRIATION_WINDOW_SECOND * cnt,
      );

      const finalstatus =
        data.matchedQuantity < Number(order.totalQuantity)
          ? "PARTIAL_FILLED_PAYMENT_FAILURE"
          : "PAYMENT_FAILURE";

      const result = await prisma.order.updateMany({
        where: { id: order.id, version: order.version },
        data: {
          expiresAt: expiration,
          status: finalstatus,
          version: { increment: 1 },
        },
      });

      if (result.count === 0) {
        msg.ack();
        return;
      }

      await new PaymentFailurePublisher(natsWrapper.client).publish({
        orderId: order.id,
        expiresAt: expiration!.toISOString(),
        matchedQuantity: data.matchedQuantity,
        resolved: data.settleamount,
        settleamount: data.settleamount,
        releaseamount: data.releaseamount,
        status: finalstatus,
        userId: order.userId,
        cnt: cnt,
      });

      msg.ack();
      return;
    }

    const finalStatus =
      Number(data.matchedQuantity) === Number(order.totalQuantity)
        ? "SUCCESS"
        : "PARTIAL_FILLED";

    const result = await prisma.order.updateMany({
      where: { id: order.id, version: order.version },
      data: {
        status: finalStatus,
        resolved: data.settleamount,
        matchedQuantity: data.matchedQuantity,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      msg.ack();
      return;
    }

    msg.ack();
    return;
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
