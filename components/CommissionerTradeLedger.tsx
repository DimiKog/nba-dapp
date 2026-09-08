"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type {
  CommissionerDraftPick,
  CommissionerFranchise,
  CompletedTradeList,
  CompletedTradeOptions,
} from "@/lib/completedTradesServer";

type SideState = { tradedPlayers: number[]; picks: number[]; drops: number[] };
type FormState = {
  franchiseA: string;
  franchiseB: string;
  occurredAt: string;
  note: string;
  reference: string;
  a: SideState;
  b: SideState;
};

const emptySide = (): SideState => ({ tradedPlayers: [], picks: [], drops: [] });

export default function CommissionerTradeLedger({
  options,
  history,
}: {
  options: CompletedTradeOptions;
  history: CompletedTradeList;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    franchiseA: "",
    franchiseB: "",
    occurredAt: localDateTimeValue(new Date()),
    note: "",
    reference: "",
    a: emptySide(),
    b: emptySide(),
  });
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const franchiseA = options.franchises.find((item) => item.id === form.franchiseA) ?? null;
  const franchiseB = options.franchises.find((item) => item.id === form.franchiseB) ?? null;
  const validation = validate(form);

  function selectFranchise(side: "a" | "b", value: string) {
    setForm((current) => ({
      ...current,
      [side === "a" ? "franchiseA" : "franchiseB"]: value,
      [side]: emptySide(),
    }));
    setReviewing(false);
    setError(null);
  }

  async function submit() {
    if (validation) return setError(validation);
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/fantasy/${options.league_slug}/commissioner/completed-trades`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify(buildPayload(form, options)),
        },
      );
      const body = await response.json() as { public_id?: string; error?: string };
      if (!response.ok) throw new Error(body.error || `Trade ledger returned ${response.status}`);
      setReceipt(body.public_id ?? "Recorded");
      setReviewing(false);
      setForm((current) => ({
        ...current,
        occurredAt: localDateTimeValue(new Date()),
        note: "",
        reference: "",
        a: emptySide(),
        b: emptySide(),
      }));
      setIdempotencyKey(crypto.randomUUID());
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Completed trade could not be recorded");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Commissioner tools</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">Completed trade ledger</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            Record the terms of a trade after roster changes have been applied. This writes the canonical trade and pick history; it never edits Fantrax rosters.
          </p>
        </div>
        <p className="text-xs text-slate-500">{options.fantasy_season}</p>
      </header>

      <LeagueTabs active={options.league_slug} />

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="font-bold text-slate-950 dark:text-white">Record completed trade</h2>
          <p className="mt-1 text-xs text-slate-500">Maximum two traded players per side. Drops complete roster legality but are not trade consideration.</p>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <TradeSide
            label="Franchise A"
            franchise={franchiseA}
            otherId={form.franchiseB}
            franchises={options.franchises}
            picks={options.draft_picks}
            state={form.a}
            onFranchise={(value) => selectFranchise("a", value)}
            onState={(value) => { setForm((current) => ({ ...current, a: value })); setReviewing(false); }}
          />
          <TradeSide
            label="Franchise B"
            franchise={franchiseB}
            otherId={form.franchiseA}
            franchises={options.franchises}
            picks={options.draft_picks}
            state={form.b}
            onFranchise={(value) => selectFranchise("b", value)}
            onState={(value) => { setForm((current) => ({ ...current, b: value })); setReviewing(false); }}
          />
        </div>
        <div className="grid gap-4 border-t border-slate-200 bg-slate-50 p-5 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-950/30">
          <Field label="Trade completed at">
            <input type="datetime-local" value={form.occurredAt} onChange={(event) => setForm({ ...form, occurredAt: event.target.value })} className={inputClass} />
          </Field>
          <Field label="External reference (optional)">
            <input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} className={inputClass} placeholder="Fantrax or sheet reference" />
          </Field>
          <label className="sm:col-span-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Commissioner note (optional)
            <textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className={`${inputClass} mt-1 min-h-20 py-2`} />
          </label>
        </div>

        {receipt && <Notice tone="success">Trade recorded with receipt {receipt}.</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        {reviewing && !validation && (
          <Review form={form} options={options} franchiseA={franchiseA!} franchiseB={franchiseB!} />
        )}
        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
          {validation && <p className="mr-auto self-center text-xs font-semibold text-slate-500">{validation}</p>}
          {reviewing && <button type="button" onClick={() => setReviewing(false)} className={secondaryButton}>Edit</button>}
          <button
            type="button"
            disabled={Boolean(validation) || submitting}
            onClick={() => reviewing ? void submit() : setReviewing(true)}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Recording…" : reviewing ? "Confirm and record" : "Review trade"}
          </button>
        </div>
      </section>

      <TradeHistory history={history} />
    </main>
  );
}

function TradeSide({ label, franchise, otherId, franchises, picks, state, onFranchise, onState }: {
  label: string;
  franchise: CommissionerFranchise | null;
  otherId: string;
  franchises: CommissionerFranchise[];
  picks: CommissionerDraftPick[];
  state: SideState;
  onFranchise: (value: string) => void;
  onState: (value: SideState) => void;
}) {
  const ownedPicks = picks.filter((pick) => pick.current_owner.id === franchise?.id);
  const traded = new Set(state.tradedPlayers);
  const dropped = new Set(state.drops);
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <Field label={label}>
        <select value={franchise?.id ?? ""} onChange={(event) => onFranchise(event.target.value)} className={inputClass}>
          <option value="">Select franchise</option>
          {franchises.filter((item) => item.id !== otherId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </Field>
      {franchise && (
        <div className="mt-4 space-y-4">
          <AssetChoices
            title="Players sent"
            items={franchise.players.map((player) => ({ id: player.id, label: `${player.name} · ${player.position || "—"}` }))}
            selected={state.tradedPlayers}
            disabled={dropped}
            maximum={2}
            onChange={(tradedPlayers) => onState({ ...state, tradedPlayers })}
          />
          <AssetChoices
            title="Draft picks sent"
            items={ownedPicks.map((pick) => ({ id: pick.id, label: `${pick.draft_year} Round ${pick.round} · ${pick.original_franchise.name}` }))}
            selected={state.picks}
            onChange={(selected) => onState({ ...state, picks: selected })}
          />
          <AssetChoices
            title="Players dropped to complete roster"
            items={franchise.players.map((player) => ({ id: player.id, label: `${player.name} · ${player.position || "—"}` }))}
            selected={state.drops}
            disabled={traded}
            onChange={(drops) => onState({ ...state, drops })}
          />
          {franchise.unmapped_player_count > 0 && (
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">{franchise.unmapped_player_count} roster players are unavailable because they have no internal player mapping.</p>
          )}
          <p className="text-[11px] text-slate-400">Roster observed {formatDate(franchise.roster_captured_at)}</p>
        </div>
      )}
    </div>
  );
}

function AssetChoices({ title, items, selected, disabled = new Set(), maximum, onChange }: {
  title: string;
  items: Array<{ id: number; label: string }>;
  selected: number[];
  disabled?: Set<number>;
  maximum?: number;
  onChange: (selected: number[]) => void;
}) {
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = (label: string) => !needle || label.toLowerCase().includes(needle);
    const pinned = items.filter((item) => selectedSet.has(item.id));
    const rest = items.filter((item) => !selectedSet.has(item.id) && matches(item.label));
    return [...pinned, ...rest];
  }, [items, query, selectedSet]);
  const showFilter = items.length > 5;
  const hiddenByFilter = Math.max(
    items.filter((item) => !selectedSet.has(item.id)).length - visible.filter((item) => !selectedSet.has(item.id)).length,
    0,
  );

  return (
    <fieldset>
      <legend className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</legend>
      {showFilter && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter list…"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          {selected.length > 0 && (
            <span className="shrink-0 text-[11px] font-semibold text-slate-400">
              {selected.length} selected
            </span>
          )}
        </div>
      )}
      <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60">
        {items.length === 0 && <p className="px-2 py-1 text-xs text-slate-400">No eligible assets</p>}
        {items.length > 0 && visible.length === 0 && (
          <p className="px-2 py-1 text-xs text-slate-400">No matches for “{query.trim()}”</p>
        )}
        {visible.map((item) => {
          const checked = selectedSet.has(item.id);
          const limitReached = Boolean(maximum && selected.length >= maximum && !checked);
          const filteredOutButSelected = checked && query.trim() && !item.label.toLowerCase().includes(query.trim().toLowerCase());
          return (
            <label
              key={item.id}
              className={`flex items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700 ${
                filteredOutButSelected ? "bg-blue-50 dark:bg-blue-950/30" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled.has(item.id) || limitReached}
                onChange={() => onChange(checked ? selected.filter((id) => id !== item.id) : [...selected, item.id])}
              />
              <span className="min-w-0 truncate">{item.label}</span>
            </label>
          );
        })}
      </div>
      {showFilter && query.trim() && (
        <p className="mt-1 text-[11px] text-slate-400">
          Showing {visible.length} of {items.length}
          {hiddenByFilter > 0 ? ` · ${hiddenByFilter} hidden by filter` : ""}
          {selected.length > 0 ? " · selected stay visible" : ""}
        </p>
      )}
    </fieldset>
  );
}

