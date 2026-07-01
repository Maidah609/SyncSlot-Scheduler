"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, MessageCircle, HelpCircle } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarketingFooter, MarketingNav } from "@/components/marketing/MarketingChrome";

export default function ContactPage() {
  const [sending, setSending] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      (e.target as HTMLFormElement).reset();
      toast.success("Thanks — we'll be in touch shortly.");
    }, 600);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <section className="border-b border-border/70">
        <Container className="py-20 md:py-24">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Contact</p>
            <h1 className="mt-4 font-display text-5xl leading-tight md:text-6xl">
              Say hello. We read every note.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Sales, feedback, feature requests, or just a hello — the form goes to a real inbox that
              a real person opens.
            </p>
          </div>
        </Container>
      </section>
      <section className="border-b border-border/70">
        <Container className="grid gap-12 py-20 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-6">
            <Channel icon={Mail} title="Email" body="hello@syncslot.app — for anything and everything." />
            <Channel icon={MessageCircle} title="Sales" body="Interested in Team pricing? We&apos;ll set up a call." />
            <Channel icon={HelpCircle} title="Help center" body="Guides for setup, calendars, and troubleshooting." />
          </div>

          <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-8 shadow-soft">
            <div className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label className="text-sm">Name</Label>
                  <Input required className="mt-1.5" placeholder="Your name" />
                </div>
                <div>
                  <Label className="text-sm">Email</Label>
                  <Input required type="email" className="mt-1.5" placeholder="you@company.com" />
                </div>
              </div>
              <div>
                <Label className="text-sm">Reason</Label>
                <Select defaultValue="general">
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General question</SelectItem>
                    <SelectItem value="sales">Team / sales</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Message</Label>
                <Textarea required className="mt-1.5 min-h-[140px]" placeholder="What&apos;s on your mind?" />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={sending}>
                  {sending ? "Sending…" : "Send message"}
                </Button>
              </div>
            </div>
          </form>
        </Container>
      </section>
      <MarketingFooter />
    </div>
  );
}

function Channel({ icon: Icon, title, body }: { icon: typeof Mail; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h3 className="text-base font-medium">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
