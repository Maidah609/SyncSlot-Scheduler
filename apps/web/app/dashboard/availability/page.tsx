"use client";

import { useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Interval = { id: string; start: string; end: string };
type Day = { name: string; enabled: boolean; intervals: Interval[] };

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const initialSchedule: Day[] = DAY_NAMES.map((name, i) => ({
  name,
  enabled: i >= 1 && i <= 5,
  intervals: i >= 1 && i <= 5 ? [{ id: `${i}-a`, start: "09:00", end: "17:00" }] : [],
}));
const TIMEZONES = [
  "America/Los_Angeles",
  "America/New_York",
  "America/Chicago",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
  "Australia/Sydney",
];

export default function AvailabilityPage() {
  const [scheduleName, setScheduleName] = useState("Standard hours");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [days, setDays] = useState<Day[]>(initialSchedule);
  const [overrides, setOverrides] = useState<{ id: string; date: string; note: string }[]>([
    { id: "o1", date: "2026-07-04", note: "Closed — Independence Day" },
  ]);

  function toggleDay(i: number, enabled: boolean) {
    setDays((prev) =>
      prev.map((d, idx) =>
        idx === i
          ? {
              ...d,
              enabled,
              intervals: enabled && d.intervals.length === 0
                ? [{ id: `${i}-new`, start: "09:00", end: "17:00" }]
                : d.intervals,
            }
          : d,
      ),
    );
  }

  function updateInterval(dayIdx: number, intId: string, field: "start" | "end", value: string) {
    setDays((prev) =>
      prev.map((d, idx) =>
        idx === dayIdx
          ? { ...d, intervals: d.intervals.map((it) => (it.id === intId ? { ...it, [field]: value } : it)) }
          : d,
      ),
    );
  }

  function addInterval(dayIdx: number) {
    setDays((prev) =>
      prev.map((d, idx) =>
        idx === dayIdx
          ? { ...d, intervals: [...d.intervals, { id: `${dayIdx}-${Date.now()}`, start: "13:00", end: "17:00" }] }
          : d,
      ),
    );
  }

  function removeInterval(dayIdx: number, intId: string) {
    setDays((prev) =>
      prev.map((d, idx) =>
        idx === dayIdx ? { ...d, intervals: d.intervals.filter((it) => it.id !== intId) } : d,
      ),
    );
  }

  function copyToAll(dayIdx: number) {
    const source = days[dayIdx].intervals;
    setDays((prev) =>
      prev.map((d, idx) =>
        idx === dayIdx
          ? d
          : { ...d, enabled: source.length > 0, intervals: source.map((it, i) => ({ ...it, id: `${idx}-copy-${i}` })) },
      ),
    );
    toast.success("Copied to all days");
  }

  function addOverride() {
    setOverrides((prev) => [...prev, { id: `o-${Date.now()}`, date: "", note: "" }]);
  }

  return (
    <>
      <DashboardTopbar
        title="Availability"
        description="Set your weekly hours and one-off exceptions."
        actions={<Button onClick={() => toast.success("Availability saved")}>Save changes</Button>}
      />
      <main className="flex-1 px-8 py-8">
        <div className="grid gap-8 fade-in lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <section className="rounded-xl border border-border bg-surface p-6 shadow-soft">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Schedule name</Label>
                  <Input id="name" value={scheduleName} onChange={(e) => setScheduleName(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>
            <section className="rounded-xl border border-border bg-surface shadow-soft">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-sm font-medium">Weekly hours</h2>
              </div>
              <ul className="divide-y divide-border">
                {days.map((d, i) => (
                  <li key={d.name} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-start">
                    <div className="flex w-40 shrink-0 items-center gap-3">
                      <Switch checked={d.enabled} onCheckedChange={(v) => toggleDay(i, v)} />
                      <span className={d.enabled ? "text-sm" : "text-sm text-muted-foreground"}>{d.name}</span>
                    </div>
                    <div className="flex-1">
                      {d.enabled ? (
                        <div className="grid gap-2">
                          {d.intervals.map((it) => (
                            <div key={it.id} className="flex items-center gap-2">
                              <Input type="time" value={it.start} onChange={(e) => updateInterval(i, it.id, "start", e.target.value)} className="w-32" />
                              <span className="text-xs text-muted-foreground">–</span>
                              <Input type="time" value={it.end} onChange={(e) => updateInterval(i, it.id, "end", e.target.value)} className="w-32" />
                              <Button variant="ghost" size="icon" onClick={() => removeInterval(i, it.id)} aria-label="Remove interval">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Unavailable</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {d.enabled ? (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => addInterval(i)} aria-label="Add interval">
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => copyToAll(i)} aria-label="Copy to all days">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <aside className="space-y-4">
            <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
              <h3 className="text-sm font-medium">Date overrides</h3>
              <div className="mt-4 space-y-3">
                {overrides.map((o) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <Input type="date" value={o.date} onChange={(e) => setOverrides((prev) => prev.map((x) => (x.id === o.id ? { ...x, date: e.target.value } : x)))} />
                    <Input value={o.note} placeholder="Reason" onChange={(e) => setOverrides((prev) => prev.map((x) => (x.id === o.id ? { ...x, note: e.target.value } : x)))} />
                  </div>
                ))}
                <Button variant="outline" onClick={addOverride}>
                  <Plus className="mr-1 h-4 w-4" /> Add override
                </Button>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
              <h3 className="text-sm font-medium">Preview this week</h3>
              <ul className="mt-3 space-y-2 text-xs">
                {days.filter((d) => d.enabled).map((d) => (
                  <li key={d.name} className="flex justify-between">
                    <span className="text-muted-foreground">{d.name}</span>
                    <span>{d.intervals.map((it) => `${it.start}–${it.end}`).join(", ")}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
