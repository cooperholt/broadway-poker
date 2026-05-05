// Simple chip-stack mark in SVG. Designed to read at small sizes.
// Three stacked chips with a subtle shadow.

export default function PokerLogo({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Poker Tracker"
    >
      <defs>
        <radialGradient id="chipShine" cx="0.3" cy="0.25" r="0.7">
          <stop offset="0" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      {/* Bottom chip — green */}
      <ellipse cx="16" cy="25" rx="11" ry="3" fill="#072a1f" />
      <ellipse cx="16" cy="23.5" rx="11" ry="3" fill="#0a3d2c" />
      <ellipse cx="16" cy="23.5" rx="11" ry="3" fill="url(#chipShine)" />
      {/* Middle chip — red */}
      <ellipse cx="16" cy="20" rx="11" ry="3" fill="#8c1226" />
      <ellipse cx="16" cy="18.5" rx="11" ry="3" fill="#c8243a" />
      <ellipse cx="16" cy="18.5" rx="11" ry="3" fill="url(#chipShine)" />
      {/* Top chip — white */}
      <ellipse cx="16" cy="15" rx="11" ry="3" fill="#cbd5d3" />
      <ellipse cx="16" cy="13.5" rx="11" ry="3" fill="#f5f5f5" />
      <ellipse cx="16" cy="13.5" rx="11" ry="3" fill="url(#chipShine)" />
      {/* Notches on top chip */}
      <rect x="14.5" y="11.5" width="3" height="1.2" rx="0.3" fill="#0a3d2c" />
      <rect
        x="14.5"
        y="14.3"
        width="3"
        height="1.2"
        rx="0.3"
        fill="#0a3d2c"
        opacity="0.5"
      />
    </svg>
  );
}
