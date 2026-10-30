import { expect, test, type APIRequestContext } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const app = "http://127.0.0.1:3102";
const accessHeader = "cf-access-jwt-assertion";
const outDir = path.resolve("tmp/discovery-slice0-review");

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

test.describe("Discovery Slice 0 visual review", () => {
  test("capture Browse desktop, Fit desktop, and Browse mobile", async ({ page, request }) => {
    await mkdir(outDir, { recursive: true });
    const token = await tokenFor(request);
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });

    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(`${app}/players?league=ldl&view=browse`);
    await expect(page.getByRole("heading", { name: "Players" })).toBeVisible();
    await expect(page.getByText("Player Discovery")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Browse" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText(/players · .* free agent/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Visible players")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /player rankings/i })).toHaveCount(0);
    await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 20_000 });
    await page.screenshot({
      path: path.join(outDir, "01-browse-desktop.png"),
      fullPage: true,
    });

    await page.goto(`${app}/players?league=ldl&view=fit`);
    await expect(page.getByRole("tab", { name: "Fit to my plan" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("discovery-fit")).toBeVisible();
    await expect(page.getByText("Fit to my plan is being consolidated")).toHaveCount(0);
    await page.screenshot({
      path: path.join(outDir, "02-fit-desktop.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${app}/players?league=ldl&view=browse`);
    await expect(page.getByRole("heading", { name: "Players" })).toBeVisible();
    await expect(page.getByText(/players · .* free agent/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "More" }).first()).toBeVisible();
    await expect(page.locator("article").filter({ hasText: "More" }).first()).toBeVisible();
    await page.screenshot({
      path: path.join(outDir, "03-browse-mobile.png"),
      fullPage: true,
    });
  });
});
