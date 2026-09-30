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
  await page.goto("http://127.0.0.1:8879/#characters?id=livia&tab=extras");
  await page.locator('[data-forms-entry][data-forms-tab="companions"]').click();
  await page.locator("[data-forms-add-manual]").click();
  await page.locator('[data-forms-field="name"]').fill("Muschio");
  await page.locator('[data-forms-profile="srd2024:cat"]').click();
  await page.locator("[data-forms-preview]").click();
  await page.locator("[data-forms-apply]").click();
  let s = await saved();
  const pet = Object.values(s.actors).find((a) => a.name === "Muschio"),
    slots = s.actors.livia.slots.used;
  check(
    pet && !s.scenes[0].tokens.some((t) => t.actorId === pet.id),
    "Creation wrongly placed token",
  );
  await page.locator('[data-forms-companion="' + pet.id + '"]').click();
  await page.locator("[data-forms-place]").click();
  await page.locator("[data-placement-cancel]").waitFor();
  await page.keyboard.press("Escape");
  check(
    (await saved()).scenes[0].tokens.every((t) => t.actorId !== pet.id),
    "Escape placed token",
  );
  await page.goto("http://127.0.0.1:8879/#characters?id=livia&tab=extras");
  await page.locator('[data-forms-entry][data-forms-tab="companions"]').click();
  await page.locator('[data-forms-companion="' + pet.id + '"]').click();
  await page.locator("[data-forms-place]").click();
  await page.locator("[data-placement-cancel]").waitFor();
  const svg = page.locator("#battle-map");
  const location = await svg.evaluate((el) => {
    const p = el.createSVGPoint();
    p.x = 500;
    p.y = 350;
    const at = p.matrixTransform(el.getScreenCTM());
    return { x: at.x, y: at.y };
  });
  await page.mouse.move(location.x, location.y);
  await page.mouse.click(location.x, location.y);
  await page.locator('[data-actor="' + pet.id + '"]').waitFor();
  s = await saved();
  check(
    s.scenes[0].tokens.filter((t) => t.actorId === pet.id).length === 1,
    "No unique placed token",
  );
  check(s.actors.livia.slots.used === slots, "Placement spent another slot");
  check(
    (await page.locator('[data-actor="' + pet.id + '"]').getAttribute("class")).includes(
      "hostile",
    ) === false,
    "Friendly companion rendered hostile",
  );
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/companion-map-desktop-it.png",
  });
  await page.reload();
  await page.locator('[data-actor="' + pet.id + '"]').waitFor();
  await page.locator('[data-actor="' + pet.id + '"]').click();
  await page.locator('[data-table="sheet"]').click();
  // Refreshed by R3 (27/09/2026), P2 PG-20: the sheet opens as a drawer over the map; the
  // Creature tab keeps its own heading, so the drawer's is the one checked.
  await page
    .getByRole("dialog", { name: "Muschio" })
    .getByRole("heading", { name: "Muschio", exact: true })
    .waitFor();
  check(errors.length === 0, errors.join("; "));
  await context.close();
  return {
    passed: [
      "Manual companion creation, Escape cancellation and free direct map placement",
      "Shared actor persists through reload and opens its own sheet",
    ],
    errors,
  };
}
