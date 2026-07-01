"use client";

import { useState } from "react";
import { Calendar, Check, Copy, Plus, Video, Webhook } from "lucide-react";
import { toast } from "sonner";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Integration = {
  id: string;
  name: string;
  description: string;
  category: "calendar" | "video";
  connected: boolean;
  primary?: boolean;
};

const INITIAL: Integration[] = [
  { id: "google-cal", name: "Google Calendar", description: "Two-way sync for busy times and event creation.", category: "calendar", connected: true, primary: true },
  { id: "outlook", name: "Microsoft Outlook", description: "Sync with Outlook and Microsoft 365 calendars.", category: "calendar", connected: false },
  { id: "icloud", name: "Apple iCloud", description: "Check for conflicts on your iCloud calendar.", category: "calendar", connected: false },
  { id: "google-meet", name: "Google Meet", description: "Auto-generate Meet links for confirmed bookings.", category: "video", connected: true, primary: true },
  { id: "zoom", name: "Zoom", description: "Create unique Zoom links for each booking.", category: "video", connected: false },
  { id: "teams", name: "Microsoft Teams", description: "Generate Teams meeting links automatically.", category: "video", connected: false },
];

export default function IntegrationsPage() {
  const [items, setItems] = useState<Integration[]>(INITIAL);
  const [webhooks, setWebhooks] = useState<{ id: string; url: string }[]>([
    { id: "w1", url: "https://hooks.example.com/syncslot" },
  ]);
  const [newHook, setNewHook] = useState("");

  function toggle(id: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, connected: !it.connected } : it)));
    const target = items.find((i) => i.id === id);
    toast.success(target?.connected ? `${target.name} disconnected` : `${target?.name} connected`);
  }

  function addWebhook() {
    if (!newHook.trim()) return;
    setWebhooks((prev) => [...prev, { id: `w-${Date.now()}`, url: newHook.trim() }]);
    setNewHook("");
    toast.success("Webhook added");
  }

  const calendars = items.filter((i) => i.category === "calendar");
  const videos = items.filter((i) => i.category === "video");

  return (
    <>
      <DashboardTopbar title="Integrations" description="Connect calendars, video tools, and outgoing webhooks." />
      <main className="flex-1 px-8 py-8">
        <div className="space-y-8 fade-in">
          <Section icon={<Calendar className="h-4 w-4" />} title="Calendars" description="Check for conflicts and create events.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {calendars.map((it) => <IntegrationCard key={it.id} item={it} onToggle={() => toggle(it.id)} />)}
            </div>
          </Section>
          <Section icon={<Video className="h-4 w-4" />} title="Video conferencing" description="Auto-generate meeting links.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((it) => <IntegrationCard key={it.id} item={it} onToggle={() => toggle(it.id)} />)}
            </div>
          </Section>
          <Section icon={<Webhook className="h-4 w-4" />} title="Webhooks" description="Send booking events to your own endpoints.">
            <div className="rounded-xl border border-border bg-surface shadow-soft">
              <ul className="divide-y divide-border">
                {webhooks.map((w) => (
                  <li key={w.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <code className="flex-1 truncate text-xs text-muted-foreground">{w.url}</code>
                    <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard?.writeText(w.url); toast.success("Copied"); }}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2 border-t border-border p-3">
                <Input placeholder="https://your-app.com/webhooks/syncslot" value={newHook} onChange={(e) => setNewHook(e.target.value)} />
                <Button onClick={addWebhook}><Plus className="mr-1 h-4 w-4" /> Add</Button>
              </div>
            </div>
          </Section>
        </div>
      </main>
    </>
  );
}

function Section({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="text-sm font-medium">{title}</h2>
        <span className="text-xs text-muted-foreground">— {description}</span>
      </div>
      {children}
    </section>
  );
}

function IntegrationCard({ item, onToggle }: { item: Integration; onToggle: () => void }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium">{item.name}</p>
          {item.primary && item.connected ? <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary"><Check className="h-3 w-3" /> Primary</span> : null}
        </div>
        <span className={`h-2 w-2 rounded-full ${item.connected ? "bg-primary" : "bg-muted-foreground/30"}`} />
      </div>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
      <div className="mt-4">
        <Button variant={item.connected ? "outline" : "default"} size="sm" onClick={onToggle} className="w-full">
          {item.connected ? "Disconnect" : "Connect"}
        </Button>
      </div>
    </div>
  );
}
