import Link from "next/link";
import { ArrowRight, CalendarClock, Globe2, Bell, Layers } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Button } from "@/components/ui/button";
import { MarketingFooter, MarketingNav } from "@/components/marketing/MarketingChrome";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <Hero />
      <Benefits />
      <HowItWorks />
      <Testimonials />
      <PricingPreview />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="border-b border-border/70">
      <Container className="grid gap-12 py-20 md:grid-cols-[1.05fr_1fr] md:py-28">
        <div className="fade-in max-w-xl">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Scheduling, quietly done
          </p>
          <h1 className="mt-5 font-display text-5xl leading-[1.05] md:text-6xl">
            The calmest way to get on someone&apos;s calendar.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            SyncSlot gives busy professionals a single, elegant link. Share your availability,
            let invitees pick a time, and skip the email back-and-forth entirely.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/signup">
                Get started free <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/sarah-chen">See a live booking page</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card required · 14-day trial of Pro
          </p>
        </div>

        <HeroMock />
      </Container>
    </section>
  );
}

function HeroMock() {
  const times = ["9:00", "9:30", "10:00", "10:30", "11:00", "11:30"];
  return (
    <div className="relative fade-in">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Sarah Chen</p>
            <p className="mt-1 font-display text-xl">Career Strategy Session</p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">30 min</span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Thursday, June 12</p>
            <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-[11px] text-muted-foreground">
              {"SMTWTFS".split("").map((d, i) => (
                <span key={i}>{d}</span>
              ))}
              {Array.from({ length: 30 }).map((_, i) => (
                <span
                  key={i}
                  className={
                    "flex aspect-square items-center justify-center rounded-md border border-transparent " +
                    (i === 11
                      ? "bg-primary text-primary-foreground"
                      : [3, 5, 8, 12, 15, 18, 22].includes(i)
                        ? "text-foreground hover:border-border"
                        : "opacity-40")
                  }
                >
                  {i + 1}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Available times</p>
            <div className="mt-3 flex flex-col gap-2">
              {times.map((t, i) => (
                <div
                  key={t}
                  className={
                    "rounded-md border px-3 py-2 text-sm " +
                    (i === 2
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-foreground hover:border-primary/40")
                  }
                >
                  {t} AM
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-6 -right-6 hidden rounded-xl border border-border bg-surface px-4 py-3 shadow-soft md:block"
      >
        <p className="text-xs text-muted-foreground">Confirmed</p>
        <p className="text-sm font-medium">Thu, Jun 12 · 10:00 AM</p>
      </div>
    </div>
  );
}

function Benefits() {
  const items = [
    {
      icon: Globe2,
      title: "Timezone-aware scheduling",
      body: "Invitees always see times in their local timezone. No mental math, no misfires.",
    },
    {
      icon: CalendarClock,
      title: "Calendar conflict detection",
      body: "SyncSlot checks your connected calendars in real time so you're never double-booked.",
    },
    {
      icon: Bell,
      title: "Booking reminders",
      body: "Gentle email reminders that reduce no-shows without feeling pushy.",
    },
    {
      icon: Layers,
      title: "Custom event types",
      body: "Different durations, questions, and policies for intro calls, deep-dives, and everything between.",
    },
  ];
  return (
    <section id="features" className="border-b border-border/70 bg-background">
      <Container className="py-24">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Features</p>
          <h2 className="mt-3 font-display text-4xl">Everything you need. Nothing you don&apos;t.</h2>
          <p className="mt-4 text-muted-foreground">
            SyncSlot is built for people who want scheduling to feel considered — not gamified.
          </p>
        </div>
        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="text-base font-medium text-foreground">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Create an event type", body: "Choose a duration, add a description, and set your rules." },
    { n: "02", title: "Set your availability", body: "Define weekly hours or per-day windows. Add overrides for one-off changes." },
    { n: "03", title: "Share your link", body: "One elegant URL for every meeting, or one per event type." },
    { n: "04", title: "Get booked", body: "Invitees pick a time. Everyone gets a calendar invite. Done." },
  ];
  return (
    <section id="how-it-works" className="border-b border-border/70">
      <Container className="py-24">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">How it works</p>
          <h2 className="mt-3 font-display text-4xl">Four small steps. Then it just runs.</h2>
        </div>
        <div className="mt-14 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="border-t border-border pt-6">
              <p className="font-display text-xl text-primary">{s.n}</p>
              <p className="mt-3 text-base font-medium">{s.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Testimonials() {
  const quotes = [
    {
      quote:
        "SyncSlot replaced three tools we were duct-taping together. It's the first scheduling product my clients have complimented.",
      name: "Priya Natarajan",
      role: "Founder, Northwind Advisory",
    },
    {
      quote:
        "It feels considered — like every screen was actually thought through. Rare in this category.",
      name: "Daniel Osei",
      role: "Product Designer, Fig Studio",
    },
  ];
  return (
    <section className="border-b border-border/70 bg-muted/40">
      <Container className="py-24">
        <div className="grid gap-10 md:grid-cols-2">
          {quotes.map((q) => (
            <figure key={q.name} className="rounded-2xl border border-border bg-surface p-8 shadow-soft">
              <blockquote className="font-display text-2xl leading-snug text-foreground">
                “{q.quote}”
              </blockquote>
              <figcaption className="mt-6 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{q.name}</span> · {q.role}
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}

function PricingPreview() {
  const tiers = [
    {
      name: "Free",
      price: "$0",
      body: "One event type, unlimited bookings, one connected calendar.",
      cta: "Get started",
    },
    {
      name: "Pro",
      price: "$12",
      body: "Unlimited event types, branding, multiple calendars, reminders.",
      cta: "Start Pro trial",
      featured: true,
    },
    {
      name: "Team",
      price: "$20",
      body: "Shared scheduling, round-robin, permissions, centralized billing.",
      cta: "Contact sales",
    },
  ];
  return (
    <section className="border-b border-border/70">
      <Container className="py-24">
        <div className="flex items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pricing</p>
            <h2 className="mt-3 font-display text-4xl">Start free. Upgrade when it matters.</h2>
          </div>
          <Button asChild variant="ghost" className="hidden md:inline-flex">
            <Link href="/pricing">See full pricing</Link>
          </Button>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={
                "rounded-2xl border p-6 " +
                (tier.featured ? "border-primary/40 bg-surface shadow-soft" : "border-border bg-surface")
              }
            >
              <p className="text-sm text-muted-foreground">{tier.name}</p>
              <p className="mt-3 font-display text-4xl">
                {tier.price}
                <span className="text-sm text-muted-foreground"> /mo</span>
              </p>
              <p className="mt-3 text-sm text-muted-foreground">{tier.body}</p>
              <Button asChild className="mt-6 w-full" variant={tier.featured ? "default" : "outline"}>
                <Link href="/signup">{tier.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function SiteFooter() {
  return <MarketingFooter />;
}
