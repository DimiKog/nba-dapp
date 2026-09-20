"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type {
  CommissionerDraftPick,
  CommissionerFranchise,
  CompletedTradeList,
  CompletedTradeOptions,
  CompletedTradeSummary,
} from "@/lib/completedTradesServer";

type DirectedAsset = { id: number; to: string };
type SideState = { franchiseId: string; tradedPlayers: DirectedAsset[]; picks: DirectedAsset[]; drops: number[] };
type FormState = {
  sides: SideState[];
  approvedOn: string;
  fantraxAppliedOn: string;
  note: string;
  reference: string;
  syncPending: boolean;
  syncPendingReason: string;
};
type TradeAsset =
  | { type: "player"; player_id: number; from_franchise_id: string; to_franchise_id: string; roster_override_reason?: string }
  | { type: "draft_pick"; pick_id: number; from_franchise_id: string; to_franchise_id: string }
  | { type: "drop"; player_id: number; from_franchise_id: string; roster_override_reason: string };

const emptySide = (): SideState => ({ franchiseId: "", tradedPlayers: [], picks: [], drops: [] });
const emptyForm = (): FormState => ({
  sides: [emptySide(), emptySide()],
  approvedOn: athensToday(),
  fantraxAppliedOn: "",
  note: "",
  reference: "",
  syncPending: false,
  syncPendingReason: "Stored roster snapshot has not caught up",
});

