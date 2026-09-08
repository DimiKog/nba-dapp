import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import {
  getCloudflareAccessIdentity,
  getCloudflareAccessIdentityFromHeaders,
  type CloudflareAccessIdentity,
} from "@/lib/cloudflareAccess";
import type { FantasyMembership, FantasySession } from "@/lib/fantasySessionTypes";

export type { FantasyMembership, FantasySession } from "@/lib/fantasySessionTypes";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://mybackend.dimikog.org";

export function fantasyIdentityHeaders(
  identity: CloudflareAccessIdentity,
  initial?: HeadersInit,
): Headers | null {
  const apiKey = process.env.FANTASY_IDENTITY_API_KEY?.trim();
  if (!apiKey) return null;
  const outgoing = new Headers(initial);
  outgoing.set("X-Fantasy-Identity-Key", apiKey);
  outgoing.set("X-Fantasy-Identity-Issuer", identity.issuer);
  outgoing.set("X-Fantasy-Identity-Subject", identity.subject);
  outgoing.set("X-Fantasy-Identity-Email", identity.email);
  outgoing.set("X-Fantasy-Identity-Name", identity.displayName);
  return outgoing;
}

export async function loadFantasySession(
  identity: CloudflareAccessIdentity,
): Promise<{ response: Response; session: FantasySession | null }> {
  const outgoing = fantasyIdentityHeaders(identity);
  if (!outgoing) {
    const response = Response.json(
      { error: "Fantasy identity is not configured" },
      { status: 503 },
    );
    return { response, session: null };
  }
  const response = await fetch(`${BACKEND}/api/fantasy/session`, {
    cache: "no-store",
    headers: outgoing,
  }).catch(() => null);
  if (!response) {
    const unavailable = Response.json(
      { error: "Fantasy identity service is unavailable" },
      { status: 502 },
    );
    return { response: unavailable, session: null };
  }
  if (!response.ok) return { response, session: null };
  return { response, session: await response.json() as FantasySession };
}

export async function fantasyIdentityForRequest(
  request: Request,
): Promise<CloudflareAccessIdentity | null> {
  return getCloudflareAccessIdentity(request);
}

export const loadCurrentFantasyContext = cache(async (): Promise<{
  identity: CloudflareAccessIdentity | null;
  identityHeaders: Headers | null;
  session: FantasySession | null;
}> => {
  const identity = await getCloudflareAccessIdentityFromHeaders(await headers());
  if (!identity) return { identity: null, identityHeaders: null, session: null };
  const loaded = await loadFantasySession(identity);
  const identityHeaders = fantasyIdentityHeaders(identity);
  if (!loaded.session || !identityHeaders) {
    return { identity, identityHeaders, session: null };
  }
  return { identity, identityHeaders, session: loaded.session };
});

export const loadCurrentFantasyAccess = cache(async (): Promise<{
  identity: CloudflareAccessIdentity;
  identityHeaders: Headers;
  session: FantasySession;
} | null> => {
  const context = await loadCurrentFantasyContext();
  if (!context.identity || !context.identityHeaders || !context.session) return null;
  return {
    identity: context.identity,
    identityHeaders: context.identityHeaders,
    session: context.session,
  };
});

export const loadCurrentFantasySession = cache(async (): Promise<FantasySession | null> =>
  (await loadCurrentFantasyContext()).session,
);

export function membershipFor(
  session: FantasySession | null,
  league: string,
): FantasyMembership | null {
  return session?.memberships.find((item) => item.league_slug === league) ?? null;
}

type AuthorizedFantasyRequest = {
  ok: true;
  identity: CloudflareAccessIdentity;
  identityHeaders: Headers;
  session: FantasySession;
  membership: FantasyMembership;
};

type DeniedFantasyRequest = { ok: false; response: Response };

export async function authorizeFantasyRequest(
  request: Request,
  league: string,
  options: { commissioner?: boolean; selectedTeamId?: unknown } = {},
): Promise<AuthorizedFantasyRequest | DeniedFantasyRequest> {
  const identity = await fantasyIdentityForRequest(request);
  if (!identity) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const loaded = await loadFantasySession(identity);
  if (!loaded.session) {
    return { ok: false, response: copyBackendResponse(loaded.response) };
  }
  const membership = membershipFor(loaded.session, league);
  if (!membership) {
    return {
      ok: false,
      response: Response.json(
        { error: "No active membership for this league" },
        { status: 403 },
      ),
    };
  }
  if (options.commissioner && !membership.commissioner) {
    return {
      ok: false,
      response: Response.json(
        { error: "Commissioner access is required" },
        { status: 403 },
      ),
    };
  }
  if (!membership.fantrax_team_id) {
    return {
      ok: false,
      response: Response.json(
        { error: "Your team mapping is not available" },
        { status: 503 },
      ),
    };
  }
  if (
    options.selectedTeamId !== undefined
    && options.selectedTeamId !== membership.fantrax_team_id
  ) {
    return {
      ok: false,
      response: Response.json(
        { error: "Trade analysis is restricted to your own team" },
        { status: 403 },
      ),
    };
  }
  const identityHeaders = fantasyIdentityHeaders(identity);
  if (!identityHeaders) {
    return {
      ok: false,
      response: Response.json(
        { error: "Fantasy identity is not configured" },
        { status: 503 },
      ),
    };
  }
  return {
    ok: true,
    identity,
    identityHeaders,
    session: loaded.session,
    membership,
  };
}

export function copyBackendResponse(response: Response): Response {
  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
