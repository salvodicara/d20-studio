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
  // B62: area sheet tabs are sub-sections of D&D Beyond's sheet categories; the category
  // opens first, then the sub-section.
  const SHEET_CATEGORY = {
    projects: "extras",
    "party-bastion": "extras",
    "projects-track": "features",
    "home-levelup": "features",
    media: "story",
    "character-library-log": "notes",
    "character-library-revisions": "notes",
  };
  const openSheetTab = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const handle = () => page.locator(`[data-character-tab="${id}"]`).first();
    if (!(await handle().count()) && SHEET_CATEGORY[id])
      await press(page.locator(`.character-tabs [data-character-tab="${SHEET_CATEGORY[id]}"]`));
    await handle().waitFor();
    await press(handle());
  };
  // B28 media: images and files. Acceptance checks of the card with real clicks, keys, drag,
  // file inputs and touch: (1) upload to Ritratti with tags, invalid files refused with a
  // reason; (2) sheet Appearance portrait + circular crop -> Table token; (3) used in lists
  // sheet and token, replacing updates both; (4) deleting a used image lists its uses, the
  // token reports the missing file with an action (keyboard), Undo restores; (5) DM-only
  // attachment on a journal entry; (6) provenance and licence required to share; (7) the
  // owner selects a second token image. Plus reload persistence, DM vs player, offline,
  // scene map from the dock, dock drag and drop, personal PDF notes, EN phone at 390 px.
  // Synthetic data only; resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B28/";
  // Synthetic upload fixtures, created by make-fixtures.mjs in the same evidence folder.
  const fixture = (name) => shots + "fixtures/" + name;
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  // Rendered visibility, not the hidden attribute (a display rule can override it).
  const shown = (locator) =>
    locator.evaluateAll((els) => els.filter((el) => el.checkVisibility()).length);

  // ------------------------------------------------------------------ desktop, Italian
  const context = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const button = (name) => page.getByRole("button", { name, exact: true });
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const media = async () => (await stored()).ext.media;
  const shot = (name) => page.screenshot({ path: shots + name + ".png" });
  const role = (value) => page.getByRole("combobox", { name: "Visita come" }).selectOption(value);
  const noOverflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  const tokenFill = (actor) =>
    page
      .locator(`.map-token[data-actor="${actor}"] .token-display > circle`)
      .first()
      .evaluate((el) => getComputedStyle(el).fill);
  const patternHref = (actor) => page.locator(`#media-art-${actor} image`).getAttribute("href");

  await page.goto(base);
  await page.evaluate((k) => localStorage.removeItem(k), key);
  await page.reload();
  await page.getByRole("combobox", { name: "Visita come" }).waitFor();

  // (1) Library › Images and files in two clicks; invalid files refused with a reason.
  await page.locator('.app-header [data-nav="library"]').click();
  await page.locator('[data-library-scope="media"]').click();
  await page.locator("[data-media-library]").waitFor();
  const upload = page.locator("[data-media-upload]");
  await upload.setInputFiles(fixture("appunti.txt"));
  await page
    .locator(".media-notice.is-error", {
      hasText: "«appunti.txt» non è un’immagine PNG, JPEG o WebP né un PDF",
    })
    .waitFor();
  await upload.setInputFiles(fixture("finto.png"));
  await page
    .locator(".media-notice.is-error", {
      hasText: "dichiara il formato PNG ma il contenuto non corrisponde",
    })
    .waitFor();
  await upload.setInputFiles(fixture("enorme.png"));
  await page
    .locator(".media-notice.is-error", { hasText: "il limite è 500 KB per file" })
    .waitFor();
  passed.push(
    "Library reached in 2 clicks; text, disguised and oversized files refused with readable reasons",
  );

  // Upload: import wheel (Owlbear VTL-062) -> Portrait -> folder Ritratti.
  await upload.setInputFiles(fixture("livia-bosco.png"));
  const wheel = page.locator('#dialog [data-media-wheel="portrait"]');
  await wheel.waitFor();
  check(
    (await page.locator("#dialog [data-media-wheel]").allInnerTexts()).join("|") ===
      "Mappa|Pedina|Ritratto|Oggetto di scena",
    "Import wheel options",
  );
  await shot("01-import-wheel");
  await wheel.click();
  await page
    .locator(".media-notice", { hasText: "«livia-bosco.png» aggiunto a Ritratti" })
    .waitFor();
  await page.locator('.media-folder[data-media-folder="f-portrait"]').click();
  await page.locator(".media-card", { hasText: "livia-bosco" }).waitFor();
  check(
    (await page.locator(".media-folder.active").innerText()).includes("Ritratti"),
    "Ritratti folder not selected",
  );
  await page.locator(".media-card", { hasText: "livia-bosco" }).click();
  await page.locator("[data-media-details] [name=name]").fill("Livia nel bosco");
  await page.locator("[data-media-details] [name=tags]").fill("livia, bosco");
  await button("Salva dettagli").click();
  await page.locator(".media-notice", { hasText: "Dettagli salvati." }).waitFor();
  let data = await media();
  const uploaded = data.assets.find((asset) => asset.name === "Livia nel bosco");
  check(uploaded && uploaded.folderId === "f-portrait", "Uploaded portrait not in Ritratti");
  check(uploaded.tags.join(",") === "livia,bosco", "Tags not saved: " + uploaded.tags);
  check(
    (await stored()).log.at(-1).visibility === "private",
    "Personal upload not a private change",
  );
  await page.getByRole("button", { name: /Biblioteca · Immagini e file/ }).click();
  await page.locator("[data-media-search]").fill("bosco");
  check(
    (await shown(page.locator("[data-media-item]"))) === 1,
    "Tag search did not isolate the file",
  );
  await shot("02-library-ritratti");
  await page.locator("[data-media-search]").fill("");
  await page.locator("[data-media-new-folder]").click();
  await page.locator("#dialog [name=media-folder-name]").fill("Capitolo 2");
  await button("Crea cartella").click();
  await page
    .locator('.media-folder.active[aria-current="true"]', { hasText: "Capitolo 2" })
    .waitFor();
  await page.locator("[data-media-empty]").waitFor();
  await button("Elimina cartella vuota").click();
  check(
    !(await page.locator(".media-folder", { hasText: "Capitolo 2" }).count()),
    "Empty folder not deleted",
  );
  passed.push(
    "Upload via wheel -> Ritratti, renamed and tagged; tag search finds it; private local change; a new folder is created and, empty, deleted",
  );

  // (2) Sheet › Appearance: portrait from the picker, circular crop, Table token updated.
  await page.locator('.app-header [data-nav="characters"]').click();
  await page.locator('[data-actor="livia"]', { hasText: "Apri scheda" }).click();
  await openSheetTab(page, "media"); // B62: Story › Appearance
  await button("Scegli dalla libreria").click();
  await page.locator("#dialog [data-media-picker-search]").fill("bosco");
  check((await shown(page.locator("#dialog .media-pick"))) === 1, "Picker search did not filter");
  await page.locator("#dialog .media-pick", { hasText: "Livia nel bosco" }).click();
  await button("Usa come ritratto").click();
  await page.locator('.media-portrait-frame img[alt="Ritratto di Livia"]').waitFor();
  check(
    (
      await page
        .locator(".character-heading .character-portrait")
        .evaluate((el) => getComputedStyle(el).backgroundImage)
    ).includes("blob:"),
    "Sheet header portrait not painted",
  );
  await button("Ritaglia per la pedina").click();
  const stage = page.locator("#dialog [data-media-crop-stage]");
  await stage.focus();
  for (let i = 0; i < 3; i += 1) await page.keyboard.press("+");
  await page.keyboard.press("ArrowDown");
  const box = await stage.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 10, { steps: 4 });
  await page.mouse.up();
  const zoom = Number(await page.locator('#dialog [data-media-crop="zoom"]').inputValue());
  check(Math.abs(zoom - 1.3) < 0.001, "Keyboard zoom not applied: " + zoom);
  await shot("03-crop-dialog");
  await button("Applica il ritaglio").click();
  data = await media();
  check(Math.abs(data.looks.livia.token.crop.zoom - 1.3) < 0.001, "Crop not saved");
  check(data.looks.livia.token.crop.x < 0.5, "Drag did not move the crop");
  await page.locator('.media-swatch:has([name="media-theme"])', { hasText: "Smeraldo" }).click();
  check(
    (
      await page
        .locator("#content")
        .evaluate((el) => getComputedStyle(el).getPropertyValue("--accent"))
    ).trim() === "#8fc48a",
    "Sheet colour theme not applied",
  );
  // The token border is the token menu's (B12): the sheet shows it and links to it.
  await page.locator(".media-ring", { hasText: "Bordo della pedina: standard" }).waitFor();
  await shot("04-sheet-appearance");
  await button("Vai al Tavolo").click();
  await page.locator("#battle-map").waitFor();
  check(
    (await tokenFill("livia")).includes("media-art-livia"),
    "Table token not filled with the portrait",
  );
  check(
    (await page
      .locator('.map-token[data-actor="livia"] .token-display > text')
      .first()
      .evaluate((el) => getComputedStyle(el).display)) === "none",
    "Token letter still visible",
  );
  const firstHref = await patternHref("livia");
  check(firstHref?.startsWith("blob:"), "Pattern image missing");
  await shot("05-table-token-portrait");
  passed.push(
    "Appearance: portrait from the picker, keyboard + drag circular crop, sheet colour saved, token border read from the token menu; sheet header and Table token updated",
  );

  // (3) Used in: sheet and token; replacing updates both.
  await page.goto(base + "#library?tab=media");
  await page.locator(".media-card", { hasText: "Livia nel bosco" }).click();
  const used = await page.locator(".media-used-list").innerText();
  check(used.includes("Ritratto nella scheda di Livia"), "Used in misses the sheet: " + used);
  check(
    used.includes("Pedina di Livia (dal ritratto) · Il cortile dell’osservatorio"),
    "Used in misses the token: " + used,
  );
  await shot("06-used-in");
  await page.locator("[data-media-replace]").setInputFiles(fixture("livia-bosco-2.png"));
  await page
    .locator(".media-notice", {
      hasText: "File sostituito: 2 usi mostrano ora «livia-bosco-2.png»",
    })
    .waitFor();
  data = await media();
  check(
    data.assets.find((a) => a.name === "Livia nel bosco").revision === 2,
    "Revision not incremented",
  );
  await page.locator(".media-used-list button").first().click();
  await page.locator('.media-portrait-frame img[alt="Ritratto di Livia"]').waitFor();
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  check((await patternHref("livia")) !== firstHref, "Token still shows the replaced file");
  passed.push("Used in lists sheet + token; replacing the file updates both (revision 2)");

  // Reload keeps portrait, crop and replaced file.
  await page.reload();
  await page.locator("#battle-map").waitFor();
  check((await tokenFill("livia")).includes("media-art-livia"), "Reload lost the token image");
  passed.push("Reload keeps the portrait, crop and replacement");

  // (7) The owner adds and selects a second token image; the DM sees it on the Table.
  await page.goto(base + "#characters?id=livia&tab=media");
  await button("Aggiungi un’immagine alternativa").click();
  await page.locator("#dialog .media-pick", { hasText: "Livia incappucciata" }).click();
  await page.locator("#dialog [name=media-variant-label]").fill("Cappuccio");
  await button("Aggiungi alla pedina").click();
  const hood = page.locator(".media-look .media-choice-button", { hasText: "Cappuccio" });
  await hood.click();
  check(
    (await hood.getAttribute("aria-pressed")) === "true",
    "Second image not selected by the owner",
  );
  await page.goto(base + "#table");
  await page.locator("[data-media-panel]").waitFor();
  const panelHood = page.locator("[data-media-panel] .media-choice-button", {
    hasText: "Cappuccio",
  });
  check(
    (await panelHood.getAttribute("aria-pressed")) === "true",
    "Table panel does not show the active image",
  );
  const hoodHref = await patternHref("livia");
  await page.locator("[data-media-panel] .media-choice-button", { hasText: "Ritratto" }).click();
  check(
    (await patternHref("livia")) !== hoodHref,
    "Switching back from the Table did not change the token",
  );
  await page.locator("[data-media-panel] .media-choice-button", { hasText: "Cappuccio" }).click();
  await role("dm");
  await page.locator("#battle-map").waitFor();
  check(
    (await tokenFill("livia")).includes("media-art-livia"),
    "DM does not see Livia's token image",
  );
  check((await patternHref("livia")) === hoodHref, "DM sees another image than the owner chose");
  await shot("07-table-dm-second-image");
  await role("player");
  passed.push(
    "Owner adds 'Cappuccio', selects it on the sheet and switches from the Table panel; the DM sees the same image",
  );

  // (4) Delete a used image: uses listed; missing badge on the token; Undo restores.
  await page.locator("[data-media-panel] .media-choice-button", { hasText: "Ritratto" }).click();
  await page.goto(base + "#library?tab=media");
  await page.locator(".media-card", { hasText: "Livia nel bosco" }).click();
  await button("Elimina").click();
  const uses = await page.locator("#dialog [data-media-delete-uses]").innerText();
  check(
    uses.includes("Ritratto nella scheda di Livia") && uses.includes("Pedina di Livia"),
    "Delete dialog does not list uses: " + uses,
  );
  await shot("08-delete-uses");
  await page.locator("#dialog footer").getByRole("button", { name: "Elimina" }).click();
  await page
    .locator(".media-notice", {
      hasText: "«Livia nel bosco» eliminato. 2 usi segnalano ora il file mancante.",
    })
    .waitFor();
  await page.locator(".media-report", { hasText: "Riferimenti mancanti (1)" }).waitFor();
  await page.goto(base + "#table");
  const badge = page.locator('[data-media-missing="livia"]');
  await badge.waitFor();
  check((await tokenFill("livia")).startsWith("rgb"), "Missing token still uses a pattern");
  await shot("09-table-missing-badge");
  await page.getByRole("button", { name: "Annulla ultima modifica" }).click();
  await page.locator("#battle-map").waitFor();
  check(!(await badge.count()), "Undo did not remove the missing badge");
  check(
    (await tokenFill("livia")).includes("media-art-livia"),
    "Undo did not restore the token image",
  );
  check((await stored()).log.at(-1).kind === "correction", "Undo not recorded as a correction");
  // Delete again, then fix from the badge with the keyboard (Owlbear missing-asset notice).
  await page.goto(base + "#library?tab=media");
  await page.locator(".media-card", { hasText: "Livia nel bosco" }).click();
  await button("Elimina").click();
  await page.locator("#dialog footer").getByRole("button", { name: "Elimina" }).click();
  await page.goto(base + "#table");
  await badge.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("heading", { name: "File mancante" }).waitFor();
  await button("Scegli un’altra immagine").click();
  await page.locator("#dialog .media-pick", { hasText: "Livia — ritratto" }).click();
  await button("Usa questo file").click();
  await page.locator("#battle-map").waitFor();
  check(!(await badge.count()), "Fix did not clear the missing badge");
  check((await tokenFill("livia")).includes("media-art-livia"), "Fixed token has no image");
  passed.push(
    "Delete lists uses; token shows a missing badge; Undo restores; the badge (Enter) opens the fix and a new image resolves it",
  );

  // Personal PDF notes, then offline: local notes work, shared changes are refused.
  await page.goto(base + "#library?tab=media");
  await page.locator(".media-card", { hasText: "Appunti di Livia" }).click();
  await page.locator("[data-media-note] [name=page]").fill("2");
  await page.locator("[data-media-note] [name=text]").fill("Scudo sempre pronto");
  await button("Aggiungi nota").click();
  await page.locator(".media-notes", { hasText: "Scudo sempre pronto" }).waitFor();
  await page.getByRole("button", { name: "Preferenze", exact: true }).click();
  await page.locator("#dialog [name=offline]").check();
  await button("Salva preferenze").click();
  await page.locator("[data-media-note] [name=text]").fill("Nota senza rete");
  await button("Aggiungi nota").click();
  await page.locator(".media-notes", { hasText: "Nota senza rete" }).waitFor();
  await page.goto(base + "#media?id=m-mira");
  await button("Usa come ritratto").click();
  await page.locator(".media-notice.is-error", { hasText: "Sei senza rete" }).waitFor();
  await page.getByRole("button", { name: "Preferenze", exact: true }).click();
  await page.locator("#dialog [name=offline]").uncheck();
  await button("Salva preferenze").click();
  passed.push(
    "Personal PDF notes saved (also offline); a shared change offline is refused with the reason",
  );

  // (5) DM-only attachment on the recap; (6) provenance required to share.
  await role("dm");
  await page.goto(base + "#campaign");
  await button("Leggi il resoconto").click();
  const panel = page.locator("[data-media-entry-panel]");
  await panel.waitFor();
  check((await panel.innerText()).includes("Lettera sigillata"), "Seed attachment missing");
  await panel.getByRole("button", { name: "Allega un file" }).click();
  await page.locator("#dialog .media-pick", { hasText: "Cortile al tramonto" }).click();
  check(
    await page.locator('#dialog [name=media-visibility][value="dm"]').isChecked(),
    "DM default visibility is not DM only",
  );
  await page.locator("#dialog footer .primary").click();
  await panel.locator(".media-attachment", { hasText: "Cortile al tramonto" }).waitFor();
  check(
    (
      await panel.locator(".media-attachment", { hasText: "Cortile al tramonto" }).innerText()
    ).includes("Solo DM"),
    "Attachment not DM only",
  );
  await shot("10-entry-attachment-dm");
  const entryUrl = page.url();
  await role("player");
  await page.goto(entryUrl);
  await page.locator("[data-media-entry-panel]").waitFor();
  const playerPanel = await page.locator("[data-media-entry-panel]").innerText();
  check(
    playerPanel.includes("Lettera sigillata") && !playerPanel.includes("Cortile al tramonto"),
    "Player sees the DM-only attachment: " + playerPanel,
  );
  check(
    !(await page.locator("#content").innerText()).includes("Cortile al tramonto"),
    "DM-only file name leaked to the player",
  );
  // The demo identity is not persisted: after reload the visit starts as the player again.
  await page.reload();
  await page.locator("[data-media-entry-panel]").waitFor();
  check(
    !(await page.locator("#content").innerText()).includes("Cortile al tramonto"),
    "Reload showed the DM-only file to the player",
  );
  await role("dm");
  await page
    .locator("[data-media-entry-panel] .media-attachment", { hasText: "Cortile al tramonto" })
    .waitFor();
  passed.push(
    "DM attaches a DM-only map to the recap; the player's entry page never shows it; reload keeps it",
  );

  await page.goto(base + "#library?tab=media");
  await page.locator(".media-card", { hasText: "Cortile al tramonto" }).click();
  await button("Condividi con la campagna").click();
  await page
    .locator(".media-notice.is-error", {
      hasText: "Per condividere indica la provenienza, l’autore o il credito e la licenza.",
    })
    .waitFor();
  await shot("11-share-needs-provenance");
  const provenance = page.locator("[data-media-provenance]");
  await provenance.locator("[name=media-source]").selectOption("own");
  await provenance.locator("[name=media-author]").fill("DM della campagna");
  await provenance.locator("[name=media-license]").fill("Uso al tavolo");
  await button("Condividi con la campagna").click();
  await page.locator(".badge.is-shared", { hasText: "Condiviso nella campagna" }).waitFor();
  await role("player");
  await page.goto(base + "#library?tab=media");
  await page.locator('[data-media-scope="shared"]').click();
  await page.locator(".media-card", { hasText: "Cortile al tramonto" }).waitFor();
  passed.push(
    "Sharing refused without provenance; with source, credit and licence it appears in the player's shared list",
  );

  // DM at the Table: dock -> scene map (existing scene editor shows it); drag onto a token.
  await role("dm");
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  await openTablePanel(page, "media-dock"); // B62: Journal › Images and files
  const dock = page.locator("[data-media-dock]");
  await dock.waitFor();
  await dock.locator('[data-media-dock-use="map"]').click();
  check((await shown(dock.locator("[data-media-dock-item]"))) === 1, "Map filter");
  await dock.locator("[data-media-dock-map]").click();
  await page.locator("#dialog footer .primary").click();
  await page.locator('#battle-map image[href^="data:image/jpeg"]').waitFor();
  await shot("12-dock-scene-map");
  await dock.locator('[data-media-dock-use=""]').click();
  await dock
    .locator("[data-media-dock-item]", { hasText: "Sentinella goblin — ferita" })
    .locator("[data-media-drag]")
    .dragTo(page.locator('.map-token[data-actor="goblin-2"] .token-display > circle').first());
  await page.waitForFunction(() =>
    getComputedStyle(
      document.querySelector('.map-token[data-actor="goblin-2"] .token-display > circle'),
    ).fill.includes("media-art-goblin-2"),
  );
  data = await media();
  check(
    data.looks["goblin-2"].token.variants.at(-1).assetId === "m-goblin-wounded",
    "Drag onto the token not recorded",
  );
  // A file dropped from the computer onto a token: the import wheel, then the token image.
  const sentryBefore = await patternHref("goblin-1");
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 120;
    canvas.height = 120;
    const g = canvas.getContext("2d");
    g.fillStyle = "#553366";
    g.fillRect(0, 0, 120, 120);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], "sentinella-notte.png", { type: "image/png" }));
    const target = document.querySelector(
      '.map-token[data-actor="goblin-1"] .token-display > circle',
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
  await page.waitForFunction(
    (before) =>
      document.querySelector("#media-art-goblin-1 image")?.getAttribute("href") !== before,
    sentryBefore,
  );
  data = await media();
  const sentryImage = data.looks["goblin-1"].token.variants.at(-1).assetId;
  check(
    data.assets.find((asset) => asset.id === sentryImage)?.fileName === "sentinella-notte.png",
    "Dropped file not used as the sentry's token image",
  );
  await page.goto(base + "#preparation?id=old-watch");
  await page.getByText("cortile.jpg · 800 × 520 px").waitFor();
  passed.push(
    "DM dock: map filter, 'Use as map' changes the scene (scene editor shows cortile.jpg 800×520); drag onto a goblin token sets its image; a computer file dropped on the sentry opens the wheel and becomes its token image",
  );

  // The DM cannot open the player's personal PDF.
  await page.goto(base + "#media?id=m-livia-notes");
  await page.getByRole("heading", { name: "File non disponibile" }).waitFor();
  check(
    !(await page.locator("#content").innerText()).includes("Scudo sempre pronto"),
    "Player note leaked to the DM",
  );
  passed.push("The player's personal PDF and notes are unavailable to the DM");
  check(await noOverflow(), "Desktop overflow");
  await context.close();

  // ------------------------------------------------------------------ phone, English
  const phone = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const mobile = await phone.newPage();
  mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
  const tapButton = (name) => mobile.getByRole("button", { name, exact: true }).tap();
  const small = async (selector) =>
    mobile.evaluate(
      (sel) =>
        [...document.querySelectorAll(sel)]
          .filter((el) => el.offsetParent)
          .map((el) => el.getBoundingClientRect())
          .filter((r) => r.height < 40 || r.width < 40).length,
      selector,
    );
  const overflow = () =>
    mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  await mobile.goto(base + "#library?tab=media");
  await mobile.locator("[data-media-library]").waitFor();
  await tapButton("Preferenze");
  await mobile.locator("#dialog [name=lang]").selectOption("en");
  await tapButton("Salva preferenze");
  await mobile.getByRole("button", { name: "Upload files" }).waitFor();
  check(!(await overflow()), "Phone library overflows");
  check(
    (await small(".media-folder, .media-card, .media-file-button, [data-media-layout]")) === 0,
    "Library targets under 40 px",
  );
  await mobile.locator("[data-media-upload]").setInputFiles(fixture("mira-bear.png"));
  await mobile.locator('#dialog [data-media-wheel="token"]').tap();
  await mobile.locator(".media-notice", { hasText: "“mira-bear.png” added to Tokens" }).waitFor();
  await mobile.locator(".media-card", { hasText: "mira-bear" }).tap();
  await mobile.getByRole("heading", { name: "Used in" }).waitFor();
  check(!(await overflow()), "Phone file page overflows");
  await mobile.goto(base + "#characters?id=mira&tab=media");
  await mobile.getByRole("heading", { name: "Token at the Table" }).waitFor();
  await mobile.locator("[data-media-look-upload]").setInputFiles(fixture("mira-bear.png"));
  await mobile
    .locator(".media-notice", { hasText: "Portrait uploaded to the Portraits folder and applied." })
    .waitFor();
  await mobile.locator('.media-portrait-frame img[alt="Mira’s portrait"]').waitFor();
  await tapButton("Add an alternative image");
  // The library copy imported as a Token, not the file already used as the portrait (a file
  // already on the token is chosen, not added twice).
  await mobile
    .locator("#dialog .media-pick", { hasText: "mira-bear" })
    .filter({ hasText: "Token ·" })
    .tap();
  await mobile.locator("#dialog [name=media-variant-label]").fill("Bear");
  await tapButton("Add to the token");
  const bear = mobile.locator(".media-look .media-choice-button", { hasText: "Bear" });
  await bear.tap();
  check(
    (await bear.getAttribute("aria-pressed")) === "true",
    "Phone: owner cannot select the image",
  );
  await tapButton("Crop for the token");
  await mobile.locator('#dialog [data-media-crop="zoom"]').fill("2");
  await tapButton("Apply crop");
  check(!(await overflow()), "Phone appearance overflows");
  check(
    (await small(".media-look .media-choice-button, .media-look .button, .media-swatch")) === 0,
    "Appearance targets under 40 px",
  );
  await mobile.screenshot({ path: shots + "13-phone-appearance-en.png", fullPage: false });
  await tapButton("Go to Table");
  await mobile.locator("#battle-map").waitFor();
  // The map toolbar overlays Mira's corner on a phone: select her token by keyboard focus.
  if (!(await mobile.locator('[data-media-panel="mira"]').count())) {
    await mobile.locator('.map-token[data-actor="mira"]').first().focus();
    await mobile.keyboard.press("Enter");
  }
  await mobile.locator('[data-media-panel="mira"]').waitFor();
  check(
    (await mobile
      .locator("[data-media-panel] .media-choice-button", { hasText: "Bear" })
      .getAttribute("aria-pressed")) === "true",
    "Phone table panel",
  );
  check(!(await overflow()), "Phone table overflows");
  await mobile.screenshot({ path: shots + "14-phone-table-en.png" });
  passed.push(
    "EN phone 390: library, wheel 'Token', file page, Appearance direct portrait upload, add/select/crop by touch, Table panel; no overflow, targets ≥40 px",
  );
  await phone.close();

  check(errors.length === 0, errors.join("; "));
  return { passed, errors };
};
