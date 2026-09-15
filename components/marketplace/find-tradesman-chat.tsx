"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Mic, Sparkles, Square } from "lucide-react";

import { ListingCard } from "@/components/marketplace/listing-card";
import { iconForCategory } from "@/components/marketplace/photo-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { cn } from "@/lib/utils";
import {
  recommendTradespeople,
  type MarketplaceCategory,
  type MarketplaceListing,
  type TradeType,
} from "@/lib/api";
import { tradeTypeLabels } from "@/lib/labels";

type Step =
  | "trade-confirm"
  | "redirect"
  | "issue"
  | "eircode"
  | "when"
  | "confirm"
  | "loading"
  | "results";

const TIME_SLOTS = ["Morning", "Afternoon", "Evening"] as const;
type TimeSlot = (typeof TIME_SLOTS)[number];

interface ChatMessage {
  from: "bot" | "user";
  text: string;
}

/**
 * The bot's "face" — a glossy gradient sphere in the brand orange, not a
 * headshot. A small off-centre highlight fakes the glossy-sphere look
 * without an actual 3D render. `pulse` marks the moments the AI is
 * "thinking" between turns (matching prop on the loading-state avatar).
 */
function AiAvatar({
  className,
  pulse = false,
}: {
  className?: string;
  pulse?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full",
        "bg-[radial-gradient(circle_at_32%_28%,#ffb27a_0%,#e8590c_45%,#8a2c05_100%)]",
        "shadow-[0_0_0_1px_rgba(199,63,8,0.15),0_0_14px_2px_rgba(199,63,8,0.35)]",
        pulse && "animate-pulse",
        className,
      )}
    >
      <div className="absolute -top-1/4 -left-1/4 size-1/2 rounded-full bg-white/40 blur-[3px]" />
    </div>
  );
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** "Today" / "Tomorrow" / "Tue 16 Sep" — and "Today"/"Tomorrow" double as the
 *  urgency signal `recommendTradespeople` already looks for in date_range. */
