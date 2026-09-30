async (rootPage) => {
  // B62: campaign sections sit in Kanka-style groups; a folded group is opened first.
  const openCampaignSection = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const link = page.locator(`.campaign-sidebar nav [data-campaign-tab="${id}"]`);
    await link.waitFor({ state: "attached" });
    const toggle = page.locator(
      `.campaign-sidebar [data-campaign-group]:has([data-campaign-tab="${id}"]) [data-campaign-group-toggle]`,
    );
    if ((await toggle.getAttribute("aria-expanded")) === "false") await press(toggle);
    await press(link);
  };
  // B48 — Deep homebrew editor, in the one app with real clicks, keys and touch.
  // Group 1 feat from an SRD template (sub-forms, test sheet, share, DM enable, apply to
  // Livia, Undo, reload); group 2 save activity at the Table with a physical save and a
  // condition that ends at the start of Livia's next turn (Undo reuses the roll);
  // group 3 subclass applied through Mira's advancement (3 → 6, 10 future); group 4
  // monster creator, rollable blocks, scene token and CSV import with row errors;
  // group 5 forge Longsword +1 and revert to source; group 6 campaign safe mode and Find
  // the Culprit; group 7 simulated publishing with versions chosen by the follower;
  // group 8 isolated EN 390 px touch context. Synthetic demo data; resets this browser's
  // demo state. Screenshots go to the dated evidence directory.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B48/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const ext = async (p = page) => (await stored(p)).ext["homebrew-editor"];
  const content = (p = page) => p.locator("#content").innerText();
  // Tips and banners are real popovers of other areas: close them before a screenshot.
  const quiet = async (p = page) => {
    for (const name of ["Ho capito", "Got it"])
      for (const b of await p.getByRole("button", { name, exact: true }).all())
        await b.click({ timeout: 1000 }).catch(() => {});
  };
  const shot = async (name, locator = null, full = false) => {
    await quiet();
    if (locator) await locator.first().scrollIntoViewIfNeeded();
    else await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: dir + name, fullPage: full });
  };
  const role = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
  };
  const tick = (p = page) => p.waitForTimeout(80);
  const hbe = (action, extra = "") => page.locator(`[data-hbe="${action}"]${extra}`);
  const path = (p) => page.locator(`[data-hbe-path="${p}"]`);
  const dialog = page.locator("#dialog");
  const submit = async (p = page) => {
    await p.locator("#dialog button[type=submit]").click();
    await p.waitForFunction(() => !document.querySelector("#dialog")?.open);
  };
  // A dialog whose submit opens the next dialog (pick → apply): wait for the new title.
  const submitNext = async (title, p = page) => {
    await p.locator("#dialog button[type=submit]").click();
    await p.locator("#dialog #dialog-title", { hasText: title }).waitFor();
  };
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const latestRev = (data, contentId) =>
    data.library.find((c) => c.id === contentId).revisions.at(-1);

  // ------------------------------------------------------------ group 1: feat
  await page.goto(base + "#library");
  await page.evaluate((k) => localStorage.removeItem(k), key);
  await page.reload();
  await page.locator("[data-library-scope]").first().waitFor();
  await role("player");
  // Library → Le mie creazioni → Talento: two clicks to the template choice.
  await page.locator('[data-library-scope="homebrew-editor"]').click();
  await hbe("create", '[data-kind="feat"]').click();
  await dialog.locator('select[name="template"]').selectOption("srd-feat:grappler");
  await submit();
  await page.locator("[data-hbe-editor]").waitFor();
  check((await content()).includes("Lottatore (variante)"), "Grappler template not loaded");
  await path("name.it").fill("Guardia delle lanterne");
  await path("name.en").fill("Lantern Warden");
  await path("description.it").fill("L’addestramento alla torre ti rende saldo e vigile.");
  await path("description.en").fill("Training at the tower keeps you steady and watchful.");
  await path("source.label").fill("Tavolo di Bruma");
  await hbe("save-draft").click();
  await page.locator("[data-hbe-status]", { hasText: "Bozza privata salvata" }).waitFor();
  // Prerequisites: the template brings Level 4+ AND (Str 13 OR Dex 13); remove the level.
  await hbe("subform", '[data-subform="prerequisites"]').click();
  await page.locator('[data-hbe-group="1"]').waitFor();
  await hbe("remove-group", '[data-group="0"]').click();
  await tick();
  check((await page.locator("[data-hbe-group]").count()) === 1, "Level group not removed");
  check(
    (await page.locator('[data-hbe-group="0"] select[data-hbe-path$=".mode"]').inputValue()) ===
      "any",
    "remaining group is not 'any of'",
  );
  // Options: choose 1 of 2 already there; Modifiers: +1 AC.
  await hbe("subform", '[data-subform="options"]').click();
  check(
    (await content()).includes("Forza +1") && (await content()).includes("Destrezza +1"),
    "choose 1 of 2 missing",
  );
  await hbe("subform", '[data-subform="modifiers"]').click();
  await hbe("add-modifier").click();
  await page.locator("[data-hbe-modifier]").waitFor();
  check((await path("structured.modifiers.0.target").inputValue()) === "ac", "modifier not AC");
  // Activities: a Wisdom save, DC 8 + PB + Int, Frightened until the start of your next turn.
  await hbe("subform", '[data-subform="activities"]').click();
  await page.locator("[data-hbe-new-activity]").selectOption("save");
  await hbe("add-activity").click();
  await page.locator("[data-hbe-activity]").waitFor();
  await path("structured.activities.0.name.it").fill("Bagliore della lanterna");
  await path("structured.activities.0.name.en").fill("Lantern glare");
  await page.locator('[data-hbe="activity-tab"][data-pane="effect"]').click();
  await path("structured.activities.0.save.ability").selectOption("wis");
  await tick();
  await path("structured.activities.0.save.dc.ability").selectOption("int");
  await tick();
  await path("structured.activities.0.effect.conditionId").selectOption("frightened");
  await tick();
  await path("structured.activities.0.effect.duration").focus();
  await path("structured.activities.0.effect.duration").selectOption("start-next-self");
  await tick();
  // Keyboard: the duration select keeps focus after the redraw.
  check(
    await page.evaluate(
      () => document.activeElement?.dataset?.hbePath === "structured.activities.0.effect.duration",
    ),
    "focus lost after a select redraw",
  );
  // Test sheet: Livia's values, Dex +1 chosen; prerequisites and stacking shown, nothing saved.
  await page.locator("[data-hbe-test-choice] + *, [data-hbe-test-choice]").nth(1).check();
  await tick();
  const test = await page.locator("[data-hbe-test-result]").innerText();
  check(
    test.includes("For 13+") && test.includes("Des 13+"),
    "test prerequisites missing: " + test,
  );
  check(
    /Classe Armatura: base 12 → Somma \+1/.test(test) && test.includes("= 13"),
    "AC stacking not shown: " + test,
  );
  check(/CD|8 \+ competenza 2 \+ Int \+3 = 13/.test(test), "DC formula not shown: " + test);
  check(
    (await page.locator("[data-hbe-test-verdict]").getAttribute("data-hbe-test-verdict")) === "yes",
    "test verdict not yes",
  );
  await page.locator('[data-hbe-test="dex"]').fill("12");
  await page.locator('[data-hbe-test="dex"]').press("Tab");
  await page.waitForFunction(
    () => document.querySelector("[data-hbe-test-verdict]")?.dataset.hbeTestVerdict === "no",
  );
  const logBefore = (await stored()).log.length;
  await shot("b48-01-feat-activity-test-sheet.png", null, true);
  await page.locator('[data-hbe-test="dex"]').fill("14");
  await page.locator('[data-hbe-test="dex"]').press("Tab");
  await page.waitForFunction(
    () => document.querySelector("[data-hbe-test-verdict]")?.dataset.hbeTestVerdict === "yes",
  );
  check((await stored()).log.length === logBefore, "the test sheet wrote to the log");
  passed.push(
    "1a. Feat from the SRD Grappler template: level group removed, Str 13 OR Dex 13, choose 1 of 2, +1 AC, save activity; test sheet shows prerequisites ✓/✗, AC 12 → +1 = 13, DC 13, no log",
  );
  await hbe("save-content").click();
  await page.locator("[data-hbe-detail]").waitFor();
  let data = await stored();
  const featId = data.library.find(
    (c) => latestRev(data, c.id).data.name.it === "Guardia delle lanterne",
  ).id;
  let feat = latestRev(data, featId).data.structured;
  check(
    feat.automation.level === "full" &&
      feat.prerequisites.length === 1 &&
      feat.activities[0].effect.duration === "start-next-self",
    "saved structure wrong",
  );
  check(
    (await content()).includes("Automazione completa"),
    "automation level not declared on the detail",
  );
  await hbe("share", '[data-shared="true"]').click();
  await page.locator('[data-hbe="share"][data-shared="false"]').waitFor();
  await shot("b48-02-feat-detail-shared.png");
  // DM: the shared feat is listed under "Condivise con te"; enable the revision.
  await role("dm");
  await page.goto(base + "#library?tab=homebrew-editor");
  await page.locator(`[data-hbe-row="${featId}"]`).waitFor();
  await page.locator(`[data-hbe-row="${featId}"] [data-hbe="open"]`).click();
  await hbe("enable", '[data-enabled="true"]').click();
  await page.locator('[data-hbe="enable"][data-enabled="false"]').waitFor();
  data = await stored();
  check(
    data.campaign.enabledContent.some((r) => r.contentId === featId),
    "revision not enabled",
  );
  passed.push(
    "1b. Player shares read access with the DM; the DM finds it under 'Condivise con te' and enables the revision in the campaign",
  );
  // Player applies it to Livia with Dex +1: AC 13, Dex 15, the Library copy on the sheet.
  await role("player");
  await page.goto(base + `#homebrew-editor?id=${featId}`);
  await hbe("apply-sheet").click();
  await dialog.locator('select[name="actorId"]').selectOption("livia");
  const optionName = await dialog.locator('input[type="radio"]').nth(1).getAttribute("name");
  await dialog.locator('input[type="radio"]').nth(1).check();
  await submit();
  await page.waitForFunction(() => location.hash.startsWith("#characters"));
  await page.goto(base + "#characters?id=livia&tab=features");
  await page.locator(".hbe-sheet").first().waitFor();
  data = await stored();
  check(
    data.actors.livia.ac === 13 && data.actors.livia.abilities.dex === 15,
    "AC/Dex not applied: " + data.actors.livia.ac,
  );
  check(
    data.actors.livia.features.some((f) => f.homebrewRef?.contentId === featId),
    "feature row missing",
  );
  const sheetText = await page.locator(".hbe-sheet").first().innerText();
  check(
    sheetText.includes("Guardia delle lanterne") && /base 12 → Somma \+1/.test(sheetText),
    "sheet box lacks entry/stacking: " + sheetText,
  );
  check((await content()).includes("Guardia delle lanterne"), "feature not in the features list");
  await shot("b48-03-livia-sheet-stacking.png", page.locator(".hbe-sheet"));
  // Undo (own label) takes copy and effects away; apply again for the next groups.
  await hbe("undo").click();
  await page.waitForFunction(
    (k) => JSON.parse(localStorage.getItem(k)).actors.livia.ac === 12,
    key,
  );
  data = await stored();
  check(
    data.actors.livia.abilities.dex === 14 &&
      !data.actors.livia.features.some((f) => f.homebrewRef?.contentId === featId),
    "Undo left effects",
  );
  await hbe("add-structured").click();
  await dialog.locator('input[name="pick"]').first().check();
  await submitNext("Applica «Guardia delle lanterne»");
  await dialog.locator(`input[name="${optionName}"]`).nth(1).check();
  await submit();
  await page.reload();
  await page.locator(".hbe-sheet").first().waitFor();
  data = await stored();
  check(data.actors.livia.ac === 13, "reload lost the AC");
  check(
    (
      await page.locator(".character-heading, .character-vitals, #content").first().innerText()
    ).includes("13"),
    "AC 13 not visible",
  );
  passed.push(
    "1c. Applied to Livia with Dex +1 (AC 12→13, Dex 14→15, feature row); Undo from the sheet box removes copy and effects; re-added from the sheet's 'Aggiungi homebrew…'; reload keeps AC 13",
  );

  // ------------------------------------------------------------ group 2: activity at the Table
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  await role("dm");
  const button = (name) => page.getByRole("button", { name, exact: true });
  // The DM moves the Sentinella within 9 m of Livia, then prepares and starts combat.
  const map = (x, y) =>
    page.evaluate(
      ([x, y]) => {
        const svg = document.querySelector("#battle-map");
        const pt = svg.createSVGPoint();
        pt.x = x;
        pt.y = y;
        const c = pt.matrixTransform(svg.getScreenCTM());
        return { x: c.x, y: c.y };
      },
      [x, y],
    );
  // W2b2 (B41) seeds a hidden pressure plate at 400–450 × 350–410: the old drop point
  // (420, 380) set it off, and its pending event (the DM decides) held the Sentinella's
  // turn. 80 px higher is still 5.6 m from Livia, off the plate and off B40's fountain.
  // Refreshed by the hand-off writer (29/09/2026): P6 TV-01 moves a token by dragging it.
  const sentinel = await page.locator("#battle-map [data-actor=goblin-1]").boundingBox();
  let point = await map(420, 300);
  await page.mouse.move(sentinel.x + sentinel.width / 2, sentinel.y + sentinel.height / 2);
  await page.mouse.down();
  await page.mouse.move(point.x, point.y, { steps: 10 });
  await page.mouse.up();
  await tick();
  await button("Avvia combattimento").click();
  // Refreshed by the hand-off writer (29/09/2026): R5 PR-32 replaced Preparation's «Incontro
  // preparato» with the Table's start dialog (Foundry roll call): who fights and each typed
  // d20; the Initiative bonus comes from the sheet.
  await page.locator("[data-ct-start-dialog]").waitFor();
  {
    const naturals = { livia: 18, "goblin-1": 12, doran: 10, "goblin-2": 8 };
    const startIds = await page
      .locator("[data-ct-start-include]")
      .evaluateAll((els) => els.map((el) => el.dataset.ctStartInclude));
    for (const id of startIds) {
      const box = page.locator('[data-ct-start-include="' + id + '"]');
      if ((await box.isChecked()) !== Object.hasOwn(naturals, id)) await box.click();
    }
    for (const [id, natural] of Object.entries(naturals)) {
      const d20 = page.locator('[data-ct-start-natural="' + id + '"]');
      await d20.fill(String(natural));
      await d20.dispatchEvent("change");
    }
  }
  await button("Inizia combattimento").click();
  await page.locator("#battle-map").waitFor();
  data = await stored();
  check(
    data.combat.active && data.combat.order[data.combat.turn] === "livia",
    "combat not on Livia",
  );
  // Player: select Livia; the Creature tab shows the homebrew activity; use it on the Sentinella.
  await role("player");
  await page.locator("[data-select=livia]").click();
  await page.locator('[data-ext-slot="table-panel:homebrew-editor-inspector"]').waitFor();
  await page
    .locator('[data-ext-slot="table-panel:homebrew-editor-inspector"] [data-hbe="use"]')
    .click();
  check(
    (await dialog.innerText()).includes("8 + competenza 2 + Int +3 = 13"),
    "DC formula missing in the use dialog",
  );
  await dialog.locator('input[name="target"][value="goblin-1"]').check();
  await submit();
  data = await stored();
  const use = data.ext["homebrew-editor"].uses.at(-1);
  check(
    use.dc === 13 && data.actors.livia.action === false,
    "use not recorded or action not spent",
  );
  await shot(
    "b48-04-table-use-activity.png",
    page.locator('[data-ext-slot="table-panel:homebrew-editor-inspector"]'),
  );
  // DM: the bell lists the save request; the Sentinella's controller rolls a physical 5.
  await role("dm");
  await page.locator('[data-service="requests"]').first().click();
  check(
    (await dialog.innerText()).includes("Tiro salvezza: Sentinella"),
    "save request not in the bell",
  );
  await page.keyboard.press("Escape");
  await page.locator("[data-select=goblin-1]").click();
  const inspector = page.locator('[data-ext-slot="table-panel:homebrew-editor-inspector"]');
  await inspector.locator('[data-hbe="roll-save"]').click();
  await dialog.locator('input[name="dieMode"][value="physical"]').check();
  await dialog.locator('input[name="face-0"]').fill("5");
  await submit();
  data = await stored();
  const fr = () => (data.actors["goblin-1"].conditions ?? []).filter((c) => c.id === "frightened");
  check(
    fr().length === 1 && fr()[0].term.actorId === "livia" && fr()[0].term.phase === "start",
    "Frightened not applied with Livia's turn term",
  );
  check(
    data.ext["compendium-rolls"].rolls.at(-1).mode === "physical" &&
      data.ext["compendium-rolls"].rolls.at(-1).total === 6,
    "physical save not recorded",
  );
  await shot("b48-05-table-save-frightened.png");
  // Undo withdraws the outcome; the recorded roll is reapplied without a new roll.
  await page.locator('[data-table="undo"]').click();
  await page.waitForFunction(
    (k) =>
      !(JSON.parse(localStorage.getItem(k)).actors["goblin-1"].conditions ?? []).some(
        (c) => c.id === "frightened",
      ),
    key,
  );
  await inspector.locator('[data-hbe="roll-save"]', { hasText: "Riapplica" }).click();
  data = await stored();
  check(fr().length === 1, "reapplied outcome missing");
  check(
    data.ext["compendium-rolls"].rolls.filter((r) => r.rollKind === "save").length === 1,
    "a second save was rolled",
  );
  passed.push(
    "2a. At the Table the player uses 'Bagliore della lanterna' from Livia's Creature tab (DC 13, action spent); the DM gets the bell request, rolls a physical 5 (+1 = 6): Frightened until the start of Livia's next turn; Undo then 'Riapplica' reuses the same roll",
  );
  // End turns: still frightened through the Sentinella, Doran and Esploratore; gone at Livia's start.
  for (const who of ["goblin-1", "doran", "goblin-2"]) {
    await button("Termina turno").click();
    await page.waitForFunction(
      ([k, w]) => {
        const s = JSON.parse(localStorage.getItem(k));
        return s.combat.order[s.combat.turn] === w;
      },
      [key, who],
    );
    data = await stored();
    check(fr().length === 1, `condition ended too early at ${who}'s turn`);
  }
  await button("Termina turno").click();
  await page.waitForFunction((k) => {
    const s = JSON.parse(localStorage.getItem(k));
    return s.combat.order[s.combat.turn] === "livia";
  }, key);
  data = await stored();
  check(fr().length === 0, "condition did not end at the start of Livia's next turn");
  passed.push(
    "2b. Frightened stays through the Sentinella's, Doran's and the Esploratore's turns and ends exactly when Livia's next turn starts",
  );
  // Close the combat for the next groups (DM, Table title row).
  await button("Concludi incontro").click();
  if (await dialog.evaluate((d) => d.open)) await submit();
  await page.waitForFunction((k) => !JSON.parse(localStorage.getItem(k)).combat.active, key);

  // ------------------------------------------------------------ group 3: subclass and Mira's advancement
  await role("player");
  await page.goto(base + "#library?tab=homebrew-editor");
  await hbe("create", '[data-kind="subclass"]').click();
  await dialog.locator('select[name="template"]').selectOption("class-levels:druid");
  await submit();
  await page.locator("[data-hbe-editor]").waitFor();
  await path("name.it").fill("Circolo delle Lanterne");
  await path("name.en").fill("Circle of Lanterns");
  await path("source.label").fill("Tavolo di Bruma");
  await hbe("save-draft").click();
  await page.locator("[data-hbe-status]", { hasText: "Bozza privata salvata" }).waitFor();
  await hbe("subform", '[data-subform="advancement"]').click();
  await page.locator('[data-hbe-advancement="14"]').waitFor();
  check((await content()).includes("3, 6, 10, 14"), "Druid subclass levels not listed");
  const names = [
    ["3", "Luce del guardiano", "Warden's light"],
    ["6", "Fiamma custode", "Keeper flame"],
    ["10", "Faro vivente", "Living beacon"],
  ];
  for (const [level, it, en] of names) {
    await page
      .locator(`[data-hbe-advancement="${level}"] [data-hbe-path$=".features.0.name.it"]`)
      .fill(it);
    await page
      .locator(`[data-hbe-advancement="${level}"] [data-hbe-path$=".features.0.name.en"]`)
      .fill(en);
  }
  await page.locator('[data-hbe-advancement="14"] [data-hbe="remove-advancement"]').click();
  await page.locator('[data-hbe-advancement="14"]').waitFor({ state: "detached" });
  await page.locator("[data-hbe-new-advancement]").selectOption("scale");
  await page.locator("[data-hbe-new-advancement-level]").fill("3");
  await hbe("add-advancement").click();
  const scale = page.locator('[data-hbe-advancement="3"]').nth(1);
  await scale.locator('[data-hbe-path$=".scale.name.it"]').fill("Dado della lanterna");
  await scale.locator('[data-hbe-path$=".scale.name.en"]').fill("Lantern die");
  await scale.locator('[data-hbe-path$=".scale.values.3"]').fill("1d6");
  await scale.locator("[data-hbe-scale-level]").fill("6");
  await scale.locator('[data-hbe="add-scale-level"]').click();
  await page
    .locator('[data-hbe-advancement="3"]')
    .nth(1)
    .locator('[data-hbe-path$=".scale.values.6"]')
    .fill("1d8");
  await page
    .locator('[data-hbe-advancement="3"]')
    .nth(1)
    .locator('[data-hbe-path$=".scale.values.6"]')
    .press("Tab");
  await shot("b48-06-subclass-advancement-editor.png", null, true);
  await hbe("save-content").click();
  await page.locator("[data-hbe-detail]").waitFor();
  data = await stored();
  const subId = data.library.find(
    (c) => latestRev(data, c.id).data.name.it === "Circolo delle Lanterne",
  ).id;
  const sub = latestRev(data, subId).data.structured;
  check(
    sub.subclass.classId === "druid" &&
      sub.advancement
        .filter((a) => a.type === "grant")
        .map((a) => a.level)
        .join() === "3,6,10",
    "subclass levels saved wrong",
  );
  await hbe("share", '[data-shared="true"]').click();
  await page.locator('[data-hbe="share"][data-shared="false"]').waitFor();
  await role("dm");
  await page.goto(base + `#homebrew-editor?id=${subId}`);
  await hbe("enable", '[data-enabled="true"]').click();
  await page.locator('[data-hbe="enable"][data-enabled="false"]').waitFor();
  // Player: Personaggi → Mira → Capacità → choose the subclass and apply level 3.
  await role("player");
  await page.goto(base + "#characters");
  await page.locator('[data-character-action="open"][data-actor="mira"]').click();
  await page.locator('[data-character-tab="features"]').click();
  await hbe("choose-subclass").click();
  await dialog.locator('input[name="pick"]').first().check();
  await submit();
  await page
    .locator(".hbe-subclass .hbe-notice", { hasText: "Avanzamento da applicare" })
    .waitFor();
  await hbe("apply-advancement").click();
  await page.locator('[data-hbe-granted="3"]').first().waitFor();
  check((await content()).includes("Luce del guardiano"), "level-3 feature not on Mira's sheet");
  check(
    (await page.locator(".hbe-subclass").innerText()).includes("Dado della lanterna: 1d6"),
    "scale value 1d6 missing",
  );
  check(
    (await page.locator('[data-hbe-future="6"]').count()) === 1 &&
      (await page.locator('[data-hbe-future="10"]').count()) === 1,
    "future levels 6/10 not listed",
  );
  // Mira reaches level 6 (Correggi valori): the advancement becomes due and is applied.
  await page.locator('[data-character-action="edit-character"]').click();
  await dialog.locator('[name="level"]').fill("6");
  await submit();
  await page.locator(".hbe-subclass .hbe-notice", { hasText: "Livello 6" }).waitFor();
  await hbe("apply-advancement").click();
  await page.locator('[data-hbe-granted="6"]').waitFor();
  check((await content()).includes("Fiamma custode"), "level-6 feature not on Mira's sheet");
  check(
    (await page.locator(".hbe-subclass").innerText()).includes("Dado della lanterna: 1d8"),
    "scale value 1d8 missing",
  );
  check((await page.locator('[data-hbe-future="10"]').count()) === 1, "level 10 not still future");
  await page.reload();
  await page.locator('[data-hbe-granted="6"]').waitFor();
  data = await stored();
  check(
    data.actors.mira.features.filter((f) => f.grantId === `homebrew-advancement:${subId}`)
      .length === 2,
    "reload lost granted features",
  );
  await shot("b48-07-mira-subclass-advancement.png", page.locator(".hbe-subclass"));
  passed.push(
    "3. Subclass from the Druid subclass levels (3/6/10/14): features at 3/6/10, level 14 removed, scale value 1d6→1d8; shared and enabled; Mira picks it from Capacità, level 3 applied; 'Correggi valori' to level 6 makes level 6 due, applied; level 10 stays future; reload keeps both",
  );

  // ------------------------------------------------------------ group 4: monster creator and CSV import
  await role("dm");
  await page.goto(base + "#library?tab=homebrew-editor");
  await hbe("create", '[data-kind="monster"]').click();
  await dialog.locator('select[name="template"]').selectOption("srd-creature:goblin-boss");
  await submit();
  await page.locator("[data-hbe-editor]").waitFor();
  await path("name.it").fill("Capo delle lanterne");
  await path("name.en").fill("Lantern chief");
  await path("source.label").fill("DM di Bruma");
  await hbe("save-draft").click();
  await page.locator("[data-hbe-status]", { hasText: "Bozza privata salvata" }).waitFor();
  await hbe("subform", '[data-subform="statblock"]').click();
  await path("structured.creature.sections.legendary.enabled").check();
  await page.locator('[data-hbe="add-block"][data-section="legendary.actions"]').waitFor();
  await page.locator('[data-hbe="add-block"][data-section="legendary.actions"]').click();
  await path("structured.creature.sections.legendary.actions.0.name.it").fill("Colpo rapido");
  await path("structured.creature.sections.legendary.actions.0.text.it").fill(
    "Attacco in mischia +4, portata 1,5 m. Colpito: 5 (1d6 + 2) danni taglienti.",
  );
  await page
    .locator(
      '[data-hbe="auto-rollables"][data-path="structured.creature.sections.legendary.actions.0"]',
    )
    .click();
  await page.waitForFunction(() =>
    document
      .querySelector('[data-hbe-path="structured.creature.sections.legendary.actions.0.text.it"]')
      ?.value.includes("[rollable]"),
  );
  await path("structured.creature.sections.lair.enabled").check();
  await page.locator('[data-hbe="add-block"][data-section="lair.actions"]').waitFor();
  await page.locator('[data-hbe="add-block"][data-section="lair.actions"]').click();
  await path("structured.creature.sections.lair.actions.0.name.it").fill("Lanterne tremolanti");
  await path("structured.creature.sections.lair.actions.0.text.it").fill(
    "Ogni creatura entro 6 m subisce 2d6 danni da fuoco.",
  );
  await page
    .locator('[data-hbe="auto-rollables"][data-path="structured.creature.sections.lair.actions.0"]')
    .click();
  await page.waitForFunction(() =>
    document
      .querySelector('[data-hbe-path="structured.creature.sections.lair.actions.0.text.it"]')
      ?.value.includes("2d6|damage|fire"),
  );
  // The preview's roll buttons are a local try: nothing is recorded.
  const rollsBefore = (await stored()).ext["compendium-rolls"].rolls.length;
  await page.locator('[data-hbe-statblock="test"] [data-hbe="test-roll"]').first().click();
  await page.locator(".hbe-test-roll", { hasText: "non registrata" }).waitFor();
  check(
    (await stored()).ext["compendium-rolls"].rolls.length === rollsBefore,
    "a preview roll was recorded",
  );
  await shot("b48-08-monster-statblock-editor.png", null, true);
  await hbe("save-content").click();
  await page.locator("[data-hbe-detail]").waitFor();
  data = await stored();
  const monsterId = data.library.find(
    (c) => latestRev(data, c.id).data.name.it === "Capo delle lanterne",
  ).id;
  const monster = latestRev(data, monsterId).data.structured;
  check(
    monster.creature.sections.legendary.enabled &&
      monster.creature.sections.lair.enabled &&
      monster.automation.level === "partial",
    "monster sections/automation wrong",
  );
  // Live stat block: a rollable block rolls through the shared roll service (physical faces).
  await page
    .locator(
      '[data-hbe-statblock="live"] [data-hbe="roll-block"][data-section="legendary.actions"]',
    )
    .first()
    .click();
  await dialog.locator('input[name="dieMode"][value="physical"]').check();
  await dialog.locator('input[name="face-0"]').fill("15");
  await dialog.locator('select[name="visibility"]').selectOption("private");
  await submit();
  data = await stored();
  const last = data.ext["compendium-rolls"].rolls.at(-1);
  check(
    last.total === 19 && last.visibility === "private" && last.mode === "physical",
    "rollable block not recorded: " + JSON.stringify(last),
  );
  // Add it to the active scene: the Table shows its block to the DM.
  await hbe("place").click();
  await submit();
  data = await stored();
  const chief = Object.values(data.actors).find((a) => a.homebrewCreature?.contentId === monsterId);
  check(
    chief && chief.ac === 17 && chief.combatProfile.meleeAttack.attackBonus === 4,
    "monster not placed with its values",
  );
  await page.goto(base + "#table");
  await page.locator(`#battle-map [data-actor="${chief.id}"]`).click();
  await page
    .locator('[data-ext-slot="table-panel:homebrew-editor-inspector"] .hbe-statblock')
    .waitFor();
  await shot(
    "b48-09-table-homebrew-monster.png",
    page.locator('[data-ext-slot="table-panel:homebrew-editor-inspector"]'),
  );
  passed.push(
    "4a. Monster from the Goblin Boss preset: legendary and lair sections switched on, entries made rollable with the editor button; preview rolls are local tries; the live block rolls a physical 15+4 = 19 (DM only); added to the scene with AC 17 and its melee attack; the Table's Creature tab shows the block to the DM",
  );
  // CSV import with per-row errors (Kobold+): the example, one broken row, fix and import.
  await page.goto(base + "#library?tab=homebrew-editor");
  await hbe("import-page").click();
  const download = page.waitForEvent("download");
  await hbe("import-download").click();
  check(
    (await (await download).suggestedFilename()) === "d20-mostri-esempio.csv",
    "example CSV not downloadable",
  );
  await hbe("import-example").click();
  const text = await page.locator("[data-hbe-import-text]").inputValue();
  await page
    .locator("[data-hbe-import-text]")
    .fill(text.replace("Falena di brace,tiny,beast,12", "Falena di brace,minuscola,beast,dodici"));
  await hbe("import-check").click();
  await page.locator('[data-hbe-import-row="3"].hbe-row-error').waitFor();
  const row3 = await page.locator('[data-hbe-import-row="3"]').innerText();
  check(
    row3.includes("Taglia sconosciuta «minuscola»") && row3.includes("CA non valida «dodici»"),
    "row errors missing: " + row3,
  );
  await shot("b48-10-csv-import-row-errors.png", page.locator(".hbe-import-result"));
  await hbe("import-apply").click();
  await page.locator('[data-hbe-import-row="3"]').waitFor();
  await page.locator("[data-hbe-import-text]").fill(
    text
      .split("\n")
      .filter((_, i) => i === 0 || i === 2)
      .join("\n"),
  );
  await hbe("import-check").click();
  await hbe("import-apply").click();
  data = await stored();
  const names3 = data.library.map((c) => latestRev(data, c.id).data.name.it);
  check(
    ["Lanterniere spettrale", "Falena di brace", "Guardiano del faro"].every((n) =>
      names3.includes(n),
    ),
    "imported monsters missing",
  );
  passed.push(
    "4b. Importer: example CSV downloadable and insertable; a broken row 3 shows per-cell errors (size, AC) while rows 2 and 4 import; the fixed row imports next",
  );

  // ------------------------------------------------------------ group 5: forge and revert to source
  await role("player");
  await page.goto(base + "#library?tab=homebrew-editor");
  await hbe("create", '[data-kind="magic-item"]').click();
  await page.locator("[data-hbe-forge-preview]", { hasText: "Spada lunga +1" }).waitFor();
  await shot("b48-11-forge.png");
  await hbe("forge").click();
  await page.locator("[data-hbe-editor]").waitFor();
  await path("name.it").fill("Lama del faro");
  await path("source.label").fill("Tavolo di Bruma");
  await hbe("subform", '[data-subform="item"]').click();
  await path("structured.item.weapon.damage.dice").fill("1d10");
  await path("structured.item.weapon.damage.dice").press("Tab");
  await page.locator(".hbe-origin", { hasText: "Modificato" }).waitFor();
  // Unsaved edits are protected: leaving asks first; "Resta nella bozza" keeps them.
  await hbe("go-hub").first().click();
  await page.locator("#dialog #dialog-title", { hasText: "Conservare la bozza?" }).waitFor();
  await dialog.getByRole("button", { name: "Resta nella bozza" }).click();
  check(
    (await path("structured.item.weapon.damage.dice").inputValue()) === "1d10" &&
      page.url().includes("homebrew-editor"),
    "draft guard lost the edit",
  );
  await hbe("save-content").click();
  await page.locator("[data-hbe-detail]").waitFor();
  check((await content()).includes("Modificato rispetto alla fonte"), "modified marker missing");
  await hbe("revert-source").click();
  check(
    (await dialog.innerText()).includes("Nome") &&
      (await dialog.innerText()).includes("Dati dell’oggetto"),
    "revert dialog lacks fields",
  );
  await submit();
  await page.locator("[data-hbe-detail] h1", { hasText: "Spada lunga +1" }).waitFor();
  data = await stored();
  const swordId = data.library.find((c) =>
    c.revisions.some((r) => r.data.name.it === "Lama del faro"),
  ).id;
  const sword = data.library.find((c) => c.id === swordId);
  check(
    sword.revisions.length === 2 &&
      sword.revisions[1].data.structured.item.weapon.damage.dice === "1d8",
    "revert did not create the source revision",
  );
  check((await content()).includes("Identico alla fonte"), "not identical after revert");
  await shot("b48-12-forge-reverted.png");
  passed.push(
    "5. Forge: Longsword + Weapon +1 (SRD EN 253 / IT 243) previewed and drafted; renamed 'Lama del faro' with 1d10 → 'Modificato'; leaving asks 'Conservare la bozza?' and 'Resta nella bozza' keeps the edit; 'Ripristina alla fonte' lists the fields and saves revision 2 identical to the source (1d8, Spada lunga +1)",
  );

  // ------------------------------------------------------------ group 6: campaign safe mode and Find the Culprit
  await role("dm");
  await page.goto(base + "#campaign");
  await openCampaignSection(page, "homebrew-editor"); // B62: the «Gioco» group
  await page.locator(".hbe-campaign").waitFor();
  check(
    await page.locator('[data-campaign-tab="homebrew-editor"].active').count(),
    "campaign section not marked active",
  );
  const campaignText = await page.locator(".hbe-campaign").innerText();
  check(
    campaignText.includes("Guardia delle lanterne") &&
      campaignText.includes("Automazione completa") &&
      campaignText.includes("Livia"),
    "automation per entry missing: " + campaignText,
  );
  await shot("b48-13-campaign-homebrew.png", page.locator(".hbe-campaign"));
  await hbe("safe-mode", '[data-disabled="true"]').click();
  await page.locator(".hbe-campaign .hbe-notice", { hasText: "Modalità sicura" }).waitFor();
  data = await stored();
  check(
    data.actors.livia.ac === 12 &&
      data.actors.livia.abilities.dex === 14 &&
      data.campaign.enabledContent.length === 0,
    "safe mode did not suspend effects",
  );
  await page.goto(base + "#characters?id=livia&tab=features");
  await page
    .locator(".hbe-sheet .hbe-notice", { hasText: "disattivato per la campagna" })
    .waitFor();
  await page.goto(base + "#campaign?tab=homebrew-editor");
  await hbe("safe-mode", '[data-disabled="false"]').click();
  await page.locator('[data-hbe="safe-mode"][data-disabled="true"]').waitFor();
  data = await stored();
  check(
    data.actors.livia.ac === 13 && data.campaign.enabledContent.length === 2,
    "re-enable did not restore effects/revisions",
  );
  await hbe("culprit-start").click();
  await page.locator(".hbe-culprit").waitFor();
  await hbe("culprit-answer", '[data-persists="true"]').click();
  await page.locator(".hbe-culprit", { hasText: "Colpevole trovato" }).waitFor();
  await shot("b48-14-find-the-culprit.png", page.locator(".hbe-campaign"));
  await hbe("culprit-end", '[data-keep="false"]').click();
  await page.locator(".hbe-culprit").waitFor({ state: "detached" });
  data = await stored();
  check(data.actors.livia.ac === 13, "culprit search left effects off");
  passed.push(
    "6. Campaign → Homebrew: automation per entry and sheets using it; 'Disattiva tutto l’homebrew' → Livia AC 13→12, no campaign options, sheet notice; re-enabled → AC 13 and the same two revisions; Find the Culprit halves, 'Sì, c’è ancora' → culprit found; closing re-enables everything",
  );

  // ------------------------------------------------------------ group 7: publishing and versions
  await page.goto(base + `#homebrew-editor?id=${monsterId}`);
  await hbe("publish").click();
  await dialog.locator('input[name="aiMethod"][value="generated"]').check();
  await page.locator("#dialog button[type=submit]").click();
  await page.locator("#dialog .dialog-error", { hasText: "IA" }).waitFor();
  await dialog.locator('input[name="aiMethod"][value="human"]').check();
  await submit();
  await page.locator('[data-hbe-version="queued"]').waitFor();
  await page.goto(base + "#homebrew-editor?tab=catalog");
  await page.locator(`[data-hbe-queue="${monsterId}"]`).waitFor();
  await page.locator(`[data-hbe-queue="${monsterId}"] [data-decision="approve"]`).click();
  await page.locator(`[data-hbe-catalog="${monsterId}"]`).waitFor();
  await role("player");
  await page.locator(`[data-hbe-catalog="${monsterId}"] [data-hbe="follow"]`).click();
  await page.locator(`[data-hbe-catalog="${monsterId}"] [data-hbe="rate"][data-stars="4"]`).click();
  data = await stored();
  const v1 = data.ext["homebrew-editor"].publications[monsterId].versions[0].revisionId;
  check(
    data.libraryCollections.player.some((r) => r.revisionId === v1),
    "v1 not in the player's collection",
  );
  await role("dm");
  await page.goto(base + `#homebrew-editor?id=${monsterId}`);
  await hbe("revise").click();
  await page.locator("[data-hbe-editor]").waitFor();
  await path("description.it").fill("Ora regge una lanterna spenta e ne teme la luce.");
  await hbe("save-content").click();
  await page.locator("[data-hbe-detail]").waitFor();
  await hbe("publish").click();
  await dialog.locator('input[name="aiMethod"][value="assisted"]').check();
  await submit();
  await page.goto(base + "#homebrew-editor?tab=catalog");
  await page.locator(`[data-hbe-queue="${monsterId}"] [data-decision="approve"]`).click();
  await page.locator(`[data-hbe-catalog="${monsterId}"] .badge`, { hasText: "v2" }).waitFor();
  await role("player");
  await page.locator('[data-service="requests"]').first().click();
  check((await dialog.innerText()).includes("Nuova versione v2"), "new version not notified");
  await page.keyboard.press("Escape");
  await page
    .locator(`[data-hbe-catalog="${monsterId}"] .hbe-notice`, { hasText: "è uscita la v2" })
    .waitFor();
  await shot("b48-15-catalog-new-version.png", page.locator(`[data-hbe-catalog="${monsterId}"]`));
  await page
    .locator(`[data-hbe-catalog="${monsterId}"] [data-hbe="follow"]`, { hasText: "Passa alla v2" })
    .click();
  await page.locator(`[data-hbe-catalog="${monsterId}"] .badge`, { hasText: "Segui v2" }).waitFor();
  data = await stored();
  const v2 = data.ext["homebrew-editor"].publications[monsterId].versions[1].revisionId;
  check(
    data.libraryCollections.player.some((r) => r.revisionId === v2) &&
      !data.libraryCollections.player.some((r) => r.revisionId === v1),
    "collection not moved to v2",
  );
  check(
    data.library.find((c) => c.id === monsterId).revisions[0].data.description.it === "",
    "v1 changed",
  );
  passed.push(
    "7. Publishing (simulated): a mostly-AI method is refused in the dialog, 'Scritto da persone' enters moderation, the simulated approval publishes v1; the player follows it and rates 4★; the DM's 'Nuova versione' becomes v2 (AI-assisted); the bell and the catalogue offer 'Passa alla v2', chosen by the player; v1 unchanged",
  );

  // ------------------------------------------------------------ group 8: EN phone 390, touch
  const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
  const phoneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const phone = await phoneContext.newPage();
  phone.on("pageerror", (error) => errors.push("phone: " + error.message));
  await phone.goto(base + "#library");
  await phone.evaluate(([k, v]) => localStorage.setItem(k, v), [key, snapshot]);
  await phone.reload();
  await phone.locator("[data-library-scope]").first().waitFor();
  await phone.locator("#demo-role").selectOption("player");
  await phone.locator('[data-service="preferences"]').first().tap();
  await phone.locator('#dialog [name="lang"]').selectOption("en");
  await phone.locator('#dialog button[type="submit"]').tap();
  await phone.locator('[data-library-scope="homebrew-editor"]', { hasText: "My creations" }).tap();
  await phone.locator(".hbe-hub", { hasText: "My creations" }).waitFor();
  check(await noOverflow(phone), "hub overflows at 390");
  await phone.screenshot({ path: dir + "b48-16-phone-en-hub.png", fullPage: true });
  await phone.locator('[data-hbe="create"][data-kind="feat"]').tap();
  await phone
    .locator('#dialog select[name="template"]')
    .selectOption("srd-feat:ability-score-improvement");
  await phone.locator("#dialog button[type=submit]").tap();
  await phone.locator("[data-hbe-editor]").waitFor();
  await phone.locator('[data-hbe="subform"][data-subform="options"]').tap();
  check(
    (await phone.locator("#content").innerText()).includes("Ability to increase"),
    "EN option title missing",
  );
  check(await noOverflow(phone), "editor overflows at 390");
  const small = await phone.evaluate(() =>
    [
      ...document.querySelectorAll(
        "#content .hbe-page button, #content .hbe-page select, #content .hbe-page input:not([type=radio]):not([type=checkbox])",
      ),
    ]
      .filter((el) => el.offsetParent && el.getBoundingClientRect().height < 40)
      .map((el) => el.outerHTML.slice(0, 80)),
  );
  check(!small.length, "targets under 40px: " + small.join(" | "));
  // The strip may scroll smoothly: wait until the open sub-form is inside it.
  await phone.waitForFunction(
    () => {
      const strip = document.querySelector(".hbe-subforms").getBoundingClientRect();
      const tab = document.querySelector(".hbe-subforms .active").getBoundingClientRect();
      return tab.left >= strip.left - 1 && tab.right <= strip.right + 1;
    },
    null,
    { timeout: 3000 },
  );
  await phone.screenshot({ path: dir + "b48-17-phone-en-editor.png", fullPage: true });
  await phone.goto(base + "#characters?id=livia&tab=features");
  await phone.locator(".hbe-sheet").first().waitFor();
  check(
    (await phone.locator(".hbe-sheet").first().innerText()).includes("Structured homebrew"),
    "EN sheet box missing",
  );
  check(await noOverflow(phone), "sheet overflows at 390");
  await phone.goto(base + "#table");
  await phone.locator("#battle-map").waitFor();
  await phone.locator("#battle-map [data-actor=livia]").tap();
  await phone
    .locator('[data-ext-slot="table-panel:homebrew-editor-inspector"]', {
      hasText: "Lantern glare",
    })
    .waitFor();
  check(await noOverflow(phone), "table overflows at 390");
  await phone
    .locator('[data-ext-slot="table-panel:homebrew-editor-inspector"]')
    .scrollIntoViewIfNeeded();
  await phone.screenshot({ path: dir + "b48-18-phone-en-table.png" });
  await phoneContext.close();
  passed.push(
    "8. EN phone 390 touch: 'My creations' hub, a new ASI feat's options, Livia's 'Structured homebrew' box and the Table's 'Lantern glare' activity; no horizontal overflow; editor controls ≥ 40 px",
  );

  return { passed, errors };
};
