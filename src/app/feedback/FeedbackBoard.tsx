"use client";

import { useState, useTransition } from "react";
import {
  verifyAdmin,
  markAddressed,
  respondToFeedback,
  deleteFeedback,
} from "./actions";

export type FeedbackItem = {
  id: string;
  message: string;
  addressed: boolean;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FeedbackBoard({
  items,
}: {
  items: FeedbackItem[];
}) {
  const [adminPw, setAdminPw] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function unlock() {
    setAdminError(null);
    startTransition(async () => {
      const res = await verifyAdmin(adminPw);
      if (res.ok) {
        setAdminUnlocked(true);
        setShowAdminPrompt(false);
      } else {
        setAdminError("Wrong password.");
      }
    });
  }

  if (items.length === 0) {
    return (
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">Public feedback</h2>
        </div>
        <p className="text-sm text-muted mt-3">
          No feedback yet — be the first.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h2 className="text-lg font-bold">
          Public feedback{" "}
          <span className="text-sm font-normal text-muted">
            ({items.length})
          </span>
        </h2>
        {!adminUnlocked && !showAdminPrompt && (
          <button
            type="button"
            onClick={() => setShowAdminPrompt(true)}
            className="text-xs text-muted hover:text-poker hover:underline"
          >
            Admin
          </button>
        )}
        {adminUnlocked && (
          <span className="text-xs font-semibold text-poker">
            Admin mode ✓
          </span>
        )}
      </div>

      {showAdminPrompt && !adminUnlocked && (
        <div className="surface p-3 mb-4 flex flex-wrap items-center gap-2">
          <input
            type="password"
            value={adminPw}
            onChange={(e) => setAdminPw(e.target.value)}
            placeholder="Admin password"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                unlock();
              }
            }}
            className="flex-1 min-w-[8rem] rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={unlock}
            disabled={pending || !adminPw}
            className="text-sm px-3 py-1.5 rounded-md bg-poker text-white hover:bg-poker-hover font-semibold disabled:opacity-50"
          >
            {pending ? "…" : "Unlock"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAdminPrompt(false);
              setAdminPw("");
              setAdminError(null);
            }}
            className="text-sm text-muted hover:text-foreground"
          >
            Cancel
          </button>
          {adminError && (
            <span className="w-full text-xs text-negative">{adminError}</span>
          )}
        </div>
      )}

      <ul className="space-y-3">
        {items.map((item) => (
          <FeedbackCard
            key={item.id}
            item={item}
            admin={adminUnlocked ? adminPw : null}
          />
        ))}
      </ul>
    </div>
  );
}

function FeedbackCard({
  item,
  admin,
}: {
  item: FeedbackItem;
  admin: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showRespondForm, setShowRespondForm] = useState(false);
  const [responseDraft, setResponseDraft] = useState(
    item.admin_response ?? ""
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
    });
  }

  return (
    <li
      className={`surface p-4 ${
        item.addressed ? "border-poker-soft bg-poker-faint/30" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="text-xs text-muted tabular-nums">
          {formatWhen(item.created_at)}
        </div>
        {item.addressed && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-poker text-white">
            Addressed
          </span>
        )}
      </div>
      <p className="text-sm text-foreground mt-2 whitespace-pre-wrap break-words">
        {item.message}
      </p>

      {item.admin_response && (
        <div className="mt-3 pl-3 border-l-2 border-poker bg-poker-faint rounded-r-md p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-poker mb-1">
            Response{" "}
            {item.responded_at && (
              <span className="font-normal normal-case text-muted">
                · {formatWhen(item.responded_at)}
              </span>
            )}
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">
            {item.admin_response}
          </p>
        </div>
      )}

      {admin && (
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              run(() => markAddressed(item.id, !item.addressed, admin))
            }
            disabled={pending}
            className={`text-xs px-2.5 py-1 rounded-md font-semibold ${
              item.addressed
                ? "border border-border text-muted hover:bg-poker-soft"
                : "border border-poker text-poker hover:bg-poker hover:text-white"
            }`}
          >
            {item.addressed ? "Unmark addressed" : "Mark addressed"}
          </button>
          <button
            type="button"
            onClick={() => setShowRespondForm((v) => !v)}
            disabled={pending}
            className="text-xs px-2.5 py-1 rounded-md border border-border text-muted hover:bg-poker-soft hover:text-poker font-semibold"
          >
            {showRespondForm
              ? "Cancel"
              : item.admin_response
                ? "Edit response"
                : "Respond"}
          </button>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={pending}
              className="text-xs px-2.5 py-1 rounded-md border border-negative/40 text-negative hover:bg-negative hover:text-white font-semibold ml-auto"
            >
              Delete
            </button>
          ) : (
            <span className="ml-auto inline-flex items-center gap-2">
              <span className="text-xs text-negative font-semibold">
                Delete this?
              </span>
              <button
                type="button"
                onClick={() => run(() => deleteFeedback(item.id, admin))}
                disabled={pending}
                className="text-xs px-2.5 py-1 rounded-md bg-negative text-white hover:opacity-90 font-semibold"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </span>
          )}
          {showRespondForm && (
            <div className="w-full mt-2 space-y-2">
              <textarea
                value={responseDraft}
                onChange={(e) => setResponseDraft(e.target.value)}
                rows={3}
                placeholder="Your response (visible publicly)"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-poker/40 focus:border-poker resize-y"
              />
              <div className="flex justify-end gap-2">
                {item.admin_response && (
                  <button
                    type="button"
                    onClick={() => {
                      setResponseDraft("");
                      run(() =>
                        respondToFeedback(item.id, "", admin).then((r) => {
                          if (!r.error) setShowRespondForm(false);
                          return r;
                        })
                      );
                    }}
                    disabled={pending}
                    className="text-xs px-2.5 py-1 rounded-md text-muted hover:text-negative"
                  >
                    Clear response
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    run(() =>
                      respondToFeedback(item.id, responseDraft, admin).then(
                        (r) => {
                          if (!r.error) setShowRespondForm(false);
                          return r;
                        }
                      )
                    )
                  }
                  disabled={pending}
                  className="text-xs px-3 py-1 rounded-md bg-poker text-white hover:bg-poker-hover font-semibold"
                >
                  Save response
                </button>
              </div>
            </div>
          )}
          {error && (
            <span className="w-full text-xs text-negative">{error}</span>
          )}
        </div>
      )}
    </li>
  );
}
