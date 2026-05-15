"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

const ADMIN_PASSWORD = "Blackjack1!";

function checkAdmin(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export type FeedbackType = "bug" | "recommendation" | "praise" | "other";

const DAILY_FEEDBACK_LIMIT = 50;

export async function submitFeedback(input: {
  message: string;
  name: string | null;
  feedback_type: FeedbackType | null;
  page: string | null;
  user_agent: string | null;
}): Promise<{ error?: string }> {
  const message = input.message.trim();
  if (!message) return { error: "Please write something before submitting." };
  if (message.length > 4000) {
    return {
      error:
        "Message is a bit too long — please keep it under 4000 characters.",
    };
  }

  const sb = supabase();

  // Global daily rate limit — counts all submissions (deleted or not) in the
  // last 24 hours. Simple bound to keep spam manageable.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countErr } = await sb
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if (countErr) return { error: countErr.message };
  if ((count ?? 0) >= DAILY_FEEDBACK_LIMIT) {
    return {
      error: `Daily feedback limit reached (${DAILY_FEEDBACK_LIMIT} in the last 24 hours). Please come back tomorrow.`,
    };
  }

  const { error } = await sb.from("feedback").insert({
    message,
    name: input.name?.trim() || null,
    feedback_type: input.feedback_type ?? null,
    page: input.page?.slice(0, 200) ?? null,
    user_agent: input.user_agent?.slice(0, 500) ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath("/feedback");
  return {};
}

export async function verifyAdmin(
  password: string
): Promise<{ ok: boolean }> {
  return { ok: checkAdmin(password) };
}

export async function markAddressed(
  id: string,
  addressed: boolean,
  password: string
): Promise<{ error?: string }> {
  if (!checkAdmin(password)) return { error: "Wrong password." };
  const sb = supabase();
  const { error } = await sb
    .from("feedback")
    .update({ addressed })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/feedback");
  return {};
}

export async function deleteFeedback(
  id: string,
  password: string
): Promise<{ error?: string }> {
  if (!checkAdmin(password)) return { error: "Wrong password." };
  const sb = supabase();
  const { error } = await sb
    .from("feedback")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/feedback");
  return {};
}

// Any visitor can post a response. If they pass the admin password, the
// response is flagged as an admin reply (visible badge).
export async function submitResponse(input: {
  feedback_id: string;
  name: string | null;
  message: string;
  admin_password: string | null;
}): Promise<{ error?: string }> {
  const message = input.message.trim();
  if (!message) return { error: "Please write something." };
  if (message.length > 2000) {
    return { error: "Response is too long (max 2000 characters)." };
  }
  const isAdmin = input.admin_password
    ? checkAdmin(input.admin_password)
    : false;
  const sb = supabase();
  const { error } = await sb.from("feedback_responses").insert({
    feedback_id: input.feedback_id,
    name: input.name?.trim() || null,
    message,
    is_admin: isAdmin,
  });
  if (error) return { error: error.message };
  revalidatePath("/feedback");
  return {};
}

export async function deleteResponse(
  id: string,
  password: string
): Promise<{ error?: string }> {
  if (!checkAdmin(password)) return { error: "Wrong password." };
  const sb = supabase();
  const { error } = await sb
    .from("feedback_responses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/feedback");
  return {};
}
