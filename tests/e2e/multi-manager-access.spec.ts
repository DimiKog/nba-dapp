import { expect, test, type APIRequestContext } from "@playwright/test";

const app = "http://127.0.0.1:3102";
const accessHeader = "cf-access-jwt-assertion";

async function tokenFor(
  request: APIRequestContext,
  subject: "manager-a-subject" | "manager-b-subject",
) {
  const response = await request.get(
    `http://127.0.0.1:3101/test/access-token?subject=${subject}`,
  );
  expect(response.ok()).toBeTruthy();
  return (await response.json() as { token: string }).token;
}

test("each manager receives only their own memberships", async ({ request }) => {
  const [tokenA, tokenB] = await Promise.all([
    tokenFor(request, "manager-a-subject"),
    tokenFor(request, "manager-b-subject"),
  ]);
  const [sessionAResponse, sessionBResponse] = await Promise.all([
    request.get(`${app}/api/fantasy/session`, { headers: { [accessHeader]: tokenA } }),
    request.get(`${app}/api/fantasy/session`, { headers: { [accessHeader]: tokenB } }),
  ]);

  expect(sessionAResponse.ok()).toBeTruthy();
  expect(sessionBResponse.ok()).toBeTruthy();

  const sessionA = await sessionAResponse.json();
  const sessionB = await sessionBResponse.json();
  expect(sessionA.user.email).toBe("manager-a@example.test");
  expect(sessionB.user.email).toBe("manager-b@example.test");
  expect(sessionA.memberships.map((item: { fantrax_team_id: string }) => item.fantrax_team_id))
    .toEqual(["ldl-team-a", "bdb-team-a"]);
  expect(sessionB.memberships.map((item: { fantrax_team_id: string }) => item.fantrax_team_id))
    .toEqual(["ldl-team-b", "bdb-team-b"]);
});

test("membership-aware navigation differs by manager role", async ({ page, request }) => {
  const [tokenA, tokenB] = await Promise.all([
    tokenFor(request, "manager-a-subject"),
    tokenFor(request, "manager-b-subject"),
  ]);
  await page.context().setExtraHTTPHeaders({ [accessHeader]: tokenA });
  await page.goto(app);
  await expect(page.getByRole("link", { name: "My LDL" })).toBeVisible();
  await expect(page.getByRole("link", { name: "My BδB" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Commissioner" })).toBeVisible();
  await expect(page.getByText("Manager A LDL", { exact: true })).toBeVisible();

  await page.context().setExtraHTTPHeaders({ [accessHeader]: tokenB });
  await page.goto(app);
  await expect(page.getByRole("link", { name: "My LDL" })).toBeVisible();
  await expect(page.getByRole("link", { name: "My BδB" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Commissioner" })).toHaveCount(0);
  await expect(page.getByText("xrtc", { exact: true }).first()).toBeVisible();
});

test("trade suggestions are restricted to the signed-in manager team", async ({ request }) => {
  const [tokenA, tokenB] = await Promise.all([
    tokenFor(request, "manager-a-subject"),
    tokenFor(request, "manager-b-subject"),
  ]);
  const requestBody = (selectedTeamId: string) => ({
    selected_team_id: selectedTeamId,
    outgoing_player_id: 123,
    intent: "balanced",
    basis: "season",
    window_days: 14,
    limit_per_team: 3,
    constraints: {},
  });

  const ownA = await request.post(`${app}/api/fantasy/ldl/trade-suggestions`, {
    headers: { [accessHeader]: tokenA },
    data: requestBody("ldl-team-a"),
  });
  expect(ownA.ok()).toBeTruthy();
  expect(await ownA.json()).toMatchObject({
    selected_team_id: "ldl-team-a",
    identity_subject: "manager-a-subject",
  });

  const crossManager = await request.post(`${app}/api/fantasy/ldl/trade-suggestions`, {
    headers: { [accessHeader]: tokenA },
    data: requestBody("ldl-team-b"),
  });
  expect(crossManager.status()).toBe(403);
  expect(await crossManager.json()).toEqual({
    error: "Trade analysis is restricted to your own team",
  });

  const ownB = await request.post(`${app}/api/fantasy/ldl/trade-suggestions`, {
    headers: { [accessHeader]: tokenB },
    data: requestBody("ldl-team-b"),
  });
  expect(ownB.ok()).toBeTruthy();
});

test("anonymous visitors never receive personal navigation", async ({ page }) => {
  await page.goto(app);
  await expect(page.getByRole("link", { name: "My LDL" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "My BδB" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Commissioner" })).toHaveCount(0);
  await expect(page.getByText("Personal features unavailable in this preview")).toBeVisible();
});
