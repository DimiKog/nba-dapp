import "server-only";

type JwtHeader = {
  alg?: string;
  kid?: string;
};

type JwtPayload = {
  aud?: string | string[];
  exp?: number;
  iss?: string;
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

export async function verifyCloudflareAccess(request: Request): Promise<boolean> {
  if (
    process.env.NODE_ENV !== "production"
    && process.env.WATCHLIST_ALLOW_LOCAL_MUTATIONS === "true"
  ) {
    return true;
  }

  const audience = process.env.CLOUDFLARE_ACCESS_AUD?.trim();
  const teamDomain = (
    process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN
    ?? "https://dimikog-apps.cloudflareaccess.com"
  ).replace(/\/$/, "");
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!audience || !token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  try {
    const header = decodePart<JwtHeader>(parts[0]);
    const payload = decodePart<JwtPayload>(parts[1]);
    if (header.alg !== "RS256" || !header.kid) return false;
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(audience)) return false;
    if (!payload.exp || payload.exp * 1000 <= Date.now()) return false;
    if (payload.iss !== teamDomain) return false;

    const certsResponse = await fetch(`${teamDomain}/cdn-cgi/access/certs`, {
      next: { revalidate: 3600 },
    });
    if (!certsResponse.ok) return false;
    const certs = await certsResponse.json() as { keys?: CloudflareJwk[] };
    const jwk = certs.keys?.find((key) => key.kid === header.kid);
    if (!jwk) return false;

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    return crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      decodeSignature(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
  } catch {
    return false;
  }
}
