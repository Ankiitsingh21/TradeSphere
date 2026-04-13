import axios from "axios";
import { prisma } from "../config/db";
import { BadRequestError, TradeType } from "@showsphere/common";
import { SellTradePublisher } from "../events/publishers/sell-trade-event";
import { natsWrapper } from "../natswrapper";

export const sell = async (
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

  const { data: holdings, status: holdingsStatus } = await callService(
    `http://portfolio-srv:3000/api/portfolio/verify?userId=${encodeURIComponent(userID)}&symbol=${encodeURIComponent(symbol)}`,
    "get",
    {},
  );
  // console.log(holdings);
  if (holdingsStatus === 400) {
    throw new BadRequestError(holdings.message);
  }
  if (!holdingsStatus || holdingsStatus !== 201) {
    throw new BadRequestError("not able to verify stocks");
  }
  if (quantity > Number(holdings.data.quantity)) {
  throw new BadRequestError("you do not own that much quantity");
}

  const order = await prisma.order.create({
    data: {
      userId: userID,
      symbol: symbol,
      type: "SELL",
      status: "CREATED",
      quantity: quantity,
      price: price!,
    },
  });

  const { data: matchedData, status: matchedStatus } = await callService(
    "http://tradeengine-srv:3000/api/tradeengine/sell",
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
    const update = await prisma.order.update({
      where:{
        id:order.id
      },data:{
        status:"FAILED"
      }
    })
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
    const creditAmount =
      Number(matchedData.data.tradePrice) * Number(matchedData.data.matchedQty);

    const { status: creditStatus } = await callService(
      "http://wallet-srv:3000/api/wallet/credit-money",
      "patch",
      { amount: creditAmount, userID: order.userId }, // userID not userId
    );

    if (!creditStatus || creditStatus !== 201) {
      throw new BadRequestError("problem in crediting money");
    }

    const update = await prisma.order.update({
      where: { id: order.id },
      data: { status: "PENDING", resolved: creditAmount },
    });

    await new SellTradePublisher(natsWrapper.client).publish({
      userId: update.userId,
      symbol: update.symbol,
      price: update.price,
      type: TradeType.Sell,
      quantity: matchedData.data.matchedQty, 
    });

    return update;
  }

  // MATCHED
  const creditAmount =
    Number(matchedData.data.tradePrice) * Number(matchedData.data.matchedQty);

  const { status: creditStatus } = await callService(
    "http://wallet-srv:3000/api/wallet/credit-money",
    "patch",
    { userID, amount: creditAmount },
  );

  if (!creditStatus || creditStatus !== 201) {
    throw new BadRequestError("problem in crediting money");
  }

  const final = await prisma.order.update({
    where: { id: order.id },
    data: { status: "SUCCESS", resolved: creditAmount },
  });

  await new SellTradePublisher(natsWrapper.client).publish({
    userId: final.userId,
    symbol: final.symbol,
    price: final.price,
    type: TradeType.Sell,
    quantity: final.quantity,
  });

  return final;
};

const callService = async (url: string, method: string, payload: any) => {
  try {
    const response = await axios({ method, url, data: payload });
    return { data: response.data, status: response.status };
  } catch (error: any) {
    console.log(url);
    console.log(error.response?.data);
    return {
      data: error.response?.data,
      status: error.response?.status,
    };
  }
};