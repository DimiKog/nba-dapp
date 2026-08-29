import { verifyCloudflareAccess } from "@/lib/cloudflareAccess";
import { readDraftAssets, validDraftLeague } from "@/lib/draftAssetsServer";

const ALLOWED_PARAMS = new Set([
  "owner_franchise_id",
  "draft_year",
  "eligibility",
]);

export async function GET(
  request: Request,
  context: { params: Promise<{ league: string }> },
) {
  if (!await verifyCloudflareAccess(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { league } = await context.params;
  if (!validDraftLeague(league)) {
    return Response.json({ error: "Unknown league" }, { status: 404 });
  }
  const incoming = new URL(request.url).searchParams;
  if ([...incoming.keys()].some((key) => !ALLOWED_PARAMS.has(key))) {
    return Response.json({ error: "Unsupported filter" }, { status: 400 });
  }
  const backendSearch = new URLSearchParams();
  for (const key of ALLOWED_PARAMS) {
    const value = incoming.get(key);
    if (value) backendSearch.set(key, value);
  }
  const response = await readDraftAssets(league, backendSearch.toString());
  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
