import {
  Listener,
  SellPaymentFailureEvnet,
  Subjects,
} from "@showsphere/common";
import { queuegroupname } from "./queue-group-name";
import { Message } from "node-nats-streaming";
import { expirationQueueee } from "../../queues/expiration-queue";

export class SellPaymentFailureListener extends Listener<SellPaymentFailureEvnet> {
  subject: Subjects.SellPaymentFailure = Subjects.SellPaymentFailure;
  queueGroupName: string = queuegroupname;
  async onMessage(data: SellPaymentFailureEvnet["data"], msg: Message) {
    const delay = new Date(data.expiresAt).getTime() - new Date().getTime();
    console.log(delay);

    await expirationQueueee.add(
      {
        orderId: data.orderId,
        expiresAt: data.expiresAt,
        cnt: data.cnt,
        amount: data.amount,
        userId: data.userId,
        status: data.status,
      },
      { delay },
    );

    msg.ack();
  }
}
