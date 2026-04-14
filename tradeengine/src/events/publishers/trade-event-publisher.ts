import { Publisher, Subjects, TradeExecutedEvent } from "@showsphere/common";

export class TradeExecutedPublisher extends Publisher<TradeExecutedEvent> {
  subject: Subjects.TradeExecuted = Subjects.TradeExecuted;
}
