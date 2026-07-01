"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/dashboard/settings/profile", label: "Profile" },
  { to: "/dashboard/settings/account", label: "Account" },
  { to: "/dashboard/settings/billing", label: "Billing" },
  { to: "/dashboard/settings/team", label: "Team" },
] as const;

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b border-border">
      {TABS.map((t) => {
        const active = pathname === t.to;
        return (
          <Link
            key={t.to}
            href={t.to}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm transition",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
