"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { SettingsTabs } from "@/components/dashboard/SettingsTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { demoHost } from "@/lib/mock/data";

const TIMEZONES = ["America/Los_Angeles", "America/New_York", "America/Chicago", "Europe/London", "Europe/Berlin", "Asia/Singapore"];

export default function ProfileSettings() {
  const [name, setName] = useState(demoHost.name);
  const [username, setUsername] = useState(demoHost.username);
  const [title, setTitle] = useState(demoHost.title);
  const [welcome, setWelcome] = useState(demoHost.welcome);
  const [timezone, setTimezone] = useState(demoHost.timezone);
  const [saving, setSaving] = useState(false);

  function save() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Profile updated");
    }, 500);
  }

  return (
    <>
      <DashboardTopbar title="Settings" description="Your public profile and account preferences." />
      <main className="flex-1 px-8 py-8">
        <div className="fade-in">
          <SettingsTabs />
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <section className="rounded-xl border border-border bg-surface p-6 shadow-soft">
                <h2 className="text-sm font-medium">Public profile</h2>
                <div className="mt-6 grid gap-5">
                  <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
                  <Field label="Username" hint={`syncslot.app/${username || "…"}`}>
                    <div className="flex items-stretch overflow-hidden rounded-md border border-input">
                      <span className="flex items-center bg-muted px-3 text-xs text-muted-foreground">syncslot.app/</span>
                      <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className="rounded-none border-0 focus-visible:ring-0" />
                    </div>
                  </Field>
                  <Field label="Headline"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
                  <Field label="Welcome message"><Textarea value={welcome} onChange={(e) => setWelcome(e.target.value)} className="min-h-[100px]" /></Field>
                </div>
              </section>
              <section className="rounded-xl border border-border bg-surface p-6 shadow-soft">
                <h2 className="text-sm font-medium">Preferences</h2>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <Field label="Timezone">
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </div>
              </section>
              <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button></div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div><div className="flex items-baseline justify-between"><Label className="text-sm">{label}</Label>{hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}</div><div className="mt-1.5">{children}</div></div>;
}
