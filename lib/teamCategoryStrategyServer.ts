import "server-only";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "https://mybackend.dimikog.org";

export function readTeamCategoryStrategy(
  league: string,
  identityHeaders: HeadersInit,
): Promise<Response> {
  return fetch(`${BACKEND}/api/fantasy/${league}/my-team/category-strategy`, {
    cache: "no-store",
    headers: identityHeaders,
  });
}

export function writeTeamCategoryStrategy(
  league: string,
  identityHeaders: HeadersInit,
  body: unknown,
): Promise<Response> {
  const headers = new Headers(identityHeaders);
  headers.set("Content-Type", "application/json");
  return fetch(`${BACKEND}/api/fantasy/${league}/my-team/category-strategy`, {
    method: "PUT",
    cache: "no-store",
    headers,
    body: JSON.stringify(body),
  });
}
