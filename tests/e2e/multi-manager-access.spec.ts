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

test("Manager Today recommendations stay isolated per manager membership", async ({ page, request }) => {
  const [tokenA, tokenB] = await Promise.all([
    tokenFor(request, "manager-a-subject"),
    tokenFor(request, "manager-b-subject"),
  ]);

  await page.context().setExtraHTTPHeaders({ [accessHeader]: tokenA });
  await page.goto(app);
  await expect(page.getByRole("heading", { name: /Alice/ })).toBeVisible();
  await expect(page.getByText("LDL Manager A Target", { exact: true })).toBeVisible();
  await expect(page.getByText("BDB Manager A Target", { exact: true })).toBeVisible();
  await expect(page.getByText(/xrtc Target/, { exact: false })).toHaveCount(0);
  await expect(page.getByText(/over the cap/)).toBeVisible();

  await page.context().setExtraHTTPHeaders({ [accessHeader]: tokenB });
  await page.goto(app);
  await expect(page.getByRole("heading", { name: /Bob/ })).toBeVisible();
  await expect(page.getByText("LDL xrtc Target", { exact: true })).toBeVisible();
  await expect(page.getByText("BDB xrtc Target", { exact: true })).toBeVisible();
  await expect(page.getByText(/Manager A Target/, { exact: false })).toHaveCount(0);
  await expect(page.getByText("Provisional roster", { exact: true })).toBeVisible();
  await expect(page.getByText("38", { exact: true })).toBeVisible();
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

test("player research is available only through an authenticated league membership", async ({ request }) => {
  const token = await tokenFor(request, "manager-a-subject");
  const authenticated = await request.get(
    `${app}/api/fantasy/ldl/players/202695/research?days=30&limit=3`,
    { headers: { [accessHeader]: token } },
  );
  expect(authenticated.ok()).toBeTruthy();
  expect(await authenticated.json()).toMatchObject({
    player: { nba_id: 202695, name: "Research Player" },
    coverage: { status: "available", exact_player_tag_required: true },
    advisor_policy: { affects_trade_recommendation: false, mode: "context_only" },
  });

  const anonymous = await request.get(
    `${app}/api/fantasy/ldl/players/202695/research?days=30&limit=3`,
  );
  expect(anonymous.status()).toBe(401);
});

test("commissioner can review and record a sync-pending three-for-three trade", async ({ page, request }) => {
  const token = await tokenFor(request, "manager-a-subject");
  await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
  await page.goto(`${app}/commissioner/trades?league=ldl`);

  await page.getByLabel("Franchise A").selectOption("ldl-franchise-a");
  await page.getByLabel("Franchise B").selectOption("ldl-franchise-b");
  const sentGroups = page.getByRole("group", { name: "Players sent" });
  for (const name of ["Alpha Player 1 · G", "Alpha Player 2 · G", "Alpha Player 3 · G"]) {
    await sentGroups.nth(0).getByLabel(name).check();
  }
  for (const name of ["Beta Player 1 · G", "Beta Player 2 · G", "Beta Player 3 · G"]) {
    await sentGroups.nth(1).getByLabel(name).check();
  }
  await page.getByLabel("Fantrax rosters have not been updated yet").check();
  await page.getByRole("button", { name: "Review trade" }).click();

  await expect(page.getByText("Final review — this creates an immutable ledger entry")).toBeVisible();
  await expect(page.getByText(/Will be recorded as sync pending/)).toBeVisible();
  await page.getByRole("button", { name: "Confirm and record" }).click();
  await expect(page.getByText(/Trade recorded with receipt/)).toBeVisible();
});

test("anonymous visitors never receive personal navigation", async ({ page }) => {
  await page.goto(app);
  await expect(page.getByRole("link", { name: "My LDL" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "My BδB" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Commissioner" })).toHaveCount(0);
  await expect(page.getByText("Personal features unavailable in this preview")).toBeVisible();
});
