"use client";

import { GameState, GamePlayer } from "@/lib/storage";
import { computePayouts, SettlementInput } from "@/lib/payouts";
import AvatarChip from "@/components/AvatarChip";

function totalBuyIn(p: GamePlayer): number {
  return p.buy_ins.reduce((acc, b) => acc + Number(b.amount), 0);
}

function fmt(n: number) {
  const sign = n >= 0 ? "+" : "−";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function colorClass(n: number) {
  if (n > 0) return "text-positive";
  if (n < 0) return "text-negative";
  return "text-muted";
}

export default function PayoutView({
  game,
  onStartNew,
  onBackToResults,
}: {
  game: GameState;
  onStartNew: () => void;
  onBackToResults: () => void;
}) {
  // Compute per-player nets from end_draft, falling back to bust state.
  const draftRows = game.end_draft?.rows ?? {};
  const players = game.players.map((p) => {
    const r = draftRows[p.id];
    let final = 0;
    if (r) {
      if (r.busted) final = 0;
      else if (r.directValue !== "") final = Number(r.directValue) || 0;
      else if (game.chip_config) {
        for (const c of game.chip_config.chips) {
          const v = c.value ?? 0;
          const cnt = r.chipCounts[c.color] ?? 0;
          final += v * cnt;
        }
      }
    }
    const buy = totalBuyIn(p);
    return {
      player_id: p.id,
      name: p.name,
      buy_in: buy,
      final,
      net: final - buy,
      busted: r?.busted ?? p.busted,
    };
  });

  const settlementInput: SettlementInput[] = players.map((p) => ({
    player_id: p.player_id,
    name: p.name,
    net: p.net,
  }));
  const transactions = computePayouts(settlementInput);

  const totalPot = players.reduce((acc, p) => acc + p.buy_in, 0);
  const totalNet = players.reduce((acc, p) => acc + p.net, 0);
  const balanced = Math.abs(totalNet) < 0.01;

  const sortedPlayers = [...players].sort((a, b) => b.net - a.net);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Settle Up
        </h1>
        <p className="text-sm text-muted mt-1">
          Final standings and the optimal way to pay everyone out.
        </p>
      </header>

      <div className="surface p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-3 text-sm tabular-nums">
          <Stat label="Pot" value={`$${totalPot.toFixed(2)}`} />
          <Stat label="Players" value={String(players.length)} />
          <Stat
            label="Net check"
            value={balanced ? "balanced" : `${fmt(totalNet)} drift`}
            tone={balanced ? "positive" : "warning"}
          />
        </div>
      </div>

      <div className="surface">
        <div className="px-3 sm:px-5 py-3 border-b border-border">
          <h2 className="font-bold">Final Standings</h2>
        </div>
        <ul className="divide-y divide-border">
          {sortedPlayers.map((p, i) => (
            <li
              key={p.player_id}
              className="px-3 sm:px-5 py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 text-muted tabular-nums shrink-0">
                  {i + 1}.
                </span>
                <AvatarChip name={p.name} size={28} />
                <span className="font-semibold">
                  {p.name}
                  {i === 0 && p.net > 0 && (
                    <span className="ml-1.5" aria-label="biggest winner">
                      👑
                    </span>
                  )}
                  {i === sortedPlayers.length - 1 && p.net < 0 && (
                    <span className="ml-1.5" aria-label="biggest loss">
                      💀
                    </span>
                  )}
                  {p.busted && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide font-bold text-negative/80">
                      bust
                    </span>
                  )}
                </span>
              </div>
              <div className="text-right">
                <div
                  className={`tabular-nums font-bold text-base ${colorClass(p.net)}`}
                >
                  {fmt(p.net)}
                </div>
                <div className="text-xs text-muted tabular-nums">
                  ${p.buy_in.toFixed(2)} → ${p.final.toFixed(2)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="surface">
        <div className="px-3 sm:px-5 py-3 border-b border-border">
          <h2 className="font-bold">Who Pays Whom</h2>
          <p className="text-xs text-muted mt-0.5">
            {transactions.length === 0
              ? "Nothing to settle — everyone broke even."
              : `${transactions.length} transaction${transactions.length === 1 ? "" : "s"} clears every balance.`}
          </p>
        </div>
        {transactions.length > 0 && (
          <ul className="divide-y divide-border">
            {transactions.map((t, i) => (
              <li
                key={i}
                className="px-3 sm:px-5 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="inline-flex items-center gap-2">
                    <AvatarChip name={t.from} size={22} />
                    <span className="font-semibold">{t.from}</span>
                  </span>
                  <span className="text-muted">pays</span>
                  <span className="inline-flex items-center gap-2">
                    <AvatarChip name={t.to} size={22} />
                    <span className="font-semibold">{t.to}</span>
                  </span>
                </div>
                <div className="tabular-nums font-bold text-base text-poker">
                  ${t.amount.toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBackToResults}
          className="text-sm text-muted hover:text-foreground"
        >
          ← Back to results
        </button>
        <button
          type="button"
          onClick={onStartNew}
          className="px-5 py-3 rounded-md bg-poker text-white hover:bg-poker-hover font-bold text-base"
        >
          Start new game →
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "warning";
}) {
  const cls =
    tone === "positive"
      ? "text-positive"
      : tone === "warning"
        ? "text-warning"
        : "text-foreground";
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className={`font-semibold text-base ${cls}`}>{value}</div>
    </div>
  );
}
