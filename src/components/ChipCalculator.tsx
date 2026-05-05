"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CHIP_COLORS,
  ChipMode,
  ChipRow,
  ChipConfig,
  autoBlinds,
  bbDepth,
  defaultValueFor,
  optimizeStack,
  recommendedBlinds,
  round2,
  sortByValue,
  stackValue,
  availabilityIssues,
} from "@/lib/chips";
import Stepper from "./Stepper";
import ChipDot, { ChipColorPicker } from "./ChipDot";

export type Preset = {
  id: string;
  name: string;
  buy_in: number;
  num_players: number;
  mode: ChipMode;
  big_blind: number | null;
  small_blind: number | null;
  chips: ChipRow[];
};

type Props = {
  initial?: Partial<ChipConfig>;
  presets?: Preset[];
  recentSets?: { id: string; label: string; config: ChipConfig }[];
  onChange?: (config: ChipConfig) => void;
  onSavePreset?: (name: string, config: ChipConfig) => Promise<void> | void;
  onDeletePreset?: (presetId: string) => Promise<void> | void;
  primaryAction?: { label: string; onClick: (config: ChipConfig) => void };
};

export const DEFAULT_CHIPS: ChipRow[] = [
  { color: "white", value: 1, count_per_player: 0, count_available: 150 },
  { color: "red", value: 5, count_per_player: 0, count_available: 150 },
  { color: "green", value: 25, count_per_player: 0, count_available: 100 },
  { color: "blue", value: 100, count_per_player: 0, count_available: 50 },
  { color: "black", value: 500, count_per_player: 0, count_available: 50 },
];

