import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Button } from "@/components/ui/button";
import { MarketingFooter, MarketingNav } from "@/components/marketing/MarketingChrome";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    tagline: "For solo work, quietly done.",
    cta: "Get started",
    features: [
      "1 event type",
      "Unlimited bookings",
      "1 connected calendar",
      "SyncSlot booking page",
      "Email notifications",
    ],
  },
  {
    name: "Pro",
    price: "$12",
    tagline: "For freelancers and consultants.",
    cta: "Start Pro trial",
    featured: true,
    features: [
      "Unlimited event types",
      "Multiple calendars",
      "Custom branding & colors",
      "Automated reminders",
      "Zapier & webhooks",
      "Remove SyncSlot branding",
    ],
  },
  {
    name: "Team",
    price: "$20",
    tagline: "For teams that share time.",
    cta: "Contact sales",
    features: [
      "Everything in Pro",
      "Shared availability",
      "Round-robin scheduling",
      "Team roles & permissions",
      "Centralized billing",
      "Priority support",
    ],
  },
];

const FAQS = [
  { q: "Is there a free trial?", a: "Yes — Pro comes with a 14-day trial. No credit card required." },
  { q: "Can I change plans later?", a: "Anytime. Upgrades take effect immediately; downgrades apply at the next cycle." },
  { q: "Do you offer annual pricing?", a: "Yes — save 20% when billed annually. Toggle on the checkout page." },
  { q: "What happens if I go over the free plan?", a: "Nothing breaks. We'll gently prompt you to upgrade when you cross the limit." },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <section className="border-b border-border/70">
        <Container className="py-20 text-center md:py-24">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pricing</p>
          <h1 className="mt-4 font-display text-5xl leading-tight md:text-6xl">
            Simple pricing. Per user, per month.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            Start free forever. Upgrade when SyncSlot becomes part of how you work.
          </p>
        </Container>
      </section>
      <section className="border-b border-border/70">
        <Container className="py-16">
          <div className="grid gap-6 lg:grid-cols-3">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className={
                  "flex flex-col rounded-2xl border p-8 " +
                  (t.featured ? "border-primary/40 bg-surface shadow-soft" : "border-border bg-surface")
                }
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{t.name}</p>
                  {t.featured ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">
                      Popular
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 font-display text-5xl">
                  {t.price}
                  <span className="text-base text-muted-foreground"> /mo</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{t.tagline}</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-8" variant={t.featured ? "default" : "outline"}>
                  <Link href="/signup">
                    {t.cta} <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </Container>
      </section>
      <section className="border-b border-border/70">
        <Container className="py-20">
          <div className="mx-auto max-w-2xl">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Questions</p>
            <h2 className="mt-3 font-display text-3xl">Frequently asked</h2>
            <dl className="mt-10 space-y-8">
              {FAQS.map((f) => (
                <div key={f.q} className="border-t border-border pt-6">
                  <dt className="text-base font-medium">{f.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </section>
      <MarketingFooter />
    </div>
  );
}
