import FantasyTradeAnalyzerPage from "@/components/FantasyTradeAnalyzerPage";
import type { TradeBasis } from "@/lib/api";

export default async function LDLTradeAnalyzerPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
  return (
    <FantasyTradeAnalyzerPage
      league="ldl"
      teamId={teamId}
      initialState={initialState(query)}
    />
  );
}

function initialState(query: Record<string, string | string[] | undefined>) {
  const value = (key: string) => typeof query[key] === "string" ? query[key] : "";
  return {
    mode: value("mode") === "partners" ? "partners" as const : "analyze" as const,
    outgoing: value("outgoing"),
    incoming: value("incoming"),
    partner: value("partner"),
    basis: (value("basis") === "window" ? "window" : "season") as TradeBasis,
  };
}
