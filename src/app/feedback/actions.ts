"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

function checkAdmin(password: string): boolean {
  return password === (process.env.ADMIN_PASSWORD ?? "AV");
}

export async function submitFeedback(input: {
  message: string;
  email: string | null;
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
  const { error } = await sb.from("feedback").insert({
    message,
    email: input.email?.trim() || null,
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

export async function respondToFeedback(
  id: string,
  response: string,
  password: string
): Promise<{ error?: string }> {
  if (!checkAdmin(password)) return { error: "Wrong password." };
  const trimmed = response.trim();
  const sb = supabase();
  const { error } = await sb
    .from("feedback")
    .update({
      admin_response: trimmed || null,
      responded_at: trimmed ? new Date().toISOString() : null,
    })
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
