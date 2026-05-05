// Chip color palette — common home-game chip colors.
export const CHIP_COLORS = [
  { id: "white", label: "White", hex: "#f5f5f5", ring: "#cbd5d3" },
  { id: "red", label: "Red", hex: "#c8243a", ring: "#8c1226" },
  { id: "blue", label: "Blue", hex: "#1f5fb3", ring: "#143f7a" },
  { id: "green", label: "Green", hex: "#1f7a4d", ring: "#0d4f30" },
  { id: "black", label: "Black", hex: "#1f1f1f", ring: "#000000" },
  { id: "purple", label: "Purple", hex: "#6b3aa3", ring: "#46226d" },
  { id: "pink", label: "Pink", hex: "#e07ca7", ring: "#a44477" },
  { id: "yellow", label: "Yellow", hex: "#e9c84e", ring: "#a48624" },
  { id: "orange", label: "Orange", hex: "#dd7a2a", ring: "#a8521a" },
  { id: "gray", label: "Gray", hex: "#7a8088", ring: "#4f5560" },
] as const;

export type ChipColorId = (typeof CHIP_COLORS)[number]["id"];

export function chipColor(id: string) {
  return CHIP_COLORS.find((c) => c.id === id) ?? CHIP_COLORS[0];
}

export type ChipMode = "unmarked" | "denominations";

export type ChipRow = {
  color: string;          // ChipColorId
  value: number | null;   // denomination per chip; null in unmarked mode = calc decides
  count_per_player: number;
  count_available: number | null; // total in the set (informational, optional)
};

export type ChipConfig = {
  buy_in: number;
  num_players: number;
  mode: ChipMode;
  big_blind: number | null;
  small_blind: number | null;
  chips: ChipRow[];
};

// Default unmarked-chip values — tournament-style ladder.
// Per project convention: white $1, red $5, green $25, blue $100, black $500.
const DEFAULT_VALUES: Record<string, number> = {
  white: 1,
  red: 5,
  green: 25,
  blue: 100,
  black: 500,
  purple: 1000,
  pink: 0.5,
  yellow: 50,
  orange: 250,
  gray: 2500,
};

export function defaultValueFor(colorId: string): number {
  return DEFAULT_VALUES[colorId] ?? 1;
}

// Auto blinds: target ~100 BB deep, but round both blinds to multiples of
// the smallest chip on the board so the table can actually post them.
// BB = round(buy_in / 100, smallest), SB = round(BB / 2, smallest), with
// floors at `smallest` and BB strictly greater than SB.
export function autoBlinds(
  buyIn: number,
  smallestValue: number = 0.01
): { sb: number; bb: number } {
  const u = Math.max(0.01, smallestValue);
  const targetBB = buyIn / 100;
  const targetSB = targetBB / 2;
  const roundTo = (n: number) =>
    Math.max(u, Math.round(n / u) * u);
  let sb = roundTo(targetSB);
  let bb = roundTo(targetBB);
  if (bb <= sb) bb = roundTo(sb * 2);
  // Clean up float dust
  sb = Math.round(sb * 100) / 100;
  bb = Math.round(bb * 100) / 100;
  return { sb, bb };
}

// Sort chips ascending by value. Returns a new array.
export function sortByValue(chips: ChipRow[]): ChipRow[] {
  return [...chips].sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
}

// Sum of (value × count_per_player) — what each player's stack is worth.
export function stackValue(chips: ChipRow[]): number {
  return chips.reduce((acc, c) => {
    if (c.value == null) return acc;
    return acc + c.value * c.count_per_player;
  }, 0);
}

// Validate per-color "available count" caps:
// per_player_count × num_players ≤ count_available (if set).
export function availabilityIssues(
  chips: ChipRow[],
  numPlayers: number
): { color: string; needed: number; available: number }[] {
  const out: { color: string; needed: number; available: number }[] = [];
  for (const c of chips) {
    if (c.count_available == null) continue;
    const needed = c.count_per_player * numPlayers;
    if (needed > c.count_available) {
      out.push({ color: c.color, needed, available: c.count_available });
    }
  }
  return out;
}

