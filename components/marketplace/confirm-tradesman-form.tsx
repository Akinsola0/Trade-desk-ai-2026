"use client";

import { useState } from "react";
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
  MESSAGE_CHANNELS,
  createMatchRequest,
  type CreateMatchRequestInput,
  type MarketplaceProfile,
  type MessageChannel,
} from "@/lib/api";
import { messageChannelLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

const channelIcons = { whatsapp: MessageCircle, sms: Smartphone };

/**
 * Replaces `ContactForm` on `/pro/[slug]` when arriving from the "find a
 * tradesman" chat's recommendation list — the homeowner already answered
 * the chat's questions, so this only asks for contact details and lets
 * them review/adjust the rest, then posts through `createMatchRequest()`.
 *
 * That's a different action from the plain callback form: it lands in the
 * tradesman's Requests inbox for an explicit accept/decline, and a decline
 * automatically offers the job to the next business on `fallbackSlugs`
 * (the chat's other recommendations) — see docs/api-contract.md.
 */
export function ConfirmTradesmanForm({
  profile,
  issue,
  eircode,
  dateRange,
  fallbackSlugs,
}: {
  profile: MarketplaceProfile;
  issue: string;
  eircode: string;
  dateRange: string;
  fallbackSlugs: string[];
}) {
  const [form, setForm] = useState<CreateMatchRequestInput>({
    business_id: profile.business_id,
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_address: eircode,
    service: profile.services[0]?.name ?? "",
    description: issue,
    preferred_date_range: dateRange || undefined,
    preferred_channel: "whatsapp",
    fallback_slugs: fallbackSlugs,
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      await createMatchRequest(form);
      setSent(true);
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
          Request sent to {profile.business_name}
        </p>
        <p className="text-ink mt-2 text-sm">
          They&apos;ll accept or let us know if they can&apos;t take it on —
          either way you&apos;ll hear back on{" "}
          {messageChannelLabels[form.preferred_channel]} at{" "}
          {form.customer_phone}. If they can&apos;t take it, we&apos;ll
          automatically check the next best match for you.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="bg-secondary/60 border-border flex items-start gap-2.5 rounded-lg border p-3 text-sm">
        <Sparkles className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
        <p className="text-muted-foreground">
          Confirming{" "}
          <span className="text-foreground font-medium">
            {profile.business_name}
          </span>{" "}
          for this job — filled in from what you told the chat. Add your contact
          details to send it across.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="confirm-name">Your name</Label>
          <Input
            id="confirm-name"
            required
            value={form.customer_name}
            onChange={(event) =>
              setForm({ ...form, customer_name: event.target.value })
            }
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="confirm-phone">Mobile number</Label>
          <Input
            id="confirm-phone"
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
          <Label htmlFor="confirm-email">
            Email <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="confirm-email"
            type="email"
            value={form.customer_email}
            onChange={(event) =>
              setForm({ ...form, customer_email: event.target.value })
            }
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="confirm-address">Eircode / area</Label>
          <Input
            id="confirm-address"
            value={form.customer_address}
            onChange={(event) =>
              setForm({ ...form, customer_address: event.target.value })
            }
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="confirm-service">Service</Label>
          <Select
            value={form.service}
            onValueChange={(value) => setForm({ ...form, service: value })}
          >
            <SelectTrigger id="confirm-service" className="w-full">
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
          <Label htmlFor="confirm-dates">
            Preferred dates{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="confirm-dates"
            placeholder="e.g. This week, any afternoon"
            value={form.preferred_date_range ?? ""}
            onChange={(event) =>
              setForm({ ...form, preferred_date_range: event.target.value })
            }
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="confirm-description">What&apos;s going on</Label>
        <Textarea
          id="confirm-description"
          required
          rows={4}
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
        Confirm {profile.business_name}
      </Button>

      <p className="text-muted-foreground text-xs">
        No account needed. If they can&apos;t take this job on, we&apos;ll
        automatically offer it to the next best match instead of leaving you
        waiting.
      </p>
    </form>
  );
}
