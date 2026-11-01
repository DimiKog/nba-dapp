import { expect, test, type APIRequestContext } from "@playwright/test";

const app = "http://127.0.0.1:3102";
const mock = "http://127.0.0.1:3101";
const accessHeader = "cf-access-jwt-assertion";

async function tokenFor(request: APIRequestContext) {
  const response = await request.get(`${mock}/test/access-token?subject=gnfc-manager-subject`);
  expect(response.ok()).toBeTruthy();
  return (await response.json() as { token: string }).token;
}

async function setGnfcAvailability(request: APIRequestContext, ready: boolean) {
  const response = await request.post(`${mock}/__e2e/gnfc-availability`, {
    data: { ready },
  });
  expect(response.ok()).toBeTruthy();
}

test.afterEach(async ({ request }) => {
  await setGnfcAvailability(request, true);
});

test("GNFC personal Team page uses shared shell with Team Intelligence when availability is ready", async ({
  page,
  request,
}) => {
  await setGnfcAvailability(request, true);
  const token = await tokenFor(request);
  await page.context().setExtraHTTPHeaders({ [accessHeader]: token });

  const discoveryUrls: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("roster-move-discovery") && req.method() === "POST") {
      discoveryUrls.push(req.url());
    }
  });

  await page.goto(`${app}/fantasy/gnfc/roster/gnfc-athens`);

  await expect(page.getByText("GNFC Γ5 · roster")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Athens BrickLayers" })).toBeVisible();
  await expect(page.getByText("Free-agent proposals · preview status")).toHaveCount(0);

  const order = await page.evaluate(() => {
    const ids = ["overview", "intelligence", "roster"];
    return ids
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .sort((a, b) => (a!.compareDocumentPosition(b!) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      .map((el) => el!.id);
  });
  expect(order).toEqual(["overview", "intelligence", "roster"]);

  const intelligence = page.locator("#intelligence");
  await expect(intelligence.getByText("Team intelligence").first()).toBeVisible();
  await expect(intelligence.getByRole("heading", { name: "Recommended strategy" })).toBeVisible();
  await expect(intelligence.getByText("Based on your current category profile")).toBeVisible();
  await expect(intelligence.getByText("PROTECT", { exact: true })).toBeVisible();
  await expect(intelligence.getByText("TARGET", { exact: true })).toBeVisible();
  await expect(intelligence.getByText("View full category analysis")).toBeVisible();

  const moves = intelligence.locator("#recommended-moves");
  await expect(moves.getByRole("heading", { name: "Recommended moves" })).toBeVisible();
  await expect(moves.getByRole("heading", { name: "Free Agent 1" })).toBeVisible();
  await expect(moves.getByText("Salary")).toHaveCount(0);

  await intelligence.getByText("View full category analysis").click();
  await expect(intelligence.locator("#team-analysis")).toBeVisible();

  await expect(page.locator("#roster")).toBeVisible();
  await expect(page.locator("#payroll")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Team page sections" }).getByRole("link", { name: "Payroll" })).toHaveCount(0);
  await expect(page.getByText("Cap", { exact: true })).toHaveCount(0);
  await expect(page.getByText("2026–27 salary")).toHaveCount(0);

  await expect(page.locator("#roster-watch")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Players to review" })).toBeVisible();
  await expect(page.locator("#player-targets")).toBeVisible();

  expect(discoveryUrls.some((url) => url.includes("/api/fantasy/gnfc/roster/gnfc-athens/roster-move-discovery"))).toBeTruthy();
  expect(discoveryUrls.some((url) => /\/api\/fantasy\/(ldl|bdb)\//.test(url))).toBeFalsy();
});

test("GNFC availability not ready shows notice and no misleading recommendations", async ({
  page,
  request,
}) => {
  await setGnfcAvailability(request, false);
  const token = await tokenFor(request);
  await page.context().setExtraHTTPHeaders({ [accessHeader]: token });

  const discoveryUrls: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("roster-move-discovery") && req.method() === "POST") {
      discoveryUrls.push(req.url());
    }
  });

  await page.goto(`${app}/fantasy/gnfc/roster/gnfc-athens`);

  await expect(page.getByText("Free-agent proposals · preview status")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Waiting for|Free-agent proposals await/ })).toBeVisible();

  const intelligence = page.locator("#intelligence");
  await expect(intelligence.getByText("Team intelligence").first()).toBeVisible();
  await expect(intelligence.getByRole("heading", { name: "Recommended strategy" })).toBeVisible();
  await expect(
    intelligence.getByText("System recommended strategy unlocks when free-agent availability is ready."),
  ).toBeVisible();
  await expect(
    intelligence.getByText(/unlock when (free-agent|league) availability is ready/i),
  ).toBeVisible();
  await expect(intelligence.getByRole("heading", { name: "Free Agent 1" })).toHaveCount(0);
  await expect(intelligence.getByText("No recommended roster moves right now")).toHaveCount(0);

  await expect(page.locator("#roster")).toBeVisible();
  await expect(page.locator("#player-targets")).toHaveCount(0);
  expect(discoveryUrls).toEqual([]);
});

test("GNFC roster-move-discovery BFF keeps league=gnfc", async ({ request }) => {
  await setGnfcAvailability(request, true);
  const token = await tokenFor(request);
  const response = await request.post(
    `${app}/api/fantasy/gnfc/roster/gnfc-athens/roster-move-discovery`,
    {
      headers: { [accessHeader]: token },
      data: { basis: "season" },
    },
  );
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.league.slug).toBe("gnfc");
  expect(payload.team_id).toBe("gnfc-athens");
  expect(JSON.stringify(payload)).not.toMatch(/"slug":"(ldl|bdb)"/);
});
