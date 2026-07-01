"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { takenUsernames } from "@/lib/mock/data";

const detectedTz =
  typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [timezone, setTimezone] = useState(detectedTz);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const usernameState = useMemo(() => {
    const v = username.trim().toLowerCase();
    if (!v) return "idle" as const;
    if (v.length < 3) return "short" as const;
    if (!/^[a-z0-9-]+$/.test(v)) return "invalid" as const;
    if (takenUsernames.has(v)) return "taken" as const;
    return "available" as const;
  }, [username]);

  const passwordValid = password.length >= 8;
  const canSubmit =
    name.trim() && email.trim() && passwordValid && usernameState === "available" && !loading;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setTimeout(() => router.push("/onboarding"), 600);
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free forever for one event type. No credit card required."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Sarah Chen" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="username">Choose your booking username</Label>
          <div className="flex items-stretch overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
            <span className="flex items-center bg-muted px-3 text-xs text-muted-foreground">syncslot.app/</span>
            <input
              id="username"
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your-name"
              autoComplete="off"
            />
            <span className="flex items-center pr-3">
              <UsernameBadge state={usernameState} />
            </span>
          </div>
          <UsernameHint state={usernameState} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tz">Timezone</Label>
          <Input id="tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          <p className="text-xs text-muted-foreground">We detected {detectedTz}. Edit if that&apos;s wrong.</p>
        </div>
        <Button type="submit" disabled={!canSubmit}>
          {loading ? "Creating your account…" : "Create account"}
        </Button>
      </form>
      <div className="relative my-6">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface px-3 text-xs uppercase tracking-widest text-muted-foreground">
          or
        </span>
      </div>
      <OAuthButtons disabled={loading} />
    </AuthShell>
  );
}

type UState = "idle" | "short" | "invalid" | "taken" | "available";

function UsernameBadge({ state }: { state: UState }) {
  if (state === "available") return <Check className="h-4 w-4 text-primary" />;
  if (state === "taken" || state === "invalid" || state === "short")
    return <X className="h-4 w-4 text-destructive" />;
  return null;
}

function UsernameHint({ state }: { state: UState }) {
  const map: Record<UState, string | null> = {
    idle: null,
    short: "At least 3 characters.",
    invalid: "Lowercase letters, numbers, and hyphens only.",
    taken: "That username is already taken.",
    available: "Nice — that's available.",
  };
  const msg = map[state];
  if (!msg) return null;
  return (
    <p className={"text-xs " + (state === "available" ? "text-primary" : "text-destructive")}>
      {msg}
    </p>
  );
}