// ===========================================================================
// Optimizer — produces a "good" home-game stack distribution.
// Strategy: distribute the BUY-IN VALUE across chip denominations using
// configurable shares, then convert each share to an integer chip count.
// The smallest chip absorbs the residual to keep the stack value exactly
// equal to buy_in.
//
// Inputs: list of chips with values; outputs counts per chip for one player.
// Returns null if buy_in cannot be evenly expressed in the smallest
// chip's denomination, or if availability caps make it infeasible.
// ===========================================================================

// Value shares from smallest to largest denom (sums to 1.0).
// Tuned so smallest gets enough chips to cover blinds and the largest is
// represented but not dominant.
const VALUE_SHARES_BY_LEN: Record<number, number[]> = {
  1: [1.0],
  2: [0.4, 0.6],
  3: [0.2, 0.4, 0.4],
  4: [0.15, 0.25, 0.30, 0.30],
  5: [0.10, 0.20, 0.25, 0.25, 0.20],
  6: [0.08, 0.15, 0.22, 0.22, 0.18, 0.15],
};

function valueSharesFor(n: number): number[] {
  if (VALUE_SHARES_BY_LEN[n]) return VALUE_SHARES_BY_LEN[n];
  // Fallback: roughly equal shares
  return Array(n).fill(1 / n);
}

