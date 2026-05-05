"use client";

import { useEffect, useState } from "react";
import ChipCalculator, { Preset as CalcPreset } from "@/components/ChipCalculator";
import PlayerNameInput from "@/components/PlayerNameInput";
import { ChipConfig } from "@/lib/chips";
import {
  GameState,
  newGameId,
  newPlayerId,
  newBuyinId,
  loadPresets,
  loadRecentSets,
  Preset as StoredPreset,
  RecentSet,
} from "@/lib/storage";

type Player = { name: string; buy_in_amount: string };

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const inputCls =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-poker/40 focus:border-poker";

function toCalcPreset(p: StoredPreset): CalcPreset {
  return {
    id: p.id,
    name: p.name,
    buy_in: p.buy_in,
    num_players: p.num_players,
    mode: p.mode,
    big_blind: p.big_blind,
    small_blind: p.small_blind,
    chips: p.chips,
  };
}

export default function SetupView({
  onStart,
}: {
  onStart: (game: GameState) => void;
}) {
  const [playedOn, setPlayedOn] = useState(todayLocal());
  const [players, setPlayers] = useState<Player[]>([
    { name: "", buy_in_amount: "20" },
    { name: "", buy_in_amount: "20" },
  ]);
  const [useChipCalc, setUseChipCalc] = useState(true);
  const [chipConfig, setChipConfig] = useState<ChipConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [presets, setPresets] = useState<CalcPreset[]>([]);
  const [recents, setRecents] = useState<RecentSet[]>([]);

  useEffect(() => {
    setPresets(loadPresets().map(toCalcPreset));
    setRecents(loadRecentSets(5));
  }, []);

  const namesSeen = new Set<string>();
  for (const p of players) namesSeen.add(p.name.trim().toLowerCase());

  function setPlayer(i: number, patch: Partial<Player>) {
    setPlayers((prev) => prev.map((p, j) => (i === j ? { ...p, ...patch } : p)));
  }
  function addPlayer() {
    const def =
      useChipCalc && chipConfig
        ? chipConfig.buy_in.toFixed(2).replace(/\.00$/, "")
        : (players[0]?.buy_in_amount ?? "20");
    setPlayers((p) => [...p, { name: "", buy_in_amount: def }]);
  }
  function removePlayer(i: number) {
    setPlayers((p) => (p.length <= 2 ? p : p.filter((_, j) => j !== i)));
  }

  function handleConfigChange(cfg: ChipConfig) {
    setChipConfig(cfg);
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        buy_in_amount: cfg.buy_in.toFixed(2).replace(/\.00$/, ""),
      }))
    );
  }

  function start() {
    setError(null);
    const cleaned = players
      .map((p) => ({ name: p.name.trim(), buy_in_amount: Number(p.buy_in_amount) }))
      .filter((p) => p.name.length > 0);
    if (cleaned.length < 2) {
      setError("Need at least 2 players to start a game.");
      return;
    }
    const seen = new Set<string>();
    for (const p of cleaned) {
      const lc = p.name.toLowerCase();
      if (seen.has(lc)) {
        setError(`Duplicate player: "${p.name}"`);
        return;
      }
      seen.add(lc);
      if (!Number.isFinite(p.buy_in_amount) || p.buy_in_amount <= 0) {
        setError(`Invalid buy-in for ${p.name}`);
        return;
      }
    }

    const now = new Date().toISOString();
    const game: GameState = {
      id: newGameId(),
      played_on: playedOn,
      notes: null,
      status: "in_progress",
      use_chip_calc: useChipCalc,
      chip_config: useChipCalc ? chipConfig : null,
      players: cleaned.map((p) => ({
        id: newPlayerId(),
        name: p.name,
        buy_ins: [
          {
            id: newBuyinId(),
            amount: p.buy_in_amount,
            created_at: now,
          },
        ],
        busted: false,
        joined_at: now,
      })),
      end_draft: null,
      started_at: now,
    };
    onStart(game);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          New Game
        </h1>
        <p className="text-sm text-muted mt-1 max-w-md">
          Set up a new game. Stays on this device — refresh-safe. Discard any
          time.
        </p>
      </header>

      <div className="surface p-4 sm:p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
          Date
        </h2>
        <input
          type="date"
          value={playedOn}
          onChange={(e) => setPlayedOn(e.target.value)}
          className={`max-w-xs ${inputCls}`}
        />
      </div>

      <div className="surface p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            Players
          </h2>
          <span className="text-xs text-muted">
            You can add more during the game
          </span>
        </div>
        <div className="space-y-2">
          {players.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <PlayerNameInput
                  value={p.name}
                  onChange={(v) => setPlayer(i, { name: v })}
                  suggestions={[]}
                />
              </div>
              <span className="text-sm text-muted shrink-0">$</span>
              <input
                type="number"
                step="0.01"
                value={p.buy_in_amount}
                onChange={(e) =>
                  setPlayer(i, { buy_in_amount: e.target.value })
                }
                className="w-20 sm:w-24 shrink-0 rounded-md border border-border bg-surface px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-poker/40 focus:border-poker"
              />
              <button
                type="button"
                onClick={() => removePlayer(i)}
                disabled={players.length <= 2}
                className="px-2 py-2 text-sm text-muted hover:text-negative disabled:opacity-30 shrink-0"
                aria-label="Remove player"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addPlayer}
          className="mt-3 text-sm font-semibold text-poker hover:text-poker-hover"
        >
          + Add player
        </button>
      </div>

      <div className="surface p-4 sm:p-5">
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span>
            <span className="font-semibold">Use Chip Calculator</span>
            <span className="block text-xs text-muted mt-0.5">
              Track chip stacks during the game; chip counts auto-compute
              winnings at the end.
            </span>
          </span>
          <span
            className={`relative inline-flex w-11 h-6 rounded-full transition-colors shrink-0 ${
              useChipCalc ? "bg-poker" : "bg-border-strong"
            }`}
          >
            <input
              type="checkbox"
              checked={useChipCalc}
              onChange={(e) => setUseChipCalc(e.target.checked)}
              className="sr-only"
            />
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                useChipCalc ? "translate-x-5" : ""
              }`}
            />
          </span>
        </label>
      </div>

      {useChipCalc && (
        <ChipCalculator
          presets={presets}
          recentSets={recents.map((r) => ({
            id: r.id,
            label: r.label,
            config: r.config,
          }))}
          onChange={handleConfigChange}
        />
      )}

      {error && <p className="text-sm text-negative">{error}</p>}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={start}
          disabled={namesSeen.size === 0}
          className="rounded-md bg-poker text-white hover:bg-poker-hover font-bold px-5 py-2.5 text-base disabled:opacity-50"
        >
          Start Game →
        </button>
      </div>
    </div>
  );
}