export default function ChipCalculator({
  initial,
  presets = [],
  recentSets = [],
  onChange,
  onSavePreset,
  onDeletePreset,
  primaryAction,
}: Props) {
  const [buyIn, setBuyIn] = useState<number>(initial?.buy_in ?? 100);
  const [numPlayers, setNumPlayers] = useState<number>(initial?.num_players ?? 6);
  const [mode, setMode] = useState<ChipMode>(
    initial?.mode ?? "denominations"
  );
  const initialChips = initial?.chips ?? DEFAULT_CHIPS;
  const initialSmallest =
    sortByValue(initialChips)[0]?.value ??
    defaultValueFor(initialChips[0]?.color ?? "white");
  const initBlinds = autoBlinds(
    initial?.buy_in ?? 100,
    initialSmallest ?? 0.01
  );
  const [bigBlind, setBigBlind] = useState<number>(
    initial?.big_blind ?? initBlinds.bb
  );
  const [smallBlind, setSmallBlind] = useState<number>(
    initial?.small_blind ?? initBlinds.sb
  );
  const [chips, setChips] = useState<ChipRow[]>(initialChips);

  const [setupOpen, setSetupOpen] = useState(true);
  const [chipsetOpen, setChipsetOpen] = useState(true);
  const [outputOpen, setOutputOpen] = useState(true);

  const [presetName, setPresetName] = useState("");
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetError, setPresetError] = useState<string | null>(null);

  // Run the optimizer once on mount; subsequent runs are user-triggered via
  // the Recalculate button.
  useEffect(() => {
    const optimized = optimizeStack(buyIn, chips, numPlayers);
    if (optimized) setChips(optimized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent on any config change
  useEffect(() => {
    if (!onChange) return;
    onChange({
      buy_in: buyIn,
      num_players: numPlayers,
      mode,
      big_blind: bigBlind,
      small_blind: smallBlind,
      chips,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyIn, numPlayers, mode, bigBlind, smallBlind, chips]);

  function setChipAt(idx: number, patch: Partial<ChipRow>) {
    setChips((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }
  function setChipByColor(color: string, patch: Partial<ChipRow>) {
    setChips((prev) =>
      prev.map((c) => (c.color === color ? { ...c, ...patch } : c))
    );
  }
  function removeChip(idx: number) {
    setChips((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  }
  function addChip() {
    const used = new Set(chips.map((c) => c.color));
    const next = CHIP_COLORS.find((c) => !used.has(c.id));
    if (!next) return;
    setChips((prev) => [
      ...prev,
      {
        color: next.id,
        value: defaultValueFor(next.id),
        count_per_player: 0,
        count_available: null,
      },
    ]);
  }

  function loadPreset(preset: Preset) {
    setBuyIn(Number(preset.buy_in));
    setNumPlayers(preset.num_players);
    setMode(preset.mode);
    if (preset.big_blind != null) setBigBlind(Number(preset.big_blind));
    if (preset.small_blind != null) setSmallBlind(Number(preset.small_blind));
    setChips(preset.chips.map((c) => ({ ...c })));
  }

  function recalculate() {
    const optimized = optimizeStack(buyIn, chips, numPlayers);
    if (optimized) setChips(optimized);
  }

  function applyAutoBlinds() {
    const { sb, bb } = autoBlinds(buyIn, smallestValue);
    setSmallBlind(sb);
    setBigBlind(bb);
  }

  async function handleSavePreset() {
    setPresetError(null);
    const name = presetName.trim();
    if (!name) {
      setPresetError("Give the preset a name.");
      return;
    }
    if (!onSavePreset) return;
    setSavingPreset(true);
    try {
      await onSavePreset(name, {
        buy_in: buyIn,
        num_players: numPlayers,
        mode,
        big_blind: bigBlind,
        small_blind: smallBlind,
        chips,
      });
      setPresetName("");
    } catch (e) {
      setPresetError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingPreset(false);
    }
  }

  const stack = stackValue(chips);
  const stackDelta = round2(stack - buyIn);
  const balanced = Math.abs(stackDelta) < 0.005;
  const sortedChips = sortByValue(chips);
  const smallestValue =
    (sortedChips[0]?.value ?? defaultValueFor(sortedChips[0]?.color ?? "white"));
  const issues = availabilityIssues(chips, numPlayers);

  const { recommendedBB, recommendedSB } = recommendedBlinds(
    buyIn,
    smallestValue
  );
  const currentDepth = bbDepth(buyIn, bigBlind);
  const blindAdvice =
    currentDepth >= 100
      ? `${currentDepth} BB starting depth — deep stack, room for post-flop play`
      : currentDepth >= 50
        ? `${currentDepth} BB starting depth — standard home-game depth`
        : currentDepth >= 25
          ? `${currentDepth} BB starting depth — short stack, faster action`
          : `${currentDepth} BB starting depth — very short, expect quick all-ins`;

  return (
    <div className="space-y-4">
      {/* ===== Section 1: Game Setup ===== */}
      <Section
        n={1}
        title="Game Setup"
        open={setupOpen}
        onToggle={() => setSetupOpen((o) => !o)}
      >
        <Row label="Buy-in">
          <Stepper
            value={buyIn}
            onChange={(n) => setBuyIn(Math.max(1, n))}
            step={1}
            min={1}
            prefix="$"
            textInput
          />
        </Row>
        <Divider />
        <Row
          label="Blinds"
          subLabel={
            <>
              Recommended: ${formatMoney(recommendedSB)}/$
              {formatMoney(recommendedBB)} (100 BB deep) · {blindAdvice}
            </>
          }
        >
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            <span className="inline-flex items-center gap-1">
              <span className="text-muted">$</span>
              <input
                type="number"
                step="0.10"
                value={smallBlind}
                onChange={(e) => setSmallBlind(Number(e.target.value))}
                className="w-14 sm:w-20 text-right tabular-nums border-b border-dashed border-border bg-transparent focus:outline-none focus:border-poker"
              />
            </span>
            <span className="text-muted">/</span>
            <span className="inline-flex items-center gap-1">
              <span className="text-muted">$</span>
              <input
                type="number"
                step="0.10"
                value={bigBlind}
                onChange={(e) => setBigBlind(Number(e.target.value))}
                className="w-14 sm:w-20 text-right tabular-nums border-b border-dashed border-border bg-transparent focus:outline-none focus:border-poker"
              />
            </span>
            <button
              type="button"
              onClick={applyAutoBlinds}
              className="text-xs font-semibold px-2 py-1 rounded-md border border-poker text-poker hover:bg-poker hover:text-white"
            >
              Auto
            </button>
          </div>
        </Row>
        <Divider />
        <Row label="Players">
          <Stepper
            value={numPlayers}
            onChange={(n) => setNumPlayers(Math.max(2, n))}
            step={1}
            min={2}
            max={20}
          />
        </Row>
      </Section>

      {/* ===== Section 2: Chip Set ===== */}
      <Section
        n={2}
        title="Chip Set"
        open={chipsetOpen}
        onToggle={() => setChipsetOpen((o) => !o)}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-3 pb-3">
          <div className="hidden sm:block flex-1" />
          <div className="flex justify-center">
            <ModeToggle mode={mode} onChange={setMode} />
          </div>
          <div className="flex-1 flex justify-center sm:justify-end">
            {(presets.length > 0 || recentSets.length > 0) && (
              <PresetMenu
                presets={presets}
                recentSets={recentSets}
                onPickPreset={loadPreset}
                onPickRecent={(c) => {
                  setBuyIn(c.buy_in);
                  setNumPlayers(c.num_players);
                  setMode(c.mode);
                  if (c.big_blind != null) setBigBlind(c.big_blind);
                  if (c.small_blind != null) setSmallBlind(c.small_blind);
                  setChips(c.chips.map((x) => ({ ...x })));
                }}
              />
            )}
          </div>
        </div>

        <div className="max-w-xl mx-auto">
        <div className="grid grid-cols-[32px_minmax(0,1fr)_minmax(0,1fr)_28px] sm:grid-cols-[36px_minmax(0,1fr)_minmax(0,1fr)_36px] gap-x-2 sm:gap-x-4 gap-y-2 items-center">
          <ColumnHead className="col-start-1 hidden sm:block">Color</ColumnHead>
          <ColumnHead className="col-start-2">Value</ColumnHead>
          <ColumnHead className="col-start-3">Available</ColumnHead>
          <span />

          {chips.map((c, i) => (
            <div key={i} className="contents">
              <div className="col-start-1 flex items-center justify-center">
                <ChipColorPicker
                  value={c.color}
                  onChange={(id) => setChipAt(i, { color: id })}
                  exclude={chips.filter((_, j) => j !== i).map((x) => x.color)}
                />
              </div>
              <div className="col-start-2 flex items-baseline gap-1.5">
                <span className="text-muted">$</span>
                <input
                  type="number"
                  step="0.10"
                  value={c.value ?? ""}
                  placeholder={
                    mode === "unmarked"
                      ? defaultValueFor(c.color).toString()
                      : ""
                  }
                  onChange={(e) =>
                    setChipAt(i, {
                      value:
                        e.target.value === ""
                          ? null
                          : Number(e.target.value),
                    })
                  }
                  className="w-full max-w-[10rem] tabular-nums border-b border-dashed border-border bg-transparent focus:outline-none focus:border-poker"
                />
              </div>
              <div className="col-start-3">
                <Stepper
                  value={c.count_available ?? 0}
                  onChange={(n) =>
                    setChipAt(i, { count_available: n < 0 ? null : n })
                  }
                  step={5}
                  min={0}
                  size="sm"
                  textInput
                  inputId={`avail-${i}`}
                  onArrowVertical={(dir) => {
                    const target = i + dir;
                    if (target < 0 || target >= chips.length) return;
                    const el = document.getElementById(`avail-${target}`);
                    if (el) {
                      (el as HTMLInputElement).focus();
                      (el as HTMLInputElement).select();
                    }
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => removeChip(i)}
                className="col-start-4 w-6 h-6 sm:w-8 sm:h-8 inline-flex items-center justify-center rounded-full text-warning border border-warning/40 hover:bg-warning/10 text-xs sm:text-base"
                aria-label="Remove chip color"
                title="Remove chip color"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addChip}
          className="mt-3 w-full py-2.5 rounded-md border border-dashed border-border bg-poker-faint hover:bg-poker-soft text-sm font-semibold text-poker"
        >
          + Add Chip Color
        </button>
        </div>
      </Section>

      {/* ===== Section 3: Per-Player Stack ===== */}
      <Section
        n={3}
        title="Per-Player Stack"
        open={outputOpen}
        onToggle={() => setOutputOpen((o) => !o)}
        right={
          <span
            className={`text-sm tabular-nums font-semibold ${
              balanced ? "text-positive" : "text-warning"
            }`}
          >
            ${stack.toFixed(2)} {balanced ? "✓" : `(target $${buyIn.toFixed(2)})`}
          </span>
        }
      >
        <div className="flex items-center justify-end pb-3">
          <button
            type="button"
            onClick={recalculate}
            className="px-3 py-1.5 rounded-md border border-poker text-poker hover:bg-poker hover:text-white text-sm font-semibold"
          >
            ↻ Recalculate stack
          </button>
        </div>

        <div className="max-w-xl mx-auto">
        <div className="grid grid-cols-[24px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] sm:grid-cols-[36px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-2 sm:gap-x-3 gap-y-2 items-center text-sm">
          <ColumnHead>Chip</ColumnHead>
          <ColumnHead>Per player</ColumnHead>
          <ColumnHead>Total used</ColumnHead>
          <ColumnHead className="text-right">Stack value</ColumnHead>

          {sortedChips.map((c, sortedIdx) => {
            const totalUsed = c.count_per_player * numPlayers;
            const overCap =
              c.count_available != null && totalUsed > c.count_available;
            const v = c.value ?? defaultValueFor(c.color);
            const rowValue = c.count_per_player * v;
            return (
              <div key={c.color} className="contents">
                <div className="col-start-1">
                  <ChipDot colorId={c.color} size={24} />
                </div>
                <div className="col-start-2 flex items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    disabled={c.count_per_player <= 0}
                    onClick={() =>
                      setChipByColor(c.color, {
                        count_per_player: Math.max(0, c.count_per_player - 1),
                      })
                    }
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded border border-border hover:bg-poker-soft hover:border-poker disabled:opacity-30 text-sm shrink-0"
                  >
                    −
                  </button>
                  <CountInput
                    value={c.count_per_player}
                    onChange={(n) =>
                      setChipByColor(c.color, { count_per_player: n })
                    }
                    inputId={`stack-${sortedIdx}`}
                    onArrowVertical={(dir) => {
                      const target = sortedIdx + dir;
                      if (target < 0 || target >= sortedChips.length) return;
                      const el = document.getElementById(`stack-${target}`);
                      if (el) {
                        (el as HTMLInputElement).focus();
                        (el as HTMLInputElement).select();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setChipByColor(c.color, {
                        count_per_player: c.count_per_player + 1,
                      })
                    }
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded border border-border hover:bg-poker-soft hover:border-poker text-sm shrink-0"
                  >
                    +
                  </button>
                </div>
                <div
                  className={`col-start-3 tabular-nums text-sm ${
                    overCap ? "text-negative font-medium" : "text-foreground"
                  }`}
                >
                  {totalUsed}
                  {c.count_available != null && (
                    <span className="text-muted"> / {c.count_available}</span>
                  )}
                </div>
                <div className="col-start-4 text-right tabular-nums font-semibold">
                  ${rowValue.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
        </div>

        {issues.length > 0 && (
          <div className="mt-3 text-xs text-negative">
            Not enough chips:{" "}
            {issues
              .map(
                (i) =>
                  `${i.color} (${i.needed} needed, ${i.available} available)`
              )
              .join(", ")}
          </div>
        )}

        {!balanced && (
          <div className="mt-3 text-xs text-warning">
            Stack value is off by ${Math.abs(stackDelta).toFixed(2)} — adjust
            chips, change buy-in, or hit Recalculate.
          </div>
        )}

        {/* Save preset + primary action */}
        <div className="mt-5 pt-4 border-t border-border flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          {onSavePreset && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Preset name…"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-poker/40 focus:border-poker"
              />
              <button
                type="button"
                onClick={handleSavePreset}
                disabled={savingPreset || !presetName.trim()}
                className="px-3 py-1.5 rounded-md text-sm font-semibold border border-poker text-poker hover:bg-poker hover:text-white disabled:opacity-50"
              >
                {savingPreset ? "Saving…" : "Save as preset"}
              </button>
              {presetError && (
                <span className="text-xs text-negative">{presetError}</span>
              )}
            </div>
          )}
          {primaryAction && (
            <button
              type="button"
              onClick={() =>
                primaryAction.onClick({
                  buy_in: buyIn,
                  num_players: numPlayers,
                  mode,
                  big_blind: bigBlind,
                  small_blind: smallBlind,
                  chips,
                })
              }
              className="px-4 py-2 rounded-md bg-poker text-white hover:bg-poker-hover font-semibold text-sm"
            >
              {primaryAction.label}
            </button>
          )}
        </div>
      </Section>

      {/* Saved presets list (only on standalone calculator if onDeletePreset is wired) */}
      {presets.length > 0 && onDeletePreset && (
        <div className="surface p-4 sm:p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
            Saved Presets
          </h3>
          <ul className="divide-y divide-border">
            {presets.map((p) => (
              <li key={p.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-muted">
                      ${Number(p.buy_in).toFixed(2)} buy-in · {p.num_players}{" "}
                      players ·{" "}
                      {p.mode === "denominations"
                        ? "denominations on chips"
                        : "custom denominations"}
                      {p.big_blind != null && p.small_blind != null && (
                        <>
                          {" "}
                          · ${Number(p.small_blind)}/${Number(p.big_blind)}{" "}
                          blinds
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    {sortByValue(p.chips).map((c) => (
                      <span
                        key={c.color}
                        className="inline-flex items-center gap-1.5 tabular-nums"
                      >
                        <ChipDot colorId={c.color} size={14} />
                        <span className="font-semibold">
                          {c.count_per_player}×
                        </span>
                        <span>${(c.value ?? 0).toFixed(2)}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => loadPreset(p)}
                    className="text-sm px-2.5 py-1 rounded-md border border-border hover:bg-poker-soft hover:text-poker hover:border-poker-soft"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePreset(p.id)}
                    className="text-sm px-2.5 py-1 rounded-md text-muted hover:text-negative hover:bg-negative/10"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatMoney(n: number) {
  return n.toFixed(n < 1 ? 2 : 0).replace(/\.00$/, "");
}

function Section({
  n,
  title,
  open,
  onToggle,
  right,
  children,
}: {
  n: number;
  title: string;
  open: boolean;
  onToggle: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="surface">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full border border-poker text-poker text-xs font-bold inline-flex items-center justify-center">
            {n}
          </span>
          <span className="font-bold">{title}</span>
        </span>
        <span className="flex items-center gap-3">
          {right}
          <span className="text-muted">{open ? "⌃" : "⌄"}</span>
        </span>
      </button>
      {open && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  subLabel,
  children,
}: {
  label: string;
  subLabel?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-muted">
          {label}
        </div>
        {subLabel && (
          <div className="text-xs text-muted/80 mt-0.5">{subLabel}</div>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border" />;
}

function ColumnHead({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-[10px] font-bold uppercase tracking-wider text-muted ${className}`}
    >
      {children}
    </div>
  );
}

function CountInput({
  value,
  onChange,
  inputId,
  onArrowVertical,
}: {
  value: number;
  onChange: (n: number) => void;
  inputId?: string;
  onArrowVertical?: (dir: 1 | -1) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  function commit() {
    const n = parseInt(draft, 10);
    if (Number.isFinite(n) && n >= 0) onChange(n);
    else setDraft(String(value));
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      id={inputId}
      value={draft}
      onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
      onBlur={commit}
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          (e.target as HTMLInputElement).blur();
        } else if (e.key === "ArrowDown" && onArrowVertical) {
          e.preventDefault();
          commit();
          onArrowVertical(1);
        } else if (e.key === "ArrowUp" && onArrowVertical) {
          e.preventDefault();
          commit();
          onArrowVertical(-1);
        }
      }}
      className="w-10 sm:w-12 text-center tabular-nums font-semibold border-b border-dashed border-border bg-transparent focus:outline-none focus:border-poker px-0.5"
    />
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: ChipMode;
  onChange: (m: ChipMode) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-poker-soft bg-poker-faint p-0.5 text-sm font-medium whitespace-nowrap">
      <button
        type="button"
        onClick={() => onChange("denominations")}
        className={`px-3 py-1.5 rounded-full whitespace-nowrap ${
          mode === "denominations"
            ? "bg-surface shadow-sm text-poker"
            : "text-muted hover:text-foreground"
        }`}
      >
        Denominations on chips
      </button>
      <button
        type="button"
        onClick={() => onChange("unmarked")}
        className={`px-3 py-1.5 rounded-full whitespace-nowrap ${
          mode === "unmarked"
            ? "bg-surface shadow-sm text-poker"
            : "text-muted hover:text-foreground"
        }`}
      >
        Custom denominations
      </button>
    </div>
  );
}

function PresetMenu({
  presets,
  recentSets,
  onPickPreset,
  onPickRecent,
}: {
  presets: Preset[];
  recentSets: { id: string; label: string; config: ChipConfig }[];
  onPickPreset: (p: Preset) => void;
  onPickRecent: (c: ChipConfig) => void;
}) {
  return (
    <details className="relative">
      <summary className="list-none cursor-pointer marker:hidden inline-flex items-center gap-1.5 text-sm font-semibold border border-poker text-poker rounded-md px-3 py-1.5 hover:bg-poker hover:text-white">
        Choose a chip set <span>▾</span>
      </summary>
      <div className="absolute left-1/2 -translate-x-1/2 top-10 z-10 surface min-w-[16rem] py-2 shadow-lg">
        {presets.length > 0 && (
          <>
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
              Presets
            </div>
            <ul>
              {presets.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={(e) => {
                      onPickPreset(p);
                      (
                        e.currentTarget.closest(
                          "details"
                        ) as HTMLDetailsElement
                      )?.removeAttribute("open");
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-poker-soft hover:text-poker"
                  >
                    {p.name}{" "}
                    <span className="text-muted text-xs">
                      · ${Number(p.buy_in).toFixed(0)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {recentSets.length > 0 && (
          <>
            {presets.length > 0 && (
              <div className="border-t border-border my-1" />
            )}
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
              Recent games
            </div>
            <ul>
              {recentSets.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={(e) => {
                      onPickRecent(r.config);
                      (
                        e.currentTarget.closest(
                          "details"
                        ) as HTMLDetailsElement
                      )?.removeAttribute("open");
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-poker-soft hover:text-poker"
                  >
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </details>
  );
}
