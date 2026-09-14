"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEMO_ACCOUNT,
  TRADE_TYPES,
  signIn,
  signUp,
  type TradeType,
} from "@/lib/api";
import { tradeTypeLabels } from "@/lib/labels";

/**
 * Sign-up and sign-in while the app runs on demo auth: real forms, real
 * validation, accounts kept in this browser. Swapped out automatically for
 * Supabase Auth UI the moment the environment variables are set.
 */
export function DemoAuthForm({ mode }: { mode: "sign_in" | "sign_up" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [tradeType, setTradeType] = useState<TradeType>("plumber");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"form" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy("form");
    setError(null);
    try {
      if (mode === "sign_up") {
        await signUp({
          name,
          business_name: businessName,
          trade_type: tradeType,
          email,
          password,
        });
      } else {
        await signIn({ email, password });
      }
      router.push("/dashboard");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Try again.",
      );
      setBusy(null);
    }
  }

  async function useDemoAccount() {
    setBusy("demo");
    setError(null);
    try {
      await signIn({
        email: DEMO_ACCOUNT.email,
        password: DEMO_ACCOUNT.password,
      });
      router.push("/dashboard");
    } catch {
      setError("Couldn't open the demo account.");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-4">
        {mode === "sign_up" ? (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="auth-name">Your name</Label>
              <Input
                id="auth-name"
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Dermot Kelly"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="auth-business">Business name</Label>
              <Input
                id="auth-business"
                autoComplete="organization"
                required
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder="Kelly Plumbing &amp; Heating"
              />
              <p className="text-muted-foreground text-xs">
                This is the name the AI answers the phone with.
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="auth-trade">Your trade</Label>
              <Select
                value={tradeType}
                onValueChange={(value) => setTradeType(value as TradeType)}
              >
                <SelectTrigger id="auth-trade" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRADE_TYPES.map((trade) => (
                    <SelectItem key={trade} value={trade}>
                      {tradeTypeLabels[trade]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}

        <div className="grid gap-1.5">
          <Label htmlFor="auth-email">Email</Label>
          <Input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.ie"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="auth-password">Password</Label>
          <Input
            id="auth-password"
            type="password"
            autoComplete={
              mode === "sign_up" ? "new-password" : "current-password"
            }
            required
            minLength={mode === "sign_up" ? 8 : undefined}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {mode === "sign_up" ? (
            <p className="text-muted-foreground text-xs">
              At least 8 characters.
            </p>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={busy !== null}>
          {busy === "form" ? <Loader2 className="animate-spin" /> : null}
          {mode === "sign_up" ? "Create account" : "Sign in"}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs">or</span>
        <span className="bg-border h-px flex-1" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={busy !== null}
        onClick={useDemoAccount}
      >
        {busy === "demo" ? <Loader2 className="animate-spin" /> : <Wand2 />}
        Use the demo account
      </Button>

      <p className="text-muted-foreground text-xs">
        Accounts are stored in this browser only, so you can use the dashboard
        before the Supabase project exists. Set{" "}
        <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and
        this screen becomes real Supabase Auth, with no other change.
      </p>
    </div>
  );
}
