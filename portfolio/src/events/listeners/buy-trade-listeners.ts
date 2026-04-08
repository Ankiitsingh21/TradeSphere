import { BadRequestError, BuyTrade, Listener, Subjects, TradeType } from "@showsphere/common";
import { queueGroupName } from "../queue-group-name";
import { Message } from "node-nats-streaming";
import { buy } from "../../services/create";

export class BuyTradeListener extends Listener<BuyTrade> {
  subject: Subjects.BuyTrade = Subjects.BuyTrade;
  queueGroupName: string = queueGroupName;
  async onMessage(data: BuyTrade["data"], msg: Message) {
    try {
    await buy(
      data.userId,
      data.symbol,
      data.price,
      data.quantity
    );

    msg.ack(); 
  } catch (err) {
    console.error("BuyTradeListener error:", err);
  }
  }
}
