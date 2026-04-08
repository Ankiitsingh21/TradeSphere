import { BadRequestError, Subjects, TradeType } from "@showsphere/common";
import { prisma } from "../config/db";
import axios from "axios";
import { error } from "node:console";
import { BuyTradePublisher } from "../events/publishers/buy-trade-event";
import { natsWrapper } from "../natswrapper";

export const buy = async (userID: string, symbol: string, quantity: number) => {
  
  const {data:stockprice,status:stockstatus}= await callWalletService(
    "http://stock-srv:3000/api/stocks/internal-symbol",
    "get",
    {
      symbol:symbol
    }
  )

  // console.log(stockstatus);

    // console.log(stockprice);
  if (!stockprice) {
    console.log("error");
    throw new BadRequestError("not able to fetch the latest price of stock ");
  }

  const price = stockprice.data.price

  //   console.log(order);
  const lockamount = price * quantity;

  let data, status;
  try {
    const response = await axios({
      method: "patch",
      url: "http://wallet-srv:3000/api/wallet/lock-money",
      data: {
        userID: userID,
        amount: lockamount,
      },
    });

    data = response.data;
    status = response.status;
    // console.log("status:", response.status);
    // console.log("data:", response.data);
  } catch (error: any) {
    status = error.response?.status;
    data = error.response?.data;
    console.log("status:", error.response?.status);
    console.log("message:", error.response?.data);
  }

  console.log(data);
  console.log(status);

  if(status===400){
    throw new BadRequestError(data.message)
  }
  if (!status || status !==201) {
    throw new BadRequestError("wallet is unreachable");
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


  // console.log(data," ",status);

  ///now the locking money part is done now move on to the hit the matching engine for now just pass alll the quantity as true okey

  const { data: settleData, status: settleStatus } = await callWalletService(
    "http://wallet-srv:3000/api/wallet/settle-money",
    "patch",
    {
      userID,
      settleamount: lockamount,
      releaseamount: 0,
    },
  );

  console.log(settleData," ",settleStatus);
  if (!settleStatus || settleStatus !== 201) {
    throw new BadRequestError("problem in settling money");
  }

  const final = await prisma.order.update({
    where: {
      id: order.id,
    },
    data: {
      status: "SUCCESS",
      resolved: lockamount,
    },
  });
  
  await new BuyTradePublisher(natsWrapper.client).publish({
    userId:final.userId,
    symbol:final.symbol,
    price:final.price,
    quantity:final.quantity,
    type:TradeType.Buy
  })

  return final;
};

const callWalletService = async (url: string,method:string, payload: any) => {
  try {
    const response = await axios({
      method:method,
      url,
      data: payload,
    });
    // console.log(response.data);

    return {
      data: response.data,
      status: response.status,
    };
  } catch (error: any) {
    return {
      data: error.response?.data,
      status: error.response?.status,
    };
  }
};
