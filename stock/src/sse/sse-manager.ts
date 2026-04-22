import type { Response } from "express";

export interface StockPriceStreamData {
  symbol: string;
  price: number;
  previousPrice: number;
  updatedAt: string;
}

const HEARTBEAT_PAYLOAD = ": ping\n\n";

export const sseClients = new Set<Response>();

export function sendSseHeartbeat(client: Response) {
  if (client.destroyed || client.writableEnded) {
    sseClients.delete(client);
    return;
  }

  client.write(HEARTBEAT_PAYLOAD);
}

export function broadcastStockPrice(data: StockPriceStreamData) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;

  for (const client of Array.from(sseClients)) {
    if (client.destroyed || client.writableEnded) {
      sseClients.delete(client);
      continue;
    }

    client.write(payload);
  }
}
