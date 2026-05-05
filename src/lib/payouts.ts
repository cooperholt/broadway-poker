// Optimal-payout math for settling up at the end of a game.
//
// The "minimum transactions" problem (who pays whom to clear all balances)
// is NP-hard in general, but a simple greedy "biggest debtor pays biggest
// creditor" produces the minimum number of transactions in nearly every
// real home-game shape and is way easier to read than an exact solver.
//
// We collapse to two-decimal cents to avoid 0.30000000004 floating-point
// drift in chains of subtractions.

export type SettlementInput = {
  player_id?: string | null;
  name: string;
  net: number;
};

export type Transaction = {
  from: string;
  to: string;
  amount: number;
  from_player_id?: string | null;
  to_player_id?: string | null;
};

const EPSILON = 0.005;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function computePayouts(players: SettlementInput[]): Transaction[] {
  // Working copies so we don't mutate caller data.
  const creditors = players
    .filter((p) => p.net > EPSILON)
    .map((p) => ({ ...p, net: round2(p.net) }))
    .sort((a, b) => b.net - a.net);

  const debtors = players
    .filter((p) => p.net < -EPSILON)
    .map((p) => ({ ...p, net: round2(-p.net) })) // flip to positive owed
    .sort((a, b) => b.net - a.net);

  const transactions: Transaction[] = [];
  let i = 0;
  let j = 0;
  // Bound the loop conservatively in case of weird numerical edge cases.
  const safetyLimit = (creditors.length + debtors.length) * 4;
  let iterations = 0;
  while (
    i < creditors.length &&
    j < debtors.length &&
    iterations < safetyLimit
  ) {
    iterations++;
    const c = creditors[i];
    const d = debtors[j];
    const amount = round2(Math.min(c.net, d.net));
    if (amount <= 0) break;
    transactions.push({
      from: d.name,
      to: c.name,
      amount,
      from_player_id: d.player_id ?? null,
      to_player_id: c.player_id ?? null,
    });
    c.net = round2(c.net - amount);
    d.net = round2(d.net - amount);
    if (c.net < EPSILON) i++;
    if (d.net < EPSILON) j++;
  }
  return transactions;
}
