import { Listener, PaymentFailureEvent, Subjects } from "@showsphere/common";
import { queuegroupname } from "./queue-group-name";
import { Message } from "node-nats-streaming";
import {expirationQueuee} from "../../queues/expiration-queue";

export class PaymentFailureListener extends Listener<PaymentFailureEvent> {
  subject: Subjects.PaymentFailure = Subjects.PaymentFailure;
  queueGroupName: string = queuegroupname;
  async onMessage(data: PaymentFailureEvent["data"], msg: Message) {
    const delay = new Date(data.expiresAt).getTime() - new Date().getTime();
    console.log(delay);
    await expirationQueuee.add(
      {
        orderId: data.orderId,
        expiresAt: data.expiresAt,
        cnt: data.cnt,
        matchedQuantity: data.matchedQuantity,
        resolved: data.resolved,
        settleamount: data.settleamount,
        releaseamount: data.releaseamount,
        userId: data.userId,
        status: data.status,
      },
      { delay },
    );
    msg.ack();
  }
}
