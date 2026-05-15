import FeedbackForm from "./FeedbackForm";
import FeedbackBoard, { FeedbackItem } from "./FeedbackBoard";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Feedback — Broadway Poker",
  description: "Send feedback and see what others have said.",
};

export default async function FeedbackPage() {
  let items: FeedbackItem[] = [];
  try {
    const sb = supabase();
    const { data } = await sb
      .from("feedback")
      .select(
        "id, message, addressed, admin_response, responded_at, created_at"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(500);
    items = (data ?? []).map((r) => ({
      id: r.id,
      message: r.message,
      addressed: !!r.addressed,
      admin_response: r.admin_response,
      responded_at: r.responded_at,
      created_at: r.created_at,
    }));
  } catch {
    items = [];
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Feedback
        </h1>
        <p className="text-sm text-muted mt-1">
          This tool is new and changing fast. Tell me what works, what
          doesn&apos;t, and what you wish it did. Everything is public.
        </p>
      </header>
      <FeedbackForm />
      <FeedbackBoard items={items} />
    </div>
  );
}
