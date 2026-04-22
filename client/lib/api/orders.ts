import { http } from "@/lib/api/http";
import { mapOrder } from "@/lib/api/mappers";
import type { Order, PlaceOrderPayload } from "@/lib/types";
import { isRecord } from "@/lib/utils";

export async function placeOrder(payload: PlaceOrderPayload): Promise<Order> {
  const route = payload.side === "BUY" ? "/api/orders/buy" : "/api/orders/sell";

  const response = await http.post(route, {
    symbol: payload.symbol,
    quantity: payload.quantity,
    ...(payload.price ? { price: payload.price } : {}),
  });

  const body = response.data;
  if (isRecord(body)) {
    return mapOrder(body.data);
  }

  return mapOrder({});
}
