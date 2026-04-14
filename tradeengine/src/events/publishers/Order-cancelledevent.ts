import { OrderCancelledEvent, Publisher, Subjects, TradeOrderCancelledEvent } from "@showsphere/common";


export class OrderCancelledPublisher extends Publisher<TradeOrderCancelledEvent>  {
        subject: Subjects.TradeOrderCancelled=Subjects.TradeOrderCancelled;
}