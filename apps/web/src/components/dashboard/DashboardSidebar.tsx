"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarRange,
  Clock,
  Calendar,
  Plug,
  Settings,
  ChartBar,
  Menu,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const nav: NavItem[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/event-types", label: "Event Types", icon: CalendarRange },
  { to: "/dashboard/availability", label: "Availability", icon: Clock },
  { to: "/dashboard/bookings", label: "Bookings", icon: Calendar },
  { to: "/dashboard/integrations", label: "Integrations", icon: Plug },
  { to: "/dashboard/analytics", label: "Analytics", icon: ChartBar },
  { to: "/dashboard/settings/profile", label: "Settings", icon: Settings },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-0.5 p-3">
      {nav.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            href={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="flex h-16 items-center border-b border-border/70 px-5">
        <Logo />
      </div>
      <NavList onNavigate={onNavigate} />
      <div className="border-t border-border/70 p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Sarah Chen</p>
        <p className="truncate">syncslot.app/sarah-chen</p>
      </div>
    </>
  );
}

export function DashboardSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border/70 bg-sidebar md:flex md:flex-col">
      <SidebarInner />
    </aside>
  );
}

export function DashboardMobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-64 flex-col bg-sidebar p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarInner onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
