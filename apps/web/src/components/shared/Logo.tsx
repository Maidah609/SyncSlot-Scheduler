import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, variant = "dark" }: { className?: string; variant?: "dark" | "light" }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2 font-display text-xl tracking-tight",
        variant === "light" ? "text-primary-foreground" : "text-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </span>
      SyncSlot
    </Link>
  );
}
