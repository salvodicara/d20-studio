async (rootPage) => {
  const context = await rootPage
    .context()
    .browser()
    .newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      timezoneId: "America/New_York",
    });
  const page = await context.newPage(),
    passed = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:8879/#campaign?tab=sessions");
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const button = (name) => page.getByRole("button", { name, exact: true });
  const field = (path) => page.locator('[data-campaign-path="' + path + '"]');
  const stored = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  await button("Preferenze").tap();
  await page.locator('#dialog [name="lang"]').selectOption("en");
  await button("Salva preferenze").tap();
  await page.locator("#demo-role").selectOption("dm");
  await page.locator('[data-campaign-new-session="direct"]').tap();
  await field("data.title").fill("Autumn session");
  await field("data.localTime").fill("2026-10-25T02:30");
  await field("data.timeZone").fill("Europe/Rome");
  await page.locator("[data-campaign-save]").tap();
  check(
    await page.locator("[data-campaign-apply]").isDisabled(),
    "Ambiguous time was silently resolved",
  );
  check(
    (await field("data.selectedInstant").locator("option").count()) === 3,
    "Repeated hour did not expose two candidate instants",
  );
  await field("data.selectedInstant").selectOption("2026-10-25T01:30:00.000Z");
  await page.locator("[data-campaign-save]").tap();
  check(
    !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)),
    "Touch appointment editor overflows",
  );
  await page.locator("[data-campaign-apply]").tap();
  await page.getByRole("heading", { name: "Sessions", exact: true, level: 1 }).waitFor();
  let state = await stored();
  // Refreshed by the hand-off writer (29/09/2026): the example always has «Il sigillo della torre» on the
  // coming Thursday (sample-clock.mjs); these checks read the appointments created here.
  const created = (s) => s.campaign.sessions.filter((x) => x.id !== "session-sample-13");
  check(
    created(state).length === 1 && created(state)[0].startsAt === "2026-10-25T01:30:00.000Z",
    "Explicit folded-hour choice was not stored",
  );
  const dates = await page.locator("#content").innerText();
  check(
    dates.includes("America/New_York") && dates.includes("Europe/Rome"),
    "Session list omitted the actual local or original timezone",
  );
  check(
    dates.includes("21:30") && dates.includes("02:30"),
    "Session list conflated different timezone times",
  );
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/campaign-mobile-sessions-en.png",
    fullPage: true,
  });
  await page.locator('[data-campaign-new-session="direct"]').tap();
  await field("data.localTime").fill("2027-03-28T02:30");
  await field("data.timeZone").fill("Europe/Rome");
  await page.locator("[data-campaign-save]").tap();
  check(
    await page.locator("[data-campaign-apply]").isDisabled(),
    "Nonexistent spring hour was shifted silently",
  );
  check(
    (await field("data.localTime").inputValue()) === "2027-03-28T02:30",
    "Validation changed the entered time",
  );
  check(created(await stored()).length === 1, "Invalid time created an appointment");
  passed.push(
    "English touch appointment explicitly resolves repeated hour, rejects missing hour, and labels New York versus Rome across dates",
  );
  await page.locator('[data-service="notes"]').tap();
  await page.locator('[data-campaign-new="note"]').tap();
  await page.locator("[data-campaign-context]").selectOption("");
  await field("data.title").fill("A private travel note");
  await field("data.body").fill("The body remains in its authored language.");
  await button("Home").tap();
  check(await page.locator("#dialog").isVisible(), "Touch dirty departure bypassed guard");
  await page.keyboard.press("Escape");
  check(
    (await field("data.body").inputValue()).includes("authored language"),
    "Escape lost note input",
  );
  await page.locator("[data-campaign-save]").tap();
  await page.locator("[data-campaign-apply]").tap();
  await page
    .getByRole("heading", { name: "A private travel note", exact: true, level: 1 })
    .waitFor();
  state = await stored();
  check(
    state.campaignContent.entries.find((entry) => entry.kind === "note").campaignId === null,
    "Standalone note forced a campaign",
  );
  check(
    !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)),
    "Touch note detail overflows",
  );
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/campaign-mobile-note-en.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  check(
    !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)),
    "Desktop note detail overflows",
  );
  passed.push(
    "Standalone personal note works by touch, guards dirty departure, retains authored text and fits 390/1440 layouts",
  );
  check(errors.length === 0, "Runtime errors: " + errors.join("; "));
  await context.close();
  return { passed, errors };
}
