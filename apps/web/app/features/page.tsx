import Link from "next/link";
import {
  CalendarClock,
  Globe2,
  Bell,
  Layers,
  Palette,
  ShieldCheck,
  Webhook,
  MailCheck,
  Users2,
  Sparkles,
} from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Button } from "@/components/ui/button";
import { MarketingFooter, MarketingNav } from "@/components/marketing/MarketingChrome";

const GROUPS = [
  {
    title: "Booking flow",
    items: [
      { icon: Globe2, name: "Timezone-aware slots", body: "Invitees always see times in their local zone." },
      { icon: CalendarClock, name: "Conflict detection", body: "Live-checked against your connected calendars." },
      { icon: Layers, name: "Custom event types", body: "Different durations, questions, and policies per link." },
      { icon: MailCheck, name: "Smart confirmations", body: "Calendar invites and ICS attachments, sent automatically." },
    ],
  },
  {
    title: "For your brand",
    items: [
      { icon: Palette, name: "Custom branding", body: "Choose your accent color and remove SyncSlot marks." },
      { icon: Sparkles, name: "A calm booking page", body: "The most considered public page in the category." },
      { icon: Bell, name: "Gentle reminders", body: "Reduce no-shows without feeling pushy." },
    ],
  },
  {
    title: "For teams",
    items: [
      { icon: Users2, name: "Shared availability", body: "Round-robin or collective, without spreadsheets." },
      { icon: ShieldCheck, name: "Roles & permissions", body: "Owners, admins, and members with clear scope." },
      { icon: Webhook, name: "Webhooks & Zapier", body: "Pipe bookings into your CRM, docs, or Slack." },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <section className="border-b border-border/70">
        <Container className="py-20 md:py-24">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Features</p>
            <h1 className="mt-4 font-display text-5xl leading-tight md:text-6xl">
              A short list of things, done really well.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              SyncSlot is deliberately narrow. Every feature earned its way in by making the
              scheduling flow quieter, not busier.
            </p>
          </div>
        </Container>
      </section>

      {GROUPS.map((g) => (
        <section key={g.title} className="border-b border-border/70">
          <Container className="py-20">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{g.title}</p>
            <div className="mt-10 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
              {g.items.map(({ icon: Icon, name, body }) => (
                <div key={name} className="flex flex-col gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-base font-medium">{name}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      ))}

      <section className="border-b border-border/70 bg-muted/40">
        <Container className="py-20 text-center">
          <h2 className="font-display text-3xl md:text-4xl">Ready to try the calm version?</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Set up your first event type in under two minutes.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Get started free</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
        </Container>
      </section>

      <MarketingFooter />
    </div>
  );
}
