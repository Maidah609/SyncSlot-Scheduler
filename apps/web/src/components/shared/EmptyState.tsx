import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-md flex-col items-center text-center fade-in",
        compact ? "py-8" : "py-14",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <h3 className="font-display text-xl leading-tight sm:text-2xl">{title}</h3>
      {description ? (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
