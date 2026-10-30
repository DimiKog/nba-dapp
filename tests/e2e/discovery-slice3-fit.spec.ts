import { expect, test, type APIRequestContext } from "@playwright/test";

const app = "http://127.0.0.1:3102";
const accessHeader = "cf-access-jwt-assertion";

async function tokenFor(
  request: APIRequestContext,
  subject: "manager-a-subject" | "gnfc-manager-subject" = "manager-a-subject",
) {
  const response = await request.get(
    `http://127.0.0.1:3101/test/access-token?subject=${subject}`,
  );
  expect(response.ok()).toBeTruthy();
  return (await response.json() as { token: string }).token;
}

test.describe("Discovery Slice 3 — Fit to my plan", () => {
  test.beforeEach(async ({ request }) => {
    await request.post("http://127.0.0.1:3101/test/reset-state");
  });

  test("Fit mounts real view with team context and TARGET-primary strategy", async ({ page, request }) => {
    const token = await tokenFor(request);
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });

    await page.goto(`${app}/players?league=ldl&view=fit`);
    await expect(page.getByTestId("discovery-fit")).toBeVisible();
    await expect(page.getByText("being consolidated")).toHaveCount(0);
    await expect(page.getByTestId("fit-team-context")).toContainText("Manager A LDL");
    await expect(page.getByTestId("fit-strategy-summary")).toContainText("System Recommended Strategy");
    await expect(page.getByTestId("fit-strategy-targets")).toContainText("FG%");
    await expect(page.getByTestId("fit-strategy-targets")).toContainText("FT%");
    await expect(page.getByTestId("fit-strategy-targets")).toContainText("DREB");
    await expect(page.getByTestId("fit-mode-status")).toContainText("Automatic plan");
    await expect(page.getByTestId("fit-mode-status")).toContainText("Optimizing for");
    await expect(page.getByText("Fit Score")).toHaveCount(0);

    await page.getByTestId("fit-strategy-secondary-toggle").click();
    await expect(page.getByTestId("fit-strategy-secondary")).toContainText("Protect");
    await expect(page.getByTestId("fit-strategy-secondary")).toContainText("Punt candidate");
    await expect(page.getByTestId("fit-strategy-secondary")).toContainText("TO");
  });

  test("explicit PUNT exploration is labeled and can return to Automatic plan", async ({ page, request }) => {
    const token = await tokenFor(request);
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
    await page.goto(`${app}/players?league=ldl&view=fit`);
    await expect(page.getByTestId("discovery-fit")).toBeVisible();

    await page.getByTestId("fit-category").selectOption("turnovers");
    await expect(page.getByTestId("fit-mode-status")).toContainText("Exploring: TO");
    await expect(page.getByTestId("fit-mode-status")).toContainText("Punt candidate in your recommended strategy");
    await expect(page.getByTestId("fit-mode-status")).toContainText("strategy unchanged");
    await expect(page.getByTestId("fit-candidate").first()).toBeVisible();

    await page.getByTestId("fit-back-automatic").click();
    await expect(page.getByTestId("fit-mode-status")).toContainText("Automatic plan");
  });

  test("candidates show helps, trade-offs, actionability and secondary need-weighted z", async ({ page, request }) => {
    const token = await tokenFor(request);
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
    await page.goto(`${app}/players?league=ldl&view=fit`);

    const first = page.getByTestId("fit-candidate").first();
    await expect(first).toContainText("Helps");
    await expect(first).toContainText("Trade-offs");
    await expect(first).toContainText("Ready");
    await expect(first).toContainText("high confidence");
    await first.getByText("Evidence details").click();
    await expect(first.getByTestId("fit-need-weighted-z")).toContainText("Need-weighted z");
    await expect(page.getByText(/Fit Score|87% fit/i)).toHaveCount(0);

    await first.getByTestId("fit-watch").click();
    await expect(first.getByTestId("fit-watch")).toHaveText("Watching");
    // Restore seed watchlist so later Discovery Watched assertions stay deterministic.
    await first.getByTestId("fit-watch").click();
    await expect(first.getByTestId("fit-watch")).toHaveText("Watch");
  });

  test("GNFC Fit has no cap controls and shows minutes evidence", async ({ page, request }) => {
    const token = await tokenFor(request, "gnfc-manager-subject");
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
    await page.goto(`${app}/players?league=gnfc&view=fit`);

    await expect(page).toHaveURL(/league=gnfc/);
    await expect(page).not.toHaveURL(/league=ldl/);
    await expect(page.getByTestId("discovery-fit")).toBeVisible();
    await expect(page.getByTestId("fit-cap-scope")).toHaveCount(0);
    await expect(page.getByTestId("fit-team-context")).toContainText("Athens BrickLayers");
    await expect(page.getByTestId("fit-strategy-targets")).toContainText("PTS");
    await expect(page.getByText(/Minutes ↑/i).first()).toBeVisible();
  });

  test("inactive Discovery views do not fetch targets", async ({ page, request }) => {
    const token = await tokenFor(request);
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
    const targetHits: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/targets")) targetHits.push(req.url());
    });

    await page.goto(`${app}/players?league=ldl&view=browse`);
    await expect(page.getByRole("tab", { name: "Browse" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText(/players · .* free agent/i)).toBeVisible({ timeout: 20_000 });
    expect(targetHits.length).toBe(0);

    await page.getByRole("tab", { name: "Fit to my plan" }).click();
    await expect(page.getByTestId("discovery-fit")).toBeVisible();
    expect(targetHits.some((url) => url.includes("/targets"))).toBeTruthy();
  });

  test("LDL Fit keeps cap scope control", async ({ page, request }) => {
    const token = await tokenFor(request);
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
    await page.goto(`${app}/players?league=ldl&view=fit`);
    await expect(page.getByTestId("fit-cap-scope")).toBeVisible();
  });

  test("Load more fetches next backend page, appends in order, and avoids duplicates", async ({ page, request }) => {
    const token = await tokenFor(request);
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
    const targetUrls: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/targets")) targetUrls.push(req.url());
    });

    await page.goto(`${app}/players?league=ldl&view=fit`);
    await expect(page.getByTestId("fit-candidate").first()).toBeVisible();
    await page.getByLabel("Position").selectOption("PG");
    await expect(page.getByTestId("fit-results-status")).toContainText("Showing 24 of 25 candidates");
    await expect(page.getByTestId("fit-candidate")).toHaveCount(24);
    await expect(page.getByTestId("fit-candidate").first()).toContainText("Paged candidate 1");
    await expect(page.getByTestId("fit-load-more")).toBeVisible();

    await page.getByTestId("fit-load-more").click();
    await expect(page.getByTestId("fit-results-status")).toContainText("Showing 25 of 25 candidates");
    await expect(page.getByTestId("fit-candidate")).toHaveCount(25);
    await expect(page.getByTestId("fit-candidate").nth(24)).toContainText("Paged candidate 25");
    await expect(page.getByTestId("fit-load-more")).toHaveCount(0);

    const names = await page.getByTestId("fit-candidate").allTextContents();
    const unique = new Set(names.map((text) => text.match(/Paged candidate \d+/)?.[0]));
    expect(unique.size).toBe(25);
    expect(targetUrls.some((url) => /offset=24/.test(url))).toBeTruthy();
    expect(targetUrls.filter((url) => /position=PG/.test(url) && /offset=0/.test(url)).length).toBeGreaterThan(0);
  });

  test("filter and category changes reset Fit pagination to page 1", async ({ page, request }) => {
    const token = await tokenFor(request);
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
    await page.goto(`${app}/players?league=ldl&view=fit`);
    await page.getByLabel("Position").selectOption("PG");
    await expect(page.getByTestId("fit-load-more")).toBeVisible();
    await page.getByTestId("fit-load-more").click();
    await expect(page.getByTestId("fit-candidate")).toHaveCount(25);

    await page.getByTestId("fit-category").selectOption("turnovers");
    await expect(page.getByTestId("fit-mode-status")).toContainText("Exploring: TO");
    await expect(page.getByTestId("fit-results-status")).toContainText("Showing 24 of 25 candidates");
    await expect(page.getByTestId("fit-candidate")).toHaveCount(24);
    await expect(page.getByTestId("fit-load-more")).toBeVisible();

    await page.getByTestId("fit-load-more").click();
    await expect(page.getByTestId("fit-candidate")).toHaveCount(25);

    await page.getByTestId("fit-back-automatic").click();
    await expect(page.getByTestId("fit-mode-status")).toContainText("Automatic plan");
    await expect(page.getByTestId("fit-results-status")).toContainText("Showing 24 of 25 candidates");
    await expect(page.getByTestId("fit-candidate")).toHaveCount(24);

    await page.getByLabel("Availability").selectOption("free_agent");
    await expect(page.getByTestId("fit-results-status")).toContainText("Showing 24 of 25 candidates");
    await expect(page.getByTestId("fit-candidate")).toHaveCount(24);
  });

  test("GNFC Fit pagination preserves minutes evidence and omits cap controls", async ({ page, request }) => {
    const token = await tokenFor(request, "gnfc-manager-subject");
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
    await page.goto(`${app}/players?league=gnfc&view=fit`);
    await expect(page.getByTestId("fit-cap-scope")).toHaveCount(0);
    await page.getByLabel("Position").selectOption("PG");
    await expect(page.getByTestId("fit-results-status")).toContainText("Showing 24 of 25 candidates");
    await expect(page.getByText(/Minutes ↑/i).first()).toBeVisible();
    await page.getByTestId("fit-load-more").click();
    await expect(page.getByTestId("fit-candidate")).toHaveCount(25);
    await expect(page.getByText(/Minutes ↑/i).first()).toBeVisible();
    await expect(page.getByTestId("fit-cap-scope")).toHaveCount(0);
  });

  test("no Load more when the first page already contains all candidates", async ({ page, request }) => {
    const token = await tokenFor(request);
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
    await page.goto(`${app}/players?league=ldl&view=fit`);
    await expect(page.getByTestId("fit-results-status")).toContainText("Showing 3 of 3 candidates");
    await expect(page.getByTestId("fit-load-more")).toHaveCount(0);
  });
});
