"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Clock } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Logo } from "@/components/shared/Logo";
import { getHost } from "@/lib/mock/data";

export default function PublicProfile() {
  const params = useParams<{ username: string }>();
  const host = getHost(params.username);

  if (!host) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Host not found.</div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <Container className="flex h-16 items-center justify-between">
          <Logo />
          <p className="text-xs text-muted-foreground">Scheduling by SyncSlot</p>
        </Container>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="fade-in text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 font-display text-2xl text-primary">
            {host.initials}
          </div>
          <h1 className="mt-6 font-display text-4xl">{host.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{host.title}</p>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">
            {host.welcome}
          </p>
        </div>

        <section className="mt-14">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Book a time</p>
          <ul className="mt-4 grid gap-4">
            {host.eventTypes.filter((e) => e.active).map((e) => (
              <li key={e.id}>
                <Link
                  href={`/${host.username}/${e.slug}`}
                  className="group flex items-start justify-between gap-4 rounded-xl border border-border bg-surface p-6 shadow-soft transition hover:border-primary/40"
                >
                  <div>
                    <h2 className="text-lg font-medium">{e.title}</h2>
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> {e.duration} minutes
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{e.description}</p>
                  </div>
                  <span className="mt-1 shrink-0 text-sm text-muted-foreground transition group-hover:text-primary">
                    Book <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
