import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";
import axios from "axios";

export const buy = async (userID: string, symbol: string, quantity: number) => {
  // const fetch = #current price fetching but not present for now so mimicking okey
  const fetch = {
    name: "rel",
    price: 95,
  };
  const price = fetch.price;

//   console.log(price);
  if (!fetch || !price) {
        console.log("error");
    throw new BadRequestError("not able to fetch the latest price of stock ");
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

//   console.log(order);
  const lockamount = price * quantity;

let data ,status;
  try {
  const response = await axios({
    method: "patch",
    url: "http://wallet-srv:3000/api/wallet/lock-money",
    data: {
      userID:userID,
      amount: lockamount,
    },
  });

  data=response.data;
  status=response.status
  // console.log("status:", response.status);
  // console.log("data:", response.data);

} catch (error: any) {

  status= error.response?.status
  data=error.response?.data
  // console.log("status:", error.response?.status);
  // console.log("message:", error.response?.data);
}

if(!status){
   await prisma.order.update({
                where:{
                        id:order.id
                },data:{
                        status:"FAILED"
                }
        })
  throw new BadRequestError("wallet is unreachable");
}

if(status!==201){
  await prisma.order.update({
                where:{
                        id:order.id
                },data:{
                        status:"FAILED"
                }
        })
  throw new BadRequestError(data);
}

// console.log(data," ",status);


///now the locking money part is done now move on to the hit the matching engine for now just pass alll the quantity as true okey

const { data:settleData,status:settleStatus } = await callWalletService(
  "http://wallet-srv:3000/api/wallet/settle-money",
  {
    userID,
    settleamount: lockamount,
    releaseamount: 0,
  }
);

// console.log(settleData," ",settleStatus);
if(!settleStatus || settleStatus!==201 ){
   throw new BadRequestError("problem in settling money");
}

const final = await prisma.order.update({
  where:{
    id:order.id
  },data:{
    status:"SUCCESS",
    resolved:lockamount
  }
})

  return final;


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

