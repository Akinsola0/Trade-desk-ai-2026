"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { CallOutcomeBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CALL_OUTCOMES,
  reclassifyCall,
  type CallListItem,
  type CallOutcome,
} from "@/lib/api";
import { callOutcomeLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

const outcomeHelp: Record<CallOutcome, string> = {
  booked: "A real job that ended up in the calendar.",
  lead_only: "A real customer, but nothing was booked.",
  callback_required: "Needs you to ring them back.",
  spam: "Sales call, robocall or a wrong number.",
  failed: "The call dropped or a tool broke mid-booking.",
};

/**
 * Correcting the AI. The original classification is kept — the correction is
 * stored beside it so the AI team can measure how often this happens.
 */
export function ReclassifyCallDialog({
  call,
  open,
  onOpenChange,
  onUpdated,
}: {
  call: CallListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (call: CallListItem) => void;
}) {
  if (!call) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Keyed on the call so the radio group starts from that call's outcome. */}
      <ReclassifyForm
        key={call.id}
        call={call}
        onOpenChange={onOpenChange}
        onUpdated={onUpdated}
      />
    </Dialog>
  );
}

function ReclassifyForm({
  call,
  onOpenChange,
  onUpdated,
}: {
  call: CallListItem;
  onOpenChange: (open: boolean) => void;
  onUpdated: (call: CallListItem) => void;
}) {
  const [outcome, setOutcome] = useState<CallOutcome>(
    call.corrected_outcome ?? call.outcome,
  );
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const updated = await reclassifyCall({
        call_id: call.id,
        outcome,
        note: note.trim() || undefined,
      });
      onUpdated(updated);
      toast.success(
        updated.corrected_outcome
          ? `Call marked ${callOutcomeLabels[updated.corrected_outcome].toLowerCase()}`
          : "Correction removed — back to what the AI decided",
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't save the correction",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Correct this call</DialogTitle>
        <DialogDescription>
          The AI marked it{" "}
          <strong>{callOutcomeLabels[call.outcome].toLowerCase()}</strong>. Tell
          us what it actually was — the lead comes back into your list and the
          correction is used to improve the answering.
        </DialogDescription>
      </DialogHeader>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">
          What was it really?
        </legend>
        {CALL_OUTCOMES.map((item) => (
          <label
            key={item}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
              outcome === item
                ? "border-primary bg-primary/5"
                : "hover:bg-secondary/60",
            )}
          >
            <input
              type="radio"
              name="outcome"
              value={item}
              checked={outcome === item}
              onChange={() => setOutcome(item)}
              className="accent-primary mt-1 size-4"
            />
            <span>
              <span className="flex items-center gap-2 text-sm font-medium">
                {callOutcomeLabels[item]}
                {item === call.outcome ? (
                  <span className="text-muted-foreground text-xs font-normal">
                    what the AI said
                  </span>
                ) : null}
              </span>
              <span className="text-muted-foreground block text-sm">
                {outcomeHelp[item]}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="grid gap-1.5">
        <Label htmlFor="reclassify-note">
          What did it miss?{" "}
          <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="reclassify-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="e.g. she gave the address at the end of the call, it wasn't a sales call."
        />
      </div>

      <DialogFooter className="sm:items-center sm:justify-between">
        <span className="text-muted-foreground text-sm">
          Now:{" "}
          <CallOutcomeBadge
            outcome={call.corrected_outcome ?? call.outcome}
            corrected={Boolean(call.corrected_outcome)}
          />
        </span>
        <span className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            Save correction
          </Button>
        </span>
      </DialogFooter>
    </DialogContent>
  );
}
