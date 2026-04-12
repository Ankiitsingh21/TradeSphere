import { BadRequestError, Subjects, TradeType } from "@showsphere/common";
import { prisma } from "../config/db";
import axios from "axios";
import { BuyTradePublisher } from "../events/publishers/buy-trade-event";
import { natsWrapper } from "../natswrapper";

export const buy = async (
  userID: string,
  symbol: string,
  quantity: number,
  price?: number,
) => {
  if (!price) {
    const { data: stockprice, status: stockstatus } = await callService(
      `http://stock-srv:3000/api/stocks/internal-symbol?symbol=${encodeURIComponent(symbol)}`,
      "get",
      {},
    );

    if (!stockstatus || stockstatus !== 201) {
      throw new BadRequestError("not able to fetch the latest price of stock");
    }

    price = Number(stockprice.data.price);
  }

  const lockamount = price! * quantity;

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
  } catch (error: any) {
    status = error.response?.status;
    data = error.response?.data;
    console.log("lock-money status:", error.response?.status);
    console.log("lock-money message:", error.response?.data);
  }

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

  const { data: matchedData, status: matchedStatus } = await callService(
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
    throw new BadRequestError("problem in matching engine");
  }

  // matchedData = { success: true, data: { status, ... }, message }
  if (matchedData.data.status === "QUEUED") {
    const update = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PENDING",
        resolved: 0,
      },
    });
    return update;
  }

  if (matchedData.data.status === "PARTIAL") {
    const priceDiffSavings = matchedData.data.releaseAmount
      ? Number(matchedData.data.releaseAmount)
      : 0;
    const settleAmount = lockamount - priceDiffSavings;

    const { data: settleData, status: settleStatus } = await callService(
      "http://wallet-srv:3000/api/wallet/settle-money",
      "patch",
      {
        settleamount: settleAmount,
        releaseamount: priceDiffSavings,
        userID,
      },
    );
    // console.log("partial buy filled", settleData, settleStatus);

    if (!settleStatus || settleStatus !== 201) {
      throw new BadRequestError("problem in settling money");
    }

    const update = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PENDING",
        resolved: settleAmount,
      },
    });

    await new BuyTradePublisher(natsWrapper.client).publish({
      userId: update.userId,
      symbol: update.symbol,
      price: update.price,
      quantity: matchedData.data.matchedQty, // only matched portion
      type: TradeType.Buy,
    });

    return update;
  }

  const releaseAmount = matchedData.data.releaseAmount
    ? Number(matchedData.data.releaseAmount)
    : 0;
  const settleAmount = lockamount - releaseAmount;

  const { data: settleData, status: settleStatus } = await callService(
    "http://wallet-srv:3000/api/wallet/settle-money",
    "patch",
    {
      settleamount: settleAmount,
      releaseamount: releaseAmount,
      userID,
    },
  );

  if (!settleStatus || settleStatus !== 201) {
    throw new BadRequestError("problem in settling money");
  }

  const final = await prisma.order.update({
    where: { id: order.id },
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

const callService = async (url: string, method: string, payload: any) => {
  try {
    const response = await axios({ method, url, data: payload });
    return { data: response.data, status: response.status };
  } catch (error: any) {
    return {
      data: error.response?.data,
      status: error.response?.status,
    };
  }
};