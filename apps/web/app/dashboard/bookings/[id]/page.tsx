"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, CalendarX, Clock, Globe2, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getBooking } from "@/lib/mock/data";
import { formatTime, formatWeekdayLong } from "@/lib/format";

const STATUS_STYLES: Record<string, string> = {
  upcoming: "bg-primary/10 text-primary",
  past: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function BookingDetail() {
  const params = useParams<{ id: string }>();
  const booking = getBooking(params.id);
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);

  if (!booking) return <div className="p-8 text-sm text-muted-foreground">Booking not found.</div>;

  function confirmCancel() {
    toast.success("Booking cancelled. The invitee has been notified.");
    setCancelOpen(false);
    router.push("/dashboard/bookings");
  }

  return (
    <>
      <DashboardTopbar
        title="Booking details"
        description={<Link href="/dashboard/bookings" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to bookings</Link>}
        actions={
          booking.status === "upcoming" ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)}><CalendarX className="mr-1 h-4 w-4" /> Cancel</Button>
              <Button size="sm" onClick={() => toast("Reschedule flow would open here")}><Calendar className="mr-1 h-4 w-4" /> Reschedule</Button>
            </>
          ) : null
        }
      />
      <main className="flex-1 px-8 py-8">
        <div className="grid gap-6 fade-in lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-xl border border-border bg-surface p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2.5 py-0.5 text-xs capitalize ${STATUS_STYLES[booking.status]}`}>{booking.status}</span>
              <span className="text-xs text-muted-foreground">#{booking.id}</span>
            </div>
            <h2 className="mt-4 font-display text-3xl leading-tight">{booking.eventTypeTitle}</h2>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field icon={<Calendar className="h-4 w-4" />} label="Date">{formatWeekdayLong(booking.startsAt)}</Field>
              <Field icon={<Clock className="h-4 w-4" />} label="Time">{formatTime(booking.startsAt)} · {booking.duration} min</Field>
              <Field icon={<User className="h-4 w-4" />} label="Invitee">{booking.invitee}</Field>
              <Field icon={<Mail className="h-4 w-4" />} label="Email"><a href={`mailto:${booking.inviteeEmail}`}>{booking.inviteeEmail}</a></Field>
              <Field icon={<Globe2 className="h-4 w-4" />} label="Timezone">{booking.timezone}</Field>
            </dl>
            <div className="mt-8 border-t border-border pt-6">
              <Label htmlFor="notes" className="text-xs uppercase tracking-widest text-muted-foreground">Private notes</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-2 min-h-[120px]" />
              <div className="mt-3 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => toast.success("Notes saved")}>Save notes</Button>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this booking?</DialogTitle>
            <DialogDescription>{booking.invitee} will be notified by email.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>Keep it</Button>
            <Button variant="destructive" onClick={confirmCancel}>Cancel booking</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return <div><dt className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">{icon} {label}</dt><dd className="mt-1 text-sm">{children}</dd></div>;
}
