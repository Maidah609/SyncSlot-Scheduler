import type { ReactNode } from "react";
import { DashboardMobileNav } from "@/components/dashboard/DashboardSidebar";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export function DashboardTopbar({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="flex items-start justify-between gap-4 px-4 py-5 sm:px-8 sm:py-6">
        <div className="flex min-w-0 items-start gap-2">
          <DashboardMobileNav />
          <div className="min-w-0">
            <h1 className="font-display text-2xl leading-tight sm:text-3xl">{title}</h1>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
