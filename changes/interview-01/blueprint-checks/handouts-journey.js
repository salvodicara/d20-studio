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
  // B62: Preparation sections are grouped (Scenes, Encounters, Materials, Sessions and
  // adventures); a section outside the open group is reached through «Tutte» (2 clicks).
  const openPrepSection = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const here = page.locator(`[data-prep-section="${id}"]`);
    if (await here.count()) return press(here.first());
    await press(page.locator("[data-prep-sections-all]"));
    await press(page.locator(`#dialog [data-prep-section-jump="${id}"]`));
  };
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
  // B15 — materials, handouts, pins and map-less scenes. Acceptance checks of the card in
  // docs/interview/CAPABILITY_CENSUS.md (#### B15) with real clicks, keys and touch:
  // (1) sealed letter with image, player text and DM note shown only to Livia, reopened after
  // reload, DM note never in the player's page; (2) pin linked to the "Crypt" entry heading,
  // hidden by default, semi-transparent with L, revealed shows only the excerpt; (3) map-less
  // "Taverna" active at the Table without a grid; (4) mimic art revealed from its token;
  // (5) prep sheet secrets ticked in play, unrevealed ones carried to the next session;
  // (6) vignette with three choices: players pick, the DM decides. Plus undo/correction,
  // offline refusal, keyboard, EN phone 390 with touch. Review fixes (24/09): full-screen
  // pan/zoom viewer, withdrawal "only some" with required reason, pins prepared on a scene
  // that is not active, pins linked to Campaign › World entries, B28 library images and
  // their sharing rule, hide the creature's name on reveal, prep sheet numbered by the
  // Table session (B14) with close offered at the end, carry choice kept, deleted material
  // leaving prep rows editable, browser Back/reload while typing. Review fixes 2 (24/09):
  // materials linked to a map scene listed first in the DM drawer and named in the DM viewer
  // with Go to pin, explicit "use the heading's player text" pin option, pin drag kept inside
  // the map, a direct link forgotten once closed, vignette outcome delivered to the players,
  // Duplicate, search with DM tags, one "Close the sheet…" button once the session ended,
  // "Open" on linked prep rows. Synthetic data; resets this browser.
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dimKey = "d20-studio-setting:handouts-view.dim-pins";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B15/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) =>
    errors.push(error.message + " @ " + String(error.stack).split("\n").slice(1, 3).join(" ")),
  );
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const button = (name, scope = page) => scope.getByRole("button", { name, exact: true });
  // B61: map tools stand in toolbar groups; a tool of another group shows after its group.
  const pickTool = async (id, p = page) => {
    const chip = p.locator(`.map-toolbar [data-tool="${id}"]`);
    if (!(await chip.isVisible()))
      await p.locator(`.map-tool-cluster:has([data-tool="${id}"]) [data-tool-group]`).click();
    await chip.click();
  };
  const dialog = page.locator("#dialog");
  const closeDialog = async () => {
    await dialog.locator("footer button").first().click();
    await page.waitForFunction(() => !document.querySelector("#dialog").open);
  };
  const role = async (value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForTimeout(250);
  };
  const shot = (name) => page.screenshot({ path: dir + name + ".png" });
  const noOverflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const html = () => page.evaluate(() => document.documentElement.outerHTML);
  const toast = async (text) => page.locator("#toast", { hasText: text }).waitFor();
  const go = async (hash) => {
    await page.goto(base + "#" + hash);
    await page.locator("#content").waitFor();
    await page.waitForTimeout(150);
  };
  const mapPoint = (locator, x, y) =>
    locator.evaluate(
      (svg, p) => {
        const t = svg.createSVGPoint();
        t.x = p.x;
        t.y = p.y;
        const r = t.matrixTransform(svg.getScreenCTM());
        return { x: r.x, y: r.y };
      },
      { x, y },
    );
  const material = async (title) =>
    (await stored()).ext.handouts.materials.find((m) => m.title === title);
  const card = (title) => page.locator("[data-material]", { hasText: title });
  const cardMore = async (title, action) => {
    await card(title).locator("summary").click();
    await card(title).getByRole("button", { name: action, exact: true }).click();
  };
  const dmNote = "La calligrafia è di Tessa Varro: inchiostro ancora fresco.";
  // B61: panels are tabs of the Table's right sidebar, remembered per identity.
  const ensureDrawer = async (id) => {
    await openTablePanel(page, id); // B62: a sub-tab of its sidebar tab
    await page.locator("#table-drawer").waitFor();
  };
  const dialogOpen = () => page.evaluate(() => document.querySelector("#dialog").open);
  // B61: the inspector panels (Appearance, Map-less scene) are in the sidebar's Creature
  // tab; each identity may find another tab open, as it left it.
  const showCreature = async (p = page, tap = false) => {
    const t = p.locator('.table-tabs [data-table-tab="creature"]');
    if ((await t.getAttribute("aria-selected")) !== "true") await (tap ? t.tap() : t.click());
  };

  let phone = null;
  try {
    // Fresh example, Italian, desktop 1440.
    await page.goto(base);
    await page.evaluate(
      ([k, d]) => {
        localStorage.removeItem(k);
        localStorage.removeItem(d);
      },
      [key, dimKey],
    );
    await page.reload();
    await page.locator("#content").waitFor();
    await button("Cosa è pronto").click();
    const report = await dialog.locator(".ext-report li", { hasText: "B15 ·" }).first().innerText();
    check(
      /attiva · \d+ contributi/.test(report) && !/avvis/.test(report),
      "B15 not reported as ready without warnings: " + report,
    );
    await closeDialog();
    passed.push("Report: " + report.split("\n")[0]);

    // (1) The DM writes the sealed letter in Preparation › Materials (Campaign → Preparation → Materials).
    await role("dm");
    await button("Apri campagna").click();
    await button("Preparazione").click();
    await openPrepSection(page, "handouts");
    await button("Nuovo handout").click();
    await dialog.locator("[name=title]").fill("Lettera sigillata");
    await dialog.locator("[name=artId]").selectOption("art-letter");
    check(
      await dialog.locator("[data-hs-art-preview] img").count(),
      "Image preview missing in the editor",
    );
    await dialog
      .locator("[name=playerText]")
      .fill("«Chi riaccende la lanterna risponde ai Varro. Venite soli alla torre.»");
    await dialog.locator("[name=dmNote]").fill(dmNote);
    await dialog.locator("[name=tags]").fill("Varro, sigillo");
    await shot("01-dm-new-handout");
    await button("Crea", dialog).click();
    await card("Lettera sigillata").waitFor();
    check(
      (await card("Lettera sigillata").locator("[data-hs-access-badge]").innerText()) === "Solo DM",
      "New handout is not DM-only",
    );
    let letter = await material("Lettera sigillata");
    check(
      letter.image.artId === "art-letter" &&
        letter.dmNote === dmNote &&
        letter.access.mode === "none",
      "Handout not stored as authored",
    );
    check(
      (await stored()).log.at(-1).visibility === "private",
      "DM authoring leaked into the shared log",
    );
    // Show Players, only Livia (Foundry FVT-162).
    await card("Lettera sigillata").getByRole("button", { name: "Mostra…" }).click();
    await dialog.locator("input[name=actor][value=livia]").check();
    check(
      await dialog.locator("input[name=mode][value=some]").isChecked(),
      'Choosing Livia did not select "only some"',
    );
    await shot("02-dm-show-players");
    await button("Mostra", dialog).click();
    await toast("Mostrato a: Livia");
    check(
      (await card("Lettera sigillata").locator("[data-hs-access-badge]").innerText()) === "Livia",
      "Access badge not Livia",
    );
    // The crypt entry goes to Doran only (played by the DM): the player must not receive it.
    await card("Cripta sotto l’osservatorio").getByRole("button", { name: "Mostra…" }).click();
    await dialog.locator("input[name=actor][value=doran]").check();
    await button("Mostra", dialog).click();
    await toast("Mostrato a: Doran");
    await shot("03-dm-materials-list");
    // Search in place (title, text, headings, DM tags): "sigillo" is only a tag of the letter.
    const search = page.locator("[data-hs-material-search]");
    await search.fill("sigillo");
    check(
      (await page.locator("[data-material]:visible").count()) === 1 &&
        (await card("Lettera sigillata").isVisible()),
      "Search by tag did not keep only the letter",
    );
    check(
      await search.evaluate((el) => el === document.activeElement),
      "Search box lost focus while filtering",
    );
    await shot("03b-dm-materials-search");
    await search.fill("zzz");
    await page.locator("[data-hs-material-empty]:visible").waitFor();
    await search.fill("");
    check((await page.locator("[data-material]:visible").count()) >= 4, "Search not cleared");
    passed.push(
      'DM authored "Lettera sigillata" (image, player text, DM note) and showed it only to Livia; crypt only to Doran',
    );

    // The player receives the pop-up: letter only, no DM note, no crypt.
    await role("player");
    await dialog.getByRole("heading", { name: "Il DM ti mostra: Lettera sigillata" }).waitFor();
    check(
      (await dialog.locator('img[alt="Lettera sigillata"]').count()) === 1,
      "Pop-up has no image",
    );
    check(
      (await dialog.innerText()).includes("Venite soli alla torre"),
      "Pop-up has no player text",
    );
    let page1 = await html();
    check(
      !page1.includes("inchiostro ancora fresco") && !page1.includes("Cripta sotto"),
      "Player page contains the DM note or the crypt entry",
    );
    await shot("04-player-popup-letter");
    // Full screen with pan and zoom (Alchemy VTL-080/162): buttons, wheel, drag, Escape.
    await dialog.getByRole("button", { name: "Ingrandisci" }).click();
    const full = page.locator(".handouts-fullview");
    await full.waitFor();
    check(
      await page.evaluate(() => {
        const r = document.querySelector(".handouts-fullview").getBoundingClientRect();
        return r.width >= innerWidth - 1 && r.height >= innerHeight - 1;
      }),
      "Enlarge is not full screen",
    );
    const level = page.locator("[data-hs-full-level]");
    await page.locator('[data-hs-full="in"]').click();
    check(
      (await level.innerText()) === "140%",
      "Zoom in did not zoom: " + (await level.innerText()),
    );
    const stageBox = await page.locator("[data-hs-full-stage]").boundingBox();
    await page.mouse.move(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(100);
    check(parseInt(await level.innerText(), 10) > 140, "Wheel did not zoom");
    const fullImg = page.locator(".handouts-fullview img");
    const before = await fullImg.evaluate((img) => img.style.transform);
    await page.mouse.down();
    await page.mouse.move(
      stageBox.x + stageBox.width / 2 + 120,
      stageBox.y + stageBox.height / 2 + 60,
      {
        steps: 6,
      },
    );
    await page.mouse.up();
    check(before !== (await fullImg.evaluate((img) => img.style.transform)), "Drag did not pan");
    await shot("04b-player-fullscreen");
    await page.keyboard.press("Escape");
    check(
      !(await full.count()) && (await page.evaluate(() => document.querySelector("#dialog").open)),
      "Escape should leave full screen only",
    );
    await closeDialog();
    let data = await stored();
    check(
      data.ext["handouts-seen"].player.includes(
        letter.shows?.[0]?.id ?? (await material("Lettera sigillata")).shows[0].id,
      ),
      "Seen mark not stored",
    );
    // Reload: no second pop-up; Livia reopens it from Campaign › Materials and the Table.
    await page.reload();
    await page.locator("#content").waitFor();
    await page.waitForTimeout(500);
    check(
      !(await page.evaluate(() => document.querySelector("#dialog").open)),
      "Pop-up repeated after reload",
    );
    await go("home");
    await button("Apri campagna").click();
    await openCampaignSection(page, "handouts");
    await page.locator("[data-hs-player-list] [data-hs-row]").first().waitFor();
    const rows = await page.locator("[data-hs-player-list] [data-hs-row]").allInnerTexts();
    check(
      rows.some((r) => r.includes("Lettera sigillata")) &&
        rows.some((r) => r.includes("Avviso della gilda")) &&
        !rows.some((r) => r.includes("Cripta")),
      "Player list wrong: " + rows.join(" | "),
    );
    await shot("05-player-campaign-materials");
    await page
      .locator("[data-hs-row]", { hasText: "Lettera sigillata" })
      .getByRole("button", { name: "Apri" })
      .click();
    await dialog.getByRole("heading", { name: "Lettera sigillata" }).waitFor();
    check(!(await dialog.innerText()).includes("inchiostro"), "Reopened handout shows the DM note");
    await closeDialog();
    await go("table");
    await ensureDrawer("handouts-panel");
    await page
      .locator("#table-drawer [data-hs-row]", { hasText: "Lettera sigillata" })
      .getByRole("button", { name: "Apri" })
      .click();
    await dialog.getByRole("heading", { name: "Lettera sigillata" }).waitFor();
    await closeDialog();
    page1 = await html();
    check(!page1.includes("inchiostro ancora fresco"), "DM note reached the player Table");
    // The route used by search results and notifications opens the material directly.
    await go("campaign?tab=handouts&id=" + (await material("Lettera sigillata")).id);
    await dialog.getByRole("heading", { name: "Lettera sigillata" }).waitFor();
    await closeDialog();
    await page
      .waitForFunction(() => location.hash === "#campaign?tab=handouts", null, { timeout: 2000 })
      .catch(() => check(false, "The closed material stays in the address"));
    await page.reload();
    await page.locator("#content").waitFor();
    await page.waitForTimeout(400);
    check(!(await dialogOpen()), "Reload reopened the closed material");
    await role("dm");
    check(!(await dialogOpen()), "Switching to the DM reopened the material as the DM view");
    await role("player");
    await go("table");
    passed.push(
      "Player: pop-up with image and text, enlarge, seen after reload, reopened from Campaign › Materials, the Table drawer and its direct route (search/notifications); DM note and Doran-only crypt never in the page",
    );

    // Undo and reasoned correction of a show (DM at the Table).
    await role("dm");
    await ensureDrawer("handouts-panel");
    await page
      .locator("#table-drawer li", { hasText: "Cripta sotto" })
      .getByRole("button", { name: "Mostra…" })
      .click();
    await button("Mostra", dialog).click();
    check(
      (await material("Cripta sotto l’osservatorio")).access.mode === "all",
      "Mistaken show not applied",
    );
    await button("Annulla ultima modifica").click();
    await toast("Modifica annullata");
    data = await stored();
    check(
      JSON.stringify((await material("Cripta sotto l’osservatorio")).access) ===
        JSON.stringify({ mode: "some", actorIds: ["doran"] }),
      "Undo did not restore the access",
    );
    check(data.log.at(-1).kind === "correction", "Undo not recorded as correction");
    await go("preparation?tab=handouts");
    await cardMore("Cripta sotto l’osservatorio", "Ritira accesso…");
    await dialog.locator("[name=reason]").fill("Doran non ha ancora trovato la cripta");
    await button("Ritira", dialog).click();
    await toast("Accesso ritirato");
    const crypt = await material("Cripta sotto l’osservatorio");
    check(
      crypt.access.mode === "none" &&
        crypt.corrections.at(-1).reason === "Doran non ha ancora trovato la cripta",
      "Withdrawal not recorded with reason",
    );
    // Only from some characters: ticking Livia selects "only some"; the reason is required.
    await cardMore("Avviso della gilda delle lanterne", "Ritira accesso…");
    await dialog.locator("input[name=actor][value=livia]").check();
    check(
      (await dialog.locator("input[name=mode][value=some]").isChecked()) &&
        !(await dialog.locator("input[name=mode][value=all]").isChecked()),
      'Ticking Livia did not switch to "only some"',
    );
    await shot("04c-dm-withdraw-some");
    await button("Ritira", dialog).click();
    check(
      (await material("Avviso della gilda delle lanterne")).access.mode === "all" &&
        (await page.evaluate(() => document.querySelector("#dialog").open)),
      "Withdrawal without a reason was applied",
    );
    await dialog.locator("[name=reason]").fill("Livia ha perso l’avviso nel fiume");
    await button("Ritira", dialog).click();
    await toast("Accesso ritirato. Ora: Doran, Mira");
    check(
      JSON.stringify((await material("Avviso della gilda delle lanterne")).access) ===
        JSON.stringify({ mode: "some", actorIds: ["doran", "mira"] }),
      "Partial withdrawal wrong",
    );
    // How a player sees it (DM preview): Livia sees the letter without the DM note.
    await cardMore("Lettera sigillata", "Come lo vede un giocatore…");
    check(
      (await dialog.innerText()).includes("Venite soli") &&
        !(await dialog.innerText()).includes("inchiostro"),
      "Player preview shows DM parts",
    );
    await dialog.locator("[data-hs-preview-actor]").selectOption("doran");
    check(
      (await dialog.innerText()).includes("non lo vede ancora"),
      "Doran preview should be empty",
    );
    await closeDialog();
    // Offline: a shared show is refused with a readable message; nothing changes.
    await button("Preferenze").click();
    await dialog.locator("[name=offline]").check();
    await button("Salva preferenze").click();
    await card("Il carro rovesciato").getByRole("button", { name: "Mostra…" }).click();
    await button("Mostra", dialog).click();
    await dialog.locator(".dialog-error", { hasText: "senza rete" }).waitFor();
    check(
      (await material("Il carro rovesciato")).access.mode === "none",
      "Offline show was applied",
    );
    await closeDialog();
    await button("Preferenze").click();
    await dialog.locator("[name=offline]").uncheck();
    await button("Salva preferenze").click();
    passed.push(
      'Mistaken show undone (correction in log); withdrawal with reason; "only some" withdrawal (Livia) with required reason; DM preview per character; offline show refused',
    );

    // (2) Pin linked to the crypt entry heading, placed with the Pin tool on the Table.
    await go("table");
    const map = page.locator("#battle-map");
    await pickTool("handouts-pin");
    const at = await mapPoint(map, 200, 130);
    await page.mouse.click(at.x, at.y);
    await dialog.getByRole("heading", { name: "Nuovo spillo" }).waitFor();
    await dialog
      .locator("[name=link]")
      .selectOption({ label: "Cripta sotto l’osservatorio › Ingresso" });
    check(
      (await dialog.locator("[name=excerpt]").inputValue()).startsWith("Una scala di pietra"),
      "Excerpt not taken from the heading",
    );
    check(
      (await dialog.locator("[name=label]").inputValue()) === "Ingresso",
      "Label not proposed from the heading",
    );
    // Roll20 "use blockquote as player flavour text" (R20-099): an explicit, ticked option.
    check(
      (await dialog.locator("[name=excerptLinked]").isChecked()) &&
        (await dialog.locator("[name=excerpt]").getAttribute("readonly")) !== null,
      "Linked excerpt is not an explicit ticked option",
    );
    await dialog.locator("[name=excerptLinked]").uncheck();
    check(
      (await dialog.locator("[name=excerpt]").getAttribute("readonly")) === null,
      "Unticking does not make the excerpt editable",
    );
    await dialog.locator("[name=excerptLinked]").check();
    check(
      !(await dialog.locator("[name=visible]").isChecked()),
      "New pin is not hidden by default",
    );
    await dialog.locator("[name=label]").fill("Scala della cripta");
    await shot("06-dm-new-pin");
    await button("Posa spillo", dialog).click();
    await toast("nascosto ai giocatori");
    data = await stored();
    let pin = data.ext.handouts.pins.find((p) => p.label === "Scala della cripta");
    check(
      pin && !pin.visible && pin.link.sectionId === "crypt-entrance" && pin.excerptLinked,
      "Pin not stored hidden and linked",
    );
    const pinEl = page.locator(`[data-handouts-pin="${pin.id}"]`);
    check(/is-hidden/.test(await pinEl.getAttribute("class")), "Hidden pin not drawn dashed");
    // Semi-transparent with one command: L on the map (DDB-099), persists on this device.
    await button("Muovi").first().click();
    await map.focus();
    await page.keyboard.press("l");
    await toast("Spilli semitrasparenti");
    check(
      /is-dim/.test(await page.locator(`[data-handouts-pin="${pin.id}"]`).getAttribute("class")),
      "L did not dim the pins",
    );
    await shot("07-dm-pins-dim");
    await page.reload();
    await page.locator("#battle-map").waitFor();
    await role("dm"); // the demo identity is not part of the saved data
    check(
      /is-dim/.test(await page.locator(`[data-handouts-pin="${pin.id}"]`).getAttribute("class")),
      "Dim setting lost on reload",
    );
    await ensureDrawer("handouts-panel");
    await page.locator('[data-hs-drawer-tab="pins"]').click();
    const dimButton = page.locator("[data-hs-dim]");
    check((await dimButton.getAttribute("aria-pressed")) === "true", "Dim toggle not pressed");
    await dimButton.click();
    check(
      !/is-dim/.test(await page.locator(`[data-handouts-pin="${pin.id}"]`).getAttribute("class")),
      "Drawer toggle did not restore opaque pins",
    );
    // DM drags the pin (one commit on release).
    const from = await mapPoint(page.locator("#battle-map"), pin.x, pin.y - 20);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 30, from.y + 10, { steps: 6 });
    await page.mouse.move(from.x + 60, from.y + 20, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(250);
    const moved = (await stored()).ext.handouts.pins.find((p) => p.id === pin.id);
    check(
      moved.x > pin.x + 40 && moved.y > pin.y + 10,
      `Pin drag not saved: ${pin.x},${pin.y} → ${moved.x},${moved.y}`,
    );
    // Dragged far outside the map: kept at the edge, drawn where it is stored; Undo.
    const well = page.locator('[data-handouts-pin="pin-well"]');
    const wellBox = await well.boundingBox();
    await page.mouse.move(wellBox.x + wellBox.width / 2, wellBox.y + wellBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(wellBox.x - 2000, wellBox.y + 10, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const edge = (await stored()).ext.handouts.pins.find((p) => p.id === "pin-well");
    check(
      edge.x === 0 &&
        (await page.locator('[data-handouts-pin="pin-well"]').getAttribute("transform")) ===
          `translate(0,${edge.y})`,
      "Pin dragged out of the map not kept at the edge: " + JSON.stringify([edge.x, edge.y]),
    );
    await button("Annulla ultima modifica").click();
    await toast("Modifica annullata");
    check(
      (await stored()).ext.handouts.pins.find((p) => p.id === "pin-well").x === 560,
      "Undo did not restore the dragged pin",
    );
    // The player does not see hidden pins.
    await role("player");
    check(
      !(await page.locator(`[data-handouts-pin="${pin.id}"]`).count()) &&
        !(await page.locator('[data-handouts-pin="pin-well"]').count()),
      "Player sees hidden pins",
    );
    // Keyboard: focus the pin, Enter opens it; the DM reveals it.
    await role("dm");
    await page.locator(`[data-handouts-pin="${pin.id}"]`).focus();
    await page.keyboard.press("Enter");
    await dialog.getByRole("heading", { name: "Scala della cripta" }).waitFor();
    check(
      (await dialog.innerText()).includes("Nascosto ai giocatori"),
      "Pin dialog does not state hidden",
    );
    await dialog.locator("[data-hs-open-link]").click();
    await dialog.locator('[data-hs-section-view="crypt-entrance"].is-target').waitFor();
    check(
      (await dialog.innerText()).includes("Lastra a pressione"),
      "Link does not open the entry at its heading",
    );
    await closeDialog();
    await page.locator(`[data-handouts-pin="${pin.id}"]`).click();
    await button("Rivela ai giocatori", dialog).click();
    await toast("solo etichetta ed estratto");
    await role("player");
    await page.locator(`[data-handouts-pin="${pin.id}"]`).click();
    await dialog.getByRole("heading", { name: "Scala della cripta" }).waitFor();
    const excerptText = await dialog.innerText();
    check(
      excerptText.includes("Una scala di pietra") &&
        !excerptText.includes("Lastra") &&
        !excerptText.includes("campana"),
      "Player pin shows more than the excerpt",
    );
    check(
      !(await dialog.locator("[data-hs-open-material]").count()),
      "Pin offers the unshared entry",
    );
    await shot("08-player-pin-excerpt");
    await page.keyboard.press("Escape");
    page1 = await html();
    check(
      !page1.includes("Pozzo del cortile") && !page1.includes("chiave d’ottone"),
      "Hidden DM reminder pin reached the player",
    );
    passed.push(
      'Pin: tool click, linked to "Cripta › Ingresso" with the explicit "use the heading text" option, hidden (dashed) by default, L semi-transparent persisted then restored from drawer, dragged, dragged out of the map kept at the edge then undone, keyboard Enter, jump to heading, revealed: player sees only the excerpt',
    );

    // A material linked to the map scene (the crypt → the courtyard): first in the DM drawer,
    // named in the DM viewer with its pins and Go to pin (Alchemy VTL-078, DDB-099, R20-099).
    await role("dm");
    await ensureDrawer("handouts-panel");
    await page.locator('[data-hs-drawer-tab="materials"]').click();
    const hereGroup = page.locator("#table-drawer [data-hs-scene-materials]");
    check(
      (await hereGroup.innerText()).includes("Cripta sotto l’osservatorio") &&
        !(await page.locator("#table-drawer [data-hs-other-materials]").innerText()).includes(
          "Cripta sotto",
        ),
      "Linked crypt not listed first for the courtyard",
    );
    await hereGroup.scrollIntoViewIfNeeded();
    await shot("08c-dm-drawer-scene-materials");
    await hereGroup
      .locator("li", { hasText: "Cripta sotto" })
      .getByRole("button", { name: "Apri" })
      .click();
    await dialog
      .locator("[data-hs-linked-scenes]", { hasText: "Il cortile dell’osservatorio" })
      .waitFor();
    check(
      (await dialog.innerText()).includes("Scala della cripta"),
      "The DM viewer does not list the linked pin",
    );
    await dialog.locator("[data-hs-linked-scenes]").scrollIntoViewIfNeeded();
    await shot("08d-dm-viewer-linked-pins");
    await dialog.locator(`[data-hs-viewer-goto-pin="${pin.id}"]`).click();
    await page.locator(`[data-handouts-pin="${pin.id}"].is-focused`).waitFor();
    check(!(await dialogOpen()), "Go to pin left the viewer open");
    passed.push(
      "Linked scene on a map scene: the crypt listed under “Materiali di questa scena” in the DM drawer, the DM viewer names the courtyard and its pin, Vai allo spillo highlights it on the map",
    );

    // Pin linked to a Campaign › World entry (campaign-content projection, section audience).
    await role("dm");
    await go("campaign?tab=world");
    await page.locator('[data-campaign-new="world"]').click();
    const campaignField = (path) => page.locator('[data-campaign-path="' + path + '"]');
    await campaignField("data.title").fill("Torre della lanterna");
    await campaignField("data.body").fill("Una torre di pietra grigia sopra il cortile.");
    await campaignField("data.worldType").selectOption("place");
    await page.locator('[data-campaign-access-mode="access"]').selectOption("campaign");
    await page.getByText("Sezioni con destinatari propri", { exact: true }).click();
    await page.locator("[data-campaign-add-section]").click();
    await campaignField("data.sections.0.title").fill("Porta");
    await campaignField("data.sections.0.body").fill(
      "Una porta d’ottone, chiusa da una serratura a forma di lanterna.",
    );
    await page
      .locator('[data-campaign-access-mode="data.sections.0.access"]')
      .selectOption("campaign");
    await page.locator("[data-campaign-add-section]").click();
    await campaignField("data.sections.1.title").fill("Botola");
    await campaignField("data.sections.1.body").fill("La botola cede sotto chi porta metallo.");
    await page.locator("[data-campaign-save]").click();
    await page.locator("[data-campaign-apply]").click();
    await page.getByRole("heading", { name: "Torre della lanterna", level: 1 }).waitFor();
    await go("preparation?tab=handouts");
    await page.locator('[data-hs-prep-tab="pins"]').click();
    await page.locator('[data-hs-new-pin="old-watch"]').click();
    await dialog.getByRole("heading", { name: "Nuovo spillo" }).waitFor();
    let picker = dialog.locator("[data-hs-pin-picker]");
    let pickBox = await picker.boundingBox();
    await picker.click({ position: { x: pickBox.width * 0.62, y: pickBox.height * 0.2 } });
    await dialog.locator("[name=link]").selectOption({ label: "Torre della lanterna › Botola" });
    check(
      (await dialog.locator("[name=excerpt]").inputValue()) === "" &&
        (await dialog.locator("[data-hs-excerpt-hint]").innerText()).includes("non è leggibile"),
      "A DM-only section was proposed as the player excerpt",
    );
    await dialog.locator("[name=link]").selectOption({ label: "Torre della lanterna › Porta" });
    check(
      (await dialog.locator("[name=excerpt]").inputValue()).startsWith("Una porta d’ottone") &&
        (await dialog.locator("[name=label]").inputValue()) === "Botola",
      "World section excerpt not proposed",
    );
    await dialog.locator("[name=label]").fill("Porta della torre");
    await dialog.locator("[name=visible]").check();
    await shot("08b-dm-pin-world-entry");
    await button("Posa spillo", dialog).click();
    await toast("visibile ai giocatori");
    data = await stored();
    const towerPin = data.ext.handouts.pins.find((p) => p.label === "Porta della torre");
    check(
      towerPin.link.entryId && towerPin.link.sectionId && towerPin.excerptLinked && towerPin.x > 0,
      "World pin not stored with its link",
    );
    await role("player");
    await go("table");
    await page.locator(`[data-handouts-pin="${towerPin.id}"]`).click();
    await dialog.getByRole("heading", { name: "Porta della torre" }).waitFor();
    check(
      (await dialog.innerText()).includes("Una porta d’ottone") &&
        !(await dialog.innerText()).includes("botola"),
      "Player world pin shows more than the readable section",
    );
    await dialog.getByRole("button", { name: "Apri la voce del Mondo" }).click();
    await page.getByRole("heading", { name: "Torre della lanterna", level: 1 }).waitFor();
    check(
      !(await page.locator("#content").innerText()).includes("cede sotto"),
      "The DM-only section reached the player",
    );
    await go("table");
    passed.push(
      'Pin linked to Campaign › World "Torre della lanterna › Porta": placed from Preparation on the map picture, DM-only section never proposed as excerpt; player opens the entry from the pin and never sees the DM-only section',
    );

    // (4) Mimic created in Preparation, then its art revealed from its token (DDB-130).
    await role("dm");
    await go("preparation");
    // interview-01: scenes now sit in folders (one scene list); search every folder.
    if (!(await page.locator('[data-prep-open="old-watch"]').count()))
      await page.locator("[data-sa-search]").fill("cortile dell");
    await page.locator('[data-prep-open="old-watch"]').first().click();
    await button("Crea PNG…").click();
    await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Mimic");
    await button("Crea e posiziona").click();
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );
    const prepMap = page.locator("[data-prep-interactive]");
    await prepMap.scrollIntoViewIfNeeded();
    const spot = await mapPoint(prepMap, 780, 520);
    await page.mouse.click(spot.x, spot.y);
    await button("Salva preparazione").click();
    if (await dialog.getByRole("button", { name: "Aggiorna scena attiva" }).count())
      await button("Aggiorna scena attiva", dialog).click();
    data = await stored();
    const mimic = Object.values(data.actors).find((a) => a.name === "Mimic");
    check(
      mimic && data.scenes[0].tokens.some((t) => t.actorId === mimic.id),
      "Mimic not saved on the scene",
    );
    await go("table");
    await page.locator(`[data-actor="${mimic.id}"]`).click();
    await showCreature();
    await page.locator("[data-hs-reveal-token]").click();
    await dialog.getByRole("heading", { name: "Rivela aspetto: Mimic" }).waitFor();
    check(
      (await dialog.locator("input[name=artId]:checked").inputValue()) === "art-mimic",
      "Mimic art not suggested first",
    );
    await dialog.locator("[data-hs-art-search]").fill("taverna");
    check(
      (await dialog.locator(".handouts-art-option").first().innerText()).includes("Taverna"),
      "Image search does not filter",
    );
    await dialog.locator("[data-hs-art-search]").fill("forziere");
    await dialog.locator(".handouts-art-option", { hasText: "Un forziere con i denti" }).click();
    await dialog.locator("[name=caption]").fill("Il forziere spalanca le fauci");
    check(
      (await dialog.innerText()).includes("I giocatori vedono il nome «Mimic» sulla pedina"),
      "No warning that players see the creature name",
    );
    await dialog.locator("[name=hideName]").check();
    await shot("09-dm-reveal-from-token");
    await button("Mostra ai giocatori", dialog).click();
    await toast("Rivelata a: Tutto il gruppo");
    await role("player");
    await dialog
      .getByRole("heading", { name: "Il DM ti mostra: Il forziere spalanca le fauci" })
      .waitFor();
    check(
      (await dialog.locator("img").count()) === 1 && !(await dialog.innerText()).includes("Mimic"),
      "Reveal pop-up wrong or names the creature",
    );
    const leaks = [...(await html()).matchAll(/.{0,60}(Mimic|art-mimic).{0,30}/g)].map((m) => m[0]);
    check(!leaks.length, "The player page still names the creature: " + leaks.join(" | "));
    await shot("10-player-mimic-reveal");
    await closeDialog();
    await page.locator(`[data-actor="${mimic.id}"]`).click();
    await showCreature();
    await page
      .locator(".handouts-reveal-thumb", { hasText: "Il forziere spalanca le fauci" })
      .click();
    await dialog.getByRole("heading", { name: "Il forziere spalanca le fauci" }).waitFor();
    await closeDialog();
    // A character with no matching art: the DM panel offers the reveal without a random image.
    await role("dm");
    await page.locator('[data-actor="livia"]').click();
    await showCreature();
    await page.locator("[data-hs-reveal-panel]").waitFor();
    check(
      !(await page.locator("[data-hs-reveal-panel] img").count()),
      "Livia's Appearance panel previews an unrelated image",
    );
    passed.push(
      'Mimic created through Preparation; DM "Rivela aspetto…" from its token: art suggested and searchable, caption, warning that players see its name and "hide the name" (B12) ticked; player page has no "Mimic" anywhere (token, lists, ids); reopened from the token; Livia\'s panel shows no unrelated preview',
    );

    // The same reveal from the token menu (B12 menu, contribution "Rivela aspetto…").
    await role("dm");
    await page.locator('[data-actor="goblin-2"]').click({ button: "right" });
    await menuPick(page, "Rivela aspetto…"); // B62: «Aspetto» submenu
    await dialog.getByRole("heading", { name: "Rivela aspetto: Esploratore" }).waitFor();
    check(
      (await dialog.locator("input[name=artId]:checked").inputValue()) === "art-goblin",
      "Goblin art not suggested from the token menu",
    );
    await closeDialog();
    passed.push('Token menu (right-click) offers "Rivela aspetto…" with the matching art first');

    // (6) Vignette: three choices, players pick for their characters, the DM decides.
    await role("dm");
    await go("preparation?tab=handouts");
    await card("Il carro rovesciato").getByRole("button", { name: "Mostra…" }).click();
    await button("Mostra", dialog).click();
    await toast("Mostrato a: Tutto il gruppo");
    await role("player");
    await dialog.getByRole("heading", { name: "Il DM ti mostra: Il carro rovesciato" }).waitFor();
    check(
      (await dialog.locator(".handouts-choices li").count()) === 3,
      "Vignette does not list three options",
    );
    await dialog
      .locator("fieldset", { hasText: "Scelta di Livia" })
      .getByLabel("Seguire le tracce verso il bosco")
      .check();
    await toast("Scelta inviata al DM");
    await dialog
      .locator("fieldset", { hasText: "Scelta di Mira" })
      .getByLabel("Aiutare il mercante a rialzare il carro")
      .check();
    await toast("Scelta inviata al DM");
    check(
      !(await dialog.locator("fieldset", { hasText: "Scelta di Doran" }).count()),
      "Player can pick for Doran",
    );
    await shot("11-player-vignette-choices");
    await closeDialog();
    data = await stored();
    const wagon = data.ext.handouts.materials.find((m) => m.id === "material-wagon");
    check(
      wagon.responses.livia.choiceId === "wagon-tracks" &&
        wagon.responses.mira.choiceId === "wagon-help",
      "Picks not stored",
    );
    await role("dm");
    await go("preparation?tab=handouts");
    check(
      (await card("Il carro rovesciato").innerText()).includes("2 scelte ricevute"),
      "DM card does not count picks",
    );
    await cardMore("Il carro rovesciato", "Decidi esito…");
    check(
      (await dialog.innerText()).includes("Livia") && (await dialog.innerText()).includes("Mira"),
      "Decide dialog does not show who picked what",
    );
    await dialog.getByLabel(/Seguire le tracce verso il bosco/).check();
    await dialog.locator("[name=note]").fill("Le tracce vi portano al pozzo del cortile.");
    await button("Decidi esito", dialog).click();
    await toast("Esito registrato");
    // The outcome reaches the recipients like the vignette did: a pop-up (Show Players).
    await role("player");
    await dialog
      .getByRole("heading", { name: "Il DM ha deciso l’esito: Il carro rovesciato" })
      .waitFor();
    await dialog
      .locator("[data-hs-outcome]", { hasText: "Le tracce vi portano al pozzo" })
      .waitFor();
    await dialog.locator("[data-hs-outcome]").scrollIntoViewIfNeeded();
    await shot("12a-player-outcome-popup");
    await closeDialog();
    await go("campaign?tab=handouts");
    await page
      .locator("[data-hs-row]", { hasText: "Il carro rovesciato" })
      .getByRole("button", { name: "Apri" })
      .click();
    await dialog
      .locator("[data-hs-outcome]", { hasText: "Le tracce vi portano al pozzo" })
      .waitFor();
    check(
      !(await dialog.locator("[data-hs-choose]").count()),
      "Choices still editable after the DM decided",
    );
    await shot("12-player-vignette-outcome");
    await closeDialog();
    await role("dm");
    await go("preparation?tab=handouts");
    await cardMore("Il carro rovesciato", "Correggi esito…");
    await dialog.getByLabel(/Aiutare il mercante/).check();
    await button("Correggi esito", dialog).click();
    check(
      (await material("Il carro rovesciato")).outcome.choiceId === "wagon-tracks",
      "Correction without reason applied",
    );
    await dialog.locator("[name=reason]").fill("Mira convince il gruppo ad aiutare prima");
    await button("Correggi esito", dialog).click();
    await toast("Esito registrato");
    const corrected = await material("Il carro rovesciato");
    check(
      corrected.outcome.choiceId === "wagon-help" &&
        corrected.outcome.corrected &&
        corrected.corrections.at(-1).reason.startsWith("Mira"),
      "Outcome correction not recorded",
    );
    await role("player");
    await dialog
      .getByRole("heading", { name: "Il DM ha deciso l’esito: Il carro rovesciato" })
      .waitFor();
    check(
      (await dialog.locator("[data-hs-outcome]").innerText()).includes("Corretto"),
      "Corrected outcome not announced as corrected",
    );
    await closeDialog();
    await role("dm");
    // Duplicate for reuse (DOS2 vignette cards, CRP-072): DM-only, no picks.
    await go("preparation?tab=handouts");
    await cardMore("Il carro rovesciato", "Duplica");
    await toast("Copia creata: Il carro rovesciato (copia)");
    const copy = await material("Il carro rovesciato (copia)");
    check(
      copy.access.mode === "none" &&
        !Object.keys(copy.responses).length &&
        !copy.outcome &&
        copy.choices.length === 3,
      "Duplicate is not a clean DM-only copy",
    );
    passed.push(
      "Vignette: three options to the party; Livia and Mira picked (not Doran); DM saw the picks and decided; the outcome and its correction reached the player as pop-ups, choices locked; correction needs a reason; duplicated as a clean DM-only copy",
    );

    // (5) Session prep: the sheet takes the Table's session number (B14), secrets ticked in
    // play, undo, then the Table session ends and the sheet is closed.
    await go("table");
    // The topline button (B14 also repeats "Sessione" on the map HUD).
    const openDrawer = async (id) => {
      await openTablePanel(page, id); // B62: a sub-tab of its sidebar tab
      await page.locator("#table-drawer").waitFor();
    };
    await openDrawer("handouts-panel");
    await page.locator('[data-hs-drawer-tab="secrets"]').click();
    check(
      (await page.locator("#table-drawer").innerText()).includes(
        "Prossima sessione · La cripta sotto l’osservatorio",
      ),
      "Prep sheet not waiting for the next Table session",
    );
    await openDrawer("session-view-controls");
    await page.locator('#table-drawer [data-sv="start"]').click();
    await page.locator("#table-drawer [data-sv-status]", { hasText: "In corso" }).waitFor();
    data = await stored();
    check(data.ext["session-view"].sessions.at(-1).number === 1, "Table session is not number 1");
    await openDrawer("handouts-panel");
    await page.locator('[data-hs-drawer-tab="secrets"]').click();
    check(
      (await page.locator("#table-drawer").innerText()).includes(
        "Sessione 1 · La cripta sotto l’osservatorio",
      ),
      "Prep sheet does not use the Table session number",
    );
    await page
      .locator("#table-drawer label", { hasText: "Un mimic sorveglia la cripta" })
      .locator("input")
      .check();
    await page
      .locator("#table-drawer [data-secret-count]", { hasText: "1 di 6 rivelati" })
      .waitFor();
    await page
      .locator("#table-drawer label", { hasText: "Il pozzo nasconde" })
      .locator("input")
      .check();
    await page
      .locator("#table-drawer [data-secret-count]", { hasText: "2 di 6 rivelati" })
      .waitFor();
    await shot("13-dm-table-secrets");
    await button("Annulla ultima modifica").click();
    await page
      .locator("#table-drawer [data-secret-count]", { hasText: "1 di 6 rivelati" })
      .waitFor();
    // Keyboard: Space on a focused secret ticks it, Space again un-ticks it (correction).
    const seal = page
      .locator("#table-drawer label", { hasText: "stemma dei Varro" })
      .locator("input");
    await seal.focus();
    await page.keyboard.press("Space");
    await page
      .locator("#table-drawer [data-secret-count]", { hasText: "2 di 6 rivelati" })
      .waitFor();
    await page
      .locator("#table-drawer label", { hasText: "stemma dei Varro" })
      .locator("input")
      .focus();
    await page.keyboard.press("Space");
    await page
      .locator("#table-drawer [data-secret-count]", { hasText: "1 di 6 rivelati" })
      .waitFor();
    await go("preparation?tab=handouts-session");
    await page
      .getByRole("heading", { name: "Sessione 1 · La cripta sotto l’osservatorio" })
      .waitFor();
    check(
      (await page.locator("[data-hs-prep-session]").innerText()).includes("In corso al Tavolo"),
      "Prep sheet does not say the session is running",
    );
    check(
      (await page.locator("[data-handouts-prep] [data-secret-count]").innerText()).includes(
        "1 di 6 rivelati",
      ),
      "Prep sheet not in sync with the Table",
    );
    await page
      .locator('[data-hs-prep-field="strongStart"]')
      .fill("La campana della torre suona tre volte.");
    await page.keyboard.press("Tab");
    await page.waitForFunction(() =>
      JSON.parse(localStorage.getItem("d20-studio-blueprint-v1"))
        .ext["handouts-prep"].sheets.find((s) => s.id === "prep-3")
        .strongStart.startsWith("La campana"),
    );
    await page
      .locator('[data-hs-prep-add="npcs"] [name=text]')
      .fill("Bardo della taverna: conosce la canzone dei Varro");
    await page
      .locator('[data-hs-prep-add="npcs"]')
      .getByRole("button", { name: "Aggiungi" })
      .click();
    await page.locator('[data-hs-prep-row="npcs"]').nth(2).waitFor();
    await page.locator("[data-hs-prep-minimal]").check();
    await page.waitForFunction(() => !document.querySelector('[data-hs-prep-add="npcs"]'));
    await page.locator("[data-hs-prep-minimal]").uncheck();
    await page.locator('[data-hs-prep-add="npcs"]').waitFor();
    // Browser Back while typing: the draft guard saves the field first.
    await page
      .locator('[data-hs-prep-field="strongStart"]')
      .fill("La campana della torre suona tre volte, poi tace.");
    await page.goBack();
    await page.waitForTimeout(300);
    check(
      (await stored()).ext["handouts-prep"].sheets
        .find((s) => s.id === "prep-3")
        .strongStart.endsWith("poi tace."),
      "Text typed before Back was lost",
    );
    await go("preparation?tab=handouts-session");
    // Reload while typing: the browser asks before discarding it.
    await page.locator('[data-hs-prep-field="strongStart"]').fill("Bozza non salvata");
    let unload = null;
    page.once("dialog", (d) => {
      unload = d.type();
      d.dismiss();
    });
    await page.reload({ timeout: 2500 }).catch(() => {});
    check(unload === "beforeunload", "Reload did not ask before discarding the typed text");
    await page
      .locator('[data-hs-prep-field="strongStart"]')
      .fill("La campana della torre suona tre volte, poi tace.");
    await page.keyboard.press("Tab");
    // Linked rows open their target: the material, the creature's sheet, the scene preview.
    await page.getByRole("button", { name: "Apri: Cripta sotto l’osservatorio" }).click();
    await dialog.getByRole("heading", { name: "Cripta sotto l’osservatorio" }).waitFor();
    await closeDialog();
    await page.getByRole("button", { name: "Apri: Sentinella" }).click();
    await page.waitForFunction(
      () => location.hash.startsWith("#characters") && location.hash.includes("goblin-1"),
    );
    await page.getByRole("heading", { name: "Sentinella" }).first().waitFor();
    await shot("14c-dm-prep-open-creature");
    await go("preparation?tab=handouts-session");
    await page.getByRole("button", { name: "Apri: Il cortile dell’osservatorio" }).click();
    await page.waitForFunction(
      () => location.hash.includes("id=old-watch") && location.hash.includes("tab=preview"),
    );
    await go("preparation?tab=handouts-session");
    // A deleted material leaves its prep row editable (the link is dropped).
    await go("preparation?tab=handouts");
    await cardMore("Cripta sotto l’osservatorio", "Elimina…");
    await button("Elimina", dialog).click();
    await go("preparation?tab=handouts-session");
    const cryptRow = page.locator('input[data-hs-prep-row="locations"]').first();
    await cryptRow.fill("Cripta: odore di cera fredda e ferro");
    await page.keyboard.press("Tab");
    await page.waitForFunction(() =>
      JSON.parse(localStorage.getItem("d20-studio-blueprint-v1"))
        .ext["handouts-prep"].sheets.find((s) => s.id === "prep-3")
        .lists.locations[0].text.endsWith("e ferro"),
    );
    check(
      (await stored()).ext["handouts-prep"].sheets.find((s) => s.id === "prep-3").lists.locations[0]
        .materialId === null,
      "Deleted material still linked",
    );
    await shot("14-dm-session-prep");
    // Closing while the Table session runs says so; the session ends at the Table.
    await button("Chiudi la scheda…").click();
    check(
      (await dialog.innerText()).includes("La sessione 1 è ancora in corso"),
      "Close dialog does not mention the running session",
    );
    await closeDialog();
    await go("table");
    await openDrawer("session-view-controls");
    await page.locator('#table-drawer [data-sv="end"]').click();
    await button("Termina sessione", dialog).click();
    await page.locator('#table-drawer [data-sv="show"]').click();
    await openDrawer("handouts-panel");
    await page.locator('[data-hs-drawer-tab="secrets"]').click();
    await page
      .locator("#table-drawer [data-hs-prep-ended]", { hasText: "La sessione 1 è terminata" })
      .waitFor();
    await go("preparation?tab=handouts-session");
    await page.locator("[data-hs-prep-ended]").waitFor();
    check(
      (await button("Chiudi la scheda…").count()) === 1,
      "Two “Chiudi la scheda…” buttons once the session ended",
    );
    await shot("14b-dm-session-ended-banner");
    // Not carried: the choice is kept (toast and one-click sheet agree), then undone.
    await page.locator("[data-hs-prep-ended] [data-hs-prep-close]").click();
    await dialog.locator("[name=carry]").uncheck();
    await button("Chiudi la scheda", dialog).click();
    await toast("Nessun segreto riportato");
    await button("Nuova scheda dal modello").click();
    await page.getByRole("heading", { name: "Prossima sessione" }).waitFor();
    data = await stored();
    check(
      !data.ext["handouts-prep"].sheets.at(-1).lists.secrets.length &&
        data.ext["handouts-prep"].sheets.find((s) => s.id === "prep-3").carryDeclined === true,
      "Declined secrets came back in the new sheet",
    );
    await go("table");
    await button("Annulla ultima modifica").click();
    await toast("Modifica annullata");
    await button("Annulla ultima modifica").click();
    await toast("Modifica annullata");
    await go("preparation?tab=handouts-session");
    await page
      .getByRole("heading", { name: "Sessione 1 · La cripta sotto l’osservatorio" })
      .waitFor();
    // Carried: a new sheet with the five unrevealed secrets.
    await page.locator("[data-hs-prep-ended] [data-hs-prep-close]").click();
    check(
      (await dialog.innerText()).includes("Riporta i 5 segreti non rivelati in una nuova scheda"),
      "Close dialog count wrong",
    );
    await button("Chiudi la scheda", dialog).click();
    await toast("Nuova scheda pronta con 5 segreti riportati");
    await page.getByRole("heading", { name: "Prossima sessione" }).waitFor();
    const carried = await page
      .locator('[data-handouts-prep] input[data-hs-prep-row="secrets"]')
      .evaluateAll((els) => els.map((e) => e.value));
    check(
      carried.length === 5 && !carried.some((t) => t.includes("mimic")),
      "Carried secrets wrong: " + carried.join(" | "),
    );
    check(
      (await page.locator(".handouts-prep-history summary").first().innerText()).includes(
        "Sessione 1 · La cripta sotto l’osservatorio",
      ),
      "Closed sheet not listed with the Table session number",
    );
    await page.reload();
    await role("dm");
    await page.getByRole("heading", { name: "Prossima sessione" }).waitFor();
    check(
      (await page.locator("[data-hs-prep-session]").innerText()).includes("sarà la sessione 2"),
      "Next sheet does not announce Table session 2",
    );
    passed.push(
      "Session prep numbered by the Table session (B14 session 1 started and ended in Tavolo › Sessione); secret ticked in play (mouse and keyboard), mistaken tick undone, strong start autosaved and saved by the draft guard on browser Back, reload asks first; linked rows opened (crypt viewer, Sentinella's sheet, courtyard preview); deleted crypt leaves its prep row editable; ended session offered closing with one button (banner in Preparation and Table); not-carried choice kept (no secrets in the one-click sheet), undone; carried: 5 secrets in the next sheet, persisted after reload",
    );

    // (3) Map-less "Taverna" (DDB Theater of the Mind), activated at the Table without a grid.
    await go("preparation?tab=handouts");
    await page.locator('[data-hs-prep-tab="stages"]').click();
    await button("Nuova scena senza mappa").click();
    await dialog.locator("[name=name]").fill("Taverna");
    await dialog
      .locator("[name=publicDescription]")
      .fill("Il fuoco del Gufo Stanco scoppietta; un bardo accorda il liuto vicino al bancone.");
    await dialog
      .locator("[name=description]")
      .fill("Tessa Varro aspetta nell’angolo con due guardie.");
    check(
      (await dialog.locator("input[name=artId]:checked").inputValue()) === "art-tavern",
      "Tavern art not preselected",
    );
    await dialog.locator("input[name=material][value=material-notice]").check();
    await shot("15-dm-new-mapless");
    await button("Crea scena senza mappa", dialog).click();
    await toast("Scena creata");
    // A pin prepared on the Taverna before it is active (DDB Scene Prep, DDB-099).
    await page.locator('[data-hs-prep-tab="pins"]').click();
    let tavern = (await stored()).scenes.find((s) => s.name === "Taverna");
    await page.locator(`[data-hs-new-pin="${tavern.id}"]`).click();
    picker = dialog.locator("[data-hs-pin-picker]");
    pickBox = await picker.boundingBox();
    await picker.click({ position: { x: pickBox.width * 0.7, y: pickBox.height * 0.45 } });
    await dialog.locator("[name=label]").fill("Bancone");
    await dialog.locator("[name=kind]").selectOption("shop");
    await dialog.locator("[name=dmNote]").fill("Tessa paga il bardo per ascoltare.");
    await shot("15b-dm-prep-pin-taverna");
    await button("Posa spillo", dialog).click();
    await toast("nascosto ai giocatori");
    const barPin = (await stored()).ext.handouts.pins.find((p) => p.label === "Bancone");
    check(barPin.sceneId === tavern.id && barPin.x > 500, "Prep pin not placed on the Taverna");
    check(
      (await stored()).activeSceneId === "old-watch",
      "Preparing a pin moved the party to another scene",
    );
    await page
      .locator(`[data-hs-pin-row="${barPin.id}"]`)
      .getByRole("button", { name: "Vedi sulla mappa…" })
      .click();
    await dialog.locator(`[data-hs-minimap-pin="${barPin.id}"].is-focused`).waitFor();
    await closeDialog();
    await page.locator('[data-hs-prep-tab="stages"]').click();
    await page
      .locator("[data-hs-stage-row]", { hasText: "Taverna" })
      .getByRole("button", { name: "Attiva al Tavolo…" })
      .click();
    await button("Attiva per il gruppo", dialog).click();
    await page.getByRole("heading", { name: "Taverna", level: 1 }).waitFor();
    data = await stored();
    tavern = data.scenes.find((s) => s.name === "Taverna");
    check(
      data.activeSceneId === tavern.id &&
        tavern.gridVisible === false &&
        tavern.tokens.length === 3,
      "Taverna not active without grid",
    );
    check(
      !(await page.locator('#battle-map rect[fill="url(#map-grid)"]').count()),
      "Grid drawn on the map-less scene",
    );
    check(await page.locator("[data-hs-stage]").count(), "Stage not drawn");
    await showCreature();
    const stageNote = await page.locator("[data-hs-stage-panel]").innerText();
    // P7 PR-07 (D&D Beyond Theater of the Mind): a map-less scene shows no «Scala … / casella»
    // under the map; the stage note alone says distances still count 1,5 m per square.
    const caption = await page.locator(".map-caption").innerText();
    check(
      stageNote.includes("Scena senza mappa: nessuna griglia.") &&
        stageNote.includes("contano comunque 1,5 m per casella") &&
        !caption.includes("Scala") &&
        !caption.includes("casella"),
      "Map-less copy does not match what the Table does",
    );
    check(
      await page.locator(`[data-handouts-pin="${barPin.id}"].is-hidden`).count(),
      "Prepared pin not on the Taverna map",
    );
    await shot("16-dm-taverna-table");
    await ensureDrawer("handouts-panel");
    await page.locator('[data-hs-drawer-tab="materials"]').click();
    check(
      (await page.locator("#table-drawer [data-hs-scene-materials]").innerText()).includes(
        "Avviso della gilda",
      ),
      "Taverna materials not listed first in the DM drawer",
    );
    await page.locator("#table-drawer [data-hs-scene-materials]").scrollIntoViewIfNeeded();
    await shot("16b-dm-taverna-drawer");
    await role("player");
    await page.getByRole("heading", { name: "Taverna", level: 1 }).waitFor();
    await showCreature();
    const panel = await page.locator("[data-hs-stage-panel]").innerText();
    check(
      panel.includes("bardo accorda il liuto") &&
        panel.includes("Avviso della gilda") &&
        !panel.includes("Tessa Varro aspetta"),
      "Player stage panel wrong: " + panel,
    );
    check(
      !(await page.locator('#battle-map rect[fill="url(#map-grid)"]').count()),
      "Player sees a grid",
    );
    await shot("17-player-taverna-table");
    await role("dm");
    await go("preparation");
    check(
      (await page.locator("#content").innerText()).includes("Taverna"),
      "Taverna missing from the core Scenes list",
    );
    passed.push(
      'Map-less "Taverna": created with art, description, participants and a hung handout; pin "Bancone" prepared on it from Preparation (map picture, preview) without moving the party; activated at the Table without grid, picture filling the scene; copy states the ruler/movement scale the Table really uses; DM notes stay private; listed with the core scenes',
    );

    // B28 library images: a personal file is refused until shared; a shared one reaches players.
    await go("preparation?tab=handouts");
    await button("Nuovo handout").click();
    await dialog.locator("[name=title]").fill("Schizzo della sentinella");
    await dialog.locator("[name=artId]").selectOption("media:m-goblin");
    check(
      (await dialog.locator("[data-hs-art-share]").innerText()).includes("libreria personale"),
      "No note about the personal library file",
    );
    await button("Crea", dialog).click();
    await card("Schizzo della sentinella").getByRole("button", { name: "Mostra…" }).click();
    await button("Mostra", dialog).click();
    await dialog.locator(".dialog-error", { hasText: "Biblioteca › Immagini e file" }).waitFor();
    await shot("17b-dm-library-image-refused");
    await closeDialog();
    check(
      (await material("Schizzo della sentinella")).access.mode === "none",
      "A personal library file reached players",
    );
    await cardMore("Schizzo della sentinella", "Modifica…");
    await dialog.locator("[name=artId]").selectOption("media:m-letter");
    await button("Salva modifiche", dialog).click();
    await card("Schizzo della sentinella").getByRole("button", { name: "Mostra…" }).click();
    await button("Mostra", dialog).click();
    await toast("Mostrato a: Tutto il gruppo");
    await role("player");
    await dialog
      .getByRole("heading", { name: "Il DM ti mostra: Schizzo della sentinella" })
      .waitFor();
    const letterSrc = (await stored()).ext.media.assets.find((a) => a.id === "m-letter").dataUrl;
    check(
      (await dialog.locator("img").first().getAttribute("src")) === letterSrc,
      "The shared library image did not reach the player",
    );
    await closeDialog();
    await role("dm");
    await go("preparation?tab=handouts");
    await page.locator('[data-hs-prep-tab="images"]').click();
    check(
      (await page.locator('[data-hs-library-item="media:m-letter"]').innerText()).includes(
        "Biblioteca · condivisa",
      ),
      "Library images not listed with their sharing state",
    );
    await page.locator("[data-hs-open-media]").click();
    await page.waitForFunction(
      () => location.hash.startsWith("#library") && location.hash.includes("media"),
    );
    passed.push(
      "B28 library images: a personal file is refused with the sharing rule; the shared letter reaches the player; the Images tab lists library files with their state and opens Library › Images and files",
    );

    // Layout at 1440: no horizontal overflow on the area's pages.
    for (const hash of [
      "preparation?tab=handouts",
      "preparation?tab=handouts-session",
      "campaign?tab=handouts",
      "table",
    ]) {
      await go(hash);
      check(await noOverflow(), "Overflow at 1440 on " + hash);
    }
    await role("player");
    await go("campaign?tab=handouts");
    check(await noOverflow(), "Overflow at 1440 on player materials");
    passed.push(
      "No horizontal overflow at 1440 (Preparation Materials/Session, Campaign Materials, Table)",
    );

    // EN phone 390 with touch: copy this synthetic state into an isolated touch context.
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
    const phoneContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    phone = await phoneContext.newPage();
    phone.on("pageerror", (error) => errors.push("phone: " + error.message));
    const tapButton = (name, scope = phone) => scope.getByRole("button", { name, exact: true });
    const phoneDialog = phone.locator("#dialog");
    const phoneOverflow = () =>
      phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    await phone.goto(base);
    await phone.evaluate(([k, v]) => localStorage.setItem(k, v), [key, snapshot]);
    await phone.reload();
    await phone.locator("#content").waitFor();
    await tapButton("Preferenze").tap();
    await phoneDialog.locator("[name=lang]").selectOption("en");
    await tapButton("Salva preferenze").tap();
    await phone.locator("#demo-role").selectOption("player");
    await phone.waitForTimeout(300);
    await phone.goto(base + "#campaign?tab=handouts");
    await phone.locator("[data-handouts-campaign]").waitFor();
    check(
      (await phone.locator("[data-handouts-campaign] h2").innerText()) === "Materials",
      "Campaign materials heading not English",
    );
    check(await phoneOverflow(), "Phone overflow on campaign materials");
    await phone
      .locator("[data-hs-row]", { hasText: "Lettera sigillata" })
      .getByRole("button", { name: "Open" })
      .tap();
    await phoneDialog.getByRole("button", { name: "Enlarge" }).tap();
    await phone.locator(".handouts-fullview").waitFor();
    check(
      await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      "Full-screen viewer overflows at 390",
    );
    await phone.screenshot({ path: dir + "18b-phone-en-fullscreen.png" });
    await phone.getByRole("button", { name: "Exit full screen" }).tap();
    check(
      (await phoneDialog.innerText()).includes("Shown by the DM") &&
        !(await phoneDialog.innerText()).includes("inchiostro"),
      "English viewer wrong",
    );
    check(
      await phone.evaluate(() => {
        const d = document.querySelector("#dialog");
        return d.getBoundingClientRect().right <= innerWidth && d.scrollWidth <= d.clientWidth + 1;
      }),
      "Viewer dialog overflows at 390",
    );
    await phone.screenshot({ path: dir + "18-phone-en-viewer.png" });
    await phoneDialog.locator("footer button").first().tap();
    // Table in English on the phone: the Taverna stage and the Materials drawer.
    await phone.goto(base + "#table");
    await phone.locator("#battle-map").waitFor();
    await showCreature(phone, true);
    check(
      (await phone.locator("[data-hs-stage-panel]").innerText()).includes(
        "Map-less scene: no grid.",
      ),
      "Stage panel not English",
    );
    await openTablePanel(phone, "handouts-panel", true); // B62: Journal › Materials
    await phone.locator("#table-drawer", { hasText: "Shared with you" }).waitFor();
    check(await phoneOverflow(), "Phone overflow on the Table with the drawer open");
    await phone.screenshot({ path: dir + "19-phone-en-table-drawer.png", fullPage: true });
    // Back to the courtyard (core Scenes list) as DM; the player taps the revealed pin.
    await phone.locator("#demo-role").selectOption("dm");
    await phone.goto(base + "#preparation");
    // interview-01: scenes now sit in folders (one scene list); search every folder.
    if (!(await phone.locator('[data-prep-activate="old-watch"]').count()))
      await phone.locator("[data-sa-search]").fill("cortile dell");
    // W2b2: B41 seeds «La cripta sotto il cortile»; pick the courtyard's own row.
    await phone
      .locator(".prep-scene-row", { has: phone.locator('[data-prep-activate="old-watch"]') })
      .locator("summary")
      .tap();
    // Reconcile (27/09): the open «More actions» menu stays inside the 390 px screen (it ran
    // 105 px past it, the phone zoomed out and the activation tap missed).
    check(await phoneOverflow(), "Scene row «More actions» menu overflows at 390");
    await phone.locator('[data-prep-activate="old-watch"]').first().tap();
    await tapButton("Activate for the party", phoneDialog).tap();
    await phone.locator("#battle-map").waitFor();
    await openTablePanel(phone, "handouts-panel", true); // B62: Journal › Materials
    const phoneHere = phone.locator("#table-drawer [data-hs-scene-materials]");
    await phoneHere.waitFor();
    check(
      (await phoneHere.innerText()).includes("Materials for this scene"),
      "Phone DM drawer has no scene group",
    );
    check(await phoneOverflow(), "Phone overflow on the DM Table drawer");
    await phoneHere.scrollIntoViewIfNeeded();
    await phone.screenshot({ path: dir + "19b-phone-en-dm-drawer.png" });
    await phone.goto(base + "#preparation?tab=handouts");
    await phone.locator("[data-handouts-prep-materials]").waitFor();
    check(await phoneOverflow(), "Phone overflow on DM materials");
    await phone.screenshot({ path: dir + "20-phone-en-dm-materials.png" });
    await tapButton("New handout").tap();
    check(
      await phone.evaluate(
        () => document.querySelector("#dialog").getBoundingClientRect().right <= innerWidth,
      ),
      "Editor dialog overflows at 390",
    );
    await phoneDialog.locator("footer button").first().tap();
    await phone.goto(base + "#preparation?tab=handouts-session");
    await phone.locator("[data-handouts-prep]").waitFor();
    check(await phoneOverflow(), "Phone overflow on session prep");
    // A linked monster row added by touch gets its "Open" action, without overflow at 390.
    await phone.locator('[data-hs-prep-add="monsters"] [name=text]').fill("Sentinel at the gate");
    await phone.locator('[data-hs-prep-add="monsters"] select').selectOption("goblin-1");
    await phone.locator('[data-hs-prep-add="monsters"]').getByRole("button", { name: "Add" }).tap();
    const phoneOpen = phone.getByRole("button", { name: "Open: Sentinella" });
    await phoneOpen.waitFor();
    check(await phoneOverflow(), "Phone overflow on session prep with a linked row");
    const openBox = await phoneOpen.boundingBox();
    check(openBox.height >= 40, "Open action smaller than 40px on the phone");
    await phoneOpen.scrollIntoViewIfNeeded();
    await phone.screenshot({ path: dir + "20b-phone-en-session-prep.png" });
    await phone.locator("#demo-role").selectOption("player");
    await phone.goto(base + "#table");
    await phone.locator("#battle-map").waitFor();
    // B62: the taller phone map puts this pin's marker under the map tools in the map's
    // corner; the pin's own label below the marker is tapped instead (the same pin).
    const pinBox = await phone.locator(`[data-handouts-pin="${pin.id}"]`).boundingBox();
    await phone
      .locator(`[data-handouts-pin="${pin.id}"]`)
      .tap({ position: { x: pinBox.width / 2, y: pinBox.height - 3 } });
    await phoneDialog.getByRole("heading", { name: "Scala della cripta" }).waitFor();
    check(
      (await phoneDialog.innerText()).includes("Una scala di pietra") &&
        (await phoneDialog.innerText()).includes("Close"),
      "Touch pin dialog wrong",
    );
    await phone.screenshot({ path: dir + "21-phone-en-pin-touch.png" });
    await phoneDialog.locator("footer button").first().tap();
    const target = await phone
      .locator(`[data-handouts-pin="${pin.id}"] .handouts-pin-hit`)
      .boundingBox();
    check(
      target.width >= 40 && target.height >= 40,
      `Pin touch target too small: ${Math.round(target.width)}px`,
    );
    passed.push(
      `EN phone 390 (touch): player materials, viewer, Taverna stage and drawer, DM materials/editor/session without overflow; courtyard re-activated from core Scenes; revealed pin tapped (hit ${Math.round(target.width)}px)`,
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
