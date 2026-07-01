"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 500);
  }

  return (
    <AuthShell
      title={sent ? "Check your inbox" : "Reset your password"}
      subtitle={
        sent
          ? "If an account exists for that email, we've sent a reset link."
          : "Enter your email and we'll send a reset link."
      }
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Back to log in
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
          A reset link is on its way to <span className="font-medium">{email}</span>.
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
