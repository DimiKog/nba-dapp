import { expect, test, type APIRequestContext } from "@playwright/test";

const app = "http://127.0.0.1:3102";
const accessHeader = "cf-access-jwt-assertion";

async function tokenFor(
  request: APIRequestContext,
  subject: "manager-a-subject" | "gnfc-manager-subject" = "gnfc-manager-subject",
) {
  const response = await request.get(
    `http://127.0.0.1:3101/test/access-token?subject=${subject}`,
  );
  expect(response.ok()).toBeTruthy();
  return (await response.json() as { token: string }).token;
}

test.describe("Discovery Step 4A — GNFC Browse", () => {
  test("GNFC Browse mounts explorer without placeholder or LDL remap", async ({ page, request }) => {
    const token = await tokenFor(request);
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });

    const explorerHits: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/fantasy/") && req.url().includes("/players?")) {
        explorerHits.push(req.url());
      }
    });

    await page.goto(`${app}/players?league=gnfc&view=browse`);
    await expect(page).toHaveURL(/league=gnfc/);
    await expect(page).not.toHaveURL(/league=ldl/);
    await expect(page.getByRole("tab", { name: "Browse" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("GNFC Browse arrives in a later slice")).toHaveCount(0);
    await expect(page.getByTestId("league-player-explorer")).toHaveAttribute("data-explorer-league", "gnfc");
    await expect(page.getByText(/players · .* free agent/i)).toBeVisible({ timeout: 20_000 });
    await expect.poll(() => explorerHits.some((url) => url.includes("/api/fantasy/gnfc/players"))).toBeTruthy();
    expect(explorerHits.every((url) => !url.includes("/api/fantasy/ldl/players"))).toBeTruthy();
    expect(explorerHits.every((url) => !url.includes("/api/fantasy/bdb/players"))).toBeTruthy();
  });

  test("GNFC Browse search, position, and availability filters work", async ({ page, request }) => {
    const token = await tokenFor(request);
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
    await page.goto(`${app}/players?league=gnfc&view=browse`);
    await expect(page.getByTestId("league-player-explorer")).toBeVisible();
    await expect(page.getByText(/players · .* free agent/i)).toBeVisible({ timeout: 20_000 });

    await page.getByPlaceholder("Search player, NBA team or fantasy team…").fill("Free Agent");
    await expect(page.getByText(/players · .* free agent/i)).toBeVisible();
    await expect(page.getByText("Athens BrickLayers Player 1")).toHaveCount(0);

    await page.getByPlaceholder("Search player, NBA team or fantasy team…").fill("");
    await page.getByLabel("Position").selectOption({ label: "PG" });
    await expect(page.getByText(/\d+ players? ·/i)).toBeVisible();
    await expect(page.getByText("No players match these filters.")).toHaveCount(0);

    await page.getByRole("button", { name: "FA", exact: true }).click();
    await expect(page.getByText(/free agent/i).first()).toBeVisible();
  });

  test("GNFC Browse omits salary and Compare; detail keeps league=gnfc", async ({ page, request }) => {
    const token = await tokenFor(request);
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(`${app}/players?league=gnfc&view=browse`);
    await expect(page.getByTestId("league-player-explorer")).toBeVisible();
    await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 20_000 });

    await expect(page.getByRole("columnheader", { name: "2026–27" })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Compare" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add", exact: true })).toHaveCount(0);

    await page.locator("table tbody tr").first().click();
    const profile = page.getByRole("link", { name: "Full profile →" });
    await expect(profile).toBeVisible();
    await expect(profile).toHaveAttribute("href", /league=gnfc/);
    await expect(profile).not.toHaveAttribute("href", /league=ldl/);
  });

  test("GNFC Browse Watch uses GNFC watchlist endpoint", async ({ page, request }) => {
    const token = await tokenFor(request);
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });

    const watchHits: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/watchlist/")) watchHits.push(req.url());
    });

    await page.goto(`${app}/players?league=gnfc&view=browse`);
    await expect(page.getByTestId("league-player-explorer")).toBeVisible();
    await expect.poll(() => watchHits.some((url) => url.includes("/api/watchlist/gnfc"))).toBeTruthy();
    expect(watchHits.every((url) => !url.includes("/api/watchlist/ldl"))).toBeTruthy();
    expect(watchHits.every((url) => !url.includes("/api/watchlist/bdb"))).toBeTruthy();
  });

  test("GNFC Browse shows honest not-ready when explorer returns 503", async ({ page, request }) => {
    const token = await tokenFor(request);
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
    await page.route("**/api/fantasy/gnfc/players?**", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "GNFC free-agent availability is not active yet",
          code: "availability_not_ready",
        }),
      });
    });

    await page.goto(`${app}/players?league=gnfc&view=browse`);
    await expect(page.getByTestId("browse-not-ready")).toBeVisible();
    await expect(page.getByText("Free-agent market data is not ready for this league yet.")).toBeVisible();
    await expect(page).toHaveURL(/league=gnfc/);
    await expect(page).not.toHaveURL(/league=ldl/);
    await expect(page.getByText("GNFC Browse arrives in a later slice")).toHaveCount(0);
  });

  test("LDL Browse remains available with salary and Compare", async ({ page, request }) => {
    const token = await tokenFor(request, "manager-a-subject");
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(`${app}/players?league=ldl&view=browse`);
    await expect(page.getByTestId("league-player-explorer")).toHaveAttribute("data-explorer-league", "ldl");
    await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("columnheader", { name: "2026–27" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Compare" })).toBeVisible();
  });
});
