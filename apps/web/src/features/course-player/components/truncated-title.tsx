import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@oedulms/ui/components/tooltip";
import { cn } from "@oedulms/ui/lib/utils";

interface TruncatedTitleProps {
  title: string;
  className?: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "h4";
}

/**
 * Single-line truncated title with tooltip showing the full title on hover.
 */
export function TruncatedTitle({ title, className, as: Tag = "span" }: TruncatedTitleProps) {
  return (
    <TooltipProvider delay={300}>
      <Tooltip>
        <TooltipTrigger
          render={<Tag className={cn("block min-w-0 truncate text-left", className)} />}
        >
          {title}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-wrap">
          {title}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
