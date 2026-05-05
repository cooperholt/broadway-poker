"use client";

import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import ChipDot from "@/components/ChipDot";
import { defaultValueFor } from "@/lib/chips";
import { GameState, GamePlayer } from "@/lib/storage";

const inputCls =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-poker/40 focus:border-poker";

function totalBuyIn(p: GamePlayer): number {
  return p.buy_ins.reduce((acc, b) => acc + Number(b.amount), 0);
}

type RowState = {
  busted: boolean;
  chipCounts: Record<string, number>;
  directValue: string;
};

export default function ResultsView({
  game,
  onChange,
  onReturnToLive,
  onStartNew,
}: {
  game: GameState;
  onChange: (g: GameState) => void;
  onReturnToLive: () => void;
  onStartNew: () => void;
}) {
  const chipSet =
    game.chip_config && game.use_chip_calc
      ? { chips: game.chip_config.chips }
      : null;

  // Hydrate from end_draft if present, else seed from game state
  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const init: Record<string, RowState> = {};
    for (const p of game.players) {
      const drafted = game.end_draft?.rows?.[p.id];
      init[p.id] = drafted ?? {
        busted: p.busted,
        chipCounts: {},
        directValue: "",
      };
    }
    return init;
  });
  const [notes, setNotes] = useState(game.end_draft?.notes ?? "");
  const [confirmedSummary, setConfirmedSummary] = useState(false);

  // Persist draft to game state on every change
  useEffect(() => {
    onChange({ ...game, end_draft: { rows, notes } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, notes]);

  function setRow(id: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }
  function setChipCount(id: string, color: string, n: number) {
    setRows((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        chipCounts: { ...prev[id].chipCounts, [color]: Math.max(0, n) },
        directValue: "",
      },
    }));
  }

  function finalValueFor(p: GamePlayer): number {
    const r = rows[p.id];
    if (!r) return 0;
    if (r.busted) return 0;
    if (r.directValue !== "") {
      const n = Number(r.directValue);
      return Number.isFinite(n) ? n : 0;
    }
    if (chipSet) {
      let sum = 0;
      for (const c of chipSet.chips) {
        const v = c.value ?? defaultValueFor(c.color);
        const cnt = r.chipCounts[c.color] ?? 0;
        sum += v * cnt;
      }
      return sum;
    }
    return 0;
  }

  const totals = useMemo(() => {
    let totalBuy = 0;
    let totalFinal = 0;
    let totalNet = 0;
    for (const p of game.players) {
      const b = totalBuyIn(p);
      const f = finalValueFor(p);
      totalBuy += b;
      totalFinal += f;
      totalNet += f - b;
    }
    return { totalBuy, totalFinal, totalNet };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, game.players, chipSet]);

  const balanced = Math.abs(totals.totalNet) < 0.01;

  function fireConfetti() {
    if (confirmedSummary) return;
    setConfirmedSummary(true);
    const colors = ["#0a3d2c", "#c8243a", "#1f5fb3", "#a8650b", "#e9c84e"];
    const duration = 1100;
    const end = Date.now() + duration;
    function burst() {
      confetti({
        particleCount: 60,
        spread: 65,
        startVelocity: 45,
        gravity: 0.9,
        origin: { x: Math.random(), y: 0.2 + Math.random() * 0.2 },
        colors,
        scalar: 0.9,
      });
      if (Date.now() < end) requestAnimationFrame(burst);
    }
    burst();
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          End of Game
        </h1>
        <p className="text-sm text-muted mt-1">
          Enter each player&apos;s final chip count or cash value. Bust toggle
          for anyone who lost their stack.
        </p>
      </header>

      <div className="surface p-4 sm:p-5">
        <div className="text-xs font-bold uppercase tracking-wider text-muted">
          End of Game · {game.played_on}
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm tabular-nums mt-3">
          <Stat label="Total in pot" value={`$${totals.totalBuy.toFixed(2)}`} />
          <Stat label="Total counted" value={`$${totals.totalFinal.toFixed(2)}`} />
          <Stat
            label="Net"
            value={`${totals.totalNet >= 0 ? "+" : "−"}$${Math.abs(totals.totalNet).toFixed(2)}`}
            highlight={balanced ? "positive" : "warning"}
          />
        </div>
        {!balanced && (
          <p className="text-xs text-warning mt-2">
            Counted total doesn&apos;t match the pot. (Usually it should
            balance to ≈ $0 net — chips don&apos;t evaporate.)
          </p>
        )}
      </div>

      <div className="surface">
        <div className="px-3 sm:px-5 py-3 border-b border-border">
          <h2 className="font-bold">Final stacks</h2>
        </div>
        <ul className="divide-y divide-border">
          {game.players.map((p) => {
            const r = rows[p.id];
            const final = finalValueFor(p);
            const buyIn = totalBuyIn(p);
            const net = final - buyIn;
            return (
              <li key={p.id} className="px-3 sm:px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold ${r.busted ? "line-through text-muted" : ""}`}
                    >
                      {p.name}
                    </span>
                    <span className="text-xs text-muted">
                      buy-in ${buyIn.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`tabular-nums font-semibold ${
                        net > 0
                          ? "text-positive"
                          : net < 0
                            ? "text-negative"
                            : "text-muted"
                      }`}
                    >
                      net {net >= 0 ? "+" : "−"}${Math.abs(net).toFixed(2)}
                    </span>
                    <label className="inline-flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={r.busted}
                        onChange={(e) =>
                          setRow(p.id, { busted: e.target.checked })
                        }
                        className="accent-negative w-4 h-4"
                      />
                      Bust
                    </label>
                  </div>
                </div>
                {!r.busted && (
                  <>
                    {chipSet && r.directValue === "" && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {chipSet.chips.map((c) => (
                          <ChipCountInput
                            key={c.color}
                            colorId={c.color}
                            chipValue={c.value ?? defaultValueFor(c.color)}
                            value={r.chipCounts[c.color] ?? 0}
                            onChange={(n) => setChipCount(p.id, c.color, n)}
                          />
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className="text-muted">Final $</span>
                      <input
                        type="number"
                        step="0.01"
                        value={r.directValue}
                        onChange={(e) =>
                          setRow(p.id, { directValue: e.target.value })
                        }
                        placeholder={
                          chipSet ? `Auto: $${final.toFixed(2)}` : "Enter $"
                        }
                        className={`w-32 tabular-nums ${inputCls}`}
                      />
                      {chipSet && r.directValue !== "" && (
                        <button
                          type="button"
                          onClick={() =>
                            setRow(p.id, { directValue: "" })
                          }
                          className="text-xs text-muted hover:text-poker hover:underline"
                        >
                          Use chip count instead
                        </button>
                      )}
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="surface p-4 sm:p-5">
        <label className="block">
          <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
            Notes <span className="font-normal normal-case text-muted/70">(optional)</span>
          </span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Big hands, memorable moments…"
            className={inputCls}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onReturnToLive}
          className="text-sm text-muted hover:text-foreground"
        >
          ← Back to live game
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fireConfetti}
            className="px-4 py-2 rounded-md bg-poker text-white hover:bg-poker-hover font-semibold text-sm"
          >
            🎉 Confirm results
          </button>
          <button
            type="button"
            onClick={onStartNew}
            className="px-4 py-2 rounded-md border border-poker text-poker hover:bg-poker hover:text-white font-semibold text-sm"
          >
            Start new game
          </button>
        </div>
      </div>

      <div className="surface p-4 sm:p-5 bg-poker-faint border-poker-soft">
        <p className="text-sm text-muted">
          <span className="font-semibold text-foreground">Heads up:</span> in
          this version, games stay on this device. Saving to a leaderboard,
          inviting friends, and tracking long-term standings are coming in a
          future release.
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "positive" | "warning";
}) {
  const cls =
    highlight === "positive"
      ? "text-positive"
      : highlight === "warning"
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

function ChipCountInput({
  colorId,
  value,
  chipValue,
  onChange,
}: {
  colorId: string;
  value: number;
  chipValue: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 border border-border rounded-md p-2">
      <ChipDot colorId={colorId} size={20} />
      <span className="text-xs text-muted tabular-nums">
        ${chipValue.toFixed(2)}
      </span>
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ml-auto w-14 tabular-nums text-right border-b border-dashed border-border bg-transparent text-sm focus:outline-none focus:border-poker"
      />
    </div>
  );
}

