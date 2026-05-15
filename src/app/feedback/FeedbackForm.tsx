"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { submitFeedback, FeedbackType } from "./actions";

const inputCls =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-poker/40 focus:border-poker";

const TYPE_OPTIONS: { value: FeedbackType; label: string; emoji: string }[] = [
  { value: "bug", label: "Bug", emoji: "🐛" },
  { value: "recommendation", label: "Recommendation", emoji: "💡" },
  { value: "praise", label: "Praise", emoji: "🎉" },
  { value: "other", label: "Other", emoji: "💬" },
];

export default function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [feedbackType, setFeedbackType] = useState<FeedbackType | "">("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function submit() {
    if (!message.trim()) {
      setError("Please write something before submitting.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitFeedback({
        message,
        name: name.trim() || null,
        feedback_type: feedbackType || null,
        page: typeof window !== "undefined" ? document.referrer || null : null,
        user_agent:
          typeof window !== "undefined" ? window.navigator.userAgent : null,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setMessage("");
      setName("");
      setFeedbackType("");
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="surface p-6 sm:p-8 text-center space-y-4">
        <div className="text-4xl">🎉</div>
        <h2 className="text-xl font-bold">Thanks for the feedback!</h2>
        <p className="text-sm text-muted max-w-sm mx-auto">
          Your message is now visible below. Scroll down to see it.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <button
            type="button"
            onClick={() => setDone(false)}
            className="px-4 py-2 rounded-md border border-border hover:bg-poker-soft hover:text-poker text-sm font-semibold"
          >
            Send another
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-md bg-poker text-white hover:bg-poker-hover text-sm font-semibold"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="surface p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Name{" "}
              <span className="font-normal normal-case text-muted/70">
                (optional)
              </span>
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Anonymous"
              maxLength={80}
              className={inputCls}
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Type
            </span>
            <select
              value={feedbackType}
              onChange={(e) =>
                setFeedbackType(e.target.value as FeedbackType | "")
              }
              className={inputCls}
            >
              <option value="">— pick one —</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.emoji} {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
            What&apos;s on your mind?
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            placeholder="Bugs, feature requests, things you wish worked differently — anything. The more specific the better."
            maxLength={4000}
            className={`${inputCls} resize-y`}
          />
          <div className="mt-1 text-xs text-muted text-right tabular-nums">
            {message.length} / 4000
          </div>
        </label>
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !message.trim()}
          className="rounded-md bg-poker text-white hover:bg-poker-hover font-bold px-5 py-2.5 text-base disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send feedback →"}
        </button>
      </div>
    </div>
  );
}
