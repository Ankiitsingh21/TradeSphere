import {
  Publisher,
  SellPaymentFailureEvnet,
  Subjects,
} from "@showsphere/common";

export class SellPaymentFailurePublisher extends Publisher<SellPaymentFailureEvnet> {
  subject: Subjects.SellPaymentFailure = Subjects.SellPaymentFailure;
}
