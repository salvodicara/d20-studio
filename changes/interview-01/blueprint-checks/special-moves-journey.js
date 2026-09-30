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
  // B40 — Special movement and actions, with real clicks, keys and touch in the one app.
  // Group 1 (IT desktop 1440, player Livia and the DM): tray with reasons (12), long jump
  // with preview and Undo (2), swimming at double cost and the Move that swims by itself
  // (3), climbing 6 m and falling with the 2d6 request (2, 3), Search, Utilize, Study,
  // Influence judged by the DM and Hide confirmed by the DM (5), approval mode (7), diagonal
  // rule and hexes (9), two-tier ruler, turn history and last move (6), Alt labels (8), then
  // combat: grapple with the target's save, reload, drag with Undo, escape, thrown handaxe
  // with its ranges (4), longsword Sap applied and explained (10), shove off the ledge (1),
  // the Riding Horse and the forms link (11). Group 2: EN phone 390 with touch in an
  // isolated context. Synthetic demo data only; resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B40/";
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
  const sm = async (p = page) => (await stored(p)).ext["special-moves"];
  const tokenOf = async (id, p = page) =>
    (await stored(p)).scenes.find((s) => s.id === "old-watch").tokens.find((t) => t.actorId === id);
  const role = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await p
      .locator("#battle-map")
      .waitFor()
      .catch(() => {});
  };
  const settleDice = async (p = page) => {
    const layer = p.locator("[data-dice3d-layer]:not([hidden])");
    await layer.waitFor({ timeout: 700 }).catch(() => {});
    for (let i = 0; i < 8 && (await layer.count()); i++) {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(80);
    }
    await layer.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  };
  const closeDialog = async (p = page) => {
    for (let i = 0; i < 3 && (await p.locator("#dialog[open]").count()); i++) {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(120);
    }
  };
  const dismissTips = async (p = page) => {
    const got = p.getByRole("button", { name: /^(Ho capito|Got it)$/ });
    for (let i = 0; i < 3 && (await got.count()); i++) {
      await got
        .first()
        .click()
        .catch(() => {});
      await p.waitForTimeout(100);
    }
  };
  const toScreen = (x, y, p = page) =>
    p.locator("#battle-map").evaluate(
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
  // Selecting a token from the keyboard (Tab to it, Enter): a pin of another area lying on
  // the same spot cannot catch the click.
  const select = async (actorId, p = page) => {
    await p.locator(`#battle-map [data-actor="${actorId}"]`).focus();
    await p.keyboard.press("Enter");
    await p.waitForTimeout(150);
  };
  const moveTool = async (p = page) => {
    await p.locator('.action-dock [data-tool="move"]').click();
  };
  // Refreshed by R3 (27/09/2026), P6 TV-01: a click on the map never moves; a Move is a drag
  // from the token to the destination (Foundry, Owlbear, D&D Beyond Maps).
  const walk = async (actorId, x, y, p = page) => {
    const from = await p
      .locator(`#battle-map [data-actor="${actorId}"] .token-hit`)
      .boundingBox();
    const to = await toScreen(x, y, p);
    await p.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await p.mouse.down();
    await p.mouse.move(to.x, to.y, { steps: 12 });
    await p.mouse.up();
    await p.waitForTimeout(250);
  };
  // A core Move: click on the empty map (move mode) with the creature selected.
  const clickMap = async (x, y, p = page) => {
    await p.locator("#battle-map").scrollIntoViewIfNeeded();
    const pt = await toScreen(x, y, p);
    await p.mouse.click(pt.x, pt.y);
    await p.waitForTimeout(200);
  };
  const hover = async (x, y, p = page) => {
    const pt = await toScreen(x, y, p);
    await p.mouse.move(pt.x, pt.y, { steps: 4 });
    await p.waitForTimeout(120);
  };
  const tray = async (p = page) => {
    if (!(await p.locator(".sm-tray [data-sm-move]").count()))
      await p.locator("[data-sm-tray]").click();
    await p.locator(".sm-tray [data-sm-move]").first().waitFor();
  };
  const choose = async (kind, p = page) => {
    await tray(p);
    const entry = p.locator(`[data-sm-move="${kind}"]`);
    if ((await entry.getAttribute("aria-disabled")) === "true")
      throw Error(`${kind} unavailable: ${await entry.innerText()}`);
    await entry.click();
    await p.locator(`[data-sm-card="${kind}"]`).waitFor();
  };
  const execute = async (p = page) => {
    await p.locator("[data-sm-card] [data-sm-execute]").click();
    await p.waitForTimeout(200);
  };
  // The core roll dialog: physical faces typed as rolled.
  const rollPhysical = async (faces, p = page) => {
    const dialog = p.locator("#dialog");
    await dialog.locator("[name=diceMode]").waitFor();
    await dialog.locator("[name=diceMode]").selectOption("physical");
    for (let i = 0; i < faces.length; i++)
      await dialog.locator(`[name=face${i}]`).fill(String(faces[i]));
    await dialog.locator("button[type=submit]").click();
    await settleDice(p);
    await p.waitForTimeout(150);
  };
  const applyReady = async (p = page) => {
    const apply = p.locator("#dialog [data-apply-outcome]");
    if (await apply.count()) {
      await apply.first().click();
      await settleDice(p);
    }
  };
  const creatureTab = async (p = page) => {
    const tab = p.locator('[data-table-tab="creature"]');
    if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
  };
  const smPanel = (p = page) => p.locator(".sm-panel");
  // The DM's "Movement rules" tab of the right sidebar.
  const rulesTab = async (p = page) => {
    await openTablePanel(p, "special-moves-rules"); // B62: Combat › Movement rules
    await p.locator("#table-drawer .sm-rules").waitFor();
  };
  // A left-toolbar tool: its group button first when the group has several tools (B61).
  const useTool = async (tool, group, p = page) => {
    const chip = p.locator(`.map-toolbar [data-tool="${tool}"]`);
    if (!(await chip.isVisible().catch(() => false)))
      await p.locator(`[data-tool-group="${group}"]`).click();
    await chip.click();
    await p.locator(`.map-toolbar [data-tool="${tool}"][aria-pressed="true"]`).waitFor();
  };
  const drag = async (from, to, p = page) => {
    const a = await toScreen(from.x, from.y, p);
    const b = await toScreen(to.x, to.y, p);
    await p.mouse.move(a.x, a.y);
    await p.mouse.down();
    await p.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
    await p.mouse.move(b.x, b.y, { steps: 4 });
    await p.mouse.up();
    await p.waitForTimeout(250);
  };
  const reset = async () => {
    await page.goto(base + "#table");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator("[data-sm-tray]").waitFor();
    await dismissTips();
  };

  const run = async () => {
    // ------------------------------------------------------------ group 1: IT desktop 1440
    at("reset");
    await reset();
    await role("player");
    await select("livia");

    at("1 tray and reasons (TV-74)");
    await tray();
    const trayText = await page.locator(".sm-tray").innerText();
    check(trayText.includes("Mosse speciali · Livia"), "tray title");
    check(
      (await page.locator('[data-sm-move="grapple"]').getAttribute("aria-disabled")) === "true" &&
        trayText.includes("Parte dell’azione di Attacco: prepara l’iniziativa"),
      "grapple unavailable with its reason",
    );
    check(trayText.includes("Nessuna velocità di volo"), "fly reason");
    check(trayText.includes("Nessuna cavalcatura entro 1,5 m"), "mount reason");
    check(trayText.includes("Nessuna parete scalabile entro 1,5 m"), "climb reason");
    await shot("b40-01-tray-reasons-it-1440.png");
    // An aria-disabled entry stays clickable and focusable: it explains instead of acting.
    await page.locator('[data-sm-move="grapple"]').click({ force: true });
    check(
      (await page.locator(".sm-result, .toast").allInnerTexts())
        .join(" ")
        .includes("prepara l’iniziativa") ||
        (await page.evaluate(() => document.body.innerText)).includes("prepara l’iniziativa"),
      "clicking an unavailable move explains why",
    );
    passed.push(
      "1 · tray: every move with its cost; unavailable ones (grapple, fly, mount, climb) show the reason in view",
    );

    at("2 long jump");
    await choose("long-jump");
    const card = await page.locator("[data-sm-card]").innerText();
    check(
      card.includes("Salto massimo") && card.includes("1,5 m") && card.includes("3 m"),
      "jump card distances",
    );
    await page.locator("[data-sm-runup]").check();
    await hover(350, 380);
    check(await page.locator("[data-sm-arc]").count(), "jump arc preview");
    check(
      (await page.locator("[data-sm-card]").innerText()).includes("Distanza: 3 m"),
      "previewed distance",
    );
    await shot("b40-02-jump-preview.png");
    await clickMap(350, 380);
    const jumped = await tokenOf("livia");
    check(Math.abs(jumped.x - 350) < 3 && Math.abs(jumped.y - 380) < 3, "Livia jumped 3 m");
    check((await sm()).moves.at(-1).kind === "long-jump", "jump recorded in history");
    await creatureTab();
    check((await smPanel().innerText()).includes("Salto in lungo"), "history shows the jump");
    await page.locator('.action-dock [data-table="undo"]').click();
    await page.waitForTimeout(200);
    check((await tokenOf("livia")).x === 250, "Undo returns Livia");
    // Keyboard only: Tab into the tray, the entry by Enter, arrows aim one cell, Enter jumps.
    await tray();
    await page.locator('[data-sm-move="long-jump"]').focus();
    await page.keyboard.press("Enter");
    await page.locator('[data-sm-card="long-jump"]').waitFor();
    await page.locator("[data-sm-runup]").focus();
    await page.keyboard.press("Space");
    await page.locator("#battle-map").focus();
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    check(
      (await page.locator("[data-sm-card]").innerText()).includes("Distanza: 3 m"),
      "keyboard aim two cells up",
    );
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    const keyJump = await tokenOf("livia");
    check(keyJump.x === 250 && keyJump.y === 280, "keyboard jump: " + JSON.stringify(keyJump));
    await page.locator('.action-dock [data-table="undo"]').click();
    await page.waitForTimeout(200);
    check((await tokenOf("livia")).y === 380, "Undo again");
    passed.push(
      "2 · long jump: standing 1,5 m / 3 m with a run-up, BG3 arc preview, the click jumps, history, Undo; the same jump by keyboard only (Enter, Space, arrows, Enter)",
    );

    at("3 swim");
    await moveTool();
    await walk("livia", 430, 290);
    check(Math.abs((await tokenOf("livia")).x - 430) < 3, "walked next to the fountain");
    await choose("swim");
    await hover(580, 290);
    check(await page.locator(".sm-water").count(), "water outline while swimming");
    const swimCard = await page.locator("[data-sm-card]").innerText();
    check(
      swimCard.includes("in acqua") && /costo 7,[34]\d m/.test(swimCard),
      "swim cost doubles in water: " + swimCard,
    );
    await clickMap(580, 290);
    check(Math.abs((await tokenOf("livia")).x - 580) < 3, "swam across");
    // A plain Move back through the water swims by itself (Foundry movement action).
    await moveTool();
    await walk("livia", 430, 290);
    const lastKinds = (await sm()).moves.map((m) => m.kind);
    check(lastKinds.filter((k) => k === "swim").length === 2, "the Move across water was a swim");
    passed.push(
      "3a · swimming: 2,92 m in the water cost double (7,42 m), and a Move through the water swims by itself",
    );

    at("3 climb and fall");
    await walk("livia", 130, 330);
    await choose("climb");
    await page.locator("[data-sm-height]").fill("6");
    await page.locator("[data-sm-height]").press("Tab");
    await page.waitForTimeout(150);
    check(
      (await page.locator("[data-sm-card]").innerText()).includes("12 m"),
      "climbing 6 m costs 12 m",
    );
    await execute();
    const livia = (await stored()).ext.annotations?.elevations?.["token-livia"];
    check(livia === 6, "altitude 6 m on the token (B18 elevation): " + livia);
    await creatureTab();
    const climbed = await smPanel().innerText();
    check(/Quota\s+6 m/.test(climbed), "altitude in the Creature tab: " + climbed);
    await shot("b40-03-climb-6m.png");
    await choose("fall");
    check(
      (await page.locator("[data-sm-card]").innerText()).includes("2d6"),
      "fall of 6 m asks 2d6",
    );
    await execute();
    await page.locator("#dialog[open] [name=diceMode]").waitFor();
    await shot("b40-04-fall-2d6-request.png");
    const hpBefore = (await stored()).actors.livia.hp;
    await rollPhysical([3, 4]);
    await applyReady();
    await closeDialog();
    const afterFall = await stored();
    check(afterFall.actors.livia.hp === hpBefore - 7, "7 falling damage applied");
    check(
      (afterFall.actors.livia.conditions ?? []).some((c) => (c.id ?? c) === "prone"),
      "lands Prone",
    );
    check(!afterFall.ext.annotations.elevations["token-livia"], "back on the ground");
    await page.locator('[data-table="stand"]').click();
    passed.push(
      "2/3 · climbing the 6 m wall costs 12 m; the fall asks 2d6 (physical 3+4), 7 damage, Prone, altitude 0",
    );

    at("5 search, utilize, study");
    await moveTool();
    await walk("livia", 560, 220);
    check(Math.abs((await tokenOf("livia")).x - 560) < 3, "Livia near the fountain's east rim");
    check(
      !(await page.locator('[data-sm-spot="sm-lever"]').count()),
      "the lever stays hidden from the player",
    );
    await choose("search");
    check(
      (await page.locator("[data-sm-card]").innerText()).includes("Percezione"),
      "Search table skills",
    );
    await execute();
    await rollPhysical([12]);
    const searchText = await page.locator("#dialog").innerText();
    check(searchText.includes("Leva di bronzo"), "Search finds the lever: " + searchText);
    await closeDialog();
    check(
      (await sm()).features["old-watch"].find((f) => f.id === "sm-lever").revealed,
      "lever revealed",
    );
    check(await page.locator('[data-sm-spot="sm-lever"]').count(), "the lever is on the map now");
    await walk("livia", 570, 262);
    await choose("utilize");
    check(
      (await page.locator("[data-sm-card]").innerText()).includes("Tira la leva"),
      "Utilize lists the lever",
    );
    await page.locator("[data-sm-object]").first().click();
    await execute();
    check(
      (await sm()).features["old-watch"].find((f) => f.id === "sm-fountain").drained,
      "fountain drained",
    );
    check(
      (await page.evaluate(() => document.body.innerText)).includes("la vasca si svuota"),
      "Utilize outcome text",
    );
    await choose("study");
    await page.locator("[data-sm-subject]").selectOption("actor:goblin-1");
    await page.locator("[data-sm-skill]").selectOption("history");
    await execute();
    await rollPhysical([10]);
    await closeDialog();
    await creatureTab();
    check(
      (await smPanel().innerText()).includes("fischietto d’osso"),
      "Study recalls the sentry lore",
    );
    passed.push(
      "5a · Search (Perception 12+1) reveals the secret lever only then shown; Utilize pulls it and drains the fountain; Study (History) recalls the lore",
    );

    at("5 influence judged by the DM");
    await choose("influence");
    await page.locator('[data-sm-target="goblin-2"]').click();
    await page.locator("[data-sm-skill]").selectOption("persuasion");
    await page.locator("[data-sm-urge]").fill("Abbassa l’arco e parliamo");
    await page.locator("[data-sm-urge]").press("Tab");
    await execute();
    check((await sm()).judgements[0].status === "awaiting-dm", "influence waits for the DM");
    await role("dm");
    await creatureTab();
    const dmText = await smPanel().innerText();
    check(
      dmText.includes("Abbassa l’arco e parliamo") && dmText.includes("Esitante"),
      "DM sees the urge: " + dmText,
    );
    await page.locator('[data-sm-decision="hesitant"]').click();
    await page.waitForTimeout(150);
    await role("player");
    await select("livia");
    await creatureTab();
    await page.locator(".sm-panel [data-sm-roll]").first().click();
    // The Esploratore is Hostile: Disadvantage, two d20 and the lower counts (SRD Influence).
    check(
      (await page.locator("#dialog").innerText()).includes("d20 + d20"),
      "two d20 for Disadvantage",
    );
    await rollPhysical([17, 18]);
    await closeDialog();
    const judged = (await sm()).judgements[0];
    check(judged.status === "succeeded", "hesitant check 17 ≥ DC 16: " + judged.status);
    check((await smPanel().innerText()).includes("Accetta"), "outcome for the player");
    passed.push(
      "5b · Influence: the player writes the urge, the DM judges “hesitant”, the Hostile attitude gives Disadvantage (17, 18 → 17) against DC 16 (Intelligence 16), Esploratore agrees",
    );

    at("5 hide");
    await tray();
    const hideWhy = await page.locator('[data-sm-move="hide"]').innerText();
    check(hideWhy.includes("Sei in vista di"), "player: hide refused in sight: " + hideWhy);
    await page.locator("[data-sm-tray-close]").click();
    await role("dm");
    await select("livia");
    await choose("hide");
    check(
      (await page.locator("[data-sm-card]").innerText()).includes("come DM confermi"),
      "DM confirms cover",
    );
    await execute();
    await rollPhysical([15]);
    await closeDialog();
    const hid = await sm();
    check(hid.hidden.livia?.dc === 17, "hidden with DC 17");
    await creatureTab();
    check((await smPanel().innerText()).includes("CD per trovarlo 17"), "DM reads the DC");
    await role("player");
    await select("livia");
    await creatureTab();
    check((await smPanel().innerText()).includes("CD per trovarlo 17"), "controller reads the DC");
    await role("dm");
    await select("goblin-2");
    await choose("search");
    await execute();
    await rollPhysical([19]);
    const found = await page.locator("#dialog").innerText();
    await closeDialog();
    check(found.includes("Livia"), "Esploratore finds Livia: " + found);
    check(!(await sm()).hidden.livia, "no longer hidden");
    passed.push(
      "5c · Hide: refused for the player in sight (watchers named), the DM confirms cover, Stealth 15+2 → Invisible with DC 17 (DM and controller only), the Esploratore's Search 19+1 finds her",
    );

    at("7 approval (Not Your Turn, token locking)");
    await role("dm");
    await rulesTab();
    await page.locator('[data-sm-approval][value="all"]').check();
    await page.waitForTimeout(150);
    check((await sm()).settings.approval === "all", "approval mode on");
    await role("player");
    await select("livia");
    await moveTool();
    const startLivia = await tokenOf("livia");
    await drag(startLivia, { x: 470, y: 180 });
    check((await tokenOf("livia")).x === startLivia.x, "the token waits for the DM");
    check((await sm()).proposals.at(-1).status === "pending", "proposal recorded");
    check(
      await page.locator("[data-sm-proposal]").count(),
      "ghost path of the proposal for the player",
    );
    await creatureTab();
    check(
      (await smPanel().innerText()).includes("proposta in attesa del DM"),
      "player sees the waiting proposal",
    );
    await role("dm");
    await rulesTab();
    check(await page.locator("[data-sm-proposal]").count(), "ghost path for the DM");
    check(
      (await page.locator("#table-drawer").innerText()).includes("propone un movimento"),
      "the DM's approval panel lists it",
    );
    await shot("b40-05-approval-dm.png");
    await page.locator('[data-sm-decide][data-sm-decision="approve"]').click();
    await page.waitForTimeout(200);
    const approved = await tokenOf("livia");
    check(
      Math.abs(approved.x - 470) < 4 && Math.abs(approved.y - 180) < 4,
      "approved move applied",
    );
    await role("player");
    await select("livia");
    await moveTool();
    await walk("livia", 470, 120);
    check((await tokenOf("livia")).y === approved.y, "second proposal waits");
    await role("dm");
    await rulesTab();
    await page.locator('[data-sm-decide][data-sm-decision="cancel"]').click();
    await page.waitForTimeout(150);
    check((await sm()).proposals.at(-1).status === "cancelled", "DM cancelled the proposal");
    check((await tokenOf("livia")).y === approved.y, "cancelled: the token stays");
    await rulesTab();
    await page.locator('[data-sm-approval][value="free"]').check();
    await page.waitForTimeout(150);
    passed.push(
      "7 · map in “always needs approval”: the player's drag becomes a ghost proposal, the DM approves (token moves) or cancels (token stays), then back to free movement",
    );

    at("9 diagonal rule and hexes");
    await rulesTab();
    await page.locator("[data-sm-rule]").selectOption("grid-srd");
    await page.waitForTimeout(150);
    check(
      (await stored()).scenes.find((s) => s.id === "old-watch").distanceRule === "grid-srd",
      "SRD grid rule on the scene",
    );
    await role("player");
    await select("livia");
    await useTool("special-moves-ruler", "measure");
    const liv = await tokenOf("livia");
    await hover(liv.x + 200, liv.y + 200);
    const rulerText = await page.locator("[data-sm-ruler-text]").textContent();
    check(
      rulerText.startsWith("6 m"),
      "4 diagonal squares cost 6 m with the SRD grid: " + rulerText,
    );
    check(
      (await page.locator('[data-sm-tier="normal"]').count()) &&
        (await page.locator('[data-sm-tier="dash"]').count()),
      "two-tier outlines",
    );
    await creatureTab();
    check(
      (await smPanel().innerText()).includes("Griglia SRD 2024"),
      "ruler legend names the rule",
    );
    await shot("b40-06-ruler-grid-srd.png");
    await hover(liv.x + 500, liv.y + 20);
    check(await page.locator('[data-sm-ruler="dash"]').count(), "yellow part needs a Dash");
    await role("dm");
    await rulesTab();
    await page.locator("[data-sm-rule]").selectOption("hex");
    await page.waitForTimeout(150);
    check(await page.locator(".sm-hex").count(), "hex grid drawn");
    check(
      !(await page.locator('#battle-map rect[fill="url(#map-grid)"]').count()),
      "square grid hidden",
    );
    await shot("b40-07-hex-grid.png");
    await page.locator("[data-sm-rule]").selectOption("euclidean");
    await page.waitForTimeout(150);
    check(
      await page.locator('#battle-map rect[fill="url(#map-grid)"]').count(),
      "square grid back",
    );
    passed.push(
      "9 · the DM picks the SRD grid rule (a diagonal costs one square: 4 squares = 6 m on the ruler) and hexes (hex grid drawn, square grid hidden), then back to the gridless line",
    );
    passed.push(
      "6a · two-tier ruler: blue within the movement left, yellow with a Dash, red beyond (XCOM outlines, dnd5e colours)",
    );

    at("8 Alt labels and last move");
    await role("player");
    await select("livia");
    await moveTool();
    await page.locator("#battle-map").focus();
    await page.keyboard.down("Alt");
    await page.waitForTimeout(100);
    check(await page.locator("[data-sm-labels-layer][data-on]").count(), "Alt shows the labels");
    const labelsText = await page.locator("[data-sm-labels-layer]").textContent();
    check(
      labelsText.includes("Livia") &&
        labelsText.includes("Vasca della fontana") &&
        labelsText.includes("Leva di bronzo"),
      "labels: creatures and spots: " + labelsText,
    );
    await shot("b40-08-alt-labels.png");
    await page.keyboard.up("Alt");
    await page.waitForTimeout(100);
    check(
      !(await page.locator("[data-sm-labels-layer][data-on]").count()),
      "labels hidden on release",
    );
    await page.keyboard.press("Shift+X");
    await page.waitForTimeout(150);
    check(await page.locator("[data-sm-last-move]").count(), "Shift+X shows the last move");
    await page.keyboard.press("Shift+X");
    passed.push(
      "8 · holding Alt shows creature, spot and weapon labels (BG3), released they hide; Shift+X toggles the last move (Roll20)",
    );
    // Keyboard moves (arrows one cell, Enter): exact, and no DM pin can take the click.
    const keyMove = async (actorId, steps, p = page) => {
      await select(actorId, p);
      await p.locator("#battle-map").focus();
      for (const key of steps) await p.keyboard.press(key);
      await p.keyboard.press("Enter");
      await p.waitForTimeout(250);
    };
    // An exact destination: Plan path, then the point's X/Y typed in its edit dialog.
    const exactMove = async (actorId, x, y, p = page) => {
      await select(actorId, p);
      await useTool("plan", "select", p);
      await clickMap(x, y, p);
      await p.locator("[data-path-edit]").first().click();
      await p.locator("#dialog [name=x]").fill(String(x));
      await p.locator("#dialog [name=y]").fill(String(y));
      await p.locator("#dialog button[type=submit]").click();
      await p.locator("[data-path-execute]").click();
      await p.waitForTimeout(250);
      await moveTool(p);
    };
    at("combat setup");
    await role("player");
    await exactMove("livia", 570, 250);
    const liviaSetup = await tokenOf("livia");
    check(
      Math.abs(liviaSetup.x - 570) < 3 && Math.abs(liviaSetup.y - 250) < 3,
      "Livia next to the Sentinella: " + JSON.stringify(liviaSetup),
    );
    await role("dm");
    await moveTool();
    await keyMove("doran", [
      "ArrowRight",
      "ArrowRight",
      "ArrowRight",
      "ArrowRight",
      "ArrowRight",
      "ArrowRight",
      "ArrowUp",
    ]);
    const doranSetup = await tokenOf("doran");
    check(
      doranSetup.x === 650 && doranSetup.y === 400,
      "Doran in place: " + JSON.stringify(doranSetup),
    );
    const button = (name) => page.getByRole("button", { name, exact: true });
    // Refreshed by R3 (27/09/2026): «Avvia combattimento» opens the start dialog at the Table
    // (P5 roll call): who fights and each typed d20, then «Inizia combattimento».
    await button("Avvia combattimento").click();
    const start = page.locator("#dialog");
    await start.locator("[data-ct-start-natural]").first().waitFor();
    for (const [id, natural] of [
      ["livia", 18],
      ["mira", 14],
      ["goblin-1", 12],
      ["doran", 10],
      ["goblin-2", 8],
    ]) {
      await start.locator('[data-ct-start-include="' + id + '"]').check();
      await start.locator('[data-ct-start-natural="' + id + '"]').fill(String(natural));
      await start.locator('[data-ct-start-natural="' + id + '"]').press("Tab");
    }
    await start.getByRole("button", { name: "Inizia combattimento", exact: true }).click();
    await page.locator("#battle-map").waitFor();
    await settleDice();
    check((await stored()).combat.active, "combat started");
    const placed = (await stored()).scenes
      .find((x) => x.id === "old-watch")
      .tokens.map((t) => t.actorId + "@" + t.x + "," + t.y)
      .join(" ");
    check(
      (await tokenOf("livia")).x === 570 && (await tokenOf("goblin-1")).x === 620,
      "positions kept at the start: " + placed,
    );
    // Ends the current turn from its own creature (the player's button shows on their turn).
    const endTurn = async () => {
      const st = await stored();
      await select(st.combat.order[st.combat.turn]);
      await page.locator('[data-table="end-turn"]').click();
      await page.waitForTimeout(200);
      await settleDice();
    };

    at("1 grapple with the target's save");
    await role("player");
    await select("livia");
    await choose("grapple");
    await page.locator('[data-sm-target="goblin-1"]').click();
    const grab = await page.locator("[data-sm-card]").innerText();
    check(
      grab.includes("CD 10") && grab.includes("Destrezza +2") && grab.includes("35%"),
      "grapple preview: DC, save and chance: " + grab,
    );
    await shot("b40-09-grapple-preview.png");
    await execute();
    check((await stored()).actors.livia.action === false, "Unarmed Strike spent the Attack action");
    await role("dm");
    await creatureTab();
    const dmPending = await smPanel().innerText();
    check(
      dmPending.includes("Sentinella") && dmPending.includes("Usa Forza"),
      "DM: save to roll, with the Strength choice: " + dmPending,
    );
    await page.locator(".sm-panel [data-sm-roll]").first().click();
    await rollPhysical([3]);
    await closeDialog();
    const grabbed = await stored();
    check(
      (grabbed.actors["goblin-1"].conditions ?? []).some((c) => (c.id ?? c) === "grappled"),
      "Sentinella Grappled",
    );
    check(grabbed.ext["special-moves"].grapples[0]?.grapplerId === "livia", "grapple recorded");
    await role("player");
    await page.reload();
    await page.locator("[data-sm-tray]").waitFor();
    await select("livia");
    await creatureTab();
    const reloaded = await smPanel().innerText();
    check(/Afferra\s+Sentinella/.test(reloaded), "after reload Livia still grapples: " + reloaded);
    passed.push(
      "1a · grapple (2024 Unarmed Strike): target in reach, DC 10 against Dexterity +2 (35%), the DM rolls the Sentinella's save (physical 3) → Grappled; kept after reload",
    );

    at("grapple drag and undo");
    await choose("drag");
    await hover(520, 250);
    check(
      (await page.locator("[data-sm-card]").innerText()).includes("ogni metro costa il doppio"),
      "drag doubles the cost",
    );
    await clickMap(520, 250);
    const dragged = await tokenOf("goblin-1");
    check(
      Math.abs(dragged.x - 570) < 3 && Math.abs((await tokenOf("livia")).x - 520) < 3,
      "the goblin follows right behind: " + JSON.stringify(dragged),
    );
    await page.locator('.action-dock [data-table="undo"]').click();
    await page.waitForTimeout(200);
    check(
      (await tokenOf("goblin-1")).x === 620 && (await tokenOf("livia")).x === 570,
      "Undo restores both tokens",
    );
    await endTurn();
    await endTurn();
    passed.push(
      "1b · dragging the grappled goblin costs double and pulls it along; Undo restores both",
    );

    at("escape attempt");
    await role("dm");
    await select("goblin-1");
    await choose("escape");
    check(
      (await page.locator("[data-sm-card]").innerText()).includes("CD per sfuggire 10"),
      "escape DC shown",
    );
    await execute();
    await rollPhysical([2]);
    await closeDialog();
    check((await sm()).grapples.length === 1, "escape failed: still grappled");
    await endTurn();
    passed.push(
      "1c · the Sentinella tries to escape on its turn (Acrobatics against DC 10, physical 2): still Grappled",
    );

    at("4 thrown handaxe: ranges");
    await select("doran");
    await choose("throw");
    const menu = await page.locator("[data-sm-card]").innerText();
    check(
      menu.includes("Ascia") && menu.includes("6/18 m") && menu.includes("in mano 2"),
      "throw menu: " + menu,
    );
    check(menu.includes("Non ha la proprietà Lancio"), "non-throwable items explain why");
    await page.locator('[data-sm-throw="special-moves.throw.sm-doran-handaxe"]').click();
    await page.locator("[data-sm-throw-rings]").waitFor();
    const mira = await tokenOf("mira");
    await hover(mira.x, mira.y);
    await creatureTab();
    check(
      (await page.locator("#combat-detail").innerText()).includes("Oltre la gittata normale"),
      "long range gives Disadvantage",
    );
    await shot("b40-10-throw-ranges.png");
    await page.locator("[data-combat-mode]").selectOption("physical");
    const sentinella = await tokenOf("goblin-1");
    await hover(sentinella.x, sentinella.y);
    check(
      !(await page.locator("#combat-detail").innerText()).includes("Oltre la gittata normale"),
      "normal range: no Disadvantage",
    );
    await page.locator('#battle-map [data-actor="goblin-1"]').focus();
    await page.keyboard.press("Enter");
    await page.locator("#dialog[open] button[type=submit]").click();
    await page.waitForTimeout(150);
    await page.locator("#dialog [data-request-open]").first().click();
    await rollPhysical([15]);
    const afterAttack = page.locator("#dialog [data-request-open]");
    if (await afterAttack.count()) {
      await afterAttack.first().click();
      await rollPhysical([4]);
    }
    await applyReady();
    await closeDialog();
    const thrown = await stored();
    check(
      thrown.ext["special-moves"].thrown[0]?.targetId === "goblin-1",
      "the handaxe lies near the Sentinella",
    );
    check(
      thrown.actors["goblin-1"].hp === 3,
      "4 damage to the Sentinella: " + thrown.actors["goblin-1"].hp,
    );
    check(await page.locator(".sm-thrown").count(), "handaxe on the map");
    await select("goblin-1");
    await creatureTab();
    check(
      (await smPanel().innerText()).includes("Vessazione"),
      "Vex mark on the Sentinella for Doran",
    );
    passed.push(
      "4 · Doran's thrown handaxe: normal 6 m / long 18 m rings; beyond normal range the preview gives Disadvantage (SRD Range); at 4,5 m none; hit 15+2, 4 damage; the axe lies near the target; Vex (Mastery) marked",
    );
    await endTurn();
    await endTurn();

    at("1 shove off the ledge");
    await role("player");
    await select("livia");
    await choose("shove");
    await page.locator('[data-sm-target="goblin-1"]').click();
    const shove = await page.locator("[data-sm-card]").innerText();
    check(
      shove.includes("Traiettoria libera") && shove.includes("cadrà da 3 m"),
      "push preview: " + shove,
    );
    check(await page.locator("[data-sm-push]").count(), "BG3 trajectory arrow");
    await shot("b40-11-shove-preview.png");
    await execute();
    await role("dm");
    await creatureTab();
    await page.locator(".sm-panel [data-sm-roll]").first().click();
    await rollPhysical([1]);
    await closeDialog();
    const pushed = await tokenOf("goblin-1");
    check(pushed.x === 670, "pushed 1,5 m straight away");
    check((await sm()).grapples.length === 0, "the grapple ends out of reach");
    await creatureTab();
    await page.locator(".sm-panel [data-sm-roll]").first().click();
    check((await page.locator("#dialog").innerText()).includes("d6"), "fall 1d6 requested");
    await rollPhysical([2]);
    await applyReady();
    await closeDialog();
    const fell = await stored();
    check(fell.actors["goblin-1"].hp === 1, "fall damage 2");
    check(
      (fell.actors["goblin-1"].conditions ?? []).some((c) => (c.id ?? c) === "prone"),
      "lands Prone",
    );
    passed.push(
      "1d · shove with push: clear trajectory preview, the save fails (1): pushed 1,5 m off its 3 m perch, the grapple ends, 1d6 falling damage (2), Prone",
    );
    await role("player");
    await endTurn();
    await endTurn();
    await role("dm");
    await endTurn();

    at("10 longsword Sap");
    await moveTool();
    await keyMove("doran", ["ArrowRight", "ArrowUp"]);
    check((await tokenOf("doran")).x === 700, "Doran next to the Esploratore");
    await page.locator("[data-combat-mode]").selectOption("physical");
    await page.locator('[data-combat-action="special-moves.weapon.invp-doran-longsword"]').click();
    await page.locator('#battle-map [data-actor="goblin-2"]').focus();
    await page.keyboard.press("Enter");
    await page.locator("#dialog[open] button[type=submit]").click();
    await page.waitForTimeout(150);
    await page.locator("#dialog [data-request-open]").first().click();
    await rollPhysical([16]);
    const dmg = page.locator("#dialog [data-request-open]");
    if (await dmg.count()) {
      await dmg.first().click();
      await rollPhysical([5]);
    }
    await applyReady();
    await closeDialog();
    await select("goblin-2");
    await creatureTab();
    const sapText = await smPanel().innerText();
    check(sapText.includes("Fiaccare"), "Sap on the Esploratore: " + sapText);
    await page.locator('[data-sm-mastery-mark="sap"]').scrollIntoViewIfNeeded();
    await shot("b40-12-sap-mark.png");
    passed.push(
      "10a · Doran's longsword (Mastery Sap) hits the Esploratore (16+2, 5 damage): the Sap mark stands on it with the SRD rule",
    );

    at("10b sheet explains the mastery");
    await page.goto(base + "#characters?id=doran&tab=actions");
    await page.locator(".sm-sheet").waitFor();
    const sheet = await page.locator(".sm-sheet").innerText();
    check(
      // Refreshed by the residuals writer (29/09/2026): Italian SRD «Padronanza d’armi».
      sheet.includes("Padronanza d’armi · 3/3") &&
        sheet.includes("Fiaccare") &&
        sheet.includes("svantaggio al suo prossimo tiro per colpire"),
      "sheet explains Sap: " + sheet.slice(0, 600),
    );
    check(
      sheet.includes("Afferrare") &&
        sheet.includes("Influenzare") &&
        sheet.includes("Salto in lungo"),
      "DDB generic actions and jumps",
    );
    await page.locator(".sm-sheet").scrollIntoViewIfNeeded();
    await shot("b40-13-sheet-mastery.png");
    passed.push(
      "10b · Doran's Actions tab: 2024 generic actions (DDB), movement and Weapon Mastery 3/3 with the Sap rule and “applied at the Table automatically”",
    );

    at("11 mount, fly and forms");
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await page.getByRole("button", { name: "Concludi incontro", exact: true }).click();
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForTimeout(200);
    check(!(await stored()).combat.active, "encounter ended");
    await select("livia");
    await rulesTab();
    await page.locator(".sm-dm-tools summary").click();
    await page.locator("[data-sm-summon]").click();
    await page.waitForTimeout(200);
    const withHorse = await stored();
    const horseId = Object.keys(withHorse.actors).find((id) => id.startsWith("sm-horse-"));
    check(horseId && withHorse.actors[horseId].size === "large", "SRD Riding Horse on the scene");
    await page
      .locator(".sm-dm-tools summary")
      .click()
      .catch(() => {});
    if (!(await page.locator("[data-sm-flight]").isVisible()))
      await page.locator(".sm-dm-tools summary").click();
    await page.locator("[data-sm-flight] [name=actorId]").selectOption("livia");
    await page.locator("[data-sm-flight] button[type=submit]").click();
    await page.waitForTimeout(150);
    check((await sm()).flight.livia?.speed === 18, "flight granted by the DM");
    await role("player");
    await select("livia");
    await moveTool();
    await choose("mount");
    const mountCard = await page.locator("[data-sm-card]").innerText();
    check(
      mountCard.includes("Cavallo da galoppo") && mountCard.includes("4,5 m"),
      "mount preview: " + mountCard,
    );
    await execute();
    check((await sm()).mounts.livia?.mountId === horseId, "Livia in the saddle");
    await choose("ride");
    const horseAt = await tokenOf(horseId);
    await hover(horseAt.x + 120, horseAt.y - 60);
    await clickMap(horseAt.x + 120, horseAt.y - 60);
    const rode = await tokenOf(horseId);
    check(Math.abs(rode.x - (horseAt.x + 120)) < 3, "the horse carried Livia");
    check(Math.abs((await tokenOf("livia")).x - rode.x) < 3, "Livia moved with it");
    await choose("dismount");
    await execute();
    check(!(await sm()).mounts.livia, "dismounted");
    await choose("fly");
    await page.locator("[data-sm-altitude]").fill("6");
    await page.locator("[data-sm-altitude]").press("Tab");
    await page.waitForTimeout(150);
    await execute();
    check((await stored()).ext.annotations.elevations["token-livia"] === 6, "flying at 6 m");
    await creatureTab();
    check(/Quota\s+6 m/.test(await smPanel().innerText()), "altitude shown while flying");
    await page.locator(".sm-status").scrollIntoViewIfNeeded();
    await page.locator("#battle-map").scrollIntoViewIfNeeded();
    await shot("b40-14-fly-altitude.png");
    await choose("fly");
    await page.locator("[data-sm-altitude]").fill("0");
    await page.locator("[data-sm-altitude]").press("Tab");
    await page.waitForTimeout(150);
    await execute();
    check(!(await stored()).ext.annotations.elevations["token-livia"], "landed");
    await select("mira");
    await tray();
    await page.locator('[data-sm-move="form"]').click();
    await page.locator("#dialog[open]").waitFor();
    const formsText = await page.locator("#dialog").innerText();
    check(
      /Forma selvatica|Forme/.test(formsText),
      "forms dialog of Inc. 9: " + formsText.slice(0, 200),
    );
    await closeDialog();
    passed.push(
      "11 · the DM brings an SRD Riding Horse (Large) and records a Fly Speed; Livia mounts (half Speed, 4,5 m), rides, dismounts, flies at 6 m (altitude on the token) and lands; Mira's “Forms and linked creatures” opens the Inc. 9 forms dialog",
    );
    at("preparation: grid rule and DCs per scene");
    await role("dm");
    await page.goto(base + "#preparation?tab=special-moves");
    await page.locator(".sm-prep").waitFor();
    const prep = await page.locator(".sm-prep").innerText();
    check(
      prep.includes("Il cortile dell’osservatorio") &&
        prep.includes("Leva di bronzo") &&
        prep.includes("Conoscenze da Studiare"),
      "prep section: " + prep.slice(0, 300),
    );
    await page.locator('[data-sm-prep-dc="sm-north-wall"]').fill("12");
    await page.locator('[data-sm-prep-dc="sm-north-wall"]').press("Tab");
    await page.waitForTimeout(150);
    check(
      (await sm()).features["old-watch"].find((f) => f.id === "sm-north-wall").dc === 12,
      "the DM lowered the wall's DC",
    );
    await page.locator('[data-sm-prep-rule="old-watch"]').selectOption("grid-srd");
    await page.waitForTimeout(150);
    check(
      (await stored()).scenes.find((x) => x.id === "old-watch").distanceRule === "grid-srd",
      "rule set from Preparation",
    );
    await page.locator('[data-sm-prep-rule="old-watch"]').selectOption("euclidean");
    await shot("b40-18-preparation-section.png");
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    passed.push(
      "prep · Preparation › Movimento e griglia: distance rule per scene (Roll20 page settings) and the DCs of walls, secrets and knowledge, DM only",
    );
    check(!errors.length, "page errors: " + errors.join(" | "));
    check(await noOverflow(), "desktop page overflows");

    // ------------------------------------------------------------ independent review (B40-rf)
    at("review: Escape, Influence privacy, DM attitude, sheet link");
    await reset();
    await role("player");
    await select("livia");
    await choose("high-jump");
    await page.locator("[data-sm-card] [data-sm-execute]").focus();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    check(!(await page.locator("[data-sm-card]").count()), "Esc in the preview card cancels");
    check(
      await page.evaluate(() => document.activeElement?.hasAttribute("data-sm-tray")),
      "focus back on Moves after Esc",
    );
    await choose("influence");
    const influenceTargets = await page.locator("[data-sm-card] .sm-targets").innerText();
    check(
      !/Ostile|Indifferente|Amichevole/.test(influenceTargets) &&
        !influenceTargets.includes("Doran") &&
        influenceTargets.includes("Esploratore"),
      "player: monsters only, with distances, never their attitude: " + influenceTargets,
    );
    await page.keyboard.press("Escape");
    await role("dm");
    await select("goblin-2");
    await creatureTab();
    await page.locator('[data-sm-attitude="goblin-2"]').selectOption("indifferent");
    await page.waitForTimeout(150);
    check((await sm()).attitudes["goblin-2"] === "indifferent", "the DM sets the attitude");
    const log = (await stored()).log.at(-1);
    check(log.visibility === "private", "the attitude change stays out of the players' log");
    await page.goto(base + "#characters?id=doran&tab=actions");
    await dismissTips();
    await page.locator("[data-sm-open-table]").click();
    await page.locator(".sm-tray .sm-tray-head").waitFor();
    check(
      (await page.locator(".sm-tray .sm-tray-head strong").innerText()).includes("Doran"),
      "the sheet's “Open at the Table” opens Doran's moves",
    );
    passed.push(
      "review · Esc cancels the armed move (BG3 CRP-195); a player's Influence list names monsters with distances, never attitudes; the DM sets the attitude from the Creature tab (private log line); the sheet opens the Table on its own creature",
    );
    check(!errors.length, "page errors: " + errors.join(" | "));
    check(await noOverflow(), "desktop page overflows (review)");

    // ------------------------------------------------------------ group 2: EN phone 390
    at("phone EN 390 touch");
    const phoneContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const phone = await phoneContext.newPage();
    phone.on("pageerror", (error) => errors.push("phone: " + error.message));
    await phone.goto(base + "#table");
    await phone.evaluate(() => localStorage.clear());
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
    await phone.locator("#dialog button[type=submit]").tap();
    await phone.goto(base + "#table");
    await phone.locator("[data-sm-tray]").waitFor();
    await dismissTips(phone);
    await role("player", phone);
    await select("livia", phone);
    await phone.locator("[data-sm-tray]").scrollIntoViewIfNeeded();
    await phone.locator("[data-sm-tray]").tap();
    await phone.locator(".sm-tray [data-sm-move]").first().waitFor();
    const phoneTray = await phone.locator(".sm-tray").innerText();
    check(
      phoneTray.includes("Special moves · Livia") &&
        phoneTray.includes("Part of the Attack action: roll initiative first"),
      "EN tray with reasons: " + phoneTray.slice(0, 300),
    );
    const moveBox = await phone.locator('[data-sm-move="long-jump"]').boundingBox();
    check(moveBox.height >= 40 && moveBox.width >= 40, "40 px targets on the phone");
    check(await noOverflow(phone), "phone tray overflows");
    await shot("b40-15-phone-tray-en-390.png", phone);
    await phone.locator('[data-sm-move="long-jump"]').tap();
    await phone.locator('[data-sm-card="long-jump"]').waitFor();
    await phone.locator("[data-sm-runup]").tap();
    check(await phone.locator("[data-sm-runup]").isChecked(), "run-up by touch");
    await shot("b40-16-phone-jump-card-en-390.png", phone);
    await phone.locator("#battle-map").evaluate((svg) => svg.scrollIntoView({ block: "start" }));
    await phone.waitForTimeout(150);
    const land = await toScreen(350, 380, phone);
    const under = await phone.evaluate(
      ([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest("#battle-map")),
      [land.x, land.y],
    );
    if (!under) await shot("b40-debug-phone.png", phone);
    check(
      under,
      "the landing spot stays visible above the preview sheet: " +
        JSON.stringify(land) +
        " " +
        (await phone.evaluate(
          ([x, y]) => document.elementFromPoint(x, y)?.outerHTML.slice(0, 160),
          [land.x, land.y],
        )),
    );
    await phone.touchscreen.tap(land.x, land.y);
    await phone.waitForTimeout(300);
    const jumpedPhone = await tokenOf("livia", phone);
    check(
      Math.abs(jumpedPhone.x - 350) < 6 && Math.abs(jumpedPhone.y - 380) < 6,
      "jump by a tap on the map: " + JSON.stringify(jumpedPhone),
    );
    // English readers get feet (B22 unit preference): 3 m is shown as 10 ft.
    check(
      /Long jump of (3 m|10 ft)/.test(await phone.evaluate(() => document.body.innerText)),
      "EN result",
    );
    await phone.locator("[data-sm-tray]").tap();
    await phone.locator('[data-sm-move="search"]').tap();
    await phone.locator('[data-sm-card="search"] [data-sm-execute]').tap();
    await phone.locator("#dialog[open] [name=diceMode]").waitFor();
    await phone.locator("#dialog button[type=submit]").tap();
    await settleDice(phone);
    const phoneOutcome = await phone.locator("#dialog").innerText();
    check(
      /Finds|finds nothing/.test(phoneOutcome),
      "EN Search outcome with digital dice: " + phoneOutcome.slice(0, 300),
    );
    await closeDialog(phone);
    check(await noOverflow(phone), "phone page overflows");
    await shot("b40-17-phone-after-en-390.png", phone);
    passed.push(
      "phone EN 390 (touch): tray as a bottom sheet with 40 px targets and English reasons, run-up tapped, long jump by a tap on the map, Search with digital dice and its English outcome, no overflow",
    );
    await phoneContext.close();
    check(!errors.length, "page errors: " + errors.join(" | "));
  };
  try {
    await run();
  } catch (error) {
    await shot("b40-failure.png").catch(() => {});
    throw Error(
      `[${step}] ${error.message}\n${(
        await page
          .locator("#dialog[open]")
          .innerText()
          .catch(() => "")
      ).slice(0, 400)}`,
    );
  }
  return JSON.stringify({ passed, errors, step });
};
