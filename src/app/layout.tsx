import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import Link from "next/link";
import PokerLogo from "@/components/PokerLogo";
import NavBar from "@/components/NavBar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Broadway Poker — chip calculator & home-game tracker",
  description:
    "Optimize your home-game chip distribution. Track buy-ins, rebuys, and busts. Save chip presets for next time.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <header className="header-shadow bg-header sticky top-0 z-30">
          <NavBar />
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 py-5 sm:py-10">
          {children}
        </main>

        <footer className="border-t border-border mt-8">
          <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 flex items-center justify-between text-xs text-muted">
            <span className="inline-flex items-center gap-2">
              <PokerLogo size={16} />
              Broadway Poker
            </span>
            <span className="text-muted">
              Free tool · localStorage only · no account needed
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
