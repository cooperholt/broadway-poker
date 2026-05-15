import FeedbackForm from "./FeedbackForm";

export const dynamic = "force-static";

export const metadata = {
  title: "Feedback — Broadway Poker",
  description: "Send feedback, bug reports, or feature requests.",
};

export default function FeedbackPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Feedback
        </h1>
        <p className="text-sm text-muted mt-1">
          This tool is new and changing fast. Tell me what works, what
          doesn&apos;t, and what you wish it did.
        </p>
      </header>
      <FeedbackForm />
    </div>
  );
}
