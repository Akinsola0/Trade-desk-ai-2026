"use client";

import { useCallback, useState } from "react";
import { Loader2, MessageCircle, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
import { ErrorState, LoadingRows } from "@/components/dashboard/states";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAsync } from "@/hooks/use-async";
import {
  MESSAGE_CHANNELS,
  TRADE_TYPES,
  getBusiness,
  updateBusiness,
  type BusinessProfile,
  type MessageChannel,
  type TradeType,
  type UpdateBusinessInput,
} from "@/lib/api";
import { messageChannelLabels, tradeTypeLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** TODO(backend): confirm the zones you support. Ireland only for now. */
const TIMEZONES = ["Europe/Dublin", "Europe/London"];

const channelIcons = { whatsapp: MessageCircle, sms: Smartphone };

export default function SettingsPage() {
  const { data, error, loading, reload } = useAsync(
    useCallback(() => getBusiness(), []),
  );

  return (
    <>
      <PageHeader
        title="Business profile"
        description="What the AI says when it answers, and how your customers get their confirmation."
      />

      {error ? <ErrorState error={error} onRetry={reload} /> : null}
      {loading && !data ? <LoadingRows rows={4} /> : null}

      {/* Keyed on the business so the form state comes from the loaded row,
          without an effect syncing two copies of it. */}
      {data ? <BusinessForm key={data.id} business={data} /> : null}
    </>
  );
}

function BusinessForm({ business }: { business: BusinessProfile }) {
  const [form, setForm] = useState<UpdateBusinessInput>({
    name: business.name,
    phone: business.phone,
    timezone: business.timezone,
    trade_type: business.trade_type,
    confirmation_channel: business.confirmation_channel,
    confirmation_fallback: business.confirmation_fallback,
  });
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await updateBusiness(form);
      toast.success("Business profile saved");
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Couldn't save your profile",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Your business</CardTitle>
          <CardDescription>
            The AI introduces itself with this name and books work in this
            timezone.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="business-name">Business name</Label>
            <Input
              id="business-name"
              value={form.name}
              required
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="business-phone">Phone number</Label>
            <Input
              id="business-phone"
              type="tel"
              inputMode="tel"
              value={form.phone}
              required
              pattern="\+[0-9]{8,15}"
              aria-describedby="business-phone-help"
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
            />
            <p
              id="business-phone-help"
              className="text-muted-foreground text-xs"
            >
              In international format, e.g. +353871234567. This is the number
              you divert to us.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="business-trade">Trade</Label>
            <Select
              value={form.trade_type}
              onValueChange={(value) =>
                setForm({ ...form, trade_type: value as TradeType })
              }
            >
              <SelectTrigger id="business-trade" className="w-full">
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

          <div className="grid gap-1.5">
            <Label htmlFor="business-timezone">Timezone</Label>
            <Select
              value={form.timezone}
              onValueChange={(value) => setForm({ ...form, timezone: value })}
            >
              <SelectTrigger id="business-timezone" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Booking confirmations</CardTitle>
          <CardDescription>
            Most Irish customers read WhatsApp faster than SMS — pick the one
            you want the AI to try first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset>
            <legend className="sr-only">Confirmation channel</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {MESSAGE_CHANNELS.map((channel) => {
                const Icon = channelIcons[channel];
                const active = form.confirmation_channel === channel;
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
                      name="confirmation_channel"
                      value={channel}
                      checked={active}
                      onChange={() =>
                        setForm({
                          ...form,
                          confirmation_channel: channel as MessageChannel,
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

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div>
              <Label htmlFor="confirmation-fallback" className="text-sm">
                Fall back to the other channel
              </Label>
              <p className="text-muted-foreground mt-1 text-sm">
                If the first message can&apos;t be delivered — no WhatsApp
                account, for instance — send it on{" "}
                {form.confirmation_channel === "whatsapp" ? "SMS" : "WhatsApp"}{" "}
                instead.
              </p>
            </div>
            <Switch
              id="confirmation-fallback"
              checked={form.confirmation_fallback}
              onCheckedChange={(checked) =>
                setForm({ ...form, confirmation_fallback: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : null}
          Save changes
        </Button>
        <p className="text-muted-foreground text-sm">
          Changes apply to the next call the AI answers.
        </p>
      </div>
    </form>
  );
}
