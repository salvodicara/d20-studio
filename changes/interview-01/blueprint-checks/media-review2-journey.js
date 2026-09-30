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
  // B28 media, review round 2: each finding's reproduction run again in the real browser
  // (mouse, keyboard, file inputs, a dropped file, a phone viewport, English). Synthetic
  // data only; resets this browser context's demo state. Fixtures: make-fixtures.mjs in the
  // evidence folder (regno.pdf included).
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B28/review2/";
  const fixture = (name) =>
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B28/fixtures/" + name;
  const passed = [];
  const errors = [];
  // B15's pop-up for the letter revealed in P2 opens for the player on some page: each one
  // is recorded (title, role, screenshot) for the coordinator, then closed.
  const popups = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  // Rendered visibility, not the hidden attribute (a display rule can override it).
  const shown = (locator) =>
    locator.evaluateAll((els) => els.filter((el) => el.checkVisibility()).length);

  const context = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const button = (name) => page.getByRole("button", { name, exact: true });
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const shot = (name) => page.screenshot({ path: shots + name + ".png" });
  const closePopup = async (where) => {
    await page.waitForTimeout(300);
    const open = page.locator("#dialog[open]");
    if (!(await open.count())) return;
    popups.push(`${where}: ${await open.locator("#dialog-title").innerText()}`);
    await page.screenshot({ path: shots + `r9-popup-${popups.length}.png` });
    await open.locator("footer [data-close]").first().click();
  };
  const role = async (value) => {
    await page.getByRole("combobox", { name: "Visita come" }).selectOption(value);
    await closePopup("role " + value);
  };
  const focused = () =>
    page.evaluate(() => {
      const el = document.activeElement;
      return el && el !== document.body ? { tag: el.tagName, data: { ...el.dataset } } : null;
    });

  await page.goto(base);
  await page.evaluate((k) => localStorage.removeItem(k), key);
  await page.reload();
  await page.getByRole("combobox", { name: "Visita come" }).waitFor();

  // P1: the dock's type tabs and search, the picker's search and folder filter.
  await role("dm");
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  await openTablePanel(page, "media-dock"); // B62: Journal › Images and files
  const dock = page.locator("[data-media-dock]");
  await dock.waitFor();
  const items = dock.locator("[data-media-dock-item]");
  const total = await items.count();
  await dock.locator('[data-media-dock-use="map"]').click();
  check((await shown(items)) === 1, "Dock 'Mappe' still shows every file");
  await dock.locator("[data-media-dock-search]").fill("goblin");
  check((await shown(items)) === 0, "Dock search inside Mappe still shows files");
  check(await dock.locator("[data-media-dock-empty]").isVisible(), "Dock empty message hidden");
  await dock.locator('[data-media-dock-use=""]').click();
  check((await shown(items)) === 2, "Dock search 'goblin' across all types");
  check(!(await dock.locator("[data-media-dock-empty]").isVisible()), "Empty message with results");
  await shot("r1-dock-filter");
  await page.goto(base + "#characters?id=doran&tab=media");
  await page.locator("[data-media-look]").waitFor();
  await page.locator("[data-media-look-pick]").click();
  const cards = page.locator("#dialog .media-pick");
  const cardTotal = await cards.count();
  await page.locator("#dialog [data-media-picker-search]").fill("zzzz");
  check((await shown(cards)) === 0, "Picker search 'zzzz' still shows cards");
  check(await page.locator("#dialog [data-media-picker-empty]").isVisible(), "Picker empty hidden");
  await shot("r2-picker-search");
  await page.locator("#dialog [data-media-picker-search]").fill("");
  await page.locator("#dialog [data-media-picker-folder]").selectOption("f-map");
  const maps = await cards.evaluateAll((els) => els.filter((e) => e.dataset.folder === "f-map"));
  check(
    (await shown(cards)) === maps.length && maps.length > 0 && maps.length < cardTotal,
    "Picker folder filter",
  );
  await page.locator("#dialog footer").getByRole("button", { name: "Annulla" }).click();
  passed.push(
    `P1: dock 'Mappe' shows 1 of ${total}, 'goblin' in Mappe shows none with the empty message, in all types 2; picker 'zzzz' shows none, folder Mappe ${maps.length} of ${cardTotal}`,
  );

  // P2: a B15 reveal of the library letter is a use of the file; deleting reports it.
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  await page.locator('#battle-map .map-token[data-actor="goblin-1"]').click();
  // B61: B15's "Rivela aspetto…" is in the sidebar's Creature tab (the dock tab was open).
  const creatureTab = page.locator('.table-tabs [data-table-tab="creature"]');
  if ((await creatureTab.getAttribute("aria-selected")) !== "true") await creatureTab.click();
  await page.locator("[data-hs-reveal-token]").first().click();
  await page.locator('#dialog input[name="artId"][value="media:m-letter"]').check();
  await page.locator('#dialog [name="caption"]').fill("La lettera");
  await page.locator("#dialog footer").getByRole("button", { name: "Mostra ai giocatori" }).click();
  await page.goto(base + "#media?id=m-letter");
  const used = page.locator(".media-used");
  await used.getByText("Materiali · Rivelazione «La lettera»").waitFor();
  await used
    .locator("li", { hasText: "Materiali · Rivelazione «La lettera»" })
    .getByRole("button", { name: "Apri" })
    .click();
  await page.waitForFunction(() => /#campaign\?.*tab=handouts/.test(location.hash));
  await page.goto(base + "#media?id=m-letter");
  await button("Elimina").click();
  const other = page.locator("#dialog [data-media-delete-other]");
  await other.getByText("Materiali · Rivelazione «La lettera»").waitFor();
  check(
    (await page.locator("#dialog").innerText()).includes("Lì l’immagine non comparirà più"),
    "Delete dialog does not say what happens to the material",
  );
  await shot("r3-delete-other-sections");
  await page.locator("#dialog footer").getByRole("button", { name: "Elimina" }).click();
  await page
    .locator(".media-notice", { hasText: "usi in altre sezioni restano senza immagine" })
    .or(page.locator(".media-notice", { hasText: "uso in un’altra sezione resta senza immagine" }))
    .waitFor();
  const report = page.locator(".media-report", { hasText: "Riferimenti mancanti" });
  const reportRow = report.locator("li", { hasText: "Materiali · Rivelazione «La lettera»" });
  await reportRow.waitFor();
  await reportRow.getByRole("button", { name: "Risolvi" }).click();
  check(
    !(await page.locator("#dialog [data-media-missing-clear]").count()),
    "Another area's reference offers 'Togli il riferimento'",
  );
  await shot("r4-missing-external");
  await button("Apri dove è usato").click();
  await page.waitForFunction(() => /#preparation\?.*tab=handouts/.test(location.hash));
  await role("player");
  await page.goto(base + "#library?tab=media");
  await page.locator("[data-media-library]").waitFor();
  check(
    !(await page.locator(".media-report", { hasText: "La lettera" }).count()),
    "The player is asked to fix the DM's material",
  );
  passed.push(
    "P2 uses: the reveal appears in Used in and opens the material; the delete dialog lists it under other sections; the DM's missing report opens B15's editor (no remove); the player gets no fix",
  );

  // P2 lock: Shift+click locks; the lock is named where files arrive and can be unlocked;
  // a file dropped on a token under a Prop lock asks the wheel.
  await page.locator("[data-media-upload]").setInputFiles(fixture("mira-bear.png"));
  await page.locator('#dialog [data-media-wheel="prop"]').click({ modifiers: ["Shift"] });
  const notice = page.locator(".media-notice", { hasText: "tipo bloccato: Oggetto di scena" });
  await notice.waitFor();
  check(await notice.getByRole("button", { name: "Sblocca il tipo" }).isVisible(), "No unlock");
  const chip = page.locator("[data-media-lock]");
  check((await chip.innerText()).includes("Tipo bloccato: Oggetto di scena"), "No lock chip");
  check(
    (await page.locator("[data-media-drop]").innerText()).includes(
      "Le immagini nuove diventano «Oggetto di scena» (tipo bloccato)",
    ),
    "Drop zone still promises the wheel",
  );
  await shot("r5-lock-chip");
  await page.locator("[data-media-upload]").setInputFiles(fixture("livia-bosco.png"));
  await page
    .locator(".media-notice", { hasText: "«livia-bosco.png» aggiunto a Oggetti di scena" })
    .waitFor();
  check(!(await page.locator("#dialog [data-media-wheel]").count()), "Wheel opened under lock");
  await role("dm");
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  await openTablePanel(page, "media-dock");
  await page.locator("[data-media-dock] [data-media-lock]").waitFor();
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 96;
    const g = canvas.getContext("2d");
    g.fillStyle = "#335566";
    g.fillRect(0, 0, 96, 96);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], "goblin-notte.png", { type: "image/png" }));
    const target = document.querySelector(
      '.map-token[data-actor="goblin-2"] .token-display > circle',
    );
    const r = target.getBoundingClientRect();
    const init = {
      bubbles: true,
      cancelable: true,
      dataTransfer: transfer,
      clientX: r.x + r.width / 2,
      clientY: r.y + r.height / 2,
    };
    target.dispatchEvent(new DragEvent("dragover", init));
    target.dispatchEvent(new DragEvent("drop", init));
  });
  await page.locator('#dialog [data-media-wheel="token"]').click();
  await page.waitForFunction(() =>
    getComputedStyle(
      document.querySelector('.map-token[data-actor="goblin-2"] .token-display > circle'),
    ).fill.includes("media-art-goblin-2"),
  );
  let data = (await stored()).ext.media;
  const goblinImage = data.looks["goblin-2"].token.variants.at(-1).assetId;
  check(
    data.assets.find((a) => a.id === goblinImage)?.fileName === "goblin-notte.png",
    "Dropped file not on the goblin",
  );
  await page.locator("[data-media-dock] [data-media-unlock]").click();
  await page.locator("[data-media-dock] [data-media-lock]").waitFor({ state: "detached" });
  await page.locator("[data-media-dock-upload]").setInputFiles(fixture("livia-bosco-2.png"));
  await page.locator("#dialog [data-media-wheel]").first().waitFor();
  await page.keyboard.press("Escape");
  passed.push(
    "P2 lock: Shift+click on 'Oggetto di scena' is named in the notice (with 'Sblocca il tipo'), in a chip and in the drop-zone text; the next file skips the wheel; a file dropped on a goblin under that lock asks the wheel and becomes its token; Unlock in the dock brings the wheel back",
  );

  // P3: DM-secret changes keep their log label private.
  await page.goto(base + "#media?id=m-courtyard");
  const attach = page.locator('[data-media-use-form="attach"]');
  await attach.locator("[name=visibility]").selectOption("dm");
  await attach.getByRole("button", { name: "Allega" }).click();
  await page.locator(".media-notice", { hasText: "Allegato aggiunto · Solo DM" }).waitFor();
  check((await stored()).log.at(-1).visibility === "private", "DM-only attach logged as shared");
  await role("player");
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  await openTablePanel(page, "log"); // B62: Chat › Registro
  // The log panel (chat area) floats: read its text rather than its box.
  await page.waitForFunction(() => document.querySelector(".table-log")?.innerText.length > 0);
  const log = await page.locator(".table-log").innerText();
  check(log.includes("sulla pedina di"), "The player's log lacks the shared token change");
  check(!log.includes("File allegato alla voce"), "The player reads the DM-only attachment");
  await shot("r6-player-log");
  passed.push(
    "P3 log: a 'Solo DM' attachment is a private log line; the player's Registro omits it",
  );

  // P3: focus stays on the control a re-render replaced.
  await role("dm");
  await page.goto(base + "#characters?id=goblin-1&tab=media");
  await page.locator('[data-media-token="v-goblin-1-b"]').click();
  check(
    (await focused())?.data.mediaToken === "v-goblin-1-b",
    "Focus lost after choosing a token image",
  );
  await page.locator('[data-media-token="v-goblin-1-a"]').focus();
  await page.keyboard.press("Enter");
  check((await focused())?.data.mediaToken === "v-goblin-1-a", "Keyboard choice loses focus");
  // From the token menu's dialog (B12 menu, right-click): focus returns to the token.
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  await page.locator('#battle-map .map-token[data-actor="goblin-1"]').click({ button: "right" });
  await menuPick(page, /Immagini della pedina/); // B62: «Aspetto» submenu
  await page.locator('#dialog [data-media-token="v-goblin-1-b"]').click();
  check((await focused())?.data.actor === "goblin-1", "Focus not back on the token");
  // The DM-only map attached above (the letter was deleted in P2): Solo io, then back.
  await page.goto(base + "#campaign?tab=media");
  const select = page.locator("[data-media-attachment-visibility]").first();
  const attachmentId = await select.getAttribute("data-media-attachment-visibility");
  await select.selectOption("self");
  check(
    (await focused())?.data.mediaAttachmentVisibility === attachmentId,
    "Focus lost after 'Chi vede'",
  );
  await page.locator(`[data-media-attachment-visibility="${attachmentId}"]`).selectOption("dm");
  await page.goto(base + "#library?tab=media");
  await page.locator('[data-media-layout="list"]').click();
  check((await focused())?.data.mediaLayout === "list", "Focus lost after 'Elenco'");
  await page.locator('[data-media-scope="shared"]').click();
  check((await focused())?.data.mediaScope === "shared", "Focus lost after a folder");
  passed.push(
    "P3 focus: token-image choice (mouse and Enter), 'Chi vede' select, Grid/List and folder buttons keep keyboard focus; from the token menu's dialog focus returns to the token",
  );

  // P3: deleting a shared PDF keeps the player's personal notes on it.
  await page.locator('[data-media-scope="mine"][data-media-folder=""]').click();
  await page.locator("[data-media-upload]").setInputFiles(fixture("regno.pdf"));
  await page.locator(".media-notice", { hasText: "«regno.pdf» aggiunto a Documenti" }).waitFor();
  const pdfId = (await stored()).ext.media.assets.find((a) => a.fileName === "regno.pdf").id;
  await page.goto(base + "#media?id=" + pdfId);
  const prov = page.locator("[data-media-provenance]");
  await prov.locator("[name=media-source]").selectOption("own");
  await prov.locator("[name=media-author]").fill("DM della campagna");
  await prov.locator("[name=media-license]").fill("Uso al tavolo");
  await button("Condividi con la campagna").click();
  await page.locator(".media-notice", { hasText: "Condiviso con la campagna" }).waitFor();
  await role("player");
  await page.goto(base + "#media?id=" + pdfId);
  await closePopup("player file page");
  const note = page.locator("[data-media-note]");
  await note.locator("[name=page]").fill("1");
  await note.locator("[name=text]").fill("Il passo a nord.");
  await note.getByRole("button", { name: "Aggiungi nota" }).click();
  await page.locator(".media-notes", { hasText: "Il passo a nord." }).waitFor();
  await role("dm");
  await page.goto(base + "#media?id=" + pdfId);
  await closePopup("dm file page");
  await button("Elimina").click();
  check(
    (await page.locator("#dialog").innerText()).includes("Le note personali sul PDF restano"),
    "Delete dialog silent about personal notes",
  );
  await page.locator("#dialog footer").getByRole("button", { name: "Elimina" }).click();
  await page.locator("[data-media-library]").waitFor();
  check(!(await page.getByText("Il passo a nord.").count()), "The DM reads the player's note");
  await role("player");
  await page.goto(base + "#library?tab=media");
  await closePopup("player library");
  const orphans = page.locator(".media-report", { hasText: "Le mie note su PDF eliminati" });
  await orphans.getByText("Il passo a nord.").waitFor();
  check(
    (await orphans.innerText()).includes("«regno» · pagina 1 · PDF eliminato"),
    "Orphan note without its file",
  );
  await shot("r7-notes-on-deleted-pdf");
  await orphans.getByRole("button", { name: "Elimina la nota" }).click();
  await orphans.waitFor({ state: "detached" });
  passed.push(
    "P3 notes: the DM deletes a shared PDF; the player's personal note stays hers, listed as a note on a deleted PDF, and she can delete it; the DM never reads it",
  );
  await context.close();

  // Phone 390, English: names (Props), the lock chip, no overflow, 40 px targets.
  const phone = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const mobile = await phone.newPage();
  mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
  await mobile.goto(base + "#library?tab=media");
  await mobile.locator("[data-media-library]").waitFor();
  // This device's lock (a device setting), then English from Preferences.
  await mobile.evaluate(() =>
    localStorage.setItem("d20-studio-setting:media.import-lock", JSON.stringify("prop")),
  );
  await mobile.reload();
  await mobile.locator("[data-media-lock]").waitFor();
  await mobile.getByRole("button", { name: "Preferenze", exact: true }).tap();
  await mobile.locator("#dialog [name=lang]").selectOption("en");
  await mobile.getByRole("button", { name: "Salva preferenze", exact: true }).tap();
  await mobile.getByRole("button", { name: "Upload files" }).waitFor();
  const lock = mobile.locator("[data-media-lock]");
  await lock.waitFor();
  const lockText = await lock.innerText();
  check(lockText.includes("Type locked: Prop"), "EN lock chip: " + lockText);
  check(
    (await mobile.locator(".media-folders").innerText()).includes("Props"),
    "EN folder is not 'Props'",
  );
  const unlockBox = await lock.getByRole("button", { name: "Unlock" }).boundingBox();
  check(unlockBox.height >= 40 && unlockBox.width >= 40, "Unlock under 40 px");
  check(
    await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    "Phone library overflows",
  );
  await mobile.screenshot({ path: shots + "r8-phone-lock-en.png" });
  await lock.getByRole("button", { name: "Unlock" }).tap();
  await lock.waitFor({ state: "detached" });
  passed.push(
    "Phone 390 EN: 'Type locked: Prop' chip with a 40 px Unlock, folder 'Props', no overflow",
  );
  await phone.close();

  check(errors.length === 0, errors.join("; "));
  return { passed, errors, popups };
};
