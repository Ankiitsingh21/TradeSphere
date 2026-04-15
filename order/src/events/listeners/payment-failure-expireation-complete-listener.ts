import { Listener, PaymentFailureExpirationCompleteEvent, Subjects } from "@showsphere/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";


export class PaymentFailureExpirationCompleteListener extends Listener <PaymentFailureExpirationCompleteEvent> {
        subject: Subjects.PaymentFailureExpirationComplete=Subjects.PaymentFailureExpirationComplete;
        queueGroupName: string=queueGroupName;
        async onMessage(data: PaymentFailureExpirationCompleteEvent['data'] , msg: Message) {
                
        }
}