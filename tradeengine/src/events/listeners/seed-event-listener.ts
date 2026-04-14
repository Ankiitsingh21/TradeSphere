import { Listener, SeedEvent, Subjects } from "@showsphere/common";
import { queueGroupName } from "../queueGroupname";
import { Message } from "node-nats-streaming";
import { seed } from "../../orderBook/seedOrderBook";

export class SeedEventListener extends Listener<SeedEvent> {
  subject: Subjects.Seed = Subjects.Seed;
  queueGroupName: string = queueGroupName;
  async onMessage(data: SeedEvent["data"], msg: Message) {
    const db = await seed(data.stocks);
    if (db) {
      return msg.ack();
    }
  }
}
