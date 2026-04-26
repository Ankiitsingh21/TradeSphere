import { PaymentCompletedEvent, Publisher, Subjects } from '@showsphere/common';

export class PaymentCompletedPublisher extends Publisher<PaymentCompletedEvent> {
  subject: Subjects.PaymentCompleted = Subjects.PaymentCompleted;
}