"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarPlus, Clock, ExternalLink, Plus, Sparkles } from "lucide-react";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { demoBookings, demoHost } from "@/lib/mock/data";
import { formatDayNum, formatMonthShort, formatTime } from "@/lib/format";

export default function DashboardHome() {
  const [empty, setEmpty] = useState(false);

  return (
    <>
      <DashboardTopbar
        title={`Good morning, ${demoHost.name.split(" ")[0]}.`}
        description="Here's what's on your calendar."
        actions={
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={empty} onCheckedChange={setEmpty} />
              Preview empty state
            </label>
            <Button asChild>
              <Link href="/dashboard/event-types">
                <Plus className="mr-1 h-4 w-4" /> New event type
              </Link>
            </Button>
          </div>
        }
      />
      <main className="flex-1 px-8 py-8">{empty ? <EmptyState /> : <PopulatedState />}</main>
    </>
  );
}

function PopulatedState() {
  const stats = [
    { label: "Upcoming meetings", value: demoBookings.length },
    { label: "Bookings this week", value: 12 },
    { label: "Active event types", value: 3 },
    { label: "Connected calendars", value: 2 },
  ];
  return (
    <div className="grid gap-8 fade-in">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-5 shadow-soft">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
            <p className="mt-3 font-display text-3xl">{s.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-border bg-surface shadow-soft">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-medium">Upcoming meetings</h2>
            <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {demoBookings.filter((b) => b.status === "upcoming").map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-16">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      {formatMonthShort(b.startsAt)}
                    </p>
                    <p className="font-display text-2xl leading-none">{formatDayNum(b.startsAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{b.eventTypeTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      with {b.invitee} · {formatTime(b.startsAt)} · {b.duration}m
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/dashboard/bookings/${b.id}`}>Details</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-sm font-medium">Quick actions</h2>
            <div className="mt-4 grid gap-2">
              <QuickLink to="/dashboard/event-types" icon={<CalendarPlus className="h-4 w-4" />} title="Create event type" />
              <QuickLink to="/dashboard/availability" icon={<Clock className="h-4 w-4" />} title="Edit availability" />
              <QuickLink to="/sarah-chen" icon={<ExternalLink className="h-4 w-4" />} title="Open my booking page" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-sm font-medium">This week</h2>
            <p className="mt-3 text-xs text-muted-foreground">Bookings by day</p>
            <div className="mt-3 flex items-end gap-2">
              {[3, 2, 4, 1, 2, 0, 0].map((v, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-primary/70"
                    style={{ height: `${8 + v * 14}px` }}
                    title={`${v} bookings`}
                  />
                  <span className="text-[10px] text-muted-foreground">{"MTWTFSS"[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function QuickLink({
  to,
  icon,
  title,
  muted,
}: { to: string; icon: React.ReactNode; title: string; muted?: boolean }) {
  return (
    <Link
      href={to}
      className={
        "flex items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-sm hover:bg-muted " +
        (muted ? "text-muted-foreground" : "text-foreground")
      }
    >
      {icon}
      {title}
    </Link>
  );
}

function EmptyState() {
  const steps = [
    { title: "Create your first event type", body: "A 30-minute meeting works well to start.", to: "/dashboard/event-types" },
    { title: "Set your availability", body: "Pick the weekly hours you're happy to be booked." },
    { title: "Share your link", body: "Send syncslot.app/sarah-chen to someone." },
  ];
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-10 text-center shadow-soft fade-in">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-5 w-5" />
      </div>
      <h2 className="mt-5 font-display text-2xl">Let&apos;s get your first booking.</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Three small steps and your booking page is live.
      </p>
      <div className="mt-8 grid gap-3 text-left">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-4">
            <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
              {i + 1}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.body}</p>
            </div>
            {s.to ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={s.to}>Start</Link>
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
