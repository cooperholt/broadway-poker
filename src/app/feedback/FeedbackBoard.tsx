"use client";

import { useState, useTransition } from "react";
import {
  verifyAdmin,
  markAddressed,
  deleteFeedback,
  submitResponse,
  deleteResponse,
  FeedbackType,
} from "./actions";

export type FeedbackResponse = {
  id: string;
  name: string | null;
  message: string;
  is_admin: boolean;
  created_at: string;
};

export type FeedbackItem = {
  id: string;
  message: string;
  name: string | null;
  feedback_type: FeedbackType | null;
  addressed: boolean;
  created_at: string;
  responses: FeedbackResponse[];
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

const TYPE_META: Record<
  FeedbackType,
  { label: string; emoji: string; cls: string }
> = {
  bug: { label: "Bug", emoji: "🐛", cls: "bg-negative/15 text-negative" },
  recommendation: {
    label: "Idea",
    emoji: "💡",
    cls: "bg-warning/15 text-warning",
  },
  praise: { label: "Praise", emoji: "🎉", cls: "bg-poker-soft text-poker" },
  other: { label: "Other", emoji: "💬", cls: "bg-muted/15 text-muted" },
};

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

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h2 className="text-lg font-bold">
          Feedback{" "}
          <span className="text-sm font-normal text-muted">
            ({items.length})
          </span>
        </h2>
        {adminUnlocked && (
          <span className="text-xs font-semibold text-poker">
            Edit mode ✓
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted">No feedback yet — be the first.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <FeedbackCard
              key={item.id}
              item={item}
              admin={adminUnlocked ? adminPw : null}
            />
          ))}
        </ul>
      )}

      {/* Bottom-right small "Edit" toggle */}
      <div className="flex justify-end pt-4">
        {!adminUnlocked && !showAdminPrompt && (
          <button
            type="button"
            onClick={() => setShowAdminPrompt(true)}
            className="text-xs text-muted hover:text-poker hover:underline"
          >
            Edit
          </button>
        )}
        {showAdminPrompt && !adminUnlocked && (
          <span className="inline-flex items-center gap-2 flex-wrap">
            <input
              type="password"
              value={adminPw}
              onChange={(e) => setAdminPw(e.target.value)}
              placeholder="Password"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  unlock();
                }
              }}
              className="w-40 rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
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
              <span className="text-xs text-negative">{adminError}</span>
            )}
          </span>
        )}
        {adminUnlocked && (
          <button
            type="button"
            onClick={() => {
              setAdminUnlocked(false);
              setAdminPw("");
            }}
            className="text-xs text-muted hover:text-poker hover:underline"
          >
            Exit edit mode
          </button>
        )}
      </div>
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
    });
  }

  const typeMeta = item.feedback_type ? TYPE_META[item.feedback_type] : null;

  return (
    <li
      className={`surface p-4 ${
        item.addressed ? "border-poker-soft bg-poker-faint/30" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {typeMeta && (
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${typeMeta.cls}`}
            >
              {typeMeta.emoji} {typeMeta.label}
            </span>
          )}
          <span className="font-semibold text-sm">
            {item.name?.trim() || "Anonymous"}
          </span>
          <span className="text-xs text-muted tabular-nums">
            · {formatWhen(item.created_at)}
          </span>
        </div>
        {item.addressed && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-poker text-white">
            Addressed
          </span>
        )}
      </div>
      <p className="text-sm text-foreground whitespace-pre-wrap break-words">
        {item.message}
      </p>

      {item.responses.length > 0 && (
        <ul className="mt-3 pl-3 border-l-2 border-border space-y-2">
          {item.responses.map((r) => (
            <ResponseRow
              key={r.id}
              response={r}
              admin={admin}
              onDelete={() =>
                admin && run(() => deleteResponse(r.id, admin))
              }
            />
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowReplyForm((v) => !v)}
          className="text-xs px-2.5 py-1 rounded-md border border-border text-muted hover:bg-poker-soft hover:text-poker hover:border-poker-soft font-semibold"
        >
          {showReplyForm ? "Cancel reply" : "Reply"}
        </button>

        {admin && (
          <>
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
          </>
        )}
      </div>

      {showReplyForm && (
        <ReplyForm
          feedbackId={item.id}
          admin={admin}
          onDone={() => setShowReplyForm(false)}
        />
      )}

      {error && <p className="mt-2 text-xs text-negative">{error}</p>}
    </li>
  );
}

function ResponseRow({
  response,
  admin,
  onDelete,
}: {
  response: FeedbackResponse;
  admin: string | null;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <li className="text-sm">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">
            {response.name?.trim() || "Anonymous"}
          </span>
          {response.is_admin && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-poker text-white">
              Admin
            </span>
          )}
          <span className="text-xs text-muted tabular-nums">
            · {formatWhen(response.created_at)}
          </span>
        </div>
        {admin && (
          <>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-[10px] text-muted hover:text-negative hover:underline"
              >
                Delete
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onDelete}
                  className="text-[10px] text-negative font-semibold hover:underline"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-[10px] text-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </span>
            )}
          </>
        )}
      </div>
      <p className="mt-1 whitespace-pre-wrap break-words text-foreground">
        {response.message}
      </p>
    </li>
  );
}

function ReplyForm({
  feedbackId,
  admin,
  onDone,
}: {
  feedbackId: string;
  admin: string | null;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [postAsAdmin, setPostAsAdmin] = useState(Boolean(admin));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    if (!message.trim()) {
      setError("Write something before replying.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitResponse({
        feedback_id: feedbackId,
        name: name.trim() || null,
        message,
        admin_password: admin && postAsAdmin ? admin : null,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setName("");
      setMessage("");
      onDone();
    });
  }

  return (
    <div className="mt-3 p-3 rounded-md border border-border bg-poker-faint/40 space-y-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name (optional)"
        maxLength={80}
        className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-poker/40 focus:border-poker"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Your reply"
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-poker/40 focus:border-poker resize-y"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        {admin && (
          <label className="inline-flex items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={postAsAdmin}
              onChange={(e) => setPostAsAdmin(e.target.checked)}
              className="accent-poker w-3.5 h-3.5"
            />
            Post as admin
          </label>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={onDone}
            className="text-xs text-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={send}
            disabled={pending || !message.trim()}
            className="text-xs px-3 py-1.5 rounded-md bg-poker text-white hover:bg-poker-hover font-semibold disabled:opacity-50"
          >
            {pending ? "…" : "Send reply"}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-negative">{error}</p>}
    </div>
  );
}
