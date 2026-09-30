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
  async function time(hours) {
    await page.locator("[data-rest-time]").click();
    await page.locator("[data-rest-time-value]").fill(String(hours));
    await page.locator("[data-rest-time-unit]").selectOption("3600");
    await page.locator("[data-rest-preview-time]").click();
    await page.locator("[data-rest-apply]").click();
  }
  await page.route("**/*.mjs", (route) => route.continue());
  await page.goto("http://127.0.0.1:8879/");
  await page.evaluate(async () => {
    const s = (await import("/state.mjs")).createInitialState();
    s.scenes[0].encounter = {
      name: "Synthetic prepared encounter",
      participants: s.combat.order.map((actorId, i) => ({
        actorId,
        natural: 18 - i * 2,
        bonus: 0,
        mode: "physical",
      })),
    };
    s.actors.doran.hp = 10;
    s.actors.doran.tempHp = 5;
    s.actors.doran.exhaustion = 2;
    s.actors.doran.concentration = {
      active: true,
      name: { it: "Effetto sintetico", en: "Synthetic effect" },
    };
    localStorage.setItem("d20-studio-blueprint-v1", JSON.stringify(s));
  });
  await page.goto("http://127.0.0.1:8879/#characters?id=doran");
  await page.reload();
  await page.locator("#demo-role").selectOption("dm");
  await page.locator("[data-character-action=rest]").click();
  await page.locator("[data-rest-kind]").selectOption("long");
  await page.locator("[data-rest-start-activity=doran]").selectOption("sleep");
  await page.locator("[data-rest-preview-start]").click();
  await page.locator("[data-rest-start]").click();
  let s = await saved();
  check(
    !s.actors.doran.concentration.active &&
      s.actors.doran.conditions.some((c) => c.id === "unconscious"),
    "Sleep did not update conditions/concentration",
  );
  await time(1);
  await close();
  await page.locator("[data-character-action=table]").first().click();
  await page.locator("[data-table=combat]").click();
  await page.locator("#dialog button[type=submit]").click();
  s = await saved();
  const part = s.restTime.rests[0].participants[0];
  check(
    part.status === "interrupted" &&
      s.actors.doran.features.find((f) => f.id === "sample-second-wind").used === 1 &&
      s.actors.doran.hp === 10,
    "Initiative did not interrupt and grant earned Short Rest benefits",
  );
  // Final regression (30/09/2026): since the final review F5 / TV-53 (BG3) the turn start moves
  // the selection to the acting creature (Livia) for whoever controls it, the DM included;
  // select Doran again from the turn order before his «Riposa».
  await page.locator("[data-select=doran]").first().click();
  await page.locator("[data-table=rest]").click();
  check(
    (await page.locator("#dialog").innerText()).includes("Interrotto"),
    "Interrupted state missing from panel",
  );
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/rest-interrupted-desktop-it.png",
    fullPage: true,
  });
  await page.locator("[data-rest-undo]").click();
  s = await saved();
  check(
    !s.combat.active &&
      s.restTime.rests[0].participants[0].status === "resting" &&
      s.actors.doran.features.find((f) => f.id === "sample-second-wind").used === 2,
    "Undo failed to restore initiative/rest/resource atomically",
  );
  passed.push(
    "Sleeping changes actual sheet state; initiative interrupts and grants earned short benefits; Undo restores the whole event",
  );
  await time(7);
  await close();
  await page.locator("[data-table=rest]").click();
  await page.locator("[data-rest-complete=doran]").click();
  await page.locator("[data-rest-apply]").click();
  s = await saved();
  check(
    s.actors.doran.hp === s.actors.doran.maxHp &&
      s.actors.doran.tempHp === 0 &&
      s.actors.doran.exhaustion === 1 &&
      s.actors.doran.hitDice.d10.used === 0,
    "Long Rest resources wrong",
  );
  check(
    s.actors.doran.features.every(
      (f) => !["sample-second-wind", "sample-action-surge"].includes(f.id) || f.used === 0,
    ),
    "Long Rest features not recovered",
  );
  check(
    !s.actors.doran.conditions.some((c) => c.id === "unconscious"),
    "Sleep condition leaked after completion",
  );
  await page.locator("[data-rest-new]").click();
  await page.locator("[data-rest-kind]").selectOption("long");
  await page.locator("[data-rest-participant=doran]").check();
  await page.locator("[data-rest-preview-start]").click();
  check(await page.locator("[data-rest-start]").isDisabled(), "Immediate second Long Rest allowed");
  passed.push(
    "Eight-hour Long Rest applies HP/temp HP/Hit Dice/exhaustion/features and enforces next-rest interval",
  );
  await close();
  const before = (await saved()).restTime.clocks.lanterns.seconds;
  await page.locator("[data-table=combat]").click();
  await page.locator("#dialog button[type=submit]").click();
  for (let i = 0; i < 4; i++) await page.locator("[data-table=end-turn]").click();
  s = await saved();
  check(
    s.combat.round === 2 && s.restTime.clocks.lanterns.seconds === before + 6,
    "Round did not advance narrative clock by six seconds",
  );
  await page.locator("[data-table=undo]").click();
  s = await saved();
  check(
    s.combat.round === 1 && s.restTime.clocks.lanterns.seconds === before,
    "Undo of round did not restore clock",
  );
  passed.push("Actual table round advances shared time once by six seconds and Undo restores it");
  check(errors.length === 0, errors.join("; "));
  await context.close();
  return { passed, errors };
}
