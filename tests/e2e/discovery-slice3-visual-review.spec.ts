import { expect, test, type APIRequestContext } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const app = "http://127.0.0.1:3102";
const accessHeader = "cf-access-jwt-assertion";
const outDir = path.resolve("tmp/discovery-slice3-review");

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

test.describe("Discovery Slice 3 visual review", () => {
  test("capture compact LDL Fit automatic desktop after density fix", async ({ page, request }) => {
    await mkdir(outDir, { recursive: true });
    const token = await tokenFor(request);
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });

    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(`${app}/players?league=ldl&view=fit`);
    await expect(page.getByTestId("discovery-fit")).toBeVisible();
    await expect(page.getByTestId("fit-candidate").first()).toBeVisible();
    await page.screenshot({
      path: path.join(outDir, "06-fit-ldl-automatic-desktop-compact.png"),
      fullPage: true,
    });
  });

  test("capture Fit automatic, PUNT explore, mobile, and GNFC", async ({ page, request }) => {
    await mkdir(outDir, { recursive: true });
    const token = await tokenFor(request);
    await page.context().setExtraHTTPHeaders({ [accessHeader]: token });

    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(`${app}/players?league=ldl&view=fit`);
    await expect(page.getByTestId("discovery-fit")).toBeVisible();
    await expect(page.getByTestId("fit-candidate").first()).toBeVisible();
    await page.getByTestId("fit-strategy-secondary-toggle").click();
    await expect(page.getByTestId("fit-strategy-secondary")).toBeVisible();
    await page.screenshot({
      path: path.join(outDir, "01-fit-ldl-automatic-desktop.png"),
      fullPage: true,
    });

    await page.getByTestId("fit-category").selectOption("turnovers");
    await expect(page.getByTestId("fit-mode-status")).toContainText("Exploring: TO");
    await page.screenshot({
      path: path.join(outDir, "02-fit-ldl-punt-explore-desktop.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${app}/players?league=ldl&view=fit`);
    await expect(page.getByTestId("fit-candidate").first()).toBeVisible();
    await page.screenshot({
      path: path.join(outDir, "03-fit-ldl-automatic-mobile.png"),
      fullPage: true,
    });

    const gnfcToken = await tokenFor(request, "gnfc-manager-subject");
    await page.context().setExtraHTTPHeaders({ [accessHeader]: gnfcToken });
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(`${app}/players?league=gnfc&view=fit`);
    await expect(page.getByTestId("discovery-fit")).toBeVisible();
    await expect(page.getByTestId("fit-candidate").first()).toBeVisible();
    await page.screenshot({
      path: path.join(outDir, "04-fit-gnfc-desktop.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${app}/players?league=gnfc&view=fit`);
    await expect(page.getByTestId("fit-candidate").first()).toBeVisible();
    await page.screenshot({
      path: path.join(outDir, "05-fit-gnfc-mobile.png"),
      fullPage: true,
    });
  });
});
