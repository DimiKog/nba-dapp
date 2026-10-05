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

test("unconfigured league stays closed across shared fantasy routes", async ({ request }) => {
  const getRoutes = [
    ["/api/fantasy/third/category-strategy", 404],
    ["/api/fantasy/third/roster/team-a/targets", 404],
    ["/api/fantasy/third/roster/team-a/trade-analysis", 400],
    ["/api/fantasy/third/roster/team-a/trade-partners", 400],
    ["/api/fantasy/third/players/123/research", 400],
    ["/api/fantasy/third/players/123/injury-report", 400],
    ["/api/fantasy/third/players/123/my-trade-outlook", 400],
    ["/api/watchlist/third", 404],
  ] as const;
  for (const [path, status] of getRoutes) {
    expect((await request.get(`${app}${path}`)).status()).toBe(status);
  }
  const postRoutes = [
    "/api/fantasy/third/trade-suggestions",
    "/api/fantasy/third/trade-package-suggestions",
    "/api/fantasy/third/trade-package-analysis",
  ];
  for (const path of postRoutes) {
    expect((await request.post(`${app}${path}`, { data: {} })).status()).toBe(404);
  }
});

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

test("private trade outlook is isolated per account", async ({ request }) => {
  const [tokenA, tokenB] = await Promise.all([
    tokenFor(request, "manager-a-subject"), tokenFor(request, "manager-b-subject"),
  ]);
  const path = `${app}/api/fantasy/ldl/players/1631212/my-trade-outlook`;
  const body = {
    assessment: "positive", availability: "moderate", upside: "steady",
    note: "Private manager A note", sourceUrl: "https://example.com/player",
    sourceDate: "2026-09-28",
  };
  expect((await request.get(path, { headers: { [accessHeader]: tokenB } })).status()).toBe(200);
  const saved = await request.put(path, { headers: { [accessHeader]: tokenA }, data: body });
  expect(saved.ok()).toBeTruthy();
  expect((await saved.json()).brief.note).toBe(body.note);
  expect((await (await request.get(path, { headers: { [accessHeader]: tokenB } })).json()).brief).toBeNull();
  expect((await (await request.get(path, { headers: { [accessHeader]: tokenA } })).json()).brief.note).toBe(body.note);
  expect((await request.get(path)).status()).toBe(401);
  expect((await request.delete(path, { headers: { [accessHeader]: tokenA } })).ok()).toBeTruthy();
  expect((await (await request.get(path, { headers: { [accessHeader]: tokenA } })).json()).brief).toBeNull();
});

