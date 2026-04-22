import { Badge } from "@/components/ui/badge";
import { getOrderStatusStyle } from "@/lib/order-status";
import type { OrderStatus } from "@/lib/types";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge
      variant={getOrderStatusStyle(status)}
      className="font-mono text-[11px] tracking-wide"
    >
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
