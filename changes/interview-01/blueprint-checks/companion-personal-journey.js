async (rootPage) => {
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const context = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const check = (v, m) => {
    if (!v) throw Error(m);
  };
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  await page.route("**/*.mjs", (route) => route.continue());
  await page.goto("http://127.0.0.1:8879/");
  // Explicit personal-parent fixture; creation and connection below use real UI commands.
  await page.evaluate(async () => {
    const s = (await import("/state.mjs")).createInitialState();
    Object.assign(s.actors.livia, { visibility: "private", campaignIds: [] });
    localStorage.setItem("d20-studio-blueprint-v1", JSON.stringify(s));
  });
  await page.goto("http://127.0.0.1:8879/#characters?id=livia&tab=extras");
  await page.reload();
  await page.locator('[data-forms-entry="livia"][data-forms-tab="companions"]').first().click();
  await page.locator("[data-forms-add-manual]").click();
  await page.locator('[data-forms-field="name"]').fill("Private Moss");
  await page.locator('[data-forms-profile="srd2024:cat"]').click();
  await page.locator("[data-forms-preview]").click();
  await page.locator("[data-forms-apply]").click();
  let s = await saved();
  const pet = Object.values(s.actors).find((a) => a.name === "Private Moss");
  await page.locator('[data-forms-companion="' + pet.id + '"]').click();
  await page.locator("[data-forms-sheet]").click();
  await page.locator('[data-character-action="connect-campaign"]').click();
  check(
    (await page.locator("#dialog").innerText()).includes("altre creature non vengono condivise"),
    "Connection disclosure missing",
  );
  await page.keyboard.press("Escape");
  check(
    (await saved()).actors[pet.id].visibility === "private",
    "Cancelled connection shared creature",
  );
  await page.locator('[data-character-action="connect-campaign"]').click();
  await page.locator('#dialog button[type="submit"]').click();
  s = await saved();
  check(
    s.actors[pet.id].visibility === "shared" &&
      s.actors.livia.visibility === "private" &&
      s.actors.livia.campaignIds.length === 0,
    "Connection shared parent or failed to share selected companion",
  );
  check(!s.scenes[0].tokens.some((t) => t.actorId === pet.id), "Connection auto-placed creature");
  await page.reload();
  await page.locator("#demo-role").selectOption("dm");
  await page.getByRole("heading", { name: "Private Moss", exact: true }).waitFor();
  await page.goto("http://127.0.0.1:8879/#characters?id=livia");
  check(
    (await page.getByRole("heading", { name: "Livia", exact: true }).count()) === 0,
    "Sharing companion exposed private parent",
  );
  await page.locator("#demo-role").selectOption("player");
  await page.goto("http://127.0.0.1:8879/#characters?id=livia&tab=extras");
  await page.locator('[data-forms-entry="livia"][data-forms-tab="companions"]').first().click();
  await page.locator('[data-forms-companion="' + pet.id + '"]').click();
  await page.locator("[data-forms-place]").click();
  await page.locator("[data-placement-cancel]").waitFor();
  await page.locator("#battle-map").focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.locator('[data-actor="' + pet.id + '"]').waitFor();
  check(errors.length === 0, errors.join("; "));
  await context.close();
  return {
    passed: [
      "Personal companion has its own explicit cancelable connection; parent sheet stays private",
      "Shared companion survives reload, is visible to DM, and can be placed separately",
    ],
    errors,
  };
}
