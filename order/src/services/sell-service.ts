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
    const { data: stockprice, status: stockstatus } = await callWalletService(
      "http://stock-srv:3000/api/stocks/internal-symbol",
      "get",
      {
        symbol: symbol,
      },
    );
    price = stockprice.data.price;
  }
  //  const {data:stockprice,status:stockstatus}= await callWalletService(
  //     "http://stock-srv:3000/api/stocks/internal-symbol",
  //     "get",
  //     {
  //       symbol:symbol
  //     }
  //   )

  //   // console.log(stockstatus);

  //     // console.log(stockprice);
  //   if (!stockprice) {
  //     console.log("error");
  //     throw new BadRequestError("not able to fetch the latest price of stock ");
  //   }

  // const price = stockprice.data.price
  //2. Verify holdings → Portfolio Service (sync) → fail = throw error, stop */
  // const price = 100;
  // console.log(userID);
  const { data: holdings, status: holdingsStatus } = await callWalletService(
    "http://portfolio-srv:3000/api/portfolio/verify",
    "get",
    {
      userId: userID,
      symbol: symbol,
    },
  );

  // console.log(holdings);
  if (holdingsStatus === 400) {
    throw new BadRequestError(holdings.message);
  }
  if (!holdingsStatus || holdingsStatus !== 201) {
    throw new BadRequestError("not able to verify stocks");
  }
  // console.log(quantity+ holdings.data.quantity)
  if (quantity > holdings.data.quantity) {
    throw new BadRequestError("you did not own that much quantity");
  }

  //for now i am just thinking that the stocks are mine so i am not taking care of what to do  okey

  const order = await prisma.order.create({
    data: {
      userId: userID,
      symbol: symbol,
      type: "SELL",
      status: "CREATED",
      quantity: quantity,
      // resolved:
      price: price!,
    },
  });

  const amount = price! * quantity;

  //hit the matching engine now but mimick this also

  const { data: matchedData, status: matchedStatus } = await callWalletService(
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
    throw new BadRequestError("problem in matching money");
  }

  // console.log(matchedData,matchedStatus);

  // return matchedData;

  if (matchedData.data.status === "QUEUED") {
    const update = await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: "PENDING",
        resolved: 0,
      },
    });

    return update;
  }

  if (matchedData.data.status === "PARTIAL") {
    const creditAmount =
      Number(matchedData.tradePrice) * Number(matchedData.matchedQty);

    const { status: creditStatus } = await callWalletService(
      "http://wallet-srv:3000/api/wallet/credit-money",
      "patch",
      {  amount: creditAmount ,userId:order.userId},
    );
    if (!creditStatus || creditStatus !== 201)
      throw new BadRequestError("problem in crediting money");

    const update = await prisma.order.update({
      where: { id: order.id },
      data: { status: "PENDING", resolved: creditAmount },
    });

    await new SellTradePublisher(natsWrapper.client).publish({
      userId: update.userId,
      symbol: update.symbol,
      price: update.price,
      type: TradeType.Sell,
      quantity: update.quantity,
    });
    return update;
  }
  // console.log("hi")
  const creditAmount =
    Number(matchedData.data.tradePrice) * Number(matchedData.data.matchedQty);
    // console.log(creditAmount);
  const { status: creditStatus } = await callWalletService(
    "http://wallet-srv:3000/api/wallet/credit-money",
    "patch",
    { userID, amount: creditAmount },
  );

  // console.log(creditStatus,creditAmount)
  if (!creditStatus || creditStatus !== 201)
    throw new BadRequestError("problem in crediting money");

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

const callWalletService = async (url: string, method: string, payload: any) => {
  try {
    const response = await axios({
      // method: "patch",
      method,
      url,
      data: payload,
    });

    return {
      data: response.data,
      status: response.status,
    };
  } catch (error: any) {
    console.log(error.response?.data);
    return {
      data: error.response?.data,
      status: error.response?.status,
    };
  }
};
