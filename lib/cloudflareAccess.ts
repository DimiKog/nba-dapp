import "server-only";

type JwtHeader = {
  alg?: string;
  kid?: string;
};

type JwtPayload = {
  aud?: string | string[];
  exp?: number;
  iss?: string;
  sub?: string;
  email?: string;
  name?: string;
};

export type CloudflareAccessIdentity = {
  issuer: string;
  subject: string;
  email: string;
  displayName: string;
};

type CloudflareJwk = JsonWebKey & { kid?: string };

function decodePart<T>(value: string): T {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as T;
}

function decodeSignature(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(Buffer.from(padded, "base64")).buffer;
}

function localIdentity(): CloudflareAccessIdentity | null {
  if (
    process.env.NODE_ENV !== "production"
    && process.env.WATCHLIST_ALLOW_LOCAL_MUTATIONS === "true"
  ) {
    const issuer = process.env.FANTASY_LOCAL_IDENTITY_ISSUER?.trim();
    const subject = process.env.FANTASY_LOCAL_IDENTITY_SUBJECT?.trim();
    const email = process.env.FANTASY_LOCAL_IDENTITY_EMAIL?.trim().toLowerCase();
    if (!issuer || !subject || !email) return null;
    return {
      issuer: issuer.replace(/\/$/, ""),
      subject,
      email,
      displayName: process.env.FANTASY_LOCAL_IDENTITY_NAME?.trim() || email.split("@")[0],
    };
  }
  return null;
}

export async function getCloudflareAccessIdentityFromHeaders(
  requestHeaders: Headers,
): Promise<CloudflareAccessIdentity | null> {
  const developmentIdentity = localIdentity();
  if (developmentIdentity) return developmentIdentity;

  const audience = process.env.CLOUDFLARE_ACCESS_AUD?.trim();
  const teamDomain = (
    process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN
    ?? "https://dimikog-apps.cloudflareaccess.com"
  ).replace(/\/$/, "");
  const token = requestHeaders.get("cf-access-jwt-assertion");
  if (!audience || !token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const header = decodePart<JwtHeader>(parts[0]);
    const payload = decodePart<JwtPayload>(parts[1]);
    if (header.alg !== "RS256" || !header.kid) return null;
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(audience)) return null;
    if (!payload.exp || payload.exp * 1000 <= Date.now()) return null;
    if (payload.iss !== teamDomain) return null;
    if (!payload.sub?.trim() || !payload.email?.trim()) return null;

    const certsResponse = await fetch(`${teamDomain}/cdn-cgi/access/certs`, {
      next: { revalidate: 3600 },
    });
    if (!certsResponse.ok) return null;
    const certs = await certsResponse.json() as { keys?: CloudflareJwk[] };
    const jwk = certs.keys?.find((key) => key.kid === header.kid);
    if (!jwk) return null;

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const verified = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      decodeSignature(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    if (!verified) return null;
    const email = payload.email.trim().toLowerCase();
    return {
      issuer: payload.iss,
      subject: payload.sub.trim(),
      email,
      displayName: payload.name?.trim() || email.split("@")[0],
    };
  } catch {
    return null;
  }
}

export async function getCloudflareAccessIdentity(
  request: Request,
): Promise<CloudflareAccessIdentity | null> {
  return getCloudflareAccessIdentityFromHeaders(request.headers);
}

export async function verifyCloudflareAccess(request: Request): Promise<boolean> {
  return Boolean(await getCloudflareAccessIdentity(request));
}
