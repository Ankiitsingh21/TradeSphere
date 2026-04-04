import axios from "axios";
import { prisma } from "../config/db";

export const sell = async (
  userID: string,
  symbol: string,
  quantity: number,
) => {
  //**  1. Fetch current price → Stock Service (sync) → fail = throw error, stop
  //2. Verify holdings → Portfolio Service (sync) → fail = throw error, stop */
  const price = 100;

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
  return order;
};

const callWalletService = async (url: string, payload: any) => {
  try {
    const response = await axios({
      method: "patch",
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
