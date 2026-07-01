"use client";

import { useState } from "react";
import { ArrowUpRight, TrendingUp, Users, Calendar as CalIcon, PercentCircle } from "lucide-react";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const KPIS = [
  { icon: CalIcon, label: "Bookings", value: "148", delta: "+12%", tone: "up" as const },
  { icon: Users, label: "Unique invitees", value: "112", delta: "+9%", tone: "up" as const },
  { icon: PercentCircle, label: "Conversion", value: "38%", delta: "+2.1pp", tone: "up" as const },
  { icon: TrendingUp, label: "Avg. bookings / day", value: "4.9", delta: "−0.3", tone: "down" as const },
];

function series(seed: number, len: number, min: number, max: number) {
  const out: number[] = [];
  let x = seed;
  for (let i = 0; i < len; i++) {
    x = (x * 9301 + 49297) % 233280;
    out.push(min + Math.floor((x / 233280) * (max - min + 1)));
  }
  return out;
}

const BOOKINGS_SERIES = series(7, 30, 2, 9);
const CONVERSION_SERIES = series(19, 30, 22, 55);

export default function AnalyticsPage() {
  const [range, setRange] = useState("30");

  return (
    <>
      <DashboardTopbar
        title="Analytics"
        description="How your scheduling is trending — quietly, over time."
        actions={
          <>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">Export <ArrowUpRight className="ml-1 h-4 w-4" /></Button>
          </>
        }
      />

      <main className="flex-1 space-y-8 px-8 py-8">
        <section className="fade-in grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {KPIS.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="rounded-xl border border-border bg-surface p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-primary"><Icon className="h-4 w-4" /></span>
                  <span className={"text-xs " + (k.tone === "up" ? "text-primary" : "text-muted-foreground")}>{k.delta}</span>
                </div>
                <p className="mt-4 font-display text-3xl">{k.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{k.label}</p>
              </div>
            );
          })}
        </section>
        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <ChartCard title="Bookings over time" caption="Last 30 days"><BarChart data={BOOKINGS_SERIES} /></ChartCard>
          <ChartCard title="Conversion rate" caption="Visits → bookings"><LineChart data={CONVERSION_SERIES} /></ChartCard>
        </section>
      </main>
    </>
  );
}

function ChartCard({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">{title}</h2>
        <span className="text-xs text-muted-foreground">{caption}</span>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
function BarChart({ data }: { data: number[] }) {
  const max = Math.max(...data);
  return <div className="flex h-40 items-end gap-1.5">{data.map((v, i) => <div key={i} className="flex-1 rounded-t bg-primary/70 transition hover:bg-primary" style={{ height: `${(v / max) * 100}%` }} />)}</div>;
}
function LineChart({ data }: { data: number[] }) {
  const w = 300, h = 160;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 12) - 6}`).join(" ");
  return <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full text-primary" preserveAspectRatio="none"><polyline fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} /></svg>;
}