test("reviewed injury report is shared but commissioner-only to write", async ({ request }) => {
  const [tokenA, tokenB] = await Promise.all([
    tokenFor(request, "manager-a-subject"), tokenFor(request, "manager-b-subject"),
  ]);
  const path = `${app}/api/fantasy/ldl/players/1628978/injury-report`;
  const body = {
    status: "injured", summary: "Achilles injury reported by the team",
    sourceUrl: "https://www.nba.com/news/report", sourceDate: "2026-09-30",
    expectedReturnDate: "",
  };
  expect((await request.post(path, { headers: { [accessHeader]: tokenB }, data: body })).status()).toBe(403);
  expect((await request.post(path, { headers: { [accessHeader]: tokenA }, data: body })).status()).toBe(201);
  expect((await (await request.get(path, { headers: { [accessHeader]: tokenB } })).json()).report.summary).toBe(body.summary);
  expect((await request.get(path)).status()).toBe(401);
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

test("scoreboard highlights games featuring the signed-in manager's own players", async ({ page, request }) => {
  const tokenA = await tokenFor(request, "manager-a-subject");
  await page.context().setExtraHTTPHeaders({ [accessHeader]: tokenA });
  await page.goto(app);

  const ownedCard = page.locator("div.rounded-xl", { hasText: "MIN" }).filter({ hasText: "NO" });
  await expect(ownedCard).toHaveCount(1);
  await expect(ownedCard.locator('[aria-label="LDL: Player 2"]')).toBeVisible();
  await expect(ownedCard.locator('[aria-label="BδB: Player 2"]')).toBeVisible();
  await expect(ownedCard.locator('[aria-label="LDL: Player 2"]')).toHaveClass(/border-cyan-500/);
  await expect(ownedCard.locator('[aria-label="BδB: Player 2"]')).toHaveClass(/border-violet-500/);
  await expect(ownedCard).toHaveClass(/border-blue-300/);
  const unownedCard = page.locator("div.rounded-xl", { hasText: "BOS" }).filter({ hasText: "NY" });
  await expect(unownedCard).toHaveCount(1);
  await expect(unownedCard.locator('[aria-label^="LDL:"], [aria-label^="BδB:"]')).toHaveCount(0);
});

test("scoreboard \"Mine only\" toggle filters to games with the manager's players and restores", async ({ page, request }) => {
  const tokenA = await tokenFor(request, "manager-a-subject");
  await page.context().setExtraHTTPHeaders({ [accessHeader]: tokenA });
  await page.goto(app);

  const toggle = page.getByRole("button", { name: "Mine only (1)" });
  const ownedCard = page.locator("div.rounded-xl", { hasText: "MIN" }).filter({ hasText: "NO" });
  const unownedCard = page.locator("div.rounded-xl", { hasText: "BOS" }).filter({ hasText: "NY" });

  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(ownedCard).toHaveCount(1);
  await expect(unownedCard).toHaveCount(1);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(ownedCard).toHaveCount(1);
  await expect(unownedCard).toHaveCount(0);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(unownedCard).toHaveCount(1);
});

test("yesterday's scoreboard results disappear when their Athens cutoff expires", async ({ page, request }) => {
  await page.clock.install({ time: new Date() });
  const tokenA = await tokenFor(request, "manager-a-subject");
  await page.context().setExtraHTTPHeaders({ [accessHeader]: tokenA });
  await page.goto(app);

  const yesterday = page.getByRole("heading", { name: /Yesterday's results/ });
  await expect(yesterday).toBeVisible();
  await expect(page.getByText("TOR", { exact: true })).toBeVisible();

  await page.clock.fastForward(70_000);
  await expect(yesterday).toHaveCount(0);
  await expect(page.getByText("MIN", { exact: true })).toBeVisible();
});

test("scoreboard shows no personal highlights or toggle to visitors without a membership", async ({ page }) => {
  await page.goto(app);
  await expect(page.locator('[aria-label^="LDL: Player"], [aria-label^="BδB: Player"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Mine only/ })).toHaveCount(0);
});

test("free-agent fit explains the weighted score without treating salary or risk as scored", async ({ page, request }) => {
  const token = await tokenFor(request, "manager-a-subject");
  await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
  await page.goto(`${app}/fantasy/ldl/roster/ldl-team-a`);
  await page.getByText("Explore all 1 eligible candidates").click();
  await expect(page.getByText("Model: statistical help for a selected need; future role and minutes unassessed")).toBeVisible();
  await page.getByText("How is this scored?").click();
  await expect(page.getByText(/Salary, tokens, future role and injury risk are not in this score/)).toBeVisible();
});

test("free-agent radar distinguishes recent trend from team fit", async ({ page, request }) => {
  const token = await tokenFor(request, "manager-a-subject");
  await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
  await page.goto(`${app}/watchlist?league=ldl`);
  await expect(page.getByText("Recent trend +1.25 · 4 recent games")).toBeVisible();
  await expect(page.getByText(/Not a team-fit or pickup recommendation/)).toBeVisible();
  await page.getByText("Which categories drive the trend?").click();
  await expect(page.getByText("PTS: 14.00 → 18.00")).toBeVisible();
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

test("pick-for-player advisor submits a canonical pick without an outgoing player", async ({ page, request }) => {
  const token = await tokenFor(request, "manager-a-subject");
  await request.delete(`${app}/api/fantasy/ldl/players/11000/my-trade-outlook`, { headers: { [accessHeader]: token } });
  await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
  const availablePick = {
    id: 42,
    league_slug: "ldl",
    draft_year: 2027,
    round: 1,
    original_franchise: { id: "ldl-franchise-a", name: "Manager A LDL" },
    current_owner: { id: "ldl-franchise-a", name: "Manager A LDL", fantrax_team_external_id: "ldl-team-a" },
    ownership_state: "owned",
    status: "active",
    optimistic_version: 1,
    eligibility: { mode: "enabled", eligible: true, reason: "", opens_at: null, closes_at: null, evaluated_at: "2026-09-27" },
    conditional_obligations: [],
    valuation: { status: "shadow", affects_recommendations: false, compensation_band: { conservative: "useful", optimistic: "strong" } },
  };
  await page.route("**/api/fantasy/ldl/draft-assets?eligibility=eligible", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      league_slug: "ldl",
      rule_set: { fantasy_season: "2026-27", version: 1, activated_at: "2026-09-01" },
      count: 1,
      assets: [availablePick],
    }),
  }));
  const resolvedPick = { ...availablePick, pick_id: 42, type: "draft_pick", from_team: "selected_team", to_team: "counterparty_team" };
  const incomingPlayer = { nba_id: 11000, name: "xrtc Player 1", nba_team: "TST", position: "G", salaries: { "2026-27": 1 } };
  const completionPlayer = { nba_id: 10001, name: "Manager A LDL Player 2", nba_team: "TST", position: "G", salaries: { "2026-27": 1 } };
  const teamResult = (id: string, name: string, before: number, after: number) => ({
    team: { id, name, logo: null, owner: null },
    cap_legality: { eligible: true },
    roster_slots: { before, after },
    payroll: { current_cap_result: "remains_under", seasons: [] },
    category_changes: [{
      key: "fg_pct", label: "FG%", before: { league_rank: 5 }, after: { league_rank: 5 },
      z_delta: 0.1, transition: "unchanged",
    }],
  });
  let firstAnalysis = true;
  await page.route("**/api/fantasy/ldl/trade-package-analysis", (route) => {
    if (!firstAnalysis) return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        analysis_scope: "player_package",
        completion_status: "legal_as_proposed",
        recommendation_tier: "proposable",
        decision_explanation: {
          schema_version: 1, recommendation_tier: "proposable", tier_reason_codes: [],
          checks: {
            category_fit: { passed: true, score: 0, reason_code: "category_fit_nonnegative" },
            partner_incentive: { passed: true, status: "positive", reason_code: "partner_incentive_positive" },
            roster_boundary: { passed: true, reason_code: "roster_boundary_available" },
            player_value: { passed: true, classification: "balanced", reason_code: "player_value_balanced" },
          },
          completion: { status: "legal_as_proposed", legal_as_entered: true, reason_code: "completion_legal_as_proposed" },
          current_season_cap: { season: "2026-27", before_payroll: 100000000, after_payroll: 102000000, payroll_delta: 2000000, before_remaining: 15000000, after_remaining: 13000000, eligibility_reason_code: "remains_under" },
          limitations: { pick_value_changes_tier: false, manager_outlook_changes_tier: false },
        },
        acquisition_context: { status: "free_agency_open_cap_not_enforced", message: "Offseason context" },
        package: { selected_team_sends: [completionPlayer], counterparty_team_sends: [incomingPlayer], drops: { selected_team: null, counterparty_team: null }, assets: [resolvedPick] },
        selected_team: { ...teamResult("ldl-team-a", "Manager A LDL", 14, 14), category_score: { score: 0 } },
        counterparty_team: { ...teamResult("ldl-team-b", "xrtc", 13, 13), acceptance: { status: "positive", reason: "Partner benefits" } },
        completion_options: { drop_candidates: [], expanded_packages: [] },
        production_value: {
          classification: "balanced", compensation_required: false,
          selected_team: { sent: 1, received: 1, retained_ratio: 1, value_gap_to_balanced: 0 },
          counterparty_team: { sent: 1, received: 1, retained_ratio: 1, value_gap_to_balanced: 0 },
        },
        pick_value: {
          selected_team: { incoming_assets: [], combined_valuation: null, assessment: null },
          counterparty_team: { incoming_assets: [resolvedPick], combined_valuation: { compensation_band: { conservative: "useful", optimistic: "strong" } }, assessment: null },
        },
      }),
    });
    firstAnalysis = false;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        analysis_scope: "pick_for_player_context",
        completion_status: "illegal",
        acquisition_context: { status: "free_agency_open_cap_not_enforced", message: "Offseason context" },
        package: { selected_team_sends: [], counterparty_team_sends: [incomingPlayer], drops: { selected_team: null, counterparty_team: null }, assets: [resolvedPick] },
        selected_team: teamResult("ldl-team-a", "Manager A LDL", 14, 15),
        counterparty_team: teamResult("ldl-team-b", "xrtc", 13, 12),
        completion_options: { drop_candidates: [], expanded_packages: [{
          type: "expanded_package", team: "selected_team", completion_status: "legal_as_expanded_package", player: completionPlayer,
        }] },
        pick_value: {
          selected_team: { incoming_assets: [], combined_valuation: null, assessment: null },
          counterparty_team: { incoming_assets: [resolvedPick], combined_valuation: { compensation_band: { conservative: "useful", optimistic: "strong" } }, assessment: null },
        },
      }),
    });
  });
  await page.goto(`${app}/fantasy/ldl/roster/ldl-team-a/trade?mode=analyze`);
  await page.getByRole("combobox", { name: "Trade partner" }).fill("xrtc");
  await page.getByRole("option", { name: "xrtc" }).click();
  await page.getByRole("combobox", { name: "You receive" }).fill("xrtc Player 1");
  await page.getByRole("option", { name: /^xrtc Player 1 G/ }).click();
  const analyze = page.getByRole("button", { name: "Analyze trade" }).last();
  await expect(analyze).toBeDisabled();
  await page.getByRole("checkbox").check();
  await expect(analyze).toBeEnabled();

  const submitted = page.waitForRequest((incoming) => incoming.method() === "POST" && incoming.url().endsWith("/trade-package-analysis"));
  await analyze.click();
  const payload = (await submitted).postDataJSON();
  expect(payload.selected_team_sends).toEqual([]);
  expect(payload.counterparty_team_sends).toEqual([11000]);
  expect(payload.assets).toEqual([{ type: "draft_pick", pick_id: 42, from_team: "selected_team" }]);
  await expect(page.getByText(/Provisional analysis: salary and categories/)).toBeVisible();
  await expect(page.getByText("1 without meaningful change")).toBeVisible();
  const completedRequest = page.waitForRequest((outgoing) => outgoing.method() === "POST" && outgoing.url().endsWith("/trade-package-analysis") && (outgoing.postDataJSON() as { selected_team_sends: number[] }).selected_team_sends.length > 0);
  await page.getByRole("button", { name: "Recalculate completed trade" }).click();
  expect((await completedRequest).postDataJSON()).toMatchObject({
    selected_team_sends: [10001],
    counterparty_team_sends: [11000],
    drops: { selected_team: null, counterparty_team: null },
    assets: [{ type: "draft_pick", pick_id: 42, from_team: "selected_team" }],
  });
  await expect(page.getByRole("heading", { name: "Exact trade package" })).toBeVisible();
  await expect(page.getByText("Draft pick · 2027 Round 1 · originally Manager A LDL")).toBeVisible();
  await expect(page.getByText("Player-value assessment · picks excluded")).toBeVisible();
  await expect(page.getByText("Passes model checks", { exact: true })).toBeVisible();
  const comparison = page.getByRole("region", { name: "Model and private assessment for xrtc Player 1" });
  const exactResult = page.getByRole("heading", { name: "Exact trade package" }).locator("../..");
  await expect(comparison.getByText("Model · category impact")).toBeVisible();
  await expect(comparison.getByText("The package passes the model checks")).toBeVisible();
  await expect(comparison.getByText("2026-27 payroll: +$2M")).toBeVisible();
  await expect(comparison.getByText("Why did the model reach this result?")).toBeVisible();
  await expect(comparison.getByText(/Category fit: passes/)).not.toBeVisible();
  await comparison.getByText("Why did the model reach this result?").click();
  await expect(comparison.getByText(/Category fit: passes/)).toBeVisible();
  await expect(comparison.getByText("My assessment · xrtc Player 1")).toBeVisible();
  await expect(comparison.getByText("Not assessed")).toBeVisible();
  await expect(comparison.getByText("0 meaningful gains · 0 meaningful declines")).toBeVisible();
  expect((await comparison.boundingBox())!.y).toBeLessThan((await exactResult.getByText("You send", { exact: true }).boundingBox())!.y);
  const categorySummary = page.getByText("What changes in your categories?");
  const otherChecks = page.getByText("Other checks", { exact: true });
  const researchSummary = page.getByText("Review player outlook and sources");
  await expect(categorySummary).toBeVisible();
  await expect(otherChecks).toBeVisible();
  await expect(researchSummary).toBeVisible();
  expect((await categorySummary.boundingBox())!.y).toBeLessThan((await otherChecks.boundingBox())!.y);
  expect((await categorySummary.boundingBox())!.y).toBeLessThan((await researchSummary.boundingBox())!.y);
  await expect(page.getByText("Partner team impact")).not.toBeVisible();
  await expect(page.getByText("How is player value calculated?")).not.toBeVisible();
  const categoryPanel = page.getByRole("region", { name: "What changes in your categories?" });
  await expect(categoryPanel.getByText("No meaningful category swing in this simulation.")).toBeVisible();
  await expect(categoryPanel.getByText("FG%", { exact: true })).not.toBeVisible();
  await categoryPanel.getByText("Show all 1 categories and smaller changes").click();
  await expect(categoryPanel.getByText("FG%", { exact: true })).toBeVisible();
  await otherChecks.click();
  await expect(page.getByText("Partner team impact")).toBeVisible();
  await expect(page.getByText("Your read on xrtc Player 1")).not.toBeVisible();
  await page.getByText("Review player outlook and sources").click();
  await expect(page.getByText("Your read on xrtc Player 1")).toBeVisible();
  await expect(page.getByText("Research across sources")).not.toBeVisible();
  await page.getByText("Open news and all research sources").click();
  await expect(page.getByText("Research across sources")).toBeVisible();
  await page.getByRole("button", { name: "Concern" }).click();
  await page.getByLabel("Availability risk").selectOption("high");
  await page.getByLabel("Future upside").selectOption("steady");
  await page.getByRole("button", { name: "Save brief" }).click();
  await expect(comparison.getByText("Concern", { exact: true })).toBeVisible();
  await expect(comparison.getByText("Availability: high · upside: steady")).toBeVisible();
  await expect(page.getByText("Private to your account.")).toBeVisible();
  await expect(page.getByText("Passes model checks", { exact: true })).toBeVisible();

  const noPick = await request.post(`${app}/api/fantasy/ldl/trade-package-analysis`, {
    headers: { [accessHeader]: token },
    data: { ...payload, assets: [] },
  });
  expect(noPick.status()).toBe(400);
  expect(await noPick.json()).toEqual({ error: "Invalid manual trade-package request" });

  const otherManagerTeam = await request.post(`${app}/api/fantasy/ldl/trade-package-analysis`, {
    headers: { [accessHeader]: token },
    data: { ...payload, selected_team_id: "ldl-team-c" },
  });
  expect(otherManagerTeam.status()).toBe(403);
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
  await expect(page.getByRole("heading", { name: "Record completed trade" }).locator("../..").getByRole("button", { name: "Reset form" })).toBeVisible();

  await page.getByLabel("Franchise 1").selectOption("ldl-franchise-a");
  await page.getByLabel("Franchise 2").selectOption("ldl-franchise-b");
  const sentGroups = page.getByRole("group", { name: "Players sent" });
  await sentGroups.nth(0).getByRole("searchbox").fill("Alpha Player");
  await sentGroups.nth(1).getByRole("searchbox").fill("Beta Player");
  for (const [index, name] of ["Alpha Player 1", "Alpha Player 2", "Alpha Player 3"].entries()) {
    await sentGroups.nth(0).getByLabel(`${name} · G · TST · ID ${10 + index}`).check();
  }
  for (const [index, name] of ["Beta Player 1", "Beta Player 2", "Beta Player 3"].entries()) {
    await sentGroups.nth(1).getByLabel(`${name} · G · TST · ID ${20 + index}`).check();
  }
  await page.getByLabel("Latest stored roster snapshot has not caught up").check();
  await page.getByRole("button", { name: "Review trade" }).click();

  await expect(page.getByText("Check every transfer before recording")).toBeVisible();
  await expect(page.getByText(/Stored roster verification will be pending/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm and record" })).toBeDisabled();
  await page.getByLabel("I checked the trade date, every asset, and each destination against the source announcement.").check();
  await page.getByRole("button", { name: "Confirm and record" }).click();
  await expect(page.getByText(/Trade recorded with receipt/)).toBeVisible();
});

