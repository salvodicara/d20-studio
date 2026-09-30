async (rootPage) => {
  // B11 registry smoke, rewritten by B61 (24/09/2026) for an app where the wave-1 areas
  // are built: it no longer assumes that no area is loaded, the bell is B24's notification
  // centre, search is B23's palette, Home is B30's page and area drawers are tabs of the
  // Table's right sidebar. Uses the sample fixture (?fixture=sample-extension), the failing
  // fixture (?fixture=failing-extension) and synthetic modules served by request
  // interception. Synthetic data only; resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B61/registry-smoke/";
  const context = await rootPage
    .context()
    .browser()
    // R8 refresh (27/09): the offline area's service worker (B52) answers module requests
    // before page.route can, so the synthetic broken module of step 15 would never load.
    .newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  const page = await context.newPage(),
    passed = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const button = (name, scope = page) => scope.getByRole("button", { name, exact: true });
  const noOverflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  const content = () => page.locator("#content").innerText();
  const go = async (hash, fixture = "sample-extension") => {
    await page.goto(base + (fixture ? "?fixture=" + fixture : "") + "#" + hash);
    await page.locator("#content").waitFor();
  };
  // B56 keeps a landed check screen modal; table dice never hold the next click (B61).
  const settleDice = async () => {
    if (await page.locator('[data-dice3d-layer][data-layout="check"]:not([hidden])').count())
      await page.keyboard.press("Escape");
  };
  // Map tools live in toolbar groups (B61): open the tool's group when it is not shown.
  const pickTool = async (id) => {
    const chip = page.locator(`.map-toolbar [data-tool="${id}"]`);
    if (!(await chip.isVisible()))
      await page.locator(`.map-tool-cluster:has([data-tool="${id}"]) [data-tool-group]`).click();
    await chip.click();
  };
  const planned = async () =>
    page.evaluate(async () => {
      const { PLANNED_EXTENSIONS } = await import("/extensions.mjs");
      return PLANNED_EXTENSIONS.map((a) => ({ id: a.id, backlog: a.backlog, it: a.title.it }));
    });

  // 1. Without fixtures: the report lists all planned areas, each by status, none failed;
  // nothing of the sample (page, stylesheet, navigation entry) is in the app.
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("heading", { name: "La prossima avventura", level: 1 }).waitFor();
  check(
    !(await page.locator('[data-nav="sample-extension"]').count()),
    "Sample page visible without fixture",
  );
  check(
    !(await page.locator('link[data-extension="sample-extension"]').count()),
    "Sample stylesheet linked without the fixture",
  );
  const plan = await planned();
  const linked = await page
    .locator("link[data-extension]")
    .evaluateAll((links) => links.map((l) => l.dataset.extension));
  await button("Cosa è pronto").click();
  const plain = await page.locator("#dialog .ext-report").innerText();
  const counts = plain.match(/(\d+) pronte · (\d+) da costruire · (\d+) con errori/);
  check(
    counts && Number(counts[1]) + Number(counts[2]) + Number(counts[3]) === plan.length,
    `Report does not list the ${plan.length} planned areas: ` + plain.slice(0, 120),
  );
  check(Number(counts[3]) === 0, "A planned area failed to load: " + plain);
  check(Number(counts[1]) >= 22, "Fewer ready areas than wave 1 built: " + counts[0]);
  const ready = plan.filter((a) => plain.includes(`${a.backlog} · ${a.it} — attiva`));
  check(
    ready.length === Number(counts[1]),
    `Ready areas not listed one per line (${ready.length} vs ${counts[1]})`,
  );
  check(
    linked.every((id) => ready.some((a) => a.id === id)),
    "A stylesheet is linked for an area not reported ready: " + linked.join(","),
  );
  if (Number(counts[2])) {
    await page.locator("#dialog summary", { hasText: "Ancora da costruire" }).click();
    const all = await page.locator("#dialog .ext-report").innerText();
    check(
      plan.filter((a) => !ready.includes(a)).every((a) => all.includes(`${a.backlog} · ${a.it}`)),
      "Not-built areas not named in plain words",
    );
  }
  await button("Continua la visita").click();
  passed.push(
    `No fixture: report ${counts[0]} (${plan.length} planned), every ready area listed as active, the rest named; no sample page or stylesheet`,
  );

  // 2. Sample fixture: page and navigation order, styles only for the loaded area.
  await go("sample-extension");
  await page.getByRole("heading", { name: "Pagina di prova", level: 1 }).waitFor();
  const nav = await page.locator(".app-header nav .nav-link").allInnerTexts();
  check(
    nav.join("|") === "Inizio|Personaggi|Prova|Campagne|Biblioteca",
    "Navigation order: " + nav.join("|"),
  );
  check(
    (await page.locator('[data-nav="sample-extension"].active').count()) === 1,
    "Area page not marked active",
  );
  check(
    (await page.locator('link[data-extension="sample-extension"]').count()) === 1,
    "Area stylesheet not linked once",
  );
  check(
    (await page
      .locator(".sample-extension-panel")
      .evaluate((el) => getComputedStyle(el).outlineStyle)) === "dashed",
    "Area stylesheet not applied",
  );
  passed.push("Sample page between Characters and Campaigns, active, own stylesheet applied");

  // 3. State slice: button and shortcut commit, reload keeps, Undo restores the snapshot
  // slice but keeps the preserve slice.
  await button("Aggiungi nota").click();
  await page.locator(".sample-extension-panel li", { hasText: "Nota" }).nth(1).waitFor();
  await page.locator("#content").focus();
  await page.keyboard.press("Control+Shift+N");
  await page.locator(".sample-extension-panel li", { hasText: "Comando" }).waitFor();
  let data = await stored();
  check(
    data.ext["sample-extension"].notes.length === 3 && data.extVersions["sample-extension"] === 2,
    "Slice not persisted after commits",
  );
  check(
    data.ext["sample-extension-log"].entries.length === 2,
    "Preserve slice not written in the same commit",
  );
  await page.reload();
  await page.locator(".sample-extension-panel li").nth(2).waitFor();
  check((await page.locator(".sample-extension-panel li").count()) === 3, "Reload lost area notes");
  await button("Aggiungi nota").click();
  await page.locator(".sample-extension-panel li").nth(3).waitFor();
  await go("table");
  await page.locator("#battle-map").waitFor();
  await button("Annulla ultima modifica").click();
  data = await stored();
  check(data.ext["sample-extension"].notes.length === 3, "Undo did not restore the snapshot slice");
  check(
    data.ext["sample-extension-log"].entries.length === 3,
    "Undo removed the preserve slice entry",
  );
  check(data.log.at(-1).kind === "correction", "Undo did not record a correction");
  passed.push(
    "Slice: button + Ctrl+Shift+N commit, reload keeps 3 notes, Undo (bottom action bar) restores the snapshot slice and keeps the preserve log",
  );

  // 4. Area notifications in B24's centre (the bell), beside the pending requests.
  const bell = page.locator('.service-nav [data-service="requests"]');
  const bellLabel = await bell.getAttribute("aria-label");
  check(/^Notifiche e richieste · \d+ notifiche$/.test(bellLabel), "Bell label: " + bellLabel);
  await bell.click();
  const centre = page.locator("#dialog [data-notifications-centre]");
  await centre.waitFor();
  const sample = centre.locator("li", { hasText: "Nota aggiunta" });
  check((await sample.count()) === 3, "Area notifications not listed in the centre");
  check(
    (await page.locator("#dialog [data-notifications-requests]").count()) === 1,
    "Rolls and results no longer reachable from the centre",
  );
  await sample.first().locator("[data-notifications-open]").click();
  await page.waitForURL(/#sample-extension\?id=n/);
  passed.push(
    `Bell (${bellLabel}): 3 area notifications beside the requests, one opens its target`,
  );

  // 5. Header service of the area and search provider (B23 palette).
  await button("Informazioni di prova").click();
  await page.locator("#dialog", { hasText: "Servizio" }).waitFor();
  await button("Annulla").click();
  await button("Cerca").click();
  await page.locator("#dialog [name=query]").fill("prima");
  await page.locator("#dialog [data-cmdk-option]", { hasText: "Prima nota" }).first().click();
  await page.waitForURL(/#sample-extension\?id=n1/);
  await button("Cerca").click();
  await page.locator("#dialog [name=query]").fill("prova");
  await page.locator("#dialog [data-cmdk-option]").first().waitFor();
  const found = await page.locator("#dialog [data-cmdk-option]").allInnerTexts();
  check(
    found.some((text) => /(^|\n)Prova(\n|$)/.test(text.trim())),
    "Area page missing from search: " + found.join(" / "),
  );
  await page.keyboard.press("Escape");
  passed.push("Header service opens its dialog; search lists the area page and provider results");

  // 6. Home widget (B30's Home), placed by its order. Visual pass 2 (30/09/2026) moved the
  // next appointment from order 30 to 11 (beside «continue playing»), so the fixture widget
  // (order 15) now follows it and still precedes the Members widget (order 35).
  await go("home");
  await page.locator('[data-ext-slot="home-widget:sample-extension-widget"]').waitFor();
  const slots = await page
    .locator('[data-ext-slot^="home-widget:"]')
    .evaluateAll((els) => els.map((el) => el.getAttribute("data-ext-slot")));
  const widget = slots.indexOf("home-widget:sample-extension-widget");
  const appointment = slots.indexOf("home-widget:appointment");
  const members = slots.indexOf("home-widget:campaign-members-home");
  check(
    widget >= 0 && (appointment < 0 || appointment < widget) && (members < 0 || widget < members),
    "Home widget order: " + slots.join(","),
  );
  passed.push("Home widget rendered on the Home page by its order (after the appointment block)");

  // 7. Campaign section between Journal and World (other areas' sections around it).
  await go("campaign");
  const sections = await page.locator(".campaign-sidebar nav .nav-link").allInnerTexts();
  const at = (name) => sections.indexOf(name);
  check(
    at("Diario") >= 0 &&
      at("Diario") < at("Sezione di prova") &&
      at("Sezione di prova") < at("Mondo"),
    "Campaign sections: " + sections.join("|"),
  );
  await button("Sezione di prova").click();
  await page.locator('[data-ext-slot="campaign-section:sample-extension-section"]').waitFor();
  check((await content()).includes("Sezione della campagna"), "Campaign section content missing");
  check(
    (await page.locator(".campaign-sidebar .nav-link.active").innerText()) === "Sezione di prova",
    "Campaign section not active",
  );
  passed.push("Campaign section between Journal and World, rendered and active");

  // 8. Sheet tab (characters only) and sheet box on Extras.
  await go("characters?id=livia&tab=actions");
  await button("Scheda di prova").click();
  check(
    (await page.locator('[data-ext-slot="sheet-tab:sample-extension-tab"]').innerText()).includes(
      "Livia",
    ),
    "Sheet tab content missing",
  );
  await button("Extra").click();
  await page.locator('[data-ext-slot="sheet-section:sample-extension-extras"]').waitFor();
  passed.push("Sheet tab on Livia and sheet box on Extras");

  // 9. Library collection beside the core scopes.
  await go("library");
  await button("Raccolta di prova").click();
  await page.locator('[data-ext-slot="library-section:sample-extension-library"]').waitFor();
  check(
    (await page
      .locator('[data-library-scope="sample-extension-library"][aria-current="page"]')
      .count()) === 1,
    "Library collection not current",
  );
  passed.push("Library collection tab and content");

  // 10. Table as player: the tool joins the Ping group (B61), the layer draws above the
  // tokens, the DM-only sidebar tab is absent.
  await go("table");
  await page.locator("#battle-map").waitFor();
  check(
    !(await page.locator('[data-table-drawer="sample-extension-panel"]').count()),
    "DM tab visible to the player",
  );
  const layerAboveTokens = await page.locator("#battle-map").evaluate((svg) => {
    const layer = svg.querySelector('[data-ext-slot="map-layer:sample-extension-marks"]');
    const tokens = svg.querySelector("#tokens");
    return (
      Boolean(layer) &&
      Boolean(tokens.compareDocumentPosition(layer) & Node.DOCUMENT_POSITION_FOLLOWING) &&
      layer.getAttribute("pointer-events") === "none"
    );
  });
  check(layerAboveTokens, "Map layer not drawn above the tokens without pointer events");
  check(
    (await page
      .locator('.map-tool-cluster:has([data-tool="sample-extension-ping"]) [data-tool-group]')
      .getAttribute("data-tool-group")) === "ping",
    "The sample tool did not join the Ping group",
  );
  await pickTool("sample-extension-ping");
  check(
    (await button("Segnale di prova").getAttribute("aria-pressed")) === "true",
    "Area tool not active",
  );
  const before = await page.locator("[data-actor=livia]").getAttribute("transform");
  // An empty spot of the scene (no token, door or area layer under it), wherever the
  // map is drawn at this width.
  const spot = await page.locator("#battle-map").evaluate((svg) => {
    const p = svg.createSVGPoint();
    p.x = 820;
    p.y = 140;
    const q = p.matrixTransform(svg.getScreenCTM());
    const box = svg.getBoundingClientRect();
    return { x: q.x - box.left, y: q.y - box.top };
  });
  await page.locator("#battle-map").click({ position: spot });
  check(
    /^Segnale \d+$/.test(await page.locator("#map-message").innerText()),
    "Area tool did not receive the map click",
  );
  check(
    (await page.locator("[data-actor=livia]").getAttribute("transform")) === before,
    "Map click with the area tool moved a token",
  );
  await page.locator('.action-dock [data-tool="move"]').click();
  passed.push(
    "Player table: area tool in the Ping group receives map clicks without moving tokens; layer above tokens; no DM tab",
  );

  // 11. DM: the sidebar tab and the preparation section; player preparation stays reserved.
  await page.getByRole("combobox", { name: "Visita come" }).selectOption("dm");
  const tab = page.locator('[role="tab"][data-table-drawer="sample-extension-panel"]');
  await tab.click();
  await page.locator("#table-drawer").waitFor();
  check(
    (await page.locator("#table-drawer").innerText()).includes("Il cortile"),
    "Tab panel does not show the scene",
  );
  check(
    (await tab.getAttribute("aria-selected")) === "true" &&
      (await tab.getAttribute("aria-expanded")) === "true",
    "Tab not selected",
  );
  check(
    (await tab.getAttribute("title")) === "Pannello del DM",
    "Tab label not on hover: " + (await tab.getAttribute("title")),
  );
  await button("Chiudi pannello").click();
  check(!(await page.locator("#table-drawer").count()), "Tab panel did not close");
  check(
    (await page
      .locator('[role="tab"][data-table-tab="creature"]')
      .getAttribute("aria-selected")) === "true",
    "Closing did not return to the Creature tab",
  );
  await go("preparation");
  await button("Preparazione di prova").click();
  await page
    .locator('[data-ext-slot="preparation-section:sample-extension-prep"]', { hasText: "Solo DM" })
    .waitFor();
  // R8 refresh (27/09): B62 grouped Preparation's strip; the core Scene group (P7: one scene
  // list and editor) carries a count («Scene 6»), so the group is pressed by its id.
  await page.locator('[data-prep-group="scenes"]').click();
  await button("Nuova scena").waitFor();
  passed.push(
    "DM sidebar tab opens (selected, label on hover) and closes back to the Creature tab; DM preparation section and back to Scenes",
  );

  // 12. Settings merged into Preferences (B22) with device, personal and campaign scopes.
  await button("Preferenze").click();
  const legends = await page.locator("#dialog .ext-settings legend").allInnerTexts();
  check(
    ["Su questo dispositivo", "Personali", "Campagna"].every((l) => legends.includes(l)),
    "Setting scopes: " + legends.join("|"),
  );
  await page.locator('#dialog input[name="setting:sample-extension-rules.radius"]').fill("5");
  await page.locator('#dialog input[name="setting:sample-extension-display.compact"]').check();
  await button("Salva preferenze").click();
  data = await stored();
  check(
    data.ext["core-settings"].campaign["sample-extension-rules.radius"] === 5,
    "Campaign setting not saved by the DM",
  );
  check(
    (await page.evaluate(() =>
      localStorage.getItem("d20-studio-setting:sample-extension-display.compact"),
    )) === "true",
    "Device setting not saved",
  );
  await page.getByRole("combobox", { name: "Visita come" }).selectOption("player");
  await button("Preferenze").click();
  check(
    await page.locator('#dialog input[name="setting:sample-extension-rules.radius"]').isDisabled(),
    "Player can edit a campaign setting",
  );
  await page.locator('#dialog input[name="setting:sample-extension-personal.nickname"]').fill("Vi");
  await button("Salva preferenze").click();
  data = await stored();
  check(
    data.ext["core-settings"].personal.player["sample-extension-personal.nickname"] === "Vi",
    "Personal setting not saved",
  );
  check(
    data.ext["core-settings"].campaign["sample-extension-rules.radius"] === 5,
    "Player save changed the campaign setting",
  );
  passed.push(
    "Preferences: device/personal/campaign groups; DM campaign value, device value, player personal value; player cannot edit campaign",
  );

  // 13. Reset reseeds the slices.
  await button("Ripristina esempio").click();
  await button("Ripristina").click();
  await go("sample-extension");
  await page.locator(".sample-extension-panel li").first().waitFor();
  data = await stored();
  check(
    data.ext["sample-extension"].notes.length === 1 &&
      data.ext["sample-extension-log"].entries.length === 0,
    "Reset did not reseed the slices",
  );
  check(
    (await page.locator(".sample-extension-panel li").allInnerTexts()).join("|") === "Prima nota",
    "Reset page shows old notes",
  );
  passed.push("Reset example reseeds area slices");

  // 14. Report and layout at 1440 and 390.
  await button("Cosa è pronto").click();
  const report = await page.locator("#dialog .ext-report").innerText();
  check(
    report.includes("Pronte") &&
      /B11 · Estensione di prova \(sample-extension\) — attiva · \d+ contributi/.test(report),
    "Report does not list the fixture as ready: " + report.slice(0, 300),
  );
  await button("Continua la visita").click();
  for (const hash of [
    "home",
    "sample-extension",
    "table",
    "campaign?tab=sample-extension-section",
  ]) {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await go(hash);
      await page.waitForTimeout(150);
      check(await noOverflow(), `Horizontal overflow on #${hash} at ${width}`);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await go("home");
  await page.screenshot({ path: shots + "sample-home-390.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  passed.push(
    "Report lists the fixture as ready; no overflow at 1440/390 on home, area page, table, campaign section",
  );

  // 15. Failing fixture plus a module that fails to register: both circumscribed.
  await page.route("**/tests/fixtures/broken-load.mjs", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: 'export function register(registry) { registry.registerStyles("data:text/css,body{outline:3px solid red}"); registry.add("route", { id: "broken-load", label: { it: "Rotta rotta", en: "Broken route" }, nav: true, render: () => "" }); throw new Error("register exploded"); }',
    }),
  );
  await go("home", "failing-extension,broken-load");
  await page.getByRole("heading", { name: "La prossima avventura", level: 1 }).waitFor();
  const failingNav = await page.locator(".app-header nav .nav-link").allInnerTexts();
  check(
    failingNav.includes("Area guasta") && !failingNav.includes("Rotta rotta"),
    "Transactional registration broken: " + failingNav.join("|"),
  );
  check(
    !(await page.locator('link[data-extension="broken-load"]').count()),
    "Failed area stylesheet linked",
  );
  const homeError = page.locator(
    '[data-ext-slot="home-widget:failing-extension-widget"] .ext-error',
  );
  check(
    (await homeError.innerText()).includes(
      "Riquadro guasto non è disponibile in questo momento. Il resto dell’app continua a funzionare.",
    ),
    "Home widget failure not circumscribed",
  );
  check(
    (await page.locator('[data-ext-slot="home-widget:appointment"]').count()) === 1,
    "Other Home blocks lost next to the failing widget",
  );
  await page.locator(".ext-alert").click();
  const failingReport = await page.locator("#dialog .ext-report").innerText();
  check(
    failingReport.includes("Con errori · non caricate") &&
      failingReport.includes("Estensione di prova (broken-load)") &&
      failingReport.includes("Dettaglio tecnico: register exploded"),
    "Failed load not reported plainly",
  );
  check(
    /Estensione di prova \(failing-extension\) — attiva · \d+ contributi · \d+ avvisi circoscritti/.test(
      failingReport,
    ),
    "Runtime failures not counted per area",
  );
  await button("Continua la visita").click();
  await button("Area guasta").click();
  await page
    .locator("#content .ext-error", { hasText: "Area guasta non è disponibile in questo momento" })
    .waitFor();
  await button("Servizio guasto").click();
  await page
    .locator("#toast.shown.error", { hasText: "Servizio guasto non ha funzionato" })
    .waitFor();
  await page.keyboard.press("Control+Shift+E");
  await page
    .locator("#toast.shown.error", { hasText: "Comando guasto non ha funzionato" })
    .waitFor();
  await button("Cerca").click();
  await page.locator("#dialog [name=query]").fill("Livia");
  await page.locator("#dialog [data-cmdk-option]", { hasText: "Livia" }).first().waitFor();
  await page.keyboard.press("Escape");
  await go("table", "failing-extension,broken-load");
  await page.locator("#battle-map").waitFor();
  check(
    (await page
      .locator('[data-ext-slot="map-layer:failing-extension-layer"][data-ext-failed]')
      .count()) === 1,
    "Failing layer not contained",
  );
  check(
    (await page.locator(".table-ext-panel", { hasText: "Pannello guasto" }).innerText()).includes(
      "Pannello guasto non è disponibile",
    ),
    "Failing panel not contained",
  );
  await pickTool("failing-extension-tool");
  await page
    .locator("#toast.shown.error", { hasText: "Strumento guasto non ha funzionato" })
    .waitFor();
  await page.locator('.action-dock [data-tool="move"]').click();
  const start = await page.locator("[data-actor=livia]").getAttribute("transform");
  await page.locator("#battle-map").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  check(
    (await page.locator("[data-actor=livia]").getAttribute("transform")) !== start,
    "Core movement broken next to a failing area",
  );
  await button("Annulla ultima modifica").click();
  check(
    (await page.locator("[data-actor=livia]").getAttribute("transform")) === start,
    "Core Undo broken next to a failing area",
  );
  await page.locator('.service-nav [data-service="requests"]').click();
  await page.locator("#dialog [data-notifications-centre]").waitFor();
  check(
    !(await page.locator("#dialog li", { hasText: "guast" }).count()),
    "Failing notifications leaked into the bell",
  );
  await page.locator("#dialog [data-notifications-requests]").click();
  await page.locator("#dialog", { hasText: "Tiri e risultati" }).waitFor();
  await button("Torna al gioco").click();
  await settleDice();
  await button("App").click();
  await page.locator('#dialog [data-jump="characters"]').click();
  await page.getByRole("heading", { name: "Personaggi", level: 1 }).waitFor();
  passed.push(
    "Failing area: page/home/panel/layer contained in place, service/command/tool toasts, failed registration reported and absent, core search/move/undo/navigation still work",
  );

  // 16. Events derived from commits and shell changes, and an area draft guard protecting
  // navigation (link, hash/Back, role change), through a synthetic probe area.
  await page.route("**/tests/fixtures/probe-extension.mjs", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `export function register(registry) {
        const events = []; let draft = false;
        for (const name of ['commit', 'navigate', 'role-changed', 'language-changed', 'reset'])
          registry.on(name, (payload) => events.push(name + (payload.correction ? '*' : '')));
        registry.add('route', { id: 'probe-extension', label: { it: 'Sonda DM', en: 'DM probe' }, roles: ['dm'], nav: true,
          render: (ctx) => '<h1>' + ctx.t('Sonda DM', 'DM probe') + '</h1>' });
        registry.add('home-widget', { id: 'probe-extension-events', label: { it: 'Eventi', en: 'Events' }, order: 5,
          render: () => '<ol data-probe-events>' + events.map((e) => '<li>' + e + '</li>').join('') + '</ol>' });
        registry.add('command', { id: 'probe-extension.draft', label: { it: 'Apri bozza', en: 'Open draft' }, shortcut: 'Mod+Shift+D',
          run: (ctx) => { draft = true; ctx.toast('Bozza di prova aperta'); } });
        registry.add('draft-guard', { id: 'probe-extension-guard', label: { it: 'Bozza', en: 'Draft' }, hasDraft: () => draft,
          confirm: (ctx, proceed) => ctx.dialog('Bozza di prova non salvata', '<p>Uscire?</p>',
            { submitLabel: 'Esci senza salvare', onSubmit: () => { draft = false; proceed(); } }) });
      }`,
    }),
  );
  await go("table", "probe-extension");
  await page.locator("#battle-map").waitFor();
  const origin = await page.locator("[data-actor=livia]").getAttribute("transform");
  await page.locator("#battle-map").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  check(
    (await page.locator("[data-actor=livia]").getAttribute("transform")) !== origin,
    "Probe move did not commit",
  );
  await button("Annulla ultima modifica").click();
  await page.getByRole("combobox", { name: "Visita come" }).selectOption("dm");
  await page.getByRole("combobox", { name: "Visita come" }).selectOption("player");
  await button("Preferenze").click();
  await page.locator("#dialog select[name=lang]").selectOption("en");
  await page.locator("#dialog button[type=submit]").click();
  await page.locator('.service-nav [data-service="preferences"]').click();
  await page.locator("#dialog select[name=lang]").selectOption("it");
  await page.locator("#dialog button[type=submit]").click();
  await go("home", "probe-extension");
  await page.locator("[data-probe-events]").waitFor();
  const events = await page.locator("[data-probe-events] li").allInnerTexts();
  const seq = events.join(",");
  check(/commit,.*commit\*/.test(seq), "Commit and correction events not derived: " + seq);
  check(
    events.filter((e) => e === "role-changed").length === 2 &&
      events.filter((e) => e === "language-changed").length === 2,
    "Shell events missing: " + seq,
  );
  check(events.filter((e) => e === "navigate").length >= 2, "Navigate events missing: " + seq);
  passed.push("Events: " + seq);
  // A DM-only area page: locked for the player, in the DM navigation, localized.
  await go("probe-extension", "probe-extension");
  await page
    .getByRole("heading", { name: "Pagina non disponibile per questo ruolo", level: 1 })
    .waitFor();
  check(
    !(await page.locator('[data-nav="probe-extension"]').count()),
    "DM-only page in the player navigation",
  );
  await page.getByRole("combobox", { name: "Visita come" }).selectOption("dm");
  await page.getByRole("heading", { name: "Sonda DM", level: 1 }).waitFor();
  check(
    (await page.locator('[data-nav="probe-extension"]').innerText()) === "Sonda DM",
    "DM-only page missing from DM navigation",
  );
  await button("Preferenze").click();
  await page.locator("#dialog select[name=lang]").selectOption("en");
  await page.locator("#dialog button[type=submit]").click();
  await page.getByRole("heading", { name: "DM probe", level: 1 }).waitFor();
  check(
    (await page.locator('[data-nav="probe-extension"]').innerText()) === "DM probe",
    "Area navigation label not localized",
  );
  await page.locator('.service-nav [data-service="preferences"]').click();
  await page.locator("#dialog select[name=lang]").selectOption("it");
  await page.locator("#dialog button[type=submit]").click();
  await page.getByRole("combobox", { name: "Visita come" }).selectOption("player");
  await page
    .getByRole("heading", { name: "Pagina non disponibile per questo ruolo", level: 1 })
    .waitFor();
  await go("home", "probe-extension");
  await page.getByRole("heading", { name: "La prossima avventura", level: 1 }).waitFor();
  passed.push(
    "DM-only area page: locked message for the player, DM navigation entry, EN/IT labels",
  );
  await page.locator("#content").focus();
  await page.keyboard.press("Control+Shift+D");
  await page.locator("#toast", { hasText: "Bozza di prova aperta" }).waitFor();
  await button("Personaggi").click();
  await page.getByRole("dialog", { name: "Bozza di prova non salvata" }).waitFor();
  await button("Annulla").click();
  check(
    await page.getByRole("heading", { name: "La prossima avventura", level: 1 }).isVisible(),
    "Cancelled guard still left home",
  );
  await page.goto(base + "?fixture=probe-extension#characters");
  await page.getByRole("dialog", { name: "Bozza di prova non salvata" }).waitFor();
  check(/#home\??$/.test(page.url()), "Hash departure not restored: " + page.url());
  await button("Annulla").click();
  await page.getByRole("combobox", { name: "Visita come" }).selectOption("dm");
  await page.getByRole("dialog", { name: "Bozza di prova non salvata" }).waitFor();
  await button("Annulla").click();
  check(
    (await page.getByRole("combobox", { name: "Visita come" }).inputValue()) === "player",
    "Cancelled guard changed role",
  );
  await button("Personaggi").click();
  await button("Esci senza salvare").click();
  await page.getByRole("heading", { name: "Personaggi", level: 1 }).waitFor();
  await button("Inizio").click();
  await page.getByRole("heading", { name: "La prossima avventura", level: 1 }).waitFor();
  check(!(await page.getByRole("dialog").count()), "Discarded draft still guarded navigation");
  passed.push(
    "Area draft guard protects link, hash and role departures; cancel keeps the view, confirm proceeds once",
  );

  check(errors.length === 0, errors.join("; "));
  await context.close();
  return { passed, errors };
}
