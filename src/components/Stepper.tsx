"use client";

import { useEffect, useState } from "react";

type StepperProps = {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  label?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  size?: "sm" | "md";
  textInput?: boolean;
  /** Custom DOM id on the inner text input (only when textInput). */
  inputId?: string;
  /** Called when ArrowUp/ArrowDown is pressed in the text input. */
  onArrowVertical?: (direction: 1 | -1) => void;
};

export default function Stepper({
  value,
  onChange,
  step = 1,
  min,
  max,
  label,
  prefix,
  suffix,
  decimals = 0,
  className = "",
  size = "md",
  textInput = false,
  inputId,
  onArrowVertical,
}: StepperProps) {
  const btn =
    "flex items-center justify-center rounded border border-border text-foreground hover:bg-poker-soft hover:text-poker hover:border-poker disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground disabled:hover:border-border w-8 h-8";

  function clamp(n: number) {
    if (min != null && n < min) n = min;
    if (max != null && n > max) n = max;
    return n;
  }

  // Local state for the text-input variant so users can type freely.
  const [draft, setDraft] = useState(
    decimals > 0 ? value.toFixed(decimals) : String(value)
  );
  useEffect(() => {
    setDraft(decimals > 0 ? value.toFixed(decimals) : String(value));
  }, [value, decimals]);

  function commit() {
    const n = Number(draft);
    if (Number.isFinite(n)) onChange(clamp(Number(n.toFixed(decimals))));
    else setDraft(decimals > 0 ? value.toFixed(decimals) : String(value));
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {label && (
        <span className="text-xs font-bold uppercase tracking-wider text-muted">
          {label}
        </span>
      )}
      <button
        type="button"
        className={btn}
        onClick={() =>
          onChange(clamp(Number((value - step).toFixed(decimals))))
        }
        disabled={min != null && value <= min}
        aria-label="decrement"
      >
        −
      </button>
      {textInput ? (
        <span className="inline-flex items-baseline gap-0.5">
          {prefix && <span className="text-muted">{prefix}</span>}
          <input
            type="text"
            inputMode="decimal"
            id={inputId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
                (e.target as HTMLInputElement).blur();
              } else if (e.key === "ArrowDown" && onArrowVertical) {
                e.preventDefault();
                commit();
                onArrowVertical(1);
              } else if (e.key === "ArrowUp" && onArrowVertical) {
                e.preventDefault();
                commit();
                onArrowVertical(-1);
              }
            }}
            size={size === "sm" ? 4 : Math.max(3, draft.length + 1)}
            className="text-right tabular-nums font-semibold border-b border-dashed border-border bg-transparent focus:outline-none focus:border-poker px-0.5"
          />
          {suffix && <span className="text-muted">{suffix}</span>}
        </span>
      ) : (
        <span className="tabular-nums font-semibold inline-flex items-baseline px-2.5">
          {prefix && <span className="text-muted mr-0.5">{prefix}</span>}
          <span className="border-b border-dashed border-border min-w-[1.5ch] text-right">
            {decimals > 0 ? value.toFixed(decimals) : value}
          </span>
          {suffix && <span className="text-muted ml-0.5">{suffix}</span>}
        </span>
      )}
      <button
        type="button"
        className={btn}
        onClick={() =>
          onChange(clamp(Number((value + step).toFixed(decimals))))
        }
        disabled={max != null && value >= max}
        aria-label="increment"
      >
        +
      </button>
    </div>
  );
}
