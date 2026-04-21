import { BadRequestError, TradeType } from "@showsphere/common";
import { prisma } from "../config/db";
import axios from "axios";
import { BuyTradePublisher } from "../events/publishers/buy-trade-event";
import { natsWrapper } from "../natswrapper";
import { TradeOrderCreated } from "../events/publishers/trade-order-created-event";
import { PaymentFailurePublisher } from "../events/publishers/payment-failure-publisher";
import { Prisma } from "../generated/prisma/client";

const EXPRIATION_WINDOW_SECOND = 10;

export const buy = async (
  userID: string,
  symbol: string,
  quantity: number,
  price?: number,
) => {
  // console.log(price);
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

  const priceD = new Prisma.Decimal(price!);
  const quantityD = new Prisma.Decimal(quantity);
  const lockamountD = priceD.mul(quantityD);

  let data, status;
  try {
    const response = await axios({
      method: "patch",
      url: "http://wallet-srv:3000/api/wallet/lock-money",
      data: { userID: userID, amount: lockamountD.toNumber() },
      timeout: 5000,
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
      { settleamount: 0, releaseamount: lockamountD.toNumber(), userID },
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
    const tradePriceD = new Prisma.Decimal(matchedData.data.tradePrice);
    const matchedQtyD = new Prisma.Decimal(matchedData.data.matchedQty);
    const priceDiffSavingsD = matchedData.data.releaseAmount
      ? new Prisma.Decimal(matchedData.data.releaseAmount)
      : new Prisma.Decimal(0);
    const settleAmountD = tradePriceD.mul(matchedQtyD);

    const expiration = new Date();
    expiration.setSeconds(expiration.getSeconds() + EXPRIATION_WINDOW_SECOND);

    await new TradeOrderCreated(natsWrapper.client).publish({
      orderId: order.id,
      expiresAt: expiration!.toISOString(),
    });

    const { data: settleData, status: settleStatus } = await callService(
      "http://wallet-srv:3000/api/wallet/settle-money",
      "patch",
      {
        settleamount: settleAmountD.toNumber(),
        releaseamount: priceDiffSavingsD.toNumber(),
        userID,
      },
    );

    if (!settleStatus || settleStatus !== 201) {
      const expiration = new Date();
      expiration.setSeconds(expiration.getSeconds() + EXPRIATION_WINDOW_SECOND);
      const cnt = 1;

      const update = await prisma.order.update({
        where: { id: order.id },
        data: {
          resolved: settleAmountD.toNumber(),
          matchedQuantity: matchedQtyD.toNumber(),
          expiresAt: expiration,
          status: "PARTIAL_FILLED_PAYMENT_FAILURE",
        },
      });
      await new PaymentFailurePublisher(natsWrapper.client).publish({
        orderId: order.id,
        expiresAt: expiration!.toISOString(),
        matchedQuantity: matchedQtyD.toNumber(),
        resolved: settleAmountD.toNumber(),
        settleamount: settleAmountD.toNumber(),
        releaseamount: priceDiffSavingsD.toNumber(),
        status: "PARTIAL_FILLED_PAYMENT_FAILURE",
        userId: order.userId,
        cnt: cnt,
      });

      return update;
    }

    new BuyTradePublisher(natsWrapper.client).publish({
      userId: order.userId,
      symbol: symbol,
      price: tradePriceD,
      quantity: matchedQtyD,
      type: TradeType.Buy,
    });

    const update = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PARTIAL_FILLED",
        resolved: settleAmountD.toNumber(),
        matchedQuantity: matchedQtyD.toNumber(),
        expiresAt: expiration,
      },
    });

    return update;
  }

  const tradePriceD = new Prisma.Decimal(matchedData.data.tradePrice);
  const matchedQtyD = new Prisma.Decimal(matchedData.data.matchedQty);
  const releaseAmountD = matchedData.data.releaseAmount
    ? new Prisma.Decimal(matchedData.data.releaseAmount)
    : new Prisma.Decimal(0);
  const settleAmountD = lockamountD.minus(releaseAmountD);

  const { data: settleData, status: settleStatus } = await callService(
    "http://wallet-srv:3000/api/wallet/settle-money",
    "patch",
    {
      settleamount: settleAmountD.toNumber(),
      releaseamount: releaseAmountD.toNumber(),
      userID,
    },
  );

  if (!settleStatus || settleStatus !== 201) {
    const expiration = new Date();
    expiration.setSeconds(expiration.getSeconds() + EXPRIATION_WINDOW_SECOND);
    const cnt = 1;

    const fail = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAYMENT_FAILURE",
        resolved: settleAmountD.toNumber(),
        matchedQuantity: matchedQtyD.toNumber(),
        expiresAt: expiration,
      },
    });

    await new PaymentFailurePublisher(natsWrapper.client).publish({
      orderId: order.id,
      expiresAt: expiration!.toISOString(),
      matchedQuantity: matchedQtyD.toNumber(),
      resolved: settleAmountD.toNumber(),
      settleamount: settleAmountD.toNumber(),
      releaseamount: releaseAmountD.toNumber(),
      status: "PAYMENT_FAILURE",
      userId: order.userId,
      cnt: cnt,
    });

    return fail;
  }

  new BuyTradePublisher(natsWrapper.client).publish({
    userId: order.userId,
    symbol: symbol,
    price: tradePriceD,
    quantity: matchedQtyD,
    type: TradeType.Buy,
  });

  const final = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "SUCCESS",
      resolved: settleAmountD.toNumber(),
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
