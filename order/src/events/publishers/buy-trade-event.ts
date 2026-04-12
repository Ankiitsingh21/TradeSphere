import { BuyTradeEvent, Publisher, Subjects } from "@showsphere/common";

export class BuyTradePublisher extends Publisher<BuyTradeEvent> {
  subject: Subjects.BuyTrade = Subjects.BuyTrade;
}