export default function CommissionerTradeLedger({
  options,
  history,
}: {
  options: CompletedTradeOptions;
  history: CompletedTradeList;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [reviewing, setReviewing] = useState(false);
  const [reviewAcknowledged, setReviewAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const validation = validate(form);

  function resetForm() {
    if (!window.confirm("Discard the unrecorded trade and reset the form?")) return;
    setForm(emptyForm());
    setReviewing(false);
    setReviewAcknowledged(false);
    setSubmitting(false);
    setError(null);
    setReceipt(null);
    setIdempotencyKey(crypto.randomUUID());
  }

  function updateSide(index: number, next: SideState) {
    setForm((current) => ({
      ...current,
      sides: current.sides.map((side, at) => at === index ? next : side),
    }));
    setReviewing(false);
    setError(null);
  }

  async function submit() {
    if (!reviewing || !reviewAcknowledged) return;
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
      setReviewAcknowledged(false);
      setForm((current) => ({
        ...current,
        approvedOn: athensToday(),
        fantraxAppliedOn: "",
        note: "",
        reference: "",
        syncPending: false,
        syncPendingReason: "Stored roster snapshot has not caught up",
        sides: current.sides.map((side) => ({ ...emptySide(), franchiseId: side.franchiseId })),
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
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between dark:border-slate-700">
          <div>
            <h2 className="font-bold text-slate-950 dark:text-white">Record completed trade</h2>
            <p className="mt-1 text-xs text-slate-500">Choose 2–5 franchises and each asset’s final destination. Player search is limited to people observed on the selected team’s roster this season, including players who have since moved. Drops are not trade consideration.</p>
          </div>
          <button type="button" onClick={resetForm} disabled={submitting} className={`${secondaryButton} shrink-0 self-start`}>Reset form</button>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          {form.sides.map((side, index) => (
            <TradeSide
              key={index}
              label={`Franchise ${index + 1}`}
              franchise={options.franchises.find((item) => item.id === side.franchiseId) ?? null}
              selectedFranchiseIds={form.sides.map((item) => item.franchiseId)}
              franchises={options.franchises}
              playerCatalog={options.player_catalog ?? []}
              picks={options.draft_picks}
              state={side}
              onState={(value) => updateSide(index, value)}
              onRemove={form.sides.length > 2 ? () => {
                setForm((current) => ({ ...current, sides: current.sides.filter((_, at) => at !== index).map((item) => ({
                  ...item,
                  tradedPlayers: item.tradedPlayers.map((asset) => asset.to === side.franchiseId ? { ...asset, to: "" } : asset),
                  picks: item.picks.map((asset) => asset.to === side.franchiseId ? { ...asset, to: "" } : asset),
                })) }));
                setReviewing(false);
              } : undefined}
            />
          ))}
        </div>
        {form.sides.length < 5 && (
          <div className="px-5 pb-5">
            <button type="button" className={secondaryButton} onClick={() => { setForm((current) => ({ ...current, sides: [...current.sides, emptySide()] })); setReviewing(false); }}>+ Add franchise</button>
          </div>
        )}
        <div className="grid gap-4 border-t border-slate-200 bg-slate-50 p-5 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-950/30">
          <Field label="Approved on (Discord poll)">
            <input id="trade-approved-on" type="date" value={form.approvedOn} onChange={(event) => { setForm({ ...form, approvedOn: event.target.value }); setReviewing(false); }} className={inputClass} />
            <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-slate-500">Use the date the poll approved the trade. No time is needed.</span>
          </Field>
          <Field label="Applied in Fantrax on (optional)">
            <input type="date" value={form.fantraxAppliedOn} onChange={(event) => { setForm({ ...form, fantraxAppliedOn: event.target.value }); setReviewing(false); }} className={inputClass} />
            <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-slate-500">Leave blank if you do not know when the roster change appeared. This may differ from the approval date.</span>
          </Field>
          <Field label="External reference (optional)">
            <input value={form.reference} onChange={(event) => { setForm({ ...form, reference: event.target.value }); setReviewing(false); }} className={inputClass} placeholder="Fantrax or sheet reference" />
          </Field>
          <label className="sm:col-span-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Commissioner note (optional)
            <textarea value={form.note} onChange={(event) => { setForm({ ...form, note: event.target.value }); setReviewing(false); }} className={`${inputClass} mt-1 min-h-20 py-2`} />
          </label>
          <label className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 normal-case tracking-normal text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            <input
              type="checkbox"
              checked={form.syncPending}
              onChange={(event) => { setForm({ ...form, syncPending: event.target.checked }); setReviewing(false); }}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-bold">Latest stored roster snapshot has not caught up</span>
              <span className="mt-1 block text-xs font-medium opacity-80">Use only when the app still observes players on their sending team. This does not bypass the pre-trade sender check.</span>
            </span>
          </label>
          {form.syncPending && (
            <Field label="Why is roster verification pending?">
              <input
                value={form.syncPendingReason}
                onChange={(event) => { setForm({ ...form, syncPendingReason: event.target.value }); setReviewing(false); }}
                className={inputClass}
                placeholder="Why is the stored snapshot still showing the sending team?"
              />
            </Field>
          )}
        </div>

        {receipt && <Notice tone="success">Trade recorded with receipt {receipt}.</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        {reviewing && !validation && (
          <Review
            form={form}
            options={options}
            acknowledged={reviewAcknowledged}
            onAcknowledge={setReviewAcknowledged}
            onEditDate={() => {
              setReviewing(false);
              document.getElementById("trade-approved-on")?.focus();
            }}
          />
        )}
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
          {validation && <p className="mr-auto self-center text-xs font-semibold text-slate-500">{validation}</p>}
          {reviewing && <button type="button" onClick={() => setReviewing(false)} className={secondaryButton}>Edit</button>}
          <button
            type="button"
            disabled={Boolean(validation) || submitting || (reviewing && !reviewAcknowledged)}
            onClick={() => {
              if (reviewing) void submit();
              else {
                setReviewAcknowledged(false);
                setReviewing(true);
                window.setTimeout(() => document.getElementById("trade-final-review")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
              }
            }}
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

function TradeSide({ label, franchise, selectedFranchiseIds, franchises, playerCatalog, picks, state, onState, onRemove }: {
  label: string;
  franchise: CommissionerFranchise | null;
  selectedFranchiseIds: string[];
  franchises: CommissionerFranchise[];
  playerCatalog: CompletedTradeOptions["player_catalog"];
  picks: CommissionerDraftPick[];
  state: SideState;
  onState: (value: SideState) => void;
  onRemove?: () => void;
}) {
  const ownedPicks = picks.filter((pick) => pick.current_owner.id === franchise?.id);
  const traded = new Set(state.tradedPlayers.map((asset) => asset.id));
  const dropped = new Set(state.drops);
  const destinations = franchises.filter((item) => selectedFranchiseIds.includes(item.id) && item.id !== franchise?.id);
  const defaultDestination = destinations.length === 1 ? destinations[0].id : "";
  const playerNames = new Map(playerCatalog.map((player) => [player.id, player.name]));
  const currentPlayerIds = new Set(franchise?.players.map((player) => player.id) ?? []);
  const eligiblePlayerIds = new Set([...(franchise?.historical_player_ids ?? []), ...currentPlayerIds]);
  const eligiblePlayers = playerCatalog
    .filter((player) => eligiblePlayerIds.has(player.id))
    .sort((a, b) => Number(currentPlayerIds.has(b.id)) - Number(currentPlayerIds.has(a.id)) || a.name.localeCompare(b.name));
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex items-start gap-2">
      <Field label={label}>
        <select value={franchise?.id ?? ""} onChange={(event) => onState({ ...emptySide(), franchiseId: event.target.value })} className={inputClass}>
          <option value="">Select franchise</option>
          {franchises.filter((item) => item.id === franchise?.id || !selectedFranchiseIds.includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </Field>
      {onRemove && <button type="button" onClick={onRemove} className="mt-5 text-xs font-bold text-red-700 dark:text-red-300">Remove</button>}
      </div>
      {franchise && (
        <div className="mt-4 space-y-4">
          <AssetChoices
            key={franchise.id}
            title="Players sent"
            items={eligiblePlayers.map((player) => ({ id: player.id, label: `${player.name} · ${player.position || "—"} · ${player.nba_team || "—"} · ID ${player.id}`, context: currentPlayerIds.has(player.id) ? "Current roster" : "Earlier roster" }))}
            selected={state.tradedPlayers.map((asset) => asset.id)}
            disabled={dropped}
            maximum={15}
            requireQuery
            onChange={(ids) => onState({ ...state, tradedPlayers: ids.map((id) => state.tradedPlayers.find((asset) => asset.id === id) ?? { id, to: defaultDestination }) })}
          />
          <p className="text-[11px] text-slate-500">Only players observed on {franchise.name} this season are selectable. The server checks the roster snapshot before the trade time.</p>
          <Destinations title="Player destinations" assets={state.tradedPlayers} names={playerNames} destinations={destinations} onChange={(tradedPlayers) => onState({ ...state, tradedPlayers })} />
          <AssetChoices
            title="Draft picks sent"
            items={ownedPicks.map((pick) => ({ id: pick.id, label: `${pick.draft_year} Round ${pick.round} · ${pick.original_franchise.name}` }))}
            selected={state.picks.map((asset) => asset.id)}
            onChange={(ids) => onState({ ...state, picks: ids.map((id) => state.picks.find((asset) => asset.id === id) ?? { id, to: defaultDestination }) })}
          />
          <Destinations title="Pick destinations" assets={state.picks} names={new Map(picks.map((pick) => [pick.id, `${pick.draft_year} R${pick.round} (${pick.original_franchise.name})`]))} destinations={destinations} onChange={(selected) => onState({ ...state, picks: selected })} />
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
          <p className="text-[11px] text-slate-400">Current roster observed {formatDate(franchise.roster_captured_at)}. A player without pre-trade sender evidence cannot be recorded.</p>
        </div>
      )}
    </div>
  );
}

function Destinations({ title, assets, names, destinations, onChange }: {
  title: string;
  assets: DirectedAsset[];
  names: Map<number, string>;
  destinations: CommissionerFranchise[];
  onChange: (assets: DirectedAsset[]) => void;
}) {
  if (assets.length === 0) return null;
  return <fieldset className="space-y-2 rounded-lg border border-blue-200 p-3 dark:border-blue-900">
    <legend className="px-1 text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">{title}</legend>
    {assets.map((asset) => <Field key={asset.id} label={names.get(asset.id) ?? `Asset ${asset.id}`}>
      <select value={asset.to} onChange={(event) => onChange(assets.map((item) => item.id === asset.id ? { ...item, to: event.target.value } : item))} className={inputClass}>
        <option value="">Choose final recipient</option>
        {destinations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </Field>)}
  </fieldset>;
}

function AssetChoices({ title, items, selected, disabled = new Set(), maximum, requireQuery = false, onChange }: {
  title: string;
  items: Array<{ id: number; label: string; context?: string }>;
  selected: number[];
  disabled?: Set<number>;
  maximum?: number;
  requireQuery?: boolean;
  onChange: (selected: number[]) => void;
}) {
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = (label: string) => !needle || label.toLowerCase().includes(needle);
    const pinned = items.filter((item) => selectedSet.has(item.id));
    const rest = items.filter((item) => !selectedSet.has(item.id) && (!requireQuery || needle.length >= 2) && matches(item.label)).slice(0, 30);
    return [...pinned, ...rest];
  }, [items, query, selectedSet, requireQuery]);
  const showFilter = requireQuery || items.length > 5;
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
          <p className="px-2 py-1 text-xs text-slate-400">{requireQuery && query.trim().length < 2 ? "Type at least 2 characters to search players" : `No matches for “${query.trim()}”`}</p>
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
              {item.context && <span className="ml-auto shrink-0 text-[10px] font-semibold text-slate-500">{item.context}</span>}
            </label>
          );
        })}
      </div>
      {showFilter && query.trim() && (
        <p className="mt-1 text-[11px] text-slate-400">
          Showing {visible.length} of {items.length}
          {hiddenByFilter > 0 ? ` · ${hiddenByFilter} more available` : ""}
          {selected.length > 0 ? " · selected stay visible" : ""}
        </p>
      )}
    </fieldset>
  );
}

function Review({ form, options, acknowledged, onAcknowledge, onEditDate }: {
  form: FormState;
  options: CompletedTradeOptions;
  acknowledged: boolean;
  onAcknowledge: (value: boolean) => void;
  onEditDate: () => void;
}) {
  // The review reads the same asset list that submit() sends to the backend.
  const assets = buildPayload(form, options).assets;
  const transfers = assets.filter((asset) => asset.type !== "drop");
  const drops = assets.filter((asset) => asset.type === "drop");
  const franchiseNames = new Map(options.franchises.map((item) => [item.id, item.name]));
  const playerNames = new Map((options.player_catalog ?? []).map((player) => [player.id, player.name]));
  const pickNames = new Map(options.draft_picks.map((pick) => [pick.id, `${pick.draft_year} Round ${pick.round} (originally ${pick.original_franchise.name})`]));

  return (
    <section id="trade-final-review" aria-label="Final trade review" className="mx-5 mb-5 space-y-4 rounded-xl border-2 border-blue-400 bg-blue-50 p-4 text-sm dark:border-blue-700 dark:bg-blue-950/30">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">Final review · {form.sides.length} teams · {transfers.length} transfers</p>
        <h3 className="mt-1 text-lg font-bold text-blue-950 dark:text-blue-100">Check every transfer before recording</h3>
        <p className="mt-1 text-xs text-blue-900 dark:text-blue-200">This creates a permanent ledger entry and cannot be edited afterward. Fantrax rosters are not changed.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide">Approved by poll on</p>
          <p data-testid="review-trade-date" className="mt-1 text-lg font-bold tabular-nums">{form.approvedOn}</p>
          <p className="mt-1 text-xs">Applied in Fantrax: {form.fantraxAppliedOn || "date not supplied"}. The ledger recording time is saved automatically and is not the trade approval time.</p>
        </div>
        <button type="button" onClick={onEditDate} className="rounded-lg border border-amber-500 px-3 py-2 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40">Change date</button>
      </div>

      <div className="overflow-hidden rounded-lg border border-blue-200 bg-white dark:border-blue-800 dark:bg-slate-900">
        <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] gap-3 bg-blue-100 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-blue-900 sm:grid dark:bg-blue-950/60 dark:text-blue-200">
          <span>From</span><span>Player or pick</span><span>To</span>
        </div>
        <ol aria-label="Trade transfers" className="divide-y divide-blue-100 dark:divide-blue-900">
          {transfers.map((asset) => (
            <li key={`${asset.type}-${asset.type === "player" ? asset.player_id : asset.pick_id}`} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] sm:items-center sm:gap-3">
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-500 sm:hidden">From</span>
                <span className="font-semibold text-slate-900 dark:text-white">{franchiseNames.get(asset.from_franchise_id) ?? asset.from_franchise_id}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-500">{asset.type === "player" ? "Player" : "Draft pick"}</span>
                <span className="font-semibold text-slate-950 dark:text-white">{asset.type === "player" ? playerNames.get(asset.player_id) ?? `Player ${asset.player_id}` : pickNames.get(asset.pick_id) ?? `Pick ${asset.pick_id}`}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-500 sm:hidden">To</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">→ {franchiseNames.get(asset.to_franchise_id) ?? asset.to_franchise_id}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {drops.length > 0 && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/30">
          <p className="font-bold text-rose-900 dark:text-rose-200">Roster drops · not sent to another team</p>
          <ul className="mt-1 space-y-1 text-xs text-rose-900 dark:text-rose-200">
            {drops.map((asset) => <li key={`drop-${asset.player_id}`}>{franchiseNames.get(asset.from_franchise_id) ?? asset.from_franchise_id} drops {playerNames.get(asset.player_id) ?? `Player ${asset.player_id}`}</li>)}
          </ul>
        </div>
      )}
      {form.syncPending && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
          Stored roster verification will be pending: {form.syncPendingReason}
        </p>
      )}

      <label className="flex items-start gap-3 rounded-lg border border-blue-300 bg-white p-3 font-semibold text-blue-950 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-100">
        <input type="checkbox" checked={acknowledged} onChange={(event) => onAcknowledge(event.target.checked)} className="mt-1" />
        <span>I checked the trade date, every asset, and each destination against the source announcement.</span>
      </label>
      <p className="text-xs text-blue-800 dark:text-blue-200">Confirm and record becomes available only after this check.</p>
    </section>
  );
}

function TradeHistory({ history }: { history: CompletedTradeList }) {
  const router = useRouter();
  const [reconciling, setReconciling] = useState<string | null>(null);
  const [reconcileError, setReconcileError] = useState<string | null>(null);

  async function reconcile(tradeId: string) {
    setReconciling(tradeId);
    setReconcileError(null);
    try {
      const response = await fetch(
        `/api/fantasy/${history.league_slug}/commissioner/completed-trades/${tradeId}/reconcile-roster`,
        { method: "POST" },
      );
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || `Reconciliation returned ${response.status}`);
      router.refresh();
    } catch (caught) {
      setReconcileError(caught instanceof Error ? caught.message : "Roster reconciliation failed");
    } finally {
      setReconciling(null);
    }
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h2 className="font-bold text-slate-950 dark:text-white">Recorded trades</h2>
        <p className="text-xs text-slate-500">{history.count} canonical records</p>
      </div>
      {reconcileError && <Notice tone="error">{reconcileError}</Notice>}
      {history.trades.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-500">No completed trades have been recorded yet.</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {history.trades.map((trade) => (
            <div key={trade.public_id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">{trade.participants?.length ? trade.participants.map((item) => item.name).join(" · ") : `${trade.franchise_a_name} ↔ ${trade.franchise_b_name}`}</p>
                <p className="text-xs text-slate-500">{trade.asset_count} assets · {trade.date_precision === "day" && trade.approved_on ? `Approved ${trade.approved_on}` : `Legacy trade time ${new Date(trade.occurred_at).toLocaleString()}`}{trade.fantrax_applied_on ? ` · Fantrax ${trade.fantrax_applied_on}` : ""}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <RosterStatus status={trade.roster_status} />
                {trade.roster_status === "sync_pending" && (
                  <button
                    type="button"
                    disabled={reconciling === trade.public_id}
                    onClick={() => void reconcile(trade.public_id)}
                    className={secondaryButton}
                  >
                    {reconciling === trade.public_id ? "Checking…" : "Check Fantrax sync"}
                  </button>
                )}
                <code className="text-[11px] text-slate-400">{trade.public_id}</code>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RosterStatus({ status }: { status: CompletedTradeSummary["roster_status"] }) {
  const config = {
    matched_post_trade: ["Fantrax matched", "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"],
    sync_pending: ["Sync pending", "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"],
    not_observed: ["Not observed", "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"],
  }[status];
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${config[1]}`}>{config[0]}</span>;
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
  const ids = form.sides.map((side) => side.franchiseId);
  if (ids.some((id) => !id)) return "Select every participating franchise";
  if (new Set(ids).size !== ids.length) return "The franchises must be different";
  if (!validPastDate(form.approvedOn)) return "Choose a valid poll approval date that is not in the future";
  if (form.fantraxAppliedOn && !validPastDate(form.fantraxAppliedOn)) return "Choose a valid Fantrax date that is not in the future";
  if (form.syncPending && !form.syncPendingReason.trim()) return "Explain why Fantrax roster verification is pending";
  const sentPlayers = form.sides.flatMap((side) => side.tradedPlayers.map((asset) => asset.id));
  const sentPicks = form.sides.flatMap((side) => side.picks.map((asset) => asset.id));
  const drops = form.sides.flatMap((side) => side.drops);
  if (new Set(sentPlayers).size !== sentPlayers.length || new Set(sentPicks).size !== sentPicks.length || new Set(drops).size !== drops.length || sentPlayers.some((id) => drops.includes(id))) return "An asset can appear only once in the trade";
  for (const side of form.sides) {
    if (side.tradedPlayers.length + side.picks.length === 0) return "Every franchise must send a player or pick";
    if (side.tradedPlayers.some((asset) => !asset.to || asset.to === side.franchiseId || !ids.includes(asset.to)) || side.picks.some((asset) => !asset.to || asset.to === side.franchiseId || !ids.includes(asset.to))) return "Choose a valid final recipient for every asset";
    if (!form.sides.some((other) => [...other.tradedPlayers, ...other.picks].some((asset) => asset.to === side.franchiseId))) return "Every franchise must receive an asset";
  }
  return null;
}

function buildPayload(form: FormState, options: CompletedTradeOptions) {
  const assets: TradeAsset[] = [];
  for (const side of form.sides) {
    side.tradedPlayers.forEach(({ id: player_id, to }) => assets.push({
      type: "player",
      player_id,
      from_franchise_id: side.franchiseId,
      to_franchise_id: to,
      roster_override_reason: form.syncPending ? form.syncPendingReason.trim() : undefined,
    }));
    side.picks.forEach(({ id: pick_id, to }) => assets.push({ type: "draft_pick", pick_id, from_franchise_id: side.franchiseId, to_franchise_id: to }));
    side.drops.forEach((player_id) => assets.push({ type: "drop", player_id, from_franchise_id: side.franchiseId, roster_override_reason: "Commissioner-declared roster completion drop" }));
  }
  return {
    fantasy_season: options.fantasy_season,
    approved_on: form.approvedOn,
    fantrax_applied_on: form.fantraxAppliedOn || undefined,
    franchise_ids: form.sides.map((side) => side.franchiseId),
    assets,
    commissioner_note: form.note || undefined,
    external_reference: form.reference || undefined,
  };
}

function athensToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Athens", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (name: string) => parts.find((item) => item.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function validPastDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value <= athensToday();
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "not available";
}

const inputClass = "mt-1 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white";
const secondaryButton = "rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200";
