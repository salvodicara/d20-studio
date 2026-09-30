async (rootPage) => {
  // B23 — global search, command palette, quick create and shortcuts. Real keys, clicks
  // and taps on the one app: IT desktop 1440 (player and DM), EN phone 390 with touch,
  // reload persistence, correction (move/reset of a key, removal of a revoked recent),
  // revocation of a shared entry. Synthetic data only; each context starts from its own
  // example state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B23/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const ok = (message) => passed.push(message);
  const button = (name) => page.getByRole("button", { name, exact: true });
  const dbutton = (name) => page.locator("#dialog").getByRole("button", { name, exact: true });
  const dialog = page.locator("#dialog[open]");
  const input = page.locator("#dialog [data-cmdk-input]");
  const options = page.locator("#dialog .cmdk-option");
  const optionTexts = async () =>
    await options.evaluateAll((nodes) =>
      nodes.map((n) => ({
        type: n.querySelector(".cmdk-type")?.textContent ?? "",
        title: n.querySelector(".cmdk-title")?.textContent ?? "",
        scope: n.querySelector(".cmdk-scope")?.textContent ?? "",
      })),
    );
  const role = async (value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForTimeout(150);
  };
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  // P9 SV-04: a created entry's notice has its own «Apri» button (.ui-action-toast).
  const toastText = async () =>
    ((await page.locator(".ui-action-toast").count()) ? await page.locator(".ui-action-toast").innerText() + " " : "") +
    (await page.locator("#toast").innerText());
  const openPalette = async (keys = "Control+k") => {
    await page.keyboard.press(keys);
    await input.waitFor();
    check(
      await page.evaluate(() => document.activeElement?.matches("[data-cmdk-input]")),
      "the search field has focus",
    );
  };
  const search = async (text) => {
    await input.fill(text);
    await page.waitForTimeout(80);
  };
  const closeDialog = async () => {
    if (await dialog.count()) await page.keyboard.press("Escape");
    await page.waitForTimeout(60);
  };
  const noOverflow = async (label) => {
    const result = await page.evaluate(() => {
      const d = document.querySelector("#dialog[open]");
      return {
        page: document.documentElement.scrollWidth <= window.innerWidth + 1,
        dialog: !d || d.scrollWidth <= d.clientWidth + 1,
      };
    });
    check(result.page && result.dialog, "horizontal overflow: " + label);
  };

  await page.goto(base + "#home");
  await page.locator(".service-nav").waitFor();
  // Chromium on a Mac reports "macOS" (userAgentData) and "MacIntel" (platform): ⌘ labels.
  const mac = await page.evaluate(() =>
    [navigator.userAgentData?.platform, navigator.platform].some((p) =>
      /mac|iphone|ipad/i.test(p ?? ""),
    ),
  );
  const modK = mac ? "⌘K" : "Ctrl+K";
  await button("Ripristina esempio").click();
  await dbutton("Ripristina").click();
  await page.waitForTimeout(200);

  // 1. The header Search (one click) opens the palette; Esc closes it.
  const headerSearch = page.locator('.service-nav [data-service="search"]');
  check((await headerSearch.getAttribute("aria-label")) === "Cerca", "header search label");
  await headerSearch.click();
  await input.waitFor();
  check((await page.locator("#dialog h2").innerText()) === "Cerca e comandi", "palette title");
  await page.keyboard.press("Escape");
  check(!(await dialog.count()), "Esc closes the palette");
  // The hooks other checks use on the core search still work (name "Cerca", [name=query],
  // .search-result = the result title, #search-results with "Nessun risultato").
  await button("Cerca").click();
  await page.locator("#dialog [name=query]").fill("Livia");
  await page.waitForTimeout(80);
  check(
    (await page.locator("#dialog .search-result").allInnerTexts()).some(
      (t) => t.trim() === "Livia",
    ),
    "core search hook: title text",
  );
  await page.locator("#dialog [name=query]").fill("qqqzzzxx");
  await page.waitForTimeout(80);
  check(
    (await page.locator("#search-results").innerText()).includes("Nessun risultato"),
    "core search hook: empty state",
  );
  await page.locator("#dialog [name=query]").fill("esporta");
  await page
    .locator("#dialog .search-result", { hasText: "Esporta o elimina i miei dati" })
    .click();
  await page.waitForFunction(() => location.hash.startsWith("#account"));
  await page.goBack();
  await page.waitForFunction(() => location.hash.startsWith("#home"));
  await page.locator('[data-nav="table"]').first().waitFor();
  ok("header search opens the palette, Esc closes it; core search hooks still work");

  // 2. N on the Table: quick creator, private note, same view afterwards (Kanka).
  await page.locator('.app-header [data-nav="table"], [data-nav="table"]').first().click();
  await page.waitForFunction(() => location.hash.startsWith("#table"));
  await page.locator(".map-token, #tokens").first().waitFor();
  await page.keyboard.press("n");
  await page.locator("#dialog [data-cmdk-create-form]").waitFor();
  check((await page.locator("#dialog h2").innerText()) === "Creazione rapida", "creator title");
  check(
    await page.locator('#dialog input[name="kind"][value="note"]').isChecked(),
    "personal note is the default type",
  );
  check((await page.locator('#dialog input[name="title"]').inputValue()) === "", "N not typed");
  await page.locator('#dialog input[name="title"]').fill("Livia ha visto il simbolo");
  await page.locator('#dialog textarea[name="body"]').fill("Sul portone, inciso di recente.");
  await dbutton("Crea").click();
  await page.waitForTimeout(150);
  check(!(await dialog.count()), "creator closes");
  check((await page.evaluate(() => location.hash)).startsWith("#table"), "back on the Table");
  check((await toastText()).includes("solo tu la vedi"), "private creation toast");
  check((await toastText()).includes(`(${modK})`), "toast names the platform key");
  const noteEntry = (await saved()).campaignContent.entries.find(
    (e) => e.revisions.at(-1).data.title === "Livia ha visto il simbolo",
  );
  check(noteEntry?.kind === "note" && noteEntry.access.mode === "private", "saved private note");
  ok("N creates a private note and returns to the Table");

  // 3. Ctrl+K anywhere: 'liv' finds Livia first and the accessible notes, with type badges.
  await openPalette();
  await search("liv");
  let rows = await optionTexts();
  check(rows[0].type === "Personaggio" && rows[0].title === "Livia", "Livia first");
  const note = rows.find((r) => r.title === "Livia ha visto il simbolo");
  check(note?.type === "Nota" && note.scope === "Solo io", "personal note with its badge");
  check(
    rows.some((r) => r.type === "Immagini e file" && r.title === "Appunti di Livia"),
    "the player's own document",
  );
  check(new Set(rows.map((r) => r.type)).size >= 3, "several type badges");
  check(
    (await page.locator("#dialog [data-cmdk-status]").innerText()).includes("risultati"),
    "live status",
  );
  const openBox = await dbutton("Apri").boundingBox();
  check(openBox && openBox.y + openBox.height <= 900, "the palette footer fits at 1440x900");
  await page.screenshot({ path: dir + "b23-01-liv-it.png" });
  // Arrows move the active option (aria-activedescendant), Enter opens.
  await page.keyboard.press("ArrowDown");
  check(
    (await input.getAttribute("aria-activedescendant")) === "cmdk-opt-1",
    "arrow moves the active option",
  );
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => location.hash.startsWith("#characters"));
  check(
    (await page.evaluate(() => location.hash)).includes("id=livia"),
    "Enter opens Livia's sheet",
  );
  // Back returns to the context; the search comes back with its text selected.
  await page.goBack();
  await page.waitForFunction(() => location.hash.startsWith("#table"));
  await page.locator(".map-token, #tokens").first().waitFor();
  await openPalette("Meta+k");
  check((await input.inputValue()) === "liv", "the last query is kept");
  check(
    await page.evaluate(() => {
      const el = document.querySelector("#dialog [data-cmdk-input]");
      return el.selectionStart === 0 && el.selectionEnd === el.value.length;
    }),
    "kept query is selected: typing replaces it",
  );
  ok("liv finds Livia and the personal note; Enter opens; Back returns; query kept");

  // 4. '>' lists only the commands this identity may run.
  await page.keyboard.type(">");
  await page.waitForTimeout(80);
  rows = await optionTexts();
  check(rows.length > 10 && rows.every((r) => r.type === "Comando"), "commands only");
  const titles = rows.map((r) => r.title);
  check(titles.includes("Termina turno") && titles.includes("Creazione rapida"), "own commands");
  check(titles.includes("Vai a: Tavolo"), "core navigation as commands");
  check(!titles.includes("Avvia o concludi il combattimento"), "no DM-only command");
  check(!titles.includes("Nuovo handout"), "no DM-only area command");
  check(
    (await page.locator("#dialog [data-cmdk-status]").innerText()).includes("comandi permessi"),
    "commands status",
  );
  await page.screenshot({ path: dir + "b23-02-commands-player.png" });
  ok("> lists only permitted commands");

  // 5. '@' lists filters; '@note ' applies one; results are only notes.
  await search("@");
  rows = await optionTexts();
  check(
    rows.every((r) => r.type === "Filtro") && rows.some((r) => r.title === "Incantesimi"),
    "filters",
  );
  await search("@note liv");
  check((await page.locator("#dialog [data-cmdk-filter]").inputValue()) === "notes", "filter set");
  check((await input.inputValue()) === "liv", "filter token removed from the text");
  rows = await optionTexts();
  check(rows.length >= 1 && rows.every((r) => r.type === "Nota"), "only notes");
  await page.screenshot({ path: dir + "b23-03-filter-notes.png" });
  // Backspace on the empty field removes the filter (Quick Insert tag).
  await search("");
  await page.keyboard.press("Backspace");
  check((await page.locator("#dialog [data-cmdk-filter]").inputValue()) === "", "filter removed");
  ok("@ lists and applies filters");

  // 6. Typo tolerance: 'concentrazoine' finds Concentrazione (SRD rule).
  await search("concentrazoine");
  rows = await optionTexts();
  check(rows[0]?.title === "Concentrazione" && rows[0].type === "Regola", "typo found");
  check(rows[0].scope.startsWith("SRD 5.2.1"), "library scope");
  await page.screenshot({ path: dir + "b23-04-typo.png" });
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => location.hash.startsWith("#library"));
  check(
    decodeURIComponent(await page.evaluate(() => location.hash)).includes(
      "srd2024:rule:concentration",
    ),
    "opens the rule in the compendium",
  );
  await page.goBack();
  await page.waitForFunction(() => location.hash.startsWith("#table"));
  ok("concentrazoine finds Concentrazione and opens it");

  // 7. From the Spells tab the palette is already filtered to spells.
  // From the Table the App menu leads to Characters.
  await page.locator('[data-service="app-menu"]').click();
  await page.locator('#dialog [data-jump="characters"]').click();
  await page.waitForFunction(() => location.hash.startsWith("#characters"));
  await page.locator('[data-actor="livia"]').first().click();
  await page.locator('[data-character-tab="spells"]').click();
  await page.waitForFunction(() => location.hash.includes("tab=spells"));
  await page.locator('[data-character-tab="spells"][aria-current="page"]').waitFor();
  await openPalette();
  check(
    (await page.locator("#dialog [data-cmdk-filter]").inputValue()) === "spells",
    "spells filter from context",
  );
  check((await input.inputValue()) === "", "fresh query in context");
  rows = await optionTexts();
  check(
    rows.slice(0, 4).every((r) => r.type === "Incantesimo" && r.scope === "Scheda di Livia"),
    "Livia's spells first",
  );
  await page.screenshot({ path: dir + "b23-05-spells-context.png" });
  await search("dardo");
  rows = await optionTexts();
  check(rows.length >= 3 && rows.every((r) => r.type === "Incantesimo"), "only spells");
  await closeDialog();
  ok("Spells tab opens the palette filtered to spells");

  // 8. '?' shows the generated guide; rebinding End turn to E reports the conflict.
  await page.keyboard.press("?");
  await page.locator("#dialog [data-cmdk-guide-body]").waitFor();
  const guide = await page.locator("#dialog [data-cmdk-guide-body]").innerText();
  check(
    guide.includes("Apri ricerca e comandi") && guide.includes("Creazione rapida"),
    "guide rows",
  );
  check(guide.includes("Ovunque") && guide.includes("Sul Tavolo"), "guide groups");
  check(guide.includes("Nessun conflitto"), "no conflicts at start");
  await page.screenshot({ path: dir + "b23-06-guide.png" });
  await page.locator("#dialog [data-cmdk-configure]").click();
  await page.locator("#dialog [data-cmdk-controls]").waitFor();
  await page.locator("#dialog [data-controls-search]").fill("turno");
  await page.waitForTimeout(80);
  const endTurn = page.locator('#dialog [data-control-capture="command-palette.end-turn"]');
  check((await endTurn.innerText()).trim() === "—", "End turn has no default key");
  await endTurn.click();
  await page.keyboard.press("e");
  await page.waitForTimeout(80);
  const conflict = await page.locator("#dialog [data-controls-notice]").innerText();
  check(conflict.includes("è già usata da"), "conflict reported: " + conflict);
  const holder = /«([^»]+)»/.exec(conflict)?.[1];
  check(holder && holder !== "Termina turno", "names the command holding E");
  await page.screenshot({ path: dir + "b23-07-conflict.png" });
  // Annulla keeps everything; then move the key explicitly.
  await dbutton("Annulla").click();
  check((await endTurn.innerText()).trim() === "—", "cancel keeps no key");
  await endTurn.click();
  await page.keyboard.press("e");
  await dbutton("Assegna e sposta").click();
  await page.waitForTimeout(80);
  check((await endTurn.innerText()).trim() === "E", "End turn now E");
  check(
    (await page.locator("#dialog [data-controls-notice]").innerText()).includes("tolta a"),
    "the other command lost E",
  );
  // A reserved key is refused.
  await page.locator('#dialog [data-control-capture="command-palette.end-turn"]').click();
  await page.keyboard.press("Tab");
  await page.locator("#dialog [data-controls-search]").fill("registro");
  await page.waitForTimeout(80);
  await page.locator('#dialog [data-control-capture="command-palette.log"]').click();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(80);
  check(
    (await page.locator("#dialog [data-controls-notice]").innerText()).includes("riservata"),
    "reserved key refused",
  );
  await closeDialog();
  ok("? guide; End turn → E conflict named, cancel and explicit move; reserved key refused");

  // 9. Reload: the personal key survives; on the Table E now runs End turn.
  await page.reload();
  await page.locator(".service-nav").waitFor();
  const bindings = (await saved()).ext["command-palette"].bindings;
  check(bindings.player["command-palette.end-turn"] === "E", "saved personal key");
  check(Object.keys(bindings.dm).length === 0, "the DM's keys are untouched");
  // The palette is also the way to a page: '> vai tavolo' → Enter.
  await openPalette();
  await search("> tavolo");
  check((await optionTexts())[0]?.title === "Vai a: Tavolo", "navigation command");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => location.hash.startsWith("#table"));
  await page.locator(".map-token, #tokens").first().waitFor();
  await page.keyboard.press("e");
  await page.waitForTimeout(150);
  check((await toastText()).includes("Nessun combattimento in corso"), "E ran End turn");
  await page.keyboard.press("?");
  await page.locator("#dialog [data-cmdk-guide-body]").waitFor();
  const endRow = await page
    .locator('#dialog [data-guide-row="command-palette.end-turn"]')
    .innerText();
  check(endRow.includes("personalizzata"), "guide marks the custom key");
  // 10. Correction: restore defaults with confirmation.
  await page.locator("#dialog [data-cmdk-configure]").click();
  await page.locator("#dialog [data-controls-reset-all]").click();
  check(
    (await page.locator("#dialog .cmdk-reset").innerText()).includes("Ripristinare tutte"),
    "reset asks first",
  );
  await dbutton("Ripristina tutte").click();
  await page.waitForTimeout(80);
  check(
    (await page.locator("#dialog [data-controls-notice]").innerText()).includes("Ripristinate"),
    "reset done",
  );
  await closeDialog();
  check(
    Object.keys((await saved()).ext["command-palette"].bindings.player).length === 0,
    "defaults restored",
  );
  ok("reload keeps the key, E ends the turn, reset with confirmation restores defaults");

  // 11. DM: never sees the player's private note or document; sees DM commands.
  await role("dm");
  await openPalette();
  await search("liv");
  rows = await optionTexts();
  check(!rows.some((r) => r.title === "Livia ha visto il simbolo"), "no private note for DM");
  check(!rows.some((r) => r.title === "Appunti di Livia"), "no private document for DM");
  await search(">");
  check(
    (await optionTexts()).some((r) => r.title === "Avvia o concludi il combattimento"),
    "DM command listed",
  );
  await page.screenshot({ path: dir + "b23-08-commands-dm.png" });
  await closeDialog();
  // DM quick-creates a place, then shares it with the campaign.
  await page.keyboard.press("n");
  await page.locator("#dialog [data-cmdk-create-form]").waitFor();
  await page.locator('#dialog label.cmdk-kind:has(input[value="place"])').click();
  await page.locator('#dialog input[name="title"]').fill("Torre Grigia");
  await page.locator('#dialog textarea[name="body"]').fill("Rovina a nord della palude.");
  await dbutton("Crea").click();
  await page.waitForTimeout(150);
  const share = async (mode) => {
    await openPalette();
    await search("torre grigia");
    rows = await optionTexts();
    check(rows[0]?.title === "Torre Grigia" && rows[0].type === "Luogo", "DM finds the place");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => location.hash.startsWith("#campaign"));
    await page.locator("[data-campaign-access]").click();
    await page.locator('#dialog select[name="mode"]').selectOption(mode);
    await dbutton("Salva accessi").click();
    await page.waitForTimeout(150);
    check(!(await dialog.count()), "sharing saved");
  };
  await share("campaign");
  // Player finds it (campaign scope) and opens it.
  await role("player");
  await openPalette();
  await search("torre");
  rows = await optionTexts();
  const place = rows.find((r) => r.title === "Torre Grigia");
  check(place?.type === "Luogo" && place.scope === "Campagna", "player finds the shared place");
  await options.filter({ hasText: "Torre Grigia" }).first().click();
  await page.waitForFunction(() => location.hash.startsWith("#campaign"));
  // DM revokes it.
  await role("dm");
  await share("private");
  // 12. Player: the revoked place is gone from search and from recents (no old title).
  await role("player");
  await openPalette();
  await search("");
  rows = await optionTexts();
  check(
    rows.some((r) => r.title === "Voce non più disponibile"),
    "revoked recent marked",
  );
  check(!rows.some((r) => r.title.includes("Torre")), "old title not shown");
  await page.screenshot({ path: dir + "b23-09-revoked.png" });
  await options.filter({ hasText: "Voce non più disponibile" }).first().click();
  await page.waitForTimeout(80);
  check(
    !(await optionTexts()).some((r) => r.title === "Voce non più disponibile"),
    "correction: removed from recents",
  );
  await search("torre");
  check(!(await optionTexts()).some((r) => r.title === "Torre Grigia"), "revoked place hidden");
  await closeDialog();
  ok("DM privacy, sharing and revocation respected in search and recents");
  await noOverflow("desktop");

  // 13. EN phone 390 with touch: tap Search, filters, quick create, guide, editor.
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const mobile = await phone.newPage();
  mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
  const tapButton = (name) => mobile.locator("#dialog").getByRole("button", { name, exact: true });
  await mobile.goto(base + "#home");
  await mobile.locator(".service-nav").waitFor();
  await mobile.locator('[data-service="preferences"]').first().tap();
  await mobile.locator('#dialog select[name="lang"]').selectOption("en");
  await tapButton("Salva preferenze").tap();
  await mobile.waitForTimeout(150);
  const mInput = mobile.locator("#dialog [data-cmdk-input]");
  const mOptions = mobile.locator("#dialog .cmdk-option");
  const mRows = () =>
    mOptions.evaluateAll((nodes) =>
      nodes.map((n) => ({
        type: n.querySelector(".cmdk-type")?.textContent ?? "",
        title: n.querySelector(".cmdk-title")?.textContent ?? "",
        scope: n.querySelector(".cmdk-scope")?.textContent ?? "",
      })),
    );
  const mOverflow = async (label) => {
    const result = await mobile.evaluate(() => {
      const d = document.querySelector("#dialog[open]");
      return (
        document.documentElement.scrollWidth <= window.innerWidth + 1 &&
        (!d || d.scrollWidth <= d.clientWidth + 1)
      );
    });
    check(result, "phone overflow: " + label);
  };
  const mSearch = mobile.locator('.service-nav [data-service="search"]');
  check((await mSearch.getAttribute("aria-label")) === "Search", "EN header label");
  const box = await mSearch.boundingBox();
  check(box.width >= 40 && box.height >= 40, "40px touch target");
  await mSearch.tap();
  await mInput.waitFor();
  check((await mobile.locator("#dialog h2").innerText()) === "Search and commands", "EN title");
  await mInput.fill("fire");
  await mobile.waitForTimeout(100);
  let m = await mRows();
  check(
    m.some((r) => r.title === "Fire Bolt" && r.type === "Spell"),
    "EN spell found",
  );
  const optionBox = await mOptions.first().boundingBox();
  check(optionBox.height >= 40, "option touch height");
  await mOverflow("palette");
  const mOpen = await tapButton("Open").boundingBox();
  check(mOpen && mOpen.y + mOpen.height <= 844 && mOpen.height >= 40, "phone footer fits");
  await mobile.screenshot({ path: dir + "b23-10-phone-en.png" });
  await mobile.locator("#dialog [data-cmdk-filter]").selectOption("spells");
  await mobile.waitForTimeout(80);
  m = await mRows();
  check(m.length && m.every((r) => r.type === "Spell"), "phone filter");
  await mOptions.filter({ hasText: "Livia’s sheet" }).first().tap();
  await mobile.waitForFunction(() => !document.querySelector("#dialog[open]"));
  check(
    /#characters\?.*id=livia.*tab=spells|#characters\?.*tab=spells.*id=livia/.test(
      await mobile.evaluate(() => decodeURIComponent(location.hash)),
    ),
    "tap opens the spell on Livia's sheet",
  );
  // Back: the query comes back; a category never does (P9 SV-03: not sticky).
  await mobile.goBack();
  await mobile.waitForFunction(() => location.hash.startsWith("#home"));
  await mobile.locator(".service-nav").waitFor();
  await mSearch.tap();
  await mInput.waitFor();
  check(
    (await mobile.locator("#dialog [data-cmdk-filter]").inputValue()) === "",
    "category not sticky",
  );
  check((await mInput.inputValue()) === "fire", "query kept");
  await mobile.locator("#dialog button.button[data-close]").tap();
  // Quick create by touch from the palette footer: same page afterwards.
  const before = await mobile.evaluate(() => location.hash);
  await mSearch.tap();
  await mInput.waitFor();
  await mobile.locator("#dialog [data-cmdk-create]").tap();
  await mobile.locator("#dialog [data-cmdk-create-form]").waitFor();
  await mobile.locator('#dialog input[name="title"]').fill("Remember the rope");
  await mOverflow("quick create");
  await mobile.screenshot({ path: dir + "b23-14-phone-create.png" });
  await tapButton("Create").tap();
  await mobile.waitForTimeout(150);
  check((await mobile.evaluate(() => location.hash)) === before, "phone stays on the page");
  check((await mobile.locator(".ui-action-toast").innerText()).includes("only you can see it"), "EN toast");
  await mSearch.tap();
  await mInput.waitFor();
  check((await mobile.locator("#dialog [data-cmdk-filter]").inputValue()) === "", "Everything");
  await mInput.fill("rope");
  await mobile.waitForTimeout(80);
  m = await mRows();
  check(
    m.some((r) => r.title === "Remember the rope" && r.type === "Note" && r.scope === "Only me"),
    "EN note found",
  );
  await mobile.locator("#dialog [data-cmdk-guide]").tap();
  await mobile.locator("#dialog [data-cmdk-guide-body]").waitFor();
  const mGuide = await mobile.locator("#dialog [data-cmdk-guide-body]").innerText();
  check(mGuide.includes("Everywhere") && mGuide.includes("Open search and commands"), "EN guide");
  await mOverflow("guide");
  await mobile.screenshot({ path: dir + "b23-11-phone-guide.png" });
  await mobile.locator("#dialog [data-cmdk-configure]").tap();
  await mobile.locator("#dialog [data-cmdk-controls]").waitFor();
  await mOverflow("editor");
  await mobile.screenshot({ path: dir + "b23-12-phone-controls.png" });
  await phone.close();
  ok("EN phone: tap search, filter, open, quick create, guide and editor without overflow");

  // Desktop screenshot of the editor for the evidence set.
  await page.keyboard.press("?");
  await page.locator("#dialog [data-cmdk-configure]").click();
  await page.locator("#dialog [data-cmdk-controls]").waitFor();
  await page.screenshot({ path: dir + "b23-13-controls.png" });
  await closeDialog();

  // 14. Review fixes (24/09). a) Keys in tooltips and aria-keyshortcuts, ⌘ on a Mac.
  await page.goto(base + "#table");
  await page.locator(".map-token, #tokens").first().waitFor();
  await page.waitForTimeout(200);
  const hint = (selector) =>
    page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el && [el.getAttribute("title"), el.getAttribute("aria-keyshortcuts")];
    }, selector);
  let tip = await hint('.service-nav [data-service="search"]');
  check(
    tip[0] === `Cerca (${modK})` && tip[1] === (mac ? "Meta+K" : "Control+K"),
    "header search tooltip: " + tip,
  );
  tip = await hint('[data-tool="measure"]');
  check(tip[0].endsWith("(R)") && tip[1] === "R", "measure tool tooltip: " + tip);
  // b) A typo never runs the first Table command: Enter does nothing, "no results".
  await openPalette();
  await search("gobbllin zzz");
  check((await page.locator("#search-results").innerText()).includes("Nessun risultato"), "typo");
  const toastBefore = await toastText();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  check(await dialog.count(), "the palette stays open");
  check((await toastText()) === toastBefore, "no command ran on Enter");
  await search("qqqzzzxx");
  check((await optionTexts()).length === 0, "nonsense on the Table: nothing");
  await closeDialog();
  // c) Generated guide: the core's fixed keys, aligned key column.
  await page.keyboard.press("?");
  await page.locator("#dialog [data-cmdk-guide-body]").waitFor();
  check(
    (await page.locator('#dialog [data-guide-locked="undo"]').innerText()).includes("fisso"),
    "fixed Mod+Z row",
  );
  check(await page.locator('#dialog [data-guide-locked="arrowup"]').count(), "arrow keys row");
  check(
    (await page.locator('#dialog [data-guide-row="command-palette.open"] kbd').allInnerTexts())
      .join("")
      .replace("+", "") === modK.replace("+", ""),
    "guide key uses the platform label",
  );
  const columns = await page.evaluate(() =>
    [...document.querySelectorAll("#dialog [data-guide-context] .cmdk-keys-list")].map(
      (dl) =>
        [
          ...new Set(
            [...dl.querySelectorAll(":scope > div > dd")].map((dd) =>
              Math.round(dd.getBoundingClientRect().left),
            ),
          ),
        ].length,
    ),
  );
  check(
    columns.every((n) => n === 1),
    "descriptions aligned in each section: " + columns,
  );
  await page.screenshot({ path: dir + "b23-15-guide-fixed.png" });
  // d) Editor: a rebind shows in the tooltip at once; browser and token keys refused;
  // Tab during capture clears the prompt.
  await page.locator("#dialog [data-cmdk-configure]").click();
  await page.locator("#dialog [data-cmdk-controls]").waitFor();
  await page.locator("#dialog [data-controls-search]").fill("ricerca");
  await page.waitForTimeout(80);
  await page.locator('#dialog [data-control-capture="command-palette.open"]').click();
  await page.keyboard.press("Control+j");
  await page.waitForTimeout(150);
  const modJ = mac ? "⌘J" : "Ctrl+J";
  check(
    (await page.locator('#dialog [data-control-capture="command-palette.open"]').innerText())
      .replace(/\s+/g, "")
      .replace("+", "") === modJ.replace("+", ""),
    "rebound to Mod+J",
  );
  tip = await hint('.service-nav [data-service="search"]');
  check(tip[0] === `Cerca (${modJ})`, "tooltip follows the rebind: " + tip);
  await page.locator("#dialog [data-controls-search]").fill("creazione");
  await page.waitForTimeout(80);
  await page.locator('#dialog [data-control-capture="command-palette.create"]').click();
  await page.keyboard.press("Control+r");
  await page.waitForTimeout(80);
  check(
    (await page.locator("#dialog [data-controls-notice]").innerText()).includes("del browser"),
    "Ctrl+R refused",
  );
  await page.locator("#dialog [data-controls-search]").fill("registro");
  await page.waitForTimeout(80);
  await page.locator('#dialog [data-control-capture="command-palette.log"]').click();
  await page.keyboard.press("Delete");
  await page.waitForTimeout(80);
  check(
    (await page.locator("#dialog [data-controls-notice]").innerText()).includes("pedine"),
    "Delete refused on the Table",
  );
  const logKey = page.locator('#dialog [data-control-capture="command-palette.log"]');
  await logKey.click();
  check((await logKey.innerText()).includes("Premi i tasti"), "capturing");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(80);
  check((await logKey.innerText()).trim() === "—", "Tab stops capturing");
  check(
    !(await page.locator("#dialog [data-controls-notice]").innerText()).includes("Premi"),
    "no stale prompt after Tab",
  );
  check(
    await page.evaluate(() =>
      document.activeElement?.matches?.(
        "[data-control-clear], [data-control-reset], [data-control-capture], .cmdk-control-group summary, [data-controls-reset-all], button",
      ),
    ),
    "focus moved on with Tab",
  );
  await page.locator("#dialog [data-controls-reset-all]").click();
  await dbutton("Ripristina tutte").click();
  await page.waitForTimeout(100);
  await closeDialog();
  tip = await hint('.service-nav [data-service="search"]');
  check(tip[0] === `Cerca (${modK})`, "default back in the tooltip");
  // e) A category is never remembered (P9 SV-03); the query goes everywhere.
  await page.goto(base + "#home");
  await page.locator(".service-nav").waitFor();
  await openPalette();
  await search("@personaggi liv");
  check(
    (await page.locator("#dialog [data-cmdk-filter]").inputValue()) === "characters",
    "category",
  );
  await closeDialog();
  await page.goto(base + "#library");
  await page.locator(".service-nav").waitFor();
  await openPalette();
  check((await page.locator("#dialog [data-cmdk-filter]").inputValue()) === "", "not elsewhere");
  check((await input.inputValue()) === "liv", "query kept elsewhere");
  await closeDialog();
  await page.goBack();
  await page.waitForFunction(() => location.hash.startsWith("#home"));
  await openPalette();
  check(
    (await page.locator("#dialog [data-cmdk-filter]").inputValue()) === "",
    "category not back even on its page",
  );
  await closeDialog();
  // f) Spells tab: nonsense finds no spell.
  await page.goto(base + "#characters?id=livia&tab=spells");
  await page.locator('[data-character-tab="spells"][aria-current="page"]').waitFor();
  await openPalette();
  await search("qqqzzzxx");
  check((await optionTexts()).length === 0, "nonsense on the Spells tab: nothing");
  await search("dardo di fuoco");
  await options.filter({ hasText: "Scheda di Livia" }).first().click();
  await page.waitForTimeout(150);
  check(
    decodeURIComponent(await page.evaluate(() => location.hash)).includes("tab=spells"),
    "sheet spell row stays on the sheet",
  );
  ok(
    "review fixes: key tooltips, typo Enter inert, fixed keys, editor refusals, category per page",
  );

  // g) Revoked membership (separate browser context): no campaign chat in search.
  const revoked = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const rpage = await revoked.newPage();
  rpage.on("pageerror", (error) => errors.push("revoked: " + error.message));
  await rpage.goto(base);
  await rpage.evaluate(async () => {
    const { createInitialState } = await import("/state.mjs");
    const s = createInitialState();
    s.campaign.members = [
      { id: "player", name: "Player", role: "player", active: false },
      { id: "dm", name: "DM", role: "dm", active: true },
    ];
    s.actors.doran.owner = "dm";
    s.actors.doran.name = "Nome del compagno riservato";
    localStorage.setItem("d20-studio-blueprint-v1", JSON.stringify(s));
  });
  await rpage.reload();
  await rpage.locator(".service-nav").waitFor();
  await rpage.locator('.service-nav [data-service="search"]').click();
  for (const text of ["Nome del compagno", "corda"]) {
    await rpage.locator("#dialog [name=query]").fill(text);
    await rpage.waitForTimeout(100);
    const list = await rpage.locator("#search-results").innerText();
    check(!list.includes("riservato"), "former member search leaked: " + text);
    // The campaign-integration reproduction: the former companion's name finds nothing
    // (the player's own sheet, with its rope, stays searchable).
    if (text === "Nome del compagno")
      check(list.includes("Nessun risultato"), "former member: no result");
  }
  await revoked.close();
  // h) A failing source is named instead of a silent "no result".
  const failing = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const fpage = await failing.newPage();
  await fpage.goto(base + "?fixture=failing-extension#home");
  await fpage.locator(".service-nav").waitFor();
  await fpage.locator('.service-nav [data-service="search"]').click();
  await fpage.locator("#dialog [name=query]").fill("zzqqxx");
  await fpage.waitForTimeout(100);
  check(
    (await fpage.locator("#dialog [data-cmdk-status]").innerText()).includes(
      "non hanno risposto: Ricerca guasta",
    ),
    "failing source named in the status",
  );
  check(
    (await fpage.locator("#search-results").innerText()).includes("non hanno risposto"),
    "empty list says a source did not answer",
  );
  await fpage.screenshot({ path: dir + "b23-16-failed-source.png" });
  await failing.close();
  ok("revoked membership hides campaign chat; a failing source is reported");

  check(!errors.length, "page errors: " + errors.join(" | "));
  await context.close();
  return passed.join("\n");
}
