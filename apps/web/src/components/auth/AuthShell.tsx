import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Back to home
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-md flex-col px-6 py-16">
        <div className="fade-in">
          <h1 className="font-display text-3xl">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
          <div className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-soft">
            {children}
          </div>
          {footer ? <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
