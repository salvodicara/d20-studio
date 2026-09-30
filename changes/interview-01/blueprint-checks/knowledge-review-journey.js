async (rootPage) => {
  // B62: token-menu commands of labelled submenus are one step deeper (Foundry Token HUD
  // FVT-119, D&D Beyond token menu DDB-117): open the submenu holding it, then the command.
  const menuPick = async (page, name, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const menu = page.locator("body > .token-menu");
    const item = () => menu.getByRole("menuitem", { name });
    await menu.locator("[data-nav]").first().waitFor();
    if (await item().count()) return press(item().first());
    const ids = await menu
      .locator("[data-token-menu-category]")
      .evaluateAll((els) => els.map((e) => e.dataset.tokenMenuCategory));
    for (const id of ids) {
      await press(menu.locator(`[data-token-menu-category="${id}"]`));
      if (await item().count()) return press(item().first());
      await press(menu.locator("[data-token-menu-back]"));
    }
    throw Error("token menu command not found: " + name);
  };
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
  // B46 review (B46-rf) — the fixes in the one app with real clicks, keys and drags:
  // R1 a player cannot hide while enemies she cannot perceive see her (the refusal names
  // nobody); R2 Examine names conditions (IT here, EN on the phone in R8); R3 a name hidden from the token menu
  // (B12) is an unknown identity in Examine; R4 the pickpocket dialog lists the chosen
  // thief's own items; R5 a DM creature's secret hiding ends only in the DM's log; R6 one
  // «Annulla ultima modifica» reverts an attack made from hiding and the loss it caused;
  // R7 Study offers no roll when the rules forbid it, Search labels its app rule.
  // IT desktop 1440, player and DM. Synthetic demo data only; resets this browser's state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B46-rf/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const waitStored = (fn, arg = null) =>
    page
      .waitForFunction(
        ([k, source, a]) => {
          const s = JSON.parse(localStorage.getItem(k));
          return new Function("s", "a", "return (" + source + ")(s, a)")(s, a);
        },
        [key, fn.toString(), arg],
        { timeout: 8000 },
      )
      .catch((error) => {
        throw Error(`State never became: ${fn.toString()} — ${error.message.split("\n")[0]}`);
      });
  const dismissTips = async () => {
    const got = page.getByRole("button", { name: /^(Ho capito|Got it)$/ });
    for (let i = 0; i < 3 && (await got.count()); i++)
      await got
        .first()
        .click({ timeout: 1500 })
        .catch(() => {});
  };
  const role = async (value) => {
    if ((await page.locator("#demo-role").inputValue()) === value) return;
    await page.locator("#demo-role").selectOption(value);
    await page.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await dismissTips();
  };
  const reset = async () => {
    await page.goto(base + "#table");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator("#battle-map").waitFor();
    await dismissTips();
  };
  const shot = (name) => page.screenshot({ path: dir + name });
  const dialog = () => page.locator("#dialog[open]");
  const submit = () => dialog().locator('button[type="submit"]').click();
  const closeDialog = async () => {
    if (await dialog().count()) await dialog().locator("footer [data-close]").click();
    await dialog().waitFor({ state: "detached" });
  };
  const token = (id) => page.locator(`#battle-map [data-actor="${id}"]`);
  const centre = async (id) => {
    const b = await token(id).boundingBox();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const scenePoint = (x, y) =>
    page.evaluate(
      ([x, y]) => {
        const m = document.querySelector("#battle-map #tokens").getScreenCTM();
        const q = new DOMPoint(x, y).matrixTransform(m);
        return { x: q.x, y: q.y };
      },
      [x, y],
    );
  const menu = () => page.locator("body > .token-menu");
  // B62: Esc inside a submenu goes back to its entry first; press it until the menu closes.
  const escapeMenu = async () => {
    await page.keyboard.press("Escape");
    for (let i = 0; i < 3 && (await menu().isVisible()); i++) await page.keyboard.press("Escape");
  };
  const openMenu = async (id) => {
    await escapeMenu();
    const c = await centre(id);
    await page.mouse.click(c.x, c.y, { button: "right" });
    await menu().waitFor({ state: "visible" });
  };
  const menuItems = () => menu().getByRole("menuitem").allInnerTexts();
  // B62: a command of a labelled submenu is opened through its submenu (menuPick).
  const menuItem = (label) => menuPick(page, label);
  const select = async (id) => {
    await escapeMenu();
    const c = await centre(id);
    await page.mouse.click(c.x, c.y);
    await page.waitForTimeout(150);
  };
  const creatureTab = async () => {
    const tab = page.locator('[data-table-tab="creature"]').first();
    if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
    await page.locator("[data-knowledge-panel]").waitFor();
  };
  const panelText = () => page.locator("[data-knowledge-panel]").innerText();
  const drag = async (from, to, steps = 10) => {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let i = 1; i <= steps; i++)
      await page.mouse.move(
        from.x + ((to.x - from.x) * i) / steps,
        from.y + ((to.y - from.y) * i) / steps,
      );
    await page.mouse.up();
  };
  const physical = async (faces) => {
    await dialog().locator('[name="diceMode"]').selectOption("physical");
    for (let i = 0; i < faces.length; i++)
      await dialog().locator(`[name="face${i}"]`).fill(String(faces[i]));
    await submit();
  };
  const moveTo = async (id, x, y) => {
    await drag(await centre(id), await scenePoint(x, y));
    await waitStored(
      (s, a) => {
        const t = s.scenes
          .find((sc) => sc.id === s.activeSceneId)
          .tokens.find((tk) => tk.actorId === a.id);
        return Math.abs(t.x - a.x) < 20 && Math.abs(t.y - a.y) < 20;
      },
      { id, x, y },
    );
  };

  // ------------------------------------------------------------ R1 unseen watcher
  await reset();
  await role("dm");
  for (const id of ["goblin-1", "goblin-2"]) {
    await openMenu(id);
    await menuItem(/^Nascondi ai giocatori/);
    await page.waitForTimeout(200);
  }
  await role("player");
  check((await token("goblin-1").count()) === 0, "The player still sees Sentinella");
  await select("livia");
  await creatureTab();
  let text = await panelText();
  check(/Nessun nemico che vedi sulla scena/.test(text), "Player stealth block: " + text);
  const hideButton = page.locator('[data-knowledge-hide="livia"]');
  check(!(await hideButton.isDisabled()), "Hide… disabled though the player knows no enemy");
  await hideButton.click();
  await physical([20]);
  await page.waitForTimeout(300);
  text = await dialog().innerText();
  check(
    /Qui non puoi nasconderti: secondo il DM non sei fuori dalla vista di ogni nemico/.test(text),
    "Refusal: " + text,
  );
  check(!/Sentinella|Esploratore/.test(text), "The refusal names the watcher");
  await shot("rf-10-hide-refused-unseen-watcher-player-it-1440.png");
  await closeDialog();
  let data = await stored();
  check(!data.ext.knowledge.hidden.livia, "Livia hidden despite being watched");
  check((data.ext["knowledge-rolls"]?.rolls ?? []).length === 0, "A refused Hide spent a die");
  await role("dm");
  await select("livia");
  await creatureTab();
  text = await panelText();
  check(/Sentinella · ti vede/.test(text), "The DM reads who sees her: " + text);
  passed.push(
    "R1. DM hides both goblin tokens from the players (token menu «Nascondi ai giocatori»); player: Livia › Creature tab «Nessun nemico che vedi sulla scena», «Nasconditi…» enabled, physical 20 → the dialog refuses «Qui non puoi nasconderti: secondo il DM non sei fuori dalla vista di ogni nemico» without naming anyone; no hidden record, no die spent; the DM reads «Sentinella · ti vede»",
  );

  // ------------------------------------------------------------ R2 conditions in Examine
  await reset();
  await role("dm");
  await openMenu("goblin-1");
  await menuItem(/^Condizioni/);
  await menu().getByRole("menuitemcheckbox", { name: "Prono" }).click();
  await waitStored((s) =>
    (s.actors["goblin-1"].conditions ?? []).some((c) => (c.id ?? c) === "prone"),
  );
  await page.keyboard.press("Escape");
  await role("player");
  await openMenu("goblin-1");
  await menuItem("Esamina");
  await dialog().waitFor();
  text = await dialog().innerText();
  check(/Piccola · Prono/.test(text) && !/\bprone\b/.test(text), "IT Examine: " + text);
  await shot("rf-11-examine-condition-name-player-it-1440.png");
  await closeDialog();
  passed.push(
    "R2. DM token menu › Condizioni › «Prono» on Sentinella; the player's Examine reads «Piccola · Prono» (not the raw id «prone»)",
  );

  // ------------------------------------------------------------ R3 B12 hidden name
  await role("dm");
  await openMenu("goblin-1");
  await menuItem("Nascondi il nome ai giocatori");
  await waitStored((s) => s.actors["goblin-1"].name === "Creatura sconosciuta 1");
  await openMenu("goblin-1");
  // B62: the identity commands live in the «Visibilità» submenu: read it too.
  const dmItems = await menuItems();
  if (await menu().locator('[data-token-menu-category="visibility"]').count()) {
    await menu().locator('[data-token-menu-category="visibility"]').click();
    dmItems.push(...(await menuItems()));
    await menu().locator("[data-token-menu-back]").click();
  }
  check(!dmItems.some((t) => /Nascondi identità/.test(t)), "Second identity toggle offered");
  await menuItem("Esamina");
  await dialog().waitFor();
  text = await dialog().innerText();
  check(/Nome nascosto dal menu della pedina: mostralo da lì/.test(text), "DM Examine: " + text);
  await closeDialog();
  await role("player");
  await openMenu("goblin-1");
  await menuItem("Esamina");
  await dialog().waitFor();
  text = await dialog().innerText();
  check(/Identità sconosciuta/.test(text), "Player Examine: " + text);
  check(!/Goblin|Sentinella|Folletto/.test(text), "Examine names the hidden creature: " + text);
  await shot("rf-12-examine-b12-hidden-name-player-it-1440.png");
  await closeDialog();
  passed.push(
    "R3. DM token menu «Nascondi il nome ai giocatori» (B12) on Sentinella: the menu no longer offers «Nascondi identità…», the DM's Examine says «Nome nascosto dal menu della pedina: mostralo da lì»; the player's Examine of «Creatura sconosciuta 1» says «Identità sconosciuta» and never «Goblin guerriero», «Folletto» or «Sentinella»",
  );

  // ------------------------------------------------------------ R4 pickpocket thief items
  await reset();
  await role("player");
  // Diagonally next to Sentinella (620, 250), clear of the courtyard's pressure plate.
  await moveTo("livia", 570, 200);
  await moveTo("mira", 670, 200);
  await openMenu("goblin-1");
  await menuItem("Borseggia…");
  await dialog().waitFor();
  const liviaItems = await dialog().locator('[name="item"] option').allInnerTexts();
  check(
    liviaItems.some((t) => /Pozione di guarigione/.test(t)),
    "Livia's items: " + liviaItems,
  );
  await dialog().locator('[name="thief"]').selectOption("mira");
  await page.waitForFunction(
    () => document.querySelector('#dialog[open] [name="thief"]')?.value === "mira",
  );
  const miraItems = await dialog().locator('[name="item"] option').allInnerTexts();
  data = await stored();
  const expected = (data.actors.mira.inventory ?? []).filter((r) => r.quantity > 0 && !r.equipped);
  check(miraItems.length === expected.length, "Mira's items: " + miraItems);
  check(!miraItems.some((t) => /Libro degli incantesimi di Livia/.test(t)), "Livia's book offered");
  await shot("rf-13-pickpocket-thief-items-player-it-1440.png");
  await closeDialog();
  passed.push(
    `R4. Player drags Livia and Mira next to Sentinella › «Borseggia…»: the plant list shows Livia's items; choosing «Mira» as thief reopens the dialog with Mira's ${expected.length} item(s) and never Livia's spellbook`,
  );

  // ------------------------------------------------------------ R5 secret hide, private end
  await role("dm");
  await select("goblin-2");
  await creatureTab();
  await page.locator('[data-knowledge-hide="goblin-2"]').click();
  await dialog().locator('[name="dmReason"]').fill("Dietro il carro");
  await physical([14]);
  await waitStored((s) => Boolean(s.ext.knowledge.hidden["goblin-2"]));
  await page.locator('[data-knowledge-dm-end="goblin-2"]').click();
  await dialog().locator("[data-knowledge-reason]").fill("Si allontana");
  await submit();
  await waitStored((s) => !s.ext.knowledge.hidden["goblin-2"]);
  data = await stored();
  const entry = data.log.at(-1);
  check(/Esploratore non è più nascosta/.test(entry.label), "Last log: " + entry.label);
  check(entry.visibility === "private", "The end of a secret hide is shared");
  await role("player");
  await openTablePanel(page, "log"); // B62: Chat › Registro
  await page.waitForTimeout(300);
  const playerLog = await page.locator("#table-sidebar-panel").innerText();
  check(/Registro e chat/.test(playerLog), "Log panel not open");
  check(!/Esploratore non è più nascosta/.test(playerLog), "Player's log reveals it");
  check(!/Nascondersi: Esploratore/.test(playerLog), "Player's log reveals the secret Hide");
  await page.locator('[data-table-tab="creature"]').first().click();
  passed.push(
    "R5. DM: Esploratore › Creature tab «Nasconditi…» with «Dietro il carro», physical 14 → hidden in secret; «Termina (motivo)…» «Si allontana» → the log entry is private; the player's Registro shows neither the Hide nor its end",
  );

  // ------------------------------------------------------------ R6 one Undo for cause + loss
  // (An attack from hiding needs initiative first: the Node test covers that trigger. Here
  // the cause is the Invisible condition ended from the token menu.)
  await reset();
  await role("dm");
  await select("livia");
  await creatureTab();
  await page.locator('[data-knowledge-hide="livia"]').click();
  await dialog().locator('[name="dmReason"]').fill("Fumo denso del braciere");
  await physical([18]);
  await waitStored((s) => Boolean(s.ext.knowledge.hidden.livia));
  await role("player");
  await openMenu("livia");
  await menuItem(/^Condizioni/);
  await menu().getByRole("menuitemcheckbox", { name: "Invisibile" }).click();
  await waitStored((s) => !s.ext.knowledge.hidden.livia);
  await page.keyboard.press("Escape");
  data = await stored();
  check(
    data.log.some((e) =>
      /Non più nascosta: Livia \(la condizione Invisibile è terminata\)/.test(e.label),
    ),
    "Loss not explained in the log",
  );
  await page.getByRole("button", { name: "Annulla ultima modifica" }).first().click();
  await waitStored((s) => Boolean(s.ext.knowledge.hidden.livia));
  data = await stored();
  check(
    data.actors.livia.conditions.some((c) => c.id === "invisible"),
    "Undo restored hiding without its Invisible condition",
  );
  // An unrelated change afterwards does not bring back a stale loss.
  await moveTo("livia", 300, 300);
  await page.waitForTimeout(300);
  data = await stored();
  check(Boolean(data.ext.knowledge.hidden.livia), "A stale loss fired after the Undo");
  await select("livia");
  await creatureTab();
  text = await panelText();
  check(/Nascosta · CD per trovarla 20/.test(text), "Panel after Undo: " + text);
  await shot("rf-14-undo-cause-and-loss-player-it-1440.png");
  passed.push(
    "R6. DM allows Livia to hide («Fumo denso del braciere», physical 18 + 2 = 20); player: token menu › Condizioni › «Invisibile» ends it → «Non più nascosta: Livia (la condizione Invisibile è terminata)»; one «Annulla ultima modifica» brings back both the Invisible condition and «Nascosta · CD per trovarla 20»; moving her afterwards does not fire a stale loss",
  );

  // ------------------------------------------------------------ R7 Study blocked, Search rule
  await reset();
  await role("player");
  await select("goblin-1");
  await creatureTab();
  await page.locator('[data-knowledge-study="goblin-1"]').click();
  await physical([1]);
  await waitStored((s) =>
    Object.values(s.ext.knowledge.campaigns ?? {}).some(
      (c) => c.kinds?.["srd2024:creature:goblin-warrior"]?.blocked?.livia === 1,
    ),
  );
  await page.locator('[data-knowledge-study="goblin-1"]').click();
  await dialog().waitFor();
  text = await dialog().innerText();
  check(/ha già fallito a questo livello/.test(text), "Blocked Study reason: " + text);
  check((await dialog().locator('button[type="submit"]').count()) === 0, "A roll is still offered");
  check((await dialog().locator("[data-knowledge-studier]").count()) === 1, "No studier choice");
  await shot("rf-15-study-blocked-no-roll-player-it-1440.png");
  await closeDialog();
  await select("livia");
  await creatureTab();
  await page.locator('[data-knowledge-search="livia"]').click();
  await dialog().waitFor();
  text = await dialog().innerText();
  check(/Regola dell'app: chi è dietro copertura totale non si trova con Cercare/.test(text), text);
  await closeDialog();
  passed.push(
    "R7. Player: Study Sentinella physical 1 → failed; «Studia (Arcano)…» again shows «ha già fallito a questo livello», no roll button, «Chi studia» still offered; «Cerca…» labels the Total Cover exclusion «Regola dell'app»",
  );

  // ------------------------------------------------------------ R8 EN phone 390, touch
  const phoneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const phone = await phoneContext.newPage();
  phone.on("pageerror", (error) => errors.push("phone: " + error.message));
  await phone.goto(base + "#table");
  await phone.evaluate(() => localStorage.clear());
  await phone.reload();
  await phone.locator("#battle-map").waitFor();
  const phoneTips = async () => {
    const got = phone.getByRole("button", { name: /^(Ho capito|Got it)$/ });
    for (let i = 0; i < 3 && (await got.count()); i++)
      await got
        .first()
        .click({ timeout: 1500 })
        .catch(() => {});
  };
  await phoneTips();
  await phone.locator('.service-nav [data-service="preferences"]').click();
  await phone.locator('#dialog [name="lang"]').selectOption("en");
  await phone.locator('#dialog button[type="submit"]').click();
  await phoneTips();
  const cdp = await phoneContext.newCDPSession(phone);
  const longPress = async (selector) => {
    const node = phone.locator(selector);
    await node.scrollIntoViewIfNeeded();
    const b = await node.boundingBox();
    const x = b.x + b.width / 2,
      y = b.y + b.height / 2;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await phone.waitForTimeout(750);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await phone.waitForTimeout(250);
  };
  const phoneMenu = () => phone.locator("body > .token-menu");
  const phoneDialog = () => phone.locator("#dialog[open]");
  const phoneOverflow = () =>
    phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  const smallButtons = (selector) =>
    phone.locator(selector).evaluateAll(
      (nodes) =>
        nodes
          .filter((n) => n.offsetParent)
          .map((n) => n.getBoundingClientRect())
          .filter((r) => r.height < 39.5).length,
    );
  await phone.locator("#demo-role").selectOption("dm");
  await phoneTips();
  await longPress('#battle-map [data-actor="goblin-1"]');
  await phoneMenu()
    .getByRole("menuitem", { name: /^Conditions/ })
    .tap();
  await phoneMenu().getByRole("menuitemcheckbox", { name: "Prone" }).tap();
  await phone.waitForFunction(
    (k) =>
      (JSON.parse(localStorage.getItem(k)).actors["goblin-1"].conditions ?? []).some(
        (c) => (c.id ?? c) === "prone",
      ),
    key,
  );
  await phone.keyboard.press("Escape");
  await phone.locator("#demo-role").selectOption("player");
  await phoneTips();
  await longPress('#battle-map [data-actor="goblin-1"]');
  await phoneMenu().getByRole("menuitem", { name: "Examine" }).tap();
  await phoneDialog().waitFor();
  text = await phoneDialog().innerText();
  check(/Small · Prone/.test(text), "EN Examine condition: " + text);
  check(!(await phoneOverflow()), "Phone overflow with the Examine window");
  await phone.screenshot({ path: dir + "rf-16-examine-condition-phone-en-390.png" });
  await phoneDialog().locator("footer [data-close]").tap();
  await phone.locator('#battle-map [data-actor="livia"]').tap();
  const phoneTab = phone.locator('[data-table-tab="creature"]').first();
  if ((await phoneTab.getAttribute("aria-selected")) !== "true") await phoneTab.tap();
  await phone.locator('[data-knowledge-search="livia"]').scrollIntoViewIfNeeded();
  await phone.locator('[data-knowledge-search="livia"]').tap();
  await phoneDialog().waitFor();
  text = await phoneDialog().innerText();
  check(/App rule: Search does not find a creature behind Total Cover/.test(text), text);
  check((await smallButtons("#dialog[open] button")) === 0, "Dialog buttons under 40 px");
  check(!(await phoneOverflow()), "Phone overflow with the Search dialog");
  await phone.screenshot({ path: dir + "rf-17-search-app-rule-phone-en-390.png" });
  await phoneDialog().locator("footer [data-close]").tap();
  passed.push(
    "R8. EN phone 390 (touch, isolated): DM long-press › Conditions › «Prone»; player long-press › «Examine» reads «Small · Prone», no overflow; Livia › Creature tab «Search…» shows «App rule: Search does not find a creature behind Total Cover…», dialog buttons ≥ 40 px, no overflow",
  );
  await phoneContext.close();

  await context.close();
  check(!errors.length, "Page errors: " + errors.join(" | "));
  return { passed, errors };
};
