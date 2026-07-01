"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Calendar, Check, Clock, Globe2, Video } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { getEventType, getHost } from "@/lib/mock/data";

export default function ConfirmedPage() {
  const params = useParams<{ username: string; eventSlug: string }>();
  const searchParams = useSearchParams();
  const host = getHost(params.username);
  const eventType = getEventType(params.username, params.eventSlug);
  const name = searchParams.get("name") ?? "";
  const time = searchParams.get("time") ?? "";
  const date = searchParams.get("date") ?? "";
  const tz = searchParams.get("tz") ?? "UTC";
  const d = date ? new Date(date) : null;

  if (!host || !eventType) {
    return <div className="p-8 text-sm text-muted-foreground">Confirmation not found.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <Container className="flex h-16 items-center justify-between">
          <Logo />
          <p className="text-xs text-muted-foreground">Scheduling by SyncSlot</p>
        </Container>
      </header>
      <main className="mx-auto max-w-xl px-6 py-16">
        <div className="fade-in rounded-2xl border border-border bg-surface p-8 text-center shadow-soft">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="h-6 w-6" />
          </div>
          <h1 className="mt-6 font-display text-3xl">You&apos;re booked.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {name ? `Thanks, ${name}. ` : ""}A calendar invite is on its way.
          </p>

          <div className="mt-8 grid gap-3 text-left">
            <Row icon={<Calendar className="h-4 w-4" />} label={eventType.title} sub={`with ${host.name}`} />
            <Row
              icon={<Clock className="h-4 w-4" />}
              label={
                d
                  ? `${d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · ${formatTime(time)}`
                  : "Pending"
              }
              sub={`${eventType.duration} minutes`}
            />
            <Row icon={<Globe2 className="h-4 w-4" />} label={tz} sub="Your timezone" />
            <Row icon={<Video className="h-4 w-4" />} label={locationLabel(eventType.location)} sub="You&apos;ll get the link by email" />
          </div>

          <div className="mt-8 grid gap-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Add to calendar</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button variant="outline" size="sm">Google</Button>
              <Button variant="outline" size="sm">Outlook</Button>
              <Button variant="outline" size="sm">Apple / ICS</Button>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-4 border-t border-border pt-6 text-sm">
            <Link href={`/${host.username}/${eventType.slug}/reschedule/b1`} className="text-muted-foreground hover:text-foreground">Reschedule</Link>
            <span className="text-muted-foreground/40">·</span>
            <Link href={`/${host.username}/${eventType.slug}/cancel/b1`} className="text-muted-foreground hover:text-foreground">Cancel</Link>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link href={`/${host.username}`} className="hover:text-foreground">
            Back to {host.name.split(" ")[0]}&apos;s booking page
          </Link>
        </p>
      </main>
    </div>
  );
}

function Row({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-left">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        {sub ? <p className="truncate text-xs text-muted-foreground">{sub}</p> : null}
      </div>
    </div>
  );
}

function formatTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m.toString().padStart(2, "0")} ${suffix}`;
}

function locationLabel(l: string) {
  const m: Record<string, string> = {
    zoom: "Zoom",
    "google-meet": "Google Meet",
    phone: "Phone call",
    "in-person": "In person",
    custom: "Custom link",
  };
  return m[l] ?? l;
}
