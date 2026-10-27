import { verifyCloudflareAccess } from "@/lib/cloudflareAccess";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://mybackend.dimikog.org";

export async function GET(
  request: Request,
  context: { params: Promise<{ league: string; teamId: string }> },
) {
  if (!await verifyCloudflareAccess(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { league, teamId } = await context.params;
  if (!["ldl", "bdb", "gnfc"].includes(league) || !/^[a-zA-Z0-9_-]{1,80}$/.test(teamId)) {
    return Response.json({ error: "Invalid league or team" }, { status: 400 });
  }
  const response = await fetch(
    `${BACKEND}/api/fantasy/${league}/roster/${encodeURIComponent(teamId)}/period-category-baseline`,
    { cache: "no-store", signal: AbortSignal.timeout(15000) },
  ).catch(() => null);
  if (!response) {
    return Response.json({ error: "Comparison unavailable" }, { status: 502 });
  }
  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
