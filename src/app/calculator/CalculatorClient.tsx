"use client";

import { useEffect, useState } from "react";
import ChipCalculator, { Preset as CalcPreset } from "@/components/ChipCalculator";
import { ChipConfig } from "@/lib/chips";
import {
  loadPresets,
  loadRecentSets,
  savePreset,
  deletePreset,
  Preset as StoredPreset,
  RecentSet,
} from "@/lib/storage";

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

export default function CalculatorClient() {
  const [presets, setPresets] = useState<CalcPreset[]>([]);
  const [recents, setRecents] = useState<RecentSet[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPresets(loadPresets().map(toCalcPreset));
    setRecents(loadRecentSets(5));
    setHydrated(true);
  }, []);

  function refresh() {
    setPresets(loadPresets().map(toCalcPreset));
    setRecents(loadRecentSets(5));
  }

  // Avoid hydration mismatch — render only after we've read localStorage
  if (!hydrated) {
    return (
      <div className="surface p-6 text-sm text-muted">Loading calculator…</div>
    );
  }

  return (
    <ChipCalculator
      presets={presets}
      recentSets={recents.map((r) => ({
        id: r.id,
        label: r.label,
        config: r.config,
      }))}
      onSavePreset={async (name: string, config: ChipConfig) => {
        savePreset(name, config);
        refresh();
      }}
      onDeletePreset={async (id: string) => {
        deletePreset(id);
        refresh();
      }}
    />
  );
}
