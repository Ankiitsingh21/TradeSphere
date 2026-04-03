import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";
import axios from "axios";

export const buy = async (userID: string, symbol: string, quantity: number) => {
  // const fetch = #current price fetching but not present for now so mimicking okey
  const fetch = {
    name: "rel",
    price: 95,
  };
  const price = fetch.price;

//   console.log(price);
  if (!fetch || !price) {
        console.log("error");
    throw new BadRequestError("not able to fetch the latest price of stock ");
  }

  const order = await prisma.order.create({
    data: {
      userId: userID,
      symbol: symbol,
      quantity: quantity,
      status: "CREATED",
      type: "BUY",
      price: price,
    },
  });

//   console.log(order);
  const lockamount = price * quantity;

  const req = await axios({
    method: "post",
    url: "http://sphere.dev/api/wallet/lock-money",
    data: {
      amount: lockamount,
    },
  });

  console.log(req);

  return "route is correct";
};

// model order {
//   id         String      @id @default(uuid())
//   userId     String
//   symbol     String
//   type       OrderType
//   status     OrderStatus
//   quantity   Decimal
//   resolved   Decimal
//   price      Decimal
//   createdAt  DateTime    @default(now())
//   updatedAt  DateTime    @updatedAt
// }
