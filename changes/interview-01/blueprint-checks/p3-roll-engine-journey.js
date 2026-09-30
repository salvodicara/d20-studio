async (rootPage) => {
  // P3 fix package (audit 25/09/2026): one roll engine behind every clickable number.
  // IT desktop 1440 × 900, player: Poisoned from the HP card in two clicks; Athletics from
  // the sheet list, the favourites strip and the Table's dice tray give the same 2d20
  // keep-lowest and the same parts; Exhaustion 2 from the segments shows and rolls INT save
  // +1 on the sheet and in the tray; Bless rolls its d4 in the tray, named; the log card
  // of 4d6kh3 strikes the dropped die and keeps the rule. Synthetic demo data only; this
  // resets this browser's example state (fresh context).
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P3/";
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const saved = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const button = (name) => page.getByRole("button", { name, exact: true });
  const openTablePanel = async (id) => {
    const now = () => page.locator("#table-sidebar-panel").getAttribute("data-table-panel");
    if ((await now()) === id) return;
    if (!(await page.locator(`.table-subtabs [data-table-subtab="${id}"]`).count())) {
      const section = await page
        .locator(
          `.table-panel-index [data-table-drawer="${id}"], .table-panel-index [data-table="${id}"]`,
        )
        .first()
        .getAttribute("data-table-section-of");
      await page.locator(`.table-tabs [data-table-tab="${section}"]`).click();
    }
    if ((await now()) !== id)
      await page.locator(`.table-subtabs [data-table-subtab="${id}"]`).click();
    await page.waitForFunction(
      (i) => document.querySelector("#table-sidebar-panel")?.dataset.tablePanel === i,
      id,
    );
  };
  await page.goto(base + "#characters?id=livia");
  await button("Ripristina esempio").click();
  await button("Ripristina").click();
  await page.goto(base + "#characters?id=livia");
  // Visual pass 2: «+ Condizione», chips and Exhaustion sit in the Conditions box of the strip
  // over the tabs (D&D Beyond), no longer in the HP card.
  const card = page.locator("#content .character-conditions");
  await card.waitFor();

  // 1. PG-28: Poisoned in two clicks from the HP card (D&D Beyond conditions panel).
  await card.locator("[data-conditions-quick-add]").click();
  await page.locator('#dialog [data-conditions-quick-apply="poisoned"]').click();
  await card.locator('[data-conditions-chip="poisoned"]').waitFor();
  check(
    (await saved()).actors.livia.conditions.some((c) => (c.id ?? c) === "poisoned"),
    "Poisoned not applied",
  );
  passed.push(
    "PG-28: «+ Condizione» › «Avvelenato»: applied in 2 clicks, chip in the Conditions box",
  );

  // 2. PG-23: Athletics from the sheet list: 2d20 keep-lowest with the reason named.
  const athletics = page.locator('[data-shp="roll"][data-kind="skill"][data-subject="athletics"]');
  await athletics.scrollIntoViewIfNeeded();
  // F10: the right-click opens the roll window (a plain click rolls at once).
  await athletics.click({ button: "right" });
  const dialog = page.locator("#dialog");
  check((await dialog.innerText()).includes("Avvelenato: svantaggio"), "sheet dialog lacks reason");
  await page.screenshot({ path: shots + "p3-01-sheet-athletics-dialog.png" });
  await dialog.getByRole("button", { name: "Tira", exact: true }).click();
  let data = await saved();
  const sheetRoll = data.ext["sheet-plus-rolls"].rolls.at(-1);
  check(
    sheetRoll.rollMode === "disadvantage" && sheetRoll.values.length === 2,
    "sheet list roll not 2d20 kl: " + JSON.stringify([sheetRoll.rollMode, sheetRoll.values]),
  );
  check(sheetRoll.natural === Math.min(...sheetRoll.values), "sheet list kept the higher die");
  const sheetParts = sheetRoll.parts.map((p) => p.label.it).join(" · ");
  passed.push(
    `PG-23 sheet list: Atletica ${JSON.stringify(sheetRoll.values)} → ${sheetRoll.natural} (svantaggio) · ${sheetParts}`,
  );

  // 3. Favourites strip: star Athletics, then roll it from the strip.
  await page.locator('[data-shp="fav"][data-kind="skill"][data-id="athletics"]').first().click();
  const fav = page.locator('[data-shp="use"][data-kind="skill"][data-id="athletics"]').first();
  await fav.waitFor();
  await fav.click();
  if (
    await dialog
      .getByRole("button", { name: "Tira", exact: true })
      .isVisible()
      .catch(() => false)
  )
    await dialog.getByRole("button", { name: "Tira", exact: true }).click();
  data = await saved();
  const favRoll = data.ext["sheet-plus-rolls"].rolls.at(-1);
  check(favRoll.id !== sheetRoll.id, "the favourite did not roll");
  check(
    favRoll.rollMode === "disadvantage" && favRoll.values.length === 2,
    "favourite roll not 2d20 kl",
  );
  check(
    favRoll.parts.map((p) => p.label.it).join(" · ") === sheetParts,
    "favourite parts differ from the list",
  );
  passed.push("PG-23 favourites strip: the same 2d20 keep-lowest and the same parts");

  // 4. Table tray: the same number rolls the same way (same handler as the sheet's box).
  await page.goto(base + "#table");
  await openTablePanel("dice-tray");
  const trayNum = page.locator(
    '#table-sidebar-panel [data-dtray-roll][data-kind="skill"][data-skill="athletics"][data-actor="livia"]',
  );
  await trayNum.scrollIntoViewIfNeeded();
  await trayNum.click();
  data = await saved();
  const trayRoll = data.ext["dice-tray"].rolls.at(-1);
  check(
    trayRoll.rollMode === "disadvantage" && trayRoll.groups[0].faces.length === 2,
    "tray roll not 2d20 kl",
  );
  check(
    trayRoll.natural === Math.min(...trayRoll.groups[0].faces.map((f) => f.value)),
    "tray kept the higher die",
  );
  check(trayRoll.conditionReasons?.disadvantage?.[0]?.conditionId === "poisoned", "no reason");
  check(trayRoll.constant === sheetRoll.modifier, "tray modifier differs from the sheet list");
  await page.screenshot({ path: shots + "p3-02-table-tray-athletics.png" });
  passed.push(
    `PG-23 Table tray: Atletica ${JSON.stringify(trayRoll.values)} → ${trayRoll.natural}, modifier ${trayRoll.constant} = sheet ${sheetRoll.modifier}, reason Avvelenato`,
  );

  // 5. Exhaustion 2 from the segments: INT save +1 on the sheet and in the tray.
  await page.goto(base + "#characters?id=livia");
  const intSave = page.locator('[data-shp="roll"][data-kind="save"][data-subject="int"]');
  // The base INT save (Livia: +5, +1 more with P2's attuned Cloak of Protection).
  const before = Number((await intSave.innerText()).trim().replace("−", "-"));
  const expected = before - 4;
  const signedText = (n) => (n < 0 ? "−" + Math.abs(n) : "+" + n);
  await card.locator('[data-conditions-exhaustion-level="2"]').click();
  await page.waitForFunction(
    (k) => JSON.parse(localStorage.getItem(k)).actors.livia.exhaustion === 2,
    key,
  );
  await intSave.scrollIntoViewIfNeeded();
  check(
    (await intSave.innerText()).trim() === signedText(expected),
    `sheet INT save not ${signedText(expected)}: ` + (await intSave.innerText()),
  );
  await intSave.click({ button: "right" });
  check((await dialog.innerText()).includes("Indebolimento 2"), "sheet dialog lacks Exhaustion");
  await dialog.getByRole("button", { name: "Tira", exact: true }).click();
  data = await saved();
  check(
    data.ext["sheet-plus-rolls"].rolls.at(-1).modifier === expected,
    "sheet INT save rolled not " + expected,
  );
  await page.goto(base + "#table");
  await openTablePanel("dice-tray");
  const trayInt = page.locator(
    '#table-sidebar-panel [data-dtray-roll][data-kind="save"][data-ability="int"][data-actor="livia"]',
  );
  check((await trayInt.innerText()).includes(signedText(expected)), "tray INT save differs");
  await trayInt.click();
  data = await saved();
  check(data.ext["dice-tray"].rolls.at(-1).constant === expected, "tray INT save rolled differs");
  passed.push(
    `PG-23 Exhaustion 2 (segment «2»): INT save ${signedText(before)} → ${signedText(expected)} shown and rolled on the sheet and in the tray`,
  );

  // 6. Bless: the tray rolls its d4 with the save and names it.
  await page.goto(base + "#characters?id=livia");
  await page.locator('[data-shp="effect"][data-effect="bless"]').first().click();
  await page.goto(base + "#table");
  await openTablePanel("dice-tray");
  await trayInt.click();
  data = await saved();
  const blessed = data.ext["dice-tray"].rolls.at(-1);
  check(blessed.riders?.[0]?.id === "bless" && blessed.groups.length === 2, "tray ignored Bless");
  const breakdown = await page.locator("#table-sidebar-panel [data-dtray-breakdown]").innerText();
  check(/\(Benedizione\)/.test(breakdown), "tray breakdown does not name Bless: " + breakdown);
  passed.push("PG-47 Bless in the Table tray: " + breakdown);

  // 7. TV-87 / TV-97: 4d6kh3 in the log keeps the rule and strikes the dropped die.
  await page.locator("#table-sidebar-panel [data-dtray-formula]").fill("4d6kh3");
  await page.locator("#table-sidebar-panel [data-dtray-roll-button]").click();
  await openTablePanel("log");
  const logCard = page.locator(".chat-roll-card").last();
  await logCard.scrollIntoViewIfNeeded();
  const cardText = await logCard.innerText();
  check(cardText.includes("4d6kh3"), "log card lost the rule: " + cardText);
  check(
    (await logCard.locator(".chat-roll-line s.is-dropped").count()) === 1,
    "log card does not strike exactly the dropped die",
  );
  await logCard.screenshot({ path: shots + "p3-03-log-card-4d6kh3.png" });
  await logCard.locator("summary").click();
  check(
    (await logCard.locator('[data-chat-roll-action="withdraw"]').count()) === 1,
    "own roll card has no Ritira",
  );
  await logCard.screenshot({ path: shots + "p3-04-log-card-details.png" });
  passed.push("TV-87/97: log card 4d6kh3 keeps the rule, strikes 1 die, details with Ritira");

  // 8. PG-48: the character's roll policy from the sheet's «Tiri» box (Roll20 Manage Sheet).
  await page.goto(base + "#characters?id=livia");
  await page.locator('[data-dtray-policy="livia"]').first().click();
  await page.locator('#dialog select[name="d20"]').selectOption("advantage");
  await page.locator('#dialog select[name="audience"]').selectOption("gm");
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  const arcana = page.locator('[data-shp="roll"][data-kind="skill"][data-subject="arcana"]');
  await arcana.scrollIntoViewIfNeeded();
  await arcana.click({ button: "right" });
  await dialog.getByRole("button", { name: "Tira", exact: true }).click();
  data = await saved();
  const policed = data.ext["sheet-plus-rolls"].rolls.at(-1);
  // Poisoned (still on) gives Disadvantage: with «always advantage» they cancel out.
  check(policed.chosenMode === "normal" && policed.rollMode === "normal", "policy mode wrong");
  check(policed.audience === "gm", "policy audience not applied: " + policed.audience);
  passed.push(
    "PG-48: policy «Sempre con vantaggio» + «Io e il DM» from the sheet box: Arcana rolled for me and the DM, advantage cancelled by Poisoned",
  );

  // 9. EN: the log card of 4d6kh3 in English.
  await page.locator('[data-service="preferences"]').click();
  await page.locator("#dialog select[name=lang]").selectOption("en");
  await page.getByRole("button", { name: "Salva preferenze", exact: true }).click();
  await page.goto(base + "#table");
  await openTablePanel("log");
  const enCard = page.locator(".chat-roll-card", { hasText: "4d6kh3" }).last();
  await enCard.scrollIntoViewIfNeeded();
  check((await enCard.locator("summary").innerText()).trim() === "Details", "card not in English");
  check(
    (await enCard.locator(".chat-roll-line s.is-dropped").getAttribute("aria-label")).endsWith(
      "dropped",
    ),
    "the struck die is not named in English",
  );
  await enCard.screenshot({ path: shots + "p3-05-log-card-en.png" });
  passed.push("EN: the 4d6kh3 log card reads «Details» and names the dropped die");

  check(!errors.length, "page errors: " + errors.join(" | "));
  await context.close();
  return passed;
};
