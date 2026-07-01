"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

const NAV = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <header className="border-b border-border/70">
      <Container className="flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              href={n.to}
              className={pathname === n.to ? "text-foreground" : "hover:text-foreground"}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/signup">Get started</Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-72 flex-col">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="mt-2">
                <Logo />
              </div>
              <nav className="mt-8 flex flex-col gap-1 text-base">
                {NAV.map((n) => (
                  <Link
                    key={n.to}
                    href={n.to}
                    onClick={() => setOpen(false)}
                    className={
                      "rounded-md px-3 py-2 hover:bg-muted hover:text-foreground " +
                      (pathname === n.to ? "bg-muted text-foreground" : "text-muted-foreground")
                    }
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2 pt-6">
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
                  Theme
                  <ThemeToggle />
                </div>
                <Button asChild variant="outline" onClick={() => setOpen(false)}>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild onClick={() => setOpen(false)}>
                  <Link href="/signup">Get started</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/70">
      <Container className="flex flex-col items-start justify-between gap-6 py-12 md:flex-row md:items-center">
        <Logo />
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} SyncSlot. Scheduling, calmly done.
        </p>
        <div className="flex gap-6 text-xs text-muted-foreground">
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/about" className="hover:text-foreground">About</Link>
          <Link href="/contact" className="hover:text-foreground">Contact</Link>
        </div>
      </Container>
    </footer>
  );
}
