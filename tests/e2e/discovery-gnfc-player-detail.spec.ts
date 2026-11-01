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

test.describe("Discovery Step 4A.1 — GNFC Player Detail", () => {
  test("GNFC Detail keeps league context, Watch, and NBA contract wording", async ({ page, request }) => {
    const token = await tokenFor(request);
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });

    const watchHits: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/watchlist/")) watchHits.push(req.url());
    });

    await page.goto(`${app}/players/51000?league=gnfc&from=explorer`);
    await expect(page).toHaveURL(/league=gnfc/);
    await expect(page).not.toHaveURL(/league=ldl|league=bdb/);
    await expect(page.getByTestId("player-intelligence")).toHaveAttribute("data-player-league", "gnfc");
    await expect(page.getByText("GNFC free agent")).toBeVisible();
    await expect(page.getByText("GNFC market")).toBeVisible();

    const tabs = page.getByTestId("player-context-tabs");
    await expect(tabs.getByRole("link", { name: "NBA", exact: true })).toBeVisible();
    await expect(tabs.getByRole("link", { name: "LDL", exact: true })).toBeVisible();
    await expect(tabs.getByRole("link", { name: "BδB", exact: true })).toBeVisible();
    await expect(tabs.getByRole("link", { name: "GNFC", exact: true })).toBeVisible();
    await expect(tabs.getByRole("link", { name: "GNFC", exact: true })).toHaveAttribute("href", /league=gnfc/);

    await expect(page.getByText("NBA contract", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("2026–27 NBA salary")).toBeVisible();
    await expect(page.getByRole("heading", { name: "NBA salary timeline" })).toBeVisible();
    await expect(page.getByText("Current salary")).toHaveCount(0);
    await expect(page.getByText(/fantasy salary|salary cap|GNFC salary/i)).toHaveCount(0);

    await expect(page.getByText("Player outlook · pilot")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /compare/i })).toHaveCount(0);

    await page.getByRole("button", { name: "+ Watch" }).click();
    await expect.poll(() => watchHits.some((url) => url.includes("/api/watchlist/gnfc"))).toBeTruthy();
    expect(watchHits.every((url) => !url.includes("/api/watchlist/ldl"))).toBeTruthy();
    expect(watchHits.every((url) => !url.includes("/api/watchlist/bdb"))).toBeTruthy();
    await expect(page.getByRole("button", { name: "Watching" })).toBeVisible();

    await page.getByRole("link", { name: "← Browse" }).click();
    await expect(page).toHaveURL(/view=browse/);
    await expect(page).toHaveURL(/league=gnfc/);
  });

  test("LDL Player Detail remains unchanged with Outlook and contract wording", async ({ page, request }) => {
    const token = await tokenFor(request, "manager-a-subject");
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });

    await page.goto(`${app}/players/51000?league=ldl&from=explorer`);
    await expect(page.getByTestId("player-intelligence")).toHaveAttribute("data-player-league", "ldl");
    await expect(page.getByText("LDL free agent")).toBeVisible();
    await expect(page.getByText("Current salary")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Salary timeline" })).toBeVisible();
    await expect(page.getByText("NBA contract")).toHaveCount(0);
    await expect(page.getByText("Player outlook · pilot")).toBeVisible();
    await expect(page.getByTestId("player-context-tabs").getByRole("link", { name: "GNFC", exact: true })).toBeVisible();
  });
});
