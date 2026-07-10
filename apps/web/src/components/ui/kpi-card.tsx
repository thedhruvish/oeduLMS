import * as React from "react";
import { Card, CardContent } from "@oedulms/ui/components/card";
import { cn } from "@oedulms/ui/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  cardClassName?: string;
}

export function KpiCard({ title, value, icon: Icon, iconClassName, cardClassName }: KpiCardProps) {
  return (
    <Card
      className={cn(
        "bg-card border relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md",
        cardClassName
      )}
    >
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <h3 className="text-3xl font-extrabold mt-1 tracking-tight">{value}</h3>
        </div>
        <div className={cn("p-3 rounded-full", iconClassName)}>
          <Icon className="size-6" />
        </div>
      </CardContent>
    </Card>
  );
}
