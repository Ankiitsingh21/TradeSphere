import { Listener, OrderCancelledEvent, Subjects } from "@showsphere/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";


export class OrderCancelledListener extends Listener<OrderCancelledEvent> {
        subject: Subjects.OrderCancelled=Subjects.OrderCancelled;
        queueGroupName: string=queueGroupName;
        onMessage(data: OrderCancelledEvent['data'] , msg: Message){
                console.log(data);
                msg.ack();
        }
}