function Review({ form, options, franchiseA, franchiseB }: {
  form: FormState;
  options: CompletedTradeOptions;
  franchiseA: CommissionerFranchise;
  franchiseB: CommissionerFranchise;
}) {
  return (
    <div className="mx-5 mb-5 rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm dark:border-blue-800 dark:bg-blue-950/30">
      <p className="font-bold text-blue-950 dark:text-blue-100">Final review — this creates an immutable ledger entry</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <ReviewSide franchise={franchiseA} side={form.a} picks={options.draft_picks} />
        <ReviewSide franchise={franchiseB} side={form.b} picks={options.draft_picks} />
      </div>
      <p className="mt-3 text-xs text-blue-800 dark:text-blue-200">Recorded time: {new Date(form.occurredAt).toLocaleString()} · Fantrax rosters are not modified.</p>
    </div>
  );
}

function ReviewSide({ franchise, side, picks }: { franchise: CommissionerFranchise; side: SideState; picks: CommissionerDraftPick[] }) {
  const names = useMemo(() => new Map(franchise.players.map((player) => [player.id, player.name])), [franchise.players]);
  const pickNames = useMemo(() => new Map(picks.map((pick) => [pick.id, `${pick.draft_year} R${pick.round} (${pick.original_franchise.name})`])), [picks]);
  return (
    <div>
      <p className="font-bold">{franchise.name} sends</p>
      <p>{side.tradedPlayers.map((id) => names.get(id)).join(", ") || "No players"}</p>
      <p>{side.picks.map((id) => pickNames.get(id)).join(", ") || "No picks"}</p>
      {side.drops.length > 0 && <p className="mt-1 text-red-700 dark:text-red-300">Drops: {side.drops.map((id) => names.get(id)).join(", ")}</p>}
    </div>
  );
}

