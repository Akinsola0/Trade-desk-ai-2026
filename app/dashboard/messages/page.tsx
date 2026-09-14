"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  MessageCircle,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
} from "@/components/dashboard/states";
import { MessageStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAsync } from "@/hooks/use-async";
import {
  getMessages,
  retryMessage,
  type MessageChannel,
  type MessageListItem,
} from "@/lib/api";
import { formatDateTime, formatPhone } from "@/lib/format";
import { messageChannelLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

function MessagesView() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("message");
  const [retrying, setRetrying] = useState<string | null>(null);

  const { data, error, loading, reload, setData } = useAsync(
    useCallback(() => getMessages(), []),
  );

  useEffect(() => {
    if (!highlightId) return;
    document
      .getElementById(`message-${highlightId}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlightId, data]);

  async function resend(message: MessageListItem, channel: MessageChannel) {
    setRetrying(message.id);
    try {
      const updated = await retryMessage(message.id, channel);
      setData((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast.success(`Queued again on ${messageChannelLabels[channel]}`);
    } catch (retryError) {
      toast.error(
        retryError instanceof Error
          ? retryError.message
          : "Couldn't queue the message",
      );
    } finally {
      setRetrying(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Confirmations"
        description="Every booking confirmation the AI sent, on WhatsApp or SMS — including the ones that didn't get through."
      />

      {error ? <ErrorState error={error} onRetry={reload} /> : null}
      {loading && !data ? <LoadingRows rows={5} /> : null}

      {data && data.length === 0 ? (
        <EmptyState title="Nothing sent yet" />
      ) : null}

      <ul className="space-y-3">
        {data?.map((message) => {
          const otherChannel: MessageChannel =
            message.channel === "whatsapp" ? "sms" : "whatsapp";

          return (
            <li key={message.id} id={`message-${message.id}`}>
              <Card
                className={cn(
                  "gap-2 py-4",
                  highlightId === message.id &&
                    "border-primary ring-primary/20 ring-2",
                  message.status === "failed" && "border-destructive/40",
                )}
              >
                <CardContent className="px-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="font-medium">
                      {message.customer?.name ?? "Customer"}
                    </span>
                    {message.customer ? (
                      <span className="text-muted-foreground text-sm">
                        {formatPhone(message.customer.phone)}
                      </span>
                    ) : null}
                    <Badge variant="secondary">
                      {message.channel === "whatsapp" ? (
                        <MessageCircle aria-hidden />
                      ) : (
                        <Smartphone aria-hidden />
                      )}
                      {messageChannelLabels[message.channel]}
                    </Badge>
                    <Badge variant="outline" className="text-muted-foreground">
                      {message.direction === "outbound" ? (
                        <ArrowUpRight aria-hidden />
                      ) : (
                        <ArrowDownLeft aria-hidden />
                      )}
                      {message.direction === "outbound" ? "Sent" : "Received"}
                    </Badge>
                    <MessageStatusBadge status={message.status} />
                    <span className="text-muted-foreground ml-auto text-xs">
                      {formatDateTime(message.created_at)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-relaxed">{message.body}</p>

                  {message.error_message ? (
                    <p className="text-destructive mt-2 font-mono text-xs">
                      {message.error_message}
                    </p>
                  ) : null}

                  {message.status === "failed" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={retrying === message.id}
                        onClick={() => resend(message, otherChannel)}
                      >
                        {retrying === message.id ? (
                          <Loader2 className="animate-spin" />
                        ) : null}
                        Send again on {messageChannelLabels[otherChannel]}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={retrying === message.id}
                        onClick={() => resend(message, message.channel)}
                      >
                        Retry {messageChannelLabels[message.channel]}
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<LoadingRows rows={5} />}>
      <MessagesView />
    </Suspense>
  );
}
