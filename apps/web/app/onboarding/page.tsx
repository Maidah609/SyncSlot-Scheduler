"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { takenUsernames } from "@/lib/mock/data";

const detectedTz =
  typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("Sarah Chen");
  const [tz, setTz] = useState(detectedTz);
  const [username, setUsername] = useState("");
  const router = useRouter();

  const usernameState = useMemo(() => {
    const v = username.trim().toLowerCase();
    if (!v) return "idle" as const;
    if (v.length < 3) return "short" as const;
    if (!/^[a-z0-9-]+$/.test(v)) return "invalid" as const;
    if (takenUsernames.has(v)) return "taken" as const;
    return "available" as const;
  }, [username]);

  const progress = (step / 3) * 100;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Logo />
          <p className="text-xs text-muted-foreground">Step {step} of 3</p>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-6 py-14">
        <Progress value={progress} className="h-1" />
        <div className="mt-10 rounded-2xl border border-border bg-surface p-8 shadow-soft fade-in">
          {step === 1 && (
            <div className="grid gap-6">
              <div>
                <h1 className="font-display text-3xl">Welcome. Let&apos;s confirm your basics.</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  These show up on your booking page and drive when invitees can book you.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tz">Your timezone</Label>
                <Input id="tz" value={tz} onChange={(e) => setTz(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Invitees always see times in their own timezone — this sets yours so SyncSlot knows when you&apos;re free.
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!name.trim()}>
                  Continue <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-6">
              <div>
                <h1 className="font-display text-3xl">Pick your booking link.</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  This is the link you&apos;ll share with clients. You can change it later.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="u">Username</Label>
                <div className="flex items-stretch overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
                  <span className="flex items-center bg-muted px-3 text-xs text-muted-foreground">syncslot.app/</span>
                  <input
                    id="u"
                    className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="your-name"
                    autoComplete="off"
                  />
                </div>
                <UsernameHint state={usernameState} />
              </div>
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Preview</p>
                <p className="mt-1 font-mono text-foreground">
                  syncslot.app/<span className="text-primary">{username || "your-name"}</span>
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)} disabled={usernameState !== "available"}>
                  Continue <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-3xl">You&apos;re set, {name.split(" ")[0]}.</h1>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Your account is ready. Here&apos;s a gentle path to your first booking.
                </p>
              </div>
              <div className="grid gap-3 text-left">
                <NextStep n={1} title="Create your first event type" body="A 30-minute meeting is a good start." />
                <NextStep n={2} title="Set your availability" body="Pick the hours you&apos;re happy to be booked." />
                <NextStep n={3} title="Share your link" body={`Send syncslot.app/${username} to a client.`} />
              </div>
              <div className="flex justify-center">
                <Button asChild size="lg">
                  <Link href="/dashboard" onClick={() => router.push("/dashboard")}>
                    Go to dashboard <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NextStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-4">
      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
        {n}
      </span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

type UState = "idle" | "short" | "invalid" | "taken" | "available";
function UsernameHint({ state }: { state: UState }) {
  const map: Record<UState, { text: string; tone: "ok" | "err" } | null> = {
    idle: null,
    short: { text: "At least 3 characters.", tone: "err" },
    invalid: { text: "Lowercase letters, numbers, and hyphens only.", tone: "err" },
    taken: { text: "That username is already taken.", tone: "err" },
    available: { text: "Nice — that's available.", tone: "ok" },
  };
  const m = map[state];
  if (!m) return null;
  return (
    <p className={"flex items-center gap-1 text-xs " + (m.tone === "ok" ? "text-primary" : "text-destructive")}>
      {m.tone === "ok" ? <Check className="h-3 w-3" /> : null}
      {m.text}
    </p>
  );
}
