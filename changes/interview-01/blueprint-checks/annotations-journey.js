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
  // B18 — Table: annotations, persistent templates, extended measuring and signals.
  // Acceptance checks of the card in docs/interview/CAPABILITY_CENSUS.md (#### B18) with real
  // clicks, drags, keys and touch: (1) Livia draws an arrow and text, Doran (the DM in this
  // two-identity demo) sees them, his "Clear mine" keeps Livia's, the DM hides them;
  // (2) a hidden "Trappola" cone, revealed with the fire pattern, locked it does not move;
  // (3) a cone measurement private, then shared; (4) ping and alert ping with the off-screen
  // arrow, the DM's view proposal accepted by the player; (5) range rings with a colour-blind
  // theme, the distance list updated after a move; (6) a 3 m aura that follows the token;
  // (7) a token note shown on hover; (8) the last colour survives a reload. Plus Undo,
  // offline refusal, keyboard, EN phone 390 with touch. Synthetic data; resets this browser.
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B18/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  let phone = null;
  page.on("pageerror", (error) =>
    errors.push(error.message + " @ " + String(error.stack).split("\n").slice(1, 3).join(" ")),
  );
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const slice = async () => (await stored()).ext.annotations;
  const button = (name, scope = page) => scope.getByRole("button", { name, exact: true });
  const dialog = page.locator("#dialog");
  const submitDialog = async () => {
    await dialog.locator("footer .primary").click();
    await page.waitForFunction(() => !document.querySelector("#dialog").open);
  };
  const role = async (value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForTimeout(250);
  };
  const shot = (name) => page.screenshot({ path: dir + name + ".png" });
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const go = async (hash) => {
    await page.goto(base + "#" + hash);
    await page.locator("#content").waitFor();
    await page.waitForTimeout(200);
  };
  const map = page.locator("#battle-map");
  const at = (x, y, p = page) =>
    p.locator("#battle-map").evaluate(
      (svg, q) => {
        const t = svg.createSVGPoint();
        t.x = q.x;
        t.y = q.y;
        const r = t.matrixTransform(svg.getScreenCTM());
        return { x: r.x, y: r.y };
      },
      { x, y },
    );
  const dragScene = async (from, to, options = {}) => {
    const a = await at(from.x, from.y);
    const b = await at(to.x, to.y);
    if (options.alt) await page.keyboard.down("Alt");
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++)
      await page.mouse.move(a.x + ((b.x - a.x) * i) / 8, a.y + ((b.y - a.y) * i) / 8);
    await page.mouse.up();
    if (options.alt) await page.keyboard.up("Alt");
    await page.waitForTimeout(200);
  };
  const clickScene = async (x, y, modifiers = []) => {
    const p = await at(x, y);
    for (const m of modifiers) await page.keyboard.down(m);
    await page.mouse.click(p.x, p.y);
    for (const m of modifiers.reverse()) await page.keyboard.up(m);
    await page.waitForTimeout(200);
  };
  // B61: map tools stand in toolbar groups; a tool of another group shows after its group
  // button (Foundry scene controls). `offered` = the tool or its group is on screen.
  const groupOf = (name, p = page) =>
    p
      .locator(".map-tool-cluster", { has: p.locator(`[data-tool][aria-label="${name}"]`) })
      .locator("[data-tool-group]");
  // Refreshed by R3 (27/09/2026), P6 TV-06: on a phone the map tools fold behind «Strumenti
  // della mappa»; a tool counts as offered when the fold opens onto it, and using it unfolds.
  const unfold = async (p, tap) => {
    const fold = p.locator('#content [data-map-tools-toggle][aria-expanded="false"]');
    if ((await fold.count()) && (await fold.first().isVisible())) {
      await (tap ? fold.first().tap() : fold.first().click());
      await p.locator('#content [data-map-tools-toggle][aria-expanded="true"]').waitFor();
    }
  };
  const offered = async (name, p = page) => {
    await unfold(p, false);
    return (
      (await p.locator(".map-toolbar").getByRole("button", { name, exact: true }).isVisible()) ||
      (await groupOf(name, p).isVisible())
    );
  };
  const tool = async (name, p = page, tap = false) => {
    await unfold(p, tap);
    const chip = p.locator(".map-toolbar").getByRole("button", { name, exact: true });
    if (!(await chip.isVisible())) await (tap ? groupOf(name, p).tap() : groupOf(name, p).click());
    await (tap ? chip.tap() : chip.click());
    await p.waitForTimeout(150);
  };
  const bar = () => page.locator("[data-annot-bar]");
  const viewBox = () => map.getAttribute("viewBox");

  try {
    await go("table");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator("#battle-map").waitFor();
    await role("player");
    await go("table");
    check(await offered("Misura"), "Measure chip missing");
    check(await offered("Disegna"), "Draw chip missing");
    check(await offered("Sagoma"), "Template chip missing");

    // ------------------------------------------------------------------ (1) drawings
    await tool("Disegna");
    // Keyboard: Enter on a mode button keeps the focus on it after the re-render.
    await bar().getByRole("button", { name: "Freccia" }).focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(150);
    check(
      (await page.evaluate(() => document.activeElement?.dataset.annotFocus)) === "draw-arrow",
      "Focus lost after choosing a mode with Enter",
    );
    check(
      (await bar().getByRole("button", { name: "Freccia" }).getAttribute("aria-pressed")) ===
        "true",
      "Arrow mode not pressed",
    );
    await bar().locator('[data-annot-swatches="draw"]').click();
    await bar().getByRole("button", { name: "Blu", exact: true }).click();
    await dragScene({ x: 280, y: 360 }, { x: 560, y: 290 });
    await bar().getByRole("button", { name: "Testo o nota sulla pedina" }).click();
    await clickScene(470, 230);
    await dialog.locator("[name=text]").fill("Porta nord");
    await submitDialog();
    let s = await slice();
    check(
      s.marks.length === 2 &&
        s.marks.every(
          (m) => m.author === "player" && m.asActorId === "livia" && m.color === "blue",
        ),
      "Livia's arrow and text not stored: " + JSON.stringify(s.marks),
    );
    check(
      (await page.locator("[data-annot-mark]").count()) === 2,
      "Player does not see own drawings",
    );
    await shot("01-player-arrow-text");
    // Undo: a freehand stroke then Annulla in the bar removes only it (correction recorded).
    await bar().getByRole("button", { name: "Mano libera" }).click();
    await dragScene({ x: 620, y: 470 }, { x: 700, y: 420 });
    check((await slice()).marks.length === 3, "Freehand not stored");
    await bar().getByRole("button", { name: "Annulla" }).click();
    await page.waitForTimeout(200);
    s = await stored();
    check(s.ext.annotations.marks.length === 2, "Undo did not remove the stroke");
    check(s.log.at(-1).kind === "correction", "Undo without correction record");
    passed.push(
      "(1a) Livia: blue arrow by drag + text 'Porta nord' (dialog); freehand undone with a correction record",
    );

    await role("dm");
    await go("table");
    check(
      (await page.locator("[data-annot-mark]").count()) === 2,
      "DM does not see Livia's drawings",
    );
    // The DM plays Doran: select his token, then draw an ellipse as Doran.
    await clickScene(350, 450);
    await tool("Disegna");
    await bar().getByRole("button", { name: "Ellisse" }).click();
    await dragScene({ x: 600, y: 190 }, { x: 700, y: 280 });
    s = await slice();
    check(
      s.marks.length === 3 && s.marks[2].author === "dm" && s.marks[2].asActorId === "doran",
      "Doran's ellipse wrong",
    );
    await openTablePanel(page, "annotations-list"); // B62: Scene › Annotations
    const list = page.locator("[data-annot-list]");
    await list.waitFor();
    const rows = await list.locator('[data-annot-row="mark"]').allInnerTexts();
    check(
      rows.some((r) => r.includes("Freccia") && r.includes("Livia")) &&
        rows.some((r) => r.includes("Porta nord") && r.includes("Livia")) &&
        rows.some((r) => r.includes("Ellisse") && r.includes("Doran")),
      "Drawer list authors wrong: " + rows.join(" | "),
    );
    await bar().getByRole("button", { name: "Cancella i miei" }).click();
    await page.waitForTimeout(200);
    s = await slice();
    check(
      s.marks.length === 2 && s.marks.every((m) => m.author === "player"),
      "Clear mine touched Livia's drawings",
    );
    for (let i = 0; i < 2; i++) {
      await list
        .locator('[data-annot-row="mark"]')
        .filter({ hasNot: page.locator("em") })
        .first()
        .getByRole("button", { name: "Nascondi" })
        .click();
      await page.waitForTimeout(200);
    }
    s = await slice();
    check(
      s.marks.every((m) => m.hidden),
      "DM did not hide Livia's drawings",
    );
    check(
      (await page.locator(".annotations-mark.is-hidden").count()) === 2,
      "DM does not see hidden drawings faded",
    );
    await shot("02-dm-list-clear-mine-hidden");
    await role("player");
    await go("table");
    check(
      (await page.locator("[data-annot-mark]").count()) === 0,
      "Hidden drawings still reach the player",
    );
    await page.reload();
    await page.locator("#battle-map").waitFor();
    check(
      (await page.locator("[data-annot-mark]").count()) === 0,
      "Hidden drawings back after reload",
    );
    passed.push(
      "(1b) DM sees Livia's arrow/text (list: Livia), Doran's ellipse; 'Cancella i miei' kept Livia's; DM hid both; player sees none, also after reload",
    );

    // ------------------------------------------------------------------ (2) hidden trap
    await role("dm");
    await go("table");
    await tool("Sagoma");
    await bar().getByRole("button", { name: /^Cono/ }).click();
    await bar().getByRole("button", { name: "Nuove nascoste ai giocatori" }).click();
    await dragScene({ x: 480, y: 330 }, { x: 630, y: 330 });
    s = await slice();
    check(
      s.templates.length === 1 && s.templates[0].hidden && s.templates[0].shape === "cone",
      "Hidden cone not created",
    );
    check(
      Math.abs(s.templates[0].size - 4.5) < 0.2,
      "Cone size not about 4.5 m: " + s.templates[0].size,
    );
    check(
      (await stored()).log.at(-1).visibility === "private",
      "Hidden trap leaked into the shared log",
    );
    await bar().getByRole("button", { name: "Nome…" }).click();
    await dialog.locator("[name=label]").fill("Trappola");
    await submitDialog();
    check((await slice()).templates[0].label === "Trappola", "Trap not named");
    await role("player");
    await go("table");
    check(!(await page.content()).includes("Trappola"), "Hidden trap name in the player's page");
    check(
      (await page.locator("[data-annot-template]").count()) === 0,
      "Hidden template drawn for the player",
    );
    await role("dm");
    await go("table");
    await tool("Sagoma");
    await clickScene(560, 330);
    await bar().locator("[data-annot-tpl-pattern]").selectOption("fire");
    await page.waitForTimeout(200);
    await bar().getByRole("button", { name: "Rivela ai giocatori" }).click();
    await page.waitForTimeout(200);
    s = await slice();
    check(
      !s.templates[0].hidden && s.templates[0].pattern === "fire",
      "Trap not revealed with fire",
    );
    check(
      (await stored()).log.at(-1).label.includes("Sagoma rivelata: Trappola"),
      "Reveal label missing",
    );
    await bar().getByRole("button", { name: "Blocca" }).click();
    await page.waitForTimeout(200);
    check((await slice()).templates[0].locked, "Trap not locked");
    const origin = (await slice()).templates[0].origin;
    await dragScene({ x: 560, y: 330 }, { x: 700, y: 470 });
    check(
      JSON.stringify((await slice()).templates[0].origin) === JSON.stringify(origin),
      "Locked trap moved",
    );
    check(
      (await page.locator("#map-message").textContent()).includes("bloccata"),
      "Locked message missing",
    );
    await shot("03-dm-trap-fire-locked");
    await role("player");
    await go("table");
    const trap = page.locator("[data-annot-template]");
    check(
      (await trap.count()) === 1 && (await trap.innerHTML()).includes("annotations-pat-fire"),
      "Player does not see the fire trap",
    );
    check((await trap.textContent()).includes("Trappola"), "Revealed trap label missing");
    await shot("04-player-trap-fire");
    passed.push(
      "(2) DM hidden cone 4,5 m 'Trappola' (private log, absent from the player's page), revealed with Fuoco (shared log), locked: drag left it in place",
    );

    // ------------------------------------------------------------------ (3) cone measure
    await tool("Misura");
    await bar().getByRole("button", { name: "Cono" }).click();
    // A drag measures while the button is held and goes on release (Owlbear VTL-135,
    // DDB Ruler DDB-124).
    {
      const a = await at(250, 380);
      const b = await at(400, 380);
      await page.mouse.move(a.x, a.y);
      await page.mouse.down();
      for (let i = 1; i <= 8; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / 8, a.y);
      check(
        (await page.locator('[data-annot-measure="local"]').count()) === 1,
        "Private cone not drawn while dragging",
      );
      await shot("05-player-cone-private");
      await page.mouse.up();
      await page.waitForTimeout(200);
    }
    check(
      (await page.locator('[data-annot-measure="local"]').count()) === 0,
      "The dragged cone stayed after release",
    );
    check(
      (await page.locator("#map-message").textContent()).startsWith(
        "Cono · lunghezza 4,5 m · temporanea",
      ),
      "Cone readout missing after release",
    );
    check((await slice()).measures.length === 0, "Private measurement reached shared state");
    // Arrow keys + Enter from Livia pin the cone (Owlbear permanent ruler), still private.
    await map.focus();
    for (const k of ["ArrowRight", "ArrowRight", "ArrowRight"]) await page.keyboard.press(k);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    check(
      (await page.locator('[data-annot-measure="local"]').count()) === 1,
      "Pinned private cone missing",
    );
    check((await slice()).measures.length === 0, "Pinned private cone reached shared state");
    await bar().getByRole("button", { name: "Solo per te" }).click();
    await page.waitForTimeout(250);
    s = await slice();
    check(
      s.measures.length === 1 &&
        s.measures[0].shape === "cone" &&
        s.measures[0].author === "player",
      "Cone not shared",
    );
    check(
      (await stored()).log.at(-1).visibility === "private",
      "A shared measurement entered the others' log",
    );
    await role("dm");
    await go("table");
    const shared = page.locator("[data-annot-measure]").filter({ hasText: "Livia" });
    check((await shared.count()) === 1, "DM does not see Livia's shared cone");
    await shot("06-dm-sees-shared-cone");
    passed.push(
      "(3) Cone dragged privately: drawn while held, gone on release (readout kept); pinned with arrows + Enter, then 'Condivisa': the DM sees 'Livia: Cono · lunghezza …' (private log line, not an undo step)",
    );

    // ------------------------------------------------------------------ (4) pings, arrows, recall
    await role("player");
    await go("table");
    await tool("Puntatore");
    // B62: the taller map puts the scene's (930, 600) under the zoom buttons in the map's
    // corner; the ping goes a little higher on the same edge.
    await clickScene(930, 540);
    await clickScene(800, 560, ["Alt"]);
    await dragScene({ x: 700, y: 420 }, { x: 820, y: 360 });
    check((await page.locator('[data-annot-signal="ping"]').count()) === 1, "Ping not drawn");
    check(
      (await page.locator('[data-annot-signal="alert"]').count()) === 1,
      "Alert ping not drawn",
    );
    check(
      (await page.locator('[data-annot-signal="laser"]').count()) === 1,
      "Laser trail not drawn",
    );
    await role("dm");
    await go("table");
    check(
      (await page.locator('[data-annot-signal="alert"]').count()) === 1,
      "DM does not receive the alert",
    );
    await button("Ingrandisci").click();
    await button("Ingrandisci").click();
    // Visual pass 2 (30/09/2026): the map's box is now the free area inside the floating HUD,
    // taller than the scene, so after two steps one signal is still in view: one step more
    // puts both off the map, as before.
    await button("Ingrandisci").click();
    await page.waitForTimeout(250);
    const arrows = page.locator(".annotations-arrow");
    const arrowCount = await arrows.count();
    check(arrowCount >= 2, "Off-screen arrows missing: " + arrowCount);
    check(
      (await arrows.first().getAttribute("aria-label")).includes("Livia"),
      "Arrow without author",
    );
    check((await page.locator(".annotations-arrow.is-alert").count()) === 1, "Alert arrow missing");
    const boxes = await arrows.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().toJSON()),
    );
    const overlap = boxes.some((a, i) =>
      boxes.some(
        (b, j) =>
          j > i && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom,
      ),
    );
    check(!overlap, "Edge arrows overlap");
    await shot("07-dm-offscreen-arrows");
    const before = await viewBox();
    await page.locator(".annotations-arrow.is-alert").click();
    await page.waitForTimeout(250);
    check((await viewBox()) !== before, "Arrow did not move the view");
    // The DM proposes a view (Shift+click); nothing moves until the player accepts.
    await tool("Puntatore");
    await clickScene(880, 560, ["Shift"]);
    const dmZoom = await viewBox();
    await role("player");
    await go("table");
    const banner = page.locator("[data-annot-banner]");
    await banner.waitFor();
    check((await banner.innerText()).includes("DM propone di guardare"), "Proposal banner text");
    const unchanged = await viewBox();
    check(unchanged === "0 0 1000 650", "Player view moved without consent: " + unchanged);
    await shot("08-player-recall-proposal");
    await banner.getByRole("button", { name: "Guarda" }).click();
    await page.waitForTimeout(250);
    const accepted = (await viewBox()).split(" ").map(Number);
    check(
      accepted[2] < 1000 && accepted[0] > 0,
      "Accepting did not centre the view: " + accepted.join(" "),
    );
    await role("dm");
    await go("table");
    await tool("Puntatore");
    check((await bar().innerText()).includes("ha accettato"), "DM does not see the answer");
    passed.push(
      `(4) Player ping + Alt alert + laser; DM zoomed in sees ${arrowCount} edge arrows (alert blinking), arrow click recentres; DM Shift+click proposal: player view unchanged until 'Guarda' (viewBox ${accepted.map(Math.round).join(" ")}), DM sees 'ha accettato' (DM viewBox width ${Math.round(Number(dmZoom.split(" ")[2]))})`,
    );

    // ------------------------------------------------------------------ (5) rings and distances
    await role("player");
    await go("table");
    await tool("Misura");
    await bar().getByRole("button", { name: "Anelli" }).click();
    await bar().locator('[data-annot-pref="ring-theme"]').selectOption("deuteranopia");
    await page.waitForTimeout(150);
    // Solo per te again for rings (the share switch is remembered: turn it off first).
    // The share switch is remembered from (3): switching it off withdraws the shared cone
    // (Roll20 broadcast off), which stays visible only to Livia.
    await bar().getByRole("button", { name: "Condivisa con il tavolo" }).click();
    await page.waitForTimeout(200);
    check((await slice()).measures.length === 0, "Switching sharing off kept the shared cone");
    const livia = await at(250, 380);
    await page.mouse.click(livia.x, livia.y);
    await page.waitForTimeout(200);
    check(
      (await page.locator('[data-annot-rings][data-theme="deuteranopia"]').count()) === 1,
      "Themed rings missing",
    );
    const distances = page.locator("[data-annot-distances]");
    const rowText = async (name) =>
      distances.locator(".annotations-dist-row", { hasText: name }).innerText();
    const esploratoreBefore = await rowText("Esploratore");
    const sentinella = await rowText("Sentinella");
    check(sentinella.includes("↑ 3 m"), "Sentinella elevation missing in distances: " + sentinella);
    await tool("Muovi");
    // W2b1 integration: the courtyard gained a hidden pressure plate (B41, x 400-450,
    // y 350-410) that stops whoever enters it, and the fountain's water (B40); the moves of
    // (5) and (6) run lower, clear of both, with the same assertions.
    await dragScene({ x: 250, y: 380 }, { x: 430, y: 440 });
    await page.waitForTimeout(250);
    const esploratoreAfter = await rowText("Esploratore");
    check(esploratoreAfter !== esploratoreBefore, "Distance list not updated after moving");
    check(
      (await page.locator("[data-annot-rings] circle").first().getAttribute("cx")) === "250",
      "Rings followed the token",
    );
    check(
      (await page.locator("[data-annot-rings]").textContent()).includes("Livia: spostata di"),
      "Moved distance label missing",
    );
    await distances.locator(".annotations-dist-row", { hasText: "Esploratore" }).click();
    await page.waitForTimeout(200);
    check(
      (await page.locator(".annotations-temp-ruler").count()) === 1,
      "Row click did not draw the temporary ruler",
    );
    await shot("09-rings-distances-after-move");
    await distances.scrollIntoViewIfNeeded();
    await distances.screenshot({ path: dir + "09b-distances-panel.png" });
    passed.push(
      `(5) Rings (Deuteranopia) stay at Livia's start after the move; distances nearest first with the Sentinella ↑3 m; Esploratore ${esploratoreBefore.replace(/\n/g, " ")} → ${esploratoreAfter.replace(/\n/g, " ")}; row click draws a temporary ruler`,
    );

    // ------------------------------------------------------------------ (6) aura via token menu
    await tool("Muovi");
    const liviaNow = await at(430, 440);
    await page.mouse.click(liviaNow.x, liviaNow.y, { button: "right" });
    await menuPick(page, "Aura…"); // B62: Aspetto submenu
    await dialog.locator("[name=radius]").fill("3");
    await submitDialog();
    s = await slice();
    check(
      s.auras.length === 1 && s.auras[0].radius === 3 && s.auras[0].actorId === "livia",
      "Aura not stored",
    );
    const auraX = async () =>
      Number(await page.locator("[data-annot-aura] circle").getAttribute("cx"));
    check((await auraX()) === 430, "Aura not on Livia");
    await dragScene({ x: 430, y: 440 }, { x: 330, y: 360 });
    await page.waitForTimeout(250);
    check((await auraX()) !== 430, "Aura did not follow the token");
    check((await page.locator("[data-annot-aura]").textContent()).includes("3 m"), "Aura label");
    await shot("10-aura-follows-livia");
    // Owlbear "Add Aura": reopening starts from a new aura, the first one is edited only
    // from its own row (no silent overwrite).
    const liviaMoved = await at(330, 360);
    await page.mouse.click(liviaMoved.x, liviaMoved.y, { button: "right" });
    await menuPick(page, "Aura…"); // B62: Aspetto submenu
    check(
      (await dialog.locator("[name=id]").inputValue()) === "" &&
        (await dialog.locator("footer .primary").innerText()) === "Aggiungi aura",
      "The Aura dialog did not reopen on a new aura",
    );
    await dialog.getByRole("button", { name: "Modifica" }).click();
    check(
      (await dialog.locator("[name=id]").inputValue()) === s.auras[0].id &&
        (await dialog.locator("footer .primary").innerText()) === "Salva aura",
      "The row's Edit did not select that aura",
    );
    await dialog.locator("[data-close]").first().click();
    passed.push(
      "(6) Right-click Livia → 'Aura…' 3 m: circle centred on her token, follows her after a drag; reopened, the dialog starts on 'Nuova aura' and edits the first only from its row",
    );

    // ------------------------------------------------------------------ (7) token note on hover
    await tool("Disegna");
    await bar().getByRole("button", { name: "Testo o nota sulla pedina" }).click();
    await clickScene(350, 450);
    await dialog.locator("[name=text]").fill("Ha la chiave del pozzo");
    await submitDialog();
    // A private note on the Sentinella: never readable by the DM.
    const sentinellaPoint = await at(620, 250);
    await page.mouse.click(sentinellaPoint.x, sentinellaPoint.y);
    await page.waitForTimeout(150);
    if (await dialog.evaluate((d) => d.open)) {
      await dialog.locator("[name=text]").fill("Sembra addormentata (mia)");
      await dialog.locator("[name=audience]").selectOption("me");
      await submitDialog();
    }
    s = await stored();
    check(
      s.ext.annotations.tooltips.some((t) => t.actorId === "doran" && t.audience === "all"),
      "Doran note missing",
    );
    check(s.log.at(-1).visibility === "private", "Only-me note not private");
    // Owlbear Tooltips "show to everyone briefly": select Doran, open the note from its
    // info badge, Mostra a tutti.
    await tool("Muovi");
    await clickScene(350, 450);
    await page.locator('[data-annot-tip="doran"]').click();
    await page
      .locator("[data-annot-bubble]")
      .getByRole("button", { name: "Mostra a tutti" })
      .click();
    await page.waitForTimeout(200);
    await role("dm");
    await go("table");
    const bubble = page.locator("[data-annot-bubble]");
    await page.mouse.move(5, 5);
    await page.waitForFunction(() => !document.querySelector("[data-annot-bubble]").hidden);
    check(
      (await bubble.innerText()).includes("mostrata da Livia"),
      "Shown-to-everyone note did not reach the DM",
    );
    const doran = await at(350, 450);
    await page.mouse.move(doran.x, doran.y);
    await page.waitForTimeout(150);
    check((await bubble.innerText()).includes("Ha la chiave del pozzo"), "Hover preview missing");
    await shot("11-dm-hover-token-note");
    const goblin = await at(620, 250);
    await page.mouse.move(goblin.x, goblin.y);
    await page.waitForTimeout(200);
    const goblinText = await bubble.innerText();
    check(!goblinText.includes("mia"), "DM reads the player's Only me note");
    check(goblinText.includes("Sonnecchia"), "DM's own seeded note missing on hover");
    // Keyboard: focusing a token previews its notes like the hover does.
    await page.mouse.move(5, 5);
    await page.locator('[data-actor="doran"]').focus();
    await page.waitForTimeout(150);
    check((await bubble.innerText()).includes("Ha la chiave del pozzo"), "Focus preview missing");
    passed.push(
      "(7) Text tool on Doran writes a note; 'Mostra a tutti' pops it on the DM's Table ('mostrata da Livia'); the DM's hover and keyboard focus preview it; the player's 'Solo io' note on the Sentinella never reaches the DM (who sees only his own)",
    );

    // ------------------------------------------------------------------ (8) tool memory + reload
    await role("player");
    await page.reload();
    await page.locator("#battle-map").waitFor();
    await tool("Disegna");
    check(
      (await bar().locator('[data-annot-swatches="draw"]').getAttribute("aria-label")).endsWith(
        "Blu",
      ),
      "Last colour lost after reload",
    );
    await tool("Misura");
    check(
      (await bar().locator('[data-annot-pref="ring-theme"]').inputValue()) === "deuteranopia",
      "Ring theme lost",
    );
    s = await slice();
    check(
      s.auras.length === 1 && s.templates.length === 1 && s.tooltips.length === 3,
      "Shared annotations lost after reload",
    );
    passed.push(
      "(8) After reload: Draw colour still Blu, ring theme Deuteranopia (device memory); aura, trap and token notes persist",
    );

    // ------------------------------------------------------------------ keyboard + offline
    await tool("Puntatore");
    await map.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    check((await page.locator('[data-annot-signal="ping"]').count()) >= 1, "Keyboard ping missing");
    await tool("Misura");
    await bar().getByRole("button", { name: "Linea" }).click();
    await map.focus();
    for (const k of ["ArrowRight", "ArrowRight", "ArrowDown"]) await page.keyboard.press(k);
    check(
      (await page.locator("#map-message").textContent()).includes("Misura diretta"),
      "Keyboard measure readout",
    );
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    await button("Preferenze").click();
    await dialog.locator("[name=offline]").check();
    await dialog.getByRole("button", { name: "Salva preferenze" }).click();
    await page.waitForTimeout(200);
    await tool("Disegna");
    await bar().getByRole("button", { name: "Freccia" }).click();
    const count = (await slice()).marks.length;
    await dragScene({ x: 300, y: 200 }, { x: 420, y: 200 });
    check((await slice()).marks.length === count, "Offline drawing was applied");
    check(
      (await page.locator("#toast").textContent()).includes("senza rete"),
      "Offline refusal not shown",
    );
    await button("Preferenze").click();
    await dialog.locator("[name=offline]").uncheck();
    await dialog.getByRole("button", { name: "Salva preferenze" }).click();
    await page.waitForTimeout(200);
    check(await noOverflow(), "Overflow at 1440");
    passed.push(
      "Keyboard: arrows + Enter ping and measure (Misura diretta readout); offline: drawing refused with a readable message; no overflow at 1440",
    );

    // ------------------------------------------------------------------ EN phone 390 with touch
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
    const phoneContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    phone = await phoneContext.newPage();
    phone.on("pageerror", (error) => errors.push("phone: " + error.message));
    await phone.goto(base);
    await phone.evaluate(([k, v]) => localStorage.setItem(k, v), [key, snapshot]);
    await phone.reload();
    await phone.locator("#content").waitFor();
    await phone.getByRole("button", { name: "Preferenze", exact: true }).tap();
    await phone.locator("#dialog [name=lang]").selectOption("en");
    await phone.getByRole("button", { name: "Salva preferenze", exact: true }).tap();
    await phone.locator("#demo-role").selectOption("player");
    await phone.goto(base + "#table");
    await phone.locator("#battle-map").waitFor();
    await phone.waitForTimeout(300);
    await tool("Draw", phone, true);
    const phoneBar = phone.locator("[data-annot-bar]");
    await phoneBar.getByRole("button", { name: "Text or token note" }).tap();
    const tapPoint = await at(560, 150, phone);
    await phone.touchscreen.tap(tapPoint.x, tapPoint.y);
    await phone.locator("#dialog [name=text]").fill("Exit");
    await phone.locator("#dialog footer .primary").tap();
    await phone.waitForTimeout(250);
    const phoneMarks = await phone.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)).ext.annotations.marks,
      key,
    );
    check(
      phoneMarks.some((m) => m.text === "Exit"),
      "Touch text not added",
    );
    check(
      (await phoneBar.getByRole("button", { name: "Clear mine" }).count()) === 1,
      "Bar not English",
    );
    const small = await phone.evaluate(
      () =>
        [...document.querySelectorAll("[data-annot-bar] button, [data-annot-bar] select")]
          .map((el) => el.getBoundingClientRect())
          .filter((r) => r.width && (r.width < 39.5 || r.height < 39.5)).length,
    );
    check(small === 0, `Touch targets under 40px: ${small}`);
    check(await noOverflow(phone), "Phone overflow on the Table");
    await tool("Measure", phone, true);
    check(
      (await phone.locator("[data-annot-bar]").innerText()).includes("Only for you") ||
        (await phone.locator("[data-annot-bar]").innerText()).includes("Shared with the table"),
      "Measure bar not English",
    );
    await phone.screenshot({ path: dir + "12-phone-en-measure.png" });
    await tool("Draw", phone, true);
    await phone.screenshot({ path: dir + "13-phone-en-draw.png" });
    // Touch has no hover: select Doran, then tap the info badge (Owlbear Tooltips).
    await tool("Move", phone, true);
    const doranTap = await at(350, 450, phone);
    await phone.touchscreen.tap(doranTap.x, doranTap.y);
    await phone.waitForTimeout(250);
    const badge = phone.locator('[data-annot-tip="doran"]');
    const badgeBox = await badge.boundingBox();
    check(
      badgeBox && badgeBox.width >= 39.5 && badgeBox.height >= 39.5,
      "Info badge touch target under 40px: " + JSON.stringify(badgeBox),
    );
    await phone.touchscreen.tap(badgeBox.x + badgeBox.width / 2, badgeBox.y + badgeBox.height / 2);
    await phone.waitForTimeout(250);
    const phoneBubble = phone.locator("[data-annot-bubble]");
    check(
      !(await phoneBubble.evaluate((b) => b.hidden)) &&
        (await phoneBubble.innerText()).includes("Ha la chiave del pozzo"),
      "Tapped badge did not open the note",
    );
    check(
      (await phoneBubble.getAttribute("class")).includes("is-pinned") &&
        (await phoneBubble.getByRole("button", { name: "Edit" }).count()) === 1,
      "Pinned note without its actions",
    );
    check(await noOverflow(phone), "Phone overflow with the note open");
    await phone.screenshot({ path: dir + "14-phone-en-token-note.png" });
    // The Annotations drawer and the Preferences tool memory fit the phone.
    await openTablePanel(phone, "annotations-list", true);
    await phone.locator("[data-annot-list]").waitFor();
    check(
      (await phone.locator("[data-annot-list]").innerText()).includes("Token notes"),
      "Drawer not English",
    );
    check(await noOverflow(phone), "Phone overflow with the Annotations drawer");
    await phone.locator("[data-annot-list]").scrollIntoViewIfNeeded();
    await phone.screenshot({ path: dir + "15-phone-en-annotations-drawer.png" });
    await phone.getByRole("button", { name: "Preferences", exact: true }).tap();
    check(
      (await phone.locator("#dialog").innerText()).includes("Table: last tool choices"),
      "Tool memory not in Preferences",
    );
    check(await noOverflow(phone), "Phone overflow with Preferences");
    await phone.locator("#dialog footer button").first().tap();
    passed.push(
      "EN phone 390 (touch): Draw/Measure chips and bars in English, text added with a tap, bar controls ≥ 40px, Doran's note opened by tapping the 40px info badge, no overflow",
    );
    await phoneContext.close();
    await context.close();
    check(!errors.length, "Page errors: " + errors.join(" | "));
    return { passed, errors };
  } catch (error) {
    await page.screenshot({ path: dir + "failure.png", fullPage: true }).catch(() => {});
    if (phone)
      await phone.screenshot({ path: dir + "failure-phone.png", fullPage: true }).catch(() => {});
    throw Object.assign(error, {
      message: error.message + " | passed: " + passed.length + " | errors: " + errors.join(" | "),
    });
  }
};
