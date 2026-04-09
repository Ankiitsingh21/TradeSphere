import axios from "axios";
import { prisma } from "../config/db";
import { BadRequestError, TradeType } from "@showsphere/common";
import { SellTradePublisher } from "../events/publishers/sell-trade-event";
import { natsWrapper } from "../natswrapper";

export const sell = async (
  userID: string,
  symbol: string,
  quantity: number,
) => {
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
  //2. Verify holdings → Portfolio Service (sync) → fail = throw error, stop */
  // const price = 100;
  // console.log(userID);
  const {data:holdings,status:holdingsStatus} = await callWalletService(
    "http://portfolio-srv:3000/api/portfolio/verify",
    "get",
    {
      userId:userID,
      symbol:symbol
    }
  )


  // console.log(holdings);
  if(holdingsStatus===400){
    throw new BadRequestError(holdings.message)
  }
  if (!holdingsStatus || holdingsStatus !==201) {
    throw new BadRequestError("not able to verify stocks");
  }
  // console.log(quantity+ holdings.data.quantity)
  if(quantity>holdings.data.quantity){
    throw new BadRequestError("you did not own that much quantity");
  }


  //for now i am just thinking that the stocks are mine so i am not taking care of what to do  okey

  let order = await prisma.order.create({
    data: {
      userId: userID,
      symbol: symbol,
      type: "SELL",
      status: "CREATED",
      quantity: quantity,
      // resolved:
      price: price,
    },
  });

  const amount = price * quantity;

  //hit the matching engine now but mimick this also

  const { data, status } = await callWalletService(
    "http://wallet-srv:3000/api/wallet/credit-money",
       "patch",
    {
      userID,
      amount,
    },
  );

  order = await prisma.order.update({
    where: {
      id: order.id,
    },
    data: {
      resolved: price * quantity,
      status: "SUCCESS",
    },
  });

  await new SellTradePublisher(natsWrapper.client).publish({
    userId:order.userId,
    symbol:order.symbol,
    price:order.price,
    type:TradeType.Sell,
    quantity:order.quantity
  })
  return order;
};

const callWalletService = async (url: string, method:string,payload: any) => {
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
    return {
      data: error.response?.data,
      status: error.response?.status,
    };
  }
};
