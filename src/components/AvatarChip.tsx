"use client";

// Deterministic player color from name. Two names that differ only in case
// produce the same color.
function hashName(name: string): number {
  let h = 0;
  const lower = name.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    h = (h * 31 + lower.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Curated palette tuned to read against the light gray bg.
const PALETTE = [
  { bg: "#0a3d2c", ring: "#072a1f", fg: "#ffffff" }, // poker green
  { bg: "#c8243a", ring: "#8c1226", fg: "#ffffff" }, // red
  { bg: "#1f5fb3", ring: "#143f7a", fg: "#ffffff" }, // blue
  { bg: "#a8650b", ring: "#7a4906", fg: "#ffffff" }, // amber
  { bg: "#6b3aa3", ring: "#46226d", fg: "#ffffff" }, // purple
  { bg: "#2e7d6b", ring: "#1d544a", fg: "#ffffff" }, // teal
  { bg: "#b8425b", ring: "#7e2438", fg: "#ffffff" }, // raspberry
  { bg: "#4a4a4a", ring: "#2a2a2a", fg: "#ffffff" }, // graphite
  { bg: "#9c5821", ring: "#6d3a13", fg: "#ffffff" }, // sienna
  { bg: "#3b6e8a", ring: "#244658", fg: "#ffffff" }, // slate-blue
];

export function colorForPlayer(name: string) {
  return PALETTE[hashName(name) % PALETTE.length];
}

export default function AvatarChip({
  name,
  size = 28,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const c = colorForPlayer(name || "?");
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  const fontSize = Math.round(size * 0.45);
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold tabular-nums select-none shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: c.bg,
        border: `2px solid ${c.ring}`,
        color: c.fg,
        fontSize,
        boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.25)",
        letterSpacing: "0.02em",
      }}
      aria-label={name}
      title={name}
    >
      {initial}
    </span>
  );
}
