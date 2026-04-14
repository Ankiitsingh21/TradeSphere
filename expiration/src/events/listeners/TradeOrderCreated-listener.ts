import { Listener, Subjects, TradeOrderCreatedEvent } from "@showsphere/common";
import { queuegroupname } from "./queue-group-name";
import { Message } from "node-nats-streaming";
import { expirationQueue } from "../../queues/expiration-queue";

export class TradeOrderCreatedListener extends Listener<TradeOrderCreatedEvent> {
  subject: Subjects.TradeOrderCreated = Subjects.TradeOrderCreated;
  queueGroupName: string = queuegroupname;
  async onMessage(data: TradeOrderCreatedEvent["data"], msg: Message) {
    const delay = new Date(data.expiresAt).getTime() - new Date().getTime();
    console.log(delay);
    await expirationQueue.add(
      {
        orderId: data.orderId,
      },
      {
        delay,
      },
    );

    msg.ack();
  }
}