function TradeHistory({ history }: { history: CompletedTradeList }) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h2 className="font-bold text-slate-950 dark:text-white">Recorded trades</h2>
        <p className="text-xs text-slate-500">{history.count} canonical records</p>
      </div>
      {history.trades.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-500">No completed trades have been recorded yet.</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {history.trades.map((trade) => (
            <div key={trade.public_id} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">{trade.franchise_a_name} ↔ {trade.franchise_b_name}</p>
                <p className="text-xs text-slate-500">{trade.asset_count} assets · {new Date(trade.occurred_at).toLocaleString()}</p>
              </div>
              <code className="text-[11px] text-slate-400">{trade.public_id}</code>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LeagueTabs({ active }: { active: "ldl" | "bdb" }) {
  return (
    <div className="mt-6 flex w-fit gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {(["ldl", "bdb"] as const).map((league) => <Link key={league} href={`/commissioner/trades?league=${league}`} className={`rounded-lg px-5 py-2 text-sm font-semibold ${active === league ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>{league === "ldl" ? "LDL" : "BδB"}</Link>)}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}{children}</label>;
}

function Notice({ tone, children }: { tone: "success" | "error"; children: React.ReactNode }) {
  return <div className={`mx-5 mb-5 rounded-lg px-4 py-3 text-sm font-semibold ${tone === "success" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200"}`}>{children}</div>;
}

function validate(form: FormState): string | null {
  if (!form.franchiseA || !form.franchiseB) return "Select two franchises";
  if (form.franchiseA === form.franchiseB) return "The franchises must be different";
  const occurredAt = new Date(form.occurredAt).getTime();
  if (!form.occurredAt || Number.isNaN(occurredAt) || occurredAt > Date.now()) return "Choose a completed time that is not in the future";
  if (form.a.tradedPlayers.length + form.a.picks.length === 0) return "Franchise A must send a player or pick";
  if (form.b.tradedPlayers.length + form.b.picks.length === 0) return "Franchise B must send a player or pick";
  return null;
}

function buildPayload(form: FormState, options: CompletedTradeOptions) {
  const assets: Array<Record<string, unknown>> = [];
  for (const [side, from, to] of [[form.a, form.franchiseA, form.franchiseB], [form.b, form.franchiseB, form.franchiseA]] as const) {
    side.tradedPlayers.forEach((player_id) => assets.push({ type: "player", player_id, from_franchise_id: from, to_franchise_id: to }));
    side.picks.forEach((pick_id) => assets.push({ type: "draft_pick", pick_id, from_franchise_id: from, to_franchise_id: to }));
    side.drops.forEach((player_id) => assets.push({ type: "drop", player_id, from_franchise_id: from, roster_override_reason: "Commissioner-declared roster completion drop" }));
  }
  return {
    fantasy_season: options.fantasy_season,
    occurred_at: new Date(form.occurredAt).toISOString(),
    franchise_a_id: form.franchiseA,
    franchise_b_id: form.franchiseB,
    assets,
    commissioner_note: form.note || undefined,
    external_reference: form.reference || undefined,
  };
}

function localDateTimeValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "not available";
}

const inputClass = "mt-1 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white";
const secondaryButton = "rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200";
