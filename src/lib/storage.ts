// localStorage layer for the public broadway-poker tool. Everything in V1
// lives in the browser — no backend, no auth.

import { ChipConfig, ChipRow, ChipMode } from "@/lib/chips";

const KEY_PRESETS = "bp.presets";
const KEY_RECENTS = "bp.recents";
const KEY_CURRENT_GAME = "bp.currentGame";

export type Preset = {
  id: string;
  name: string;
  buy_in: number;
  num_players: number;
  mode: ChipMode;
  big_blind: number | null;
  small_blind: number | null;
  chips: ChipRow[];
  created_at: string;
};

function uid(): string {
  // crypto.randomUUID is available in modern browsers
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore — quota or denied
  }
}

// ===== Presets =====

export function loadPresets(): Preset[] {
  return readJSON<Preset[]>(KEY_PRESETS, []);
}

export function savePreset(name: string, config: ChipConfig): Preset {
  const presets = loadPresets();
  const now = new Date().toISOString();
  const preset: Preset = {
    id: uid(),
    name: name.trim(),
    buy_in: config.buy_in,
    num_players: config.num_players,
    mode: config.mode,
    big_blind: config.big_blind,
    small_blind: config.small_blind,
    chips: config.chips.map((c) => ({ ...c })),
    created_at: now,
  };
  writeJSON(KEY_PRESETS, [preset, ...presets]);
  return preset;
}

export function deletePreset(presetId: string) {
  const presets = loadPresets();
  writeJSON(
    KEY_PRESETS,
    presets.filter((p) => p.id !== presetId)
  );
}

// ===== Recent chip configurations (last few games) =====

export type RecentSet = {
  id: string;
  label: string;
  config: ChipConfig;
  created_at: string;
};

export function loadRecentSets(limit = 5): RecentSet[] {
  return readJSON<RecentSet[]>(KEY_RECENTS, []).slice(0, limit);
}

export function pushRecentSet(label: string, config: ChipConfig) {
  const recents = readJSON<RecentSet[]>(KEY_RECENTS, []);
  const entry: RecentSet = {
    id: uid(),
    label,
    config: {
      ...config,
      chips: config.chips.map((c) => ({ ...c })),
    },
    created_at: new Date().toISOString(),
  };
  writeJSON(KEY_RECENTS, [entry, ...recents].slice(0, 10));
}

// ===== In-progress game (single active game per browser) =====

export type GamePlayer = {
  id: string;
  name: string;
  buy_ins: { id: string; amount: number; created_at: string }[];
  busted: boolean;
  joined_at: string;
};

export type GameState = {
  id: string;
  played_on: string; // ISO date
  notes: string | null;
  status: "in_progress" | "complete" | "settled";
  use_chip_calc: boolean;
  chip_config: ChipConfig | null;
  players: GamePlayer[];
  // End-of-game form draft (preserved across navigation)
  end_draft: {
    rows: Record<
      string,
      {
        busted: boolean;
        chipCounts: Record<string, number>;
        directValue: string;
      }
    >;
    notes: string;
  } | null;
  started_at: string;
  completed_at?: string;
};

export function loadCurrentGame(): GameState | null {
  return readJSON<GameState | null>(KEY_CURRENT_GAME, null);
}

export function saveCurrentGame(state: GameState | null) {
  if (state == null) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(KEY_CURRENT_GAME);
  } else {
    writeJSON(KEY_CURRENT_GAME, state);
  }
}

export function newPlayerId(): string {
  return uid();
}
export function newBuyinId(): string {
  return uid();
}
export function newGameId(): string {
  return uid();
}
