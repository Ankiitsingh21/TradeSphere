import {
  Listener,
  SellTradeEvent,
  Subjects,
  TradeType,
} from "@showsphere/common";
import { queueGroupName } from "../queue-group-name";
import { Message } from "node-nats-streaming";
import { sell } from "../../services/update";

export class SellTradeListener extends Listener<SellTradeEvent> {
  subject: Subjects.SellTrade = Subjects.SellTrade;
  queueGroupName: string = queueGroupName;
  async onMessage(data: SellTradeEvent["data"], msg: Message) {
    try {
      await sell(data.userId, data.symbol, data.price, data.quantity);

      msg.ack();
    } catch (err) {
      console.error("BuyTradeListener error:", err);
    }
  }
}
