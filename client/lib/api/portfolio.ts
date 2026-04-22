import { http } from "@/lib/api/http";
import { mapPortfolioPosition } from "@/lib/api/mappers";
import type { PortfolioPosition } from "@/lib/types";
import { isRecord } from "@/lib/utils";

export async function fetchPortfolio(): Promise<PortfolioPosition[]> {
  const response = await http.get("/api/portfolio/stocks");
  const payload = response.data;

  if (!isRecord(payload)) {
    return [];
  }

  const raw = payload.data;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map(mapPortfolioPosition)
    .filter(
      (position) => position.userId.length > 0 && position.symbol.length > 0,
    );
}
