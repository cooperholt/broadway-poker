"use server";

import { supabase } from "@/lib/supabase";

export async function submitFeedback(input: {
  message: string;
  email: string | null;
  page: string | null;
  user_agent: string | null;
}): Promise<{ error?: string }> {
  const message = input.message.trim();
  if (!message) return { error: "Please write something before submitting." };
  if (message.length > 4000) {
    return { error: "Message is a bit too long — please keep it under 4000 characters." };
  }

  const sb = supabase();
  const { error } = await sb.from("feedback").insert({
    message,
    email: input.email?.trim() || null,
    page: input.page?.slice(0, 200) ?? null,
    user_agent: input.user_agent?.slice(0, 500) ?? null,
  });
  if (error) return { error: error.message };
  return {};
}
