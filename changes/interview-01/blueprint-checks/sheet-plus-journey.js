async (rootPage) => {
  // B37 Sheet: derived values, reasoned overrides and conveniences. Real clicks, keys and
  // taps against the running blueprint (synthetic data; resets this browser's demo state).
  // Acceptance (CAPABILITY_CENSUS B37): (1) Play shows effective values and actions, Edit the
  // base values and construction; the choice stays on the device. (2) AC override "magic
  // bonus +1" with a note; the total shows the chain in the declared order; removal.
  // (3) Fire resistance with a source plus a custom one with an asterisk; duplicates merged.
  // (4) Fly 9 m added and used by movement at the Table. (5) Bonus filter and 2024 generic
  // actions with description. (6) Starred favourites used from the strip. (7) Bless active:
  // +1d4 visible in attack and save details, then turned off. (8) +300 XP proposes the
  // level; milestone mode. (9) Rich tooltip on AC and Initiative. (10) Custom skill and
  // favourite skills on top. (11) Allies/Enemies notes. (12) A choice to reselect after a
  // Long Rest. IT desktop 1440x900, then an EN 390x844 touch context; reload persistence,
  // Undo/correction, DM vs player. Run: playwright-cli -s=d20-b37 --raw run-code
  // --filename=<this file> from /Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R4/.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const modeKey = "d20-studio-setting:sheet-plus.mode";
  const shots =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R4/B37/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push("desktop: " + error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const ok = (message) => passed.push(message);
  const saved = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const sheetData = async (id = "livia", p = page) => (await saved(p)).ext["sheet-plus"].actors[id];
  const dialog = (p = page) => p.locator("#dialog");
  const dialogText = (p = page) => dialog(p).innerText();
  const closeDialog = async (p = page) => {
    await dialog(p).locator("[data-close]").first().click();
    await p.waitForTimeout(120);
  };
  const submit = async (p = page) => {
    await dialog(p).locator("button[type=submit]").click();
    await p.waitForTimeout(250);
  };
  const setRole = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForTimeout(300);
  };
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const smallTargets = (selector, p = page) =>
    p.evaluate(
      (sel) =>
        [...document.querySelectorAll(sel)]
          // Rule words inside a sentence (BI-05 glossary terms) are inline text links, which
          // the 44/24 px target rules exempt (WCAG 2.5.8 inline exception).
          .filter((el) => !el.classList.contains("compendium-term"))
          .filter((el) => el.getBoundingClientRect().height > 0 && el.offsetParent !== null)
          .map((el) => ({
            text: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 30),
            h: Math.round(el.getBoundingClientRect().height),
            w: Math.round(el.getBoundingClientRect().width),
          }))
          .filter((box) => box.h < 40 || box.w < 40),
      selector,
    );
  const styled = (p = page) =>
    p.waitForFunction(() =>
      [...document.styleSheets].some(
        (s) => s.href?.endsWith("/sheet-plus.css") && s.cssRules.length,
      ),
    );
  const gotIt = async (p = page) => {
    for (const name of ["Ho capito", "Got it"]) {
      const button = p.getByRole("button", { name, exact: true });
      if (
        await button
          .first()
          .isVisible()
          .catch(() => false)
      )
        await button
          .first()
          .click()
          .catch(() => {});
    }
  };
  const bar = (p = page) => p.locator(".shp-bar");
  const pill = (keyName, p = page) => bar(p).locator(`[data-shp="stat"][data-key="${keyName}"]`);
  const openTab = async (tab, p = page) => {
    await p.locator(`[data-character-tab="${tab}"]`).first().click();
    await p
      .locator(`[data-character-tab="${tab}"][aria-current]`)
      .first()
      .waitFor({ timeout: 4000 })
      .catch(() => {});
    await p.waitForTimeout(150);
  };
  const setMode = async (mode, p = page) => {
    await bar(p).locator(`[data-shp="mode"][data-mode="${mode}"]`).click();
    await bar(p).locator(`[data-shp="mode"][data-mode="${mode}"][aria-pressed="true"]`).waitFor();
  };
  const shot = (name, p = page) => p.screenshot({ path: shots + name + ".png" });

  let phoneContext = null;
  try {
    // -----------------------------------------------------------------------------------
    // A. Home → Personaggi → Livia (2 clicks), Italian, Play by default.
    await page.goto(base);
    await page.evaluate(
      ([k, m]) => {
        localStorage.removeItem(k);
        localStorage.removeItem(m);
      },
      [key, modeKey],
    );
    await page.reload();
    await page.locator("#content").waitFor();
    await styled();
    await gotIt();
    let clicks = 0;
    await page.locator('.app-header [data-nav="characters"]').click();
    clicks++;
    await page.locator('[data-character-action="open"][data-actor="livia"]').click();
    clicks++;
    await bar().waitFor();
    await gotIt();
    check(clicks <= 3, "sheet bar needs more than 3 clicks");
    check(
      (await bar().locator('[data-shp="mode"][data-mode="play"]').getAttribute("aria-pressed")) ===
        "true",
      "Play is not the default mode",
    );
    // R4 refresh: Livia wears the SRD Cloak of Protection (P2 PG-25), +1 to AC and saves.
    check((await pill("ac").innerText()).includes("13"), "AC pill not 13 (12 + cloak)");
    ok("Sheet bar reached in 2 clicks (Personaggi → Apri scheda); Play is the default (FVT-008)");

    // B. (1) Edit mode: base values and construction; kept on this device after a reload.
    await setMode("edit");
    check(await bar().evaluate((el) => el.classList.contains("is-edit")), "bar not in edit");
    check(
      (await page.locator(".shp-derived .badge").first().innerText()).includes("Modifica"),
      "derived panel not in edit",
    );
    check(
      (await page.locator('.shp-derived [data-shp="stat"][data-key="save:int"]').count()) === 1,
      "saves have no cog in edit",
    );
    check(
      (await page.locator('.shp-derived [data-shp="skill-add"]').count()) === 1,
      "no Add skill in edit",
    );
    await page.reload();
    await bar().waitFor();
    check(
      (await bar().locator('[data-shp="mode"][data-mode="edit"]').getAttribute("aria-pressed")) ===
        "true",
      "edit mode lost on reload",
    );
    check(
      (await page.evaluate((m) => localStorage.getItem(m), modeKey)) === '"edit"',
      "mode not stored as a device setting",
    );
    check(
      !JSON.stringify((await saved()).ext ?? {}).includes('"mode":"edit"'),
      "mode leaked into the shared game state",
    );
    await bar().scrollIntoViewIfNeeded();
    await shot("01-edit-mode-it");
    ok(
      "(1) Edit shows base values with cogs, Add skill and construction; Play the totals; the choice survives a reload as a device setting (localStorage), not game state",
    );

    // C. (2) AC: reasoned modifiers, stacking order, removal, Undo.
    await pill("ac").click();
    await dialog().locator('[name="op"]').selectOption("add");
    await dialog().locator('[name="value"]').fill("1");
    await dialog().locator('[name="note"]').fill("Bonus magico: Anello di protezione");
    await submit();
    check((await saved()).actors.livia.ac === 13, "AC not 13 after +1");
    check(/12 → 13/.test(await dialogText()), "chain step 12 → 13 missing");
    // Empty reason refused with the message in the dialog.
    await dialog().locator('[name="op"]').selectOption("set-base");
    await dialog().locator('[name="value"]').fill("13");
    await submit();
    check(
      /Scrivi il motivo/.test(await dialog().locator(".dialog-error").innerText()),
      "empty reason accepted",
    );
    await dialog().locator('[name="note"]').fill("Armatura magica (13 + Des)");
    await submit();
    const chainText = await dialog().locator(".shp-chain").innerText();
    check(
      chainText.indexOf("Imposta la base") < chainText.indexOf("Aggiungi o togli"),
      "set base not before add in the chain",
    );
    check(/12 → 13[\s\S]*13 → 14/.test(chainText), "stacking order values wrong: " + chainText);
    check((await saved()).actors.livia.ac === 14, "AC not 14 with both");
    await shot("02-ac-chain-dialog-it");
    // Remove the set-base (correction), then Undo from the bar brings it back, remove again.
    await dialog()
      .locator(".shp-chain li", { hasText: "Imposta la base" })
      .locator('[data-shp-dialog="remove-mod"]')
      .click();
    await page.waitForTimeout(250);
    check((await saved()).actors.livia.ac === 13, "removal did not restore 13");
    await closeDialog();
    await bar().locator('[data-shp="undo"]').click();
    await page.waitForTimeout(250);
    check((await saved()).actors.livia.ac === 14, "Undo did not bring the base back");
    await pill("ac").click();
    await dialog()
      .locator(".shp-chain li", { hasText: "Imposta la base" })
      .locator('[data-shp-dialog="remove-mod"]')
      .click();
    await page.waitForTimeout(250);
    await closeDialog();
    check((await saved()).actors.livia.ac === 13, "final AC not 13");
    check(
      (await page.locator(".character-vitals .stat").nth(1).innerText()).includes("14"),
      "core AC card not 14 (13 written through + cloak)",
    );
    ok(
      "(2) AC «Bonus magico: Anello di protezione» +1 → 13 written through (14 shown with the cloak); a set base shows before the addition (12 → 13 → 14, R20-023); empty reason refused; removal back to 13, Undo from the bar restores, the core AC card reads 14 with the cloak",
    );

    // D. (9) Rich tooltips on AC (hover) and Initiative (keyboard), Escape dismisses.
    await setMode("play");
    await pill("ac").hover();
    const tipAc = page.locator("#shp-tip-ac");
    await tipAc.waitFor({ state: "visible" });
    const tipText = await tipAc.innerText();
    check(
      /Classe armatura 14/.test(tipText) &&
        /Senza armatura/.test(tipText) &&
        /Bonus magico/.test(tipText),
      "AC tooltip lacks the breakdown: " + tipText,
    );
    await shot("03-ac-tooltip-it");
    await page.mouse.move(5, 5);
    await pill("ac").focus();
    // Visual pass 2: D&D Beyond's strip puts Initiative before Armor Class.
    await page.keyboard.press("Shift+Tab");
    const tipInit = page.locator("#shp-tip-initiative");
    await tipInit.waitFor({ state: "visible" });
    check(/Punteggio d’iniziativa: 12/.test(await tipInit.innerText()), "initiative score missing");
    check(/EN 184 \/ IT 208/.test(await tipInit.innerText()), "initiative source missing");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
    check(!(await tipInit.isVisible()), "Escape did not dismiss the tooltip");
    ok(
      "(9) Hover on AC shows the chain (10 unarmored, Dex +2, Bonus magico +1, cloak +1 → 14, SRD EN 22 / IT 25); keyboard focus on Initiative shows +2, score 12 and SRD EN 184 / IT 208; Escape dismisses (FVT-010)",
    );

    // E. (3) Defenses: sourced fire, custom cold with asterisk, a second fire source merged.
    await bar().locator('[data-shp="defenses"]').click();
    const addDefense = async (kind, target, sourceKind, sourceName, note = "") => {
      await dialog().locator('[name="kind"]').selectOption(kind);
      await dialog().locator('[name="target"]').selectOption(target);
      await dialog().locator('[name="sourceKind"]').selectOption(sourceKind);
      await dialog().locator('[name="sourceName"]').fill(sourceName);
      await dialog().locator('[name="note"]').fill(note);
      await submit();
    };
    await addDefense("resistance", "fire", "spell", "Protezione dall’energia");
    await addDefense("resistance", "cold", "custom", "", "Dono del faro: accordo con il DM");
    await addDefense("resistance", "fire", "item", "Anello di resistenza");
    const defText = await dialogText();
    check(/Resistenza: Fuoco voci unite: 2/.test(defText), "fire sources not merged: " + defText);
    check(/Resistenza: Freddo\*/.test(defText), "custom cold has no asterisk");
    await shot("04-defenses-dialog-it");
    await closeDialog();
    const defPill = await bar().locator('[data-shp="defenses"]').innerText();
    check(/Fuoco, Freddo\*/.test(defPill), "defense pill: " + defPill);
    check(
      JSON.stringify((await saved()).actors.livia.damageDefenses.resistances) === '["fire","cold"]',
      "resistances not on the sheet field",
    );
    ok(
      "(3) Fire resistance from «Protezione dall’energia», custom Cold* with its agreement, a second fire source (Anello) merged into one chip listing both; actor.damageDefenses.resistances = fire, cold (DDB-031)",
    );

    // F. (10) Custom skill and favourite skills on top.
    await setMode("edit");
    await page.locator('.shp-derived [data-shp="skill-add"]').click();
    await dialog().locator('[name="name"]').fill("Tecnologia antica");
    await dialog().locator('[name="ability"]').selectOption("int");
    await dialog().locator('[name="proficiency"]').selectOption("proficient");
    await submit();
    const customRow = page.locator(".shp-derived .shp-row", { hasText: "Tecnologia antica" });
    await customRow.waitFor();
    check((await customRow.innerText()).includes("+5"), "custom skill base not +5");
    await setMode("play");
    await page.locator('.shp-derived [data-shp-skill="stealth"] [data-shp="fav"]').click();
    await page.waitForTimeout(200);
    await page
      .locator(".shp-derived .shp-row", { hasText: "Tecnologia antica" })
      .locator('[data-shp="fav"]')
      .click();
    await page.waitForTimeout(200);
    const pinned = await page.locator(".shp-derived .shp-pinned .shp-row-name").allInnerTexts();
    check(
      pinned.length === 2 && /Furtività/.test(pinned[0]) && /Tecnologia antica/.test(pinned[1]),
      "favourite skills not on top: " + JSON.stringify(pinned),
    );
    await page.locator(".shp-derived .shp-pinned").scrollIntoViewIfNeeded();
    await shot("05-skills-pinned-it");
    ok(
      "(10) «Tecnologia antica» (INT, competente) +5 in Additional skills; starred Furtività and Tecnologia antica move to the top in favourite order (DDB-028, I-161)",
    );

    // G. (6) Favourites strip: star an attack and the potion; use from the strip; reorder.
    await page
      .locator('.shp-actions [data-shp-action="attack:fire-bolt"] [data-shp="fav"]')
      .click();
    await page.waitForTimeout(200);
    await page.locator('.shp-actions [data-shp-action="item:potion"] [data-shp="fav"]').click();
    await page.waitForTimeout(200);
    const chips = await bar().locator(".shp-fav-use").allInnerTexts();
    check(chips.length === 4, "strip does not list 4 favourites: " + JSON.stringify(chips));
    // Use: Furtività from the strip rolls at once with digital dice (PG-39, dnd5e
    // Favourites; right-click or a long press opens the full roll window instead).
    await bar().locator('.shp-fav-use[data-kind="skill"][data-id="stealth"]').click();
    await page.waitForTimeout(250);
    let recent = await page.locator(".shp-recent li").first().innerText();
    check(/Furtività/.test(recent) && /dadi digitali/.test(recent), "roll not listed: " + recent);
    // Undo withdraws the result; the same digital roll reuses the faces once (I-229).
    const firstRoll = (await saved()).ext["sheet-plus-rolls"].rolls.at(-1);
    await bar().locator('[data-shp="undo"]').click();
    await page.waitForTimeout(250);
    check(
      (await page.locator(".shp-recent li.is-withdrawn").count()) >= 1,
      "undone roll not shown withdrawn",
    );
    await bar().locator('.shp-fav-use[data-kind="skill"][data-id="stealth"]').click();
    await page.waitForTimeout(250);
    const reused = (await saved()).ext["sheet-plus-rolls"].rolls.at(-1);
    check(
      reused.status === "reused" &&
        JSON.stringify(reused.values) === JSON.stringify(firstRoll.values),
      "identical retry did not reuse faces",
    );
    recent = await page.locator(".shp-recent li").first().innerText();
    check(/facce riusate/.test(recent), "reuse not explained");
    // Potion from the strip → the sheet's own Drink flow (preview first).
    await bar().locator('.shp-fav-use[data-kind="item"][data-id="potion"]').click();
    check(/Bevi · Pozione di guarigione/.test(await dialogText()), "potion flow not opened");
    await closeDialog();
    // Reorder in Edit mode.
    await setMode("edit");
    await bar().locator('[data-shp="fav-move"][data-kind="item"][data-id="potion"]').click();
    await page.waitForTimeout(200);
    const order = (await sheetData()).favorites.map((f) => f.kind + ":" + f.id);
    check(order.indexOf("item:potion") === 2, "potion not moved earlier: " + order.join(","));
    await setMode("play");
    await bar().scrollIntoViewIfNeeded();
    await shot("06-favourites-strip-it");
    ok(
      "(6) Stars on Furtività, Tecnologia antica, Dardo di fuoco and the potion fill the strip; Furtività rolls at once from the strip (PG-39), Undo withdraws it and the identical retry reuses the faces once; the potion opens the sheet's Drink preview; ‹ reorders in Edit (FVT-009, I-159)",
    );

    // H. (5) Action economy filters and 2024 generic actions with description.
    await page.locator('.shp-actions [data-shp="filter"][data-filter="bonus"]').click();
    await page.waitForTimeout(200);
    const bonusRows = await page.locator(".shp-actions .shp-action").count();
    const bonusText = await page.locator(".shp-actions").innerText();
    check(
      bonusRows === 1 &&
        /Pozione di guarigione/.test(bonusText) &&
        !/Dardo di fuoco/.test(bonusText),
      "Bonus filter wrong: " + bonusRows,
    );
    await page.locator(".shp-actions").scrollIntoViewIfNeeded();
    await shot("07-actions-bonus-filter-it");
    await page.locator('.shp-actions [data-shp="filter"][data-filter="all"]').click();
    await page.waitForTimeout(200);
    // D&D Beyond lists the generic 2024 actions in one line of rule links (P2 PG-20): the
    // description is each link's tooltip and its rule window.
    const generic = page.locator(".shp-actions .shp-generic-open");
    check((await generic.count()) === 13, "generic actions + opportunity attack not 13");
    const hide = page.locator('.shp-actions .shp-generic-open[data-shp-action="generic:hide"]');
    check(
      /Prova di Destrezza \(Furtività\)/.test(await hide.getAttribute("title")),
      "Hide description missing",
    );
    await hide.click();
    check(/EN 183 \/ IT 210/.test(await dialogText()), "Hide detail without SRD pages");
    await closeDialog();
    ok(
      "(5) «Azione bonus» leaves only the potion; «Tutte» lists the 12 generic 2024 actions plus the Opportunity Attack with descriptions; Nascondersi opens its rule with SRD EN 183 / IT 210 (DDB-039)",
    );

    // I. (7) Bless: +1d4 on saves and the attack detail, rolled physically, then off.
    await bar().locator('[data-shp="effect"][data-effect="bless"]').click();
    await page.waitForTimeout(200);
    check(
      (await bar().locator('[data-effect="bless"]').getAttribute("aria-checked")) === "true",
      "Bless not on",
    );
    check(
      (await page.locator(".shp-derived [data-shp-save] .shp-rider").count()) === 6,
      "saves without +1d4",
    );
    await page
      .locator('.shp-actions [data-shp-action="attack:fire-bolt"] [data-shp="action-detail"]')
      .click();
    const attackDetail = await dialogText();
    check(
      /Tiro per colpire \+5 \+1d4 Benedizione/.test(attackDetail),
      "attack detail: " + attackDetail,
    );
    await dialog().locator('[data-shp-dialog="roll"]').click();
    await dialog().locator('input[name="mode"][value="physical"]').check();
    await dialog().locator('[name="face0"]').fill("15");
    await dialog().locator('[name="face2"]').fill("3");
    await shot("08-bless-attack-roll-it");
    await submit();
    let roll = (await saved()).ext["sheet-plus-rolls"].rolls.at(-1);
    check(
      roll.kind === "attack" && roll.total === 23 && roll.mode === "physical",
      "physical attack with Bless: " + JSON.stringify(roll).slice(0, 200),
    );
    // F10: the right-click opens the roll window (a plain click rolls at once).
    await page
      .locator('.shp-derived [data-shp="roll"][data-kind="save"][data-subject="dex"]')
      .click({ button: "right" });
    check(/d20 \+3 \+1d4 Benedizione/.test(await dialogText()), "save roll without Bless");
    await dialog().locator('input[name="mode"][value="physical"]').check();
    await dialog().locator('[name="face0"]').fill("12");
    await dialog().locator('[name="face2"]').fill("3");
    await submit();
    roll = (await saved()).ext["sheet-plus-rolls"].rolls.at(-1);
    check(roll.total === 18, "save total not 12 + 3 (Dex +2, cloak +1) + 3");
    await page.locator(".shp-derived").scrollIntoViewIfNeeded();
    await shot("08b-bless-saves-it");
    await bar().locator('[data-shp="effect"][data-effect="bless"]').click();
    await page.waitForTimeout(200);
    check((await page.locator(".shp-derived .shp-rider").count()) === 0, "Bless still shown");
    ok(
      "(7) Benedizione on: +1d4 on all six saves and in «Tiro per colpire +5 +1d4 Benedizione»; physical attack 15 + 5 + d4 3 = 23 and DEX save 12 + 3 (cloak) + 3 = 18 recorded; turned off, no rider left (VTL-013, SRD EN 113 / IT 128)",
    );

    // J. (4) Fly 9 m, used by movement at the Table (then 12 m to prove which speed moves).
    await page.locator('.shp-derived [data-shp="speeds"]').click();
    await dialog().locator('[name="fly"]').fill("9");
    await dialog().locator('[name="display"]').selectOption("fly");
    await submit();
    check(/Volare\s*9 m/i.test(await bar().locator('[data-shp="speeds"]').innerText()), "fly pill");
    await page.locator('[data-character-action="table"]').first().click();
    const tablePanel = page.locator("[data-shp-table]");
    await tablePanel.waitFor();
    await gotIt();
    await tablePanel.locator('[data-shp="move-mode"][data-mode="fly"]').click();
    await page.waitForTimeout(300);
    check((await saved()).actors.livia.movementMode === "fly", "movement mode not fly");
    check(/In uso: Volare · movimento 9 m/.test(await tablePanel.innerText()), "fly not in use");
    await page.goto(base + "#characters?id=livia&tab=actions");
    await bar().waitFor();
    await page.locator('.shp-derived [data-shp="speeds"]').click();
    await dialog().locator('[name="fly"]').fill("12");
    await submit();
    await page.locator('[data-character-action="table"]').first().click();
    await tablePanel.waitFor();
    // Visual pass 2 (30/09/2026): the Table's movement is on the hotbar's resource row (BG3),
    // no longer repeated in the Creature tab (as preferences-journey reads it).
    const movement = async () =>
      (await page.locator(".table-hotbar .resources .movement").innerText())
        .replace(/^\D+/, "")
        .trim();
    check((await movement()) === "12 m", "Table movement not the fly speed");
    check(/In uso: Volare · movimento 12 m/.test(await tablePanel.innerText()), "panel not 12");
    await shot("09-table-fly-it");
    await tablePanel.locator('[data-shp="move-mode"][data-mode="walk"]').click();
    await page.waitForTimeout(300);
    check((await movement()) === "9 m", "walk back");
    ok(
      "(4) Fly 9 m added (shown in the header as chosen, DDB-030); at the Table «Volare» sets the speed in use; raised to 12 m the Table's own movement reads 12 m, back to walking 9 m (SRD EN 188 / IT 218)",
    );

    // K. (8) XP: correct to 2 400 with a reason, +300 proposes level 4; milestones (DM).
    await page.goto(base + "#characters?id=livia&tab=actions");
    await bar().waitFor();
    await bar().locator('[data-shp="xp"]').click();
    await dialog().locator("summary").click();
    await dialog().locator('[name="total"]').fill("2400");
    await dialog().locator('[data-shp-dialog="set-xp"]').click();
    check(
      /motivo/i.test(await dialog().locator(".dialog-error").innerText()),
      "correction without reason accepted",
    );
    await dialog().locator('[name="reason"]').fill("Ripresa dalla scheda cartacea");
    await dialog().locator('[data-shp-dialog="set-xp"]').click();
    await page.waitForTimeout(250);
    check((await saved()).actors.livia.xp === 2400, "XP not corrected");
    await dialog().locator('[name="amount"]').fill("300");
    await dialog().locator('[name="amount"]').press("Enter");
    await page.waitForTimeout(250);
    check((await saved()).actors.livia.xp === 2700, "+300 not added with Enter");
    check(/livello 4 è disponibile/.test(await dialogText()), "level 4 not proposed in dialog");
    await shot("10-xp-level-proposed-it");
    await closeDialog();
    check(
      /Avanza al livello 4/.test(
        await bar()
          .locator(".shp-notice")
          .allInnerTexts()
          .then((t) => t.join(" ")),
      ),
      "bar does not propose level 4",
    );
    // Milestones: the player switches; the DM records one and proposes the level.
    await bar().locator('[data-shp="xp"]').click();
    await dialog().locator('[data-shp-dialog="adv-mode"][data-mode="milestone"]').click();
    await page.waitForTimeout(200);
    check(/I traguardi li registra il DM/.test(await dialogText()), "player can record milestones");
    await closeDialog();
    await setRole("dm");
    await page.goto(base + "#characters?id=livia&tab=actions");
    await bar().waitFor();
    await bar().locator('[data-shp="xp"]').click();
    await dialog().locator('[name="milestone"]').fill("Riaccesa la lanterna della torre");
    await dialog().locator('[data-shp-dialog="milestone"]').click();
    await page.waitForTimeout(250);
    check(/livello 4 proposto/.test(await dialogText()), "milestone not recorded");
    await closeDialog();
    await setRole("player");
    await page.goto(base + "#characters?id=livia&tab=actions");
    await bar().waitFor();
    check(
      /Il DM propone il livello 4/.test((await bar().innerText()).replace(/\s+/g, " ")),
      "player does not see the DM's proposal",
    );
    await bar().scrollIntoViewIfNeeded();
    await shot("10b-milestone-proposal-it");
    ok(
      "(8) XP corrected to 2 400 only with a reason; +300 with Enter reaches 2 700 and proposes level 4 in the dialog and the bar (SRD EN 23 / IT 25, DDB-024); milestone mode: the DM records «Riaccesa la lanterna della torre» with level 4 proposed and the player sees the proposal (I-123)",
    );

    // L. (11) Notes with Allies/Enemies sections; an «Only me» note hidden from the DM.
    // R4 refresh: the section notes are the first page of «Note» (P2 PG-43, D&D Beyond).
    await openTab("notes");
    const notes = page.locator(".shp-notes");
    await notes.waitFor();
    const addNote = async (section, title, text, audience = "sheet") => {
      await notes.locator(`[data-shp-note-section="${section}"] [data-shp="note-add"]`).click();
      await dialog().locator('[name="title"]').fill(title);
      await dialog().locator('[name="text"]').fill(text);
      await dialog().locator(`input[name="audience"][value="${audience}"]`).check();
      await submit();
    };
    await addNote("allies", "Syl l’erborista", "Ci ospita a Bruma, conosce le erbe della torre.");
    await addNote("enemies", "Chi ha spento la lanterna", "Un’ombra incappucciata sul molo.");
    await addNote("other", "Sospetto su Doran", "Non dirlo al tavolo.", "me");
    await notes.locator('[data-shp="notes-filter"][data-filter="allies"]').click();
    await page.waitForTimeout(150);
    const alliesOnly = await page.locator(".shp-notes").innerText();
    check(/Syl l’erborista/.test(alliesOnly) && !/Chi ha spento/.test(alliesOnly), "Allies filter");
    await page.locator(".shp-notes").scrollIntoViewIfNeeded();
    await shot("11-notes-allies-it");
    await page.locator('.shp-notes [data-shp="notes-filter"][data-filter="all"]').click();
    await setRole("dm");
    await page.goto(base + "#characters?id=livia&tab=notes");
    await page.locator(".shp-notes").waitFor();
    const dmNotes = await page.locator(".shp-notes").innerText();
    check(
      /Syl l’erborista/.test(dmNotes) && !/Sospetto su Doran/.test(dmNotes),
      "DM reads a private note",
    );
    await setRole("player");
    ok(
      "(11) Notes «Syl l’erborista» (Alleati) and «Chi ha spento la lanterna» (Nemici) with section chips; «Sospetto su Doran» (Solo io) is invisible to the DM (DDB-056)",
    );

    // M. (12) Doran (DM): Long Rest → Weapon Mastery reselection (one change).
    await setRole("dm");
    await page.goto(base + "#characters?id=doran&tab=features");
    await page.locator("[data-shp-reselect]").waitFor();
    await page.locator("[data-character-action=rest]").click();
    await page.locator("[data-rest-kind]").selectOption("long");
    await page.locator("[data-rest-start-activity=doran]").selectOption("sleep");
    await page.locator("[data-rest-preview-start]").click();
    await page.locator("[data-rest-start]").click();
    await page.locator("[data-rest-time]").click();
    await page.locator("[data-rest-time-value]").fill("8");
    await page.locator("[data-rest-time-unit]").selectOption("3600");
    await page.locator("[data-rest-preview-time]").click();
    await page.locator("[data-rest-apply]").click();
    await closeDialog();
    await page.locator("[data-character-action=rest]").click();
    await page.locator("[data-rest-complete=doran]").click();
    await page.locator("[data-rest-apply]").click();
    await closeDialog();
    const notice = bar().locator(".shp-notice", { hasText: "Padronanza delle armi" });
    await notice.waitFor();
    await notice.locator('[data-shp="reselect"]').click();
    await dialog().locator('input[name="chosen"][value="longsword"]').uncheck();
    await dialog().locator('input[name="chosen"][value="handaxe"]').uncheck();
    await dialog().locator('input[name="chosen"][value="greatsword"]').check();
    await dialog().locator('input[name="chosen"][value="greataxe"]').check();
    await submit();
    check(
      /una sola scelta/.test(await dialog().locator(".dialog-error").innerText()),
      "two changes accepted",
    );
    await dialog().locator('input[name="chosen"][value="greataxe"]').uncheck();
    await dialog().locator('input[name="chosen"][value="handaxe"]').check();
    await submit();
    const mastery = (await sheetData("doran")).reselect[0];
    check(
      JSON.stringify(mastery.chosen.sort()) ===
        JSON.stringify(["greatsword", "handaxe", "javelin"]),
      "reselection not saved: " + mastery.chosen,
    );
    check(
      (await bar().locator(".shp-notice", { hasText: "Padronanza" }).count()) === 0,
      "still pending",
    );
    await page.locator("[data-shp-reselect]").scrollIntoViewIfNeeded();
    await shot("12-reselect-after-long-rest-it");
    await setRole("player");
    ok(
      "(12) DM: Doran's 8-hour Long Rest (Riposa → sonno → 8 h → completa) raises «Padronanza delle armi» in the bar; two changes are refused, one change (Spada lunga → Spadone) is saved and the prompt closes (VTL-017, SRD EN 48 / IT 54)",
    );

    // N. Reload persistence of every area record.
    await page.goto(base + "#characters?id=livia&tab=actions");
    await page.reload();
    await bar().waitFor();
    const after = await saved();
    const livia = after.ext["sheet-plus"].actors.livia;
    check(after.actors.livia.ac === 13 && livia.mods.ac.length === 1, "AC lost on reload");
    check(livia.defenses.length === 3 && livia.customSkills.length === 1, "defenses/skill lost");
    check(livia.favorites.length === 4 && livia.notes.length === 3, "favourites/notes lost");
    check(after.actors.livia.speeds.fly === 12 && after.actors.livia.xp === 2700, "speed/xp lost");
    check((await pill("ac").innerText()).includes("14"), "AC pill after reload (13 + cloak)");
    check(await noOverflow(), "desktop overflow");
    const small = await smallTargets(
      ".shp-bar button, .shp-derived button, .shp-actions button, .shp-notes button",
    );
    check(!small.length, "desktop targets under 40px: " + JSON.stringify(small.slice(0, 6)));
    await page.locator(".shp-derived").scrollIntoViewIfNeeded();
    await shot("13-derived-after-reload-it");
    ok(
      "Reload keeps AC chain, defenses, custom skill, favourites, notes, fly speed and XP; no overflow; every control ≥ 40px at 1440",
    );

    // -----------------------------------------------------------------------------------
    // R. Review fixes (B37-rf, 24/09): keyboard focus kept, view-only sheet, Initiative
    // reaching the combat tracker, Bless named in the Table's attack detail, speeds in a form.
    const active = (p = page) =>
      p.evaluate(() => {
        const el = document.activeElement;
        return {
          shp: el?.dataset?.shp ?? null,
          filter: el?.dataset?.filter ?? null,
          effect: el?.dataset?.effect ?? null,
          id: el?.dataset?.id ?? null,
          pressed: el?.getAttribute("aria-pressed") ?? el?.getAttribute("aria-checked"),
        };
      });
    await openTab("actions");
    await page.locator('.shp-actions [data-shp="filter"][data-filter="bonus"]').focus();
    await page.keyboard.press("Enter");
    let focus = await active();
    check(
      focus.shp === "filter" && focus.filter === "bonus" && focus.pressed === "true",
      "focus lost after the Bonus chip: " + JSON.stringify(focus),
    );
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Enter");
    focus = await active();
    check(focus.filter === "action" && focus.pressed === "true", "chip by keyboard");
    await page.locator('.shp-actions [data-shp="filter"][data-filter="all"]').focus();
    await page.keyboard.press("Enter");
    await bar().locator('[data-shp="effect"][data-effect="bless"]').focus();
    await page.keyboard.press("Space");
    focus = await active();
    check(
      focus.effect === "bless" && focus.pressed === "true",
      "focus lost after Bless: " + JSON.stringify(focus),
    );
    await page.keyboard.press("Space");
    check((await active()).pressed === "false", "Bless off by keyboard");
    const acroStar = '.shp-derived [data-shp="fav"][data-kind="skill"][data-id="acrobatics"]';
    await page.locator(acroStar).focus();
    await page.keyboard.press("Enter");
    focus = await active();
    check(
      focus.id === "acrobatics" && focus.pressed === "true",
      "focus lost after a star: " + JSON.stringify(focus),
    );
    await page.keyboard.press("Enter");
    check((await active()).pressed === "false", "star off by keyboard");
    ok(
      "R1. Keyboard: a filter chip, the Bless switch and a skill star keep the focus after the sheet re-renders (Enter/Space, Shift+Tab continues from there)",
    );

    // R2. A sheet the player only views (Doran) has no favourite stars that would refuse.
    await page.goto(base + "#characters?id=doran&tab=actions");
    await bar().waitFor();
    check(/Consultazione/.test(await bar().innerText()), "Doran not view-only");
    check((await page.locator('.shp-derived [data-shp="fav"]').count()) === 0, "stars on Doran");
    check(/Nessun preferito/.test(await bar().innerText()), "empty favourites hint on Doran");
    ok("R2. View-only Doran: no favourite stars, «Nessun preferito» instead of the invitation");

    // R3. Initiative +2 «Allerta» on the sheet is the bonus of the combat tracker's roll.
    await page.goto(base + "#characters?id=livia&tab=actions");
    await bar().waitFor();
    await setMode("edit");
    await pill("initiative").click();
    await dialog().locator('[name="op"]').selectOption("add");
    await dialog().locator('[name="value"]').fill("2");
    await dialog().locator('[name="note"]').fill("Allerta: competenza all'Iniziativa");
    await submit();
    await closeDialog();
    await setMode("play");
    check(/\+4/.test(await pill("initiative").innerText()), "Initiative pill not +4");
    const tracked = await page.evaluate(async (k) => {
      const tracker = await import("/combat-tracker-domain.mjs");
      const state = JSON.parse(localStorage.getItem(k));
      return [state.actors.livia.initiativeBonus, tracker.initiativeBonus(state, "livia")];
    }, key);
    check(tracked[0] === 4 && tracked[1] === 4, "tracker bonus " + tracked);
    ok(
      "R3. Initiative «+2 Allerta» with its reason → pill +4; saved as actor.initiativeBonus 4, the value the combat tracker's «Tira d20 (+4)» reads",
    );

    // R4. Bless on: the Table's Fire Bolt detail against a goblin names +1d4.
    await bar().locator('[data-shp="effect"][data-effect="bless"]').click();
    await page.waitForTimeout(200);
    await page.locator('[data-character-action="table"]').first().click();
    await page.locator("#battle-map").waitFor();
    await gotIt();
    await page.locator('[data-combat-action="fire-bolt"]').click();
    // Pointing at the target previews it; a click would execute the attack.
    await page.locator('#battle-map g[data-actor="goblin-2"]').hover();
    await page.waitForTimeout(300);
    const detail = await page.locator("#combat-detail").innerText();
    // R1 PG-47 (fix round 2): the Table's engine adds the rider's die to the attack roll, so
    // the preview reads «Tiro per colpire: d20 + 1d4 (Benedizione)».
    check(
      /1d4 \(Benedizione\)|Benedizione \+1d4/.test(detail),
      "Bless missing in the Table attack detail: " + detail.slice(0, 300),
    );
    await page.locator("#combat-detail").scrollIntoViewIfNeeded();
    await shot("30-table-attack-bless-it");
    await page.keyboard.press("Escape");
    await page.goto(base + "#characters?id=livia&tab=actions");
    await bar().waitFor();
    await bar().locator('[data-shp="effect"][data-effect="bless"]').click();
    await page.waitForTimeout(200);
    ok(
      "R4. Bless on → at the Table Fire Bolt on a goblin previews «Tiro per colpire: d20 + 1d4 (Benedizione)» (B46 provider seam); Bless off again",
    );

    // R5. Mira: swim 9 m, Wild Shape (wolf), then «Salva velocità» keeps the swim speed.
    await page.goto(base + "#characters?id=mira&tab=actions");
    await bar().waitFor();
    await gotIt();
    await page.locator('.shp-derived [data-shp="speeds"]').click();
    await dialog().locator('[name="swim"]').fill("9");
    await submit();
    await openTab("extras");
    // The forms entry reads «Forma Selvatica» on a druid (PG-77, BG3 class action).
    await page
      .getByRole("button", { name: /^(Forma Selvatica|Forme)$/ })
      .first()
      .click();
    await dialog().locator("[data-forms-profile]").filter({ hasText: "Lupo" }).click();
    await dialog().locator("[data-forms-preview]").click();
    await dialog().locator("[data-forms-apply]").click();
    await page.waitForTimeout(300);
    check((await saved()).actors.mira.activeForm?.profileId === "srd2024:wolf", "no wolf");
    await closeDialog();
    await openTab("actions");
    await page.locator('.shp-derived [data-shp="speeds"]').click();
    check(/Forma attiva/.test(await dialogText()), "form notice missing");
    check(await dialog().locator('[name="swim"]').isDisabled(), "swim field not locked");
    await shot("31-form-speeds-dialog-it");
    await submit();
    check((await saved()).actors.mira.speeds?.swim === 9, "swim speed lost in the form");
    ok(
      "R5. Mira swim 9 m → Wild Shape (Lupo) → «Gestisci velocità» says the form's speeds apply, fields locked; «Salva velocità» keeps swim 9 m on the sheet",
    );
    // R6. DM: a Skeleton from the compendium keeps its SRD immunity and vulnerability when
    // the sheet adds a sourced fire resistance; removing it leaves the stat block in charge.
    await setRole("dm");
    const before = Object.keys((await saved()).actors);
    await page.goto(
      base + "#library?tab=compendium&revision=" + encodeURIComponent("srd2024:creature:skeleton"),
    );
    await page.locator('[data-cmd="scene"]').click();
    await dialog().locator("[name=name]").fill("Scheletro");
    await dialog().locator('[name=where][value="free"]').check();
    await submit();
    await page.waitForFunction(
      ([k, n]) => Object.keys(JSON.parse(localStorage.getItem(k)).actors).length > n,
      [key, before.length],
    );
    const skel = Object.keys((await saved()).actors).find((id) => !before.includes(id));
    await page.goto(base + "#characters?id=" + skel + "&tab=actions");
    await bar().waitFor();
    await gotIt();
    const skelPill = await bar().locator('[data-shp="defenses"]').innerText();
    check(/Veleno/.test(skelPill), "stat block immunity not on the sheet: " + skelPill);
    await bar().locator('[data-shp="defenses"]').click();
    check(/blocco SRD Scheletro/.test(await dialogText()), "block origin not named");
    await dialog().locator('[name="kind"]').selectOption("resistance");
    await dialog().locator('[name="target"]').selectOption("fire");
    await dialog().locator('[name="sourceKind"]').selectOption("spell");
    await dialog().locator('[name="sourceName"]').fill("Protezione dall’energia");
    await submit();
    let skelDef = (await saved()).actors[skel].damageDefenses;
    check(
      JSON.stringify(skelDef) ===
        JSON.stringify({
          resistances: ["fire"],
          immunities: ["poison"],
          vulnerabilities: ["bludgeoning"],
        }),
      "block defenses lost: " + JSON.stringify(skelDef),
    );
    await shot("32-skeleton-defenses-it");
    await dialog().locator('[data-shp-dialog="remove-defense"]').first().click();
    await page.waitForTimeout(200);
    skelDef = (await saved()).actors[skel].damageDefenses;
    check(skelDef === undefined, "trace left on the skeleton: " + JSON.stringify(skelDef));
    await closeDialog();
    await setRole("player");
    ok(
      "R6. DM: Skeleton from the compendium lists «Veleno» (blocco SRD Scheletro); + fire resistance from «Protezione dall’energia» → damageDefenses fire / poison / bludgeoning; removal leaves no record, the stat block applies again",
    );
    await page.goto(base + "#characters?id=livia&tab=actions");
    await bar().waitFor();

    // -----------------------------------------------------------------------------------
    // P. EN phone 390x844, touch.
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
    phoneContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await phoneContext.addInitScript(
      ([k, value]) => {
        if (!sessionStorage.getItem("b37-seeded")) {
          localStorage.setItem(k, value);
          sessionStorage.setItem("b37-seeded", "1");
        }
      },
      [key, snapshot],
    );
    const phone = await phoneContext.newPage();
    phone.on("pageerror", (error) => errors.push("phone: " + error.message));
    await phone.goto(base + "#characters");
    await styled(phone);
    await gotIt(phone);
    await phone.locator('[data-service="preferences"]').first().tap();
    await phone.locator('#dialog [name="lang"]').selectOption("en");
    await phone.locator("#dialog button[type=submit]").tap();
    await phone.waitForTimeout(300);
    await phone.locator('[data-character-action="open"][data-actor="livia"]').tap();
    await bar(phone).waitFor();
    await gotIt(phone);
    // Visual pass 2: on a phone, Play / Edit, effects and saves are on D&D Beyond's
    // «Abilities» page of the sheet.
    await phone.locator('[data-character-page-tab="abilities"]').tap();
    await phone.locator('[data-character-page-tab="abilities"][aria-current="page"]').waitFor();
    check(/Play/.test(await bar(phone).innerText()), "EN bar missing");
    await bar(phone).scrollIntoViewIfNeeded();
    await shot("20-phone-bar-en", phone);
    await pill("ac", phone).tap();
    check(/Armor class · Livia/.test(await dialogText(phone)), "EN AC dialog");
    check(/Magic|Bonus magico/.test(await dialogText(phone)), "chain note missing on phone");
    await closeDialog(phone);
    await bar(phone).locator('[data-shp="effect"][data-effect="bless"]').tap();
    await phone.waitForTimeout(200);
    await phone
      .locator('.shp-derived [data-shp="roll"][data-kind="save"][data-subject="dex"]')
      .dispatchEvent("contextmenu");
    check(/Dexterity saving throw/.test(await dialogText(phone)), "EN save roll dialog");
    check(/\+1d4 Bless/.test(await dialogText(phone)), "EN Bless rider");
    await submit(phone);
    const phoneRoll = (await saved(phone)).ext["sheet-plus-rolls"].rolls.at(-1);
    check(phoneRoll.kind === "save" && phoneRoll.values.length === 2, "phone roll not recorded");
    check(await noOverflow(phone), "phone overflow on the sheet");
    const smallPhone = await smallTargets(
      ".shp-bar button, .shp-derived button, .shp-actions button",
      phone,
    );
    check(
      !smallPhone.length,
      "phone targets under 40px: " + JSON.stringify(smallPhone.slice(0, 6)),
    );
    await phone.locator(".shp-derived").scrollIntoViewIfNeeded();
    await shot("21-phone-saves-en", phone);
    // The Table on the phone: the creature panel offers the speed switch.
    await phone.locator('[data-character-action="table"]').first().tap();
    await phone.locator("[data-shp-table]").waitFor();
    await gotIt(phone);
    await phone.locator('[data-shp-table] [data-shp="move-mode"][data-mode="fly"]').tap();
    await phone.waitForTimeout(300);
    const phoneFly = await phone.locator("[data-shp-table]").innerText();
    // EN shows feet by default (B22 units): 12 m = 40 ft.
    check(/In use: Fly · movement (12 m|40 ft)/.test(phoneFly), "EN phone fly: " + phoneFly);
    check(await noOverflow(phone), "phone overflow at the Table");
    await phone.locator("[data-shp-table]").scrollIntoViewIfNeeded();
    await shot("22-phone-table-fly-en", phone);
    ok(
      "EN phone 390 (touch): bar and AC chain in English, Bless +1d4 on the DEX save rolled by tap, Table creature panel switches to Fly (12 m); no horizontal overflow, every control ≥ 40px",
    );
  } catch (error) {
    await page.screenshot({ path: shots + "zz-failure-desktop.png" }).catch(() => {});
    return JSON.stringify({ result: "FAIL", error: error.message, passed, errors }, null, 2);
  } finally {
    if (phoneContext) await phoneContext.close().catch(() => {});
    await context.close().catch(() => {});
  }
  return JSON.stringify(
    { result: errors.length ? "FAIL (page errors)" : "PASS", passed, errors },
    null,
    2,
  );
};
