"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PokerLogo from "./PokerLogo";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/calculator", label: "Chip Calculator" },
  { href: "/feedback", label: "Feedback" },
];

export default function NavBar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-2 sm:gap-3">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <Link
          href="/"
          className="text-base sm:text-lg font-bold tracking-tight text-foreground"
        >
          <span className="inline-flex items-center gap-2">
            <PokerLogo size={26} />
            <span className="hidden sm:inline">Broadway Poker</span>
          </span>
        </Link>
        {/* Mobile-only Start a Game CTA next to logo */}
        <Link
          href="/play"
          className="sm:hidden px-3 py-1.5 rounded-md bg-poker text-white text-sm font-semibold"
        >
          Start a Game →
        </Link>
      </div>
      <div className="flex items-center gap-0.5 sm:gap-2 text-sm overflow-x-auto sm:overflow-visible">
        {navLinks.map((l) => {
          const active = isActive(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`px-2 sm:px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                active
                  ? "text-poker font-semibold bg-poker-soft"
                  : "text-foreground hover:bg-poker-soft hover:text-poker"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
        {/* Desktop Start a Game CTA on the right */}
        <Link
          href="/play"
          aria-current={isActive("/play") ? "page" : undefined}
          className="hidden sm:inline-block ml-1 px-3 py-1.5 rounded-md bg-poker text-white hover:bg-poker-hover font-semibold whitespace-nowrap"
        >
          Start a Game →
        </Link>
      </div>
    </nav>
  );
}
