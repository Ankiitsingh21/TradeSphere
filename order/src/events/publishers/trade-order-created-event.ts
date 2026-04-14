import {
  Publisher,
  Subjects,
  TradeOrderCreatedEvent,
} from "@showsphere/common";

export class TradeOrderCreated extends Publisher<TradeOrderCreatedEvent> {
  subject: Subjects.TradeOrderCreated = Subjects.TradeOrderCreated;
}
