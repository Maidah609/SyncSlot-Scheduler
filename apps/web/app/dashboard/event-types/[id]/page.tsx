"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { demoHost, type CustomQuestion, type EventType } from "@/lib/mock/data";

export default function EventTypeEditor() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const existing = demoHost.eventTypes.find((e) => e.id === params.id);
  const isNew = !existing;

  const [et, setEt] = useState<EventType>(
    existing ?? {
      id: "new",
      slug: "new-meeting",
      title: "New meeting",
      duration: 30,
      description: "",
      location: "google-meet",
      color: "teal",
      active: true,
      scheduleName: "Standard hours",
      questions: [],
      cancellationPolicy: "",
      bufferBefore: 0,
      bufferAfter: 0,
      minNoticeHours: 4,
      maxFutureDays: 45,
      dailyLimit: null,
      weeklyLimit: null,
    },
  );

  function set<K extends keyof EventType>(key: K, value: EventType[K]) {
    setEt((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    toast.success(isNew ? "Event type created" : "Changes saved");
    router.push("/dashboard/event-types");
  }

  return (
    <>
      <DashboardTopbar
        title={isNew ? "Create event type" : et.title}
        description={<span className="font-mono">syncslot.app/{demoHost.username}/{et.slug || "…"}</span>}
        actions={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={et.active} onCheckedChange={(v) => set("active", v)} />
              {et.active ? "Active" : "Inactive"}
            </label>
            <Button variant="ghost" asChild>
              <Link href="/dashboard/event-types">
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Link>
            </Button>
            <Button onClick={save}>Save changes</Button>
          </div>
        }
      />
      <main className="flex-1 space-y-8 px-8 py-8">
        <Section title="Basic details" description="What invitees see when they open this event type.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title" htmlFor="title">
              <Input id="title" value={et.title} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <Field label="URL slug" htmlFor="slug">
              <Input id="slug" value={et.slug} onChange={(e) => set("slug", e.target.value)} />
            </Field>
            <Field label="Duration" htmlFor="duration">
              <Select value={String(et.duration)} onValueChange={(v) => set("duration", Number(v))}>
                <SelectTrigger id="duration"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[15, 20, 30, 45, 60, 90].map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} minutes</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Color tag" htmlFor="color">
              <div id="color" className="flex gap-2">
                {["teal", "stone", "clay", "sand"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("color", c)}
                    className={
                      "h-8 w-8 rounded-full border transition " +
                      (et.color === c ? "ring-2 ring-primary/60 ring-offset-2 ring-offset-background" : "")
                    }
                    style={{
                      background:
                        c === "teal" ? "#6E9695" : c === "stone" ? "#B7B2A6" : c === "clay" ? "#C0846A" : "#D6C7A7",
                      borderColor: "rgba(44,62,62,0.1)",
                    }}
                    aria-label={c}
                  />
                ))}
              </div>
            </Field>
            <Field label="Description" htmlFor="desc" className="md:col-span-2">
              <Textarea
                id="desc"
                rows={3}
                value={et.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="What is this meeting for?"
              />
            </Field>
          </div>
        </Section>

        <Section title="Location" description="Where the meeting will happen.">
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
            {(["zoom", "google-meet", "phone", "in-person", "custom"] as const).map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => set("location", loc)}
                className={
                  "rounded-lg border px-4 py-3 text-left text-sm transition " +
                  (et.location === loc
                    ? "border-primary/60 bg-primary/5"
                    : "border-border hover:border-primary/30")
                }
              >
                <p className="font-medium capitalize">{loc.replace("-", " ")}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {loc === "custom" ? "You&apos;ll add a link" : "Auto-generated"}
                </p>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Booking rules" description="Guardrails that shape when you can be booked.">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Buffer before (min)" htmlFor="bb">
              <Input id="bb" type="number" value={et.bufferBefore} onChange={(e) => set("bufferBefore", Number(e.target.value))} />
            </Field>
            <Field label="Buffer after (min)" htmlFor="ba">
              <Input id="ba" type="number" value={et.bufferAfter} onChange={(e) => set("bufferAfter", Number(e.target.value))} />
            </Field>
            <Field label="Minimum notice (hours)" htmlFor="mn">
              <Input id="mn" type="number" value={et.minNoticeHours} onChange={(e) => set("minNoticeHours", Number(e.target.value))} />
            </Field>
            <Field label="Max future booking (days)" htmlFor="mx">
              <Input id="mx" type="number" value={et.maxFutureDays} onChange={(e) => set("maxFutureDays", Number(e.target.value))} />
            </Field>
            <Field label="Daily booking limit" htmlFor="dl">
              <Input
                id="dl"
                type="number"
                value={et.dailyLimit ?? ""}
                placeholder="No limit"
                onChange={(e) => set("dailyLimit", e.target.value ? Number(e.target.value) : null)}
              />
            </Field>
            <Field label="Weekly booking limit" htmlFor="wl">
              <Input
                id="wl"
                type="number"
                value={et.weeklyLimit ?? ""}
                placeholder="No limit"
                onChange={(e) => set("weeklyLimit", e.target.value ? Number(e.target.value) : null)}
              />
            </Field>
          </div>
        </Section>

        <Section title="Availability" description="Which schedule this event type follows.">
          <Field label="Schedule" htmlFor="sched">
            <Select value={et.scheduleName} onValueChange={(v) => set("scheduleName", v)}>
              <SelectTrigger id="sched" className="max-w-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Standard hours", "Weekday mornings", "Afternoons only"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </Section>

        <Section title="Custom booking questions" description="What you'd like to know before the meeting.">
          <QuestionsEditor questions={et.questions} onChange={(q) => set("questions", q)} />
        </Section>

        <Section title="Cancellation policy" description="Shown on the booking and confirmation pages.">
          <Textarea
            rows={3}
            value={et.cancellationPolicy}
            onChange={(e) => set("cancellationPolicy", e.target.value)}
            placeholder="e.g. Please reschedule at least 24 hours in advance."
          />
        </Section>

        <div className="flex items-center justify-between border-t border-border pt-6">
          <Button variant="ghost" className="text-destructive hover:text-destructive">
            <Trash2 className="mr-1 h-4 w-4" /> Delete event type
          </Button>
          <div className="flex gap-2">
            <Button variant="outline">Duplicate</Button>
            <Button onClick={save}>Save changes</Button>
          </div>
        </div>
      </main>
    </>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-soft">
      <div className="mb-5">
        <h2 className="font-display text-xl">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Field({ label, htmlFor, children, className }: { label: string; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={"grid gap-1.5 " + (className ?? "")}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function QuestionsEditor({ questions, onChange }: { questions: CustomQuestion[]; onChange: (q: CustomQuestion[]) => void }) {
  function add() {
    onChange([
      ...questions,
      { id: crypto.randomUUID(), label: "New question", type: "text", required: false },
    ]);
  }
  function update(id: string, patch: Partial<CustomQuestion>) {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }
  function remove(id: string) {
    onChange(questions.filter((q) => q.id !== id));
  }
  return (
    <div className="grid gap-3">
      {questions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          No custom questions yet.
        </p>
      ) : null}
      {questions.map((q) => (
        <div key={q.id} className="rounded-lg border border-border p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <Input value={q.label} onChange={(e) => update(q.id, { label: e.target.value })} placeholder="Question" />
            <Select value={q.type} onValueChange={(v) => update(q.id, { type: v as CustomQuestion["type"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Short text</SelectItem>
                <SelectItem value="multiple-choice">Multiple choice</SelectItem>
                <SelectItem value="yes-no">Yes / No</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center justify-end gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={q.required} onCheckedChange={(v) => update(q.id, { required: v })} />
                Required
              </label>
              <Button variant="ghost" size="icon" onClick={() => remove(q.id)} aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {q.type === "multiple-choice" ? (
            <div className="mt-3">
              <Label className="text-xs text-muted-foreground">Options (one per line)</Label>
              <Textarea
                className="mt-1"
                rows={3}
                value={(q.options ?? []).join("\n")}
                onChange={(e) => update(q.id, { options: e.target.value.split("\n").filter(Boolean) })}
              />
            </div>
          ) : null}
        </div>
      ))}
      <Button variant="outline" onClick={add} className="w-fit">
        <Plus className="mr-1 h-4 w-4" /> Add question
      </Button>
    </div>
  );
}
