async (rootPage) => {
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const context = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(),
    passed = [],
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const check = (v, m) => {
    if (!v) throw Error(m);
  };
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const close = () => page.locator("#dialog [data-close]").first().click();
  const slots = (s) => (s.actors.livia.spellSlots?.[1] ?? s.actors.livia.slots).used;
  const incense = (s) =>
    s.actors.livia.inventory.find((i) => i.id === "sample-familiar-incense")?.quantity ?? 0;
  async function mapPoint(x, y) {
    await page.locator("#battle-map").click({ trial: true });
    const at = await page.locator("#battle-map").evaluate(
      (el, point) => {
        const p = el.createSVGPoint();
        p.x = point.x;
        p.y = point.y;
        const screen = p.matrixTransform(el.getScreenCTM());
        return { x: screen.x, y: screen.y };
      },
      { x, y },
    );
    await page.mouse.move(at.x, at.y);
    await page.mouse.click(at.x, at.y);
  }
  async function openCasting(id) {
    await page.goto("http://127.0.0.1:8879/#characters?id=livia&tab=extras");
    await page.locator('[data-forms-entry="livia"][data-forms-tab="companions"]').first().click();
    await page.locator('[data-forms-tab="familiar"]').first().click();
    await page.locator('[data-forms-casting="' + id + '"]').click();
  }
  await page.route("**/*.mjs", (route) => route.continue());
  await page.goto("http://127.0.0.1:8879/#characters?id=livia&tab=extras");
  await page.locator('[data-service="reset"]').click();
  await page.locator('#dialog button[type="submit"]').click();
  await page.goto("http://127.0.0.1:8879/#characters?id=livia&tab=extras");
  let s = await saved();
  const initialSlots = slots(s);
  await page.locator('[data-forms-entry="livia"][data-forms-tab="companions"]').first().click();
  await page.locator('[data-forms-tab="familiar"]').first().click();
  await page.locator('[data-forms-field="name"]').fill("Nocciola");
  await page.locator('[data-forms-profile="srd2024:cat"]').click();
  await page.locator('[data-forms-field="materialId"]').selectOption("sample-familiar-incense");
  await page.locator('[data-forms-field="incenseConfirmed"]').check();
  await page.locator("[data-forms-preview]").click();
  check(await page.locator("[data-forms-apply]").isEnabled(), "Casting start preview blocked");
  await page.locator("[data-forms-apply]").click();
  s = await saved();
  const casting = s.formsCompanions.castings.find((c) => c.actorId === "livia");
  check(
    casting &&
      s.actors.livia.concentration?.active &&
      slots(s) === initialSlots &&
      incense(s) === 1,
    "Start consumed completion resources",
  );
  check(
    await page.locator("[data-forms-completion]").isDisabled(),
    "Casting completed before elapsed time",
  );
  await close();
  await page.reload();
  s = await saved();
  check(
    s.formsCompanions.castings[0].status === "casting" && incense(s) === 1,
    "Close/reload cancelled or completed casting",
  );
  passed.push(
    "Find Familiar starts a persistent activity; closing does not spend completion resources or skip casting time",
  );
  await page.locator("#demo-role").selectOption("dm");
  await page.goto("http://127.0.0.1:8879/#table?id=livia");
  await page.locator('[data-table="time"]').click();
  await page.locator("[data-rest-time-value]").fill("1");
  await page.locator("[data-rest-time-unit]").selectOption("3600");
  await page.locator("[data-rest-preview-time]").click();
  await page.locator("[data-rest-apply]").click();
  await close();
  await page.locator("#demo-role").selectOption("player");
  await openCasting(casting.id);
  await page.locator("[data-forms-appearance-map]").click();
  await page.locator("[data-placement-cancel]").waitFor();
  await mapPoint(550, 500);
  check(await page.locator("[data-placement-cancel]").isVisible(), "Out-of-range point accepted");
  check(
    (await page.locator("[data-placement-status]").innerText()).length > 0,
    "Invalid position lacks explanation",
  );
  await page.keyboard.press("Escape");
  s = await saved();
  check(slots(s) === initialSlots && incense(s) === 1, "Cancelling map choice spent resources");
  await page.locator("[data-forms-appearance-map]").click();
  await mapPoint(250, 300);
  await page.locator("[data-forms-completion]").click();
  check(await page.locator("[data-forms-apply]").isEnabled(), "Valid completion rejected");
  await page.locator("[data-forms-review]").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/familiar-completion-desktop-it.png",
  });
  await page.locator("[data-forms-apply]").click();
  s = await saved();
  const familiar = Object.values(s.actors).find((a) => a.name === "Nocciola");
  check(
    familiar &&
      slots(s) === initialSlots + 1 &&
      incense(s) === 0 &&
      !s.actors.livia.concentration?.active,
    "Completion resources or concentration wrong",
  );
  // Refreshed by R3 (27/09/2026), P2 PG-78 (dnd5e Summon): confirming the appearance puts the
  // familiar's token at the chosen point in the same change.
  const appeared = s.scenes[0].tokens.find((t) => t.actorId === familiar.id);
  check(
    appeared && Math.abs(appeared.x - 250) < 30 && Math.abs(appeared.y - 300) < 30,
    "The familiar's token is not at the chosen appearance point: " + JSON.stringify(appeared),
  );
  passed.push(
    "Shared game time enables completion; invalid position and Escape are free; only applying consumes slot/incense; the token appears at the chosen point (PG-78)",
  );
  if (await page.locator("#dialog[open]").count()) await page.keyboard.press("Escape");
  await page.locator('#battle-map [data-actor="' + familiar.id + '"]').focus();
  await page.keyboard.press("Enter");
  await page.locator('[data-actor="' + familiar.id + '"].selected').waitFor();
  check(
    (await page.locator('[data-combat-action="melee-attack"]').count()) === 0 &&
      (await page.locator('[data-combat-action="quarterstaff"]').count()) === 0,
    "Familiar can attack",
  );
  s = await saved();
  check(slots(s) === initialSlots + 1 && incense(s) === 0, "Free placement spent spell again");
  await page.locator('[data-table="sheet"]').click();
  // P2 PG-20: the sheet opens as a drawer over the map (the Creature tab keeps its heading).
  await page
    .getByRole("dialog", { name: "Nocciola" })
    .getByRole("heading", { name: "Nocciola", exact: true })
    .waitFor();
  passed.push(
    "The familiar has its own linked sheet; selecting its token spends nothing and attack actions are unavailable",
  );
  check(errors.length === 0, errors.join("; "));
  await context.close();
  return { passed, errors };
}