test("commissioner can direct assets across three franchises", async ({ page, request }) => {
  const token = await tokenFor(request, "manager-a-subject");
  await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
  await page.goto(`${app}/commissioner/trades?league=ldl`);

  await page.getByRole("button", { name: "+ Add franchise" }).click();
  await page.getByLabel("Franchise 1").selectOption("ldl-franchise-a");
  await page.getByLabel("Franchise 2").selectOption("ldl-franchise-b");
  await page.getByLabel("Franchise 3").selectOption("ldl-franchise-c");

  const sentGroups = page.getByRole("group", { name: "Players sent" });
  for (const [index, name] of ["Alpha", "Beta", "Gamma"].entries()) {
    await sentGroups.nth(index).getByRole("searchbox").fill(`${name} Player 1`);
    await sentGroups.nth(index).getByLabel(`${name} Player 1 · G · TST · ID ${(index + 1) * 10}`).check();
  }
  const destinations = page.getByRole("group", { name: "Player destinations" });
  await destinations.nth(0).getByRole("combobox").selectOption("ldl-franchise-b");
  await destinations.nth(1).getByRole("combobox").selectOption("ldl-franchise-c");
  await destinations.nth(2).getByRole("combobox").selectOption("ldl-franchise-a");

  await page.getByRole("button", { name: "Review trade" }).click();
  await expect(page.getByText("Check every transfer before recording")).toBeVisible();
  const transferRows = page.getByRole("list", { name: "Trade transfers" }).getByRole("listitem");
  await expect(transferRows).toHaveCount(3);
  await expect(transferRows.nth(0)).toContainText("Alpha Player 1");
  await expect(transferRows.nth(0)).toContainText("→ Beta");
  await expect(transferRows.nth(1)).toContainText("Beta Player 1");
  await expect(transferRows.nth(1)).toContainText("→ Gamma");
  await expect(transferRows.nth(2)).toContainText("Gamma Player 1");
  await expect(transferRows.nth(2)).toContainText("→ Alpha");
  await page.getByLabel("I checked the trade date, every asset, and each destination against the source announcement.").check();
  const submitted = page.waitForRequest((incoming) => incoming.method() === "POST" && incoming.url().endsWith("/commissioner/completed-trades"));
  await page.getByRole("button", { name: "Confirm and record" }).click();
  const payload = (await submitted).postDataJSON();
  expect(payload.franchise_ids).toEqual(["ldl-franchise-a", "ldl-franchise-b", "ldl-franchise-c"]);
  expect(payload.assets).toEqual([
    { type: "player", player_id: 10, from_franchise_id: "ldl-franchise-a", to_franchise_id: "ldl-franchise-b" },
    { type: "player", player_id: 20, from_franchise_id: "ldl-franchise-b", to_franchise_id: "ldl-franchise-c" },
    { type: "player", player_id: 30, from_franchise_id: "ldl-franchise-c", to_franchise_id: "ldl-franchise-a" },
  ]);
  await expect(page.getByText(/Trade recorded with receipt/)).toBeVisible();
});

