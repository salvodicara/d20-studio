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
  // W1b integration: B56 animates a digital roll above the open dialog and keeps the click
  // that skips it (no click-through, B56 review r2): let the dice go (Esc skips, then closes).
  const settleDice = async () => {
    const layer = page.locator("[data-dice3d-layer]:not([hidden])");
    await layer.waitFor({ timeout: 1000 }).catch(() => {});
    for (let i = 0; i < 8 && (await layer.count()); i++) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(80);
    }
    await layer.waitFor({ state: "hidden", timeout: 5000 });
  };
  await page.route("**/*.mjs", (route) => route.continue());
  await page.goto("http://127.0.0.1:8879/");
  await page.evaluate(async () => {
    const s = (await import("/state.mjs")).createInitialState();
    s.actors.livia.hp = 8;
    localStorage.setItem("d20-studio-blueprint-v1", JSON.stringify(s));
  });
  await page.goto("http://127.0.0.1:8879/#table");
  await page.reload();
  await page.locator("#demo-role").selectOption("dm");
  await page.locator("[data-table=rests]").click();
  // interview-01 CA-77: the DM's group rest starts with the whole party chosen; this check
  // keeps Livia alone, as before.
  for (const box of await page.locator("[data-rest-participant]").all())
    if ((await box.getAttribute("data-rest-participant")) !== "livia") await box.uncheck();
  await page.locator("[data-rest-participant=livia]").check();
  await page.locator("[data-rest-preview-start]").click();
  check((await saved()).restTime === undefined, "Start preview mutated rest state");
  await page.locator("[data-rest-start]").click();
  let s = await saved();
  check(
    s.restTime.rests[0].participants.length === 1 &&
      s.actors.livia.hp === 8 &&
      s.actors.doran.hitDice.d10.used === 1,
    "Start healed or included unchecked party member",
  );
  await page.locator("[data-rest-complete=livia]").click();
  check(await page.locator("[data-rest-apply]").isDisabled(), "Premature completion available");
  await page.locator("[data-rest-time]").click();
  await page.locator("[data-rest-time-value]").fill("1");
  await page.locator("[data-rest-time-unit]").selectOption("3600");
  await page.locator("[data-rest-preview-time]").click();
  check(
    ((await saved()).restTime.clocks[s.campaign.id]?.seconds ?? 0) === 0,
    "Time preview advanced clock",
  );
  await page.locator("[data-rest-apply]").click();
  await close();
  await page.locator("#demo-role").selectOption("player");
  await page.locator("[data-table=rest]").click();
  await page.locator("[data-rest-complete=livia]").click();
  await page.locator("[data-rest-apply]").click();
  s = await saved();
  check(
    s.restTime.rests[0].participants[0].status === "completed" && s.actors.livia.hp === 8,
    "Short rest auto-healed without a Hit Die",
  );
  passed.push(
    "Table partial-party short rest: pure previews, elapsed requirement, DM time and player completion",
  );
  await page.locator("[data-rest-dice-mode=livia]").selectOption("physical");
  await page.locator("[data-rest-hit-die=livia]").click();
  s = await saved();
  const rollId = s.restTime.rolls.at(-1).id;
  check(
    s.actors.livia.hitDice.d6.used === 2 && s.actors.livia.hp === 8,
    "Physical attempt did not spend at attempt time",
  );
  await page.keyboard.press("Escape");
  check(await page.locator("#dialog").evaluate((n) => !n.open), "Escape did not close panel");
  await page.reload();
  await page.locator("[data-table=rest]").click();
  await page.locator("[data-rest-face]").fill("9");
  await page.locator("[data-rest-resolve]").click();
  check(
    (await page.locator("[data-rest-face]").inputValue()) === "9" &&
      (await saved()).actors.livia.hp === 8,
    "Invalid die face was lost or applied",
  );
  await page.locator("[data-rest-face]").fill("3");
  await page.locator("[data-rest-resolve]").click();
  s = await saved();
  const healed = s.actors.livia.hp;
  check(
    s.restTime.rolls.find((r) => r.id === rollId).acceptedFace === 3 && healed > 8,
    "Physical face not applied",
  );
  await page.locator("[data-rest-undo]").click();
  s = await saved();
  check(
    s.actors.livia.hp === 8 && s.restTime.rolls.find((r) => r.id === rollId).acceptedFace === 3,
    "Undo erased accepted face or retained healing",
  );
  check(
    (await page.locator("[data-rest-face]").count()) === 0,
    "Known face can be edited after Undo",
  );
  await page.locator("[data-rest-resolve]").click();
  check((await saved()).actors.livia.hp === healed, "Known face reapplication changed healing");
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/rest-physical-desktop-it.png",
    fullPage: true,
  });
  passed.push(
    "Physical Hit Die spends once, survives Escape/reload, validates input and preserves accepted face through Undo",
  );
  await page.locator("[data-rest-dice-mode=livia]").selectOption("digital");
  await page.locator("[data-rest-hit-die=livia]").click();
  await settleDice();
  s = await saved();
  const digital = s.restTime.rolls.at(-1);
  check(
    digital.mode === "digital" &&
      Number.isInteger(digital.acceptedFace) &&
      s.actors.livia.hitDice.d6.used === 3,
    "Digital Hit Die failed",
  );
  await page.locator("[data-rest-details=arcane-livia] > summary").click();
  await page.locator('[data-rest-arcane=livia][data-slot-level="1"]').fill("1");
  await page.locator("[data-rest-preview-arcane=livia]").click();
  await page.locator("[data-rest-apply]").click();
  s = await saved();
  check(
    s.actors.livia.spellSlots[1].used === 0 && s.actors.livia.slots.used === 0,
    "Arcane Recovery diverged from sheet slot alias",
  );
  await page.locator("[data-rest-finish=livia]").click();
  check(
    (await page.locator("[data-rest-hit-die=livia]").count()) === 0,
    "Closed recovery still offers more dice",
  );
  await close();
  await page.locator("[data-table=sheet]").click();
  await page.locator("[data-character-action=rest]").click();
  check(
    (await page.locator("#dialog").innerText()).includes("finestra conclusa"),
    "Sheet opened unrelated rest state",
  );
  passed.push(
    "Digital recovery, explicit Arcane choice, closed window and same rest from full sheet",
  );
  check(errors.length === 0, errors.join("; "));
  await context.close();
  return { passed, errors };
}
