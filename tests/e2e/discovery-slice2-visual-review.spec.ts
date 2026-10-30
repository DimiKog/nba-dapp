import { expect, test, type APIRequestContext } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const app = "http://127.0.0.1:3102";
const accessHeader = "cf-access-jwt-assertion";
const outDir = path.resolve("tmp/discovery-slice2-review");

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

test.describe("Discovery Slice 2 visual review", () => {
  test("capture Watched and FA Trends desktop + mobile, plus GNFC states", async ({ page, request }) => {
    await mkdir(outDir, { recursive: true });
    const token = await tokenFor(request);
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });

    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(`${app}/players?league=ldl&view=watched`);
    await expect(page.getByTestId("discovery-watched")).toBeVisible();
    await expect(page.getByTestId("watched-row").first()).toBeVisible();
    await page.screenshot({
      path: path.join(outDir, "01-watched-desktop.png"),
      fullPage: true,
    });

    await page.goto(`${app}/players?league=ldl&view=fa-trends`);
    await expect(page.getByTestId("discovery-fa-trends")).toBeVisible();
    await expect(page.getByTestId("fa-trend-row").first()).toBeVisible();
    await page.screenshot({
      path: path.join(outDir, "02-fa-trends-desktop.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${app}/players?league=ldl&view=watched`);
    await expect(page.getByTestId("watched-row").first()).toBeVisible();
    await page.screenshot({
      path: path.join(outDir, "03-watched-mobile.png"),
      fullPage: true,
    });

    await page.goto(`${app}/players?league=ldl&view=fa-trends`);
    await expect(page.getByTestId("fa-trend-row").first()).toBeVisible();
    await page.screenshot({
      path: path.join(outDir, "04-fa-trends-mobile.png"),
      fullPage: true,
    });

    const gnfcToken = await tokenFor(request, "gnfc-manager-subject");
    await page.context().setExtraHTTPHeaders({ [accessHeader]: gnfcToken });
    await page.setViewportSize({ width: 1440, height: 1100 });

    await page.goto(`${app}/players?league=gnfc&view=watched`);
    await expect(page.getByTestId("discovery-watched")).toBeVisible();
    await page.screenshot({
      path: path.join(outDir, "05-gnfc-watched-desktop.png"),
      fullPage: true,
    });

    await page.goto(`${app}/players?league=gnfc&view=fa-trends`);
    await expect(page.getByTestId("fa-trends-not-ready")).toBeVisible();
    await page.screenshot({
      path: path.join(outDir, "06-gnfc-fa-not-ready-desktop.png"),
      fullPage: true,
    });
  });
});