test("player search is scoped to the sender's roster history and reset clears the draft", async ({ page, request }) => {
  const token = await tokenFor(request, "manager-a-subject");
  await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
  await page.goto(`${app}/commissioner/trades?league=ldl`);

  await page.getByLabel("Franchise 1").selectOption("ldl-franchise-a");
  await page.getByLabel("Franchise 2").selectOption("ldl-franchise-b");
  const sent = page.getByRole("group", { name: "Players sent" }).nth(0);
  await sent.getByRole("searchbox").fill("Beta Player");
  await expect(sent.getByText(/Beta Player 1/)).toHaveCount(0);
  await sent.getByRole("searchbox").fill("Unrelated Player");
  await expect(sent.getByRole("checkbox", { name: /Unrelated Player/ })).toHaveCount(0);
  await sent.getByRole("searchbox").fill("Alpha Former Player");
  await expect(sent.getByLabel(/Alpha Former Player.*Earlier roster/)).toBeVisible();
  await sent.getByLabel(/Alpha Former Player.*Earlier roster/).check();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reset form" }).click();
  await expect(page.getByLabel("Franchise 1")).toHaveValue("");
  await expect(page.getByLabel("Franchise 2")).toHaveValue("");
  await expect(page.getByRole("group", { name: "Players sent" })).toHaveCount(0);
});

