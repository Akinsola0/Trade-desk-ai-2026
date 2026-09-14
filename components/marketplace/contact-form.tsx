"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  MessageCircle,
  Smartphone,
  Sparkles,
} from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import {
  LEAD_URGENCIES,
  MESSAGE_CHANNELS,
  createMarketplaceLead,
  type CreateMarketplaceLeadInput,
  type LeadUrgency,
  type MarketplaceProfile,
  type MessageChannel,
} from "@/lib/api";
import { leadUrgencyLabels, messageChannelLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

const channelIcons = { whatsapp: MessageCircle, sms: Smartphone };

/**
 * Everything the "find a tradesman" chat carries over via the query string
 * (see `components/marketplace/find-tradesman-chat.tsx`) — read once, used
 * to pre-fill the form below so a homeowner never repeats themselves.
 */
function useChatPrefill() {
  const params = useSearchParams();
  const issue = params.get("issue") ?? "";
  const eircode = params.get("eircode") ?? "";
  const dates = params.get("dates") ?? "";
  return { issue, eircode, dates, present: Boolean(issue || eircode || dates) };
}

/**
 * The homeowner's request. Posts through `createMarketplaceLead()`, which
 * creates a lead with `source = "marketplace"` — so it lands in that
 * tradesman's dashboard next to the calls the AI answered.
 */
export function ContactForm({ profile }: { profile: MarketplaceProfile }) {
  const prefill = useChatPrefill();
  const [form, setForm] = useState<CreateMarketplaceLeadInput>({
    business_id: profile.business_id,
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_address: prefill.eircode,
    service: profile.services[0]?.name ?? "",
    description: prefill.issue,
    urgency: /\b(asap|as soon as possible|emergency|today|now)\b/i.test(
      prefill.dates,
    )
      ? "urgent"
      : "routine",
    preferred_channel: "whatsapp",
    preferred_date_range: prefill.dates || undefined,
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ minutes: number } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      const result = await createMarketplaceLead(form);
      setSent({ minutes: result.expected_response_minutes });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong sending that. Try again in a moment.",
      );
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="border-ink/20 bg-hivis/35 rounded border p-5">
        <p className="text-ink flex items-center gap-2 font-semibold">
          <CheckCircle2 className="size-5" aria-hidden />
          Sent to {profile.business_name}
        </p>
        <p className="text-ink mt-2 text-sm">
          They usually reply within <strong>{sent.minutes} minutes</strong>.
          You&apos;ll get a {messageChannelLabels[form.preferred_channel]}{" "}
          message on {form.customer_phone} when they confirm a time — nothing is
          booked until then.
        </p>
        <p className="text-ink/80 mt-3 text-sm">
          In a hurry?{" "}
          <a
            href={`tel:${profile.phone}`}
            className="rounded font-medium underline underline-offset-4"
          >
            Ring them now
          </a>{" "}
          — their AI front desk answers day and night.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {prefill.present ? (
        <div className="bg-secondary/60 border-border flex items-start gap-2.5 rounded-lg border p-3 text-sm">
          <Sparkles
            className="text-primary mt-0.5 size-4 shrink-0"
            aria-hidden
          />
          <p className="text-muted-foreground">
            Filled in from what you told the chat — check it over and add your
            contact details below.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="contact-name">Your name</Label>
          <Input
            id="contact-name"
            required
            value={form.customer_name}
            onChange={(event) =>
              setForm({ ...form, customer_name: event.target.value })
            }
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="contact-phone">Mobile number</Label>
          <Input
            id="contact-phone"
            type="tel"
            inputMode="tel"
            required
            placeholder="087 123 4567"
            value={form.customer_phone}
            onChange={(event) =>
              setForm({ ...form, customer_phone: event.target.value })
            }
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="contact-email">
            Email <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="contact-email"
            type="email"
            value={form.customer_email}
            onChange={(event) =>
              setForm({ ...form, customer_email: event.target.value })
            }
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="contact-address">
            Address <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="contact-address"
            value={form.customer_address}
            onChange={(event) =>
              setForm({ ...form, customer_address: event.target.value })
            }
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="contact-service">What do you need done?</Label>
          <Select
            value={form.service}
            onValueChange={(value) => setForm({ ...form, service: value })}
          >
            <SelectTrigger id="contact-service" className="w-full">
              <SelectValue placeholder="Pick a job" />
            </SelectTrigger>
            <SelectContent>
              {profile.services.map((service) => (
                <SelectItem key={service.name} value={service.name}>
                  {service.name}
                </SelectItem>
              ))}
              <SelectItem value="Something else">Something else</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="contact-urgency">How urgent is it?</Label>
          <Select
            value={form.urgency}
            onValueChange={(value) =>
              setForm({ ...form, urgency: value as LeadUrgency })
            }
          >
            <SelectTrigger id="contact-urgency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_URGENCIES.map((urgency) => (
                <SelectItem key={urgency} value={urgency}>
                  {leadUrgencyLabels[urgency]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="contact-dates">
            Preferred dates{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="contact-dates"
            placeholder="e.g. This week, any afternoon"
            value={form.preferred_date_range ?? ""}
            onChange={(event) =>
              setForm({ ...form, preferred_date_range: event.target.value })
            }
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="contact-description">Tell them what&apos;s wrong</Label>
        <Textarea
          id="contact-description"
          required
          rows={4}
          placeholder="e.g. Water coming through the kitchen ceiling, mains turned off at the stopcock."
          value={form.description}
          onChange={(event) =>
            setForm({ ...form, description: event.target.value })
          }
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium">
          How should they confirm with you?
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {MESSAGE_CHANNELS.map((channel) => {
            const Icon = channelIcons[channel];
            const active = form.preferred_channel === channel;
            return (
              <label
                key={channel}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                  active
                    ? "border-primary bg-primary/5"
                    : "hover:bg-secondary/60",
                )}
              >
                <input
                  type="radio"
                  name="preferred_channel"
                  value={channel}
                  checked={active}
                  onChange={() =>
                    setForm({
                      ...form,
                      preferred_channel: channel as MessageChannel,
                    })
                  }
                  className="accent-primary size-4"
                />
                <Icon className="size-4" aria-hidden />
                <span className="text-sm font-medium">
                  {messageChannelLabels[channel]}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={sending}>
        {sending ? <Loader2 className="animate-spin" /> : null}
        Send this to {profile.business_name}
      </Button>

      <p className="text-muted-foreground text-xs">
        No account needed. Your number goes to this tradesman only — we
        don&apos;t sell it on to five others.
      </p>
    </form>
  );
}
