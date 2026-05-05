"use client";

import { CHIP_COLORS, chipColor } from "@/lib/chips";

export default function ChipDot({
  colorId,
  size = 28,
}: {
  colorId: string;
  size?: number;
}) {
  const c = chipColor(colorId);
  return (
    <span
      className="inline-block rounded-full"
      style={{
        width: size,
        height: size,
        background: c.hex,
        border: `3px solid ${c.ring}`,
        boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.6)",
      }}
      aria-label={c.label}
    />
  );
}

export function ChipColorPicker({
  value,
  onChange,
  exclude = [],
}: {
  value: string;
  onChange: (id: string) => void;
  exclude?: string[];
}) {
  return (
    <details className="relative">
      <summary className="list-none cursor-pointer marker:hidden inline-flex items-center">
        <ChipDot colorId={value} size={22} />
      </summary>
      <div className="absolute left-0 top-9 z-10 surface p-2 grid grid-cols-5 gap-2 shadow-lg">
        {CHIP_COLORS.filter(
          (c) => c.id === value || !exclude.includes(c.id)
        ).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={(e) => {
              onChange(c.id);
              (
                e.currentTarget.closest("details") as HTMLDetailsElement
              )?.removeAttribute("open");
            }}
            className={`p-1 rounded ${
              c.id === value ? "ring-2 ring-poker" : "hover:bg-poker-soft"
            }`}
            title={c.label}
          >
            <ChipDot colorId={c.id} size={24} />
          </button>
        ))}
      </div>
    </details>
  );
}
