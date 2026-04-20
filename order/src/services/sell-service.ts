import axios from "axios";
import { prisma } from "../config/db";
import { BadRequestError, TradeType } from "@showsphere/common";
import { SellTradePublisher } from "../events/publishers/sell-trade-event";
import { natsWrapper } from "../natswrapper";
import { TradeOrderCreated } from "../events/publishers/trade-order-created-event";
import { SellPaymentFailurePublisher } from "../events/publishers/sellPaymentFailurePublisher";
import { Prisma } from "../generated/prisma/client";

const EXPRIATION_WINDOW_SECOND = 10;

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
      totalQuantity: quantity,
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
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "FAILED" },
    });
    throw new BadRequestError("problem in matching engine");
  }

  if (matchedData.data.status === "QUEUED") {
    const expiration = new Date();
    expiration.setSeconds(expiration.getSeconds() + EXPRIATION_WINDOW_SECOND);

    const update = await prisma.order.update({
      where: { id: order.id },
      data: { status: "PENDING", expiresAt: expiration },
    });

    new TradeOrderCreated(natsWrapper.client).publish({
      orderId: update.id,
      expiresAt: update.expiresAt!.toISOString(),
    });

    return update;
  }

  if (matchedData.data.status === "PARTIAL") {
    const tradePriceD = new Prisma.Decimal(matchedData.data.tradePrice);
    const matchedQtyD = new Prisma.Decimal(matchedData.data.matchedQty);
    const creditAmountD = tradePriceD.mul(matchedQtyD);

    const expiration = new Date();
    expiration.setSeconds(expiration.getSeconds() + EXPRIATION_WINDOW_SECOND);

    new TradeOrderCreated(natsWrapper.client).publish({
      orderId: order.id,
      expiresAt: expiration!.toISOString(),
    });

    const { status: creditStatus } = await callService(
      "http://wallet-srv:3000/api/wallet/credit-money",
      "patch",
      { amount: creditAmountD.toNumber(), userID: order.userId },
    );

    if (!creditStatus || creditStatus !== 201) {
      const expiration = new Date();
      expiration.setSeconds(expiration.getSeconds() + EXPRIATION_WINDOW_SECOND);
      const cnt = 1;

      const update = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "PARTIAL_FILLED_PAYMENT_FAILURE",
          resolved: creditAmountD.toNumber(),
          matchedQuantity: matchedQtyD.toNumber(),
          expiresAt: expiration,
        },
      });

      await new SellPaymentFailurePublisher(natsWrapper.client).publish({
        orderId: order.id,
        expiresAt: expiration!.toISOString(),
        amount: creditAmountD.toNumber(),
        cnt: cnt,
        userId: update.userId,
        status: update.status,
      });

      return update;
    }

    await new SellTradePublisher(natsWrapper.client).publish({
      userId: order.userId,
      symbol: symbol,
      price: tradePriceD,
      type: TradeType.Sell,
      quantity: matchedQtyD,
    });

    const update = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PARTIAL_FILLED",
        resolved: creditAmountD.toNumber(),
        matchedQuantity: matchedQtyD.toNumber(),
        expiresAt: expiration,
      },
    });

    return update;
  }

  const tradePriceD = new Prisma.Decimal(matchedData.data.tradePrice);
  const matchedQtyD = new Prisma.Decimal(matchedData.data.matchedQty);
  const creditAmountD = tradePriceD.mul(matchedQtyD);

  const { status: creditStatus } = await callService(
    "http://wallet-srv:3000/api/wallet/credit-money",
    "patch",
    { userID, amount: creditAmountD.toNumber() },
  );

  if (!creditStatus || creditStatus !== 201) {
    const expiration = new Date();
    expiration.setSeconds(expiration.getSeconds() + EXPRIATION_WINDOW_SECOND);
    const cnt = 1;

    const update = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAYMENT_FAILURE",
        resolved: creditAmountD.toNumber(),
        matchedQuantity: matchedQtyD.toNumber(),
        expiresAt: expiration,
      },
    });

    await new SellPaymentFailurePublisher(natsWrapper.client).publish({
      orderId: order.id,
      expiresAt: expiration!.toISOString(),
      amount: creditAmountD.toNumber(),
      cnt: cnt,
      userId: update.userId,
      status: update.status,
    });

    return update;
  }

  await new SellTradePublisher(natsWrapper.client).publish({
    userId: order.userId,
    symbol: order.symbol,
    price: tradePriceD,
    type: TradeType.Sell,
    quantity: matchedQtyD,
  });

  const final = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "SUCCESS",
      resolved: creditAmountD.toNumber(),
      matchedQuantity: matchedQtyD.toNumber(),
    },
  });

  return final;
};

const callService = async (url: string, method: string, payload: any) => {
  try {
    const response = await axios({ method, url, data: payload, timeout: 5000 });
    return { data: response.data, status: response.status };
  } catch (error: any) {
    return {
      data: error.response?.data,
      status: error.response?.status,
    };
  }
};
