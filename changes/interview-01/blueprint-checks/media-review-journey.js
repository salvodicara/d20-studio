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
  // B28 media, review fixes (F1–F14 of the increment review): each finding's reproduction
  // run again in the real browser with mouse, keyboard, file inputs and a phone viewport.
  // Synthetic data only; resets this browser's demo state. Fixtures: make-fixtures.mjs in
  // the evidence folder (rumore1..4.png are 380 KB of incompressible noise).
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B28/review/";
  const fixture = (name) =>
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B28/fixtures/" + name;
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
  const button = (name) => page.getByRole("button", { name, exact: true });
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const media = async () => (await stored()).ext.media;
  const shot = (name) => page.screenshot({ path: shots + name + ".png" });
  const role = (value) => page.getByRole("combobox", { name: "Visita come" }).selectOption(value);
  const offline = async (value) => {
    await page.getByRole("button", { name: "Preferenze", exact: true }).click();
    const box = page.locator("#dialog [name=offline]");
    if (value) await box.check();
    else await box.uncheck();
    await button("Salva preferenze").click();
  };
  const confirmDelete = async () => {
    await button("Elimina").click();
    await page.locator("#dialog footer").getByRole("button", { name: "Elimina" }).click();
  };

  await page.goto(base);
  await page.evaluate((k) => localStorage.removeItem(k), key);
  await page.reload();
  // The shell, not the home page: another area's home widget may be in progress.
  await page.getByRole("combobox", { name: "Visita come" }).waitFor();

  // F1: a private "Solo io" note; attaching a personal file there never shares it.
  await page.goto(base + "#notes");
  await button("Nuovo appunto").click();
  await page.getByLabel("Contesto dell’appunto").selectOption({ label: "Le lanterne di Bruma" });
  await page.getByLabel("Titolo (facoltativo)").fill("Segreto di Livia");
  await page.getByLabel("Testo", { exact: true }).fill("Solo per me.");
  await page.getByLabel("Chi può leggere").selectOption({ label: "Solo io" });
  await button("Salva bozza e aggiorna anteprima").click();
  await button("Salva contenuto per questi destinatari").click();
  await page.waitForFunction(
    (k) =>
      JSON.parse(localStorage.getItem(k)).campaignContent?.entries?.some?.(
        (e) => e.revisions?.at(-1)?.data?.title === "Segreto di Livia",
      ) ?? false,
    key,
  );
  await page.goto(base + "#media?id=m-livia-portrait");
  const attachForm = page.locator('[data-media-use-form="attach"]');
  await attachForm
    .locator("[name=entry]")
    .selectOption({ label: "Segreto di Livia · la leggi solo tu" });
  check(
    (await attachForm.locator("[name=visibility]").inputValue()) === "self",
    "Private note does not default to Solo io",
  );
  await attachForm.locator("[name=visibility]").selectOption("readers");
  check(
    await attachForm.locator("[data-media-attach-provenance]").isHidden(),
    "Provenance asked for a note nobody else reads",
  );
  await attachForm.getByRole("button", { name: "Allega" }).click();
  await page.locator(".media-notice", { hasText: "Allegato aggiunto" }).waitFor();
  let data = await media();
  check(
    !data.assets.find((a) => a.id === "m-livia-portrait").shared,
    "Private attach shared the file",
  );
  await role("dm");
  await page.goto(base + "#library?tab=media");
  await page.locator('[data-media-scope="shared"]').click();
  check(
    !(await page.locator(".media-card", { hasText: "Livia — ritratto" }).count()),
    "DM sees the player's file among the shared ones",
  );
  await role("player");
  // Saved provenance does not share silently: the confirmation is part of the same step.
  await page.goto(base + "#media?id=m-mira");
  const prov = page.locator("[data-media-provenance]");
  await prov.locator("[name=media-source]").selectOption("own");
  await prov.locator("[name=media-author]").fill("Giocatore");
  await prov.locator("[name=media-license]").fill("Uso al tavolo");
  await button("Salva provenienza").click();
  await page.locator(".media-notice", { hasText: "Provenienza e licenza salvate." }).waitFor();
  passed.push(
    "F1: a Solo io note defaults to 'Solo io'; 'Chi può leggere la voce' there attaches without sharing; the DM's shared list stays empty",
  );

  // F12: others read a neutral credit; the uploader reads "Creata da me".
  await page.goto(base + "#campaign");
  await button("Leggi il resoconto").click();
  const letterRow = page.locator("[data-media-entry-panel] .media-attachment", {
    hasText: "Lettera sigillata",
  });
  await letterRow.waitFor();
  check(
    (await letterRow.innerText()).includes("Opera di chi l’ha caricata · DM della campagna"),
    "Player reads a first-person credit",
  );
  passed.push("F12: the player reads 'Opera di chi l’ha caricata · DM della campagna'");

  // F13: the DM changes the letter's visibility from its row; the player no longer sees it.
  await role("dm");
  const entryUrl = page.url();
  await page.goto(entryUrl);
  const select = page.locator('[data-media-attachment-visibility="att-letter"]');
  await select.selectOption("dm");
  await page.locator(".media-notice", { hasText: "Visibilità dell’allegato: Solo DM." }).waitFor();
  check(
    (await media()).attachments.find((a) => a.id === "att-letter").visibility === "dm",
    "Not stored",
  );
  await role("player");
  await page.goto(entryUrl);
  await page
    .locator('[data-ext-slot="campaign-section:media.entry"]')
    .waitFor({ state: "attached" });
  check(
    !(await page.locator("#content").innerText()).includes("Lettera sigillata"),
    "Player still sees a DM-only attachment",
  );
  await role("dm");
  await page.goto(entryUrl);
  await page.locator('[data-media-attachment-visibility="att-letter"]').selectOption("readers");
  await page.locator(".media-notice", { hasText: "Chi può leggere la voce" }).waitFor();
  await role("player");
  passed.push(
    "F13: a per-attachment visibility select (DM) hides and shows the letter to the player",
  );

  // F14: uploading inside the attach dialog comes back with the new file preselected.
  await page.goto(base + "#campaign?tab=media");
  await page.locator("[data-media-attachments-page]").waitFor();
  const attachButton = page.locator("[data-media-attach]").first();
  if (await attachButton.count()) {
    await attachButton.click();
    await page
      .locator("#dialog [data-media-picker-upload]")
      .setInputFiles(fixture("mira-bear.png"));
    await page.locator('#dialog [data-media-wheel="prop"]').click();
    await page.locator("#dialog .media-pick input:checked").waitFor();
    const picked = await page.locator("#dialog .media-pick:has(input:checked)").innerText();
    check(picked.includes("mira-bear"), "New upload not preselected: " + picked);
    await page.locator("#dialog [data-close]").first().click();
    passed.push("F14: an upload inside the attach dialog comes back preselected");
  } else passed.push("F14: (player has no editable campaign entry here; checked as DM below)");

  // F3: the delete notice's Undo never reverts a later change.
  await page.goto(base + "#media?id=m-livia-hood");
  await confirmDelete();
  await page.locator(".media-notice", { hasText: "«Livia incappucciata» eliminato." }).waitFor();
  check(await page.locator("[data-media-undo]").count(), "No Undo right after deleting");
  await page.locator("[data-media-new-folder]").click();
  await page.locator("#dialog [name=media-folder-name]").fill("Prova undo");
  await button("Crea cartella").click();
  await page.locator(".media-folder.active", { hasText: "Prova undo" }).waitFor();
  check(!(await page.locator("[data-media-undo]").count()), "Stale Undo still offered");
  data = await media();
  check(
    data.folders.some((f) => f.name === "Prova undo"),
    "Folder missing",
  );
  check(!data.assets.some((a) => a.id === "m-livia-hood"), "File came back without Undo");
  passed.push("F3: after a later change the delete notice no longer offers Undo (folder kept)");

  // F10: cancelling the wheel, then choosing the same file again, opens the wheel again.
  const upload = page.locator("[data-media-upload]");
  await upload.setInputFiles(fixture("mira-bear.png"));
  await page.locator("#dialog [data-media-wheel]").first().waitFor();
  await page.keyboard.press("Escape");
  check((await upload.evaluate((el) => el.value)) === "", "Input keeps the cancelled file");
  await upload.setInputFiles(fixture("mira-bear.png"));
  await page.locator("#dialog [data-media-wheel]").first().waitFor();
  await page.getByRole("button", { name: "Non importare" }).click();
  passed.push("F10: after Escape the same file can be chosen again (the wheel reopens)");

  // F4 + F10: quotas fit the browser; a file that cannot fit is refused before the wheel.
  await upload.setInputFiles(fixture("rumore1.png"));
  await page.locator('#dialog [data-media-wheel="prop"]').click();
  await page.locator(".media-notice", { hasText: "«rumore1.png» aggiunto" }).waitFor();
  await upload.setInputFiles(fixture("rumore2.png"));
  await page.locator('#dialog [data-media-wheel="prop"]').click();
  await page.locator(".media-notice", { hasText: "«rumore2.png» aggiunto" }).waitFor();
  await upload.setInputFiles(fixture("rumore3.png"));
  await page.locator(".media-notice.is-error", { hasText: "Spazio esaurito" }).waitFor();
  check(!(await page.locator("#dialog[open]").count()), "Wheel opened for a file that cannot fit");
  await role("dm");
  await page.goto(base + "#library?tab=media");
  await upload.setInputFiles(fixture("rumore3.png"));
  await page.locator('#dialog [data-media-wheel="prop"]').click();
  await page.locator(".media-notice", { hasText: "«rumore3.png» aggiunto" }).waitFor();
  await upload.setInputFiles(fixture("rumore4.png"));
  await page
    .locator(".media-notice.is-error", { hasText: "Spazio di questo browser esaurito" })
    .waitFor();
  check(!(await page.locator(".save-warning").count()), "Local storage overflowed");
  const chars = await page.evaluate((k) => localStorage.getItem(k).length, key);
  await page.reload();
  await page.locator("[data-media-library]").waitFor();
  data = await media();
  check(
    ["rumore1.png", "rumore2.png", "rumore3.png"].every((n) =>
      data.assets.some((a) => a.fileName === n),
    ),
    "An accepted upload was lost on reload",
  );
  await shot("r1-browser-quota");
  passed.push(
    `F4: player 2 × 380 KB then 'Spazio esaurito' before the wheel; DM 1 × 380 KB then 'Spazio di questo browser esaurito'; every accepted file persisted (${chars} characters stored)`,
  );
  // Free the space again for the rest of the journey (a reload starts as the player).
  await role("dm");
  await page.goto(base + "#library?tab=media");
  for (const name of ["rumore3"]) {
    await page.locator(".media-card", { hasText: name }).click();
    await confirmDelete();
  }
  await role("player");
  for (const name of ["rumore1", "rumore2"]) {
    await page.goto(base + "#library?tab=media");
    await page.locator(".media-card", { hasText: name }).click();
    await confirmDelete();
  }

  // F7: a refused provenance keeps what was typed and focuses the field to fix.
  await page.goto(base + "#media?id=m-livia-portrait");
  const provenance = page.locator("[data-media-provenance]");
  await provenance.locator("[name=media-source]").selectOption("licensed");
  await provenance.locator("[name=media-author]").fill("Artista Esempio");
  await provenance.locator("[name=media-license]").fill("CC BY 4.0");
  await provenance.locator("[name=media-link]").fill("ftp://esempio.org/x");
  await button("Condividi con la campagna").click();
  await page.locator(".media-notice.is-error", { hasText: "http" }).waitFor();
  check(
    (await provenance.locator("[name=media-author]").inputValue()) === "Artista Esempio" &&
      (await provenance.locator("[name=media-license]").inputValue()) === "CC BY 4.0" &&
      (await provenance.locator("[name=media-source]").inputValue()) === "licensed",
    "Typed provenance was cleared",
  );
  check(
    await page.evaluate(() => document.activeElement?.name === "media-link"),
    "The invalid link is not focused",
  );
  await page
    .locator("[data-media-provenance]")
    .screenshot({ path: shots + "r2-provenance-kept.png" });
  await offline(true);
  await provenance.locator("[name=media-link]").fill("https://esempio.org/x");
  await button("Condividi con la campagna").click();
  await page.locator(".media-notice.is-error", { hasText: "Sei senza rete" }).waitFor();
  check(
    (await provenance.locator("[name=media-author]").inputValue()) === "Artista Esempio",
    "Offline refusal cleared the form",
  );
  // F11: offline, a refused sheet colour is not left selected.
  await page.goto(base + "#characters?id=livia&tab=media");
  await page.locator('.media-swatch:has([name="media-theme"])', { hasText: "Argento" }).click();
  await page.waitForTimeout(150);
  check(
    (await page.locator('input[name="media-theme"]:checked').evaluate((el) => el.value)) === "",
    "Refused colour stays selected",
  );
  await offline(false);
  passed.push(
    "F7: invalid link and offline refusals keep source, author and licence, focusing the link; F11: a refused colour offline reverts to the stored one",
  );

  // F2: one border model — the sheet shows B12's colour and opens its border colours.
  await page.goto(base + "#characters?id=livia&tab=media");
  await page.locator(".media-ring", { hasText: "Bordo della pedina: standard" }).waitFor();
  check(!(await page.locator('[name="media-frame"]').count()), "Second border control still there");
  await button("Cambia il bordo al Tavolo").click();
  await page.locator("#battle-map").waitFor();
  await page.locator("[data-token-menu-ring]").first().waitFor();
  await page.locator('[data-token-menu-ring="blue"]').click();
  await page.waitForFunction(
    () =>
      getComputedStyle(
        document.querySelector('.map-token[data-actor="livia"] .token-display > circle'),
      ).stroke === "rgb(99, 164, 224)",
  );
  await page.keyboard.press("Escape");
  await page.goto(base + "#characters?id=livia&tab=media");
  await page.locator(".media-ring", { hasText: "Bordo della pedina: Blu" }).waitFor();
  check(
    (await page.locator(".media-token-svg circle").first().getAttribute("stroke")) === "#63a4e0",
    "Preview does not show the effective border",
  );
  await page.locator(".media-look").screenshot({ path: shots + "r3-one-border.png" });
  passed.push(
    "F2: Appearance shows the token menu's border (standard → Blu); 'Cambia il bordo al Tavolo' opens B12's border colours; Table and preview agree",
  );

  // F9: dropping the same image twice on a token adds it once.
  await page.goto(base + "#table");
  await openTablePanel(page, "media-dock"); // B62: Journal › Images and files
  const dock = page.locator("[data-media-dock]");
  await dock.waitFor();
  for (let i = 0; i < 2; i += 1)
    await dock
      .locator("[data-media-dock-item]", { hasText: "Mira — schizzo" })
      .locator("[data-media-drag]")
      .dragTo(page.locator('.map-token[data-actor="livia"] .token-display > circle').first());
  await page.waitForTimeout(200);
  data = await media();
  check(
    data.looks.livia.token.variants.filter((v) => v.assetId === "m-mira").length === 1,
    "Duplicate token image added",
  );
  passed.push("F9: dropping 'Mira — schizzo' twice on Livia's token keeps one image, shown");

  // F6: the missing-image badge is a 40 px target on a 390 px phone and at 1440.
  await page.goto(base + "#media?id=m-mira");
  await confirmDelete();
  await page.goto(base + "#table");
  const badge = page.locator('[data-media-missing="livia"]');
  await badge.waitFor();
  let box = await badge.boundingBox();
  check(
    box.width >= 39.5 && box.height >= 39.5,
    "Desktop badge under 40 px: " + JSON.stringify(box),
  );
  await badge.click();
  await page.getByRole("heading", { name: "File mancante" }).waitFor();
  await button("Più tardi").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await badge.waitFor();
  box = await badge.boundingBox();
  check(box.width >= 39.5 && box.height >= 39.5, "Phone badge under 40 px: " + JSON.stringify(box));
  await shot("r4-phone-badge");
  await page.setViewportSize({ width: 1440, height: 900 });
  passed.push(
    `F6: the missing-image badge is a ${Math.round(box.width)}×${Math.round(box.height)} px target at 390 px and opens the fix with the mouse`,
  );

  // F5: the missing-map notice is HTML, legible and clickable with the mouse.
  await role("dm");
  await page.goto(base + "#media?id=m-courtyard");
  await button("Usa come mappa").click();
  await page.locator(".media-notice", { hasText: "è la mappa di" }).waitFor();
  await confirmDelete();
  await page.goto(base + "#table");
  const fix = page.locator("[data-media-missing-map]");
  await fix.waitFor({ timeout: 8000 }).catch(async (error) => {
    await shot("debug-f5");
    const slot = await page.evaluate(() => [
      document.querySelector('[data-ext-slot="map-layer:media-missing"]')?.outerHTML.slice(0, 600),
      location.hash,
      document.querySelector('[aria-label="Visita come"], select')?.value,
    ]);
    throw Error("F5 debug: " + JSON.stringify(slot) + " " + error.message);
  });
  const fixBox = await fix.boundingBox();
  const hit = await page.evaluate(
    ([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest("[data-media-missing-map]")),
    [fixBox.x + fixBox.width / 2, fixBox.y + fixBox.height / 2],
  );
  check(hit, "Something covers the Fix button");
  // B61: the map is drawn at another scale beside the sidebar; the button inside the map's
  // foreignObject measures 39.99997 px, so a hundredth of a pixel is float residue.
  check(fixBox.height >= 39.99, "Fix button under 40 px: " + fixBox.height);
  const fontSize = await page
    .locator(".media-map-missing span")
    .evaluate(
      (el) =>
        parseFloat(getComputedStyle(el).fontSize) *
        (el.getBoundingClientRect().height / el.offsetHeight || 1),
    );
  check(fontSize >= 13, "Notice text too small: " + fontSize);
  await shot("r5-missing-map");
  await fix.click();
  await page.getByRole("heading", { name: "File mancante" }).waitFor();
  await button("Più tardi").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await role("dm");
  await fix.waitFor();
  const phoneFix = await fix.boundingBox();
  check(
    phoneFix.height >= 40 && phoneFix.x >= 0 && phoneFix.x + phoneFix.width <= 390,
    "Phone Fix: " + JSON.stringify(phoneFix),
  );
  check(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    "Phone overflow",
  );
  await shot("r6-phone-missing-map");
  await page.setViewportSize({ width: 1440, height: 900 });
  passed.push(
    `F5: the missing-map notice sits at the bottom of the map, clear of the HUD; its Fix button (${Math.round(fixBox.width)}×${Math.round(fixBox.height)} px) takes the mouse; phone ${Math.round(phoneFix.width)}×${Math.round(phoneFix.height)} px, no overflow`,
  );

  // F14 (DM): upload inside the attach dialog, preselected; listeners do not pile up.
  await page.goto(base + "#campaign");
  await button("Leggi il resoconto").click();
  const panel = page.locator("[data-media-entry-panel]");
  for (let i = 0; i < 3; i += 1) {
    await panel.getByRole("button", { name: "Allega un file" }).click();
    await page.locator("#dialog [data-close]").first().click();
  }
  await panel.getByRole("button", { name: "Allega un file" }).click();
  await page
    .locator("#dialog [data-media-picker-upload]")
    .setInputFiles(fixture("livia-bosco.png"));
  await page.locator('#dialog [data-media-wheel="prop"]').click();
  await page
    .locator("#dialog .media-pick:has(input:checked)", { hasText: "livia-bosco" })
    .waitFor();
  await page.locator('#dialog [name=media-visibility][value="readers"]').check();
  check(
    await page.locator("#dialog [data-media-attach-provenance]").isVisible(),
    "Share box hidden",
  );
  await page.locator("#dialog footer .primary").click();
  await page.locator("#dialog .dialog-error", { hasText: "conferma che lo condividi" }).waitFor();
  await page.locator("#dialog [name=media-source]").selectOption("own");
  await page.locator("#dialog [name=media-author]").fill("DM");
  await page.locator("#dialog [name=media-license]").fill("Uso al tavolo");
  await page.locator("#dialog [name=media-share]").check();
  await page.locator("#dialog footer .primary").click();
  await panel.locator(".media-attachment", { hasText: "livia-bosco" }).waitFor();
  passed.push(
    "F14: after reopening the attach dialog 4 times, an upload inside it comes back preselected; showing it to readers needs the explicit share confirmation",
  );

  check(errors.length === 0, errors.join("; "));
  await context.close();
  return { passed, errors };
};