test("final review separates original pick team from sender and highlights the trade date", async ({ page, request }) => {
  const token = await tokenFor(request, "manager-a-subject");
  await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
  await page.goto(`${app}/commissioner/trades?league=ldl`);

  await page.getByLabel("Franchise 1").selectOption("ldl-franchise-a");
  await page.getByLabel("Franchise 2").selectOption("ldl-franchise-b");
  const sentGroups = page.getByRole("group", { name: "Players sent" });
  await sentGroups.nth(0).getByRole("searchbox").fill("Alpha Player 1");
  await sentGroups.nth(0).getByLabel("Alpha Player 1 · G · TST · ID 10").check();
  await sentGroups.nth(1).getByRole("searchbox").fill("Beta Player 1");
  await sentGroups.nth(1).getByLabel("Beta Player 1 · G · TST · ID 20").check();
  await page.getByRole("group", { name: "Draft picks sent" }).nth(0).getByLabel("2028 Round 2 · Gamma").check();
  await page.getByLabel("Approved on (Discord poll)").fill("2026-09-17");
  await page.getByLabel("Applied in Fantrax on (optional)").fill("2026-09-18");
  await page.getByRole("button", { name: "Review trade" }).click();

  await expect(page.getByTestId("review-trade-date")).toHaveText("2026-09-17");
  await expect(page.getByText(/Applied in Fantrax: 2026-09-18/)).toBeVisible();
  const transfers = page.getByRole("list", { name: "Trade transfers" }).getByRole("listitem");
  await expect(transfers).toHaveCount(3);
  await expect(transfers.nth(1)).toContainText("Alpha");
  await expect(transfers.nth(1)).toContainText("2028 Round 2 (originally Gamma)");
  await expect(transfers.nth(1)).toContainText("→ Beta");
  await expect(page.getByRole("button", { name: "Confirm and record" })).toBeDisabled();

  await page.getByRole("button", { name: "Change date" }).click();
  await expect(page.getByText("Check every transfer before recording")).toHaveCount(0);
  await page.getByLabel("Approved on (Discord poll)").fill("2026-09-18");
  await page.getByRole("button", { name: "Review trade" }).click();
  await expect(page.getByTestId("review-trade-date")).toHaveText("2026-09-18");
  await page.getByLabel("I checked the trade date, every asset, and each destination against the source announcement.").check();
  await expect(page.getByRole("button", { name: "Confirm and record" })).toBeEnabled();
});

test("BδB uses an announcement date rather than a poll approval label", async ({ page, request }) => {
  const token = await tokenFor(request, "manager-a-subject");
  await page.context().setExtraHTTPHeaders({ [accessHeader]: token });
  await page.goto(`${app}/commissioner/trades?league=bdb`);
  await expect(page.getByLabel("Announced on Discord")).toHaveAttribute("type", "date");
  await expect(page.getByText("Use the trade announcement date. No time is needed.")).toBeVisible();
});

test("anonymous visitors never receive personal navigation", async ({ page }) => {
  await page.goto(app);
  await expect(page.getByRole("link", { name: "My LDL" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "My BδB" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Commissioner" })).toHaveCount(0);
  await expect(page.getByText("Personal features unavailable in this preview")).toBeVisible();
});
