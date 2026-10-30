import { expect, test, type APIRequestContext } from "@playwright/test";

const app = "http://127.0.0.1:3102";
const accessHeader = "cf-access-jwt-assertion";

async function tokenFor(
  request: APIRequestContext,
  subject: "manager-a-subject" | "manager-b-subject" | "gnfc-manager-subject" = "manager-a-subject",
) {
  const response = await request.get(
    `http://127.0.0.1:3101/test/access-token?subject=${subject}`,
  );
  expect(response.ok()).toBeTruthy();
  return (await response.json() as { token: string }).token;
}

test.describe("Discovery Slice 2 — Watched + FA Trends", () => {
  test.beforeEach(async ({ request }) => {
    await request.post("http://127.0.0.1:3101/test/reset-state");
  });

  test("Watched mounts real watchlist entries with priority order and notes", async ({ page, request }) => {
    const token = await tokenFor(request, "manager-a-subject");
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });

    await page.goto(`${app}/players?league=ldl&view=watched`);
    await expect(page.getByTestId("discovery-watched")).toBeVisible();
    await expect(page.getByText("being consolidated")).toHaveCount(0);
    await expect(page.getByText("Roster Watch")).toHaveCount(0);

    const rows = page.getByTestId("watched-row");
    await expect(rows).toHaveCount(3);
    await expect(rows.first()).toContainText("High");
    await expect(page.getByTestId("watched-note").first()).toContainText("Trade target");
    await expect(page.getByTestId("watched-status")).toContainText("ordered by priority");
  });

  test("Watched empty state and Browse CTA for manager without entries", async ({ page, request }) => {
    const token = await tokenFor(request, "manager-b-subject");
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });

    await page.goto(`${app}/players?league=ldl&view=watched`);
    await expect(page.getByTestId("watched-empty")).toBeVisible();
    await expect(page.getByTestId("watched-empty").getByText("No watched players yet")).toBeVisible();
    await page.getByTestId("watched-browse-cta").click();
    await expect(page).toHaveURL(/\/players\?/);
    await expect(page).toHaveURL(/league=ldl/);
    await expect(page.getByRole("tab", { name: "Browse" })).toHaveAttribute("aria-selected", "true");
  });

  test("Watched edit priority/note and unwatch persist", async ({ page, request }) => {
    const token = await tokenFor(request, "manager-a-subject");
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });

    await page.goto(`${app}/players?league=ldl&view=watched`);
    const first = page.getByTestId("watched-row").first();
    await first.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByTestId("watched-edit")).toBeVisible();
    await page.getByTestId("watched-priority").selectOption("2");
    await page.getByTestId("watched-notes").fill("Updated discovery note");
    await page.getByTestId("watched-save").click();
    await expect(page.getByTestId("watched-edit")).toHaveCount(0);
    await expect(page.getByText("Updated discovery note")).toBeVisible();

    const before = await page.getByTestId("watched-row").count();
    await page.getByTestId("watched-row").filter({ hasText: "Updated discovery note" })
      .getByTestId("watched-unwatch")
      .click();
    await expect(page.getByTestId("watched-row")).toHaveCount(before - 1);
  });

  test("/watchlist redirects to real Watched view", async ({ page, request }) => {
    const token = await tokenFor(request, "manager-a-subject");
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
    await page.goto(`${app}/watchlist?league=ldl`);
    await expect(page).toHaveURL(/\/players\?/);
    await expect(page).toHaveURL(/view=watched/);
    await expect(page.getByTestId("discovery-watched")).toBeVisible();
    await expect(page.getByText("being consolidated")).toHaveCount(0);
  });

  test("FA Trends mounts radar ordering and evidence without Watchlist stack or TARGET", async ({ page, request }) => {
    const token = await tokenFor(request, "manager-a-subject");
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });

    await page.goto(`${app}/players?league=ldl&view=fa-trends`);
    await expect(page.getByTestId("discovery-fa-trends")).toBeVisible();
    await expect(page.getByText("My watchlist", { exact: true })).toHaveCount(0);
    // No strategy TARGET lane / team-needs ranking UI (exact tokens only — avoid subtitle "targets").
    await expect(page.getByTestId("discovery-fa-trends").getByText("TARGET", { exact: true })).toHaveCount(0);
    await expect(page.getByTestId("discovery-fa-trends").getByText("Fit Score", { exact: true })).toHaveCount(0);
    await expect(page.getByText("being consolidated")).toHaveCount(0);

    const rows = page.getByTestId("fa-trend-row");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("#1");
    await expect(rows.nth(0)).toContainText("Radar Test Player");
    await expect(rows.nth(1)).toContainText("#2");
    await expect(page.getByText("PTS +4").first()).toBeVisible();
    await expect(page.getByText(/Minutes ↑/i).first()).toBeVisible();

    await rows.first().getByTestId("fa-trend-watch").click();
    await expect(rows.first().getByTestId("fa-trend-watch")).toHaveText("Watching");
  });

  test("inactive Discovery views do not fetch FA radar or watchlist page data", async ({ page, request }) => {
    const token = await tokenFor(request, "manager-a-subject");
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });

    const radarHits: string[] = [];
    const watchlistHits: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("free-agent-radar")) radarHits.push(url);
      if (url.includes("/api/watchlist/")) watchlistHits.push(url);
    });

    await page.goto(`${app}/players?league=ldl&view=browse`);
    await expect(page.getByRole("tab", { name: "Browse" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText(/players · .* free agent/i)).toBeVisible({ timeout: 20_000 });

    // Browse may seed watch ids once; must not hit FA radar.
    expect(radarHits.length).toBe(0);

    radarHits.length = 0;
    watchlistHits.length = 0;
    await page.getByRole("tab", { name: "Watched" }).click();
    await expect(page.getByTestId("discovery-watched")).toBeVisible();
    expect(radarHits.length).toBe(0);
    expect(watchlistHits.some((u) => u.includes("/api/watchlist/ldl"))).toBeTruthy();

    radarHits.length = 0;
    watchlistHits.length = 0;
    await page.getByRole("tab", { name: "FA trends" }).click();
    await expect(page.getByTestId("discovery-fa-trends")).toBeVisible();
    expect(radarHits.some((u) => u.includes("free-agent-radar"))).toBeTruthy();
  });

  test("GNFC remains GNFC for Watched and shows intentional FA-not-ready", async ({ page, request }) => {
    const token = await tokenFor(request, "gnfc-manager-subject");
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });

    await page.goto(`${app}/players?league=gnfc&view=watched`);
    await expect(page).toHaveURL(/league=gnfc/);
    await expect(page).not.toHaveURL(/league=ldl/);
    await expect(page.getByRole("button", { name: "GNFC", pressed: true })).toBeVisible();
    await expect(page.getByTestId("discovery-watched")).toBeVisible();
    await expect(page.getByTestId("watched-row").first()).toBeVisible();

    await page.goto(`${app}/players?league=gnfc&view=fa-trends`);
    await expect(page).toHaveURL(/league=gnfc/);
    await expect(page.getByTestId("fa-trends-not-ready")).toBeVisible();
    await expect(page.getByText("Free-agent market data is not ready for this league yet.")).toBeVisible();
    await expect(page.getByText(/salary|cap decision/i)).toHaveCount(0);
  });
});
