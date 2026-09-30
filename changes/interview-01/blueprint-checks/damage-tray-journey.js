async (rootPage) => {
  // B62: a Table panel is a sub-tab of its sidebar tab (Foundry's document tabs): open that
  // tab (its own, or the one its hidden handle names), then the sub-tab. No-op when open.
  const openTablePanel = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const now = () => page.locator("#table-sidebar-panel").getAttribute("data-table-panel");
    if ((await now()) === id) return;
    if (!(await page.locator(`.table-subtabs [data-table-subtab="${id}"]`).count())) {
      const own = await page.locator(`.table-tabs [data-table-tab="${id}"]`).count();
      const section = own
        ? id
        : await page
            .locator(
              `.table-panel-index [data-table-drawer="${id}"], .table-panel-index [data-table="${id}"]`,
            )
            .first()
            .getAttribute("data-table-section-of");
      const tab = page.locator(`.table-tabs [data-table-tab="${section}"]`);
      if ((await tab.getAttribute("aria-selected")) !== "true") await press(tab);
      await page.waitForFunction(
        (s) => document.querySelector("#table-sidebar-panel")?.dataset.tableSection === s,
        section,
      );
    }
    if ((await now()) !== id)
      await press(page.locator(`.table-subtabs [data-table-subtab="${id}"]`));
    await page.waitForFunction(
      (i) => document.querySelector("#table-sidebar-panel")?.dataset.tablePanel === i,
      id,
    );
  };
  // B33 — damage tray, one HP widget, HP log, proposals, Bloodied/Dead, with real clicks,
  // keys and touch. Group 1 (DM + player, IT, 1440): assisted automation in Campaign ›
  // Settings, an SRD Ghost added from the compendium, tokens placed and initiative given in
  // Preparation, combat started with the core command. Acceptance checks (card B33):
  // (1) Burning Hands on the two goblins and the fire-resistant Ghost: tray per target, half
  // on a save, resistance chip, nothing before Apply; (2) an immunity downgraded to
  // resistance with its reason; (3) the same widget on sheet, token menu and tracker: 8
  // damage with 5 temporary HP, healing adds none, maximum with a note; (4) one HP log entry
  // undone alone and reapplied, dependent consequences (later entries, Dead) flagged;
  // (5) Livia proposes "ho preso 6 danni", the DM accepts, then declines another;
  // (6) Bloodied/Dead on tokens, hidden from players by the DM's setting. Reload and Undo.
  // Group 2: EN phone 390 with touch in an isolated context. Review group (B33-rf): the
  // attack card's Undo after the tray, the typed amount kept after a refusal, a fall to 0 HP
  // undone with its conditions, the maximum's modifier list after undo and reapply.
  // Synthetic demo data only; resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B33/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  let step = "setup";
  const at = (name) => (step = name);
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const actor = async (id, p = page) => (await stored(p)).actors[id];
  const role = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
  };
  const settleDice = async (p = page) => {
    const layer = p.locator("[data-dice3d-layer]:not([hidden])");
    await layer.waitFor({ timeout: 800 }).catch(() => {});
    for (let i = 0; i < 8 && (await layer.count()); i++) {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(80);
    }
    await layer.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  };
  const closeDialog = async (p = page) => {
    if (await p.locator("#dialog[open]").count()) await p.keyboard.press("Escape");
    await p
      .locator("#dialog[open]")
      .waitFor({ state: "detached", timeout: 3000 })
      .catch(() => {});
  };
  const dismissTip = async (p = page) => {
    const ok = p.getByRole("button", { name: /^(Ho capito|Got it)$/ });
    if (await ok.count()) await ok.first().click();
  };
  const toScreen = (svgSelector, x, y, p = page) =>
    p.locator(svgSelector).evaluate(
      (svg, { x, y }) => {
        const point = svg.createSVGPoint();
        point.x = x;
        point.y = y;
        const c = point.matrixTransform(svg.getScreenCTM());
        return { x: c.x, y: c.y };
      },
      { x, y },
    );
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const shot = (name, p = page) => p.screenshot({ path: dir + name });
  const clipAround = async (id, name, p = page) => {
    const box = await p.locator(`.map-token[data-actor="${id}"]`).boundingBox();
    const view = p.viewportSize();
    const x = Math.max(0, Math.min(view.width - 260, box.x + box.width / 2 - 130));
    const y = Math.max(0, Math.min(view.height - 260, box.y + box.height / 2 - 130));
    await p.screenshot({ path: dir + name, clip: { x, y, width: 260, height: 260 } });
  };
  const creatureTab = async (p = page, tap = false) => {
    const tab = p.locator('[data-table-tab="creature"]');
    await tab.waitFor();
    if ((await tab.getAttribute("aria-selected")) !== "true") await (tap ? tab.tap() : tab.click());
    await p.locator(".table-inspector").waitFor();
  };
  const selectToken = async (id, p = page) => {
    await p.locator(`.map-token[data-actor="${id}"]`).click();
    await creatureTab(p);
  };
  const widget = (id, p = page) => p.locator(`.table-inspector [data-dt-hp="${id}"]`);
  const openDetails = async (scope, id) => {
    const details = scope.locator(`[data-dt-details="${id}"]`);
    if (!(await details.evaluate((d) => d.open))) await details.locator("summary").click();
    return details;
  };
  const resolveRequest = async (name, face, p = page) => {
    await p.locator('.service-nav [data-service="requests"]').click();
    const toRequests = p.locator("#dialog [data-notifications-requests]");
    if (await toRequests.count()) await toRequests.click();
    await p
      .locator(".roll-request")
      .filter({ hasText: name })
      .getByRole("button", { name: "Risolvi tiro", exact: true })
      .click();
    await p.locator("[name=diceMode]").selectOption("physical");
    for (const [index, value] of [face].flat().entries())
      await p.locator(`[name=face${index}]`).fill(String(value));
    await p.getByRole("button", { name: "Registra tiro", exact: true }).click();
    await settleDice(p);
    await closeDialog(p);
  };
  // One SRD creature through the compendium's "Add to a scene…" (B16 flow), free spot.
  const addFromCompendium = async (creature, name) => {
    const before = Object.keys((await stored()).actors).length;
    await page.goto(
      base +
        "#library?tab=compendium&revision=" +
        encodeURIComponent("srd2024:creature:" + creature),
    );
    await page.locator('[data-cmd="scene"]').click();
    const dialog = page.locator("#dialog");
    await dialog.locator("[name=name]").fill(name);
    await dialog.locator("[name=team]").selectOption("watch");
    await dialog.locator("[name=hidden]").setChecked(false);
    await dialog.locator('[name=where][value="free"]').check();
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForFunction(
      ({ k, n }) => Object.keys(JSON.parse(localStorage.getItem(k)).actors).length > n,
      { k: key, n: before },
    );
    const state = await stored();
    return Object.values(state.actors).find((a) => a.name === name).id;
  };
  try {
    // ------------------------------------------------------------ group 1: setup (DM)
    await page.goto(base + "#table");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await role("dm");
    at("assisted");
    // Campaign › Settings › Rules: damage waits for "Apply" (Standard 2024, census C1). The
    // sample campaign plays "Automatic"; the tray is the assisted surface.
    await page.goto(base + "#campaign?tab=settings&id=rules");
    await page.locator('[data-cs-rule-input="automation"][value="assisted"]').check();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext["campaign-settings"].campaigns.lanterns.policy
          .automation === "assisted",
      key,
    );
    at("compendium");
    const ghost = await addFromCompendium("ghost", "Fantasma");
    at("preparation");
    await page.goto(base + "#preparation?id=old-watch");
    const map = page.locator("[data-prep-interactive]");
    await map.waitFor();
    for (const [id, x, y] of [
      ["livia", 250, 380],
      ["goblin-1", 320, 380],
      ["goblin-2", 350, 410],
      [ghost, 340, 345],
      ["doran", 250, 520],
    ]) {
      const token = map.locator(`[data-prep-token="token-${id}"] circle`).first();
      await token.scrollIntoViewIfNeeded();
      const box = await token.boundingBox();
      const dest = await toScreen("[data-prep-interactive]", x, y);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(dest.x, dest.y, { steps: 8 });
      await page.mouse.up();
    }
    await page.locator("[data-prep-save]").click();
    // Saved only when the draft changed (the include and d20 fields left Preparation).
    if (
      await page
        .getByRole("button", { name: "Aggiorna scena attiva", exact: true })
        .isEnabled({ timeout: 1000 })
        .catch(() => false)
    )
      await page.getByRole("button", { name: "Aggiorna scena attiva", exact: true }).click();
    // Refreshed by the hand-off writer (29/09/2026): R5 PR-32 replaced Preparation's «Incontro
    // preparato» with the Table's start dialog (Foundry roll call): who fights and each typed
    // d20; the Initiative bonus comes from the sheet.
    await page.getByRole("button", { name: "Avvia incontro salvato…", exact: true }).click();
    await page.locator("[data-ct-start-dialog]").waitFor();
    {
      const naturals = { livia: 18, "goblin-1": 12, [ghost]: 11, doran: 10, "goblin-2": 8 };
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
    await page.getByRole("button", { name: "Inizia combattimento", exact: true }).click();
    await page.locator("#battle-map").waitFor();
    await dismissTip();
    let state = await stored();
    check(state.combat.active && state.combat.order[state.combat.turn] === "livia", "Livia first");
    passed.push(
      "setup: Campaign › Settings › Rules → Assisted; SRD Ghost (Fantasma, 45 HP, fire resistant, poison immune) added from the compendium; Preparation places Livia, the Sentinella, the Esploratore and the Ghost for the cone, initiative saved, combat started (Livia first)",
    );

    // ------------------------------------------------------------ (1) Burning Hands tray
    at("burning-hands");
    await role("player");
    await page.goto(base + "#table");
    await dismissTip();
    await page.locator("[data-combat-mode]").selectOption("physical");
    await page.getByRole("button", { name: "Mani brucianti", exact: true }).click();
    const aim = await toScreen("#battle-map", 420, 380);
    await page.mouse.click(aim.x, aim.y);
    const targets = await page.locator(".combat-targets").innerText();
    check(
      ["Sentinella", "Esploratore", "Fantasma"].every((n) => targets.includes(n)) &&
        !targets.includes("Doran"),
      "Cone targets: " + targets,
    );
    await page.getByRole("button", { name: "Lancia Mani brucianti", exact: true }).click();
    await settleDice();
    await page.getByRole("button", { name: "Risolvi tiro", exact: true }).click();
    for (const [index, face] of [2, 2, 1].entries())
      await page.locator(`[name=face${index}]`).fill(String(face));
    await page.getByRole("button", { name: "Registra tiro", exact: true }).click();
    await settleDice();
    await closeDialog();
    await role("dm");
    for (const [name, face] of [
      ["Sentinella", 3],
      ["Esploratore", 18],
      ["Fantasma", 2],
    ])
      await resolveRequest(name, face);
    state = await stored();
    check(
      [state.actors["goblin-1"].hp, state.actors["goblin-2"].hp, state.actors[ghost].hp].join() ===
        "7,9,45",
      "HP changed before Apply",
    );
    await page.goto(base + "#table");
    await creatureTab();
    const tray = page.locator("[data-dt-tray]");
    await tray.waitFor();
    const card = tray.locator(".dt-card").first();
    const cardText = await card.innerText();
    check(/Mani brucianti/.test(cardText) && /Fuoco/.test(cardText), "Tray card: " + cardText);
    check((await card.locator("[data-dt-row]").count()) === 3, "Three target rows");
    const ghostRow = card.locator(
      `[data-dt-row="attempt:${state.combatAttempts.at(-1).id}:${ghost}"]`,
    );
    check(
      (await ghostRow.locator('[data-dt-chip="resistance"]').getAttribute("aria-pressed")) ===
        "true",
      "Resistance chip on",
    );
    check(/Applica 2/.test(await ghostRow.innerText()), "Ghost row applies 2");
    check(/TS riuscito: metà/.test(cardText), "Half on a successful save");
    check(/Sanguinante/.test(cardText), "Sentinella would be Bloodied");
    await tray.scrollIntoViewIfNeeded();
    await shot("b33-01-tray-burning-hands-it-1440.png");
    // Keyboard: turn the resistance off with Space, the row says 5; Enter turns it back on.
    await ghostRow.locator('[data-dt-chip="resistance"]').focus();
    await page.keyboard.press("Space");
    await page.waitForFunction(
      () =>
        document.querySelector('[data-dt-chip="resistance"]')?.getAttribute("aria-pressed") ===
        "false",
    );
    check(/Applica 5/.test(await ghostRow.innerText()), "Chip off: full damage");
    check(
      (await page.evaluate(() => document.activeElement?.dataset?.dtChip)) === "resistance",
      "Focus stays on the chip",
    );
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () =>
        document.querySelector('[data-dt-chip="resistance"]')?.getAttribute("aria-pressed") ===
        "true",
    );
    state = await stored();
    check(state.actors[ghost].hp === 45, "Toggling changed HP");
    await card.locator("[data-dt-apply-all]").click();
    await page.waitForFunction(
      ({ k, g }) => JSON.parse(localStorage.getItem(k)).actors[g].hp === 43,
      { k: key, g: ghost },
    );
    state = await stored();
    check(
      [state.actors["goblin-1"].hp, state.actors["goblin-2"].hp, state.actors[ghost].hp].join() ===
        "2,7,43",
      "Applied HP: " +
        [state.actors["goblin-1"].hp, state.actors["goblin-2"].hp, state.actors[ghost].hp],
    );
    check(
      (await page.locator('[data-dt-token-state="goblin-1"][data-state="bloodied"]').count()) === 1,
      "Bloodied ring on the Sentinella",
    );
    // Review: the tray empties, focus lands on the Creature tab (not the page), and the
    // attack card still offers B20's Undo after the tray's Apply (same commit label).
    check(
      (await page.evaluate(() => document.activeElement?.dataset?.tableTab)) === "creature",
      "Focus after Apply to all: " +
        (await page.evaluate(() => document.activeElement?.outerHTML?.slice(0, 80))),
    );
    await page.locator('.service-nav [data-service="requests"]').click();
    const toCards = page.locator("#dialog [data-notifications-requests]");
    if (await toCards.count()) await toCards.click();
    await page.locator("#dialog .attempt-result").first().waitFor();
    check(
      (await page.locator("#dialog [data-undo-outcome]").count()) === 1,
      "Attack card Undo after the tray's Apply",
    );
    await closeDialog();
    passed.push(
      "1. Burning Hands (physical 2+2+1 = 5 fire) on the Sentinella (TS 3+2 fail), the Esploratore (TS 18 success) and the Ghost (TS 2 fail): HP 7/9/45 unchanged until Apply; Creature tab › “Da applicare” tray: one card, three rows, “TS riuscito: metà” (2), Ghost chip “Resistenza · Fuoco” → “Applica 2”; Space turns the chip off (Applica 5, focus kept), Enter on again; “Applica a tutti (3)” → 2/7/43, Bloodied ring on the Sentinella; focus on the Creature tab; the attack card in “Tiri e risultati” still offers “Annulla” (review)",
    );

    // ------------------------------------------------------------ (2) downgrade immunity
    at("downgrade");
    await selectToken(ghost);
    const gw = widget(ghost);
    await gw.scrollIntoViewIfNeeded();
    await gw.locator("[data-dt-type]").selectOption("poison");
    await gw.locator('[data-dt-chip="immunity"]').waitFor();
    check(/Immunità · Veleno/.test(await gw.innerText()), "Immunity chip");
    await gw.locator("[data-dt-downgrade]").click();
    const reason = gw.locator("[data-dt-downgrade-reason]");
    await reason.waitFor();
    check(
      (await page.evaluate(() =>
        document.activeElement?.hasAttribute("data-dt-downgrade-reason"),
      )) === true,
      "Focus moves to the reason",
    );
    // No reason: refused, HP unchanged. The preview follows the amount while typing.
    await gw.locator("[data-dt-amount]").fill("10");
    check(
      (await gw.locator("[data-dt-type-preview]").innerText()).includes(
        "10 → immunità declassata 5",
      ),
      "Live preview: " + (await gw.locator("[data-dt-type-preview]").innerText()),
    );
    await gw.locator("[data-dt-damage]").click();
    await gw.locator("[data-dt-status].is-error").waitFor();
    check((await actor(ghost)).hp === 43, "Downgrade without reason applied");
    // Review: the refusal keeps the typed amount to fix the reason, not to type it again.
    check(
      (await widget(ghost).locator("[data-dt-amount]").inputValue()) === "10",
      "Amount kept after the refusal",
    );
    await widget(ghost).locator("[data-dt-downgrade-reason]").fill("Veleno magico del drago");
    await widget(ghost).locator("[data-dt-damage]").click();
    await page.waitForFunction(
      ({ k, g }) => JSON.parse(localStorage.getItem(k)).actors[g].hp === 38,
      { k: key, g: ghost },
    );
    const status = await widget(ghost).locator("[data-dt-status]").innerText();
    check(
      /immunità declassata a resistenza: Veleno magico del drago/.test(status),
      "Status: " + status,
    );
    check(
      (await page.evaluate(() => document.activeElement?.hasAttribute("data-dt-amount"))) === true,
      "Focus returns to the amount (DDB-142)",
    );
    const log = await openDetails(widget(ghost), "log");
    const logText = await log.innerText();
    check(
      /Veleno magico del drago/.test(logText) && /Mani brucianti/.test(logText),
      "Log: " + logText,
    );
    await widget(ghost).scrollIntoViewIfNeeded();
    await shot("b33-02-downgrade-log-it-1440.png");
    passed.push(
      "2. Ghost › Creature tab › Punti ferita: type Veleno → chip “Immunità · Veleno”, “Declassa a resistenza…” moves focus to the required reason; typing 10 previews “10 → immunità declassata 5”; Danno without a reason refused (43 unchanged, the 10 stays in the field); with “Veleno magico del drago” 10 → 5, HP 43 → 38, focus back on the amount; Registro PF shows both entries (Burning Hands with resistance, the downgrade with its reason)",
    );

    // ------------------------------------------------------------ (3) one widget everywhere
    at("sheet");
    await role("player");
    await page.goto(base + "#characters?id=livia&tab=actions");
    // D&D Beyond's HP box in the sheet's HP card: Heal, the amount and Damage; temporary HP,
    // maximum and log open in its "HP sidebar", the same dialog as the token and tracker.
    const sw = page.locator('.character-hp [data-dt-hp="livia"]');
    await sw.waitFor();
    // Final review C2-3: the HP number opens HP management (D&D Beyond).
    await page.locator(".character-hp .character-hp-value").click();
    const side = page.locator('#dialog [data-dt-hp="livia"][data-dt-surface="sheet"]');
    await side.waitFor();
    const temp = await openDetails(side, "temp");
    await temp.locator("[data-dt-temp]").fill("5");
    await temp.locator("[data-dt-temp-set]").click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).actors.livia.tempHp === 5,
      key,
    );
    await closeDialog();
    await sw.locator("[data-dt-amount]").fill("8");
    await sw.locator("[data-dt-damage]").click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).actors.livia.hp === 15,
      key,
    );
    let livia = await actor("livia");
    check(livia.tempHp === 0, "Temporary HP not consumed first");
    check(
      /5 assorbiti dai temporanei \(5 → 0\)/.test(await sw.locator("[data-dt-status]").innerText()),
      "Absorbed message",
    );
    check(
      (await page.evaluate(() => document.activeElement?.hasAttribute("data-dt-amount"))) === true,
      "Focus back on the sheet amount",
    );
    await sw.locator("[data-dt-amount]").fill("4");
    await sw.locator("[data-dt-heal]").click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).actors.livia.hp === 19,
      key,
    );
    livia = await actor("livia");
    check(livia.tempHp === 0, "Healing added temporary HP");
    check(
      /i temporanei restano 0/.test(await sw.locator("[data-dt-status]").innerText()),
      "Heal msg",
    );
    await sw.scrollIntoViewIfNeeded();
    await shot("b33-03-sheet-box-it-1440.png");
    // Final review C2-3: the HP number opens HP management (D&D Beyond).
    await page.locator(".character-hp .character-hp-value").click();
    await side.waitFor();
    const max = await openDetails(side, "temp");
    await max.locator("[data-dt-max-delta]").fill("5");
    await max.locator("[data-dt-max-note]").fill("Aiuto (2° livello)");
    await max.locator("[data-dt-max-apply]").click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).actors.livia.maxHp === 27,
      key,
    );
    check(/Aiuto \(2° livello\)/.test(await side.innerText()), "Maximum note shown");
    await shot("b33-03b-sheet-hp-sidebar-it-1440.png");
    const controls = async (scope) =>
      scope.evaluate((el) =>
        [
          ...el.querySelectorAll(
            "[data-dt-heal],[data-dt-amount],[data-dt-damage],[data-dt-type],[data-dt-temp-set],[data-dt-max-apply]",
          ),
        ].map((n) => [...n.attributes].find((a) => a.name.startsWith("data-dt-")).name),
      );
    const sheetControls = JSON.stringify(await controls(side));
    await closeDialog();
    at("token-menu");
    await page.goto(base + "#table");
    await page.locator('.map-token[data-actor="livia"]').click({ button: "right" });
    await page.locator('[data-token-menu-item="damage-tray-hp"]').click();
    const dialogWidget = page.locator('#dialog [data-dt-dialog] [data-dt-hp="livia"]');
    await dialogWidget.waitFor();
    check(JSON.stringify(await controls(dialogWidget)) === sheetControls, "Token widget differs");
    check(/27/.test(await dialogWidget.locator("[data-dt-hp-max]").innerText()), "Token max");
    await closeDialog();
    at("tracker");
    await openTablePanel(page, "combat-tracker"); // B62: Combat › Combat tracker
    await page.locator('#table-drawer [data-ct-hp="livia"]').click();
    const trackerWidget = page.locator('#dialog [data-dt-hp="livia"][data-dt-surface="tracker"]');
    await trackerWidget.waitFor();
    check(
      JSON.stringify(await controls(trackerWidget)) === sheetControls,
      "Tracker widget differs",
    );
    await trackerWidget.locator("[data-dt-amount]").fill("3");
    await trackerWidget.locator("[data-dt-damage]").click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).actors.livia.hp === 16,
      key,
    );
    await page
      .locator('#dialog [data-dt-hp="livia"] [data-dt-hp-value]')
      .filter({ hasText: "16" })
      .waitFor();
    await shot("b33-04-tracker-dialog-it-1440.png");
    await closeDialog();
    passed.push(
      "3. Same widget on the sheet (HP card), the token menu (“Punti ferita…”) and the tracker (HP value): identical controls; Livia gets 5 temporary HP, 8 damage → temporary 5 → 0, HP 18 → 15; Cura 4 → 19, temporary stay 0; maximum +5 with the note “Aiuto (2° livello)” → 27; from the tracker dialog 3 damage → 16, the dialog redraws in place",
    );

    // ------------------------------------------------------------ (4) HP log undo/reapply
    at("undo-entry");
    await role("dm");
    await page.goto(base + "#table");
    await selectToken(ghost);
    let ghostLog = await openDetails(widget(ghost), "log");
    const entries = ghostLog.locator("[data-dt-entry]");
    check((await entries.count()) === 2, "Two Ghost entries");
    // Undo only the older entry (Burning Hands), not the latest change.
    await entries.nth(1).locator("[data-dt-revert]").click();
    const revert = page.locator("#dialog [data-dt-revert-dialog]");
    await revert.waitFor();
    const revertText = await revert.innerText();
    check(/PF: 38 → 40/.test(revertText), "Undo preview: " + revertText);
    check(/c’è un altro cambio di PF/.test(revertText), "Later entry flagged: " + revertText);
    await shot("b33-05-undo-entry-dialog-it-1440.png");
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForFunction(
      ({ k, g }) => JSON.parse(localStorage.getItem(k)).actors[g].hp === 40,
      { k: key, g: ghost },
    );
    ghostLog = await openDetails(widget(ghost), "log");
    const undone = ghostLog.locator(".dt-log-entry.is-reverted");
    check(/Annullata: Voce registrata per errore/.test(await undone.innerText()), "Undone flag");
    await undone.locator("[data-dt-reapply]").click();
    await page.waitForFunction(
      ({ k, g }) => JSON.parse(localStorage.getItem(k)).actors[g].hp === 38,
      { k: key, g: ghost },
    );
    ghostLog = await openDetails(widget(ghost), "log");
    check(/riapplicata/.test(await ghostLog.innerText()), "Reapplied flag");
    await widget(ghost).scrollIntoViewIfNeeded();
    await shot("b33-06-log-reapplied-it-1440.png");
    // A killing blow: Dead on the token; undoing it offers to remove Dead.
    await selectToken("goblin-1");
    await widget("goblin-1").locator("[data-dt-amount]").fill("5");
    await widget("goblin-1").locator("[data-dt-damage]").click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).actors["goblin-1"].dead === true,
      key,
    );
    check(
      (await page.locator('[data-dt-token-state="goblin-1"][data-state="dead"]').count()) === 1,
      "Dead visual",
    );
    const zoom = async (times, which) => {
      for (let i = 0; i < times; i++) await page.locator(`[data-table="zoom-${which}"]`).click();
    };
    await zoom(2, "in");
    await clipAround("goblin-1", "b33-06b-dead-visual-dm-crop.png");
    await zoom(2, "out");
    const killLog = await openDetails(widget("goblin-1"), "log");
    await killLog.locator("[data-dt-entry]").first().locator("[data-dt-revert]").click();
    await revert.waitFor();
    check(/ha causato «Morto»/.test(await revert.innerText()), "Dead consequence offered");
    check(await page.locator('#dialog [name="include-dead"]').isChecked(), "Dead option checked");
    await page.locator("#dialog [name=reason]").fill("Colpo assegnato alla creatura sbagliata");
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForFunction((k) => {
      const a = JSON.parse(localStorage.getItem(k)).actors["goblin-1"];
      return a.hp === 2 && a.dead === false;
    }, key);
    passed.push(
      "4. Ghost › Registro PF: Annulla on the older Burning Hands entry (not the last change) → dialog “PF: 38 → 40”, later entry flagged, reason prefilled → HP 40, entry “Annullata” with Riapplica → 38, “riapplicata”; Sentinella killed by 5 (Dead veil + cross on the token), Annulla offers “ha causato «Morto»” (checked) → HP 2, alive again",
    );

    // ------------------------------------------------------------ (5) proposals
    at("proposals");
    await role("player");
    await page.goto(base + "#table");
    await selectToken("livia");
    const lw = widget("livia");
    const propose = await openDetails(lw, "propose");
    await propose.locator("[data-dt-propose-amount]").fill("6");
    await propose.locator("[data-dt-propose-note]").fill("ho preso 6 danni dalla trappola");
    await propose.locator("[data-dt-propose]").click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).ext["damage-tray"].proposals.length === 1,
      key,
    );
    check((await actor("livia")).hp === 16, "A proposal changed HP");
    check(/in attesa del DM/.test(await widget("livia").innerText()), "Pending status");
    await role("dm");
    await page.goto(base + "#table");
    await creatureTab();
    const proposalRow = page.locator("[data-dt-proposal-row]");
    await proposalRow.waitFor();
    check(
      /ho preso 6 danni dalla trappola/.test(await proposalRow.innerText()),
      "DM sees the note",
    );
    await page.locator('.service-nav [data-service="requests"]').click();
    check(
      /Proposta: danno 6 a Livia/.test(await page.locator("#dialog").innerText()),
      "Bell notice",
    );
    await closeDialog();
    await proposalRow.scrollIntoViewIfNeeded();
    await shot("b33-07-proposal-dm-it-1440.png");
    await proposalRow.locator("[data-dt-accept]").click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).actors.livia.hp === 10,
      key,
    );
    await role("player");
    await page.goto(base + "#table");
    await selectToken("livia");
    const again = await openDetails(widget("livia"), "propose");
    check(/accettata: 6 applicati/.test(await again.innerText()), "Accepted status");
    await again.locator("[data-dt-propose-amount]").fill("4");
    await again.locator("[data-dt-propose]").click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).ext["damage-tray"].proposals.length === 2,
      key,
    );
    await role("dm");
    await page.goto(base + "#table");
    await creatureTab();
    await page.locator("[data-dt-decline]").click();
    await page.locator("[data-dt-decline-reason]").fill("Hai superato il TS: nessun danno");
    await page.locator("[data-dt-decline]").click();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext["damage-tray"].proposals[1].status === "declined",
      key,
    );
    check((await actor("livia")).hp === 10, "Declined proposal changed HP");
    await role("player");
    await page.goto(base + "#table");
    await selectToken("livia");
    const declined = await openDetails(widget("livia"), "propose");
    check(
      /rifiutata: Hai superato il TS: nessun danno/.test(await declined.innerText()),
      "Declined",
    );
    await declined.scrollIntoViewIfNeeded();
    await shot("b33-08-proposal-declined-player-it-1440.png");
    // Improved Initiative on a monster: the player sees only "Propose to the DM" for the
    // Esploratore and proposes a condition (tag); the DM accepts it from the tray.
    await selectToken("goblin-2");
    const ew = widget("goblin-2");
    check((await ew.locator("[data-dt-damage]").count()) === 0, "Player can damage a DM creature");
    await ew.locator('[data-dt-propose-kind][value="condition"]').check();
    await widget("goblin-2").locator("[data-dt-propose-condition]").selectOption("prone");
    await widget("goblin-2").locator("[data-dt-propose-note]").fill("l’ho spinto giù dal muretto");
    await widget("goblin-2").locator("[data-dt-propose]").click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).ext["damage-tray"].proposals.length === 3,
      key,
    );
    await role("dm");
    await page.goto(base + "#table");
    await creatureTab();
    await page.getByRole("button", { name: "Accetta e applica Prono" }).click();
    await page.waitForFunction(
      (k) =>
        (JSON.parse(localStorage.getItem(k)).actors["goblin-2"].conditions ?? []).some(
          (c) => c.id === "prone",
        ),
      key,
    );
    await role("player");
    await page.goto(base + "#table");
    await selectToken("goblin-2");
    check(
      /accettata: Prono applicato/.test(await widget("goblin-2").innerText()),
      "Player sees the accepted condition",
    );
    passed.push(
      "5b. Player selects the Esploratore (DM creature): no Damage button, only “Proponi al DM”; Condizione › Prono «l’ho spinto giù dal muretto» → DM tray “Accetta e applica Prono” → Prone applied through the conditions domain; player reads “accettata: Prono applicato”",
    );
    passed.push(
      "5. Player: Livia › Punti ferita › “Proponi al DM”: Danno 6 «ho preso 6 danni dalla trappola» → HP unchanged, “in attesa del DM”; DM: bell “Proposta: danno 6 a Livia”, tray row with the note → “Accetta e applica 6” → 16 → 10; player sees “accettata: 6 applicati”; second proposal 4 → DM “Rifiuta…” with the reason → HP unchanged, player reads “rifiutata: Hai superato il TS: nessun danno”",
    );

    // ------------------------------------------------------------ (6) Bloodied/Dead policy
    at("policy");
    await role("player");
    await page.goto(base + "#table");
    check(
      (await page.locator('[data-dt-token-state="goblin-1"][data-state="bloodied"]').count()) === 1,
      "Player sees the Bloodied Sentinella by default",
    );
    await zoom(2, "in");
    await clipAround("goblin-1", "b33-09-bloodied-player-crop.png");
    await zoom(2, "out");
    await role("dm");
    await page.locator('.service-nav [data-service="preferences"]').click();
    const toggle = page.locator('#dialog [name="setting:damage-tray-policy.token-states"]');
    await toggle.waitFor();
    await toggle.uncheck();
    await page.locator("#dialog button[type=submit]").click();
    await closeDialog();
    check(
      (await page.locator('[data-dt-token-state="goblin-1"]').count()) === 1,
      "The DM always sees it",
    );
    await role("player");
    await page.goto(base + "#table");
    check(
      (await page.locator('[data-dt-token-state="goblin-1"]').count()) === 0,
      "Hidden from players by the setting",
    );
    check(
      (await page.locator('[data-dt-token-state="livia"][data-state="bloodied"]').count()) === 1,
      "Livia (10/27, own sheet) keeps her Bloodied ring",
    );
    await shot("b33-10-policy-hidden-player-it-1440.png");
    passed.push(
      "6. Player sees the Sentinella’s Bloodied ring by default (words rule); DM › Preferences › “I giocatori vedono Sanguinante e Morto…” off → the DM still sees it, the player no longer does; Livia’s own Bloodied ring stays (she reads her sheet)",
    );

    // ------------------------------------------------------------ reload and Undo
    at("reload");
    await page.reload();
    await page.locator("#battle-map").waitFor();
    await selectToken("livia");
    const persisted = await openDetails(widget("livia"), "temp");
    check(/Aiuto \(2° livello\)/.test(await persisted.innerText()), "Max note after reload");
    const plog = await openDetails(widget("livia"), "log");
    check((await plog.locator("[data-dt-entry]").count()) >= 5, "Log after reload");
    await widget("livia").locator("[data-dt-amount]").fill("2");
    await widget("livia").locator("[data-dt-damage]").click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).actors.livia.hp === 8,
      key,
    );
    await page.getByRole("button", { name: "Annulla ultima modifica" }).click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).actors.livia.hp === 10,
      key,
    );
    passed.push(
      "reload: Livia’s maximum note and HP log survive a reload; 2 damage then the core “Annulla ultima modifica” restores 10",
    );
    check(errors.length === 0, "Page errors: " + errors.join("; "));

    // ------------------------------------------------------------ group 2: EN phone 390
    at("phone");
    const snapshot = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const mobile = await phone.newPage();
    mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
    await mobile.goto(base + "#home");
    await mobile.evaluate((data) => {
      localStorage.clear();
      for (const [k, v] of Object.entries(JSON.parse(data))) localStorage.setItem(k, v);
    }, snapshot);
    await mobile.goto(base + "#table");
    await mobile.reload();
    await mobile.locator("#demo-role").selectOption("player");
    await mobile.locator('.service-nav [data-service="preferences"]').tap();
    await mobile.locator("#dialog [name=lang]").selectOption("en");
    await mobile.locator("#dialog button[type=submit]").tap();
    await mobile.locator("#battle-map").waitFor();
    await dismissTip(mobile);
    // Turn portraits select a creature (the phone map draws the tokens close together).
    await mobile.locator('.initiative [data-select="livia"]').tap();
    await creatureTab(mobile, true);
    await mobile.locator('.table-inspector [data-dt-hp="livia"]').waitFor();
    const mw = mobile.locator('.table-inspector [data-dt-hp="livia"]');
    await mw.scrollIntoViewIfNeeded();
    check(/Heal/.test(await mw.innerText()) && /Damage/.test(await mw.innerText()), "EN labels");
    await mw.locator("[data-dt-amount]").tap();
    await mw.locator("[data-dt-amount]").fill("3");
    await mw.locator("[data-dt-damage]").tap();
    await mobile.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).actors.livia.hp === 7,
      key,
    );
    check(
      /3 damage/.test(
        await mobile.locator('.table-inspector [data-dt-hp="livia"] [data-dt-status]').innerText(),
      ),
      "EN status",
    );
    const mlog = mobile.locator('.table-inspector [data-dt-hp="livia"] [data-dt-details="log"]');
    if (!(await mlog.evaluate((d) => d.open))) await mlog.locator("summary").tap();
    await mlog.locator("[data-dt-entry]").first().locator("[data-dt-revert]").tap();
    await mobile.locator("#dialog [data-dt-revert-dialog]").waitFor();
    check(/HP: 7 → 10/.test(await mobile.locator("#dialog").innerText()), "EN undo preview");
    check(await noOverflow(mobile), "Phone dialog overflow");
    await mobile.locator("#dialog button[type=submit]").tap();
    await mobile.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).actors.livia.hp === 10,
      key,
    );
    const mw2 = mobile.locator('.table-inspector [data-dt-hp="livia"]');
    await mw2.scrollIntoViewIfNeeded();
    check(await noOverflow(mobile), "Phone page overflow");
    // A radio or checkbox is hit through its wrapping label: measure the label.
    const small = await mw2.evaluate((el) =>
      [...el.querySelectorAll("button, input, select, summary")]
        .map((n) => (["radio", "checkbox"].includes(n.type) ? (n.closest("label") ?? n) : n))
        .filter((n) => n.offsetParent && n.getBoundingClientRect().height < 39.5)
        .map((n) => n.outerHTML.slice(0, 80)),
    );
    check(small.length === 0, "Targets under 40 px: " + small.join(" | "));
    await mobile.screenshot({ path: dir + "b33-11-phone-widget-en-390.png" });
    // DM on the phone: the tray's proposal row by touch.
    await mobile.locator("#demo-role").selectOption("player");
    const mprop = mobile.locator(
      '.table-inspector [data-dt-hp="livia"] [data-dt-details="propose"]',
    );
    if (!(await mprop.evaluate((d) => d.open))) await mprop.locator("summary").tap();
    await mprop.locator("[data-dt-propose-amount]").fill("2");
    await mprop.locator("[data-dt-propose]").tap();
    await mobile.locator("#demo-role").selectOption("dm");
    await creatureTab(mobile, true);
    const mrow = mobile.locator("[data-dt-proposal-row]");
    await mrow.scrollIntoViewIfNeeded();
    check(await noOverflow(mobile), "Phone tray overflow");
    await mobile.screenshot({ path: dir + "b33-12-phone-dm-tray-en-390.png" });
    await mrow.locator("[data-dt-accept]").tap();
    await mobile.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).actors.livia.hp === 8,
      key,
    );
    await phone.close();
    passed.push(
      "phone (EN, 390, touch, isolated context): player taps Livia › Creature › Hit points: 3 Damage → 7 with “3 damage…” status; HP log › Undo → “HP: 7 → 10” → 10; no horizontal overflow; every widget control ≥ 40 px; a 2-damage proposal accepted by the DM by touch → 8",
    );

    // ------------------------------------------------------------ review (B33-rf), IT 1440
    at("review");
    await role("player");
    await page.goto(base + "#table");
    await selectToken("livia");
    // A fall to 0 HP undone from the log also ends the Unconscious and Prone it caused.
    await widget("livia").locator("[data-dt-amount]").fill("14");
    await widget("livia").locator("[data-dt-damage]").click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).actors.livia.hp === 0,
      key,
    );
    check(
      /PF 10 → 0 · 4 oltre lo 0/.test(
        await widget("livia").locator("[data-dt-status]").innerText(),
      ),
      "Overkill in the status",
    );
    check(
      ((await actor("livia")).conditions ?? []).some((c) => c.id === "unconscious"),
      "Unconscious at 0 HP",
    );
    const fallLog = await openDetails(widget("livia"), "log");
    await fallLog.locator("[data-dt-entry]").first().locator("[data-dt-revert]").click();
    await revert.waitFor();
    const fallText = await revert.innerText();
    check(
      /Privo di sensi/.test(fallText) && /Prono/.test(fallText),
      "Conditions offered: " + fallText,
    );
    check(
      await page.locator('#dialog [name="include-conditions"]').isChecked(),
      "Conditions option checked",
    );
    await shot("b33-13-undo-fall-conditions-it-1440.png");
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForFunction((k) => {
      const a = JSON.parse(localStorage.getItem(k)).actors.livia;
      return (
        a.hp === 10 && !(a.conditions ?? []).some((c) => ["unconscious", "prone"].includes(c.id))
      );
    }, key);
    // Undoing “massimo +5” takes Aid's modifier off the list; Reapply puts it back.
    const maxLog = await openDetails(widget("livia"), "log");
    await maxLog
      .locator("[data-dt-entry]")
      .filter({ hasText: "massimo +5" })
      .locator("[data-dt-revert]")
      .click();
    await revert.waitFor();
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).actors.livia.maxHp === 22,
      key,
    );
    const maxOff = await openDetails(widget("livia"), "temp");
    check(
      (await maxOff.locator("[data-dt-mod-remove]").count()) === 0,
      "Aid modifier still listed",
    );
    const maxLog2 = await openDetails(widget("livia"), "log");
    await maxLog2
      .locator(".dt-log-entry.is-reverted")
      .filter({ hasText: "massimo +5" })
      .locator("[data-dt-reapply]")
      .click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).actors.livia.maxHp === 27,
      key,
    );
    const maxOn = await openDetails(widget("livia"), "temp");
    check(
      (await maxOn.locator("[data-dt-mod-remove]").count()) === 1 &&
        /Aiuto \(2° livello\)/.test(await maxOn.innerText()),
      "Aid modifier back",
    );
    await widget("livia").scrollIntoViewIfNeeded();
    await shot("b33-14-max-reapplied-it-1440.png");
    passed.push(
      "review: Livia 14 damage → 0 HP “4 oltre lo 0”, Unconscious; HP log › Annulla offers “Ha causato Privo di sensi, Prono” (checked) → 10 HP, both ended; undoing “massimo +5” → 22 and Aid’s modifier leaves the list, Riapplica → 27 and it is back",
    );
    check(errors.length === 0, "Page errors: " + errors.join("; "));
    await context.close();
    return { passed, errors };
  } catch (error) {
    await page.screenshot({ path: dir + "failure-" + step + ".png" }).catch(() => {});
    return { failedAt: step, error: String(error.message ?? error).slice(0, 800), passed, errors };
  }
};
