import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "negative";
}

export function StatCard({
  title,
  value,
  hint,
  tone = "neutral",
}: StatCardProps) {
  const positive = tone === "positive";
  const negative = tone === "negative";

  return (
    <Card className="border-border/60">
      <CardContent className="space-y-2 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </p>
        <p className="font-display text-xl font-semibold text-foreground md:text-2xl">
          {value}
        </p>
        {hint ? (
          <p
            className={cn(
              "inline-flex items-center gap-1 text-xs",
              positive && "text-emerald-300",
              negative && "text-rose-300",
              !positive && !negative && "text-muted-foreground",
            )}
          >
            {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : null}
            {negative ? <ArrowDownRight className="h-3.5 w-3.5" /> : null}
            {hint}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
