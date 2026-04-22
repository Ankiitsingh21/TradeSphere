import { http } from "@/lib/api/http";
import { mapStock } from "@/lib/api/mappers";
import type { Stock } from "@/lib/types";
import { isRecord } from "@/lib/utils";

export async function fetchStocks(): Promise<Stock[]> {
  const response = await http.get("/api/stocks/all");
  const payload = response.data;

  if (!isRecord(payload)) {
    return [];
  }

  const rawData = Array.isArray(payload.data) ? payload.data : [];

  return rawData.map(mapStock).filter((stock) => stock.symbol.length > 0);
}