function formatDateLabel(dateISO: string): string {
  const chosen = new Date(dateISO + "T00:00:00");
  const today = new Date(todayISO() + "T00:00:00");
  const diffDays = Math.round(
    (chosen.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return chosen.toLocaleDateString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * A guided, scripted conversation — not a real language model. It greets,
 * confirms the trade this page is already scoped to, then asks one question
 * at a time (issue, Eircode, a date + time slot), before scoring this
 * category/location's listings via `recommendTradespeople()` and showing
 * the top 5. See docs/VISUAL_TOUR.md and docs/api-contract.md for why this
 * is scripted rather than a live AI call: the project has no backend/model
 * wired up yet, and this reads as a real assistant without pretending to
 * understand free text it can't.
 */
export function FindTradesmanChat({
  category,
  location,
  town,
  categories,
  onResultsChange,
}: {
  category: TradeType;
  location: string;
  town: string;
  categories: MarketplaceCategory[];
  /** Told when the recommendation list appears/disappears, so the page can
   *  hide the plain filtered list while the chat's own results are shown. */
  onResultsChange?: (hasResults: boolean) => void;
}) {
  const label = tradeTypeLabels[category].toLowerCase();

  function openingMessages(): ChatMessage[] {
    return [
      { from: "bot", text: "Hi, I'm TradeDesk AI 👋" },
      {
        from: "bot",
        text: `Looks like you're after a ${label} in ${town} — is that right?`,
      },
    ];
  }

  const [step, setStep] = useState<Step>("trade-confirm");
  const [messages, setMessages] = useState<ChatMessage[]>(openingMessages());
  const [issue, setIssue] = useState("");
  const [eircode, setEircode] = useState("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [dateLabel, setDateLabel] = useState("");
  const [draft, setDraft] = useState("");
  const [results, setResults] = useState<MarketplaceListing[] | null>(null);

  const speech = useSpeechToText(setDraft);

  function pushBot(text: string) {
    setMessages((current) => [...current, { from: "bot", text }]);
  }

  function pushUser(text: string) {
    setMessages((current) => [...current, { from: "user", text }]);
  }

  function confirmTrade() {
    pushUser("Yes, that's right");
    pushBot("Great — tell me what's going on.");
    setStep("issue");
  }

  function declineTrade() {
    pushUser("Something else");
    pushBot("No bother — you can browse every trade from here.");
    setStep("redirect");
  }

  function submitIssue() {
    const text = draft.trim();
    if (!text) return;
    if (speech.listening) speech.stop();
    setIssue(text);
    pushUser(text);
    setDraft("");
    pushBot("Got it. What's your Eircode (or just your townland/area)?");
    setStep("eircode");
  }

  function submitEircode() {
    const text = draft.trim();
    if (!text) return;
    if (speech.listening) speech.stop();
    setEircode(text);
    pushUser(text);
    setDraft("");
    pushBot("And when would suit you best?");
    setStep("when");
  }

  function submitWhen() {
    if (!date || !slot) return;
    const label = formatDateLabel(date);
    const combined = `${label}, ${slot.toLowerCase()}`;
    setDateLabel(combined);
    pushUser(combined);
    pushBot(
      `Looking for ${tradeTypeLabels[category].toLowerCase()}s near ${eircode || town} who can do that ${combined.toLowerCase()}. Ready when you are.`,
    );
    setStep("confirm");
  }

  async function findMatches() {
    setStep("loading");
    const matches = await recommendTradespeople({
      category,
      location,
      issue_description: issue,
      eircode,
      date_range: dateLabel,
    });
    setResults(matches);
    setStep("results");
    onResultsChange?.(true);
  }

  function reset() {
    setStep("trade-confirm");
    setMessages(openingMessages());
    setIssue("");
    setEircode("");
    setDate("");
    setSlot(null);
    setDateLabel("");
    setDraft("");
    setResults(null);
    onResultsChange?.(false);
  }

  function submitDraft() {
    if (step === "issue") submitIssue();
    else if (step === "eircode") submitEircode();
  }

  /**
   * Every result's link carries the chat's answers, plus the *other*
   * recommended businesses (this one excluded, order preserved) as
   * `fallback` — so if the homeowner confirms this one and it gets
   * declined, `respondToMatchRequest` knows who to offer the job to next.
   */
  function buildPrefillSuffix(currentSlug: string): string {
    const fallbackSlugs = (results ?? [])
      .map((listing) => listing.slug)
      .filter((slug) => slug !== currentSlug);
    const params = new URLSearchParams({
      issue,
      eircode,
      dates: dateLabel,
    });
    if (fallbackSlugs.length > 0) {
      params.set("fallback", fallbackSlugs.join(","));
    }
    return `?${params.toString()}`;
  }

  return (
    <Card className="mb-6 gap-0 overflow-hidden py-0">
      <CardContent className="p-0">
        <div className="band-dark flex items-center gap-2.5 px-5 py-4">
          <AiAvatar className="size-8" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">TradeDesk AI</p>
            <p className="text-xs text-white/70">
              Finds the right {label} for the job
            </p>
          </div>
        </div>

        <div className="space-y-3 px-5 py-5">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex items-end gap-2",
                message.from === "user" ? "justify-end" : "justify-start",
              )}
            >
              {message.from === "bot" ? <AiAvatar className="size-6" /> : null}
              <p
                className={cn(
                  "max-w-[80%] rounded-3xl px-4 py-2.5 text-sm leading-relaxed",
                  message.from === "user"
                    ? "bg-[linear-gradient(135deg,#e8590c,#a8330a)] text-white shadow-sm"
                    : "bg-secondary text-foreground",
                )}
              >
                {message.text}
              </p>
            </div>
          ))}

          {step === "loading" ? (
            <div className="flex items-end gap-2">
              <AiAvatar className="size-6" pulse />
              <p className="bg-secondary text-muted-foreground flex items-center gap-2 rounded-3xl px-4 py-2.5 text-sm">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Matching you with {label}s in {town}…
              </p>
            </div>
          ) : null}

          {step === "results" && results ? (
            <div className="space-y-3 pt-1">
              <p className="text-muted-foreground text-sm">
                {results.length > 0
                  ? "Here's who I'd recommend, best fit first — pick one to send your details across."
                  : "Nobody matches exactly right now — try again with different details."}
              </p>
              {results.length > 0 ? (
                <ul className="space-y-3">
                  {results.map((listing, index) => (
                    <li key={listing.slug}>
                      <ListingCard
                        listing={listing}
                        icon={iconForCategory(listing.categories, categories)}
                        hrefSuffix={buildPrefillSuffix(listing.slug)}
                        dark={index % 2 === 1}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
              <Button type="button" variant="outline" size="sm" onClick={reset}>
                Start over
              </Button>
            </div>
          ) : null}
        </div>

        {step === "trade-confirm" ? (
          <div className="flex flex-wrap gap-2 border-t px-5 py-4">
            <Button type="button" size="sm" onClick={confirmTrade}>
              Yes, that&apos;s right
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={declineTrade}
            >
              Something else
            </Button>
          </div>
        ) : null}

        {step === "redirect" ? (
          <div className="border-t px-5 py-4">
            <Button asChild size="sm">
              <Link href="/find">Browse every trade</Link>
            </Button>
          </div>
        ) : null}

        {step === "issue" || step === "eircode" ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitDraft();
            }}
            className="border-t px-5 py-4"
          >
            {step === "issue" ? (
              <div className="border-input focus-within:border-ring focus-within:ring-ring/40 rounded-3xl border bg-white shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]">
                <Textarea
                  autoFocus
                  rows={2}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="e.g. Boiler's making a banging noise and the upstairs radiators are cold"
                  className="resize-none border-0 shadow-none focus-visible:ring-0"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      submitDraft();
                    }
                  }}
                />
                <div className="flex items-center justify-end gap-1.5 px-2 pb-2">
                  {speech.isSupported ? (
                    <Button
                      type="button"
                      size="icon"
                      variant={speech.listening ? "default" : "ghost"}
                      className="size-9 shrink-0"
                      onClick={() =>
                        speech.listening ? speech.stop() : speech.start()
                      }
                      aria-label={
                        speech.listening
                          ? "Stop voice input"
                          : "Use voice input"
                      }
                      aria-pressed={speech.listening}
                    >
                      {speech.listening ? <Square /> : <Mic />}
                    </Button>
                  ) : null}
                  <Button
                    type="submit"
                    size="icon"
                    className="size-9 shrink-0"
                    disabled={!draft.trim()}
                    aria-label="Send"
                  >
                    <ArrowRight />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-input focus-within:border-ring focus-within:ring-ring/40 flex items-center gap-1 rounded-full border bg-white py-1.5 pr-1.5 pl-4 shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]">
                <Input
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="e.g. W91 X2R0"
                  className="h-8 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
                {speech.isSupported ? (
                  <Button
                    type="button"
                    size="icon"
                    variant={speech.listening ? "default" : "ghost"}
                    className="size-9 shrink-0"
                    onClick={() =>
                      speech.listening ? speech.stop() : speech.start()
                    }
                    aria-label={
                      speech.listening ? "Stop voice input" : "Use voice input"
                    }
                    aria-pressed={speech.listening}
                  >
                    {speech.listening ? <Square /> : <Mic />}
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  size="icon"
                  className="size-9 shrink-0"
                  disabled={!draft.trim()}
                  aria-label="Send"
                >
                  <ArrowRight />
                </Button>
              </div>
            )}
            {speech.listening ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Listening… speak now, then press send.
              </p>
            ) : null}
          </form>
        ) : null}

        {step === "when" ? (
          <div className="space-y-3 border-t px-5 py-4">
            <input
              type="date"
              value={date}
              min={todayISO()}
              onChange={(event) => setDate(event.target.value)}
              className="border-input h-10 w-full rounded-2xl border bg-transparent px-3 text-sm"
              aria-label="Preferred date"
            />
            <div className="flex flex-wrap gap-2">
              {TIME_SLOTS.map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={slot === option ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSlot(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              disabled={!date || !slot}
              onClick={submitWhen}
            >
              Confirm
            </Button>
          </div>
        ) : null}

        {step === "confirm" ? (
          <div className="border-t px-5 py-4">
            <Button type="button" onClick={findMatches}>
              <Sparkles />
              Find my {label}s
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
