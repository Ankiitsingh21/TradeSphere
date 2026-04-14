import {
  ExpirationCompleteEvent,
  Publisher,
  Subjects,
} from "@showsphere/common";

export class ExpirationCompletePublisher extends Publisher<ExpirationCompleteEvent> {
  subject: Subjects.ExpirationComplete = Subjects.ExpirationComplete;
}
