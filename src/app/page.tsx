import Link from "next/link";
import ChipDot from "@/components/ChipDot";

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="text-center pt-4 sm:pt-10 pb-2">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Broadway Poker
        </h1>
        <p className="text-base sm:text-lg text-muted mt-3 max-w-xl mx-auto">
          A free chip calculator and home-game tracker. Optimize your stack,
          run a live game from your phone, and never argue about who owes
          who again.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            href="/calculator"
            className="px-5 py-3 rounded-md bg-poker text-white hover:bg-poker-hover font-semibold text-base"
          >
            Open chip calculator →
          </Link>
          <Link
            href="/play"
            className="px-5 py-3 rounded-md border border-poker text-poker hover:bg-poker hover:text-white font-semibold text-base"
          >
            Start a game
          </Link>
        </div>
        <div className="suit-divider mt-8 justify-center flex">
          <span>♠ ♥ ♦ ♣</span>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Feature
          title="Chip distribution"
          chip="white"
          body="Tell it your buy-in, players, and what chips you have. We'll suggest a balanced stack you can adjust by hand."
        />
        <Feature
          title="Live game tracking"
          chip="red"
          body="Start a game, add players as they walk in, log rebuys and busts. Refresh-proof — your data lives in your browser."
        />
        <Feature
          title="Reusable presets"
          chip="green"
          body="Save the chip set you actually use, with the blinds you actually play. Pull it back up next week in two clicks."
        />
      </section>

      <section className="surface p-5 sm:p-7">
        <h2 className="text-lg font-bold tracking-tight mb-2">
          What this is, what it isn&apos;t
        </h2>
        <ul className="text-sm text-muted space-y-1.5 list-disc pl-5">
          <li>
            Free, no account required — your games and presets are stored on
            your device.
          </li>
          <li>
            Best on the device you&apos;re running the game on (phone or
            laptop). Refresh-resilient.
          </li>
          <li>
            Not a long-term leaderboard. If you want to track wins/losses
            across many sessions with your friends, that&apos;s a separate
            tool we&apos;re working on.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Feature({
  title,
  body,
  chip,
}: {
  title: string;
  body: string;
  chip: string;
}) {
  return (
    <div className="surface p-4 sm:p-5">
      <div className="mb-2.5">
        <ChipDot colorId={chip} size={24} />
      </div>
      <h3 className="font-bold text-base mb-1">{title}</h3>
      <p className="text-sm text-muted leading-relaxed">{body}</p>
    </div>
  );
}
