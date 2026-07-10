import * as React from "react";
import { Archive, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@oedulms/ui/components/card";

interface QueryBoundaryProps {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  isEmpty: boolean;
  skeletonCount?: number;
  emptyTitle?: string;
  emptyDesc?: string;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  emptyAction?: React.ReactNode;
  children: React.ReactNode;
}

export function QueryBoundary({
  isLoading,
  isError,
  error,
  isEmpty,
  skeletonCount = 5,
  emptyTitle = "No records found",
  emptyDesc = "There is no data to display at the moment.",
  emptyIcon: EmptyIcon = Archive,
  emptyAction,
  children,
}: QueryBoundaryProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 w-full p-1 animate-pulse">
        <div className="flex flex-col gap-3">
          {Array.from({ length: skeletonCount }).map((_, idx) => (
            <div key={idx} className="h-16 w-full rounded-lg bg-muted/30 border border-muted/20" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 dark:bg-destructive/10 overflow-hidden w-full transition-all duration-300">
        <CardContent className="p-6 flex items-start gap-4">
          <div className="p-3 rounded-full bg-destructive/10 text-destructive shrink-0">
            <ShieldAlert className="size-6 animate-bounce" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <h3 className="font-semibold text-destructive text-base">Error Loading Data</h3>
            <p className="text-sm text-muted-foreground break-words leading-relaxed">
              {error instanceof Error
                ? error.message
                : "Failed to retrieve records from the server."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <div className="p-12 border-2 border-dashed border-muted-foreground/20 rounded-xl text-center flex flex-col items-center justify-center gap-4 bg-muted/5 min-h-[320px] w-full transition-all duration-300">
        <div className="p-4 rounded-full bg-muted/40 text-muted-foreground shrink-0">
          <EmptyIcon className="size-10" />
        </div>
        <div className="flex flex-col gap-1.5 max-w-sm">
          <h3 className="font-bold text-lg text-foreground tracking-tight">{emptyTitle}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{emptyDesc}</p>
        </div>
        {emptyAction && <div className="mt-2">{emptyAction}</div>}
      </div>
    );
  }

  return <>{children}</>;
}