export function optimizeStack(
  buyIn: number,
  chipsIn: ChipRow[],
  numPlayers: number
): ChipRow[] | null {
  if (chipsIn.length === 0 || buyIn <= 0) return null;
  // Fill in default values for any chips with null value.
  const filled: ChipRow[] = chipsIn.map((c) => ({
    ...c,
    value: c.value ?? defaultValueFor(c.color),
  }));
  const sorted = sortByValue(filled);
  const n = sorted.length;

  // Skip biggest chips that exceed buy-in (can't even fit one)
  const usable = sorted.filter((c) => (c.value ?? 0) <= buyIn);
  const usableN = usable.length;
  if (usableN === 0) return null;

  const shares = valueSharesFor(usableN);

  // Per-player availability caps
  const perPlayerCap = (c: ChipRow) =>
    c.count_available == null
      ? Number.POSITIVE_INFINITY
      : Math.floor(c.count_available / numPlayers);

  // Walk from LARGEST to second-smallest; smallest absorbs the residual.
  const counts = new Array(n).fill(0) as number[];
  let remainingValue = round2(buyIn);
  for (let idx = usableN - 1; idx >= 1; idx--) {
    const c = usable[idx];
    const v = c.value!;
    const targetValue = buyIn * shares[idx];
    let target = Math.round(targetValue / v);
    // Cap by availability
    target = Math.min(target, perPlayerCap(c));
    // Cap by remaining value (avoid overshoot)
    const maxFit = Math.floor(remainingValue / v);
    target = Math.min(target, maxFit);
    if (target < 0) target = 0;
    // Map back to sorted index
    const sortedIdx = sorted.findIndex((s) => s.color === c.color);
    counts[sortedIdx] = target;
    remainingValue = round2(remainingValue - target * v);
  }

  // Smallest absorbs the rest
  const smallest = usable[0];
  const v0 = smallest.value!;
  const sortedSmallestIdx = sorted.findIndex((s) => s.color === smallest.color);
  let lowCount = round2(remainingValue / v0);
  if (!Number.isInteger(lowCount)) return null;
  if (lowCount < 0) return null;

  // If the smallest count would exceed availability, trade groups of smallest
  // chips up for one of the next-larger denomination, until smallest fits in
  // its per-player cap. Greedy: prefer the smallest larger chip with room.
  const cap0 = perPlayerCap(smallest);
  while (lowCount > cap0) {
    let traded = false;
    for (let idx = 1; idx < usableN; idx++) {
      const chip = usable[idx];
      const v = chip.value!;
      const sortedIdx = sorted.findIndex((s) => s.color === chip.color);
      const ratio = v / v0;
      if (!Number.isInteger(round2(ratio))) continue;
      if (counts[sortedIdx] >= perPlayerCap(chip)) continue;
      if (lowCount < ratio) continue;
      // Trade `ratio` smallest chips for 1 chip of the larger color.
      counts[sortedIdx] += 1;
      lowCount -= Math.round(ratio);
      traded = true;
      break;
    }
    if (!traded) {
      // Truly infeasible within the available chip counts.
      return null;
    }
  }

  if (lowCount < 0) return null;
  counts[sortedSmallestIdx] = lowCount;

  // Map back to original chip order, preserving any chips that exceeded
  // buy-in (they get count=0 but stay in the row list).
  const out: ChipRow[] = chipsIn.map((c) => {
    const sortedIdx = sorted.findIndex((s) => s.color === c.color);
    return {
      ...c,
      value: filled.find((f) => f.color === c.color)!.value,
      count_per_player: counts[sortedIdx],
    };
  });
  return out;
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// Adjust a row's count by +/-1 while keeping buy-in constant.
//
// For non-smallest rows: the delta is absorbed by adjusting the smallest
// chip's count by (target.value / smallest.value) chips in the opposite
// direction. Requires that ratio to be an integer.
//
// For the smallest row: bumping by 1 is trivially out of balance (it changes
// the buy-in by smallest.value). Instead, the smallest is bumped by a step
// equal to (next_largest.value / smallest.value) chips — so the value delta
// equals the next-larger chip's value — and we compensate by adjusting the
// next-larger chip count by 1 in the opposite direction.
export function bumpRow(
  chips: ChipRow[],
  rowColor: string,
  delta: number
): ChipRow[] | null {
  if (chips.length === 0) return null;
  const sorted = sortByValue(chips);
  const smallest = sorted[0];
  if (smallest.value == null || smallest.value === 0) return null;

  const target = chips.find((c) => c.color === rowColor);
  if (!target || target.value == null) return null;

  if (target.color === smallest.color) {
    // Smallest row: requires a "next larger" chip to compensate.
    const nextLarger = sorted[1];
    if (!nextLarger || nextLarger.value == null) return null;
    const stepInSmallChips = nextLarger.value / smallest.value;
    if (!Number.isInteger(round2(stepInSmallChips))) return null;
    const newSmallCount =
      target.count_per_player + delta * Math.round(stepInSmallChips);
    const newNextCount = nextLarger.count_per_player - delta;
    if (newSmallCount < 0 || newNextCount < 0) return null;
    return chips.map((c) => {
      if (c.color === smallest.color)
        return { ...c, count_per_player: newSmallCount };
      if (c.color === nextLarger.color)
        return { ...c, count_per_player: newNextCount };
      return c;
    });
  }

  const valueDelta = target.value * delta;
  // Compensate by reducing smallest (positive delta) or adding to it (negative)
  const compensateChips = -valueDelta / smallest.value;
  if (!Number.isInteger(round2(compensateChips))) {
    // Not divisible — block the change
    return null;
  }
  const newTargetCount = target.count_per_player + delta;
  const newSmallestCount =
    smallest.count_per_player + Math.round(compensateChips);
  if (newTargetCount < 0 || newSmallestCount < 0) return null;

  return chips.map((c) => {
    if (c.color === target.color)
      return { ...c, count_per_player: newTargetCount };
    if (c.color === smallest.color)
      return { ...c, count_per_player: newSmallestCount };
    return c;
  });
}

// Whether a given row's up/down arrow is enabled.
export function canBump(
  chips: ChipRow[],
  rowColor: string,
  delta: number
): boolean {
  return bumpRow(chips, rowColor, delta) !== null;
}

// Recommended blinds — same logic as autoBlinds, kept as a separate name to
// make the "what we'd suggest" intent explicit at call sites.
export function recommendedBlinds(
  buyIn: number,
  smallestValue: number = 0.01
): {
  recommendedBB: number;
  recommendedSB: number;
} {
  const { sb, bb } = autoBlinds(buyIn, smallestValue);
  return { recommendedBB: bb, recommendedSB: sb };
}

// How many big blinds deep is a buy-in at given BB?
export function bbDepth(buyIn: number, bb: number): number {
  if (!bb || bb <= 0) return 0;
  return Math.round(buyIn / bb);
}
