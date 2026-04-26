import { PaymentInitiatedEvent, Publisher, Subjects } from '@showsphere/common';

export class PaymentInitiatedPublisher extends Publisher<PaymentInitiatedEvent> {
  subject: Subjects.PaymentInitiated = Subjects.PaymentInitiated;
}