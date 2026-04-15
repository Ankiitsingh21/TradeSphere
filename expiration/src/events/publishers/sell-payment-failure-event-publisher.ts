import {
  Publisher,
  SellPaymentFailureExpirationEventcomplete,
  Subjects,
} from "@showsphere/common";

export class SellPaymentFailureCompletePublisher extends Publisher<SellPaymentFailureExpirationEventcomplete> {
  subject: Subjects.SellPaymentFailureComplete =
    Subjects.SellPaymentFailureComplete;
}
