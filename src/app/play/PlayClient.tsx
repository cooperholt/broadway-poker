"use client";

import { useEffect, useState } from "react";
import {
  GameState,
  loadCurrentGame,
  saveCurrentGame,
  pushRecentSet,
} from "@/lib/storage";
import SetupView from "./SetupView";
import LiveView from "./LiveView";
import ResultsView from "./ResultsView";
import PayoutView from "./PayoutView";

export default function PlayClient() {
  const [game, setGame] = useState<GameState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setGame(loadCurrentGame());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveCurrentGame(game);
  }, [game, hydrated]);

  if (!hydrated) {
    return (
      <div className="surface p-6 text-sm text-muted">Loading game…</div>
    );
  }

  if (!game) {
    return (
      <SetupView
        onStart={(initial) => {
          if (initial.use_chip_calc && initial.chip_config) {
            const label = `${initial.played_on} · $${initial.chip_config.buy_in.toFixed(0)}`;
            pushRecentSet(label, initial.chip_config);
          }
          setGame(initial);
        }}
      />
    );
  }

  if (game.status === "in_progress") {
    return (
      <LiveView
        game={game}
        onChange={setGame}
        onEnd={() =>
          setGame((g) =>
            g
              ? {
                  ...g,
                  status: "complete",
                  completed_at: new Date().toISOString(),
                }
              : g
          )
        }
        onAbandon={() => setGame(null)}
      />
    );
  }

  if (game.status === "complete") {
    return (
      <ResultsView
        game={game}
        onChange={setGame}
        onReturnToLive={() =>
          setGame((g) =>
            g
              ? { ...g, status: "in_progress", completed_at: undefined }
              : g
          )
        }
        onConfirm={() =>
          setGame((g) => (g ? { ...g, status: "settled" } : g))
        }
      />
    );
  }

  // status === "settled" — show payout
  return (
    <PayoutView
      game={game}
      onStartNew={() => setGame(null)}
      onBackToResults={() =>
        setGame((g) => (g ? { ...g, status: "complete" } : g))
      }
    />
  );
}
