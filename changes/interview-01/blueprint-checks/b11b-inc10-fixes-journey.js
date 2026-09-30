async (rootPage) => {
  // Browser checks for the B11b and increment-10 review fixes
  // (changes/interview-01/blueprint-b11b-inc10-fixes.md). Two throwaway areas are served by
  // request interception only; everything else is the sample demo. Synthetic data only;
  // resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B11b-fix/";
  const context = await rootPage
    .context()
    .browser()
    // Refreshed by the round-2 regression (29/09/2026): since P1 IN-11 the app registers a
    // pass-through service worker, and a request a service worker answers never reaches
    // page.route, so the two throwaway areas would be fetched from the server (404) once it
    // controls the page. Blocked here as in registry-smoke-journey.
    .newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  const page = await context.newPage();
  const passed = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const button = (name) => page.getByRole("button", { name, exact: true });
  const toast = () => page.locator("#toast").innerText();
  const log = () => page.evaluate(() => [...(globalThis.__fixLog ?? [])]);
  const clearLog = () =>
    page.evaluate(() => {
      (globalThis.__fixLog ??= []).length = 0;
    });
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const fresh = async (url) => {
    await page.goto(url);
    await page.evaluate((k) => localStorage.removeItem(k), key);
    await page.reload();
    await page.locator("#content").waitFor();
  };
  await page.route("**/tests/fixtures/fix-probe.mjs", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `export function register(registry) {
        const log = (globalThis.__fixLog ??= []);
        registry.add('route', { id: 'fix-probe', label: { it: 'Sonda', en: 'Probe' }, nav: true, render: () => '<h1>Sonda</h1>' });
        registry.add('command', { id: 'fix-probe.rule', label: { it: 'Operazione sonda', en: 'Probe operation' }, shortcut: 'Mod+Shift+J',
          run: (ctx) => ctx.commit('x', () => { throw Error(ctx.t('Regola: bersaglio fuori portata', 'Rule: target out of range')); }) });
        registry.add('command', { id: 'fix-probe.shared', label: { it: 'Scrittura condivisa', en: 'Shared write' }, shortcut: 'Mod+Shift+K',
          run: (ctx) => ctx.commit('probe shared', () => {}) });
        registry.add('command', { id: 'fix-probe.broken', label: { it: 'Comando rotto', en: 'Broken command' }, shortcut: 'Mod+Shift+B',
          run: () => { null.boom(); } });
        registry.add('table-tool', { id: 'fix-probe-tool', label: { it: 'Sonda', en: 'Probe' },
          activate: (ctx, table) => { log.push('activate'); table.message('SONDA ATTIVA'); },
          deactivate: () => log.push('deactivate') });
        registry.add('table-tool', { id: 'measure', replaces: true, label: { it: 'Righello', en: 'Ruler' }, icon: 'dice', onClick: () => log.push('ruler-click') });
        registry.add('campaign-section', { id: 'fix-probe-dm', label: { it: 'Sezione DM', en: 'DM section' }, roles: ['dm'], render: () => '<p data-probe-dm>DM</p>' });
        registry.add('draft-guard', { id: 'fix-probe-guard', label: { it: 'Bozza sonda', en: 'Probe draft' },
          hasDraft: () => globalThis.__fixDraft === true,
          confirm: (ctx, proceed) => { log.push('guard-asked'); globalThis.__fixDraft = false; proceed(); } });
      }`,
    }),
  );
  await page.route("**/tests/fixtures/fix-keys.mjs", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `export function register(registry) {
        const log = (globalThis.__fixLog ??= []);
        registry.add('command', { id: 'fix-keys.enter', label: { it: 'Invio sonda', en: 'Probe enter' }, shortcut: 'Enter', context: 'characters', run: () => log.push('enter-command') });
        registry.add('command', { id: 'fix-keys.undo', label: { it: 'Annulla sonda', en: 'Probe undo' }, shortcut: 'Mod+Z', context: 'characters', run: () => log.push('mod-z-command') });
      }`,
    }),
  );

  // The probe replaces the core Measure tool. Since W1a the built area B18 (annotations)
  // replaces both replaceable core tools (Measure, Pointer), and a second replacement of the
  // same core id fails the whole probe area. Pages that load fix-probe therefore load without
  // B18 (answered "not built"); every other page keeps it.
  await page.route("**/annotations.mjs", (route) =>
    /[?&]fixture=[^#]*fix-probe/.test(route.request().frame().url())
      ? route.fulfill({ status: 404, body: "" })
      : route.continue(),
  );

  // 1. A rule refusal from an area command shows its reason; no warning, no notice.
  await fresh(base + "?fixture=fix-probe#home");
  await page.getByRole("heading", { name: "La prossima avventura", level: 1 }).waitFor();
  await page.locator("#content").focus();
  await page.keyboard.press("Control+Shift+J");
  await page.locator("#toast.shown.error").waitFor();
  check(
    (await toast()) === "Regola: bersaglio fuori portata",
    "Rule refusal toast: " + (await toast()),
  );
  check(
    (await page.locator("#ext-notice").innerText()) === "",
    "Refusal counted as an area warning",
  );
  // Offline: the shared write says why, and is no warning either.
  await button("Preferenze").click();
  await page.locator("#dialog [name=offline]").check();
  await button("Salva preferenze").click();
  await page.locator("#content").focus();
  await page.keyboard.press("Control+Shift+K");
  await page.locator("#toast.shown.error", { hasText: "Sei senza rete" }).waitFor();
  check(
    (await page.locator("#ext-notice").innerText()) === "",
    "Offline refusal counted as a warning",
  );
  passed.push("Area command refusals: rule reason and offline message shown, no area warning");

  // 2. A real failure updates the strip notice at once; the notice opens the report there.
  await page.keyboard.press("Control+Shift+B");
  await page
    .locator("#toast.shown.error", { hasText: "Comando rotto non ha funzionato" })
    .waitFor();
  await page
    .locator("#ext-notice .ext-alert", { hasText: "Aree aggiuntive: 1 con avvisi" })
    .waitFor({ timeout: 2000 });
  await page.locator("#ext-notice .ext-alert").click();
  await page.locator("#dialog .ext-report").waitFor();
  await page.waitForTimeout(150);
  const reportTop = await page
    .locator("#dialog .ext-report")
    .evaluate((el) => el.getBoundingClientRect().top);
  const viewport = await page.evaluate(() => window.innerHeight);
  check(
    reportTop >= 0 && reportTop < viewport / 2,
    "Report not in view from the notice: top " + reportTop,
  );
  const report = await page.locator("#dialog .ext-report").innerText();
  check(
    report.includes("Il comando «Comando rotto» non ha funzionato."),
    "No plain warning sentence: " + report.slice(0, 400),
  );
  await page
    .locator("#dialog .ext-report")
    .screenshot({ path: dir + "report-plain-warning-1440.png" });
  await button("Continua la visita").click();
  passed.push(
    "Failing command: notice updated without navigation; notice opens the report in view with a plain sentence",
  );

  // 3. The page button of the shipped sample shows the offline refusal (no uncaught error).
  await fresh(base + "?fixture=sample-extension#sample-extension");
  await page.getByRole("heading", { name: "Pagina di prova", level: 1 }).waitFor();
  await button("Preferenze").click();
  await page.locator("#dialog [name=offline]").check();
  await button("Salva preferenze").click();
  await page.locator("#content").focus();
  await page.keyboard.press("Control+Shift+N");
  await page.locator("#toast.shown.error", { hasText: "Sei senza rete" }).waitFor();
  await button("Aggiungi nota").click();
  await page.waitForTimeout(150);
  check((await toast()).startsWith("Sei senza rete"), "Sample button toast: " + (await toast()));
  check(errors.length === 0, "Uncaught error from the sample button: " + errors.join("; "));
  check(
    (await page.locator("#ext-notice").innerText()) === "",
    "Sample offline refusal counted as a warning",
  );
  passed.push(
    "Sample page button and shortcut offline: same localized refusal, no page error, no warning",
  );

  // 4. A device setting that cannot be stored leaves language and offline mode unchanged.
  await fresh(base + "?fixture=sample-extension#home");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    globalThis.__restoreSetItem = () => (Storage.prototype.setItem = original);
    Storage.prototype.setItem = function (name, value) {
      if (String(name).startsWith("d20-studio-setting:")) throw Error("quota");
      return original.call(this, name, value);
    };
  });
  await button("Preferenze").click();
  await page.locator("#dialog [name=lang]").selectOption("en");
  await page.locator("#dialog [name=offline]").check();
  await page.locator('#dialog input[name="setting:sample-extension-display.compact"]').check();
  await button("Salva preferenze").click();
  await page
    .locator("#dialog .dialog-error", { hasText: "Questo dispositivo non può conservare" })
    .waitFor();
  check(
    (await page.evaluate(() => document.documentElement.lang)) === "it",
    "Language changed before the failed write",
  );
  await button("Annulla").click();
  await page.evaluate(() => globalThis.__restoreSetItem());
  await page.locator("#content").focus();
  await page.keyboard.press("Control+Shift+N");
  await page.waitForTimeout(150);
  check(
    !(await toast()).startsWith("Sei senza rete"),
    "Offline mode applied before the failed write",
  );
  passed.push("Preferences: a failing device write keeps the language and the online state");

  // 5. Plain Enter on a focused button activates it; Mod+Z in a text field stays the field's.
  await fresh(base + "?fixture=fix-keys#characters");
  await page.locator("[data-character-card]").first().waitFor();
  await clearLog();
  await page.getByRole("button", { name: "Apri scheda", exact: true }).first().focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(/#characters\?id=/);
  check(!(await log()).includes("enter-command"), "An area Enter command ran");
  await page.goto(base + "?fixture=fix-keys#characters");
  await page.locator("[data-character-filter]").fill("Livia");
  // ControlOrMeta: on macOS select-all is Cmd+A (Ctrl+A moves to the line start).
  await page.locator("[data-character-filter]").press("ControlOrMeta+A");
  const selected = await page
    .locator("[data-character-filter]")
    .evaluate((el) => el.selectionEnd - el.selectionStart);
  await page.locator("[data-character-filter]").press("Control+Z");
  check(selected === 5, "Select-all blocked in a text field: " + selected);
  check(!(await log()).includes("mod-z-command"), "Area Mod+Z ran inside a text field");
  await page.locator("#content").focus();
  await page.keyboard.press("Control+Z");
  check((await log()).includes("mod-z-command"), "Area Mod+Z did not run outside a text field");
  await page.getByRole("button", { name: "Cosa è pronto", exact: true }).click();
  const keysReport = await page.locator("#dialog .ext-report").innerText();
  check(
    keysReport.includes("Il comando «Invio sonda» resta senza scorciatoia: è già in uso."),
    "Enter conflict not reported: " + keysReport.slice(0, 500),
  );
  await button("Continua la visita").click();
  passed.push(
    "Keys: Enter opens the focused sheet, select-all and field undo stay in the field, Enter conflict reported",
  );

  // 6. Table tool lifecycle, replacement chip, role change and Reset.
  await fresh(base + "?fixture=fix-probe#table");
  await page.locator("#battle-map").waitFor();
  check(
    (await page.locator('[data-tool="measure"]').getAttribute("aria-label")) === "Righello",
    "Replacement chip label",
  );
  await clearLog();
  await page.locator('[data-tool="fix-probe-tool"]').click();
  await page.locator("#map-message", { hasText: "SONDA ATTIVA" }).waitFor();
  check(
    JSON.stringify(await log()) === '["activate"]',
    "Activate log: " + JSON.stringify(await log()),
  );
  await page.locator("#demo-role").selectOption("dm");
  await page.waitForTimeout(100);
  check(
    (await log()).includes("deactivate"),
    "Role change did not deactivate: " + JSON.stringify(await log()),
  );
  await page.locator("#demo-role").selectOption("player");
  await clearLog();
  await page.locator('[data-tool="fix-probe-tool"]').click();
  await button("Torna alla campagna").click();
  await page.waitForTimeout(100);
  check(
    JSON.stringify(await log()) === '["activate","deactivate"]',
    "Leaving the Table: " + JSON.stringify(await log()),
  );
  await button("Torna al Tavolo · Le lanterne di Bruma")
    .click()
    .catch(() => page.goto(base + "?fixture=fix-probe#table"));
  await page.locator("#battle-map").waitFor();
  check((await log()).at(-1) === "activate", "Returning to the Table did not re-activate");
  await button("Ripristina esempio").click();
  await button("Ripristina").click();
  await page.waitForTimeout(100);
  check((await log()).at(-1) === "deactivate", "Reset did not deactivate");
  passed.push(
    "Table tool: activate on the live table, deactivate on role change, leaving and Reset; replacement chip labelled",
  );

  // 7. Area draft still asked after a core draft; a hidden area section says so.
  await fresh(base + "?fixture=fix-probe#notes");
  await page.locator('[data-campaign-new="note"]').click();
  await page.locator('[data-campaign-path="data.title"]').fill("Nota sintetica");
  await page.evaluate(() => {
    globalThis.__fixDraft = true;
    (globalThis.__fixLog ??= []).length = 0;
  });
  await button("Biblioteca").click();
  await page.locator("[data-campaign-discard-unsaved]").click();
  await page.waitForURL(/#library/);
  check((await log()).includes("guard-asked"), "Area draft not asked after the core draft");
  await page.goto(base + "?fixture=fix-probe#campaign?tab=fix-probe-dm");
  await page.reload();
  await page
    .getByRole("heading", { name: "Sezione non disponibile per questo ruolo", level: 1 })
    .waitFor();
  check(!(await page.locator("[data-probe-dm]").count()), "DM section content shown to the player");
  await button("Torna alla panoramica").click();
  await page.getByRole("heading", { name: "Panoramica", level: 1 }).waitFor();
  passed.push("Core draft then area draft both asked; hidden area section locked with a way back");

  // 8. Phone: area pages wrap in the navigation; the DM Table toolbar wraps.
  await page.setViewportSize({ width: 390, height: 844 });
  await fresh(base + "?fixture=sample-extension,fix-probe#home");
  const nav = await page.locator(".app-header nav").evaluate((el) => ({
    clipped: [...el.querySelectorAll(".nav-link")]
      .filter(
        (l) =>
          l.getBoundingClientRect().right > el.getBoundingClientRect().right + 1 ||
          l.getBoundingClientRect().left < el.getBoundingClientRect().left - 1,
      )
      .map((l) => l.innerText),
    count: el.querySelectorAll(".nav-link").length,
    overflow: document.documentElement.scrollWidth > window.innerWidth,
  }));
  check(
    nav.count === 6 && !nav.clipped.length && !nav.overflow,
    "Phone navigation: " + JSON.stringify(nav),
  );
  await page.locator(".app-header").screenshot({ path: dir + "header-areas-390-fixed.png" });
  await fresh(base + "#table");
  await page.locator("#demo-role").selectOption("dm");
  await page.locator("#battle-map").waitFor();
  const dmWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  check(dmWidth <= 390, "DM Table overflow at 390: " + dmWidth);
  for (const name of ["Riposi", "Tempo", "Chat"]) {
    // B61: the Log is the sidebar's second tab (the phone's pinned tab bar), not a top button.
    // B62: that tab is «Chat» (Foundry's chat log tab), the Log its first sub-tab.
    const control = name === "Chat" ? page.getByRole("tab", { name, exact: true }) : button(name);
    const box = await control.boundingBox();
    check(box && box.x >= 0 && box.x + box.width <= 390, name + " off-screen at 390");
  }
  await page.screenshot({ path: dir + "table-dm-390-fixed.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  passed.push(
    "Phone 390: six nav items visible without clipping; DM Table toolbar wraps (no overflow)",
  );

  // 9. Increment 10: Undo of a death save and its request, then the same request reuses the face.
  const seedZero = async () => {
    await page.goto(base);
    await page.evaluate(async (k) => {
      const { createInitialState } = await import("/state.mjs");
      const c = await import("/conditions.mjs");
      const s = createInitialState();
      c.applyVitalityEvent(s, {
        eventId: "fix-zero",
        actorId: "livia",
        kind: "damage",
        amount: s.actors.livia.hp,
        source: { kind: "authored-demo", revision: "fix-journey" },
      });
      localStorage.setItem(k, JSON.stringify(s));
    }, key);
    await page.goto(base + "#characters?id=livia");
    await page.reload();
    await page.locator("#content [data-conditions-entry=livia]").waitFor();
  };
  await seedZero();
  await page.locator("#content [data-conditions-entry=livia]").click();
  await page.locator("#dialog [data-conditions-death-save]").click();
  await page.getByRole("dialog", { name: "Risolvi tiro", exact: true }).waitFor();
  await page.locator("[name=diceMode]").selectOption("physical");
  await page.locator("[name=face0]").fill("1");
  await button("Registra tiro").click();
  await button("Torna a Condizioni e stato").click();
  check(
    (await stored()).actors.livia.deathSaves.failures === 2,
    "Face 1 not recorded as two failures",
  );
  for (let i = 0; i < 2; i++) {
    await page.locator("#dialog [data-conditions-undo]").click();
    await page.waitForTimeout(200);
  }
  check(
    ((await stored()).actors.livia.deathSaves?.failures ?? 0) === 0,
    "Undo did not restore the count",
  );
  await page.locator("#dialog [data-conditions-death-save]").click();
  await page.getByRole("dialog", { name: "Riapplica risultato noto", exact: true }).waitFor();
  check(
    (await page.locator("#dialog").innerText()).includes("Livia · 1"),
    "Known face not offered",
  );
  await page.screenshot({ path: dir + "death-save-reapply.png" });
  await button("Riapplica risultato").click();
  await page.waitForTimeout(200);
  const afterRetry = await stored();
  check(
    afterRetry.actors.livia.deathSaves.failures === 2 && afterRetry.actors.livia.hp === 0,
    "Retry did not reuse face 1",
  );
  const saves = afterRetry.log.flatMap((e) => e.rolls ?? []).filter((r) => r.kind === "death-save");
  check(
    saves.length === 2 && saves[1].status === "reused" && saves[1].values[0] === 1,
    "History: " + JSON.stringify(saves.map((r) => [r.values, r.status])),
  );
  passed.push(
    "Death save: Undo of roll and request, the same request offers only Riapplica with face 1; history Riusato",
  );

  // 10. A pending out-of-initiative save expires when the creature's turn starts: one save.
  await seedZero();
  await page.locator("#content [data-conditions-entry=livia]").click();
  await page.locator("#dialog [data-conditions-death-save]").click();
  await page.keyboard.press("Escape");
  await page.evaluate(async (k) => {
    const { expireTurnEffects } = await import("/combat.mjs");
    const s = JSON.parse(localStorage.getItem(k));
    Object.assign(s.combat, {
      active: true,
      round: 1,
      turn: 0,
      order: ["livia", "goblin-1", "doran", "goblin-2"],
      encounterId: "fix",
    });
    expireTurnEffects(s, "livia", "start");
    localStorage.setItem(k, JSON.stringify(s));
  }, key);
  const pending = (await stored()).combatAttempts
    .filter((a) => a.kind === "vitality" && a.status === "pending")
    .map((a) => a.id);
  check(
    JSON.stringify(pending) === '["vitality:death-save:livia:turn:fix:1:livia"]',
    "Pending saves: " + JSON.stringify(pending),
  );
  passed.push(
    "Out-of-initiative save left pending expires at the turn start; one turn save remains",
  );

  // 11. Correct HP and status refuses 0 HP with the reason under the HP field.
  await fresh(base + "#characters?id=livia");
  await page.locator("#content [data-conditions-entry=livia]").click();
  await page.locator("[data-conditions-command=correct]").click();
  check(
    (await page.locator("#dialog [data-conditions-field=hp]").getAttribute("min")) === "1",
    "HP field minimum",
  );
  await page.locator("#dialog [data-conditions-field=hp]").fill("0");
  await page.locator("#dialog [data-conditions-field=reason]").fill("Synthetic data entry");
  await page.locator("[data-conditions-preview]").click();
  await page
    .locator("#conditions-error-hp", { hasText: "Una correzione non porta a 0 PF" })
    .waitFor();
  check(
    !(await page.locator("[data-conditions-apply]").isEnabled()),
    "Apply enabled for a correction to 0 HP",
  );
  check(
    (await page.locator("#dialog [data-conditions-field=hp]").getAttribute("aria-invalid")) ===
      "true",
    "HP field not invalid",
  );
  await page.screenshot({ path: dir + "correct-zero-refused.png" });
  check((await stored())?.actors?.livia?.hp !== 0, "Correction reached 0 HP");
  passed.push("Correct HP and status: 0 HP refused under the field, Apply disabled");

  check(errors.length === 0, errors.join("; "));
  await context.close();
  return { passed, errors };
};
