import { Listener, Subjects, UserCreatedEvent } from "@showsphere/common";
import { queueGroupName } from "./queue-group-name";
import { Message } from "node-nats-streaming";
import { createwallet } from "../../services/createWallet";


export class UserCreatedListener extends Listener<UserCreatedEvent> {
        subject: Subjects.UserCreated=Subjects.UserCreated;
        queueGroupName: string=queueGroupName;
        async onMessage(data: { userID: string; }, msg: Message) {
                try {
                        await createwallet(data.userID);
                        return msg.ack();
                } catch (error) {
                        console.error("UserCreatedListener failed", error)
                        return;
                }
        }
}