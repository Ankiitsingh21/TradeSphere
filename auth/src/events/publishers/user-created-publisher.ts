import { Publisher, Subjects, UserCreatedEvent } from "@showsphere/common";


export class UserCreatedPublisher extends Publisher<UserCreatedEvent> {
        subject: Subjects.UserCreated=Subjects.UserCreated;
}