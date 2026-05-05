"use client";

import { useState } from "react";
import ChipDot from "@/components/ChipDot";
import PlayerNameInput from "@/components/PlayerNameInput";
import { defaultValueFor, ChipRow } from "@/lib/chips";
import {
  GameState,
  GamePlayer,
  newPlayerId,
  newBuyinId,
} from "@/lib/storage";

const inputCls =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-poker/40 focus:border-poker";

function totalBuyIn(p: GamePlayer): number {
  return p.buy_ins.reduce((acc, b) => acc + Number(b.amount), 0);
}

export default function LiveView({
  game,
  onChange,
  onEnd,
  onAbandon,
}: {
  game: GameState;
  onChange: (g: GameState) => void;
  onEnd: () => void;
  onAbandon: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  const totalPot = game.players.reduce((acc, p) => acc + totalBuyIn(p), 0);
  const activeCount = game.players.filter((p) => !p.busted).length;

  function update(mut: (g: GameState) => GameState) {
    onChange(mut(game));
  }

  function addPlayer(name: string, amount: number) {
    if (!name.trim() || !Number.isFinite(amount) || amount <= 0) return;
    const dup = game.players.find(
      (p) => p.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (dup) return; // could surface error
    const now = new Date().toISOString();
    update((g) => ({
      ...g,
      players: [
        ...g.players,
        {
          id: newPlayerId(),
          name: name.trim(),
          buy_ins: [{ id: newBuyinId(), amount, created_at: now }],
          busted: false,
          joined_at: now,
        },
      ],
    }));
    setShowAdd(false);
  }

  function rebuy(playerId: string, amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const now = new Date().toISOString();
    update((g) => ({
      ...g,
      players: g.players.map((p) =>
        p.id === playerId
          ? {
              ...p,
              busted: false,
              buy_ins: [
                ...p.buy_ins,
                { id: newBuyinId(), amount, created_at: now },
              ],
            }
          : p
      ),
    }));
  }

  function toggleBust(playerId: string) {
    update((g) => ({
      ...g,
      players: g.players.map((p) =>
        p.id === playerId ? { ...p, busted: !p.busted } : p
      ),
    }));
  }

  function editBuyin(playerId: string, buyinId: string, amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    update((g) => ({
      ...g,
      players: g.players.map((p) =>
        p.id === playerId
          ? {
              ...p,
              buy_ins: p.buy_ins.map((b) =>
                b.id === buyinId ? { ...b, amount } : b
              ),
            }
          : p
      ),
    }));
  }

  function deleteBuyin(playerId: string, buyinId: string) {
    update((g) => ({
      ...g,
      players: g.players.map((p) =>
        p.id === playerId
          ? {
              ...p,
              buy_ins:
                p.buy_ins.length <= 1
                  ? p.buy_ins // keep at least one buy-in
                  : p.buy_ins.filter((b) => b.id !== buyinId),
            }
          : p
      ),
    }));
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Live Game
        </h1>
        <p className="text-sm text-muted mt-1">
          Track buy-ins, rebuys, and busts as the game progresses. Hit{" "}
          <span className="font-semibold">End Game</span> when you&apos;re done.
        </p>
      </header>

      <div className="surface p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted">
              In progress · {game.played_on}
            </div>
          </div>
          <div className="flex gap-6 text-sm tabular-nums">
            <Stat
              label="Players"
              value={`${activeCount} of ${game.players.length}`}
            />
            <Stat label="Total in pot" value={`$${totalPot.toFixed(2)}`} />
          </div>
        </div>
      </div>

      <div className="surface">
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-border">
          <h2 className="font-bold">Players</h2>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="text-sm font-semibold text-poker hover:text-poker-hover"
          >
            {showAdd ? "Cancel" : "+ Add player"}
          </button>
        </div>

        {showAdd && (
          <AddPlayerForm
            buyInDefault={
              game.chip_config?.buy_in ??
              Number(game.players[0]?.buy_ins[0]?.amount ?? 20)
            }
            onAdd={addPlayer}
            onCancel={() => setShowAdd(false)}
          />
        )}

        <ul className="divide-y divide-border">
          {game.players.map((p) => (
            <PlayerRow
              key={p.id}
              player={p}
              chipSet={
                game.chip_config && game.use_chip_calc
                  ? { chips: game.chip_config.chips }
                  : null
              }
              onRebuy={(amt) => rebuy(p.id, amt)}
              onToggleBust={() => toggleBust(p.id)}
              onEditBuyin={(bid, amt) => editBuyin(p.id, bid, amt)}
              onDeleteBuyin={(bid) => deleteBuyin(p.id, bid)}
            />
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {!confirmAbandon ? (
            <button
              type="button"
              onClick={() => setConfirmAbandon(true)}
              className="text-sm px-3 py-1.5 rounded-md border border-negative/40 text-negative hover:bg-negative hover:text-white"
            >
              Abandon game
            </button>
          ) : (
            <span className="inline-flex items-center gap-2">
              <span className="text-sm text-negative font-semibold">
                Abandon this game?
              </span>
              <button
                type="button"
                onClick={onAbandon}
                className="text-sm px-3 py-1.5 rounded-md bg-negative text-white hover:opacity-90"
              >
                Yes, abandon
              </button>
              <button
                type="button"
                onClick={() => setConfirmAbandon(false)}
                className="text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onEnd}
          className="rounded-md bg-negative text-white hover:opacity-90 font-bold px-5 py-2.5 text-base shadow-md"
        >
          End Game →
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className="font-semibold text-base">{value}</div>
    </div>
  );
}

function AddPlayerForm({
  buyInDefault,
  onAdd,
  onCancel,
}: {
  buyInDefault: number;
  onAdd: (name: string, amount: number) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(String(buyInDefault));
  return (
    <div className="px-3 sm:px-5 py-3 border-b border-border bg-poker-faint flex flex-wrap items-center gap-2">
      <div className="flex-1 min-w-[10rem]">
        <PlayerNameInput
          value={name}
          onChange={setName}
          suggestions={[]}
          autoFocus
        />
      </div>
      <span className="text-sm text-muted">$</span>
      <input
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-20 sm:w-24 rounded-md border border-border bg-surface px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-poker/40 focus:border-poker"
      />
      <button
        type="button"
        onClick={() => {
          if (!name.trim()) return;
          onAdd(name.trim(), Number(amount));
          setName("");
          setAmount(String(buyInDefault));
        }}
        disabled={!name.trim()}
        className="px-3 py-2 text-sm font-semibold rounded-md bg-poker text-white hover:bg-poker-hover disabled:opacity-50"
      >
        Add
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-sm text-muted hover:text-foreground px-2"
      >
        Cancel
      </button>
    </div>
  );
}

function PlayerRow({
  player,
  chipSet,
  onRebuy,
  onToggleBust,
  onEditBuyin,
  onDeleteBuyin,
}: {
  player: GamePlayer;
  chipSet: { chips: ChipRow[] } | null;
  onRebuy: (amount: number) => void;
  onToggleBust: () => void;
  onEditBuyin: (id: string, amount: number) => void;
  onDeleteBuyin: (id: string) => void;
}) {
  const [showRebuy, setShowRebuy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  return (
    <li className="px-3 sm:px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`font-semibold ${player.busted ? "line-through text-muted" : ""}`}
          >
            {player.name}
          </span>
          {player.busted && (
            <span className="text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded bg-negative/15 text-negative">
              bust
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs text-muted hover:text-poker hover:underline tabular-nums"
          >
            ${totalBuyIn(player).toFixed(2)} ({player.buy_ins.length})
          </button>
          <button
            type="button"
            onClick={() => setShowRebuy((v) => !v)}
            className="text-xs sm:text-sm px-2 sm:px-2.5 py-1 rounded-md border border-border hover:bg-poker-soft hover:text-poker hover:border-poker-soft"
          >
            {showRebuy ? "Cancel" : "Rebuy"}
          </button>
          <button
            type="button"
            onClick={onToggleBust}
            className={`text-xs sm:text-sm px-2 sm:px-2.5 py-1 rounded-md border ${
              player.busted
                ? "border-poker text-poker hover:bg-poker hover:text-white"
                : "border-negative/40 text-negative hover:bg-negative hover:text-white"
            }`}
          >
            {player.busted ? "Un-bust" : "Bust"}
          </button>
        </div>
      </div>

      {showRebuy && (
        <RebuyForm
          buyInDefault={Number(player.buy_ins[0]?.amount ?? 20)}
          chipSet={chipSet}
          onConfirm={(amount) => {
            onRebuy(amount);
            setShowRebuy(false);
          }}
          onCancel={() => setShowRebuy(false)}
        />
      )}

      {showHistory && player.buy_ins.length > 0 && (
        <div className="mt-3 pl-4 border-l-2 border-border space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Buy-in history
          </div>
          {player.buy_ins.map((b, idx) => (
            <BuyinRow
              key={b.id}
              buyin={b}
              isOnly={player.buy_ins.length === 1}
              isInitial={idx === 0}
              onEdit={(amount) => onEditBuyin(b.id, amount)}
              onDelete={() => onDeleteBuyin(b.id)}
            />
          ))}
        </div>
      )}
    </li>
  );
}

function RebuyForm({
  buyInDefault,
  chipSet,
  onConfirm,
  onCancel,
}: {
  buyInDefault: number;
  chipSet: { chips: ChipRow[] } | null;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(String(buyInDefault));
  const [chipCounts, setChipCounts] = useState<Record<string, number>>({});

  const chipTotal = chipSet
    ? chipSet.chips.reduce((acc, c) => {
        const v = c.value ?? defaultValueFor(c.color);
        const n = chipCounts[c.color] ?? 0;
        return acc + v * n;
      }, 0)
    : 0;
  const usingChips = chipSet && chipTotal > 0;
  const finalAmount = usingChips ? chipTotal : Number(amount);

  return (
    <div className="mt-3 p-3 rounded-md border border-border bg-poker-faint/40">
      {chipSet && (
        <>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">
            Chips taken
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {chipSet.chips.map((c) => {
              const v = c.value ?? defaultValueFor(c.color);
              return (
                <div
                  key={c.color}
                  className="flex items-center gap-2 border border-border rounded-md p-2 bg-surface"
                >
                  <ChipDot colorId={c.color} size={20} />
                  <span className="text-xs text-muted tabular-nums">
                    ${v.toFixed(2)}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={chipCounts[c.color] ?? 0}
                    onChange={(e) =>
                      setChipCounts((prev) => ({
                        ...prev,
                        [c.color]: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="ml-auto w-12 tabular-nums text-right border-b border-dashed border-border bg-transparent text-sm focus:outline-none focus:border-poker"
                  />
                </div>
              );
            })}
          </div>
          <div className="text-sm tabular-nums font-semibold mb-2">
            Chip total: ${chipTotal.toFixed(2)}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
            Or enter dollar amount directly
          </div>
        </>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted">Rebuy $</span>
        <input
          type="number"
          step="0.01"
          value={usingChips ? chipTotal.toFixed(2) : amount}
          onChange={(e) => {
            setChipCounts({});
            setAmount(e.target.value);
          }}
          className={`w-24 tabular-nums ${inputCls}`}
        />
        <button
          type="button"
          onClick={() => {
            if (Number.isFinite(finalAmount) && finalAmount > 0) {
              onConfirm(finalAmount);
            }
          }}
          disabled={!Number.isFinite(finalAmount) || finalAmount <= 0}
          className="px-3 py-1.5 text-sm font-semibold rounded-md bg-poker text-white hover:bg-poker-hover disabled:opacity-50"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function BuyinRow({
  buyin,
  isOnly,
  isInitial,
  onEdit,
  onDelete,
}: {
  buyin: { id: string; amount: number; created_at: string };
  isOnly: boolean;
  isInitial: boolean;
  onEdit: (amount: number) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(buyin.amount));
  const ts = new Date(buyin.created_at).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-[10px] uppercase tracking-wider text-muted w-14 shrink-0">
        {isInitial ? "initial" : "rebuy"}
      </span>
      {editing ? (
        <>
          <span className="text-muted">$</span>
          <input
            type="number"
            step="0.01"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-20 tabular-nums border-b border-dashed border-border bg-transparent focus:outline-none focus:border-poker text-right"
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              const n = Number(draft);
              if (Number.isFinite(n) && n > 0) onEdit(n);
              setEditing(false);
            }}
            className="text-xs text-poker font-semibold hover:underline"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setDraft(String(buyin.amount));
            }}
            className="text-xs text-muted hover:text-foreground"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className="tabular-nums font-medium">
            ${buyin.amount.toFixed(2)}
          </span>
          <span className="text-xs text-muted">{ts}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-muted hover:text-poker hover:underline ml-auto"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isOnly}
            className="text-xs text-muted hover:text-negative hover:underline disabled:opacity-30"
            title={isOnly ? "Can't delete a player's only buy-in" : "Delete"}
          >
            Delete
          </button>
        </>
      )}
    </div>
  );
}
