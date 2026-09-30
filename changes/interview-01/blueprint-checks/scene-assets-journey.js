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
  // B47 — Advanced scenes: levels, variants, objects, prefabs, Universal VTT. Acceptance
  // checks of the card in docs/interview/CAPABILITY_CENSUS.md (#### B47) with real clicks,
  // drags, keys and touch: (1) chapter folders, search, archive and restore; (2) the night
  // variant with the same geometry and pins, switched by the DM at the Table; (3) the two-floor
  // tower with walls and tokens per floor and the stair going up; (4) a locked hidden sticker
  // and a roof fading when a token goes in; (5) the "Goblin camp" prefab inserted in another
  // scene; (6) bulk edit of five trees with the list's "find"; (7) the Universal VTT sample
  // file with image, walls, doors and lights, a bad file refused; (8) three-step grid alignment
  // with the magnifier, lifted away from the finger on a phone; (9) the off-map area, the
  // starting view and saved views. Plus Undo, reload persistence, offline refusal, DM vs
  // player, IT desktop 1440 and EN phone 390 with touch. Synthetic data; resets this
  // browser's local state.
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B47/";
  const ID = "scene-assets";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  let phoneContext = null;
  page.on("pageerror", (error) =>
    errors.push(error.message + " @ " + String(error.stack).split("\n").slice(1, 3).join(" ")),
  );
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const slice = async (p = page) => (await stored(p)).ext[ID];
  const sceneIn = async (id, p = page) => (await stored(p)).scenes.find((s) => s.id === id);
  const dialog = (p = page) => p.locator("#dialog");
  const role = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForTimeout(300);
  };
  const shot = (name, p = page, full = false) =>
    p.screenshot({ path: dir + name + ".png", fullPage: full });
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const go = async (hash, p = page) => {
    await p.goto(base + "#" + hash);
    await p.locator("#content").waitFor();
    await p.waitForTimeout(300);
  };
  const toast = (p = page) =>
    p
      .locator("#toast")
      .innerText()
      .catch(() => "");
  const noAreaWarnings = async (where, p = page) => {
    const link = p.getByText(/con avvisi|with warnings/).first();
    if (!(await link.count())) return;
    await link.click();
    await p.waitForTimeout(250);
    const report = await p.locator("#dialog").innerText();
    await p.keyboard.press("Escape");
    // Other areas under construction in the same worktree may report their own warnings;
    // only this area's are a failure here.
    if (/scene-assets/.test(report))
      throw Error(`Area warning after ${where}: ${report.slice(-1500)}`);
  };
  const dismissTip = async (p = page, name = "Ho capito") => {
    const gotIt = p.getByRole("button", { name, exact: true });
    if (await gotIt.isVisible().catch(() => false)) await gotIt.click();
  };
  // Scene → screen coordinates of an SVG (Table map or Preparation canvas).
  // The point is scrolled into the middle of the window first when it is out of view.
  const at = async (selector, x, y, p = page) => {
    const locate = () =>
      p.locator(selector).evaluate(
        (svg, q) => {
          const t = svg.createSVGPoint();
          t.x = q.x;
          t.y = q.y;
          const r = t.matrixTransform(svg.getScreenCTM());
          return { x: r.x, y: r.y, h: window.innerHeight };
        },
        { x, y },
      );
    let q = await locate();
    if (q.y < 70 || q.y > q.h - 70) {
      await p.evaluate((dy) => window.scrollBy(0, dy), q.y - q.h / 2);
      await p.waitForTimeout(120);
      q = await locate();
    }
    return { x: q.x, y: q.y };
  };
  const drag = async (selector, from, to, p = page, steps = 12) => {
    const a = await at(selector, from.x, from.y, p);
    const b = await at(selector, to.x, to.y, p);
    await p.mouse.move(a.x, a.y);
    await p.mouse.down();
    for (let i = 1; i <= steps; i++)
      await p.mouse.move(a.x + ((b.x - a.x) * i) / steps, a.y + ((b.y - a.y) * i) / steps);
    await p.mouse.up();
    await p.waitForTimeout(300);
  };
  const clickAt = async (selector, x, y, p = page, options = {}) => {
    const q = await at(selector, x, y, p);
    await p.mouse.click(q.x, q.y, options);
    await p.waitForTimeout(250);
  };
  const CANVAS = "[data-sa-canvas]";
  const MAP = "#battle-map";
  // P7 (I-236): Preparation has one scene list (folders, search, archive) and one scene
  // editor whose tabs hold objects, levels and variants; «Scene avanzate» is gone.
  const openSection = async (p = page) => {
    await go("preparation", p);
    await p.locator("[data-sa-menu]").waitFor();
  };
  // A scene row's «Altre azioni» menu (Roll20 Page Menu); activation is the core's command.
  const cardMenu = async (sceneId, action, p = page) => {
    const card = p.locator(`[data-sa-scene-card="${sceneId}"]`);
    await card.locator("details.prep-menu > summary").click();
    const attr = action === "data-sa-activate" ? "data-prep-activate" : action;
    await card.locator(`[${attr}="${sceneId}"]`).click();
    await p.waitForTimeout(300);
  };
  // «Nuova scena» offers every starting point (P7 PR-07/15): pick one and continue.
  const newScene = async (kind, p = page) => {
    await openSection(p);
    await p.locator("[data-prep-new]").first().click();
    await dialog(p).locator(`input[name="template"][value="${kind}"]`).check();
  };
  const sceneTab = async (p = page, tap = false) => {
    await openTablePanel(p, "scene-assets-panel", tap); // B62: Scene › Scene
    await p.locator("[data-sa-panel]").waitFor();
  };
  const viewBox = (p = page) => p.locator(MAP).getAttribute("viewBox");

  try {
    await go("home");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator("#content").waitFor();
    await role("dm");

    // ------------------------------------------------------------ (1) folders, search, archive
    // Campaign › Preparation: the one scene list with its folders, one click from the campaign.
    await go("campaign");
    await page.locator('.campaign-sidebar [data-campaign-tab="preparation"]').click();
    await page.waitForTimeout(300);
    await page.locator("[data-sa-menu]").waitFor();
    check(
      !(await page.locator('[data-prep-section="scene-assets"]').count()),
      "a second «Scene avanzate» section is back",
    );
    check(
      (await page.locator(".prep-scene-browser > [data-sa-folder-card]").count()) === 2,
      "Chapter folders missing",
    );
    await shot("01-page-menu-folders");
    // «Nuova cartella…», then drag a scene onto it (Roll20 page menu).
    await page.locator("[data-sa-new-folder]").click();
    await dialog().locator('input[name="name"]').fill("Capitolo 3 · Le miniere");
    await dialog().locator("footer .primary").click();
    await page.waitForTimeout(300);
    let value = await slice();
    const mines = value.folders.find((f) => f.name === "Capitolo 3 · Le miniere");
    check(mines && mines.parentId === null, "New folder not created at the top level");
    await page.locator('[data-sa-open-folder="ch2"]').click();
    await page.waitForTimeout(250);
    check(
      (await page.locator(".sa-crumbs").innerText()).includes("Capitolo 2 · Il bosco di Bruma"),
      "Breadcrumb does not show the open chapter",
    );
    await page
      .locator('[data-sa-scene-card="forest-clearing"]')
      .dragTo(page.locator('.sa-crumbs [data-sa-crumb=""]'));
    await page.waitForTimeout(350);
    value = await slice();
    check(
      !value.placement["forest-clearing"],
      "Drag onto the breadcrumb did not move the scene up",
    );
    await page.locator('.sa-crumbs [data-sa-crumb=""]').click();
    await page.waitForTimeout(250);
    await page
      .locator('[data-sa-scene-card="forest-clearing"]')
      .dragTo(page.locator(`[data-sa-folder-card="${mines.id}"]`));
    await page.waitForTimeout(350);
    check((await slice()).placement["forest-clearing"] === mines.id, "Drag onto a folder failed");
    // Keyboard-friendly path: the card menu's "Move to…" puts it back in chapter 2.
    await page.locator(`[data-sa-open-folder="${mines.id}"]`).click();
    await cardMenu("forest-clearing", "data-sa-move-scene");
    await dialog().locator('select[name="folder"]').selectOption("ch2");
    await dialog().locator("footer .primary").click();
    await page.waitForTimeout(300);
    check((await slice()).placement["forest-clearing"] === "ch2", "Move to… failed");
    // Search every folder: the tower floors live two levels down.
    await page.locator('.sa-crumbs [data-sa-crumb=""]').click();
    await page.locator("[data-sa-search]").fill("torre");
    await page.waitForTimeout(350);
    const hits = await page
      .locator("[data-sa-scene-card]")
      .evaluateAll((n) => n.map((x) => x.dataset.saSceneCard));
    check(
      hits.includes("lantern-tower") && hits.includes("lantern-tower-top"),
      "Search does not reach the nested folder: " + hits,
    );
    check(
      (
        await page.locator('[data-sa-scene-card="lantern-tower-top"] .prep-scene-path').innerText()
      ).includes("La torre"),
      "Search result without its path",
    );
    // Archive the clearing: it leaves the list, the core Scenes tab and the search.
    await page.locator("[data-sa-search]").fill("");
    await page.locator('[data-sa-open-folder="ch2"]').click();
    await cardMenu("forest-clearing", "data-sa-archive");
    check(!(await sceneIn("forest-clearing")), "Archived scene still in the campaign's scenes");
    check((await slice()).archive[0].folderId === "ch2", "Archive lost the folder");
    await page.locator('.sa-crumbs [data-sa-crumb=""]').click();
    await page.locator("[data-sa-search]").fill("radura");
    await page.waitForTimeout(300);
    check(
      (await page.locator("[data-sa-scene-card]").count()) === 0,
      "Search looked in the archive",
    );
    await page.locator("[data-sa-search]").fill("");
    await page.waitForTimeout(250);
    check(
      (await page.locator('[data-prep-scene-name="la radura dei goblin"]').count()) === 0,
      "Archived scene still in the scene list",
    );
    await page.locator("[data-sa-archive-view]").click();
    await page.waitForTimeout(200);
    await shot("01b-archive");
    await page.locator('[data-sa-restore="forest-clearing"]').click();
    await page.waitForTimeout(300);
    check(await sceneIn("forest-clearing"), "Restore failed");
    check((await slice()).placement["forest-clearing"] === "ch2", "Restore lost the folder");
    // Undo from the page menu (named, like the session panel) and back again.
    await page.locator("[data-sa-undo]").click();
    await page.waitForTimeout(300);
    check(!(await sceneIn("forest-clearing")), "Undo did not revert the restore");
    await page.locator('[data-sa-restore="forest-clearing"]').click();
    await page.waitForTimeout(300);
    check(await sceneIn("forest-clearing"), "Second restore failed");
    await page.reload();
    await page.locator("#content").waitFor();
    check(
      (await slice()).folders.some((f) => f.name === "Capitolo 3 · Le miniere"),
      "Folder lost on reload",
    );
    // The demo identity is not saved with the campaign: back to the DM after a reload.
    await role("dm");
    passed.push(
      "(1) Preparation's one scene list (P7, no «Scene avanzate»): chapter folders with breadcrumb; «Nuova cartella…»; drag a scene card onto the breadcrumb and onto a folder, card menu Move to…; search 'torre' reaches the nested tower folder with the path; Archive removes the clearing from the list and search; Archive view › Restore brings it back to its folder; named Undo reverts; reload keeps the folder",
    );
    await noAreaWarnings("step 1");

    // ------------------------------------------------------------ (2) night variant at the Table
    await go("table");
    await dismissTip();
    const court = await sceneIn("old-watch");
    const pinsBefore = await page.locator("[data-handouts-pin]").count();
    await sceneTab();
    await page.locator('[data-sa-variant="night"]').click();
    await page.waitForTimeout(350);
    const night = await sceneIn("old-watch");
    check(/^data:image\/webp/.test(night.background), "Night image not applied");
    check(
      JSON.stringify(night.walls) === JSON.stringify(court.walls) &&
        JSON.stringify(night.tokens) === JSON.stringify(court.tokens) &&
        night.gridSize === court.gridSize,
      "The variant changed the geometry or the tokens",
    );
    check(
      (await page.locator("[data-handouts-pin]").count()) === pinsBefore,
      "Pins did not stay on the night variant",
    );
    check(
      (await page.locator('[data-sa-variant="night"]').getAttribute("aria-pressed")) === "true",
      "Variant switch not pressed",
    );
    await role("player");
    await go("table");
    await dismissTip();
    check(
      (await page.locator('#battle-map image[href^="data:image/webp"]').count()) >= 1,
      "The player does not see the night image",
    );
    check(
      (await page.locator("[data-sa-variant]").count()) === 0,
      "The player got the DM's variant switch",
    );
    await shot("02-night-variant-player");
    await role("dm");
    // A third look from the Images and files library (B28): "Cortile al tramonto".
    await go("preparation?id=old-watch&tab=variants");
    await page.waitForTimeout(250);
    const variantForm = page.locator("[data-sa-variant-form]");
    await variantForm.locator('input[name="name"]').fill("Tramonto");
    await variantForm.locator('input[name="source"][value="library"]').check();
    await variantForm.locator('select[name="asset"]').selectOption("m-courtyard");
    await variantForm.locator('button[type="submit"]').click();
    await page.waitForTimeout(400);
    const dusk = (await slice()).variants["old-watch"].list.find((v) => v.name === "Tramonto");
    check(
      dusk?.look?.assetId === "m-courtyard" && /^data:image\/jpeg/.test(dusk.look.background),
      "Library variant not added",
    );
    check((await page.locator("[data-sa-variant-row]").count()) === 3, "Variant list not updated");
    passed.push(
      "(2b) Courtyard workspace › Variants › New variant 'Tramonto' from the Images and files library (the DM's 'Cortile al tramonto'): three looks listed",
    );
    passed.push(
      `(2) DM at the Table › Scene tab › Notte: the courtyard gets the night image; walls, tokens and grid identical; ${pinsBefore} pins still on the map; the player sees the night image and no switch`,
    );

    // ------------------------------------------------------------ (3) two-floor tower
    await openSection();
    await page.locator('[data-sa-open-folder="ch1"]').click();
    await page.locator('[data-sa-open-folder="ch1-tower"]').click();
    await page.waitForTimeout(200);
    await cardMenu("lantern-tower", "data-sa-activate");
    await dialog().locator("footer .primary").click();
    await page.waitForTimeout(500);
    if (await dialog().evaluate((d) => d.open)) await dialog().locator("footer .primary").click();
    check((await stored()).activeSceneId === "lantern-tower", "Tower not activated");
    await go("table");
    await dismissTip();
    await sceneTab();
    check(
      (await page.locator(".sa-stair").count()) === 1,
      "Stair ring missing on the ground floor",
    );
    check(
      (await page.locator('#battle-map .map-token[data-actor="goblin-1"]').count()) === 1,
      "Sentinel not on the ground floor",
    );
    await shot("03a-tower-ground-floor");
    await page
      .locator('[data-sa-climb="goblin-1"][data-sa-to="lantern-tower-top"][data-sa-follow]')
      .click();
    await page.waitForTimeout(500);
    let s = await stored();
    check(s.activeSceneId === "lantern-tower-top", "The Table did not follow up the stairs");
    check(
      s.scenes
        .find((x) => x.id === "lantern-tower-top")
        .tokens.some((t) => t.actorId === "goblin-1") &&
        !s.scenes
          .find((x) => x.id === "lantern-tower")
          .tokens.some((t) => t.actorId === "goblin-1"),
      "Sentinel token not moved to the upper floor",
    );
    check(
      (await page.locator('#battle-map .map-token[data-actor="livia"]').count()) === 0 &&
        (await page.locator('#battle-map .map-token[data-actor="goblin-1"]').count()) === 1,
      "Upper floor shows the wrong tokens",
    );
    check(
      (await page.locator("[data-sa-away]").innerText()).includes("Livia"),
      "DM not told the party is below",
    );
    check(
      (await page.locator('[data-sa-prop="tt-lantern"]').count()) === 1,
      "Upper floor objects missing",
    );
    await shot("03b-tower-upper-floor");
    // XCOM keys: PageDown shows the floor below.
    await page.locator(MAP).focus();
    await page.keyboard.press("PageDown");
    await page.waitForTimeout(400);
    check((await stored()).activeSceneId === "lantern-tower", "PageDown did not go down a floor");
    await page.keyboard.press("PageUp");
    await page.waitForTimeout(400);
    check((await stored()).activeSceneId === "lantern-tower-top", "PageUp did not go up a floor");
    await page.keyboard.press("PageDown");
    await page.waitForTimeout(400);
    await role("player");
    await go("table");
    await dismissTip();
    await sceneTab();
    check(
      (await page.locator("[data-sa-shown-floor]").innerText()).includes("Piano terra"),
      "Player not told which floor is shown",
    );
    check((await page.locator("[data-sa-floor]").count()) === 0, "Player got the floor switch");
    check(
      (await page.locator('#battle-map .map-token[data-actor="goblin-1"]').count()) === 0,
      "Player sees the sentinel who went upstairs",
    );
    await role("dm");
    // Back down from the token's own menu (B12 right-click): the stair entry asks which floor.
    await go("table");
    await page.locator(MAP).focus();
    await page.keyboard.press("PageUp");
    await page.waitForTimeout(400);
    await page.locator('#battle-map .map-token[data-actor="goblin-1"]').click({ button: "right" });
    await page.waitForTimeout(300);
    await (await revealMenuItem(page, "scene-assets-stairs")).click(); // B62: «Azioni»
    await page.waitForTimeout(300);
    check(
      (await dialog().locator('input[name="to"]').first().getAttribute("value")) ===
        "lantern-tower",
      "Stairs dialog does not offer the ground floor",
    );
    await dialog().locator("footer .primary").click();
    await page.waitForTimeout(500);
    s = await stored();
    check(
      s.activeSceneId === "lantern-tower" &&
        s.scenes.find((x) => x.id === "lantern-tower").tokens.some((t) => t.actorId === "goblin-1"),
      "Token menu stairs did not bring the Sentinel down with the view",
    );
    passed.push(
      "(3) Card menu › Move the party here: the Lantern tower; Scene tab: stair ring, the Sentinel on the stair › '… and show the floor': token moved to the upper floor and the Table follows; upper floor shows its own walls/objects and no party token, the DM is told Livia is below; PageDown/PageUp switch floors; the player sees 'The Table shows: Piano terra', no switch, no Sentinel; right-click the Sentinel upstairs › 'Scale: sali o scendi…' › Piano terra brings it and the view back down",
    );
    await noAreaWarnings("step 3");

    // ------------------------------------------------------------ (4) locked hidden sticker, roof
    await go("preparation?id=forest-clearing&tab=objects");
    await page.locator(CANVAS).waitFor();
    const trapBefore = (await slice()).props["forest-clearing"].find((p) => p.id === "fc-trap");
    await drag(
      CANVAS,
      { x: trapBefore.x, y: trapBefore.y },
      { x: trapBefore.x + 120, y: trapBefore.y },
    );
    check(/Bloccato/.test(await toast()), "No 'locked' message on dragging the trap");
    const trapAfter = (await slice()).props["forest-clearing"].find((p) => p.id === "fc-trap");
    check(trapAfter.x === trapBefore.x, "A locked sticker moved");
    // A new utility sticker: "+" adds it at the centre, then hide and lock it in the palette.
    await page.locator('[data-sa-sticker="marker"]').click();
    await page.waitForTimeout(300);
    const marker = (await slice()).props["forest-clearing"].find((p) => p.sticker === "marker");
    check(marker && marker.x === 500 && marker.y === 325, "Marker not added at the centre");
    await page.locator('[data-sa-bulk] select[name="visible"]').selectOption("no");
    await page.locator('[data-sa-bulk] select[name="locked"]').selectOption("yes");
    await page.locator('[data-sa-bulk] button[type="submit"]').click();
    await page.waitForTimeout(300);
    const markerAfter = (await slice()).props["forest-clearing"].find((p) => p.id === marker.id);
    check(markerAfter.hidden && markerAfter.locked, "Marker not hidden and locked");
    // Drag a sticker from the palette onto the map (D&D Beyond).
    const barrelButton = page.locator('[data-sa-sticker="barrel"]');
    await barrelButton.scrollIntoViewIfNeeded();
    const bb = await barrelButton.boundingBox();
    // The canvas stays in view (sticky) while the side column scrolls.
    const target = await page.locator(CANVAS).evaluate((svg) => {
      const t = svg.createSVGPoint();
      t.x = 250;
      t.y = 520;
      const r = t.matrixTransform(svg.getScreenCTM());
      return { x: r.x, y: r.y };
    });
    check(
      target.y > 0 && target.y < 900,
      "Canvas point out of view while dragging from the palette",
    );
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++)
      await page.mouse.move(
        bb.x + bb.width / 2 + ((target.x - bb.x - bb.width / 2) * i) / 12,
        bb.y + bb.height / 2 + ((target.y - bb.y - bb.height / 2) * i) / 12,
      );
    await page.mouse.up();
    await page.waitForTimeout(350);
    const barrel = (await slice()).props["forest-clearing"].find(
      (p) => p.sticker === "barrel" && Math.abs(p.x - 250) < 6 && Math.abs(p.y - 520) < 6,
    );
    check(barrel, "Dragging a sticker onto the map did not drop it there");
    // Resize it with the corner handle: the width shows in metres (D&D Beyond).
    const handle = page.locator('.sa-handle[data-sa-handle="resize"]');
    const hb = await handle.boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x + hb.width / 2 + 20, hb.y + hb.height / 2 + 20, { steps: 6 });
    const live = await page.locator("[data-sa-live]").textContent();
    await page.mouse.up();
    await page.waitForTimeout(300);
    const barrelAfter = (await slice()).props["forest-clearing"].find((p) => p.id === barrel.id);
    check(barrelAfter.width > barrel.width && / m$/.test(live), `Resize failed (${live})`);
    await shot("04a-clearing-workspace");
    // The roof at the Table: Livia walks into the hut and it fades.
    await openSection();
    await page.locator('[data-sa-open-folder="ch2"]').click();
    await cardMenu("forest-clearing", "data-sa-activate");
    await dialog().locator("footer .primary").click();
    await page.waitForTimeout(500);
    if (await dialog().evaluate((d) => d.open)) await dialog().locator("footer .primary").click();
    await go("table");
    await dismissTip();
    check(
      (await page.locator(".sa-layer-roofs").getAttribute("data-sa-faded")) === "",
      "Roof faded before anyone went in",
    );
    await role("player");
    await go("table");
    await dismissTip();
    check(
      (await page.locator('[data-sa-prop="fc-trap"]').count()) === 0,
      "The player sees the hidden trap",
    );
    check(
      (await page.locator(`[data-sa-prop="${marker.id}"]`).count()) === 0,
      "The player sees the hidden marker",
    );
    check(
      (await page.locator("[data-sa-staged]").count()) === 0,
      "The player sees the off-map sentinel",
    );
    await drag(MAP, { x: 740, y: 330 }, { x: 740, y: 200 });
    const livia = (await sceneIn("forest-clearing")).tokens.find((t) => t.actorId === "livia");
    check(livia.y < 280, "Livia did not walk into the hut: " + JSON.stringify(livia));
    check(
      (await page.locator(".sa-layer-roofs").getAttribute("data-sa-faded")) === "fc-hut-roof",
      "The roof did not fade with Livia under it",
    );
    const roofOpacity = await page
      .locator('[data-sa-prop="fc-hut-roof"]')
      .evaluate((n) => Number(getComputedStyle(n).opacity));
    check(roofOpacity < 0.5, "Roof still opaque: " + roofOpacity);
    await page.waitForTimeout(400);
    await shot("04b-roof-faded-player");
    await role("dm");
    passed.push(
      "(4) Clearing workspace: dragging the locked hidden trap says 'Bloccato' and it stays; '+' Segnalino at the centre, palette Visible: No + Locked: Yes; a barrel dragged from the palette lands where dropped; corner handle resizes it with a live width in metres; at the Table the player sees neither the trap, the marker nor the off-map sentinel; Livia dragged into the hut: the roof fades (opacity < 0.5)",
    );

    // ------------------------------------------------------------ (6) five trees in bulk
    await go("preparation?id=forest-clearing&tab=objects");
    await page.locator(".sa-side [data-sa-outline-search]").fill("albero");
    await page.waitForTimeout(350);
    // P7 PR-08: the objects tab's «Elenco della scena» lists every element with kind chips.
    check((await page.locator("[data-sa-el]").count()) === 5, "Find does not list five trees");
    await page.locator("[data-sa-pick-found]").click();
    await page.waitForTimeout(250);
    check(
      (await page.locator("#sa-sel-title").innerText()).startsWith("5 "),
      "Five trees not selected",
    );
    await page.locator('[data-sa-bulk] input[name="width"]').fill("4.5");
    await page.locator('[data-sa-bulk] select[name="visible"]').selectOption("no");
    await page.locator('[data-sa-bulk] button[type="submit"]').click();
    await page.waitForTimeout(350);
    let trees = (await slice()).props["forest-clearing"].filter((p) => p.sticker === "tree");
    check(
      trees.every((t) => t.width === 150 && t.hidden),
      "Bulk edit did not reach the five trees",
    );
    await shot("06-bulk-five-trees");
    // Ctrl+Z on the canvas (Foundry) reverts the whole group; applied again afterwards.
    await page.locator(CANVAS).focus();
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(350);
    trees = (await slice()).props["forest-clearing"].filter((p) => p.sticker === "tree");
    check(
      trees.every((t) => !t.hidden),
      "Undo did not restore the trees",
    );
    check((await stored()).log.at(-1).kind === "correction", "Undo not recorded as a correction");
    passed.push(
      "(6) Scene list (objects tab) › Find 'albero' lists five trees; Choose the results; palette width 4,5 m + Visible: No › Apply to 5 objects (150 px each, hidden); Ctrl+Z on the canvas reverts all five with a correction record",
    );

    // ------------------------------------------------------------ (5) prefab in another scene
    await go("preparation?id=old-watch&tab=objects");
    await page.locator(CANVAS).waitFor();
    await page.locator('[data-sa-prefab-arm="goblin-camp"]').click();
    await clickAt(CANVAS, 500, 330);
    let camp = (await slice()).props["old-watch"] ?? [];
    check(
      camp.length === 7 && camp.every((p) => p.prefab?.id === "goblin-camp"),
      "Prefab not inserted by click",
    );
    // Owlbear: right-click an empty spot › Insert prefab.
    await clickAt(CANVAS, 200, 480, page, { button: "right" });
    await page.locator('[data-sa-context-prefab="goblin-camp"]').click();
    await page.waitForTimeout(300);
    camp = (await slice()).props["old-watch"];
    check(camp.length === 14, "Right-click insert failed");
    check(
      new Set(camp.map((p) => p.prefab.instance)).size === 2,
      "Two separate prefab instances expected",
    );
    await shot("05-prefab-in-courtyard");
    // Owlbear: a prefab is itself an editable scene. Move one object inside it.
    await page.locator('[data-sa-prefab-edit="goblin-camp"]').click();
    await page
      .locator(".sa-ws-head h2", { hasText: "Prefabbricato: Accampamento goblin" })
      .waitFor({ timeout: 5000 });
    await page.waitForTimeout(200);
    await page.evaluate(() => window.scrollTo(0, 0));
    const fireInPrefab = (await slice()).prefabs[0].props.find((p) => p.sticker === "campfire");
    await drag(
      CANVAS,
      { x: fireInPrefab.x, y: fireInPrefab.y },
      { x: fireInPrefab.x + 40, y: fireInPrefab.y },
    );
    const moved = (await slice()).prefabs[0].props.find((p) => p.id === fireInPrefab.id);
    check(
      Math.abs(moved.x - fireInPrefab.x - 40) < 3,
      "Object inside the prefab not moved: " +
        JSON.stringify([fireInPrefab.x, moved.x, await toast(), page.url()]),
    );
    await role("player");
    await go(`table`);
    passed.push(
      "(5) Courtyard workspace: Prefabs › Insert… then a click on the map places the seven-object 'Goblin camp' saved from the clearing; right-click an empty spot › Insert prefab adds a second instance; Prefabs › Edit opens the prefab as a small scene where the campfire is dragged 40 px",
    );
    await role("dm");

    // ------------------------------------------------------------ (7) Universal VTT
    // File fixtures: node changes/interview-01/blueprint-checks/scene-assets-fixtures.mjs
    await newScene("uvtt");
    await dialog().locator("button[type=submit]").click();
    await dialog()
      .locator("[data-sa-uvtt-file]")
      .setInputFiles(dir + "rotta.dd2vtt");
    await page.waitForTimeout(400);
    check(
      /Mancano le dimensioni della mappa/.test(
        await dialog().locator("[data-sa-uvtt-error]").innerText(),
      ),
      "Bad file not refused with a reason",
    );
    await dialog().locator("footer .primary").click();
    await page.waitForTimeout(250);
    check(
      /Scegli prima un file Universal VTT valido/.test(
        await dialog().locator(".dialog-error").innerText(),
      ),
      "Submitting a refused file did not stop",
    );
    await dialog()
      .locator("[data-sa-uvtt-file]")
      .setInputFiles(dir + "cripta-sotto-la-torre.dd2vtt");
    await page.waitForTimeout(500);
    check((await dialog().locator("[data-sa-uvtt-walls]").innerText()) === "25", "Wall count");
    check(
      (await dialog().locator("[data-sa-uvtt-doors]").innerText()).startsWith("2"),
      "Door count",
    );
    check((await dialog().locator("[data-sa-uvtt-lights]").innerText()) === "3", "Light count");
    await dialog().locator('input[name="name"]').fill("La cripta sotto la torre");
    await dialog().locator('select[name="folder"]').selectOption("ch1-tower");
    await shot("07a-uvtt-preview");
    await dialog().locator("footer .primary").click();
    await page.waitForTimeout(500);
    s = await stored();
    const crypt = s.scenes.find((x) => x.name === "La cripta sotto la torre");
    check(
      crypt && crypt.walls.length === 27 && /^data:image\/webp/.test(crypt.background),
      "UVTT scene not built",
    );
    check(s.ext[ID].placement[crypt.id] === "ch1-tower", "UVTT scene not in the chosen folder");
    check(
      s.ext["fog-vision"].scenes[crypt.id].lights.length === 3,
      "UVTT lights not in the lights area",
    );
    // P7: the import opens the one scene editor, where its walls and doors are editable.
    await page.waitForFunction((id) => location.hash.includes("id=" + id), crypt.id);
    await page.locator("[data-prep-map]").waitFor();
    await page.waitForTimeout(400);
    const editorWalls = await page.locator("[data-prep-map] [data-spatial-wall]").count();
    check(editorWalls >= 27, "Scene editor does not show the imported walls: " + editorWalls);
    await shot("07b-uvtt-in-scene-editor");
    // Levels tab: the crypt becomes a building; an empty upper floor with the same footprint;
    // a stair placed with a click on the map.
    await go(`preparation?id=${crypt.id}&tab=levels`);
    await page.locator("[data-sa-stack-new]").click();
    await dialog().locator('input[name="name"]').fill("Cripta e cappella");
    await dialog().locator("footer .primary").click();
    await page.waitForTimeout(300);
    await page.locator("[data-sa-floor-add]").click();
    await dialog().locator('input[name="name"]').fill("Cappella");
    await dialog().locator("footer .primary").click();
    await page.waitForTimeout(300);
    s = await stored();
    const building = Object.values(s.ext[ID].stacks).find((b) => b.name === "Cripta e cappella");
    check(building?.floors.length === 2 && building.floors[1].elevation === 3, "Floor not added");
    const chapel = s.scenes.find((x) => x.id === building.floors[1].sceneId);
    check(
      chapel.width === crypt.width && chapel.height === crypt.height,
      "New floor footprint differs",
    );
    await page.locator("[data-sa-stair-add]").click();
    await clickAt(CANVAS, 850, 250);
    await dialog().locator('input[name="name"]').fill("Scala della cappella");
    await dialog().locator("footer .primary").click();
    await page.waitForTimeout(300);
    const stair = Object.values((await slice()).stacks).find((b) => b.name === "Cripta e cappella")
      .stairs[0];
    check(
      stair && Math.abs(stair.x - 850) < 3 && stair.floors.includes(chapel.id),
      "Stair not placed",
    );
    check(
      (await page.locator(`[data-sa-stair="${stair.id}"]`).count()) === 1,
      "Stair ring not drawn in the workspace",
    );
    await shot("07c-levels-tab");
    passed.push(
      "(7) Create › Scene from a Universal VTT file: a malformed .dd2vtt is refused ('Mancano le dimensioni della mappa…') and Create stays blocked; the sample file previews 25 walls, 2 doors, 3 lights; the scene lands in 'La torre' with its WebP image, 27 walls/doors and 3 B35 lights; the scene editor shows the imported walls for editing; Levels tab: Create a building, Add floor (new empty 'Cappella' at 3 m, same footprint), Add stair with a click on the map",
    );
    await noAreaWarnings("step 7");

    // ------------------------------------------------------------ (8) grid alignment, desktop
    await newScene("image");
    await dialog().locator('input[name="name"]').fill("Sotterraneo con griglia disegnata");
    await dialog()
      .locator("[data-prep-new-image]")
      .setInputFiles(dir + "sotterraneo-griglia.png");
    await page.waitForTimeout(500);
    await dialog().locator("footer .primary").click();
    await page.waitForTimeout(600);
    s = await stored();
    const dungeon = s.scenes.find((x) => x.name === "Sotterraneo con griglia disegnata");
    check(dungeon && dungeon.gridSize === 50, "Image scene not created");
    check(
      (await page.locator(".sa-steps li.is-current").innerText()).includes("Àncora"),
      "Alignment did not open on step 1",
    );
    // Step 1: the magnifier follows the pointer; a click on a drawn corner sets the anchor.
    check(!(await page.locator("[data-sa-next]").isVisible()), "'Next' shown before a point");
    check(!(await page.locator("[data-sa-context]").isVisible()), "Insert menu shown unasked");
    const anchor = await at(CANVAS, 20 + 56 * 3, 12 + 56 * 2);
    await page.mouse.move(anchor.x - 30, anchor.y - 20);
    await page.mouse.move(anchor.x, anchor.y, { steps: 5 });
    check(await page.locator("[data-sa-loupe]").isVisible(), "Magnifier not shown on hover");
    await page.mouse.click(anchor.x, anchor.y);
    await page.waitForTimeout(350);
    const next = page.locator("[data-sa-next]");
    check(await next.isVisible(), "'Next' not shown under the point");
    const nb = await next.boundingBox();
    check(
      Math.abs(nb.x + nb.width / 2 - anchor.x) < 60 && nb.y > anchor.y && nb.y - anchor.y < 80,
      "'Next' not under the cursor",
    );
    await next.click();
    await page.waitForTimeout(300);
    // Step 2: the opposite corner of the same cell.
    await clickAt(CANVAS, 20 + 56 * 4, 12 + 56 * 3);
    await page.locator("[data-sa-next]").click();
    await page.waitForTimeout(300);
    check(
      (await page.locator("[data-sa-align-size]").innerText()).startsWith("56"),
      "Cell not measured as 56 px",
    );
    check((await page.locator(".sa-corners figure").count()) === 4, "Corner check views missing");
    // Step 3: refine with the keys (one pixel right, then back) and apply.
    await page.locator(CANVAS).focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(200);
    await shot("08a-align-refine");
    await page.locator("[data-sa-align-apply]").click();
    await page.waitForTimeout(350);
    // P7 (Owlbear: alignment next to the grid settings): «Usa questa griglia» fills the
    // draft's «Griglia e misure»; «Salva preparazione» stores it.
    await page.locator('[data-prep-field][name="gridSize"]').waitFor();
    check(
      Number(await page.locator('[data-prep-field][name="gridSize"]').inputValue()) === 56,
      "The draft's cell is not 56 px",
    );
    await page.locator("[data-prep-save]").first().click();
    await page.waitForTimeout(400);
    if (await dialog().evaluate((d) => d.open)) await dialog().locator("footer .primary").click();
    await page.waitForTimeout(300);
    const aligned = await sceneIn(dungeon.id);
    check(
      aligned.gridSize === 56 && aligned.gridOffsetX === 20 && aligned.gridOffsetY === 12,
      "Alignment result wrong: " +
        JSON.stringify([aligned.gridSize, aligned.gridOffsetX, aligned.gridOffsetY]),
    );
    passed.push(
      "(8a) Create › Scene from an image (a PNG with a drawn 56 px grid offset 20,12) opens the three-step alignment: the magnifier follows the pointer, the anchor click shows 'Next' right under it, the opposite corner measures 56 px, four corner views and arrow-key refinement; «Usa questa griglia» fills «Griglia e misure» and «Salva preparazione» stores cell 56 px, offset 20, 12",
    );

    // ------------------------------------------------------------ (9) off-map, starting and saved views
    await go("table");
    await dismissTip();
    s = await stored();
    check(s.activeSceneId === "forest-clearing", "Clearing not at the Table");
    await sceneTab();
    await page.locator("[data-sa-show-offmap]").click();
    await page.waitForTimeout(400);
    const staged = page.locator('[data-sa-staged="stage-goblin-1"]');
    check(await staged.isVisible(), "Off-map sentinel not visible to the DM when zoomed out");
    await shot("09a-offmap-dm");
    await drag(MAP, { x: 1120, y: 360 }, { x: 900, y: 420 });
    s = await stored();
    const sentinel = s.scenes
      .find((x) => x.id === "forest-clearing")
      .tokens.find((t) => t.actorId === "goblin-1");
    check(sentinel && Math.abs(sentinel.x - 900) < 3, "Sentinel not dragged onto the map");
    check(!s.combat.active, "Bringing a creature in started combat");
    // Starting view (Owlbear Default View): the DM frames the hut and sets it.
    await page.locator('[data-table="fit"]').click();
    await page.locator('[data-table="zoom-in"]').click();
    await page.locator('[data-table="zoom-in"]').click();
    await page.waitForTimeout(300);
    const framed = await viewBox();
    await sceneTab();
    await page.locator("[data-sa-default-set]").click();
    await page.waitForTimeout(300);
    check((await slice()).views.default["forest-clearing"]?.zoom > 1.4, "Starting view not stored");
    await role("player");
    await go("campaign");
    await go("table");
    await page.waitForTimeout(400);
    // The Table now rounds the pan to whole pixels (P6): the same view within half a pixel.
    const sameView = (a, b) => {
      const x = String(a).split(/\s+/).map(Number);
      const y = String(b).split(/\s+/).map(Number);
      return x.length === 4 && x.every((v, i) => Math.abs(v - y[i]) <= 0.5);
    };
    check(
      sameView(await viewBox(), framed),
      `Player did not start at the DM's view: ${await viewBox()} vs ${framed}`,
    );
    // Saved views (AboveVTT): Shift+F2 saves, F2 comes back, also after a reload.
    await page.locator('[data-table="zoom-in"]').click();
    await page.waitForTimeout(250);
    const mine = await viewBox();
    await page.locator(MAP).focus();
    await page.keyboard.press("Shift+F2");
    await page.waitForTimeout(300);
    await page.locator('[data-table="fit"]').click();
    await page.waitForTimeout(250);
    check((await viewBox()) !== mine, "Fit did not change the view");
    await page.locator(MAP).focus();
    await page.keyboard.press("F2");
    await page.waitForTimeout(300);
    check(sameView(await viewBox(), mine), "F2 did not bring back the saved view");
    await page.reload();
    await page.locator(MAP).waitFor();
    await page.waitForTimeout(400);
    await page.locator('[data-table="fit"]').click();
    await page.locator(MAP).focus();
    await page.keyboard.press("F2");
    await page.waitForTimeout(300);
    check(sameView(await viewBox(), mine), "Saved view lost on reload");
    check(
      (await slice()).views.saved.player["forest-clearing"][0] &&
        !(await slice()).views.saved.dm?.["forest-clearing"]?.[0],
      "Saved view not personal",
    );
    await sceneTab();
    await shot("09b-views-player");
    passed.push(
      "(9) Scene tab › Show the off-map area: the DM sees the Sentinel waiting outside the map and drags it in (token at 900,420, no combat started); the DM frames the view and sets it as the starting view: the player arrives exactly there; the player's Shift+F2 saves, Fit, F2 returns, again after a reload; the view is personal",
    );
    await noAreaWarnings("step 9");

    // Offline (simulated): a shared scene change is refused with the reason; nothing changes.
    await role("dm");
    await go("preparation?id=forest-clearing&tab=objects");
    await page.getByRole("button", { name: "Preferenze", exact: true }).click();
    await dialog().locator("[name=offline]").check();
    await dialog().getByRole("button", { name: "Salva preferenze" }).click();
    await page.waitForTimeout(300);
    const propsOffline = (await slice()).props["forest-clearing"].length;
    await page.locator('[data-sa-sticker="rock"]').click();
    await page.waitForTimeout(300);
    check(
      (await slice()).props["forest-clearing"].length === propsOffline,
      "Offline sticker applied",
    );
    check(/senza rete/.test(await toast()), "Offline refusal not shown");
    await page.getByRole("button", { name: "Preferenze", exact: true }).click();
    await dialog().locator("[name=offline]").uncheck();
    await dialog().getByRole("button", { name: "Salva preferenze" }).click();
    await page.waitForTimeout(300);
    passed.push(
      "Offline (simulated): adding a sticker is refused with 'senza rete' and nothing changes",
    );

    // Reload persistence of the whole journey.
    await page.reload();
    await page.locator("#content").waitFor();
    s = await stored();
    check(
      /^data:image\/webp/.test(s.scenes.find((x) => x.id === "old-watch").background) &&
        (s.ext[ID].props["old-watch"] ?? []).length === 14 &&
        s.scenes.some((x) => x.name === "La cripta sotto la torre") &&
        s.scenes.find((x) => x.name === "Sotterraneo con griglia disegnata").gridSize === 56,
      "Something was lost on reload",
    );
    passed.push(
      "Reload keeps the night variant, both camp instances, the imported crypt and the aligned grid",
    );

    // ------------------------------------------------------------ EN phone 390, touch
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
    phoneContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const phone = await phoneContext.newPage();
    phone.on("pageerror", (error) => errors.push("phone: " + error.message));
    await phone.goto(base + "#home");
    await phone.evaluate(([k, v]) => localStorage.setItem(k, v), [key, snapshot]);
    await phone.reload();
    await phone.locator("#content").waitFor();
    await role("dm", phone);
    await phone.locator('.service-nav [data-service="preferences"]').tap();
    await phone.locator("#dialog select[name=lang]").selectOption("en");
    await phone.locator("#dialog button[type=submit]").tap();
    await phone.waitForFunction(() => document.documentElement.lang === "en");
    await go("preparation", phone);
    check(await noOverflow(phone), "Page menu overflows at 390");
    check(
      (await phone.locator("[data-prep-new]").first().innerText()).includes("New scene"),
      "Not in English",
    );
    await shot("10a-phone-menu-en", phone);
    // P7: the alignment opens from «Griglia e misure» (route tab=grid) and starts at once.
    await go(`preparation?id=${dungeon.id}&tab=grid`, phone);
    const start = phone.locator("[data-sa-align-start]");
    if (await start.count()) await start.tap();
    await phone.waitForTimeout(300);
    const finger = await at(CANVAS, 20 + 56 * 5, 12 + 56 * 5, phone);
    await phone.touchscreen.tap(finger.x, finger.y);
    await phone.waitForTimeout(400);
    const loupe = await phone.locator("[data-sa-loupe]").boundingBox();
    check(loupe, "No magnifier on the phone");
    const covers =
      finger.x >= loupe.x &&
      finger.x <= loupe.x + loupe.width &&
      finger.y >= loupe.y &&
      finger.y <= loupe.y + loupe.height;
    check(!covers, `The magnifier sits under the finger: ${JSON.stringify({ finger, loupe })}`);
    check(
      (await phone.locator("[data-sa-loupe]").getAttribute("data-sa-touch")) === "true",
      "Magnifier not in touch mode",
    );
    check(await noOverflow(phone), "Workspace overflows at 390");
    await shot("10b-phone-loupe-away-from-finger", phone);
    await phone.locator("[data-sa-align-cancel]").tap();
    // The Table's Scene tab on the phone: floors of the tower are one tap away.
    await go("table", phone);
    await dismissTip(phone, "Got it");
    await sceneTab(phone, true);
    check(
      await phone.locator("[data-sa-default-go]").isVisible(),
      "Starting view button missing on the phone",
    );
    check(await noOverflow(phone), "Table overflows at 390 with the Scene tab");
    await shot("10c-phone-scene-tab", phone);
    passed.push(
      "EN phone 390 (touch): the page menu in English without overflow; the alignment magnifier on a tap sits away from the finger (touch mode); the Table's Scene tab opens from the bottom bar without overflow",
    );
    await noAreaWarnings("phone", phone);
  } finally {
    await phoneContext?.close().catch(() => {});
    await context.close().catch(() => {});
  }
  if (errors.length) throw Error("Page errors: " + errors.join(" | "));
  return passed.join("\n");
}
