"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, Clock, Globe2, MapPin, Video } from "lucide-react";
import { toast } from "sonner";
import { Container } from "@/components/shared/Container";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { getEventType, getHost } from "@/lib/mock/data";

const detectedTz =
  typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

export default function BookingPage() {
  const params = useParams<{ username: string; eventSlug: string }>();
  const host = getHost(params.username);
  const eventType = getEventType(params.username, params.eventSlug);
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [timezone, setTimezone] = useState(detectedTz);
  const [tzChanged, setTzChanged] = useState(false);
  const [emptyDay, setEmptyDay] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const daysGrid = useMemo(() => buildMonthGrid(new Date()), []);
  const times = useMemo(() => {
    if (!selectedDate || emptyDay) return [];
    return ["09:00", "09:30", "10:00", "10:30", "11:00", "13:00", "13:30", "14:00", "15:00"];
  }, [selectedDate, emptyDay]);

  if (!host || !eventType) {
    return <div className="p-8 text-sm text-muted-foreground">Booking page not found.</div>;
  }

  function pickDate(d: Date) {
    setSelectedDate(d);
    setSelectedTime(null);
    setShowForm(false);
  }
  function pickTime(t: string) {
    setSelectedTime(t);
    setShowForm(true);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      if (name.toLowerCase() === "taken") {
        toast.error("That slot was just booked. Please pick another time.");
        setShowForm(false);
        setSelectedTime(null);
        return;
      }
      const search = new URLSearchParams({
        name,
        email,
        time: selectedTime ?? "",
        date: selectedDate?.toISOString() ?? "",
        tz: timezone,
      });
      router.push(`/${host.username}/${eventType.slug}/confirmed?${search.toString()}`);
    }, 700);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <Container className="flex h-16 items-center justify-between">
          <Logo />
          <Link href={`/${host.username}`} className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 inline h-3.5 w-3.5" /> Back to {host.name.split(" ")[0]}&apos;s page
          </Link>
        </Container>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-[minmax(0,320px)_1fr] fade-in">
          <aside className="md:sticky md:top-8 md:self-start">
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {host.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{host.name}</p>
                  <p className="truncate text-sm">{host.title}</p>
                </div>
              </div>
              <h1 className="mt-6 font-display text-2xl leading-snug">{eventType.title}</h1>
              <ul className="mt-4 grid gap-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Clock className="h-4 w-4" /> {eventType.duration} minutes</li>
                <li className="flex items-center gap-2">
                  {eventType.location === "in-person" ? <MapPin className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  {locationLabel(eventType.location)}
                </li>
                <li className="flex items-center gap-2"><Globe2 className="h-4 w-4" /> {timezone}</li>
              </ul>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{eventType.description}</p>
              {eventType.cancellationPolicy ? (
                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Cancellation policy</p>
                  <p className="mt-1 text-sm text-muted-foreground">{eventType.cancellationPolicy}</p>
                </div>
              ) : null}
            </div>
          </aside>

          <section className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
            {!showForm ? (
              <>
                {tzChanged ? (
                  <div className="mb-4 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
                    Times updated for <span className="font-medium">{timezone}</span>.
                  </div>
                ) : null}

                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl">Select a date & time</h2>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch checked={emptyDay} onCheckedChange={setEmptyDay} />
                    Preview &quot;no availability&quot;
                  </label>
                </div>

                <div className="mt-6 grid gap-8 md:grid-cols-[1fr_220px]">
                  <div>
                    <MonthCalendar grid={daysGrid} selected={selectedDate} onPick={pickDate} />
                    <div className="mt-6">
                      <Label htmlFor="tz" className="text-xs">Your timezone</Label>
                      <select
                        id="tz"
                        value={timezone}
                        onChange={(e) => {
                          setTimezone(e.target.value);
                          setTzChanged(true);
                        }}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {[detectedTz, "America/Los_Angeles", "America/New_York", "Europe/London", "Europe/Berlin", "Asia/Singapore"].filter(
                          (v, i, a) => a.indexOf(v) === i,
                        ).map((tz) => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      {selectedDate
                        ? selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
                        : "Pick a date"}
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      {!selectedDate ? (
                        <p className="text-sm text-muted-foreground">Times will appear here.</p>
                      ) : emptyDay ? (
                        <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                          No availability on this day. Try another.
                        </div>
                      ) : times.length === 0 ? (
                        <SkeletonTimes />
                      ) : (
                        times.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => pickTime(t)}
                            className={
                              "rounded-md border px-3 py-2 text-sm transition " +
                              (selectedTime === t ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")
                            }
                          >
                            {formatSlotTime(t)}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <form onSubmit={submit} className="grid gap-5 fade-in">
                <div>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="mr-1 inline h-3 w-3" /> Change time
                  </button>
                  <h2 className="mt-2 font-display text-xl">Confirm your details</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedDate?.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                    {" · "}
                    {selectedTime ? formatSlotTime(selectedTime) : ""} · {timezone}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="n">Full name</Label>
                  <Input id="n" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="e">Email</Label>
                  <Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                {eventType.questions.map((q) => (
                  <div key={q.id} className="grid gap-2">
                    <Label htmlFor={q.id}>
                      {q.label}
                      {q.required ? <span className="ml-1 text-destructive">*</span> : null}
                    </Label>
                    {q.type === "text" ? (
                      <Textarea
                        id={q.id}
                        required={q.required}
                        value={answers[q.id] ?? ""}
                        onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      />
                    ) : q.type === "multiple-choice" ? (
                      <RadioGroup
                        value={answers[q.id] ?? ""}
                        onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                        className="grid gap-2"
                      >
                        {(q.options ?? []).map((o) => (
                          <label key={o} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                            <RadioGroupItem value={o} id={`${q.id}-${o}`} />
                            <span>{o}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    ) : (
                      <RadioGroup
                        value={answers[q.id] ?? ""}
                        onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                        className="flex gap-3"
                      >
                        {["Yes", "No"].map((o) => (
                          <label key={o} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                            <RadioGroupItem value={o} id={`${q.id}-${o}`} />
                            {o}
                          </label>
                        ))}
                      </RadioGroup>
                    )}
                  </div>
                ))}
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Confirming…" : "Confirm booking"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Tip: type &quot;taken&quot; as your name to preview the slot-taken error state.
                </p>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function locationLabel(l: string) {
  const m: Record<string, string> = {
    zoom: "Zoom (link sent on confirmation)",
    "google-meet": "Google Meet (link sent on confirmation)",
    phone: "Phone call",
    "in-person": "In person",
    custom: "Custom link",
  };
  return m[l] ?? l;
}

type DayCell = { date: Date; inMonth: boolean; available: boolean; isToday: boolean };
function buildMonthGrid(base: Date): DayCell[] {
  const y = base.getFullYear();
  const m = base.getMonth();
  const first = new Date(y, m, 1);
  const startOffset = first.getDay();
  const cells: DayCell[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 42; i++) {
    const d = new Date(y, m, i - startOffset + 1);
    const inMonth = d.getMonth() === m;
    const isPast = d < today;
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    cells.push({
      date: d,
      inMonth,
      available: inMonth && !isPast && !isWeekend,
      isToday: d.getTime() === today.getTime(),
    });
  }
  return cells;
}

function MonthCalendar({ grid, selected, onPick }: { grid: DayCell[]; selected: Date | null; onPick: (d: Date) => void }) {
  const monthLabel = grid[10].date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return (
    <div>
      <p className="text-sm font-medium">{monthLabel}</p>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
        {grid.map((c, i) => {
          const isSelected = selected && c.date.toDateString() === selected.toDateString();
          return (
            <button
              key={i}
              type="button"
              onClick={() => c.available && onPick(c.date)}
              disabled={!c.available}
              className={
                "aspect-square rounded-md border text-sm transition " +
                (isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : c.available
                    ? "border-transparent text-foreground hover:border-primary/40"
                    : "border-transparent text-muted-foreground/40 cursor-not-allowed")
              }
            >
              {c.date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SkeletonTimes() {
  return (
    <div className="grid gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}

function formatSlotTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m.toString().padStart(2, "0")} ${suffix}`;
}
