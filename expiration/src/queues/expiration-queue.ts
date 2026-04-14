import Queue from "bull";
import { natsWrapper } from "../natswrapper";

interface Payload {
  orderId: string;
}

const expirationQueue = new Queue<Payload>("order:expiration", {
  redis: {
    host: process.env.REDIS_HOST,
  },
});

expirationQueue.process(async (job) => {
   new (natsWrapper.client).publish({
    
  });
});

export { expirationQueue };
