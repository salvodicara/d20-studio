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
  // B62: Preparation sections are grouped (Scenes, Encounters, Materials, Sessions and
  // adventures); a section outside the open group is reached through «Tutte» (2 clicks).
  const openPrepSection = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const here = page.locator(`[data-prep-section="${id}"]`);
    if (await here.count()) return press(here.first());
    await press(page.locator("[data-prep-sections-all]"));
    await press(page.locator(`#dialog [data-prep-section-jump="${id}"]`));
  };
  // B25 random tables and decks: acceptance checks 1–6 of the card plus the multi-sided
  // token (PR-62), with real clicks, keys and touch. IT desktop 1440 as DM and player, then
  // EN phone 390 with touch. Resets this browser's synthetic demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B25/";
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const context = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const drawer = page.locator("#table-drawer");
  const role = async (value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForTimeout(150);
  };
  const openDrawer = async () => {
    // The open drawer also has a close button with the same data attribute.
    await openTablePanel(page, "random-tables"); // B62: the Tables and decks tab
    await drawer.waitFor();
  };
  const tab = (name) => drawer.locator("[data-rt-tab]", { hasText: name }).click();
  const noOverflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  // Screenshots frame the element under test at the top of the 1440×900 viewport.
  const shot = async (name, target = null) => {
    if (target) await target.evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.screenshot({ path: shots + name, fullPage: false });
  };

  await page.goto(base);
  await page.evaluate((k) => localStorage.removeItem(k), key);
  await page.reload();
  // The shell is ready when the demo identity selector is (this area does not test Home).
  await page.locator("#demo-role").waitFor();
  await role("dm");

  // (1) Preparation › Tables and decks: d8 table, weights, implied ranges, subtable, Normalize.
  await page.goto(base + "#campaign");
  await page.locator('[data-campaign-tab="preparation"]').click();
  await openPrepSection(page, "random-tables"); // B62: Materials group
  await page.locator(".rt-prep").waitFor();
  const ranges = await page.locator(".rt-edit-row .rt-range").allInnerTexts();
  check(ranges.join(",") === "1–2,3,4–5,6,7,8", "Implied ranges: " + ranges.join(","));
  check(
    (await page.locator('[data-rt-row-field="subtableId"][data-index="2"]').inputValue()) ===
      "patrol-strength",
    "Patrol row does not link the subtable",
  );
  check(
    (await page.locator("[data-rt-status]").innerText()).includes("Pesi 8 = d8"),
    "Seed table not normalized",
  );
  await page.locator("[data-rt-row-add]").click();
  await page
    .locator('[data-rt-row-field="text"][data-index="6"]')
    .fill("Un airone di pietra sul guado");
  const weight = page.locator('[data-rt-row-field="weight"][data-index="6"]');
  await weight.fill("2");
  check(
    (await page.locator('[data-rt-range="6"]').innerText()) === "9–10",
    "Range not implied live from the weight",
  );
  await weight.press("Tab");
  await page.locator("[data-rt-status]", { hasText: "Pesi 10 su d8" }).waitFor();
  check(
    (await page.locator(".rt-edit-row.is-unreachable").count()) === 1,
    "Unreachable row not marked",
  );
  await shot("01-prep-table-unnormalized-it-1440.png", page.locator(".rt-editor-head"));
  // Leaving with unsaved edits asks first (draft guard); Cancel keeps the edits.
  await page.locator('[data-rt-open-table="tables"]').click();
  await page.locator("#dialog", { hasText: "Scartare le modifiche?" }).waitFor();
  await page.locator("#dialog footer [data-close]").click();
  check(
    (await page.locator("[data-rt-dirty]").innerText()) === "Modifiche non salvate",
    "Draft lost after cancelling the guard",
  );
  await page.locator("[data-rt-normalize]").click();
  await page.locator("[data-rt-status]", { hasText: "Pesi 10 = d10" }).waitFor();
  check(
    (await page.locator('[data-rt-field="sides"]').inputValue()) === "10",
    "Normalize did not set d10",
  );
  await page.locator("[data-rt-save]").click();
  await page.locator("[data-rt-dirty]", { hasText: "Versione salvata" }).waitFor();
  // The demo identity is not persisted: a reload starts as the player again.
  await page.reload();
  await role("dm");
  await page.locator(".rt-prep").waitFor();
  check(
    (await page.locator('[data-rt-select="table:swamp-encounters"]').innerText()).includes(
      "d10 · 7 voci",
    ),
    "Saved table not persisted after reload",
  );
  let data = await stored();
  check(data.ext["random-tables"].tables[0].sides === 10, "Stored die is not d10");
  check(
    data.log.at(-1).visibility === "private",
    "Private preparation label leaked to the shared log",
  );
  await shot("02-prep-table-normalized-it-1440.png", page.locator(".rt-prep-bar"));
  passed.push(
    "(1) d8 table with weights, implied ranges (live 9–10), subtable, guard, Normalize → d10, saved and reloaded",
  );

  // (4)+(2) Table drawer from Preparation ("Use at the Table"): Season filter, physical
  // faces with a reroll on an excluded face, subtable die rolled digitally, visible chain.
  const entriesBefore = (data.campaignContent?.entries ?? []).length;
  const inventoryBefore = data.actors.livia.inventory.length;
  await page.locator('[data-rt-open-table="tables"]').click();
  await drawer.waitFor();
  await drawer.locator('[data-rt-var="season"]').selectOption("winter");
  check(
    (await drawer.locator(".rt-range-list li.is-filtered").innerText()).includes(
      "Sciame di zanzare",
    ),
    "Summer row not excluded by Season = Winter",
  );
  await drawer.locator('[data-rt-start="physical"]').click();
  const face = drawer.locator("[data-rt-face]");
  await face.fill("8");
  await face.press("Enter");
  await drawer.locator(".rt-notice", { hasText: "Faccia 8: esclusa dalle variabili" }).waitFor();
  check(
    await page.evaluate(() => document.activeElement?.hasAttribute("data-rt-face")),
    "Focus not returned to the physical face",
  );
  await face.fill("4");
  await drawer.locator("[data-rt-physical]").click();
  await drawer.getByRole("heading", { name: "Ora: d4 · Consistenza della pattuglia" }).waitFor();
  await drawer.locator("[data-rt-digital]").click();
  const card = drawer.locator(".rt-result");
  await card.waitFor();
  const cardText = await card.innerText();
  check(
    /Pattuglia di goblin: (due esploratori goblin|tre goblin e un lupo|cinque goblin guidati da un capo)/.test(
      cardText,
    ),
    "Chain text: " + cardText,
  );
  check(
    cardText.includes("Faccia 8") &&
      cardText.includes("dado fisico") &&
      cardText.includes("dado digitale") &&
      cardText.includes("Stagione: Inverno"),
    "Chain lacks faces, modes or variable: " + cardText,
  );
  await shot("03-table-draw-result-it-1440.png", drawer);
  // (3) Nothing changed in the game yet.
  data = await stored();
  check(data.actors.livia.inventory.length === inventoryBefore, "Inventory changed by a draw");
  check(
    (data.campaignContent?.entries ?? []).length === entriesBefore,
    "Journal changed by a draw",
  );
  check(data.log.at(-1).visibility === "private", "Draw label shared before choosing chat");
  passed.push(
    "(2)+(4) Season filter, physical 8 rerolled, 4 → subtable d4 rolled digitally, chain with faces, modes and variable",
  );

  // (2) Without replacement: the drawn patrol rerolls; Reset; Undo restores with a correction.
  await drawer.locator('[data-rt-start="physical"]').click();
  await face.fill("5");
  await face.press("Enter");
  await drawer.locator(".rt-notice", { hasText: "Faccia 5: già estratta" }).waitFor();
  await face.fill("1");
  await face.press("Enter");
  await drawer.locator(".rt-result", { hasText: "Nebbia fitta" }).waitFor();
  check(
    (await drawer.locator(".rt-range-list li.is-drawn").count()) === 2,
    "Drawn results not marked",
  );
  await drawer.locator("[data-rt-reset]").click();
  await drawer.locator(".rt-range-list li.is-drawn").first().waitFor({ state: "detached" });
  await drawer.locator("[data-rt-undo]").click();
  await drawer.locator(".rt-range-list li.is-drawn").nth(1).waitFor();
  data = await stored();
  check(data.log.at(-1).kind === "correction", "Undo did not record a correction");
  passed.push(
    "(2) Without replacement: 5 on the drawn patrol rerolled, Reset clears, Undo restores with a correction",
  );

  // Player view: private DM draws and private tables stay hidden.
  await role("player");
  await page.goto(base + "#table");
  await openDrawer();
  const playerSources = await drawer.locator("[data-rt-source] option").allInnerTexts();
  check(
    playerSources.join("|") === "Voci alla Lanterna (d6)",
    "Player sources: " + playerSources.join("|"),
  );
  check(
    !(await drawer.locator('[data-rt-start="choose"]').count()),
    "Choose entry offered to the player",
  );
  await tab("Storico");
  await drawer.getByRole("heading", { name: "Nessuna estrazione" }).waitFor();
  passed.push("Player: only the shared table, no Choose entry, no DM draws in the history");

  // (3) Destinations as DM: chat (shared log), journal (campaign recap), loot (sheet).
  await role("dm");
  await page.goto(base + "#table");
  await openDrawer();
  await tab("Storico");
  const patrol = drawer.locator(".rt-entry", { hasText: "Pattuglia di goblin" });
  // With the B17 chat, "Send to chat…" asks for the recipients first (Tables+ VTL-092).
  await patrol.locator("[data-rt-chat]").click();
  await page.locator("#dialog", { hasText: "Invia in chat" }).waitFor();
  await page.locator("#dialog").getByRole("button", { name: "Invia", exact: true }).click();
  await patrol.getByText("Condivisa in chat").waitFor();
  data = await stored();
  check(
    data.log.at(-1).visibility === "shared" &&
      data.log.at(-1).label.includes("Pattuglia di goblin"),
    "Chat destination not shared: " + data.log.at(-1).label,
  );
  check(
    data.ext.chat.messages.at(-1).readers === null &&
      /d\d+: \d+ \((dado digitale|dado fisico)\)/.test(data.ext.chat.messages.at(-1).text),
    "No B17 chat card with die and face: " + data.ext.chat.messages.at(-1)?.text,
  );
  await patrol.locator("[data-rt-journal]").click();
  await page.locator('#dialog [name="access"]').selectOption("campaign");
  await page.locator("#dialog").getByRole("button", { name: "Aggiungi al diario" }).click();
  await patrol.getByText("Nel diario della campagna").waitFor();
  data = await stored();
  const recap = data.campaignContent.entries.at(-1);
  check(
    recap.kind === "recap" && recap.access.mode === "campaign",
    "Journal recap not created for the campaign",
  );
  await patrol.locator("[data-rt-note-input]").fill("Tenerli per la prossima sessione");
  await patrol.locator("[data-rt-note]").click();
  await drawer.locator(".rt-note", { hasText: "Tenerli per la prossima sessione" }).waitFor();
  await tab("Tabelle");
  await drawer.locator('[data-rt-var="season"]').selectOption("any");
  await drawer.locator('[data-rt-start="choose"]').click();
  await drawer.locator("[data-rt-choose-row]").selectOption("swamp-lantern");
  await drawer.locator("[data-rt-choose]").click();
  const chosen = drawer.locator(".rt-result", { hasText: "Una lanterna spenta" });
  await chosen.waitFor();
  check((await chosen.innerText()).includes("scelta"), "Chosen entry not marked as a choice");
  await chosen.locator("[data-rt-loot]").click();
  await page.locator('#dialog [name="destination"]').selectOption("actor:livia");
  await page.locator('#dialog [name="name"]').fill("Lanterna spenta");
  await page.locator("#dialog").getByRole("button", { name: "Aggiungi al bottino" }).click();
  await chosen.getByText("Bottino: Lanterna spenta ×1 a Livia").waitFor();
  data = await stored();
  check(
    data.actors.livia.inventory.at(-1).name === "Lanterna spenta",
    "Loot not in Livia inventory",
  );
  await shot("04-table-destinations-it-1440.png", drawer.locator(".rt-draw"));
  passed.push(
    '(3) Chat → shared log; journal → campaign recap; Choose entry → loot "Lanterna spenta" in Livia inventory; personal note',
  );

  // (6) Template generation (keyboard) and reload persistence of history and notes.
  await drawer.locator("[data-rt-source]").selectOption("template:marsh-hook");
  await drawer
    .locator(".rt-template-preview", {
      hasText: "Tabelle usate: Incontri nella palude, Voci alla Lanterna",
    })
    .waitFor();
  await drawer.locator('[data-rt-start="digital"]').focus();
  await page.keyboard.press("Enter");
  const generated = drawer.locator(".rt-result", { hasText: "Lungo il guado:" });
  await generated.waitFor();
  check((await generated.innerText()).includes("«"), "Template did not fill the second reference");
  await page.reload();
  await role("dm");
  await openDrawer();
  await tab("Storico");
  await drawer.locator(".rt-note", { hasText: "Tenerli per la prossima sessione" }).waitFor();
  check((await drawer.locator(".rt-entry").count()) === 4, "History lost entries after reload");
  check(
    (await drawer.locator('.rt-entry[data-status="reversed"]').count()) === 0,
    "Unexpected reversed entry",
  );
  await shot("05-table-history-it-1440.png", drawer);
  passed.push(
    '(6) Template "Spunto per la palude" generated with Enter; history with chain and personal note survives reload',
  );

  // Player sees what was shared: chat entry (without the DM note), journal recap, loot.
  await role("player");
  await page.goto(base + "#table");
  await openDrawer();
  await tab("Storico");
  const shared = drawer.locator(".rt-entry", { hasText: "Pattuglia di goblin" });
  await shared.getByText("Condivisa in chat").waitFor();
  check(
    !(await drawer.getByText("Tenerli per la prossima sessione").count()),
    "DM personal note visible to the player",
  );
  check(
    !(await shared.getByText("Nel diario della campagna").count()),
    "DM journal destination shown to the player",
  );
  check((await drawer.locator(".rt-entry").count()) === 1, "Player reads unshared DM draws");
  await page.goto(base + "#characters?id=livia&tab=inventory");
  await page.getByText("Lanterna spenta").first().waitFor();
  await page.goto(base + "#campaign?tab=journal");
  await page.getByText("Incontri nella palude").first().waitFor();
  passed.push(
    "Player: shared draw only, no DM note or private destination; loot in the sheet; recap in the Journal",
  );

  // (5) Deck "Destino": shuffle, deal two to Livia (private hand), reload, play, discard, recall.
  await role("dm");
  await page.goto(base + "#table");
  await openDrawer();
  await tab("Mazzi");
  await drawer.getByText("ordine di creazione, non mescolato").waitFor();
  await drawer.locator("[data-rt-deck-shuffle]").click();
  await drawer.getByText("ordine di creazione, non mescolato").waitFor({ state: "detached" });
  await drawer.locator("[data-rt-deck-deal]").click();
  await page.locator('#dialog [name="count"]').fill("2");
  await page.locator('#dialog [name="recipient"][value="livia"]').check();
  await page.locator("#dialog").getByRole("button", { name: "Distribuisci" }).click();
  await drawer.getByText("Livia · 2 carte").waitFor();
  await drawer.locator(".rt-hand", { hasText: "Livia" }).getByText("Mano privata").waitFor();
  check(!(await drawer.locator("[data-rt-card-play]").count()), "DM can play from Livia hand");
  await shot("06-deck-dm-private-hand-it-1440.png", drawer);
  await page.reload();
  await role("dm");
  await openDrawer();
  await tab("Mazzi");
  await drawer.getByText("Livia · 2 carte").waitFor();
  await role("player");
  await page.goto(base + "#characters?id=livia&tab=extras");
  const handBox = page.locator(".rt-sheet-hand");
  await handBox.waitFor();
  check(
    (await handBox.locator(".rt-card").count()) === 2,
    "Sheet hand does not show the two faces to the owner",
  );
  await handBox.locator("[data-rt-hand-table]").click();
  await drawer.waitFor();
  const hand = drawer.locator(".rt-hand", { hasText: "Livia" });
  check(
    (await hand.locator(".rt-card").count()) === 2,
    "Player does not see Livia faces at the Table",
  );
  const firstName = (await hand.locator(".rt-card strong").first().innerText()).trim();
  const secondName = (await hand.locator(".rt-card strong").nth(1).innerText()).trim();
  await shot("07-deck-player-hand-it-1440.png", drawer);
  await hand.locator("[data-rt-card-play]").first().click();
  await drawer.locator(".rt-zone", { hasText: "Sul tavolo" }).getByText(firstName).waitFor();
  await drawer.locator(".rt-hand", { hasText: "Livia" }).locator("[data-rt-card-discard]").click();
  await drawer.getByText("6 nel mazzo · 1 scarto").waitFor();
  check(
    !(await drawer.getByText(/\b1 carte\b|\b1 scarti\b/).count()),
    "Italian plural after one card",
  );
  await role("dm");
  await page.goto(base + "#table");
  await openDrawer();
  await tab("Mazzi");
  await drawer.locator(".rt-zone", { hasText: "Sul tavolo" }).getByText(firstName).waitFor();
  check(
    !(await drawer.getByText(secondName).count()),
    "Card discarded face down revealed to the DM",
  );
  await drawer.locator("[data-rt-deck-recall]").click();
  await page.locator("#dialog").getByRole("button", { name: "Richiama" }).click();
  await drawer.getByText("8 nel mazzo").waitFor();
  passed.push(
    `(5) Destino: shuffle, deal 2 to Livia (DM sees count only), reload, sheet box, play "${firstName}" face up, discard face down, recall`,
  );

  // PR-62 multi-sided token: placed from "Meteo sulla palude", physical side, player view.
  await tab("Tabelle");
  await drawer.locator("[data-rt-source]").selectOption("table:marsh-weather");
  await drawer.locator("[data-rt-place]").click();
  await page.locator("#map-message", { hasText: "Meteo sulla palude" }).waitFor();
  const map = page.locator("#battle-map");
  await map.scrollIntoViewIfNeeded();
  const box = await map.boundingBox();
  await map.click({ position: { x: box.width * 0.62, y: box.height * 0.22 } });
  const token = page.locator("[data-rt-token]");
  await token.waitFor();
  check((await token.textContent()).includes("Nebbia bassa"), "Token does not start on side 1");
  await token.click();
  await page.locator("#dialog [data-rt-token-face]").fill("3");
  await page.locator('#dialog [data-rt-token-roll="physical"]').click();
  await page.locator("[data-rt-token]", { hasText: "Vento freddo" }).waitFor();
  // The 3D dice area shows the accepted face on the top layer and takes the first Esc
  // while it is on screen: dismiss it before testing the token's own keys.
  for (let i = 0; i < 3 && (await page.locator(".dice3d-layer:not([hidden])").count()); i++) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
  }
  // Keyboard: the token is focusable; Enter opens its sides, Escape closes without change.
  await token.focus();
  await page.keyboard.press("Enter");
  await page.locator("#dialog-title", { hasText: "Pedina: Meteo sulla palude" }).waitFor();
  await page.keyboard.press("Escape");
  for (let i = 0; i < 10 && (await page.locator("#dialog").evaluate((d) => d.open)); i++)
    await page.waitForTimeout(100);
  check(
    !(await page.locator("#dialog").evaluate((d) => d.open)),
    "Escape did not close the token dialog",
  );
  // Review fix: dragged like any token (Roll20/Owlbear), arrow keys move it one cell.
  const tokenAt = async () => (await stored()).ext["random-tables"].tokens[0];
  const until = async (predicate, message) => {
    for (let i = 0; i < 30 && !(await predicate()); i++) await page.waitForTimeout(100);
    check(await predicate(), message);
  };
  const beforeDrag = await tokenAt();
  const tokenBox = await token.boundingBox();
  const cx = tokenBox.x + tokenBox.width / 2;
  const cy = tokenBox.y + tokenBox.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 70, cy + 40, { steps: 8 });
  await page.mouse.up();
  await until(
    async () => (await tokenAt()).x > beforeDrag.x + 20 && (await tokenAt()).y > beforeDrag.y + 10,
    "Dragging did not move the token",
  );
  check(!(await page.locator("#dialog").evaluate((d) => d.open)), "A drag opened the sides dialog");
  const afterDrag = await tokenAt();
  const grid = (await stored()).scenes.find((scene) => scene.id === "old-watch").gridSize ?? 50;
  await page.locator("[data-rt-token]").focus();
  await page.keyboard.press("ArrowRight");
  await until(
    async () => (await tokenAt()).x === afterDrag.x + grid,
    "ArrowRight did not move one cell",
  );
  check(
    await page.evaluate(() => document.activeElement?.hasAttribute("data-rt-token")),
    "Focus left the token after a keyboard move",
  );
  await shot("08-table-multisided-token-it-1440.png", page.locator(".table-topline"));
  await role("player");
  await page.goto(base + "#table");
  await page.locator(".rt-token", { hasText: "Vento freddo" }).waitFor();
  check(!(await page.locator("[data-rt-token]").count()), "Token interactive for the player");
  // Review fix: the DM hides it from players (Roll20 GM layer / Owlbear Hide).
  await role("dm");
  await page.goto(base + "#table");
  await openDrawer();
  await tab("Tabelle");
  await drawer.locator("[data-rt-token-toggle]").click();
  await page.locator(".rt-token.is-hidden").waitFor();
  check((await tokenAt()).hidden === true, "Hidden flag not stored");
  await role("player");
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  check(!(await page.locator(".rt-token").count()), "Hidden token visible to the player");
  passed.push(
    "(PR-62) Multi-sided token placed on the map, side 3 by physical die, dragged with the mouse, moved one cell with ArrowRight (focus kept), Enter/Escape, hidden from players by the DM",
  );

  // 40 px targets and no page overflow at 1440.
  await openDrawer();
  const small = await drawer.evaluate((el) =>
    [...el.querySelectorAll("button, select, input")]
      .filter((n) => n.offsetParent && n.type !== "checkbox")
      .filter((n) => n.getBoundingClientRect().height < 40)
      .map((n) => n.outerHTML.slice(0, 80)),
  );
  check(!small.length, "Targets under 40px: " + small.join(" | "));
  check(await noOverflow(), "Horizontal overflow at 1440");
  passed.push("Drawer controls are at least 40px; no overflow at 1440");

  // Review fixes (24/09) on the desktop page.
  // P1: a deck written in Preparation is hidden from players until the DM shows it.
  await role("dm");
  await page.goto(base + "#preparation?tab=random-tables");
  await page.locator(".rt-prep").waitFor();
  await page.locator('[data-rt-new="deck"]').click();
  await page.locator('.rt-editor [data-rt-field="name"]').fill("Tarocchi del traditore");
  await page
    .locator("[data-rt-bulk]")
    .fill("Il Tradimento — Il capitano Oben vi venderà ai goblin");
  await page.locator("[data-rt-bulk-add]").click();
  check(
    !(await page.locator('[data-rt-setting="showToPlayers"]').isChecked()),
    "A new deck is shown to players by default",
  );
  check(
    await page.locator('[data-rt-setting="playersMayDraw"]').isDisabled(),
    "Players may draw from a hidden deck",
  );
  await page.locator("[data-rt-save]").click();
  await page.locator("[data-rt-dirty]", { hasText: "Versione salvata" }).waitFor();
  data = await stored();
  check(data.log.at(-1).visibility === "private", "Hidden deck name leaked in the shared log");
  await role("player");
  await page.goto(base + "#table");
  await openDrawer();
  await tab("Mazzi");
  await drawer.locator(".rt-decks").waitFor();
  check(
    !(await drawer.getByText(/Tarocchi|Tradimento/).count()),
    "Hidden deck visible to the player",
  );
  check(
    !(await drawer.locator("[data-rt-deck]").count()),
    "Hidden deck offered in the deck select",
  );
  await page.locator('[data-service="search"]').first().click();
  await page.keyboard.type("Tarocchi");
  await page.waitForTimeout(300);
  check(
    !(await page.locator("#dialog").getByText("Tarocchi del traditore").count()),
    "Hidden deck found by the player's search",
  );
  await page.keyboard.press("Escape");
  passed.push(
    "Review P1: new deck hidden by default; the player neither sees, searches nor draws it",
  );

  // P2: offline, a player's shared draw is refused before any digital die is rolled.
  const entriesOffline = (await stored()).ext["random-tables-history"].entries.length;
  const offline = async (value) => {
    await page.getByRole("button", { name: "Preferenze" }).click();
    const box = page.locator('#dialog [name="offline"]');
    if (value) await box.check();
    else await box.uncheck();
    await page.getByRole("button", { name: "Salva preferenze" }).click();
    await page.waitForTimeout(150);
  };
  await offline(true);
  await openDrawer();
  await tab("Tabelle");
  await drawer.locator("#rt-offline-draw").waitFor();
  check(
    await drawer.locator('[data-rt-start="digital"]').isDisabled(),
    "Offline shared draw not disabled",
  );
  check(
    (await stored()).ext["random-tables-history"].entries.length === entriesOffline,
    "An offline draw left a trace",
  );
  await offline(false);
  passed.push("Review P2: offline, the shared table's draw buttons are disabled with the reason");

  // P2: multi-column table, output column and text filter (FG / Tables+ / Chartopia).
  await role("dm");
  await page.goto(base + "#table");
  await openDrawer();
  await tab("Tabelle");
  await drawer.locator("[data-rt-source]").selectOption("table:ford-travellers");
  await drawer.locator(".rt-col-table th", { hasText: "Cosa sa" }).waitFor();
  await drawer.locator("[data-rt-column]").selectOption("knows");
  const filterText = drawer.locator("[data-rt-filter-text]");
  await filterText.fill("goblin");
  await filterText.press("Enter");
  await drawer.locator("[data-rt-filter-column]").selectOption("knows");
  await drawer.locator("[data-rt-filter-clear]").waitFor();
  check(
    (await drawer.locator(".rt-col-table tr.is-filtered").count()) === 4,
    "Filter did not exclude the four rows without goblins",
  );
  await drawer.locator('[data-rt-start="digital"]').click();
  const columnCard = drawer.locator(".rt-result", { hasText: "Viandanti al guado" });
  await columnCard.waitFor();
  const columnText = await columnCard.locator(".rt-entry-text").innerText();
  check(
    ["i goblin pagano in monete antiche", "i goblin hanno una mappa dell’osservatorio"].includes(
      columnText.trim(),
    ),
    "Column output: " + columnText,
  );
  check(
    (await columnCard.innerText()).includes("Colonna: Cosa sa · Filtro «goblin» (Cosa sa)"),
    "Card lacks the column and filter",
  );
  await shot("12-table-columns-filter-it-1440.png", drawer.locator(".rt-draw"));
  passed.push(
    `Review P2: multi-column "Viandanti al guado", column "Cosa sa", filter "goblin" → ${columnText.trim()}`,
  );

  // P2: the result becomes an encounter (FG output target Encounter) in the B19 builder.
  await columnCard.locator("[data-rt-encounter]").click();
  await page.locator('#dialog [name="name"]').fill("Viandante al guado");
  await page.locator("#dialog").getByRole("button", { name: "Aggiungi all’incontro" }).click();
  await columnCard.getByText("Nuovo incontro: «Viandante al guado»").waitFor();
  data = await stored();
  const encounter = data.ext["encounter-builder"].encounters.find(
    (e) => e.name === "Viandante al guado",
  );
  check(encounter && encounter.notes.summary.includes(columnText.trim()), "Encounter note missing");
  check(encounter.rows.length === 0, "Creatures inferred from the text");
  // P2: loot goes to the scene's hidden parcel (B26) by default.
  await columnCard.locator("[data-rt-loot]").click();
  check(
    (await page.locator('#dialog [name="destination"]').inputValue()) === "parcel",
    "Loot does not default to the scene parcel",
  );
  await page.locator('#dialog [name="name"]').fill("Corda annodata");
  await page.locator("#dialog").getByRole("button", { name: "Aggiungi al bottino" }).click();
  await columnCard.getByText("nel pacchetto «Da tabelle casuali»").waitFor();
  data = await stored();
  const parcel = data.ext.loot.parcels.find((p) => p.name === "Da tabelle casuali");
  check(
    parcel && !parcel.revealed && parcel.items.some((i) => i.name.it === "Corda annodata"),
    "Loot not in the hidden scene parcel",
  );
  await columnCard.locator("[data-rt-open-loot]").click();
  await page.getByText("Corda annodata").first().waitFor();
  check(page.url().includes("tab=loot"), "Open loot did not reach Preparation › Loot");
  await page.goto(base + "#table");
  await openDrawer();
  await tab("Storico");
  await drawer
    .locator(".rt-entry", { hasText: "Viandante al guado" })
    .locator("[data-rt-open-encounter]")
    .click();
  await page.locator('[value="Viandante al guado"], :text("Viandante al guado")').first().waitFor();
  check(page.url().includes("tab=encounter-builder"), "Open did not reach the encounter builder");
  passed.push(
    "Review P2: result → new B19 encounter with the note (no creatures), loot → hidden B26 scene parcel, both opened from the history",
  );

  // P2: Undo says what it would reverse and refuses a draw already in the journal.
  await page.goto(base + "#table");
  await openDrawer();
  await tab("Tabelle");
  await drawer.locator("[data-rt-source]").selectOption("table:marsh-weather");
  await drawer.locator('[data-rt-start="digital"]').click();
  const weather = drawer.locator(".rt-result", { hasText: "Meteo sulla palude" });
  await weather.waitFor();
  check(
    (await drawer.locator("[data-rt-undo-target]").innerText()).startsWith(
      "Annullerebbe: Estrazione: Meteo sulla palude",
    ),
    "Undo target not written out",
  );
  await weather.locator("[data-rt-journal]").click();
  await page.locator('#dialog [name="access"]').selectOption("campaign");
  await page.locator("#dialog").getByRole("button", { name: "Aggiungi al diario" }).click();
  await weather.getByText("Nel diario della campagna").waitFor();
  await drawer.locator("[data-rt-undo]").click();
  await page.locator("#toast", { hasText: "già nel diario della campagna" }).waitFor();
  check(
    (await drawer.locator('.rt-result[data-status="accepted"]').count()) === 1,
    "The journaled draw was undone",
  );
  passed.push("Review P2: visible Undo target; a draw already in the journal is not undone");

  // P2: deck and template editors show unsaved changes as you type.
  await page.goto(base + "#preparation?tab=random-tables");
  await page.locator('[data-rt-select="deck:fate"]').click();
  await page.locator('.rt-editor [data-rt-field="name"]').fill("Destino bis");
  check(
    (await page.locator("[data-rt-dirty]").innerText()) === "Modifiche non salvate" &&
      !(await page.locator("[data-rt-discard]").isDisabled()),
    "Deck editor dirty state not live",
  );
  await page.locator("[data-rt-discard]").click();
  await page.locator("#dialog").getByRole("button", { name: "Scarta modifiche" }).click();
  await page.locator('[data-rt-select="template:marsh-hook"]').click();
  await page.locator('.rt-editor [data-rt-field="name"]').fill("Spunto bis");
  check(
    (await page.locator("[data-rt-dirty]").innerText()) === "Modifiche non salvate" &&
      !(await page.locator("[data-rt-discard]").isDisabled()),
    "Template editor dirty state not live",
  );
  await page.locator("[data-rt-discard]").click();
  await page.locator("#dialog").getByRole("button", { name: "Scarta modifiche" }).click();
  passed.push("Review P2: deck and template editors mark unsaved changes and enable Discard live");

  // P3: a search hit opens the matched item.
  await page.goto(base + "#campaign");
  await page.locator('[data-service="search"]').first().click();
  await page.keyboard.type("Meteo");
  // The journal recap of the same name is another hit: take the random table one.
  await page.locator("#dialog").getByText("Tabella casuale d4").click();
  await page.locator(".rt-dir-item.active", { hasText: "Meteo sulla palude" }).waitFor();
  passed.push("Review P3: search → Preparation with the matched table selected");

  // P3: "Cards received" opens the Table drawer on Decks.
  await page.goto(base + "#table");
  await openDrawer();
  await tab("Mazzi");
  await drawer.locator("[data-rt-deck-deal]").click();
  await page.locator('#dialog [name="recipient"][value="livia"]').check();
  await page.locator("#dialog").getByRole("button", { name: "Distribuisci" }).click();
  await drawer.getByText("Livia · 1 carta").waitFor();
  await role("player");
  await page.goto(base + "#campaign");
  await page
    .getByRole("button", { name: /Notifiche/ })
    .first()
    .click();
  await page.getByText("Livia: 1 carta (Destino)").first().click();
  await drawer.locator(".rt-decks .rt-hand", { hasText: "Livia · 1 carta" }).waitFor();
  passed.push(
    "Review P3: the Cards received notification opens the Table with the Decks tab and Livia's hand",
  );

  // ---- Review round 2 ----
  // r2 P1: Livia holds one private card; the Preparation deck editor names no card's place
  // and refuses a removal with the same words wherever the card is.
  await role("dm");
  await page.goto(base + "#preparation?tab=random-tables");
  await page.locator(".rt-prep").waitFor();
  await page.locator('[data-rt-select="deck:fate"]').click();
  await page.locator("[data-rt-deck-zones]", { hasText: "in mano a Livia 1" }).waitFor();
  check(
    (await page.locator(".rt-edit-card .badge").count()) === 0,
    "Deck editor marks single cards while Livia holds a private card",
  );
  await page.locator('[data-rt-card-remove="3"]').click();
  await page.locator("[data-rt-save]").click();
  await page.locator(".rt-editor .error", { hasText: "mani private o coperte" }).waitFor();
  await shot("14-prep-deck-private-hand-it-1440.png", page.locator(".rt-editor-head"));
  await page.locator("[data-rt-discard]").click();
  await page.locator("#dialog").getByRole("button", { name: "Scarta modifiche" }).click();
  passed.push(
    "Review r2 P1: deck editor shows zone counts only while a hand is private; removal refused without naming the card",
  );

  // r2 P2: after typing, ONE real mouse click saves (no re-render on blur); Tab moves on.
  const clickOnce = async (locator) => {
    await locator.scrollIntoViewIfNeeded();
    const b = await locator.boundingBox();
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  };
  await page.locator('[data-rt-select="table:marsh-weather"]').click();
  const w2 = page.locator('[data-rt-row-field="weight"][data-index="1"]');
  await w2.fill("2");
  await clickOnce(page.locator("[data-rt-save]"));
  await page.locator("[data-rt-dirty]", { hasText: "Versione salvata" }).waitFor({ timeout: 2000 });
  data = await stored();
  check(
    data.ext["random-tables"].tables.find((t) => t.id === "marsh-weather").results[1].weight === 2,
    "Weight not saved by the first click",
  );
  await w2.fill("1");
  await w2.press("Tab");
  check(
    await page.evaluate(() => document.activeElement?.dataset?.rtRowField === "subtableId"),
    "Tab after a weight did not move to the next field",
  );
  await clickOnce(page.locator("[data-rt-save]"));
  await page.locator("[data-rt-dirty]", { hasText: "Versione salvata" }).waitFor({ timeout: 2000 });
  await page.locator('[data-rt-select="template:marsh-hook"]').click();
  await page.locator('.rt-editor textarea[data-rt-field="text"]').click();
  await page.keyboard.press("End");
  await page.keyboard.type(" [Meteo sulla palude].");
  await page.locator("[data-rt-refs] li", { hasText: "Meteo sulla palude (d4)" }).waitFor();
  await clickOnce(page.locator("[data-rt-save]"));
  await page.locator("[data-rt-dirty]", { hasText: "Versione salvata" }).waitFor({ timeout: 2000 });
  await page.goto(base + "#table");
  await openDrawer();
  await tab("Tabelle");
  await drawer.locator("[data-rt-source]").selectOption("table:ford-travellers");
  // The earlier block left its filter on this table: clear it, then type a new one.
  if (await drawer.locator("[data-rt-filter-clear]").isVisible())
    await drawer.locator("[data-rt-filter-clear]").click();
  await drawer.locator("[data-rt-filter-text]").click();
  await page.keyboard.type("goblin");
  await drawer.locator(".rt-col-table tr.is-filtered").first().waitFor();
  check(
    await page.evaluate(() => document.activeElement?.hasAttribute("data-rt-filter-text")),
    "Typing the filter moved the focus",
  );
  await clickOnce(drawer.locator('[data-rt-start="digital"]'));
  await drawer.locator(".rt-result", { hasText: "Viandanti al guado" }).waitFor({ timeout: 2000 });
  await drawer.locator("[data-rt-filter-clear]").click();
  passed.push(
    "Review r2 P2/P3: one mouse click saves after a weight or template edit and draws after typing a filter; Tab moves on",
  );

  // r2 P2: keyboard placement (Enter = centre) and sides back and forth on a table without
  // replacement; the table is never consumed. r2 P3: dice icon, right-click opens the sides.
  const drawnSwamp = async () =>
    (await stored()).ext["random-tables"].tables
      .find((t) => t.id === "swamp-encounters")
      .results.filter((r) => r.drawn)
      .map((r) => r.id)
      .join(",");
  const drawnBefore = await drawnSwamp();
  await drawer.locator("[data-rt-source]").selectOption("table:swamp-encounters");
  await drawer.locator("[data-rt-place]").click();
  await page.locator("#map-message", { hasText: "Invio al centro" }).waitFor();
  check(
    (await page.locator('[data-tool="random-tables-place"]').innerHTML()) !==
      (await page.locator('[data-tool="pointer"]').innerHTML()),
    "The token tool still shares the pointer's icon",
  );
  const tokensBefore = (await stored()).ext["random-tables"].tokens.length;
  await page.locator("#battle-map").focus();
  await page.keyboard.press("Enter");
  const swampToken = page.locator("[data-rt-token]", { hasText: "Incontri nella" });
  await swampToken.waitFor();
  data = await stored();
  const placedToken = data.ext["random-tables"].tokens.at(-1);
  check(
    data.ext["random-tables"].tokens.length === tokensBefore + 1 &&
      placedToken.x === 500 &&
      placedToken.y === 325,
    "Enter did not place the token at the centre",
  );
  check(
    await page.evaluate(() => document.activeElement?.hasAttribute("data-rt-token")),
    "The new token did not take the focus",
  );
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(150);
  data = await stored();
  check(
    data.ext["random-tables"].tokens.find((t) => t.id === placedToken.id).x === 550,
    "Arrow did not move the new token",
  );
  const side = async (text) => {
    await swampToken.focus();
    await page.keyboard.press("Enter");
    await page.locator("#dialog [data-rt-token-side]").waitFor();
    const value = await page
      .locator("#dialog [data-rt-token-side] option", { hasText: text })
      .getAttribute("value");
    await page.locator("#dialog [data-rt-token-side]").selectOption(value);
    await page.locator('#dialog [data-rt-token-roll="chosen"]').click();
    await page
      .locator("#dialog[open]")
      .waitFor({ state: "detached", timeout: 2000 })
      .catch(() => {});
    check(!(await page.locator("#dialog[open]").count()), `Side "${text}" refused`);
    await page.locator("[data-rt-token]", { hasText: text.slice(0, 12) }).waitFor();
  };
  await side("Nebbia fitta");
  await side("Un airone immobile");
  await side("Nebbia fitta");
  check((await drawnSwamp()) === drawnBefore, "Token sides consumed the table");
  await swampToken.click({ button: "right" });
  await page.locator("#dialog", { hasText: "Lato casuale" }).waitFor();
  await shot("15-table-token-sides-it-1440.png");
  await page.keyboard.press("Escape");
  passed.push(
    "Review r2 P2/P3: Enter places the token at the centre with focus and arrows; sides back and forth without consuming the table; dice icon; right-click opens the sides",
  );

  // r2 P2/P3: a hidden deck never names itself in shared labels; its card played face up
  // reaches the players' table without the deck's name.
  await page.goto(base + "#preparation?tab=random-tables");
  await page.locator('[data-rt-new="deck"]').click();
  await page.locator('.rt-editor [data-rt-field="name"]').fill("Presagi del DM");
  await page
    .locator("[data-rt-bulk]")
    .fill("La Cometa — un segno nel cielo\nIl Lupo — qualcuno vi segue");
  await page.locator("[data-rt-bulk-add]").click();
  await page.locator("[data-rt-save]").click();
  await page.locator("[data-rt-dirty]", { hasText: "Versione salvata" }).waitFor();
  await page.goto(base + "#table");
  await openDrawer();
  await tab("Mazzi");
  const presagi = await drawer
    .locator("[data-rt-deck] option", { hasText: "Presagi" })
    .getAttribute("value");
  await drawer.locator("[data-rt-deck]").selectOption(presagi);
  await drawer.locator("[data-rt-deck-deal]").click();
  await page.locator('#dialog [name="recipient"][value="doran"]').check();
  await page.locator("#dialog").getByRole("button", { name: "Distribuisci" }).click();
  await drawer.locator('[data-rt-card-play][data-actor="doran"]').first().click();
  await drawer.locator(".rt-zone", { hasText: "Sul tavolo" }).getByText("La Cometa").waitFor();
  data = await stored();
  const leaks = data.log
    .filter((e) => e.visibility !== "private" && e.label.includes("Presagi"))
    .map((e) => e.label);
  check(!leaks.length, "Shared labels name the hidden deck: " + leaks.join(" | "));
  await role("player");
  await openDrawer();
  await tab("Mazzi");
  await drawer
    .locator(".rt-zone", { hasText: "Altre carte sul tavolo" })
    .getByText("La Cometa")
    .waitFor();
  check(!(await drawer.innerText()).includes("Presagi"), "Player drawer names the hidden deck");
  await shot("16-player-other-table-cards-it-1440.png", drawer);
  passed.push(
    "Review r2 P2/P3: hidden deck actions keep its name out of shared labels; its face-up card reaches the player's table without the deck name",
  );

  // r2 P3: the history badge speaks to its viewer; a DM result whispered to Livia (B17).
  await tab("Tabelle");
  await drawer.locator('[data-rt-start="digital"]').click();
  await drawer.locator(".rt-result").waitFor();
  const playerEntry = await drawer.locator(".rt-result").getAttribute("data-entry");
  await role("dm");
  await openDrawer();
  await tab("Storico");
  await drawer.locator(`[data-entry="${playerEntry}"]`, { hasText: "Giocatore e DM" }).waitFor();
  await tab("Tabelle");
  await drawer.locator("[data-rt-source]").selectOption("table:marsh-weather");
  await drawer.locator('[data-rt-start="digital"]').click();
  const whisperCard = drawer.locator(".rt-result");
  await whisperCard.waitFor();
  const whisperText = await whisperCard.locator(".rt-entry-text").innerText();
  await whisperCard.locator("[data-rt-chat]").click();
  await page.locator('#dialog [name="to"]').selectOption("actor:livia");
  await page.locator("#dialog").getByRole("button", { name: "Invia", exact: true }).click();
  await whisperCard.getByText("Sussurrata a Livia").first().waitFor();
  data = await stored();
  check(
    JSON.stringify([...data.ext.chat.messages.at(-1).readers].sort()) === '["dm","player"]',
    "Whisper readers wrong",
  );
  await role("player");
  await page.getByRole("button", { name: "Registro" }).first().click();
  await page.locator("#content").getByText(whisperText.slice(0, 14)).first().waitFor();
  await shot("17-player-whisper-registro-it-1440.png");
  await openDrawer();
  await tab("Storico");
  await drawer.locator(".rt-entry", { hasText: "Sussurrata a Livia" }).waitFor();
  passed.push(
    "Review r2 P3: DM history reads «Giocatore e DM»; a result whispered to Livia is a B17 message with die and face, readable by her player in the Registro and the history",
  );

  // EN phone 390 with touch: player draws on the shared table, sends to chat, draws a card.
  const phoneContext = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const phone = await phoneContext.newPage();
  phone.on("pageerror", (error) => errors.push("phone: " + error.message));
  await phone.goto(base);
  await phone.getByRole("button", { name: "Preferenze" }).tap();
  await phone.locator('#dialog [name="lang"]').selectOption("en");
  await phone.getByRole("button", { name: "Salva preferenze" }).tap();
  await phone.goto(base + "#table");
  const phoneDrawer = phone.locator("#table-drawer");
  await openTablePanel(phone, "random-tables", true);
  await phoneDrawer.waitFor();
  await phoneDrawer.getByRole("button", { name: "Draw with digital dice" }).tap();
  const phoneCard = phoneDrawer.locator(".rt-result");
  await phoneCard.waitFor();
  check((await phoneCard.innerText()).includes("Rumours at the Lantern"), "EN result card missing");
  await phoneCard.getByRole("button", { name: "Send to chat" }).tap();
  await phone.locator("#dialog").getByRole("button", { name: "Send", exact: true }).tap();
  await phoneCard.getByText("Shared in chat").waitFor();
  check(
    await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    "Phone overflow on the tables tab",
  );
  await phone.screenshot({ path: shots + "09-phone-en-table-result-390.png" });
  await phoneDrawer.locator('[data-rt-tab="decks"]').tap();
  await phoneDrawer.getByRole("button", { name: "Draw a card" }).tap();
  await phoneDrawer.getByText("Livia · 1 card").waitFor();
  await phoneDrawer.getByRole("button", { name: "Play face up" }).tap();
  await phoneDrawer.locator(".rt-zone", { hasText: "On the table" }).locator(".rt-card").waitFor();
  check(
    await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    "Phone overflow on the decks tab",
  );
  await phone.screenshot({ path: shots + "10-phone-en-deck-390.png" });
  // Review fixes at 390 as DM: the multi-column table scrolls inside its own box, the
  // filter and output controls stay at least 40px, the page does not overflow.
  await phone.locator("#demo-role").selectOption("dm");
  await phone.goto(base + "#table");
  await openTablePanel(phone, "random-tables", true);
  await phoneDrawer.locator('[data-rt-tab="tables"]').tap();
  await phoneDrawer.locator("[data-rt-source]").selectOption("table:ford-travellers");
  const phoneFilter = phoneDrawer.locator("[data-rt-filter-text]");
  await phoneFilter.tap();
  await phoneFilter.fill("goblin");
  await phoneFilter.press("Enter");
  await phoneDrawer.locator("[data-rt-filter-clear]").waitFor();
  await phoneDrawer.getByRole("button", { name: "Draw with digital dice" }).tap();
  const phoneColumns = phoneDrawer.locator(".rt-result", { hasText: "Travellers at the ford" });
  await phoneColumns.waitFor();
  check(
    (await phoneColumns.innerText()).includes("Filter “goblin”"),
    "EN filter missing on the card",
  );
  check(
    await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    "Phone overflow with the multi-column table",
  );
  const phoneSmall = await phoneDrawer.evaluate((el) =>
    [...el.querySelectorAll("button, select, input")]
      .filter((n) => n.offsetParent && n.type !== "checkbox")
      .filter((n) => n.getBoundingClientRect().height < 40)
      .map((n) => n.outerHTML.slice(0, 80)),
  );
  check(!phoneSmall.length, "Phone targets under 40px: " + phoneSmall.join(" | "));
  await phoneColumns.scrollIntoViewIfNeeded();
  await phone.screenshot({ path: shots + "13-phone-en-columns-dm-390.png" });
  await phone.goto(base + "#preparation?tab=random-tables");
  await phone.locator(".rt-prep").waitFor();
  check(
    await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    "Phone overflow in the table editor",
  );
  await phone.screenshot({ path: shots + "11-phone-en-prep-editor-390.png", fullPage: true });
  passed.push(
    "EN phone 390 touch: shared table draw sent to chat, card drawn and played; DM multi-column draw with filter (40px, no overflow); editor without overflow",
  );
  await phoneContext.close();

  check(!errors.length, "Page errors: " + errors.join(" | "));
  await context.close();
  return passed.join("\n");
};
