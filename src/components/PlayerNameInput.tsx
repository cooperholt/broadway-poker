"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
};

export default function PlayerNameInput({
  value,
  onChange,
  suggestions,
  placeholder = "Player name",
  className = "",
  autoFocus,
  onEnter,
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filter = value.trim().toLowerCase();
  const list = suggestions.filter(
    (s) => filter.length === 0 || s.toLowerCase().includes(filter)
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(name: string) {
    onChange(name);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            setOpen(true);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(list.length - 1, h + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(0, h - 1));
          } else if (e.key === "Enter") {
            // If the dropdown is open with a highlighted match that matches
            // (case-insensitively) what's typed, accept it. Otherwise just
            // commit the typed value (close the dropdown so the "New player"
            // hint disappears) without losing the typed text.
            if (
              open &&
              list[highlight] &&
              list[highlight].toLowerCase() === filter
            ) {
              e.preventDefault();
              pick(list[highlight]);
            } else {
              setOpen(false);
              if (onEnter) {
                e.preventDefault();
                onEnter();
              }
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        autoFocus={autoFocus}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-poker/40 focus:border-poker"
      />
      {open && list.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-20 surface max-h-56 overflow-y-auto py-1 shadow-lg"
        >
          {list.map((name, i) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => pick(name)}
                onMouseEnter={() => setHighlight(i)}
                className={`w-full text-left px-3 py-1.5 text-sm ${
                  i === highlight
                    ? "bg-poker-soft text-poker"
                    : "hover:bg-poker-soft hover:text-poker"
                }`}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && list.length === 0 && filter.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-20 surface px-3 py-2 text-xs text-muted shadow-lg">
          New player — &quot;{value}&quot; will be created
        </div>
      )}
    </div>
  );
}
