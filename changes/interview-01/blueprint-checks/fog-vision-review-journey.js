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
  // B35 review and fixes (independent reviewer): real keys, clicks and roles on the Lantern
  // tower. (1) F opens the Fog tool (DDB-121); Z removes the last polygon point (VTL-071);
  // Escape forgets a keyboard rectangle's first corner. (2) Magical darkness is opaque: the
  // view as Doran loses the store door behind the sphere (SRD Darkness). (3) An invisible
  // barrier is not drawn for the player; the DM still sees it. (4) The player's Creature tab
  // no longer lists the unseen goblins' distances. (5) Darkvision from a builder sheet (a
  // claimed ready-made dwarf) on the live state. Synthetic data; resets this browser's state.
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B35-rf/";
  const TOWER = "lantern-tower";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const cfg = async () => (await stored()).ext["fog-vision"].scenes[TOWER];
  const role = async (value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForTimeout(250);
  };
  const go = async (hash) => {
    await page.goto(base + "#" + hash);
    await page.locator("#content").waitFor();
    await page.waitForTimeout(250);
  };
  const shot = (name) => page.screenshot({ path: dir + name + ".png" });
  const at = (x, y) =>
    page.locator("#battle-map").evaluate(
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
  const bar = () => page.locator("[data-fv-bar]");
  const barButton = (name) => bar().getByRole("button", { name, exact: true });
  const layer = () => page.locator(".fv-fog-layer");
  const attr = async (name) =>
    ((await layer().count()) ? await layer().getAttribute(name) : "") ?? "";
  const groupOf = (name) =>
    page
      .locator(".map-tool-cluster", { has: page.locator(`[data-tool][aria-label="${name}"]`) })
      .locator("[data-tool-group]");
  const tool = async (name) => {
    const chip = page.locator(".map-toolbar").getByRole("button", { name, exact: true });
    if (!(await chip.isVisible())) await groupOf(name).click();
    await chip.click();
    await page.waitForTimeout(200);
  };
  const panelTab = async () => {
    await openTablePanel(page, "fog-vision-panel"); // B62: Scene › Vision
    await page.locator("[data-fv-panel]").waitFor();
  };
  const panelButton = (name) =>
    page.locator("[data-fv-panel]").getByRole("button", { name, exact: true });
  const noAreaWarnings = async (where) => {
    const link = page.getByText(/con avvisi|with warnings/).first();
    if (!(await link.count())) return;
    await link.click();
    await page.waitForTimeout(250);
    throw Error(
      `Area warning after ${where}: ${(await page.locator("#dialog").innerText()).slice(-1500)}`,
    );
  };

  try {
    await go("table");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator("#battle-map").waitFor();
    await role("dm");
    await go("preparation");
    const activate = page.locator(`[data-prep-activate="${TOWER}"]`).first();
    await activate.evaluate((b) => {
      const details = b.closest("details");
      if (details) details.open = true;
    });
    await activate.click();
    await page.waitForTimeout(250);
    if (await page.locator("#dialog").evaluate((d) => d.open))
      await page.locator("#dialog footer .primary").click();
    await page.waitForTimeout(250);
    check((await stored()).activeSceneId === TOWER, "Tower scene not activated");
    await go("table");
    const gotIt = page.getByRole("button", { name: "Ho capito", exact: true });
    if (await gotIt.isVisible().catch(() => false)) await gotIt.click();

    // ------------------------------------------------------------ (1) F, Z, Escape
    await page.locator("#battle-map").focus();
    await page.keyboard.press("f");
    await page.waitForTimeout(250);
    check(
      (await page.locator('[data-tool-group="fog"]').getAttribute("aria-pressed")) === "true" &&
        (await bar().getAttribute("data-fv-bar")) === "fog-vision",
      "F did not open the Fog tool",
    );
    await barButton("Poligono").click();
    for (const [x, y] of [
      [150, 100],
      [400, 100],
      [400, 300],
    ])
      await clickScene(x, y);
    check((await bar().innerText()).includes("Punti: 3"), "Polygon points not placed");
    await page.locator("#battle-map").focus();
    await page.keyboard.press("z");
    await page.waitForTimeout(200);
    check((await bar().innerText()).includes("Punti: 2"), "Z did not remove the last point");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    check(!(await bar().innerText()).includes("Punti:"), "Escape did not drop the polygon");
    // Keyboard rectangle: first corner, Escape, then Enter only sets a new first corner.
    await barButton("Rettangolo").click();
    const before = (await cfg()).fog.length;
    await page.locator("#battle-map").focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    check((await cfg()).fog.length === before, "A stale first corner completed a rectangle");
    await page.keyboard.press("Escape");
    passed.push(
      "(1) F opens the Fog tool from the map; Z removes the last polygon point (3 → 2); Escape drops the polygon and a keyboard rectangle's first corner (no rectangle painted)",
    );
    await noAreaWarnings("step 1");

    // ------------------------------------------------------------ (2) opaque darkness
    await tool("Luci");
    await bar().locator("[data-fv-light-preset]").selectOption("darkness");
    await clickScene(400, 250);
    const darkness = (await cfg()).lights.find((l) => l.preset === "darkness");
    check(darkness && darkness.x === 400, "Darkness not placed");
    await panelTab();
    await panelButton("Vedi come Doran").click();
    await page.waitForTimeout(300);
    check(
      (await attr("data-fv-hidden-doors")).includes("tower-store-door"),
      "Doran still sees the store door through the darkness sphere",
    );
    check((await page.locator(".fv-fog-layer .fv-shadow").count()) >= 1, "No shadow painted");
    await shot("rf-01-as-doran-darkness-opaque");
    await page.locator('[data-fv-banner="as-token"]').getByRole("button").click();
    await page.waitForTimeout(150);
    await tool("Luci");
    await page.locator(`[data-fv-light="${darkness.id}"]`).click();
    await barButton("Elimina").click();
    await page.waitForTimeout(200);
    check(!(await cfg()).lights.some((l) => l.preset === "darkness"), "Darkness not deleted");
    await panelTab();
    await panelButton("Vedi come Doran").click();
    await page.waitForTimeout(250);
    check(
      !(await attr("data-fv-hidden-doors")).includes("tower-store-door"),
      "Without the darkness Doran should see the store door again",
    );
    await page.locator('[data-fv-banner="as-token"]').getByRole("button").click();
    passed.push(
      "(2) Darkness (4.5 m) placed between Doran and the store door: the view as Doran hides the door behind the sphere and paints its shadow; deleted, the door is seen again",
    );
    await noAreaWarnings("step 2");

    // ------------------------------------------------------------ (4) distances row
    await role("player");
    await go("table");
    const creature = page.locator(".table-tabs [role=tab]").first();
    if ((await creature.getAttribute("aria-selected")) !== "true") await creature.click();
    await page.waitForTimeout(250);
    const hidden = (await attr("data-fv-hidden-tokens")).split(" ").filter(Boolean);
    check(hidden.includes("goblin-1") && hidden.includes("goblin-2"), "Goblins not hidden");
    // What a screen reader gets (innerText would still count SVG text under display:none).
    const tree = await page.locator("#content").ariaSnapshot();
    check(
      !/Sentinella|Esploratore/.test(tree),
      "The player's page still names an unseen goblin: " +
        tree
          .split("\n")
          .filter((line) => /Sentinella|Esploratore/.test(line))
          .join(" / "),
    );
    check(
      (await page.locator('#content [data-annot-dist="goblin-1"]').count()) === 1 &&
        !(await page.locator('#content [data-annot-dist="goblin-1"]').isVisible()),
      "The Sentinella's distance row is still shown",
    );
    check(
      await page.locator('#content [data-annot-dist="doran"]').isVisible(),
      "A seen creature lost its distance row",
    );
    await shot("rf-03-player-creature-tab-distances");
    passed.push(
      "(4) Player: the Creature tab's distances list Doran and Mira, not the unseen Sentinella and Esploratore (their rows are hidden); the accessibility tree of the page names neither",
    );
    await noAreaWarnings("step 4");
    await role("dm");
    await go("table");

    // ------------------------------------------------------------ (3) invisible barrier
    await tool("Barriere");
    await clickScene(551, 255);
    await barButton("Invisibile").click();
    await page.waitForTimeout(200);
    const wall = (await stored()).scenes
      .find((s) => s.id === TOWER)
      .walls.find((w) => w.id === "tower-store-west-2");
    check(
      wall.blocksMovement && !wall.blocksSight && !wall.blocksEffect,
      "Invisible type not stored",
    );
    await tool("Muovi");
    // A straight wall's box is zero-wide (Playwright calls it invisible): read the display.
    const shown = (id) =>
      page.evaluate((wallId) => {
        let el = document.querySelector(
          `#battle-map > g > .spatial-overlay [data-spatial-wall="${wallId}"]`,
        );
        if (!el) return false;
        for (; el && el.id !== "battle-map"; el = el.parentElement)
          if (getComputedStyle(el).display === "none") return false;
        return true;
      }, id);
    const drawn = () => shown("tower-store-west-2");
    check(await drawn(), "The DM should still see the invisible barrier");
    await role("player");
    await go("table");
    check(!(await drawn()), "The player sees the invisible barrier");
    check(await shown("tower-store-west-1"), "A plain wall disappeared for the player");
    // Sight passes the invisible barrier: Livia's darkvision now reaches the Esploratore.
    check(
      !(await attr("data-fv-hidden-tokens")).split(" ").includes("goblin-2"),
      "Sight does not pass the invisible barrier",
    );
    await shot("rf-02-player-invisible-barrier");
    passed.push(
      "(3) Barrier set to Invisible (moves blocked, sight and effect pass): the DM still sees its line, the player does not (the plain wall beside it stays drawn) and Livia's darkvision now reaches the Esploratore through it",
    );

    // ------------------------------------------------------------ (5) sheet darkvision
    const senses = await page.evaluate(async (k) => {
      const D = await import("/fog-vision-domain.mjs");
      const B = await import("/builder-plus-domain.mjs");
      const state = JSON.parse(localStorage.getItem(k));
      const id = B.claimPremade(state, "brann", "dm", {
        operationId: "rf-journey",
        allowIncomplete: true,
      });
      const s = D.resolveSenses(state, id);
      return {
        top: state.actors[id].speciesId ?? null,
        darkvision: s.darkvision,
        origin: s.origin,
      };
    }, key);
    check(
      senses.top === null && senses.darkvision === 36 && senses.origin === "sheet",
      "Builder dwarf darkvision not read from the sheet: " + JSON.stringify(senses),
    );
    passed.push(
      "(5) A ready-made dwarf claimed through the real builder (no top-level species) gets darkvision 36 m from its sheet",
    );
    await role("dm");
    check(!errors.length, "Page errors: " + errors.join(" | "));
  } finally {
    await context.close();
  }
  return JSON.stringify({ passed, errors });
};
