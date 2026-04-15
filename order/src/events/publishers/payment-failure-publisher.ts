import { PaymentFailureEvent, Publisher, Subjects } from "@showsphere/common";

export class PaymentFailurePublisher extends Publisher<PaymentFailureEvent> {
  subject: Subjects.PaymentFailure = Subjects.PaymentFailure;
}
