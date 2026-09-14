/** Confirmations and follow-ups sent over SMS or WhatsApp. */
import { db, delay } from "@/lib/api/mock/store";
import type { MessageChannel, MessageListItem, UUID } from "@/lib/api/types";

function toListItem(messageId: UUID): MessageListItem | null {
  const message = db.messages.find((item) => item.id === messageId);
  if (!message) return null;

  const customer = db.customers.find((item) => item.id === message.customer_id);

  return {
    ...message,
    customer: customer
      ? { id: customer.id, name: customer.name, phone: customer.phone }
      : null,
  };
}

/**
 * Newest first. Pass a `customerId` for one customer's thread.
 *
 * TODO(backend): `GET /api/messages?customer_id=` — join `customers` so the
 * dashboard can show who a confirmation was going to.
 */
export async function getMessages(
  customerId?: UUID,
): Promise<MessageListItem[]> {
  const items = db.messages
    .filter((message) =>
      customerId ? message.customer_id === customerId : true,
    )
    .map((message) => toListItem(message.id))
    .filter((item): item is MessageListItem => item !== null)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  return delay(items);
}

/**
 * Re-send a confirmation that failed — optionally over the other channel, which
 * is how a "no WhatsApp account" failure gets resolved without ringing anyone.
 *
 * TODO(backend): `POST /api/messages/[id]/retry` — queue through
 * `lib/messaging` and return the new row rather than mutating the failed one, so
 * the failure stays in the history.
 */
export async function retryMessage(
  messageId: UUID,
  channel?: MessageChannel,
): Promise<MessageListItem> {
  const message = db.messages.find((item) => item.id === messageId);
  if (!message) throw new Error(`Message ${messageId} not found`);

  message.channel = channel ?? message.channel;
  message.status = "queued";
  message.error_message = null;
  message.created_at = new Date().toISOString();

  const updated = toListItem(message.id);
  if (!updated) throw new Error(`Message ${messageId} could not be loaded`);
  return delay(updated, 400);
}
