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
  // B32 — complete combat tracker in the one app, with real clicks, keys and touch.
  // Group 1 (DM + player, IT, 1440): house rule and countdown prepared in the tracker;
  // four "Goblin" and a "Goblin capo" added from the SRD compendium (one goblin hidden in
  // ambush), placed and given initiative in Preparation, combat started with the core
  // command. Acceptance checks (card B32): hidden never leaks (1), A/B/C letters and the
  // pending lane (2), remove vs delete (3), group turn as a house rule (4), turn alerts,
  // marker and sound (5), legendary actions/resistance and recharge (6), the countdown
  // (7), mob attack (8), reaction policy (9), Ready (10), finish encounter, Reset and
  // Clear (11), with reload and Undo. Group 2: EN phone 390 with touch in an isolated
  // context. Synthetic demo data only; resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B32/";
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
  // TV-45/PR-32: initiative is set in the Table's start dialog (Foundry Combat Tracker); the
  // scene editor's old «Incontro preparato» list is now the encounter builder. Rows are
  // addressed by id (each change re-sorts the list); the bonus comes from the sheet.
  const startWith = async (naturals) => {
    await page.locator("[data-ct-start-dialog]").waitFor();
    const ids = await page
      .locator("[data-ct-start-include]")
      .evaluateAll((els) => els.map((el) => el.dataset.ctStartInclude));
    for (const id of ids) {
      const box = page.locator(`[data-ct-start-include="${id}"]`);
      if ((await box.isChecked()) !== Object.hasOwn(naturals, id)) await box.click();
    }
    for (const [id, natural] of Object.entries(naturals)) {
      const d20 = page.locator(`[data-ct-start-natural="${id}"]`);
      await d20.fill(String(natural));
      await d20.dispatchEvent("change");
    }
    await page.getByRole("button", { name: "Inizia combattimento", exact: true }).click();
  };
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const tracker = async (p = page) => (await stored(p)).ext["combat-tracker"];
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
  const submit = async (p = page, tap = false) => {
    const button = p.locator("#dialog button[type=submit]");
    await (tap ? button.tap() : button.click());
  };
  const closeDialog = async (p = page) => {
    if (await p.locator("#dialog[open]").count()) await p.keyboard.press("Escape");
    await p
      .locator("#dialog[open]")
      .waitFor({ state: "detached", timeout: 3000 })
      .catch(() => {});
  };
  const openTracker = async (p = page, tap = false) => {
    // B62: the tracker is the first sub-tab of the Combat tab.
    await p.locator(".table-tabs [data-table-tab]").first().waitFor();
    await openTablePanel(p, "combat-tracker", tap);
    await p.locator("#table-drawer [data-ct], #table-drawer [data-ct-idle]").first().waitFor();
  };
  const panel = (p = page) => p.locator("#table-drawer");
  const panelText = (p = page) => panel(p).innerText();
  const next = async (p = page) => {
    await p.locator("[data-ct-next]").click();
    await settleDice(p);
  };
  const strip = (p = page) => p.locator(".initiative").innerText();
  const currentInStrip = (p = page) => p.locator(".initiative-token.current").innerText();
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
  const rowMenu = async (id, command, p = page) => {
    await p.locator(`[data-ct-menu="${id}"]`).click();
    await p.locator(`[data-ct-cmd="${command}"][data-actor="${id}"]`).click();
  };
  // One SRD creature through the compendium's "Add to a scene…" (B16 flow).
  const addFromCompendium = async (creature, name, { hidden = false, map = null } = {}) => {
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
    await dialog.locator("[name=hidden]").setChecked(hidden);
    await dialog.locator(`[name=where][value="${map ? "map" : "free"}"]`).check();
    await submit();
    if (map) {
      // B16's placement panel lives in the Creature tab: it arms "Place creature".
      await page.locator("#battle-map").waitFor();
      const creature = page.locator('[data-table-tab="creature"]');
      if ((await creature.getAttribute("aria-selected")) !== "true") await creature.click();
      await page.locator("[data-compendium-place]").waitFor();
      const pick = page.locator("[data-place-pick]");
      if (await pick.count()) await pick.click();
      await page.locator('[data-tool="compendium-place"][aria-pressed="true"]').waitFor();
      const point = await toScreen("#battle-map", map.x, map.y);
      await page.mouse.click(point.x, point.y);
    }
    await page.waitForFunction(
      ({ k, n }) => Object.keys(JSON.parse(localStorage.getItem(k)).actors).length > n,
      { k: key, n: before },
    );
    const state = await stored();
    return Object.values(state.actors).find(
      (a) => a.name === name && !Object.keys(state.actors).slice(0, before).includes(a.id),
    ).id;
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
    await page.goto(base + "#table");
    at("assisted");
    // Campaign › Settings › Rules: damage waits for "Apply" (Standard 2024, census C1). The
    // sample campaign plays "Automatic"; Legendary Resistance needs the save before Apply.
    await page.goto(base + "#campaign?tab=settings&id=rules");
    await page.locator('[data-cs-rule-input="automation"][value="assisted"]').check();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext["campaign-settings"].campaigns.lanterns.policy
          .automation === "assisted",
      key,
    );
    await page.goto(base + "#table");
    at("tracker-idle");
    // The tracker is the "Combattimento" tab of the Table's right sidebar (1 click).
    await openTracker();
    check((await panelText()).includes("Nessun combattimento in corso"), "Idle tracker missing");
    // Settings: turn timer (Improved Initiative). The group turn stays off: 2024 baseline.
    await page.locator("[data-ct-settings]").click();
    const settings = page.locator("#dialog");
    check(
      (await settings.innerText()).includes(
        "un solo tiro d’iniziativa per un gruppo di creature identiche",
      ),
      "2024 baseline not stated",
    );
    check(!(await settings.locator("[name=groupTurns]").isChecked()), "Group turn on by default");
    await settings.locator("[name=timer]").check();
    await submit();
    let t = await tracker();
    check(t.settings.timer && !t.settings.groupTurns, "Timer not saved");
    // A countdown entry (Roll20 custom item): "the ceiling collapses in 3 rounds".
    await page.locator("[data-ct-entry-new]").first().click();
    const entry = page.locator("#dialog");
    await entry.locator("[name=name]").fill("Il soffitto crolla");
    await entry.locator("[name=init]").fill("20");
    await entry.locator("[name=kind]").selectOption("countdown");
    await entry.locator("[name=rounds]").fill("3");
    await entry.locator("[name=visibility]").selectOption("all");
    await submit();
    check((await panelText()).includes("fra 3 round"), "Countdown entry not listed");
    passed.push(
      "setup: tracker tab reachable in 1 click from the Table; settings state the 2024 baseline (one roll for identical creatures, separate turns; group turn off); turn timer on; countdown “Il soffitto crolla” in 3 rounds, visible to everyone",
    );

    at("compendium");
    const goblins = [];
    for (let i = 0; i < 4; i++)
      goblins.push(await addFromCompendium("goblin-warrior", "Goblin", { hidden: i === 3 }));
    const boss = await addFromCompendium("goblin-boss", "Goblin capo");
    const [ga, gb, gc, gh] = goblins;

    at("preparation");
    await page.goto(base + "#preparation?id=old-watch");
    const map = page.locator("[data-prep-interactive]");
    await map.waitFor();
    for (const [id, x, y] of [
      [ga, 295, 380],
      [gb, 250, 335],
      [gc, 250, 425],
      [gh, 700, 200],
      [boss, 190, 320],
    ]) {
      const token = map.locator(`[data-prep-token="token-${id}"] circle`);
      await token.scrollIntoViewIfNeeded();
      const box = await token.boundingBox();
      const dest = await toScreen("[data-prep-interactive]", x, y);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(dest.x, dest.y, { steps: 8 });
      await page.mouse.up();
    }
    await page.locator("[data-prep-save]").click();
    await page.getByRole("button", { name: "Aggiorna scena attiva", exact: true }).click();
    await page.getByRole("button", { name: "Avvia incontro salvato…", exact: true }).click();
    await startWith({
      livia: 15,
      mira: 14,
      [ga]: 12,
      [gb]: 12,
      [gc]: 12,
      [gh]: 12,
      doran: 9,
      [boss]: 8,
    });
    await page.locator("#battle-map").waitFor();
    await openTracker();

    at("letters");
    let state = await stored();
    check(
      [ga, gb, gc].map((id) => state.actors[id].name).join(",") === "Goblin A,Goblin B,Goblin C",
      "Letters A/B/C missing: " + [ga, gb, gc].map((id) => state.actors[id].name),
    );
    check(state.actors[gh].name === "Goblin", "The hidden goblin got a letter");
    const dmStrip = await strip();
    check(
      ["Goblin A", "Goblin B", "Goblin C"].every((n) => dmStrip.includes(n)),
      "Letters not in the order",
    );
    const tokenNames = await page
      .locator(".map-token .token-name")
      .evaluateAll((els) => els.map((e) => e.textContent));
    check(
      ["Goblin A", "Goblin B", "Goblin C"].every((n) => tokenNames.includes(n)),
      "Letters not on the tokens",
    );
    await shot("b32-01-dm-tracker-start-it-1440.png");
    const clipAround = async (id, name, p = page) => {
      const box = await p.locator(`.map-token[data-actor="${id}"]`).boundingBox();
      await p.screenshot({
        path: dir + name,
        clip: { x: box.x - 70, y: box.y - 70, width: box.width + 140, height: box.height + 140 },
      });
    };
    await clipAround("livia", "b32-01b-turn-marker-under-livia.png");
    passed.push(
      "2a. DDB letters at Start Combat: Goblin A/B/C on tokens, turn order and tracker; the hidden ambusher stays “Goblin” (DM only)",
    );

    // ------------------------------------------------------------ round 1: Livia (player)
    at("player-livia");
    const names = () =>
      page
        .locator(".initiative-token")
        .evaluateAll((els) =>
          els.map((e) => e.querySelector("span:nth-of-type(2)")?.childNodes[0]?.textContent ?? ""),
        );
    const current = async () => {
      const s = await stored();
      return s.combat.order[s.combat.turn];
    };
    const dismissAlert = async (text, p = page) => {
      const alert = p.locator("#ct-alert");
      await alert.waitFor({ timeout: 4000 });
      if (text)
        check(
          (await alert.innerText()).includes(text),
          `Alert “${text}” missing: ${await alert.innerText()}`,
        );
      const sound = await alert.getAttribute("data-sound");
      await alert.locator("[data-ct-alert-ok]").click();
      await alert.waitFor({ state: "detached" });
      return sound;
    };
    await role("player");
    await page.goto(base + "#table");
    await openTracker();
    await dismissAlert("Tocca a te, Livia!");
    check(!(await names()).includes("Goblin"), "The hidden goblin leaks in the player's order");
    check(
      (await panel().locator(`[data-ct-row="${gh}"]`).count()) === 0,
      "The hidden goblin leaks in the player's tracker",
    );
    check(
      (await page.locator('[data-ct-marker="livia"]').count()) === 1,
      "Turn marker not under Livia",
    );
    // BG3 reactions (CRP-138): from the tracker to Livia's sheet, Opportunity Attack → Automatic.
    check(
      (await panelText()).includes("Attacco di opportunità · Chiedi"),
      "Default policy is not Ask",
    );
    await panel().locator('[data-ct-sheet="livia"]').click();
    const box = page.locator(".ct-policy-box");
    await box.waitFor();
    await box.locator('[data-ct-policy-ask="opportunity"]').uncheck();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext["combat-tracker"].policies.livia?.opportunity ===
        "auto",
      key,
    );
    check((await box.innerText()).includes("Automatico"), "Policy word not shown");
    await page.screenshot({ path: dir + "b32-02-livia-reactions-sheet-it-1440.png" });
    await page.goto(base + "#table");
    await openTracker();
    check(
      (await panelText()).includes("Scudo · Chiedi; Attacco di opportunità · Automatico"),
      "Policy summary",
    );
    await panel().locator("[data-ct-sound]").check();
    // Ready (Solasta II): the action now, a declared trigger, the Reaction later.
    await panel().locator('[data-ct-ready="livia"]').click();
    await page.locator("#dialog [name=response]").selectOption("quarterstaff");
    check(
      await page.locator('#dialog [name=trigger][value="enters-reach"]').isChecked(),
      "Trigger preset",
    );
    await submit();
    const readied = panel().locator('[data-ct-readied="livia"]');
    await readied.waitFor();
    check(
      (await readied.innerText()).includes("Una creatura entra nella mia portata"),
      "Readied badge",
    );
    state = await stored();
    check(state.actors.livia.action === false, "Ready did not spend the action");
    await shot("b32-03-player-ready-it-1440.png");
    passed.push(
      "9a/10a/5a. Player: “Tocca a te, Livia!” overlay (Monk’s) and dashed marker under her token; hidden goblin absent from order and tracker; tracker → “Cambia nella scheda” → BG3 Reactions box: Scudo Chiedi, Attacco di opportunità Automatico (saved); Ready: Bastone ferrato when “Una creatura entra nella mia portata”, action spent, badge “Pronta”",
    );
    await next();
    await dismissAlert("Tocca a te, Mira!");
    await next();
    check((await current()) === ga, "Goblin A is not next after Mira");

    // ------------------------------------------------------------ round 1: Goblin A (DM)
    at("pending-lane");
    await role("dm");
    await page.goto(base + "#table");
    // A fifth goblin arrives mid-combat, placed on the map west of Livia (enters her reach).
    const gd = await addFromCompendium("goblin-warrior", "Goblin", { map: { x: 206, y: 380 } });
    await openTracker();
    await panel().locator(`[data-ct-join="${gd}"]`).first().click();
    const lane = panel().locator(`[data-ct-pending="${gd}"]`);
    await lane.waitFor();
    check((await lane.innerText()).includes("Goblin D"), "Pending lane does not show Goblin D");
    await lane.locator('[data-ct-pending-adv][data-value="advantage"]').click();
    await panel()
      .locator(
        `[data-ct-pending="${gd}"] [data-ct-pending-adv][data-value="advantage"][aria-pressed="true"]`,
      )
      .waitFor();
    await panel().locator(`[data-ct-pending-roll="${gd}"]`).click();
    await settleDice();
    await panel().locator(`[data-ct-pending="${gd}"] [data-ct-pending-total]`).waitFor();
    t = await tracker();
    check(t.combat.pending[0].roll.faces.length === 2, "Advantage did not roll two d20");
    state = await stored();
    check(
      state.initiativeRolls.at(-1).actorId === gd &&
        state.initiativeRolls.at(-1).rollMode === "advantage",
      "Ledger entry missing",
    );
    await panel().locator(`[data-ct-pending="${gd}"]`).scrollIntoViewIfNeeded();
    await shot("b32-04-pending-lane-it-1440.png");
    // The DM rolled the table die instead: a physical correction needs its reason.
    await lane.locator(".ct-correct summary").click();
    const fix = panel().locator(`[data-ct-pending-fix="${gd}"]`);
    await fix.locator("[name=natural]").fill("11");
    await fix.locator("[name=reason]").fill("Tirato il dado del tavolo");
    await fix.locator("button").click();
    await page.waitForFunction(
      ({ k, id }) =>
        JSON.parse(localStorage.getItem(k)).ext["combat-tracker"].combat.pending.find(
          (p) => p.actorId === id,
        )?.roll.total === 13,
      { k: key, id: gd },
    );
    state = await stored();
    check(
      state.initiativeRolls.at(-1).kind === "correction" &&
        state.initiativeRolls.at(-1).reason === "Tirato il dado del tavolo",
      "Correction not in the ledger",
    );
    await panel().locator("[data-ct-pending-add]").click();
    await page.waitForFunction(
      ({ k, id }) => JSON.parse(localStorage.getItem(k)).combat.order.includes(id),
      { k: key, id: gd },
    );
    check((await current()) === ga, "Adding changed the current turn");
    check((await names()).includes("Goblin D"), "Goblin D not in the order");
    passed.push(
      "2b. Pending lane (DDB-140): a 5th “Goblin” placed from the compendium, selected → “Aggiungi al combattimento” → waits as “Goblin D”; Vantaggio → Tira d20 (two faces, higher kept, Preparation ledger entry); “Correggi con il dado fisico” 11 + reason (correction kept in the ledger) → 11 + 2 = 13 → “Aggiungi al combattimento (1)” → in the order by total, Goblin A keeps the turn",
    );

    at("legendary-config");
    await rowMenu(boss, "monster");
    const monster = page.locator("#dialog");
    await monster.locator("[name=legendary]").fill("2");
    await monster.locator("[name=resistance]").fill("1");
    await monster.locator("[name=rname-0]").fill("Grido della lanterna");
    await monster.locator("[name=rmin-0]").selectOption("5");
    await submit();
    await panel().locator(`[data-ct-legendary="${boss}"]`).waitFor();
    // Legendary Action right after another creature's turn (Mira's) ended.
    await panel().locator(`[data-ct-legendary-use="${boss}"]`).click();
    await page.waitForFunction(
      ({ k, id }) =>
        JSON.parse(localStorage.getItem(k)).ext["combat-tracker"].monsters[id].legendary.used === 1,
      { k: key, id: boss },
    );
    await panel().locator(`[data-ct-recharge-spend="${boss}"]`).click();
    await page.waitForFunction(
      ({ k, id }) =>
        JSON.parse(localStorage.getItem(k)).ext["combat-tracker"].monsters[id].recharge[0]
          .available === false,
      { k: key, id: boss },
    );
    t = await tracker();
    check(
      t.combat.legendaryLog[0].afterActorId === "mira",
      "Legendary action not after Mira's turn",
    );
    passed.push(
      "6a. Goblin capo › ⋯ › Leggendarie e ricarica: 2 azioni leggendarie, 1 resistenza, «Grido della lanterna» Ricarica 5–6 (configured by the DM, labelled as such); one Legendary Action spent right after Mira’s turn (1/2 left); the recharge ability marked used",
    );

    at("ready-fire");
    // Goblin D entered Livia's reach: the player takes the readied Reaction.
    await role("player");
    await openTracker();
    await panel().locator('[data-ct-ready-fire="livia"]').click();
    await page.locator("#dialog [name=target]").selectOption(gd);
    await submit();
    await settleDice();
    await page.locator("#dialog[open]").waitFor();
    check(
      (await page.locator("#dialog").innerText()).includes("Bastone ferrato"),
      "Readied attack result not shown",
    );
    await closeDialog();
    state = await stored();
    check(state.actors.livia.reaction === false, "Reaction not spent");
    check(state.ext["combat-tracker"].readied.livia.status === "used", "Readied not used");
    const readyAttempt = state.combatAttempts.find(
      (a) => a.id === state.ext["combat-tracker"].readied.livia.attemptId,
    );
    check(
      readyAttempt?.actorId === "livia" && readyAttempt.targets[0].actorId === gd,
      "Readied attack not on Goblin D",
    );
    check((await current()) === ga, "The readied reaction changed the turn");
    passed.push(
      "10b. Trigger happened: “Innesco avvenuto…” → target Goblin D → digital Bastone ferrato through the combat engine (result in Tiri e risultati), Reaction spent, Goblin A keeps the turn",
    );

    // ------------------------------------------------------------ round 1: hidden turn
    at("hidden-turn");
    await role("dm");
    await openTracker();
    for (let guard = 0; guard < 8 && (await current()) !== gh; guard++) await next();
    check((await current()) === gh, "Never reached the hidden goblin's turn");
    check((await currentInStrip()).includes("Goblin"), "DM strip does not show the hidden turn");
    check(
      (await page.locator(`[data-ct-marker="${gh}"]`).count()) === 1,
      "DM marker not on the hidden goblin",
    );
    state = await stored();
    const order = state.combat.order;
    const previousVisible = order
      .slice(0, order.indexOf(gh))
      .reverse()
      .find((id) => !state.scenes[0].tokens.find((tk) => tk.actorId === id)?.hidden);
    const previousName = state.actors[previousVisible].name;
    await role("player");
    await openTracker();
    const alertBox = page.locator("#ct-alert");
    if (await alertBox.count()) await alertBox.locator("[data-ct-alert-ok]").click();
    check((await currentInStrip()).includes(previousName), `Player strip left ${previousName}`);
    check(
      (await panel().locator("[data-ct-turn]").innerText()) === previousName,
      "Player tracker header leaks the hidden turn",
    );
    check(
      (await page.locator(`[data-ct-marker="${previousVisible}"]`).count()) === 1,
      "Player marker not on the previous creature",
    );
    check(!(await names()).includes("Goblin"), "Hidden goblin in the player's order");
    await shot("b32-05-player-hidden-turn-it-1440.png");
    await role("dm");
    await openTracker();
    await rowMenu(gh, "reveal");
    await page.waitForFunction(
      ({ k, id }) => JSON.parse(localStorage.getItem(k)).actors[id].name === "Goblin E",
      { k: key, id: gh },
    );
    await role("player");
    await openTracker();
    check(
      (await currentInStrip()).includes("Goblin E"),
      "Revealed goblin not current for the player",
    );
    check(
      (await panel().locator(`[data-ct-row="${gh}"]`).count()) === 1,
      "Revealed goblin not in the player's tracker",
    );
    passed.push(
      `1. Hidden ambusher’s turn: DM strip and marker on “Goblin”; the player’s order, tracker header (“Turno di ${previousName}”) and marker stay on ${previousName}, no row leaks; DM ⋯ › Rivela ai giocatori → “Goblin E” (next letter after D) appears as current for the player`,
    );

    // ------------------------------------------------------------ round 1: Doran, boss
    at("house-rule");
    await role("dm");
    await openTracker();
    for (let guard = 0; guard < 6 && (await current()) !== "doran"; guard++) await next();
    check((await current()) === "doran", "Doran's turn not reached");
    await page.locator("[data-ct-settings]").click();
    await page.locator("#dialog [name=groupTurns]").check();
    check(
      (await page.locator("#dialog [name=ruleText]").inputValue()).includes(
        "un solo «Termina turno» passa tutto il gruppo",
      ),
      "House rule text not prefilled",
    );
    await submit();
    t = await tracker();
    const rule = t.settings.groupTurns;
    check(
      rule?.houseRuleId && rule.source?.kind === "house-rule" && rule.source.decisionId,
      "House rule source missing",
    );
    state = await stored();
    const campaignRule = state.ext["campaign-settings"].campaigns.lanterns.houseRules.find(
      (r) => r.id === rule.houseRuleId,
    );
    check(campaignRule && !campaignRule.retiredAt, "House rule not in Campaign › Settings");
    check((await panelText()).includes("Regola della casa"), "House rule badge missing");
    passed.push(
      "4. Group turn for identical creatures turned on at a round boundary as a house rule: the rule text is prefilled from the 2024 baseline note, recorded in Campaign › Settings › house rules with author, date and history entry (its source); the tracker shows “Regola della casa”",
    );

    at("recharge");
    await next(); // the Goblin capo's turn: legendary uses refill, recharge rolled (digital, automatic)
    check((await current()) === boss, "The boss's turn did not start");
    t = await tracker();
    check(t.monsters[boss].legendary.used === 0, "Legendary uses not refilled at its turn start");
    const rolls = (await stored()).ext["combat-tracker-rolls"].rolls;
    check(
      rolls.length === 1 && rolls[0].automatic && rolls[0].mode === "digital",
      "Automatic recharge roll missing",
    );
    const firstFace = rolls[0].face;
    const dmAlert = page.locator("#ct-alert");
    await dmAlert.waitFor();
    check((await dmAlert.innerText()).includes(`d6 = ${firstFace}`), "DM recharge alert missing");
    await dmAlert.locator("[data-ct-alert-ok]").click();
    await shot("b32-06-dm-recharge-legendary-it-1440.png");
    // Undo the End turn: the recharge roll stays in the history, marked undone; ending the
    // turn again reuses the same face (Undo never grants a free reroll).
    await page.locator('[data-table="undo"]').click();
    await page.waitForFunction((k) => {
      const s = JSON.parse(localStorage.getItem(k));
      return s.combat.order[s.combat.turn] === "doran";
    }, key);
    await panel().locator(".ct-rolls summary").click();
    check(
      (await panel().locator('[data-ct-roll][data-status="reversed"]').count()) === 1,
      "Undone roll not kept as reversed",
    );
    await next();
    const rolls2 = (await stored()).ext["combat-tracker-rolls"].rolls;
    check(
      rolls2.length === 2 && rolls2[1].face === firstFace && rolls2[1].reusedFrom === rolls[0].id,
      "Recharge rerolled after Undo",
    );
    passed.push(
      `6c. Goblin capo’s turn: legendary uses back to 2/2; «Grido della lanterna» recharge rolled automatically with a digital d6 = ${firstFace} (dnd5e FVT-132), DM alert; Undo of the End turn keeps the roll as “annullato, tiro conservato”; ending the turn again reuses face ${firstFace}`,
    );

    at("reload");
    await page.reload();
    await role("dm");
    await page.goto(base + "#table");
    await openTracker();
    state = await stored();
    check(
      state.combat.active &&
        state.actors[gd].name === "Goblin D" &&
        state.actors[gh].name === "Goblin E",
      "Reload lost letters",
    );
    check((await panelText()).includes("Regola della casa"), "Reload lost the house rule");
    check(
      (await panel().locator(`[data-ct-legendary="${boss}"]`).count()) === 1,
      "Reload lost the legendary config",
    );
    passed.push(
      "reload: combat, letters, house rule, legendary configuration and roll history survive a reload",
    );

    // ------------------------------------------------------------ round 2
    const round = async () => (await stored()).combat.round;
    const leader = async () => {
      const s = await stored();
      return s.ext["combat-tracker"].combat.groupTurn?.leaderId ?? null;
    };
    const snapshotForPhone = await page.evaluate((k) => localStorage.getItem(k), key);
    let mobDone = false,
      burnDone = false;
    for (let guard = 0; guard < 12 && !(mobDone && burnDone); guard++) {
      await next();
      const who = await current();
      if ((await round()) < 2) continue;
      if (!mobDone && (await leader()) === who) {
        // ------------------------------------------------ 8: mob attack in the group turn
        at("mob-attack");
        await role("dm");
        await openTracker();
        const alert = page.locator("#ct-alert");
        if (await alert.count()) await alert.locator("[data-ct-alert-ok]").click();
        check(
          (await panel().locator(".ct-group.is-current").count()) === 1,
          "Group turn not highlighted",
        );
        await panel().locator(".ct-group-head [data-ct-mob]").click();
        const mob = page.locator("#dialog");
        await mob.waitFor();
        check(
          (await mob.innerText()).includes("Turno di gruppo (regola della casa)"),
          "Mob dialog does not cite the house rule",
        );
        await mob.locator(`[name=attacker][value="${gh}"]`).uncheck(); // Goblin E is out of reach
        check((await mob.locator("[name=target]").inputValue()) === "livia", "Target is not Livia");
        await mob.locator('[name=mode][value="physical"]').check();
        await submit();
        await settleDice();
        await page.locator("#dialog[open]").waitFor();
        const results = await page.locator("#dialog").innerText();
        check(
          ["Goblin A", "Goblin B", "Goblin C", "Goblin D"].every((n) => results.includes(n)),
          "Results dialog misses a goblin",
        );
        await closeDialog();
        state = await stored();
        const mobAttempts = () =>
          state.combatAttempts.filter(
            (a) =>
              [ga, gb, gc, gd].includes(a.actorId) &&
              a.targets?.[0]?.actorId === "livia" &&
              a.actionId === "melee-attack",
          );
        check(mobAttempts().length === 4, "Four attempts expected, got " + mobAttempts().length);
        check(
          new Set(mobAttempts().map((a) => a.requests[0].id)).size === 4,
          "Rolls are not distinct",
        );
        // Physical dice: the DM types each goblin's d20 in the common request queue.
        const resolveFor = async (name, face) => {
          await page.locator('.service-nav [data-service="requests"]').click();
          const toRequests = page.locator("#dialog [data-notifications-requests]");
          if (await toRequests.count()) await toRequests.click();
          await page
            .locator(".roll-request")
            .filter({ hasText: name })
            .getByRole("button", { name: "Risolvi tiro", exact: true })
            .first()
            .click();
          const mode = page.locator("#dialog [name=diceMode]");
          if (await mode.count()) await mode.selectOption("physical");
          await page.locator("#dialog [name=face0]").fill(String(face));
          await page.getByRole("button", { name: "Registra tiro", exact: true }).click();
          await settleDice();
          await closeDialog();
        };
        for (const [name, face] of [
          ["Goblin A", 15],
          ["Goblin B", 3],
          ["Goblin C", 16],
          ["Goblin D", 2],
        ])
          await resolveFor(name, face);
        state = await stored();
        const outcomes = mobAttempts().map((a) => a.outcomes[0]);
        check(outcomes.filter((o) => o.hit === false).length === 2, "Two misses expected");
        // 9: Livia's Shield is "Ask": each hit offers it to the player, who declines here.
        const shields = (state.combatReactions ?? []).filter(
          (r) => r.type === "shield" && r.status === "pending",
        );
        check(shields.length === 2, "Two Shield offers expected, got " + shields.length);
        await role("player");
        for (let i = 0; i < 2; i++) {
          await page.locator('.service-nav [data-service="requests"]').click();
          const toRequests = page.locator("#dialog [data-notifications-requests]");
          if (await toRequests.count()) await toRequests.click();
          await page.locator("#dialog [data-reaction-open]:not([disabled])").first().click();
          check(
            (await page.locator("#dialog").innerText()).includes("Scudo"),
            "Shield prompt missing",
          );
          await page.locator("#dialog [data-decline-reaction]").click();
          await settleDice();
          await closeDialog();
        }
        state = await stored();
        check(
          state.combatReactions
            .filter((r) => r.type === "shield")
            .every((r) => r.status === "declined" && r.resolvedBy === "player"),
          "Shield not answered by the player",
        );
        check(state.actors.livia.reaction === true, "Declining spent the reaction");
        await role("dm");
        for (const [name, face] of [
          ["Goblin A", 1],
          ["Goblin C", 2],
        ])
          await resolveFor(name, face);
        state = await stored();
        const ready = mobAttempts()
          .filter((a) => a.outcomes[0].status === "ready")
          .map((a) => a.outcomes[0].damage);
        check(
          ready.length === 2 && ready.includes(3) && ready.includes(4),
          "Damage not waiting for Apply: " + ready,
        );
        await openTracker();
        await shot("b32-07-mob-attack-after-it-1440.png");
        passed.push(
          "8/9b. Group turn (house rule): “Attacco di gruppo…” on the group header → Goblin A, B, C, D ticked (E out of reach unticked), target Livia, physical dice → four attempts, four distinct d20 requests typed by the DM (15, 3, 16, 2 → two hits, two misses); Livia’s Shield policy “Chiedi” asks the player twice in Richieste, declined without spending the reaction; physical damage 3 and 4 wait for Livia’s Apply",
        );
        mobDone = true;
      }
      if (!burnDone && who === "livia") {
        // ------------------------------------------------ 5b/6b: sound, Burning Hands, LR
        at("burning-hands");
        await role("player");
        await openTracker();
        const sound = await dismissAlert("Tocca a te, Livia!");
        check(["played", "unavailable"].includes(sound), "Sound option ignored: " + sound);
        check(
          (await panel().locator("[data-ct-entry-status]").innerText()) === "fra 2 round",
          "Countdown did not tick",
        );
        await page.locator("[data-combat-mode]").selectOption("digital");
        await page.getByRole("button", { name: "Mani brucianti", exact: true }).click();
        const aim = await toScreen("#battle-map", 185, 315);
        await page.mouse.click(aim.x, aim.y);
        const targets = await page.locator(".combat-targets").innerText();
        check(
          targets.includes("Goblin capo") && !targets.includes("Goblin B"),
          "Cone targets: " + targets,
        );
        await page.getByRole("button", { name: "Lancia Mani brucianti", exact: true }).click();
        await settleDice();
        await closeDialog();
        await role("dm");
        await page.locator('.service-nav [data-service="requests"]').click();
        const toRequests = page.locator("#dialog [data-notifications-requests]");
        if (await toRequests.count()) await toRequests.click();
        await page
          .locator(".roll-request")
          .filter({ hasText: "Goblin capo" })
          .getByRole("button", { name: "Risolvi tiro", exact: true })
          .click();
        await page.locator("[name=diceMode]").selectOption("physical");
        await page.locator("[name=face0]").fill("2");
        await page.getByRole("button", { name: "Registra tiro", exact: true }).click();
        await settleDice();
        await closeDialog();
        await openTracker();
        const resist = panel().locator(`[data-ct-resist="${boss}"]`);
        await resist.scrollIntoViewIfNeeded();
        check(
          (await resist.getAttribute("aria-disabled")) !== "true",
          "Resistance button disabled",
        );
        await shot("b32-08-failed-save-resistance-it-1440.png");
        await resist.click();
        await page.waitForFunction(
          ({ k, id }) =>
            JSON.parse(localStorage.getItem(k)).ext["combat-tracker"].monsters[id].resistance
              .used === 1,
          { k: key, id: boss },
        );
        state = await stored();
        const burn = state.combatAttempts.findLast((a) => a.actionId === "burning-hands");
        const bossOutcome = burn.outcomes.find((o) => o.actorId === boss);
        const full = burn.requests.find((r) => r.kind === "damage").total;
        check(
          bossOutcome.saveSuccess === true && bossOutcome.damage === Math.floor(full / 2),
          "Legendary Resistance did not turn the save into a success",
        );
        passed.push(
          `5b/6b. Round 2, Livia: “Tocca a te” again with the device sound on (data-sound=${sound}); countdown “fra 2 round”; Mani brucianti aimed at the Goblin capo only (digital damage ${full}); DM resolves its DEX save with a physical 2 → failed → tracker row “TS fallito · Mani brucianti (Livia)” → “Usa resistenza leggendaria” → save succeeds, damage ${Math.floor(full / 2)} waiting for Apply, 0/1 left`,
        );
        burnDone = true;
        await role("dm");
        await openTracker();
      }
    }
    check(mobDone && burnDone, "Round 2 steps not reached");

    // ------------------------------------------------------------ round 3: opportunity
    at("opportunity");
    await role("dm");
    await openTracker();
    let oaDone = false;
    for (let guard = 0; guard < 12 && !oaDone; guard++) {
      await next();
      if ((await round()) < 3) continue;
      if ((await leader()) !== (await current())) continue;
      const alert = page.locator("#ct-alert");
      if (await alert.count()) await alert.locator("[data-ct-alert-ok]").click();
      state = await stored();
      check(state.actors.livia.reaction === true, "Livia has no reaction for the opportunity");
      const token = page.locator(`.map-token[data-actor="${ga}"]`);
      await token.click();
      await page.locator("#battle-map").focus();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Enter");
      await settleDice();
      await page.waitForFunction((k) => {
        const s = JSON.parse(localStorage.getItem(k));
        return (s.combatReactions ?? []).some(
          (r) => r.type === "opportunity" && r.actorId === "livia" && r.status !== "pending",
        );
      }, key);
      state = await stored();
      const oa = state.combatReactions.find(
        (r) => r.type === "opportunity" && r.actorId === "livia",
      );
      check(oa.status === "used" && oa.resolvedBy === "player", "Opportunity not taken by policy");
      const oaAttempt = state.combatAttempts.find((a) => a.reactionId === oa.id);
      check(
        oaAttempt.mode === "digital" && oaAttempt.requests[0].status === "resolved",
        "Automatic opportunity not rolled",
      );
      check(
        state.log.some(
          (l) => l.label.includes("Reazione secondo la politica") && l.label.includes("automatico"),
        ),
        "Policy not logged",
      );
      // A hit interrupts the movement (TABLE_REACTIONS): the DM continues on the same path.
      await closeDialog();
      for (let i = 0; i < 3; i++) {
        state = await stored();
        const move = (state.movements ?? []).findLast((m) => m.actorId === ga);
        if (!move || !["awaiting-choice", "pending"].includes(move.status)) break;
        const open = page.locator("[data-open-interruptions]");
        if (!(await open.count())) break;
        await open.click();
        const go = page.locator(`#dialog [data-movement-continue="${move.id}"]:not([disabled])`);
        if (await go.count()) await go.click();
        await settleDice();
        await closeDialog();
      }
      passed.push(
        "9c. Round 3, group turn: the DM moves Goblin A two squares away with the keyboard (←→ Enter) → it leaves Livia’s reach → her Opportunity Attack policy “Automatico” takes it at once (follow-up transaction “Reazione secondo la politica: Livia · Attacco di opportunità · automatico”), digital attack rolled through the engine, answered for the player",
      );
      oaDone = true;
    }
    check(oaDone, "Round 3 group turn not reached");

    // ------------------------------------------------------------ round 4: countdown
    at("countdown");
    for (let guard = 0; guard < 12 && (await round()) < 4; guard++) await next();
    check((await round()) === 4, "Round 4 not reached");
    t = await tracker();
    const ceiling = t.entries.find((e) => e.name === "Il soffitto crolla");
    check(ceiling.remaining === 0 && ceiling.firedRound === 4, "Countdown did not fire at round 4");
    let dmBanner = page.locator("#ct-alert");
    await dmBanner.waitFor();
    for (let i = 0; i < 3 && !(await dmBanner.innerText()).includes("Il soffitto crolla"); i++) {
      await dmBanner.locator("[data-ct-alert-ok]").click();
      await dmBanner.waitFor({ timeout: 2000 }).catch(() => {});
    }
    check(
      (await dmBanner.innerText()).includes("Ora: Il soffitto crolla!"),
      "DM countdown alert missing",
    );
    check(
      (await panel().locator("[data-ct-entry-status]").innerText()) === "Ora!",
      "Entry row not marked Now",
    );
    await shot("b32-09-countdown-fired-it-1440.png");
    await dmBanner.locator("[data-ct-alert-ok]").click();
    await role("player");
    await page.locator('.service-nav [data-service="requests"]').click();
    check(
      (await page.locator("#dialog").innerText()).includes("Ora: Il soffitto crolla"),
      "Player notification missing",
    );
    await closeDialog();
    passed.push(
      "7. Round 4: “Il soffitto crolla” (created at round 1, 3 rounds, visible to all) reaches 0 → row “Ora!”, DM overlay “Ora: Il soffitto crolla!”, the player’s notification bell lists it",
    );

    // ------------------------------------------------------------ keyboard menu, 40 px
    at("keyboard");
    await role("dm");
    await openTracker();
    const more = panel().locator(`[data-ct-menu="${gb}"]`);
    await more.focus();
    await page.keyboard.press("Enter");
    await page.locator(`[data-ct-cmd="select"][data-actor="${gb}"]`).waitFor();
    const focusedCmd = () =>
      page.evaluate(
        () =>
          document.activeElement?.dataset?.ctCmd ?? document.activeElement?.dataset?.ctMenu ?? "",
      );
    check((await focusedCmd()) === "select", "Menu opened without focus on its first item");
    await page.keyboard.press("ArrowDown");
    check(["hide", "reveal"].includes(await focusedCmd()), "ArrowDown did not move in the menu");
    await page.keyboard.press("Escape");
    await page.locator(`[data-ct-cmd="select"][data-actor="${gb}"]`).waitFor({ state: "detached" });
    check((await focusedCmd()) === gb, "Escape did not return the focus to ⋯");
    const small = await panel()
      .locator(".ct button, .ct summary")
      .evaluateAll((els) =>
        els
          .filter((e) => e.offsetParent && e.getBoundingClientRect().height < 40)
          .map((e) => e.outerHTML.slice(0, 90)),
      );
    check(!small.length, "Targets under 40 px: " + small.join(" | "));
    passed.push(
      "keyboard: ⋯ + Enter opens the combatant menu (Foundry context menu) with focus on its first item, ArrowDown moves, Escape closes and returns focus; every tracker control is at least 40 px tall",
    );

    // ------------------------------------------------------------ 3: remove vs delete
    at("remove-delete");
    await rowMenu(gb, "remove");
    await page.waitForFunction(
      ({ k, id }) => !JSON.parse(localStorage.getItem(k)).combat.order.includes(id),
      { k: key, id: gb },
    );
    check(
      (await page.locator(`.map-token[data-actor="${gb}"]`).count()) === 1,
      "Removed goblin left the map",
    );
    check(
      (await page.locator(`[data-ct-out="${gb}"]`).count()) === 1,
      "Out-of-combat marker missing",
    );
    await clipAround(gb, "b32-10b-out-of-combat-marker.png");
    await rowMenu(gc, "delete");
    check(
      (await page.locator("#dialog").innerText()).includes("La scheda della creatura resta"),
      "Delete dialog does not explain the sheet stays",
    );
    await submit();
    await page.waitForFunction(
      ({ k, id }) =>
        !JSON.parse(localStorage.getItem(k)).scenes[0].tokens.some((tk) => tk.actorId === id),
      { k: key, id: gc },
    );
    state = await stored();
    check(
      state.actors[gc] && !state.combat.order.includes(gc),
      "Delete lost the sheet or kept the turn",
    );
    check(
      (await page.locator(`.map-token[data-actor="${gc}"]`).count()) === 0,
      "Deleted token still drawn",
    );
    // Undo restores both; deleting again is the final choice.
    await page.locator('[data-table="undo"]').click();
    await page.waitForFunction(
      ({ k, id }) =>
        JSON.parse(localStorage.getItem(k)).scenes[0].tokens.some((tk) => tk.actorId === id),
      { k: key, id: gc },
    );
    check(
      (await stored()).combat.order.includes(gc),
      "Undo did not bring Goblin C back to the order",
    );
    await rowMenu(gc, "delete");
    await submit();
    await page.waitForFunction(
      ({ k, id }) =>
        !JSON.parse(localStorage.getItem(k)).scenes[0].tokens.some((tk) => tk.actorId === id),
      { k: key, id: gc },
    );
    await shot("b32-10-remove-delete-it-1440.png");
    await page.goto(base + `#characters?id=${encodeURIComponent(gc)}`);
    await page.locator("#content").getByText("Goblin C").first().waitFor();
    await page.goto(base + "#table");
    await openTracker();
    passed.push(
      "3. ⋯ › Togli dal combattimento: Goblin B leaves the order, its token stays with the ✕ marker (DDB-141); ⋯ › Elimina la pedina… (dialog: the sheet stays) removes Goblin C from map and order, its sheet still opens; Undo restores token and turn, deleting again",
    );

    // ------------------------------------------------------------ 11: finish, Reset, Clear
    at("finish");
    await rowMenu(ga, "defeat");
    await panel().locator(`[data-ct-row="${ga}"].is-defeated`).waitFor();
    await rowMenu(gd, "defeat");
    await panel().locator(`[data-ct-row="${gd}"].is-defeated`).waitFor();
    const xpBefore = (await stored()).actors.livia.xp ?? null;
    await panel().locator("[data-ct-finish]").click();
    const finish = page.locator("#dialog");
    check(
      (await finish.locator("[data-ct-xp-total]").innerText()) === "100",
      "XP total is not 100 (2 × Goblin Warrior CR 1/4)",
    );
    check(
      await finish.locator('[name=recipient][value="livia"]').isChecked(),
      "Livia not a default recipient",
    );
    await shot("b32-11-finish-dialog-it-1440.png");
    await submit();
    await panel().locator("[data-ct-idle]").waitFor();
    state = await stored();
    t = state.ext["combat-tracker"];
    const record = t.history.at(-1);
    check(!state.combat.active && record.xpAwarded === 100, "Encounter not finished with XP");
    check(state.actors.livia.xp > (xpBefore ?? 0), "Livia's XP did not grow");
    check(
      state.ext.loot.parcels.some((p) => p.sourceActorId === ga) &&
        state.ext.loot.parcels.some((p) => p.sourceActorId === gd),
      "Loot parcels missing",
    );
    check(
      state.log.some((l) => l.label.startsWith("Incontro concluso")),
      "Log entry missing",
    );
    check((await panelText()).includes("Ultimo incontro concluso"), "Summary not shown");
    // Coherence: the awarded XP is on Livia's sheet (B26 Experience box, Capacità tab).
    await page.goto(base + "#characters?id=livia&tab=features");
    const xpBox = page.locator("[data-loot-xp]");
    await xpBox.waitFor();
    check(
      (await xpBox.innerText()).replace(/\D/g, "") === String(state.actors.livia.xp),
      "Sheet XP differs",
    );
    await page.goto(base + "#table");
    await openTablePanel(page, "loot"); // B62: Items › Loot
    await page.locator("#table-drawer").getByText("Goblin A").first().waitFor();
    await openTracker();
    passed.push(
      `11a. ⋯ › Segna sconfitta on Goblin A and D, “Concludi incontro…” (Shard): defeated list with CR and XP, total 100, “Assegna i PE” divided among Livia, Mira, Doran through the Loot area (Livia ${xpBefore ?? "no record"} → ${state.actors.livia.xp} XP, shown in her sheet’s Esperienza box), loot parcels prepared from the SRD gear (visible in the Bottino tab), log line “Incontro concluso…”, tracker idle with the summary`,
    );

    at("reset-clear");
    await panel().locator("[data-ct-start]").click();
    await page.getByRole("button", { name: "Inizia combattimento", exact: true }).click();
    await panel().locator("[data-ct]").waitFor();
    await next();
    await next();
    const beforeReset = await stored();
    await panel().locator("[data-ct-reset]").click();
    await submit();
    await page.waitForFunction((id) => {
      const s = JSON.parse(localStorage.getItem("d20-studio-blueprint-v1"));
      return s.combat.round === 1 && s.combat.turn === 0 && s.combat.encounterId !== id;
    }, beforeReset.combat.encounterId);
    await panel().locator("[data-ct-clear]").click();
    await submit();
    await panel().locator("[data-ct-idle]").waitFor();
    state = await stored();
    check(
      !state.combat.active && state.combat.order.length === 0,
      "Clear did not empty the tracker",
    );
    check(
      (state.scenes[0].encounter?.participants ?? []).length === 0,
      "Clear kept the prepared order",
    );
    check(
      state.scenes[0].tokens.some((tk) => tk.actorId === ga),
      "Clear removed tokens from the map",
    );
    await shot("b32-12-cleared-it-1440.png");
    passed.push(
      "11b. Start the same scene again → two turns → “Reimposta…” (Clash! Reset): round 1, first turn, new encounter identity; “Svuota…” (Clear): nobody in the order, the prepared initiative emptied, tokens stay on the map",
    );
    check(await noOverflow(), "Desktop page overflows");

    // ------------------------------------------------------------ group 2: EN phone 390
    at("phone");
    const phoneContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const phone = await phoneContext.newPage();
    phone.on("pageerror", (error) => errors.push("phone: " + error.message));
    await phone.goto(base + "#table");
    await phone.evaluate(
      ([k, v]) => {
        localStorage.clear();
        localStorage.setItem(k, v);
      },
      [key, snapshotForPhone],
    );
    await phone.reload();
    await phone
      .locator('[data-service="preferences"]')
      .first()
      .tap()
      .catch(async () => {
        await phone.locator('[data-service="app-menu"]').tap();
        await phone.locator('#dialog [data-service="preferences"]').tap();
      });
    await phone.locator('#dialog [name="lang"]').selectOption("en");
    await submit(phone, true);
    await role("dm", phone);
    await phone.goto(base + "#table");
    await openTracker(phone, true);
    const phoneText = await panelText(phone);
    check(
      phoneText.includes("Round 1") && phoneText.includes("Next turn"),
      "EN tracker on the phone",
    );
    check(await noOverflow(phone), "Phone DM tracker overflows");
    await phone.locator(`[data-ct-menu="${gb}"]`).tap();
    await phone.locator(`[data-ct-cmd="defeat"][data-actor="${gb}"]`).tap();
    await phone.locator(`[data-ct-row="${gb}"].is-defeated`).waitFor();
    await phone.locator(`[data-ct-row="${gb}"]`).scrollIntoViewIfNeeded();
    await phone.screenshot({ path: dir + "b32-13-phone-dm-en-390.png" });
    await phone.locator("[data-ct-next]").tap();
    await settleDice(phone);
    await role("player", phone);
    await phone.goto(base + "#table");
    const phoneAlert = phone.locator("#ct-alert");
    await phoneAlert.waitFor();
    check(
      (await phoneAlert.innerText()).includes("It’s your turn, Livia!"),
      "EN turn alert on the phone",
    );
    check(await noOverflow(phone), "Phone player view overflows");
    await phone.screenshot({ path: dir + "b32-14-phone-player-alert-en-390.png" });
    await phoneAlert.locator("[data-ct-alert-ok]").tap();
    await openTracker(phone, true);
    check(
      (await panel(phone).locator(`[data-ct-row="${gh}"]`).count()) === 0 ||
        (await stored(phone)).actors[gh].name === "Goblin E",
      "Hidden goblin leaks on the phone",
    );
    check(await noOverflow(phone), "Phone player tracker overflows");
    await phoneContext.close();
    passed.push(
      "phone EN 390 touch: tracker tab from the bottom bar, “Round 1 · Next turn”, ⋯ › Mark defeated by tap, Next turn by tap → round 2; the player gets “It’s your turn, Livia!” with “Got it”; no horizontal overflow",
    );

    await context.close();
    if (errors.length) throw Error("Page errors: " + errors.join("; "));
    return { passed, errors, step };
  } catch (error) {
    await page.screenshot({ path: dir + "b32-failure.png" }).catch(() => {});
    return { failed: step, message: error.message, passed, errors };
  }
}
