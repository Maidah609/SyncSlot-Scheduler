"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, Calendar as CalendarIcon, Clock } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { getBooking, getEventType, getHost } from "@/lib/mock/data";
import { formatTime, formatWeekdayLong } from "@/lib/format";

const TIMES = ["09:00", "09:30", "10:00", "10:30", "13:00", "13:30", "14:00", "14:30", "15:00"];

export default function ReschedulePage() {
  const params = useParams<{ username: string; eventSlug: string; bookingId: string }>();
  const host = getHost(params.username);
  const eventType = getEventType(params.username, params.eventSlug);
  const booking = getBooking(params.bookingId);
  const router = useRouter();
  const grid = useMemo(() => buildGrid(), []);
  const [pickedDate, setPickedDate] = useState<Date | null>(null);
  const [pickedTime, setPickedTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!host || !eventType || !booking) {
    return <div className="p-8 text-sm text-muted-foreground">Reschedule page not found.</div>;
  }

  function confirm() {
    if (!pickedDate || !pickedTime) return;
    setSubmitting(true);
    setTimeout(() => {
      const search = new URLSearchParams({
        name: booking.invitee,
        email: booking.inviteeEmail,
        time: pickedTime,
        date: pickedDate.toISOString(),
        tz: booking.timezone,
      });
      router.push(`/${host.username}/${eventType.slug}/confirmed?${search.toString()}`);
    }, 500);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <Container className="flex h-16 items-center justify-between">
          <Logo />
          <Link href={`/${host.username}/${eventType.slug}`} className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 inline h-3.5 w-3.5" /> Back
          </Link>
        </Container>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="fade-in">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Reschedule</p>
          <h1 className="mt-2 font-display text-3xl">Pick a new time</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Currently: <span className="text-foreground">{formatWeekdayLong(booking.startsAt)}</span>{" · "}
            {formatTime(booking.startsAt)}
          </p>

          <div className="mt-8 grid gap-8 rounded-2xl border border-border bg-surface p-6 shadow-soft md:grid-cols-[1fr_240px]">
            <div>
              <p className="text-sm font-medium">
                {grid[10].toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
              </p>
              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
                {["S","M","T","W","T","F","S"].map((d,i) => <span key={i}>{d}</span>)}
                {grid.map((d, i) => {
                  const isPicked = pickedDate && d.toDateString() === pickedDate.toDateString();
                  const available = d.getMonth() === grid[10].getMonth() && d.getDay() !== 0 && d.getDay() !== 6;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!available}
                      onClick={() => { setPickedDate(d); setPickedTime(null); }}
                      className={
                        "aspect-square rounded-md border text-sm transition " +
                        (isPicked
                          ? "border-primary bg-primary text-primary-foreground"
                          : available
                            ? "border-transparent hover:border-primary/40"
                            : "border-transparent text-muted-foreground/30 cursor-not-allowed")
                      }
                    >
                      {d.getUTCDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {pickedDate
                  ? pickedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })
                  : "Pick a date"}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {!pickedDate ? (
                  <p className="text-sm text-muted-foreground">Times will appear here.</p>
                ) : (
                  TIMES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPickedTime(t)}
                      className={
                        "rounded-md border px-3 py-2 text-sm transition " +
                        (pickedTime === t ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")
                      }
                    >
                      {formatDisplayTime(t)}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              <Clock className="mr-1 inline h-3 w-3" />
              {eventType.duration} min · {booking.timezone}
            </p>
            <div className="flex gap-2">
              <Button asChild variant="ghost">
                <Link href={`/${host.username}/${eventType.slug}`}>Back</Link>
              </Button>
              <Button onClick={confirm} disabled={!pickedDate || !pickedTime || submitting}>
                <CalendarIcon className="mr-1 h-4 w-4" />
                {submitting ? "Confirming…" : "Confirm new time"}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function buildGrid(): Date[] {
  const y = 2026, m = 6;
  const first = new Date(Date.UTC(y, m, 1));
  const offset = first.getUTCDay();
  return Array.from({ length: 42 }, (_, i) => new Date(Date.UTC(y, m, i - offset + 1)));
}

function formatDisplayTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m.toString().padStart(2, "0")} ${suffix}`;
}
