import Link from "next/link";
import { Container } from "@/components/shared/Container";
import { Button } from "@/components/ui/button";
import { MarketingFooter, MarketingNav } from "@/components/marketing/MarketingChrome";

const VALUES = [
  { title: "Calm over clever", body: "We choose restraint. Fewer surfaces, better decisions." },
  { title: "Craft in the details", body: "Type, spacing, motion — the small stuff makes the product." },
  { title: "Respect for time", body: "Yours, and the person you're meeting. That's the whole point." },
];

const TEAM = [
  { name: "Maya Alden", role: "Design", initials: "MA" },
  { name: "Julian Osei", role: "Engineering", initials: "JO" },
  { name: "Rhea Kapoor", role: "Product", initials: "RK" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <section className="border-b border-border/70">
        <Container className="py-20 md:py-24">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">About</p>
            <h1 className="mt-4 font-display text-5xl leading-tight md:text-6xl">
              We&apos;re building the calmest scheduling tool on the internet.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              SyncSlot started as a Sunday project by three friends tired of feeling their
              scheduling tools performing at them. We wanted something that would quietly do its job
              — then get out of the way.
            </p>
          </div>
        </Container>
      </section>
      <section className="border-b border-border/70">
        <Container className="py-20">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">What we believe</p>
          <div className="mt-10 grid gap-10 md:grid-cols-3">
            {VALUES.map((v) => (
              <div key={v.title} className="border-t border-border pt-6">
                <h3 className="font-display text-2xl">{v.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
      <section className="border-b border-border/70 bg-muted/40">
        <Container className="py-20">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">The team</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {TEAM.map((p) => (
              <div key={p.name} className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {p.initials}
                </div>
                <p className="mt-4 font-display text-xl">{p.name}</p>
                <p className="text-sm text-muted-foreground">{p.role}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
      <section className="border-b border-border/70">
        <Container className="py-20 text-center">
          <h2 className="font-display text-3xl md:text-4xl">Come see what we&apos;ve built.</h2>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Try SyncSlot free</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/contact">Say hello</Link>
            </Button>
          </div>
        </Container>
      </section>
      <MarketingFooter />
    </div>
  );
}
