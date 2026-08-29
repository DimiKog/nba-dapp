import Link from "next/link";

import { loadDraftAssets, type DraftAsset } from "@/lib/draftAssetsServer";

type PageSearchParams = Promise<{
  league?: string;
  year?: string;
  owner?: string;
  eligibility?: string;
}>;

export default async function DraftAssetsPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const league = params.league === "bdb" ? "bdb" : "ldl";
  let payload;
  try {
    payload = await loadDraftAssets(league);
  } catch {
    return <DraftAssetsUnavailable league={league} />;
  }

  const years = [...new Set(payload.assets.map((asset) => asset.draft_year))]
    .sort((left, right) => left - right);
  const owners = uniqueOwners(payload.assets);
  const selectedYear = years.includes(Number(params.year)) ? Number(params.year) : null;
  const selectedOwner = owners.some((owner) => owner.id === params.owner)
    ? params.owner ?? null
    : null;
  const selectedEligibility = params.eligibility === "eligible"
    || params.eligibility === "ineligible"
    ? params.eligibility
    : "all";
  const assets = payload.assets.filter((asset) => {
    if (selectedYear && asset.draft_year !== selectedYear) return false;
    if (selectedOwner && asset.current_owner?.id !== selectedOwner) return false;
    if (selectedEligibility === "eligible" && !asset.eligibility.eligible) return false;
    if (selectedEligibility === "ineligible" && asset.eligibility.eligible) return false;
    return true;
  });
  const conditional = payload.assets.filter(
    (asset) => asset.ownership_state === "conditional",
  ).length;
  const eligible = payload.assets.filter((asset) => asset.eligibility.eligible).length;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
            Canonical ledger
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">
            Draft Assets
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Current ownership and tradeability from the commissioner-approved ledger.
            Picks remain unpriced until the valuation model is reviewed.
          </p>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {payload.rule_set.fantasy_season} · rules v{payload.rule_set.version}
        </p>
      </header>

      <LeagueTabs active={league} />

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <Metric label="Canonical picks" value={payload.count} />
        <Metric label="Currently tradeable" value={eligible} tone="green" />
        <Metric label="Conditional ownership" value={conditional} tone={conditional ? "amber" : "neutral"} />
      </section>

      {conditional > 0 && (
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {conditional} {league === "ldl" ? "LDL" : "BδB"} picks form unresolved
          ownership pools. No exact owner is shown until the draft order resolves
          the obligations.
        </div>
      )}

      <Filters
        league={league}
        years={years}
        owners={owners}
        selectedYear={selectedYear}
        selectedOwner={selectedOwner}
        selectedEligibility={selectedEligibility}
      />

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h2 className="font-bold text-slate-950 dark:text-white">Ownership register</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {assets.length} assets match the current filters
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Unpriced
          </span>
        </div>
        {assets.length ? <AssetsTable assets={assets} /> : <EmptyState />}
      </section>
    </main>
  );
}

function LeagueTabs({ active }: { active: "ldl" | "bdb" }) {
  return (
    <div className="mt-6 flex w-fit gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {(["ldl", "bdb"] as const).map((league) => (
        <Link
          key={league}
          href={`/draft-assets?league=${league}`}
          className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
            active === league
              ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          {league === "ldl" ? "LDL" : "BδB"}
        </Link>
      ))}
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "green" | "amber";
}) {
  const color = tone === "green"
    ? "text-emerald-600 dark:text-emerald-400"
    : tone === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : "text-slate-950 dark:text-white";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function Filters({
  league,
  years,
  owners,
  selectedYear,
  selectedOwner,
  selectedEligibility,
}: {
  league: "ldl" | "bdb";
  years: number[];
  owners: Array<{ id: string; name: string }>;
  selectedYear: number | null;
  selectedOwner: string | null;
  selectedEligibility: string;
}) {
  return (
    <form className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3 lg:grid-cols-[180px_1fr_220px_auto] dark:border-slate-700 dark:bg-slate-900/60">
      <input type="hidden" name="league" value={league} />
      <FilterSelect name="year" label="Draft year" defaultValue={selectedYear?.toString() ?? ""}>
        <option value="">All years</option>
        {years.map((year) => <option key={year} value={year}>{year}</option>)}
      </FilterSelect>
      <FilterSelect name="owner" label="Current owner" defaultValue={selectedOwner ?? ""}>
        <option value="">All owners</option>
        {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
      </FilterSelect>
      <FilterSelect name="eligibility" label="Tradeability" defaultValue={selectedEligibility}>
        <option value="all">All assets</option>
        <option value="eligible">Tradeable now</option>
        <option value="ineligible">Not tradeable</option>
      </FilterSelect>
      <div className="flex items-end gap-2">
        <button className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700">
          Apply
        </button>
        <Link href={`/draft-assets?league=${league}`} className="flex h-10 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300">
          Reset
        </Link>
      </div>
    </form>
  );
}

function FilterSelect({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {label}
      <select {...props} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
        {children}
      </select>
    </label>
  );
}

function AssetsTable({ assets }: { assets: DraftAsset[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[850px] text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
          <tr>
            <th className="px-5 py-3">Pick</th>
            <th className="px-5 py-3">Original franchise</th>
            <th className="px-5 py-3">Current owner</th>
            <th className="px-5 py-3">Tradeability</th>
            <th className="px-5 py-3">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {assets.map((asset) => (
            <tr key={asset.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
              <td className="px-5 py-4">
                <p className="font-bold text-slate-950 dark:text-white">{asset.draft_year} · Round {asset.round}</p>
                <p className="text-xs text-slate-500">Original pick</p>
              </td>
              <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-300">{asset.original_franchise.name}</td>
              <td className="px-5 py-4">
                {asset.current_owner ? (
                  <span className="font-semibold text-slate-950 dark:text-white">{asset.current_owner.name}</span>
                ) : (
                  <div>
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">Conditional pool</span>
                    {asset.conditional_obligations.map((obligation) => (
                      <p key={obligation.obligation_key} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {obligation.condition_type === "best_of" ? "Higher pick" : "Lower pick"} → {obligation.beneficiary_name}
                      </p>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-5 py-4"><EligibilityBadge asset={asset} /></td>
              <td className="px-5 py-4"><span className="text-xs font-bold text-slate-500 dark:text-slate-400">UNPRICED</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EligibilityBadge({ asset }: { asset: DraftAsset }) {
  return asset.eligibility.eligible ? (
    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">Tradeable</span>
  ) : (
    <div>
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Not tradeable</span>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{eligibilityReason(asset.eligibility.reason)}</p>
    </div>
  );
}

function eligibilityReason(reason: string) {
  if (reason === "disabled_by_active_rule_set") return "Outside the permitted window";
  if (reason === "eligibility_window_not_open") return "Trading window has not opened";
  if (reason === "eligibility_window_closed") return "Trading window has closed";
  return reason.replaceAll("_", " ");
}

function uniqueOwners(assets: DraftAsset[]) {
  const owners = new Map<string, string>();
  for (const asset of assets) {
    if (asset.current_owner) owners.set(asset.current_owner.id, asset.current_owner.name);
  }
  return [...owners].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

function EmptyState() {
  return <p className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400">No draft assets match these filters.</p>;
}

function DraftAssetsUnavailable({ league }: { league: "ldl" | "bdb" }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Draft Assets unavailable</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        The protected {league === "ldl" ? "LDL" : "BδB"} ledger could not be loaded. Check the server-side API configuration.
      </p>
    </main>
  );
}
