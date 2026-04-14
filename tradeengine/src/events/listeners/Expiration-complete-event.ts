import { ExpirationCompleteEvent, Listener, Subjects } from "@showsphere/common";
import { queueGroupName } from "../queueGroupname";
import { Message } from "node-nats-streaming";


export class ExpirationCompleteListener extends Listener<ExpirationCompleteEvent>  {
        subject: Subjects.ExpirationComplete=Subjects.ExpirationComplete;
        queueGroupName: string=queueGroupName;
        onMessage(data: ExpirationCompleteEvent['data'],msg:Message ){
                console.log(data);
                msg.ack();
        }
}