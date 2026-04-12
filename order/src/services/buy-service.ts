import { BadRequestError, Subjects, TradeType } from "@showsphere/common";
import { prisma } from "../config/db";
import axios from "axios";
import { error } from "node:console";
import { BuyTradePublisher } from "../events/publishers/buy-trade-event";
import { natsWrapper } from "../natswrapper";
import { Prisma } from "../generated/prisma/client";

export const buy = async (
  userID: string,
  symbol: string,
  quantity: number,
  price?: number,
) => {
  if (!price) {
    const { data: stockprice, status: stockstatus } = await callWalletService(
      "http://stock-srv:3000/api/stocks/internal-symbol",
      "get",
      {
        symbol: symbol,
      },
    );

    // console.log(stockstatus);

    // console.log(stockprice);
    // if (!price) {
    //   console.log("error");
    //   throw new BadRequestError("not able to fetch the latest price of stock ");
    // }

    price = stockprice.data.price;
  }

  // const {data:stockprice,status:stockstatus}= await callWalletService(
  //   "http://stock-srv:3000/api/stocks/internal-symbol",
  //   "get",
  //   {
  //     symbol:symbol
  //   }
  // )

  // console.log(stockstatus);

  //   console.log(stockprice);
  // if (!price) {
  //   console.log("error");
  //   throw new BadRequestError("not able to fetch the latest price of stock ");
  // }

  // const price = stockprice.data.price

  //   console.log(order);
  const lockamount = price! * quantity;
  // console.log(lockamount);

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

  // console.log(data);
  // console.log(status);

  if (status === 400) {
    throw new BadRequestError(data.message);
  }
  if (!status || status !== 201) {
    throw new BadRequestError("wallet is unreachable");
  }

  const order = await prisma.order.create({
    data: {
      userId: userID,
      symbol: symbol,
      quantity: quantity,
      status: "CREATED",
      type: "BUY",
      price: price!,
    },
  });

  // console.log(data," ",status);

  ///now the locking money part is done now move on to the hit the matching engine for now just pass alll the quantity as true okey

  const { data: matchedData, status: matchedStatus } = await callWalletService(
    "http://tradeengine-srv:3000/api/tradeengine/buy",
    "post",
    {
      orderId: order.id,
      userId: order.userId,
      price: price,
      quantity: quantity,
      symbol: symbol,
    },
  );

  if (!matchedStatus || matchedStatus !== 201) {
    throw new BadRequestError("problem in matching money");
  }

  if (matchedData.data.status === "QUEUED") {
    const update = await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        quantity: matchedData.data.quantity,
        status: "PENDING",
        resolved: 0,
      },
    });
    return update;
  }
  // console.log(matchedData.data, matchedStatus);

  if (matchedData.data.status === "PARTIAL") {
    const priceDiffSavings = matchedData.data.totalReleaseAmount;
    const settleAmount = lockamount - priceDiffSavings;
    const { data: settleData, status: settleStatus } = await callWalletService(
      "http://wallet-srv:3000/api/wallet/settle-money",
      "patch",
      {
        settleamount: settleAmount,
        releaseamount: priceDiffSavings,
        userID,
      },
    );
    console.log("partial filled")
    console.log(settleData," ",settleStatus);
    if (!settleStatus || settleStatus !== 201) {
      throw new BadRequestError("problem in settling money");
    }

    const update = await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: "PENDING",
        resolved: settleAmount,
      },
    });

    await new BuyTradePublisher(natsWrapper.client).publish({
      userId: update.userId,
      symbol: update.symbol,
      price: update.price,
      quantity: update.quantity,
      type: TradeType.Buy,
    });
    return update;
  }

  const releaseAmount = matchedData.data.releaseAmount
    ? matchedData.data.releaseAmount
    : 0;

  const settleAmount = lockamount - releaseAmount;

  // console.log(settleAmount," ",releaseAmount);
  const { data: settleData, status: settleStatus } = await callWalletService(
    "http://wallet-srv:3000/api/wallet/settle-money",
    "patch",
    {
      settleamount: settleAmount,
      releaseamount: releaseAmount,
      userID,
    },
  );

  // console.log("fully filld")
  // console.log(settleData," ",settleStatus);
  if (!settleStatus || settleStatus !== 201) {
    throw new BadRequestError("problem in settling money");
  }

  const final = await prisma.order.update({
    where: {
      id: order.id,
    },
    data: {
      status: "SUCCESS",
      resolved: settleAmount,
    },
  });

  await new BuyTradePublisher(natsWrapper.client).publish({
    userId: final.userId,
    symbol: final.symbol,
    price: final.price,
    quantity: final.quantity,
    type: TradeType.Buy,
  });

  return final;
};

const callWalletService = async (url: string, method: string, payload: any) => {
  try {
    const response = await axios({
      method: method,

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
