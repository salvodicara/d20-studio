async (rootPage) => {
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const context = await rootPage
    .context()
    .browser()
    .newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
    });
  const page = await context.newPage(),
    passed = [],
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const check = (v, m) => {
    if (!v) throw Error(m);
  };
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const tap = (s) => page.locator(s).tap();
  const close = () => page.locator("#dialog [data-close]").first().tap();
  await page.route("**/*.mjs", (route) => route.continue());
  await page.goto("http://127.0.0.1:8879/");
  await page.evaluate(async () => {
    const s = (await import("/state.mjs")).createInitialState();
    s.actors.wanderer = {
      ...structuredClone(s.actors.livia),
      id: "wanderer",
      name: "Ara",
      visibility: "private",
      campaignIds: [],
      hp: 1,
      hitDice: { d6: { max: 3, used: 0 } },
    };
    localStorage.setItem("d20-studio-blueprint-v1", JSON.stringify(s));
  });
  await page.goto("http://127.0.0.1:8879/#characters?id=wanderer");
  await page.reload();
  await tap("[data-service=preferences]");
  await page.locator("#dialog [name=lang]").selectOption("en");
  await page.locator("#dialog [name=offline]").check();
  await page.locator("#dialog button[type=submit]").tap();
  await tap("[data-character-action=rest]");
  check(
    (await page.locator("#dialog-title").innerText()) === "Rests and time",
    "Rest panel not English",
  );
  await tap("[data-rest-preview-start]");
  await tap("[data-rest-start]");
  await page.locator("[data-rest-elapsed=wanderer]").fill("60");
  await tap("[data-rest-record-time=wanderer]");
  await tap("[data-rest-complete=wanderer]");
  await tap("[data-rest-apply]");
  let s = await saved();
  check(
    s.restTime.rests[0].campaignId === null &&
      Object.keys(s.restTime.clocks).length === 0 &&
      s.actors.wanderer.hp === 1,
    "Personal rest changed campaign clock or healed automatically",
  );
  passed.push(
    "English touch: private Short Rest progresses offline without advancing the campaign clock",
  );
  await page.locator("[data-rest-dice-mode=wanderer]").selectOption("physical");
  await tap("[data-rest-details=quick-wanderer] > summary");
  await page.locator("[data-rest-quick-cap=wanderer]").fill("2");
  await tap("[data-rest-quick-preview=wanderer]");
  await tap("[data-rest-quick-run=wanderer]");
  s = await saved();
  check(
    s.restTime.rolls.length === 1 &&
      s.restTime.rolls[0].status === "pending" &&
      s.actors.wanderer.hitDice.d6.used === 1,
    "Quick physical recovery did not await first face",
  );
  await page.locator("[data-rest-face]").fill("3");
  await tap("[data-rest-resolve]");
  await tap("[data-rest-quick-preview=wanderer]");
  await tap("[data-rest-quick-run=wanderer]");
  await page.locator("[data-rest-face]").fill("4");
  await tap("[data-rest-resolve]");
  await tap("[data-rest-quick-preview=wanderer]");
  check(
    await page.locator("[data-rest-quick-run=wanderer]").isDisabled(),
    "Quick maximum ignored previous dice",
  );
  s = await saved();
  check(
    s.actors.wanderer.hitDice.d6.used === 2 && s.restTime.rolls.length === 2,
    "Rapid sequence exceeded cap",
  );
  check(
    (await page.locator("#dialog").innerText()).includes("Total maximum reached"),
    "Cap stop reason not visible",
  );
  passed.push("Optional quick recovery waits for each physical die and stops at chosen total cap");
  await tap("[data-rest-correct=wanderer]");
  await page.locator("[data-rest-correction-path]").selectOption("hp");
  await page.locator("[data-rest-correction-value]").fill("9");
  await tap("[data-rest-preview-correction]");
  check(await page.locator("[data-rest-apply]").isDisabled(), "Correction without reason allowed");
  await page.locator("[data-rest-correction-reason]").fill("Recorded at the table.");
  await tap("[data-rest-preview-correction]");
  await tap("[data-rest-apply]");
  check((await saved()).actors.wanderer.hp === 9, "Reasoned correction not applied");
  const overflow = await page
    .locator("#dialog .dialog-body")
    .evaluate((n) => ({ width: n.clientWidth, scroll: n.scrollWidth }));
  check(overflow.scroll <= overflow.width + 1, "Mobile rest panel overflows horizontally");
  await page.locator("[data-rest-correct=wanderer]").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/rest-mobile-en.png",
    fullPage: true,
  });
  passed.push(
    "Mobile correction requires reason; controls remain reachable without horizontal overflow",
  );
  await close();
  await page.goto("http://127.0.0.1:8879/#characters?id=livia");
  await page.locator("[data-character-action=rest]").waitFor();
  await tap("[data-character-action=rest]");
  await tap("[data-rest-preview-start]");
  check(await page.locator("[data-rest-start]").isDisabled(), "Offline shared rest allowed");
  await close();
  await page.locator("#demo-role").selectOption("dm");
  await page.goto("http://127.0.0.1:8879/#table");
  await tap("[data-table=rests]");
  check(
    !(await page.locator("#dialog").innerText()).includes("Ara"),
    "DM sees private actor or private rest",
  );
  passed.push("Offline blocks shared mutation and DM view excludes the private personal rest");
  check(errors.length === 0, errors.join("; "));
  await context.close();
  return { passed, errors };
}
