import {
  Publisher,
  StockPriceUpdatedEvent,
  Subjects,
} from "@showsphere/common";

export class StockPriceUpdatedPublisher extends Publisher<StockPriceUpdatedEvent> {
  subject: Subjects.StockPriceUpdated = Subjects.StockPriceUpdated;
}
