import {
  Listener,
  SellPaymentFailureExpirationEventcomplete,
  Subjects,
} from "@showsphere/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import { prisma } from "../../config/db";
import axios from "axios";
import { SellPaymentFailurePublisher } from "../publishers/sellPaymentFailurePublisher";
import { natsWrapper } from "../../natswrapper";
import { OrderStatus } from "../../generated/prisma/enums";

const EXPRIATION_WINDOW_SECOND = 10;

export class SellPaymentFailureExpirationcompleteListener extends Listener<SellPaymentFailureExpirationEventcomplete> {
  subject: Subjects.SellPaymentFailureComplete =
    Subjects.SellPaymentFailureComplete;

  queueGroupName: string = queueGroupName;

  async onMessage(
    data: SellPaymentFailureExpirationEventcomplete["data"],
    msg: Message,
  ) {
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
    });

    if (!order) {
      console.log(
        "critical error alert order not found of SELL payment failure",
      );
      msg.ack();
      return;
    }

    if (order.status === "EXPIRED" || order.status === "PARTIAL_EXPIRED") {
      msg.ack();
      return;
    }

    if (data.cnt > 3) {
      for (let i = 0; i < 5; i++) {
        console.log("SELL payment retry exhausted");
        console.log(data);
      }
      msg.ack();
      return;
    }

    const { status: creditStatus } = await callService(
      "http://wallet-srv:3000/api/wallet/credit-money",
      "patch",
      {
        amount: data.amount,
        userID: data.userId,
      },
    );

    if (!creditStatus || creditStatus !== 201) {
      const cnt = data.cnt + 1;
      const expiration = new Date();
      expiration.setSeconds(
        expiration.getSeconds() + EXPRIATION_WINDOW_SECOND * cnt,
      );

      const finalstatus =
        data.status === "PARTIAL_FILLED_PAYMENT_FAILURE"
          ? OrderStatus.PARTIAL_FILLED_PAYMENT_FAILURE
          : OrderStatus.PAYMENT_FAILURE;

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

      await new SellPaymentFailurePublisher(natsWrapper.client).publish({
        orderId: order.id,
        expiresAt: expiration.toISOString(),
        amount: data.amount,
        userId: order.userId,
        status: finalstatus,
        cnt: cnt,
      });

      msg.ack();
      return;
    }

    const finalStatus =
      data.status === "PARTIAL_FILLED_PAYMENT_FAILURE"
        ? OrderStatus.PARTIAL_FILLED
        : OrderStatus.SUCCESS;

    const result = await prisma.order.updateMany({
      where: { id: order.id, version: order.version },
      data: {
        status: finalStatus,
        resolved: data.amount,
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
