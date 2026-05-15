import FeedbackForm from "./FeedbackForm";
import FeedbackBoard, { FeedbackItem } from "./FeedbackBoard";
import { supabase } from "@/lib/supabase";
import type { FeedbackType } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Feedback — Broadway Poker",
  description: "Send feedback, browse what others have said, and reply.",
};

export default async function FeedbackPage() {
  let items: FeedbackItem[] = [];
  try {
    const sb = supabase();
    const { data } = await sb
      .from("feedback")
      .select(
        `id, message, name, feedback_type, addressed, created_at,
         feedback_responses ( id, name, message, is_admin, created_at, deleted_at )`
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(500);

    type Row = {
      id: string;
      message: string;
      name: string | null;
      feedback_type: string | null;
      addressed: boolean | null;
      created_at: string;
      feedback_responses:
        | {
            id: string;
            name: string | null;
            message: string;
            is_admin: boolean | null;
            created_at: string;
            deleted_at: string | null;
          }[]
        | null;
    };
    items = ((data ?? []) as Row[]).map((r) => ({
      id: r.id,
      message: r.message,
      name: r.name,
      feedback_type: (r.feedback_type as FeedbackType | null) ?? null,
      addressed: !!r.addressed,
      created_at: r.created_at,
      responses: (r.feedback_responses ?? [])
        .filter((x) => !x.deleted_at)
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
        )
        .map((x) => ({
          id: x.id,
          name: x.name,
          message: x.message,
          is_admin: !!x.is_admin,
          created_at: x.created_at,
        })),
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
          doesn&apos;t, and what you wish it did. Everything posted here is
          public — reply to other people&apos;s feedback too.
        </p>
      </header>
      <FeedbackForm />
      <FeedbackBoard items={items} />
    </div>
  );
}
