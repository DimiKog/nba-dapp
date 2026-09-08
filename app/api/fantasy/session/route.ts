import {
  copyBackendResponse,
  fantasyIdentityForRequest,
  loadFantasySession,
} from "@/lib/fantasySessionServer";

export async function GET(request: Request) {
  const identity = await fantasyIdentityForRequest(request);
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return copyBackendResponse((await loadFantasySession(identity)).response);
}
