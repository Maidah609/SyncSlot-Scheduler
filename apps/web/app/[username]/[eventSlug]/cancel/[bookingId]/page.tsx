"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CalendarX } from "lucide-react";
import { toast } from "sonner";
import { Container } from "@/components/shared/Container";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getBooking, getEventType, getHost } from "@/lib/mock/data";
import { formatTime, formatWeekdayLong } from "@/lib/format";

const REASONS = ["Conflict came up", "No longer needed", "Rescheduling separately", "Other"];

export default function CancelPage() {
  const params = useParams<{ username: string; eventSlug: string; bookingId: string }>();
  const host = getHost(params.username);
  const eventType = getEventType(params.username, params.eventSlug);
  const booking = getBooking(params.bookingId);
  const router = useRouter();
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!host || !eventType || !booking) {
    return <div className="p-8 text-sm text-muted-foreground">Cancel page not found.</div>;
  }

  function submit() {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setDone(true);
      toast.success("Meeting cancelled");
    }, 500);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <Container className="flex h-16 items-center justify-between">
          <Logo />
          <Link href={`/${host.username}`} className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 inline h-3.5 w-3.5" /> {host.name.split(" ")[0]}&apos;s page
          </Link>
        </Container>
      </header>

      <main className="mx-auto max-w-lg px-6 py-16">
        {done ? (
          <div className="rounded-2xl border border-border bg-surface p-10 text-center shadow-soft fade-in">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <CalendarX className="h-5 w-5" />
            </div>
            <h1 className="mt-5 font-display text-2xl">Meeting cancelled</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              {host.name} has been notified. You&apos;ll receive a confirmation email shortly.
            </p>
            <div className="mt-8">
              <Button asChild variant="outline">
                <Link href={`/${host.username}`}>Book again</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-soft fade-in">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Cancel meeting</p>
            <h1 className="mt-2 font-display text-2xl">{eventType.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatWeekdayLong(booking.startsAt)} · {formatTime(booking.startsAt)} with {host.name}
            </p>

            <div className="mt-8">
              <Label className="text-sm">Reason</Label>
              <RadioGroup value={reason} onValueChange={setReason} className="mt-2 grid gap-2">
                {REASONS.map((r) => (
                  <label
                    key={r}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-sm hover:bg-muted"
                  >
                    <RadioGroupItem value={r} id={r} />
                    {r}
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="mt-5">
              <Label htmlFor="detail" className="text-sm">Message (optional)</Label>
              <Textarea
                id="detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder={`A short note to ${host.name.split(" ")[0]}.`}
                className="mt-1.5 min-h-[100px]"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => router.push(`/${host.username}/${eventType.slug}`)}>
                Never mind
              </Button>
              <Button variant="destructive" onClick={submit} disabled={submitting}>
                {submitting ? "Cancelling…" : "Cancel meeting"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
