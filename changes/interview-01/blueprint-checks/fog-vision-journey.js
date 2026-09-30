async (rootPage) => {
  // B62: shows a token-menu command by id (opening the labelled submenu that holds it)
  // and returns its locator, for a journey that waits for it or presses it itself.
  const revealMenuItem = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const menu = page.locator("body > .token-menu");
    const item = menu.locator(`[data-token-menu-item="${id}"]`);
    await menu.locator("[data-nav]").first().waitFor();
    if (await item.count()) return item.first();
    const ids = await menu
      .locator("[data-token-menu-category]")
      .evaluateAll((els) => els.map((e) => e.dataset.tokenMenuCategory));
    for (const category of ids) {
      await press(menu.locator(`[data-token-menu-category="${category}"]`));
      if (await item.count()) return item.first();
      await press(menu.locator("[data-token-menu-back]"));
    }
    return item.first();
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
  // B35 — Table: fog, lights and vision. Acceptance checks of the card in
  // docs/interview/CAPABILITY_CENSUS.md (#### B35) with real clicks, drags, keys and touch:
  // (1) cover all, reveal a room by polygon and with the Medium brush, player preview, the
  // DM sees through; (2) a torch with its 2024 radii put out and lit again, magical darkness
  // suppresses it, day/night cycle; (3) Livia with darkvision sees past the open door but not
  // through the wall, Doran without darkvision sees less; (4) per-player explored memory,
  // edited and reset, "shared memory" option; (5) a teleport with "update on drop" does not
  // reveal the path; (6) "See as the token" gives the DM the opaque player view (panel and
  // Shift+V); (7) window and one-way barrier block by type; (8) lighting diagnostics count
  // the sources and highlight them; (9) controlled tokens stay above the darkness. Plus
  // Undo, reload persistence, offline refusal, EN phone 390 with touch. Synthetic data;
  // resets this browser's local state.
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B35/";
  const TOWER = "lantern-tower";
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
  const slice = async () => (await stored()).ext["fog-vision"];
  const sceneCfg = async (id) => (await slice()).scenes[id];
  const dialog = page.locator("#dialog");
  const role = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForTimeout(250);
  };
  const shot = (name, p = page) => p.screenshot({ path: dir + name + ".png" });
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const go = async (hash, p = page) => {
    await p.goto(base + "#" + hash);
    await p.locator("#content").waitFor();
    await p.waitForTimeout(250);
  };
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
  const clickScene = async (x, y) => {
    const p = await at(x, y);
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(180);
  };
  const dragScene = async (from, to) => {
    const a = await at(from.x, from.y);
    const b = await at(to.x, to.y);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++)
      await page.mouse.move(a.x + ((b.x - a.x) * i) / 10, a.y + ((b.y - a.y) * i) / 10);
    await page.mouse.up();
    await page.waitForTimeout(220);
  };
  const groupOf = (name, p = page) =>
    p
      .locator(".map-tool-cluster", { has: p.locator(`[data-tool][aria-label="${name}"]`) })
      .locator("[data-tool-group]");
  // Refreshed by R3 (27/09/2026), P6 TV-06: on a phone the map tools fold behind «Strumenti
  // della mappa»; a tool counts as offered once the fold opens onto it, and using it unfolds.
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
    await p.waitForTimeout(200);
  };
  // A contained failure of an area shows "… con avvisi" in the strip; the report says which.
  const noAreaWarnings = async (where, p = page) => {
    const link = p.getByText(/con avvisi|with warnings/).first();
    if (!(await link.count())) return;
    await link.click();
    await p.waitForTimeout(250);
    const report = await p.locator("#dialog").innerText();
    throw Error(`Area warning after ${where}: ${report.slice(-1800)}`);
  };
  const bar = (p = page) => p.locator("[data-fv-bar]");
  const barButton = (name, p = page) => bar(p).getByRole("button", { name, exact: true });
  const layer = (p = page) => p.locator(".fv-fog-layer");
  // The DM's own view of a scene without fog draws no fog layer at all.
  const viewMode = async (p = page) =>
    (await layer(p).count()) ? layer(p).getAttribute("data-fv-mode") : "dm";
  const hiddenTokens = async (p = page) =>
    ((await layer(p).getAttribute("data-fv-hidden-tokens")) ?? "").split(" ").filter(Boolean);
  const tokenShown = (id, p = page) =>
    p.locator(`#battle-map .map-token[data-actor="${id}"]`).isVisible();
  const panelTab = async (p = page, tap = false) => {
    await openTablePanel(p, "fog-vision-panel", tap); // B62: Scene › Vision
    await p.locator("[data-fv-panel]").waitFor();
  };
  const panelButton = (name, p = page) =>
    p.locator("[data-fv-panel]").getByRole("button", { name, exact: true });
  // Reads the explored memory in the stored state through the area's own domain module.
  const explored = (actors, x, y) =>
    page.evaluate(
      async ([k, ids, px, py, scene]) => {
        const D = await import("/fog-vision-domain.mjs");
        const state = JSON.parse(localStorage.getItem(k));
        const s = state.scenes.find((row) => row.id === scene);
        return D.bitAt(D.memoryBits(state, scene, ids), D.cellIndex(s, { x: px, y: py }));
      },
      [key, actors, x, y, TOWER],
    );
  const token = async (id) =>
    (await stored()).scenes.find((s) => s.id === TOWER).tokens.find((t) => t.actorId === id);
  const teleport = async (actorId, x, y) => {
    const t = await token(actorId);
    await clickScene(t.x, t.y);
    await clickScene(x, y);
    const moved = await token(actorId);
    check(
      Math.abs(moved.x - x) < 1 && Math.abs(moved.y - y) < 1,
      `Teleport of ${actorId} failed: ${JSON.stringify(moved)} ${await page.locator("#toast").textContent()}`,
    );
  };

  try {
    await go("table");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator("#battle-map").waitFor();
    let s = await stored();
    check(
      s.scenes[0].id === "old-watch" && s.scenes.some((row) => row.id === TOWER),
      "Lantern tower scene not seeded after the courtyard",
    );
    await role("player");
    await go("table");
    check(!(await offered("Nebbia")), "Players must not get the fog tool");

    // ---------------------------------------------------------------- (1) manual fog
    await role("dm");
    await go("table");
    // The Table tip (B30) is dismissed once, as a DM would.
    const gotIt = page.getByRole("button", { name: "Ho capito", exact: true });
    if (await gotIt.isVisible().catch(() => false)) await gotIt.click();
    check(await offered("Nebbia"), "Fog tool missing for the DM");
    check(await offered("Luci"), "Lights tool missing");
    check(await offered("Barriere"), "Barriers tool missing");
    await tool("Nebbia");
    check(
      (await page.locator('[data-tool-group="fog"]').getAttribute("aria-pressed")) === "true",
      "Fog tool not in the left toolbar's fog group",
    );
    await barButton("Copri tutto").click();
    await page.waitForTimeout(200);
    let fog = (await sceneCfg("old-watch")).fog;
    check(fog.length === 1 && fog[0].shape === "all" && fog[0].op === "cover", "Cover all failed");
    await barButton("Rivela").click();
    await barButton("Poligono").click();
    // The courtyard's top-left room, corner by corner; a click on the first point closes it.
    for (const [x, y] of [
      [95, 75],
      [335, 75],
      [335, 195],
      [95, 195],
    ])
      await clickScene(x, y);
    check((await bar().innerText()).includes("Punti: 4"), "Polygon points not shown in the bar");
    await clickScene(97, 77);
    fog = (await sceneCfg("old-watch")).fog;
    check(
      fog.length === 2 && fog[1].shape === "polygon" && fog[1].op === "reveal",
      "Polygon reveal not stored: " + JSON.stringify(fog.at(-1)),
    );
    await barButton("Pennello").click();
    await bar().locator('[data-fv-fog-select="size"]').selectOption("medium");
    await dragScene({ x: 250, y: 380 }, { x: 560, y: 380 });
    fog = (await sceneCfg("old-watch")).fog;
    check(
      fog.length === 3 && fog[2].shape === "brush" && fog[2].size === "medium",
      "Medium brush reveal not stored",
    );
    check((await layer().getAttribute("data-fv-mode")) === "dm", "DM not in DM mode");
    check(await tokenShown("goblin-1"), "DM does not see through the fog");
    check((await page.locator(".fv-fog.is-dm").count()) === 1, "DM fog not translucent");
    await shot("01-dm-fog-see-through");
    await barButton("Anteprima giocatori").click();
    await page.waitForTimeout(200);
    check(
      (await page.locator('[data-fv-banner="preview"]').count()) === 1,
      "Player preview banner missing",
    );
    check(
      !(await tokenShown("goblin-1")) && !(await tokenShown("goblin-2")),
      "Goblins visible in the player preview",
    );
    check(await tokenShown("livia"), "Livia hidden in the preview although revealed");
    await shot("02-dm-player-preview");
    await page.locator('[data-fv-banner="preview"]').getByRole("button").click();
    await page.waitForTimeout(150);
    check((await layer().getAttribute("data-fv-mode")) === "dm", "Preview not left");
    // Undo in the bar removes the brush stroke with a correction record; drawn again after.
    await barButton("Annulla").click();
    await page.waitForTimeout(200);
    s = await stored();
    check(
      s.ext["fog-vision"].scenes["old-watch"].fog.length === 2 &&
        s.log.at(-1).kind === "correction",
      "Undo did not remove the brush stroke",
    );
    await dragScene({ x: 250, y: 380 }, { x: 560, y: 380 });
    check((await sceneCfg("old-watch")).fog.length === 3, "Brush not drawn again");
    await page.reload();
    await page.locator("#battle-map").waitFor();
    check((await sceneCfg("old-watch")).fog.length === 3, "Fog lost on reload");
    await role("player");
    await go("table");
    check((await layer().getAttribute("data-fv-mode")) === "player", "Player not in player mode");
    check(
      !(await tokenShown("goblin-1")) && !(await tokenShown("goblin-2")),
      "Player sees goblins under the fog",
    );
    check(await tokenShown("livia"), "Player does not see Livia in the revealed path");
    check(
      (await page.locator('[data-token-for="goblin-1"]').count()) === 1 &&
        !(await page.locator('[data-token-for="goblin-1"]').isVisible()),
      "The Sentinella's elevation badge shows through the fog",
    );
    await shot("03-player-fog-opaque");
    passed.push(
      "(1) DM: Cover all, polygon reveal of the top-left room (4 clicks + first point), Medium brush along the courtyard; DM sees through (hatched), Player preview hides the goblins; Undo removes the stroke (correction); reload keeps 3 fog areas; the player sees it opaque",
    );
    await noAreaWarnings("step 1");

    // ---------------------------------------------------------------- (8) diagnostics, (2) lights
    await role("dm");
    await go("preparation");
    const activate = page.locator(`[data-prep-activate="${TOWER}"]`).first();
    await activate.evaluate((b) => {
      const details = b.closest("details");
      if (details) details.open = true;
    });
    await activate.click();
    await page.waitForTimeout(250);
    // Session areas ask whom to show the scene to (B14): the whole party.
    if (await dialog.evaluate((d) => d.open)) await dialog.locator("footer .primary").click();
    await page.waitForTimeout(250);
    check((await stored()).activeSceneId === TOWER, "Tower scene not activated");
    await go("table");
    await panelTab();
    const panel = page.locator("[data-fv-panel]");
    const counts = () => panel.locator(".fv-counts").innerText();
    check(
      (await counts()).includes("Pedine con visione: 3") &&
        (await counts()).includes("Fonti di luce: 3 (2 accese)"),
      "Diagnostics counts wrong: " + (await counts()),
    );
    await panel.locator('[data-fv-diag="tower-torch"]').hover();
    await page.waitForTimeout(250);
    check(
      (await page
        .locator('[data-fv-mark="tower-torch"]')
        .evaluate((el) => getComputedStyle(el).opacity)) === "1",
      "Hovering a diagnostics row does not highlight the light",
    );
    await shot("04-dm-tower-diagnostics");
    passed.push(
      "(8) Diagnostics: 3 vision tokens, 3 light sources (2 on), hovering the torch row highlights it on the map",
    );
    await noAreaWarnings("step 2");
    await tool("Luci");
    await page.locator('[data-fv-light="tower-torch"]').click();
    await page.waitForTimeout(200);
    check((await bar().innerText()).includes("Torcia a muro"), "Torch not selected");
    check((await bar().innerText()).includes("IT p. 113"), "Torch SRD source not shown");
    check(
      (await bar().locator('[data-fv-light-field="bright"]').inputValue()) === "6" &&
        (await bar().locator('[data-fv-light-field="dim"]').inputValue()) === "6",
      "Torch radii not 6 + 6 m",
    );
    await barButton("Spegni").click();
    await page.waitForTimeout(200);
    let lights = (await sceneCfg(TOWER)).lights;
    check(lights.find((l) => l.id === "tower-torch").on === false, "Torch not put out");
    check((await counts()).includes("(1 accese)"), "Diagnostics did not update");
    await shot("05-dm-torch-out");
    await barButton("Accendi").click();
    await page.waitForTimeout(200);
    check(
      (await sceneCfg(TOWER)).lights.find((l) => l.id === "tower-torch").on === true,
      "Torch not lit again",
    );
    // Keyboard path: a diagnostics row selects its light in the Lights tool; arrows + Enter
    // move it half a square; Undo in the bar puts it back.
    await panel.locator('[data-fv-diag-edit="tower-store-lantern"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
    check(
      (await bar().innerText()).includes("Lanterna del magazzino"),
      "Diagnostics 'Modifica' did not select the lantern",
    );
    check(
      (await page.evaluate(() => document.activeElement?.dataset.fvFocus)) === "light-toggle",
      "Focus did not land in the light's bar",
    );
    await page.locator("#battle-map").focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    check(
      (await sceneCfg(TOWER)).lights.find((l) => l.id === "tower-store-lantern").x === 825,
      "Keyboard nudge did not move the lantern",
    );
    await barButton("Annulla").click();
    await page.waitForTimeout(200);
    check(
      (await sceneCfg(TOWER)).lights.find((l) => l.id === "tower-store-lantern").x === 850,
      "Undo did not put the lantern back",
    );
    await barButton("Deseleziona").click();
    await bar().locator("[data-fv-light-preset]").selectOption("darkness");
    await clickScene(330, 110);
    lights = (await sceneCfg(TOWER)).lights;
    const darkness = lights.find((l) => l.preset === "darkness");
    check(darkness && darkness.magical && darkness.bright === 4.5, "Darkness not placed");
    check(
      (await panel.locator('[data-fv-diag="tower-torch"]').innerText()).includes("Soppressa"),
      "Magical darkness does not suppress the torch",
    );
    await shot("06-dm-darkness-suppresses-torch");
    await barButton("Elimina").click();
    await page.waitForTimeout(200);
    check(
      !(await sceneCfg(TOWER)).lights.some((l) => l.preset === "darkness"),
      "Darkness not deleted",
    );
    await panelButton("Giorno").click();
    await page.waitForTimeout(80);
    const fading = await page.locator(".fv-ambient").evaluate((r) => ({
      target: r.dataset.fvAmbient,
      remaining: Number(r.dataset.fvRemaining),
    }));
    check(
      fading.target === "0" && fading.remaining > 600,
      "Day/night change is not a timed transition: " + JSON.stringify(fading),
    );
    await page.waitForTimeout(1600);
    check((await sceneCfg(TOWER)).phase === "day", "Day not set");
    const veil = page.locator(".fv-ambient");
    check(
      (await veil.count()) === 0 || (await veil.getAttribute("opacity")) === "0",
      "Night veil did not fade out by day",
    );
    await shot("07-dm-day");
    await panelButton("Passa al momento successivo").click();
    await page.waitForTimeout(250);
    check((await sceneCfg(TOWER)).phase === "dusk", "Next phase is not dusk");
    await panelButton("Notte").click();
    await page.waitForTimeout(1400);
    check((await sceneCfg(TOWER)).phase === "night", "Night not set back");
    passed.push(
      "(2) Lights tool: torch 6 + 6 m (SRD IT p. 113) put out and lit again, diagnostics 1 → 2 on; keyboard: diagnostics 'Modifica' selects the store lantern, arrows + Enter move it, Undo restores; Darkness (4.5 m) placed on it suppresses it, deleted; Day fades the veil (opacity 0), next phase = dusk, back to night",
    );
    await noAreaWarnings("step 3");

    // ---------------------------------------------------------------- (3) darkvision and walls
    await tool("Teletrasporta (DM)");
    await teleport("livia", 450, 175);
    await teleport("doran", 450, 245);
    await tool("Muovi");
    await page.locator('#battle-map [data-door="tower-store-door"]').click();
    await dialog.locator("summary").click();
    await dialog.getByRole("button", { name: "Imposta aperta" }).click();
    await page.waitForTimeout(250);
    if (await dialog.evaluate((d) => d.open))
      await dialog.getByRole("button", { name: "Torna alla mappa" }).click();
    check(
      (await stored()).scenes
        .find((row) => row.id === TOWER)
        .walls.find((w) => w.id === "tower-store-door").doorState === "open",
      "Store door not opened",
    );
    await panelTab();
    await panelButton("Vedi come Livia").click();
    await page.waitForTimeout(250);
    check((await viewMode()) === "as-token", "View as Livia not active");
    check(
      !(await hiddenTokens()).includes("goblin-2"),
      "Livia's darkvision does not reach the goblin past the open door",
    );
    check((await hiddenTokens()).includes("goblin-1"), "Livia sees through the wall");
    check(await tokenShown("goblin-2"), "Goblin in the storeroom hidden for Livia");
    await shot("08-as-livia-darkvision-open-door");
    await panelButton("Vedi come Doran").click();
    await page.waitForTimeout(250);
    check(
      (await hiddenTokens()).includes("goblin-2"),
      "Doran without darkvision sees the goblin in the dark storeroom",
    );
    await shot("09-as-doran-no-darkvision");
    passed.push(
      "(3) Door opened by the DM; as Livia (darkvision 18 m) the goblin in the dark storeroom is visible, the Sentinella behind the wall is not; as Doran (no darkvision) the goblin is hidden",
    );
    await noAreaWarnings("step 4");

    // ---------------------------------------------------------------- (6) Shift+V
    await page.locator('[data-fv-banner="as-token"]').getByRole("button").click();
    await page.waitForTimeout(150);
    await clickScene(450, 175);
    await page.keyboard.press("Shift+V");
    await page.waitForTimeout(250);
    check(
      (await page.locator('[data-fv-banner="as-token"]').innerText()).includes("Livia"),
      "Shift+V did not start the vision check on the selected token",
    );
    check(
      (await page.locator(".fv-unexplored").count()) === 1,
      "The vision check does not show the opaque fog",
    );
    await page.keyboard.press("Shift+V");
    await page.waitForTimeout(200);
    check((await viewMode()) === "dm", "Shift+V did not end the check");
    // The token menu (B12) offers the same check on a token.
    await page.locator('#battle-map .map-token[data-actor="doran"]').click({ button: "right" });
    const tokenMenu = page.locator("body > .token-menu");
    await (await revealMenuItem(page, "fog-vision-view-as")).click(); // B62: «Visibilità»
    await page.waitForTimeout(250);
    check(
      (await page.locator('[data-fv-banner="as-token"]').innerText()).includes("Doran"),
      "Token menu 'Vedi con questa pedina' did not start Doran's view",
    );
    await page.locator('[data-fv-banner="as-token"]').getByRole("button").click();
    await page.waitForTimeout(150);
    passed.push(
      "(6) Vision check: panel 'Vedi come …', Shift+V on the selected token and the token menu item 'Vedi con questa pedina' show the opaque player view (banner, unexplored overlay); Shift+V again and 'Torna alla vista del DM' return to the DM view",
    );
    await noAreaWarnings("step 5");

    // ---------------------------------------------------------------- (4) memory
    check((await explored(["livia"], 650, 200)) === 1, "Livia's memory lacks the storeroom");
    check((await explored(["doran"], 650, 200)) === 0, "Doran remembers what he never saw");
    await tool("Teletrasporta (DM)");
    await teleport("livia", 250, 450);
    await role("player");
    await go("table");
    check(
      (await layer().getAttribute("data-fv-memory")) === "livia mira",
      "Per-player memory is not Livia's and Mira's",
    );
    check(!(await tokenShown("goblin-2")), "Memory shows a creature no longer in view");
    await shot("10-player-explored-memory");
    await role("dm");
    await go("table");
    await panelTab();
    await panelButton("Vedi come Doran").click();
    await page.waitForTimeout(200);
    check((await layer().getAttribute("data-fv-memory")) === "doran", "Doran's memory not own");
    await panel.locator('[data-fv-campaign="shared-memory"]').check();
    await page.waitForTimeout(250);
    check(
      (await layer().getAttribute("data-fv-memory")).split(" ").sort().join(" ") ===
        "doran livia mira",
      "Shared memory option not applied",
    );
    await shot("11-as-doran-shared-memory");
    await panel.locator('[data-fv-campaign="shared-memory"]').uncheck();
    await page.waitForTimeout(200);
    await page.locator('[data-fv-banner="as-token"]').getByRole("button").click();
    // Edit Doran's memory: reveal the storeroom with a rectangle.
    await panel.locator('[data-fv-memory-edit="doran"]').click();
    await page.waitForTimeout(200);
    check(
      (await bar().locator('[data-fv-fog-select="target"]').inputValue()) === "memory:doran",
      "Memory edit target not selected",
    );
    await barButton("Rettangolo").click();
    // From below the session bar (B14 HUD) and, refreshed by R3 (27/09/2026), below the map
    // bar's safety buttons (P10 CA-66: Stop and Rallenta at the top of the map).
    await dragScene({ x: 600, y: 215 }, { x: 880, y: 285 });
    check((await explored(["doran"], 650, 250)) === 1, "Doran's memory not edited");
    await panelTab();
    await panel.locator('[data-fv-memory-reset="livia"]').click();
    await page.waitForTimeout(250);
    check((await explored(["livia"], 650, 200)) === 0, "Livia's memory not reset");
    check(
      (await explored(["livia"], 250, 400)) === 1,
      "After a reset the current view is not recorded again",
    );
    passed.push(
      "(4) Memory: Livia remembers the storeroom, Doran not; the player's memory is Livia + Mira; shared option makes Doran's check use the party's; the DM reveals the storeroom in Doran's memory with a rectangle and resets Livia's (current view recorded again)",
    );
    await noAreaWarnings("step 6");

    // ---------------------------------------------------------------- (7) barrier types
    await tool("Barriere");
    await clickScene(551, 255);
    check((await bar().innerText()).includes("Barriera"), "Barrier not selected");
    await barButton("Finestra").click();
    await page.waitForTimeout(200);
    let wall = (await stored()).scenes
      .find((row) => row.id === TOWER)
      .walls.find((w) => w.id === "tower-store-west-2");
    check(
      wall.blocksSight === false && wall.blocksMovement === true,
      "Window type not stored: " + JSON.stringify(wall),
    );
    await panelTab();
    await panelButton("Vedi come Livia").click();
    await page.waitForTimeout(250);
    check(
      !(await hiddenTokens()).includes("goblin-2"),
      "Livia does not see through the window into the storeroom",
    );
    await shot("12-as-livia-through-window");
    await page.locator('[data-fv-banner="as-token"]').getByRole("button").click();
    await page.getByRole("button", { name: "Annulla ultima modifica" }).first().click();
    await page.waitForTimeout(250);
    wall = (await stored()).scenes
      .find((row) => row.id === TOWER)
      .walls.find((w) => w.id === "tower-store-west-2");
    check(wall.blocksSight === true, "Undo did not restore the wall");
    // The one-way mirror: the Sentinella (given vision) sees Doran; Doran cannot see it.
    await panelTab();
    await panel.locator("[data-fv-char] , .fv-char").first().waitFor();
    await panel
      .locator(".fv-char", { hasText: "Sentinella" })
      .getByRole("button", { name: "Visione e luce…" })
      .click();
    await dialog.locator("[name=vision]").check();
    await dialog.locator("footer .primary").click();
    await page.waitForTimeout(250);
    check((await slice()).tokens["goblin-1"]?.vision === true, "Sentinella vision not saved");
    await panelButton("Vedi come Sentinella").click();
    await page.waitForTimeout(250);
    check(
      !(await hiddenTokens()).includes("doran"),
      "The Sentinella does not see Doran through the one-way mirror",
    );
    await shot("13-as-sentinella-one-way-mirror");
    await panelButton("Vedi come Doran").click();
    await page.waitForTimeout(250);
    check(
      (await hiddenTokens()).includes("goblin-1"),
      "Doran sees the Sentinella through the mirror from the hall",
    );
    await page.locator('[data-fv-banner="as-token"]').getByRole("button").click();
    passed.push(
      "(7) Barriers tool: the wall below the store door set to Window (blocks movement, not sight) lets Livia see the storeroom; Undo restores it; the one-way mirror lets the Sentinella see Doran but not Doran the Sentinella",
    );
    await noAreaWarnings("step 7");

    // ---------------------------------------------------------------- (5) update on drop
    await tool("Teletrasporta (DM)");
    await teleport("livia", 450, 175);
    await barButton("Aggiorna la visione solo all’arrivo").click();
    await page.waitForTimeout(200);
    check((await sceneCfg(TOWER)).updateOnDrop === true, "Update on drop not set");
    await teleport("livia", 820, 520);
    check(
      (await explored(["livia"], 640, 260)) === 0,
      "With update on drop the crossed storeroom was revealed",
    );
    await page.getByRole("button", { name: "Annulla ultima modifica" }).first().click();
    await page.waitForTimeout(250);
    check((await token("livia")).x === 450, "Undo did not bring Livia back");
    await barButton("Aggiorna la visione solo all’arrivo").click();
    await page.waitForTimeout(200);
    check((await sceneCfg(TOWER)).updateOnDrop === false, "Update on drop not cleared");
    await teleport("livia", 820, 520);
    check(
      (await explored(["livia"], 640, 260)) === 1,
      "Without update on drop the crossed storeroom is not revealed",
    );
    passed.push(
      "(5) Teleport through the walls with 'update on drop' on: the storeroom crossed on the way stays unexplored; Undo; with it off the same teleport reveals it",
    );
    await noAreaWarnings("step 8");

    // ---------------------------------------------------------------- (9) controlled tokens on top
    await tool("Luci");
    await page.locator('[data-fv-light="tower-torch"]').click({ button: "right" });
    await page.waitForTimeout(250);
    check(
      (await sceneCfg(TOWER)).lights.find((l) => l.id === "tower-torch").on === false,
      "Right-click did not put the torch out",
    );
    await role("player");
    await go("table");
    check(
      (await page.locator('[data-fv-clone="mira"]').count()) === 1,
      "Mira in the dark is not drawn above the darkness",
    );
    await shot("14-player-controlled-on-top");
    await panelTab();
    await page.locator("[data-fv-ontop]").uncheck();
    await page.waitForTimeout(250);
    check((await page.locator('[data-fv-clone="mira"]').count()) === 0, "Setting not applied");
    await page.reload();
    await page.locator("#battle-map").waitFor();
    check(
      (await page.locator('[data-fv-clone="mira"]').count()) === 0,
      "The personal setting is lost on reload",
    );
    await panelTab();
    await page.locator("[data-fv-ontop]").check();
    await page.waitForTimeout(250);
    check((await page.locator('[data-fv-clone="mira"]').count()) === 1, "Clone not back");
    check(
      (await page.locator("[data-fv-panel]").innerText()).includes("Cosa vedono i tuoi personaggi"),
      "Player panel missing",
    );
    passed.push(
      "(9) Torch put out by right-click; as the player Mira (in the dark, out of Livia's sight) is drawn above the darkness; the personal switch turns it off, survives reload, and back on",
    );
    await noAreaWarnings("step 9");

    // ---------------------------------------------------------------- offline, keyboard
    await role("dm");
    await go("table");
    await page.getByRole("button", { name: "Preferenze", exact: true }).click();
    await dialog.locator("[name=offline]").check();
    await dialog.getByRole("button", { name: "Salva preferenze" }).click();
    await page.waitForTimeout(200);
    await tool("Nebbia");
    const before = (await sceneCfg(TOWER)).fog.length;
    await barButton("Copri tutto").click();
    await page.waitForTimeout(200);
    check((await sceneCfg(TOWER)).fog.length === before, "Offline fog change applied");
    check(
      (await page.locator("#toast").textContent()).includes("senza rete"),
      "Offline refusal not shown",
    );
    await page.getByRole("button", { name: "Preferenze", exact: true }).click();
    await dialog.locator("[name=offline]").uncheck();
    await dialog.getByRole("button", { name: "Salva preferenze" }).click();
    await page.waitForTimeout(200);
    // Keyboard: focus the map, arrows move the brush cursor, Enter stamps it.
    await tool("Nebbia");
    await barButton("Copri").click();
    await barButton("Pennello").click();
    await page.locator("#battle-map").focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    fog = (await sceneCfg(TOWER)).fog;
    check(fog.length === before + 1 && fog.at(-1).points.length === 1, "Keyboard brush failed");
    await barButton("Annulla").click();
    await page.waitForTimeout(200);
    check((await sceneCfg(TOWER)).fog.length === before, "Keyboard brush not undone");
    const targets = await bar().evaluate((b) =>
      [...b.querySelectorAll("button,select")].map((el) => el.getBoundingClientRect().height),
    );
    check(
      targets.every((h) => h >= 39.5),
      "HUD controls under 40px: " + targets.join(","),
    );
    check(await noOverflow(), "Overflow at 1440");
    await shot("15-dm-fog-bar");
    passed.push(
      "Offline: fog change refused with 'senza rete'; keyboard: arrows + Enter stamp the brush, Undo in the bar; HUD controls ≥ 40px; no overflow at 1440",
    );
    await noAreaWarnings("step 10");

    // ---------------------------------------------------------------- EN phone 390
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
    await role("player", phone);
    await go("table", phone);
    await phone.locator("#battle-map").waitFor();
    const phoneGotIt = phone.getByRole("button", { name: "Got it", exact: true });
    if (await phoneGotIt.isVisible().catch(() => false)) await phoneGotIt.tap();
    // Livia now stands in the lit stair room beside the Sentinella; Mira waits in the dark.
    check((await viewMode(phone)) === "player", "Phone player not in player mode");
    check(await tokenShown("goblin-1", phone), "Livia does not see the Sentinella beside her");
    check(
      (await phone.locator('[data-fv-clone="mira"]').count()) === 1,
      "Phone: Mira in the dark not drawn above the darkness",
    );
    await panelTab(phone, true);
    const phonePanel = phone.locator("[data-fv-panel]");
    check(
      (await phonePanel.innerText()).includes("What your characters see"),
      "Phone panel not English",
    );
    check(await noOverflow(phone), "Phone overflow with the Vision panel (player)");
    await phonePanel.scrollIntoViewIfNeeded();
    await shot("16-phone-en-player-vision", phone);
    await role("dm", phone);
    await go("table", phone);
    await phone.locator("#battle-map").waitFor();
    if (await phoneGotIt.isVisible().catch(() => false)) await phoneGotIt.tap();
    await tool("Fog", phone, true);
    const phoneBar = phone.locator("[data-fv-bar]");
    check(
      (await phoneBar.getByRole("button", { name: "Cover all", exact: true }).count()) === 1,
      "Phone fog bar not English",
    );
    await phoneBar.getByRole("button", { name: "Reveal", exact: true }).tap();
    const heights = await phoneBar.evaluate((b) =>
      [...b.querySelectorAll("button,select")].map((el) => el.getBoundingClientRect().height),
    );
    check(
      heights.every((h) => h >= 39.5),
      "Phone HUD controls under 40px",
    );
    // Touch drag with the brush on the map.
    // In the hall, above the strip of tool options.
    const a = await at(300, 200, phone);
    const b = await at(460, 200, phone);
    const fogBefore = (await phone.evaluate((k) => JSON.parse(localStorage.getItem(k)), key)).ext[
      "fog-vision"
    ].scenes[TOWER].fog.length;
    await phone.locator("#battle-map").dispatchEvent("pointerdown", {
      pointerId: 7,
      pointerType: "touch",
      clientX: a.x,
      clientY: a.y,
      button: 0,
      isPrimary: true,
    });
    for (let i = 1; i <= 6; i++)
      await phone.locator("#battle-map").dispatchEvent("pointermove", {
        pointerId: 7,
        pointerType: "touch",
        clientX: a.x + ((b.x - a.x) * i) / 6,
        clientY: a.y,
        button: 0,
        isPrimary: true,
      });
    await phone.locator("#battle-map").dispatchEvent("pointerup", {
      pointerId: 7,
      pointerType: "touch",
      clientX: b.x,
      clientY: b.y,
      button: 0,
      isPrimary: true,
    });
    await phone.waitForTimeout(250);
    const phoneFog = (await phone.evaluate((k) => JSON.parse(localStorage.getItem(k)), key)).ext[
      "fog-vision"
    ].scenes[TOWER].fog;
    check(
      phoneFog.length === fogBefore + 1 && phoneFog.at(-1).op === "reveal",
      "Touch brush not stored",
    );
    check(await noOverflow(phone), "Phone overflow with the fog bar");
    await shot("17-phone-en-dm-fog-bar", phone);
    await panelTab(phone, true);
    check(
      (await phone.locator("[data-fv-panel]").innerText()).includes("Lighting diagnostics"),
      "Phone DM panel not English",
    );
    check(await noOverflow(phone), "Phone overflow with the DM Vision panel");
    await phone.locator("[data-fv-diagnostics]").scrollIntoViewIfNeeded();
    await shot("18-phone-en-dm-diagnostics", phone);
    passed.push(
      "EN phone 390 (touch): player Vision panel in English without overflow; DM Fog tool tapped from its group, bar in English with ≥ 40px controls, touch brush stroke stored; DM panel with Lighting diagnostics fits",
    );
    await noAreaWarnings("the phone journey", phone);
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
