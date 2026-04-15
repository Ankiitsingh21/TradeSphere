import {
  PaymentFailureEvent,
  PaymentFailureExpirationCompleteEvent,
  Publisher,
  Subjects,
} from "@showsphere/common";

export class PaymentFailureExpirationPublisher extends Publisher<PaymentFailureExpirationCompleteEvent> {
  subject: Subjects.PaymentFailureExpirationComplete =
    Subjects.PaymentFailureExpirationComplete;
}
