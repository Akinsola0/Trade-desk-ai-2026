/** Confirmations and follow-ups sent over SMS or WhatsApp. */
import { isDemoAuth } from "@/lib/api/auth";
import { getSupabase } from "@/lib/supabase/isomorphic";
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
 * Map a Supabase row to the `MessageListItem` shape.
 */
function rowToMessageListItem(row: any): MessageListItem {
  const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;

  return {
    id: row.id,
    customer_id: row.customer_id,
    channel: row.channel,
    direction: row.direction,
    body: row.body,
    status: row.status,
    error_message: row.error_message,
    created_at: row.created_at,
    customer: customer
      ? { id: customer.id, name: customer.name, phone: customer.phone }
      : null,
  };
}

/**
 * Newest first. Pass a `customerId` for one customer's thread.
 */
export async function getMessages(
  customerId?: UUID,
): Promise<MessageListItem[]> {
  if (!isDemoAuth) {
    const supabase = await getSupabase();

    let query = supabase
      .from("messages")
      .select(`
        id, customer_id, channel, direction, body, status, error_message, created_at,
        customers ( id, name, phone )
      `)
      .order("created_at", { ascending: false });

    if (customerId) {
      query = query.eq("customer_id", customerId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data) return [];

    return data.map(rowToMessageListItem);
  }

  // ── Demo path ──────────────────────────────────────────────────────────────
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
 */
export async function retryMessage(
  messageId: UUID,
  channel?: MessageChannel,
): Promise<MessageListItem> {
  if (!isDemoAuth) {
    const supabase = await getSupabase();

    // 1. Fetch the failed message to duplicate it
    const { data: current, error: fetchError } = await supabase
      .from("messages")
      .select("*")
      .eq("id", messageId)
      .single();

    if (fetchError || !current) throw new Error(`Message ${messageId} not found`);

    // 2. Insert a new row for the retry so the failure stays in history
    const { data: newRow, error: insertError } = await supabase
      .from("messages")
      .insert({
        customer_id: current.customer_id,
        channel: channel ?? current.channel,
        direction: current.direction,
        body: current.body,
        status: "queued"
      })
      .select(`
        id, customer_id, channel, direction, body, status, error_message, created_at,
        customers ( id, name, phone )
      `)
      .single();

    if (insertError) throw new Error(insertError.message);
    if (!newRow) throw new Error("Failed to queue message");

    return rowToMessageListItem(newRow);
  }

  // ── Demo path ──────────────────────────────────────────────────────────────
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

