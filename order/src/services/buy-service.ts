import { BadRequestError, TradeType } from "@showsphere/common";
import { prisma } from "../config/db";
import axios from "axios";
import { BuyTradePublisher } from "../events/publishers/buy-trade-event";
import { natsWrapper } from "../natswrapper";
import { TradeOrderCreated } from "../events/publishers/trade-order-created-event";
import { PaymentFailurePublisher } from "../events/publishers/payment-failure-publisher";

const EXPRIATION_WINDOW_SECOND = 10;

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
      totalQuantity: quantity,
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
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "FAILED" },
    });
    await callService(
      "http://wallet-srv:3000/api/wallet/settle-money",
      "patch",
      {
        settleamount: 0,
        releaseamount: lockamount,
        userID,
      },
    );
    throw new BadRequestError("problem in matching engine");
  }

  const expiration = new Date();
  expiration.setSeconds(expiration.getSeconds() + EXPRIATION_WINDOW_SECOND);

  if (matchedData.data.status === "QUEUED") {
    const update = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PENDING",
        resolved: 0,
        matchedQuantity: 0,
        expiresAt: expiration,
      },
    });

    await new TradeOrderCreated(natsWrapper.client).publish({
      orderId: update.id,
      expiresAt: update.expiresAt!.toISOString(),
    });

    return update;
  }

  if (matchedData.data.status === "PARTIAL") {
    const priceDiffSavings = matchedData.data.releaseAmount
      ? Number(matchedData.data.releaseAmount)
      : 0;
    const settleAmount =
      Number(matchedData.data.tradePrice) * Number(matchedData.data.matchedQty);

    const expiration = new Date();
    expiration.setSeconds(expiration.getSeconds() + EXPRIATION_WINDOW_SECOND);

    await new TradeOrderCreated(natsWrapper.client).publish({
      orderId:  order.id,
      expiresAt: expiration!.toISOString(),
    });

    new BuyTradePublisher(natsWrapper.client).publish({
      userId: matchedData.data.userId,
      symbol: matchedData.data.symbol,
      price: matchedData.data.tradePrice,
      quantity: matchedData.data.matchedQty,
      type: TradeType.Buy,
    });



     const { data: settleData, status: settleStatus } = await callService(
      "http://wallet-srv:3000/api/wallet/settle-money",
      "patch",
      {
        settleamount: settleAmount,
        releaseamount: priceDiffSavings,
        userID,
      },
    );

    if (!settleStatus || settleStatus !== 201) {
      const expiration = new Date();
      expiration.setSeconds(expiration.getSeconds()+EXPRIATION_WINDOW_SECOND);
      const cnt=1;

      const update = await prisma.order.update({
        where:{
          id:order.id
        },data:{
          resolved: settleAmount,
        matchedQuantity: matchedData.data.matchedQty,
        expiresAt: expiration,
        status:"PARTIAL_FILLED_PAYMENT_FAILURE"
        }
      });
      await new PaymentFailurePublisher(natsWrapper.client).publish({
        orderId:order.id,
        expiresAt:expiration!.toISOString(),
        matchedQuantity:matchedData.data.matchedQty,
        resolved:settleAmount,
        settleamount:settleAmount,
        releaseamount:priceDiffSavings,
        status:"PARTIAL_FILLED_PAYMENT_FAILURE",
        userId:order.userId,
        cnt:cnt
      });
      
      return update;
    }

    const update = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PARTIAL_FILLED",
        resolved: settleAmount,
        matchedQuantity: matchedData.data.matchedQty,
        expiresAt: expiration,
      },
    });

    return update;
  }

  // MATCHED
  const releaseAmount = matchedData.data.releaseAmount
    ? Number(matchedData.data.releaseAmount)
    : 0;
  const settleAmount = lockamount - releaseAmount;


  await new BuyTradePublisher(natsWrapper.client).publish({
    userId: matchedData.data.userId,
    symbol: symbol,
    price: matchedData.data.tradePrice,
    quantity: matchedData.data.matchedQuantity,
    type: TradeType.Buy,
  });

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

    const expiration = new Date();
      expiration.setSeconds(expiration.getSeconds()+EXPRIATION_WINDOW_SECOND);
      const cnt=1;

    const fail= await prisma.order.update({
      where:{
        id:order.id
      },data:{
        status:"PAYMENT_FAILURE",
        resolved: settleAmount,
      matchedQuantity: matchedData.data.matchedQty,
      expiresAt:expiration
      }
    });

    await new PaymentFailurePublisher(natsWrapper.client).publish({
        orderId:order.id,
        expiresAt:expiration!.toISOString(),
        matchedQuantity:matchedData.data.matchedQty,
        resolved:settleAmount,
        settleamount:settleAmount,
        releaseamount:releaseAmount,
        status:"PAYMENT_FAILURE",
        userId:order.userId,
        cnt:cnt
      });


    return fail;
  }

  const final = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "SUCCESS",
      resolved: settleAmount,
      matchedQuantity: matchedData.data.matchedQty,
    },
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
