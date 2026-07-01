"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarX, Download, Search } from "lucide-react";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { demoBookings, type DemoBooking } from "@/lib/mock/data";
import { formatDayNum, formatMonthShort, formatTime } from "@/lib/format";

const STATUSES: Array<{ key: DemoBooking["status"]; label: string }> = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
];

export default function BookingsList() {
  const [status, setStatus] = useState<DemoBooking["status"]>("upcoming");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return demoBookings
      .filter((b) => b.status === status)
      .filter((b) => (q ? b.invitee.toLowerCase().includes(q) || b.eventTypeTitle.toLowerCase().includes(q) : true));
  }, [status, query]);

  const counts = useMemo(() => {
    const c: Record<DemoBooking["status"], number> = { upcoming: 0, past: 0, cancelled: 0 };
    demoBookings.forEach((b) => (c[b.status] += 1));
    return c;
  }, []);

  return (
    <>
      <DashboardTopbar
        title="Bookings"
        description="Every meeting, past and future."
        actions={<Button variant="outline" size="sm"><Download className="mr-1 h-4 w-4" /> Export CSV</Button>}
      />
      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="fade-in">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={status} onValueChange={(v) => setStatus(v as DemoBooking["status"])}>
              <TabsList>
                {STATUSES.map((s) => (
                  <TabsTrigger key={s.key} value={s.key}>
                    {s.label}
                    <span className="ml-2 text-[11px] text-muted-foreground">{counts[s.key]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search invitee or type" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
            {filtered.length === 0 ? (
              <EmptyState
                icon={CalendarX}
                title={query ? "No matches" : `No ${status} bookings`}
                description={
                  query
                    ? "Try a different name or event type."
                    : status === "upcoming"
                      ? "New bookings will land here as invitees pick times."
                      : status === "past"
                        ? "Completed meetings will show up here."
                        : "Cancelled bookings are archived here for reference."
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 text-center">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">{formatMonthShort(b.startsAt)}</p>
                        <p className="font-display text-2xl leading-none">{formatDayNum(b.startsAt)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{b.eventTypeTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.invitee} · {formatTime(b.startsAt)} · {b.duration}m · {b.timezone}
                        </p>
                      </div>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/dashboard/bookings/${b.id}`}>Details</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
