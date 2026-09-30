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
  // B60 Simulated AI assistant (declared simulation: no model, no network). Real clicks,
  // keys and touch: the DM turns it on with a disclosure, the player sees the consent
  // banner and chooses; Ask answers only from readable sources with numbered citations
  // (Try again, Discard/Restore, Keep into a private note); "Solo io" notes and DM notes
  // stay out; own-model prompt; assisted writing from an entry; the DM's Session Review
  // (beats with Tab/Shift+Tab, entity edit, summary re-run, unsaved-draft guard, reload,
  // offline refusal) published to the journal after review, read by the player, then
  // withdrawn with a reason; Table drawer. IT desktop 1440x900, then EN phone 390x844 with
  // touch. Synthetic data; resets this browser's demo state. Run from the evidence dir:
  // playwright-cli -s=d20-b60 --raw run-code --filename=<this file>
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B60/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: base });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push("desktop: " + error.message));
  const trail = [];
  page.on(
    "framenavigated",
    (frame) => frame === page.mainFrame() && trail.push("nav " + frame.url()),
  );
  page.on("load", () => trail.push("load"));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const button = (name, p = page) => p.getByRole("button", { name, exact: true });
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const assistant = async (p = page) => (await stored(p)).ext.assistant;
  const setRole = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForFunction((v) => document.querySelector("#demo-role")?.value === v, value);
  };
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const toast = (p = page) => p.locator("#toast").innerText();
  const content = (p = page) => p.locator("#content").innerText();
  const styled = (p = page) =>
    p.waitForFunction(() =>
      [...document.styleSheets].some(
        (sheet) => sheet.href?.endsWith("/assistant.css") && sheet.cssRules.length,
      ),
    );
  // B62: campaign sections sit in folding groups; a click opens the group first.
  const sidebar = (tab, p = page) => {
    const at = p.locator(`.campaign-sidebar [data-campaign-tab="${tab}"]`);
    return {
      click: () => openCampaignSection(p, tab),
      tap: () => openCampaignSection(p, tab, true),
      waitFor: (options) => at.waitFor(options),
      count: () => at.count(),
    };
  };
  const tab = (id, p = page) => p.locator(`[data-assistant-tab="${id}"]`).first();
  const card = (p = page) => p.locator(".assistant-answer").first();
  const smallTargets = (selector, p = page) =>
    p.evaluate(
      (sel) =>
        [...document.querySelectorAll(sel)]
          .filter((el) => el.getBoundingClientRect().height > 0)
          .map((el) => ({
            text: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 40),
            h: Math.round(el.getBoundingClientRect().height),
            w: Math.round(el.getBoundingClientRect().width),
          }))
          .filter((box) => box.h < 40 || box.w < 40),
      selector,
    );
  // From Home: "Apri campagna", then "Assistente" in the campaign sidebar (2 clicks).
  const openCampaign = async (p = page) => {
    if (await p.locator(".campaign-sidebar").count()) return;
    await p.locator(".app-header .brand").click();
    await p
      .locator("#content")
      .getByRole("button", { name: /^(Apri campagna|Open campaign)$/ })
      .first()
      .click();
    await p.locator(".campaign-sidebar").waitFor();
  };
  const openAssistant = async (p = page, sub = null) => {
    await openCampaign(p);
    await sidebar("assistant", p).click();
    await p.locator(".assistant h1").waitFor();
    if (sub) {
      await tab(sub, p).click();
      await p.locator(`[data-assistant-tab="${sub}"][aria-current="page"]`).waitFor();
    }
  };
  const ask = async (question, p = page) => {
    const field = p.locator("[data-assistant-question]").first();
    await field.click();
    await field.fill(question);
    await field.press("Enter");
    await p.locator(".assistant-answer h3", { hasText: question }).first().waitFor();
  };
  const setOffline = async (value, p = page) => {
    await p.locator("[data-service=preferences]").click();
    const box = p.locator("#dialog [name=offline]");
    if (value) await box.check();
    else await box.uncheck();
    await p.locator("#dialog button[type=submit]").click();
  };
  // The pre-session reminder of B27 may open by itself when an identity joins the Table.
  const acceptReminder = async (p = page) => {
    const opened = await p
      .locator("#dialog[open]")
      .waitFor({ timeout: 2000 })
      .then(() => true)
      .catch(() => false);
    if (opened) await p.locator("#dialog[open] button[type=submit]").click();
  };

  let mobile = null;
  try {
    // ---------------------------------------------------------------------------------
    // A. DM: off by default; turning it on shows what it reads, never reads and keeps.
    await page.goto(base);
    await page.evaluate((k) => localStorage.removeItem(k), key);
    await page.reload();
    await setRole("dm");
    await openAssistant();
    await styled();
    check((await content()).includes("Non attivo"), "Assistant not off by default");
    check(
      (await page.locator(".assistant-sim .assistant-sim-badge").innerText()) === "Simulazione",
      "Simulation label missing",
    );
    check(
      (await content()).includes("L’assistente non è attivo in questa campagna"),
      "Off notice missing",
    );
    await button("Apri Consenso e dati").click();
    await button("Attiva l’assistente…").click();
    const disclosure = await page.locator("#dialog").innerText();
    for (const text of ["simulazione", "Cosa non legge mai", "«Solo io»", "Conservazione"])
      check(disclosure.includes(text), "Disclosure lacks " + text);
    await page.screenshot({ path: shots + "b60-01-enable-disclosure-1440.png" });
    await button("Attiva l’assistente").click();
    await page.locator(".assistant-status.on").waitFor();
    let data = await assistant();
    check(data.campaigns.lanterns.enabled === true, "Not enabled in storage");
    check(data.campaigns.lanterns.consent.dm.status === "given", "DM consent not recorded");
    check(
      (
        await page.locator(".assistant-card", { hasText: "Consenso dei membri" }).innerText()
      ).includes("In attesa"),
      "Player consent not shown as pending",
    );
    await page.screenshot({ path: shots + "b60-02-consent-dm-1440.png", fullPage: true });
    passed.push(
      "DM IT 1440: off by default, 2 clicks to the section, disclosure (reads / never reads / retention) then on; DM consent recorded, player pending",
    );

    // ---------------------------------------------------------------------------------
    // B. Player: visible signal and consent banner; own messages wait for consent.
    await setRole("player");
    await openAssistant();
    await page.locator(".assistant-consent-banner").waitFor();
    check(!(await tab("review").count()), "Player sees the DM recap tab");
    await ask("Chi ha riacceso la lanterna?");
    let answer = await card().innerText();
    check(
      answer.includes("Qualcuno ha riacceso la lanterna sulla torre."),
      "Recap sentence missing",
    );
    check(
      !answer.includes("Qualcuno l’ha riaccesa"),
      "Player's own chat line used without consent",
    );
    await page.locator(".assistant-scope summary").click();
    check(
      (await page.locator(".assistant-scope").innerText()).includes("Senza consenso"),
      "Scope does not explain the consent exclusion",
    );
    await page.screenshot({
      path: shots + "b60-03-player-banner-before-consent-1440.png",
      fullPage: true,
    });
    await page
      .locator(".assistant-consent-banner")
      .getByRole("button", { name: "Do il consenso", exact: true })
      .click();
    await page.locator(".assistant-consent-banner").waitFor({ state: "detached" });
    check(
      (await assistant()).campaigns.lanterns.consent.player.status === "given",
      "Consent not stored",
    );
    await ask("Chi ha riacceso la lanterna?");
    answer = await card().innerText();
    check(answer.includes("Livia: «Qualcuno l’ha riaccesa."), "Consented line not used");
    check((await card().locator(".assistant-citations > li").count()) === 3, "Not 3 citations");
    await page.screenshot({ path: shots + "b60-04-player-ask-cited-1440.png", fullPage: true });
    // A citation marker opens the page it used (Quest Portal Library Link, VTL-197): the
    // chat line opens the archive on that message.
    await card().locator(".assistant-cite[aria-label*='Chat']").first().click();
    await page.locator('[data-chat-message="m2"].chat-highlight').waitFor();
    await openAssistant();
    passed.push(
      "Player: banner + pending consent; before consent the player's chat line is excluded, after consent it is cited; [n] opens the chat archive on that message",
    );

    // Try again, Discard with Restore (keyboard: Enter on focused buttons).
    await card().getByRole("button", { name: "Riprova" }).click();
    await card().locator(".badge", { hasText: "Tentativo 2" }).waitFor();
    check(
      (await card().innerText()).includes("Altre fonti accessibili dicono:"),
      "Try again did not give another extraction",
    );
    await card().getByRole("button", { name: "Scarta" }).focus();
    await page.keyboard.press("Enter");
    await page.locator(".assistant-restore", { hasText: "Risposta scartata." }).waitFor();
    check(
      await page.evaluate(() => document.activeElement?.dataset.assistantAct === "restore"),
      "Focus not on Restore after discarding",
    );
    await page.keyboard.press("Enter");
    await card().locator(".badge", { hasText: "Tentativo 2" }).waitFor();
    passed.push("Try again → another cited extraction (attempt 2); Discard → Restore by keyboard");

    // Keep: the answer becomes a private note draft in the existing editor, saved there.
    await card().getByRole("button", { name: "Salva negli appunti" }).click();
    await page.locator("[data-campaign-heading]", { hasText: "Appunto" }).first().waitFor();
    // P9 SV-05: a private note's preview is folded away; the text is in the editor itself.
    const editor = await page.locator('#content [data-campaign-path="data.body"]').inputValue();
    check(
      editor.includes("Proposto dall’assistente (simulazione)"),
      "Kept text missing provenance",
    );
    check(
      (await page
        .locator("#content select")
        .filter({ hasText: "Solo io" })
        .first()
        .inputValue()) === "private",
      "Kept note is not private by default",
    );
    await button("Salva contenuto per questi destinatari").click();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).campaignContent.entries.some(
          (e) => e.kind === "note" && e.ownerId === "player" && e.access.mode === "private",
        ),
      key,
    );
    passed.push(
      "Salva negli appunti: private note draft with citations and provenance, saved with the existing editor",
    );

    // A "Solo io" note is never read, not even for its owner.
    await page.locator("[data-service=notes]").click();
    await button("Nuovo appunto").click();
    await page.getByRole("textbox", { name: "Titolo (facoltativo)" }).fill("Segreto di Livia");
    await page
      .getByRole("textbox", { name: "Testo", exact: true })
      .fill("Il medaglione d’argento è nascosto sotto il letto della locanda.");
    await button("Salva bozza e aggiorna anteprima").click();
    await button("Salva contenuto per questi destinatari").click();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).campaignContent.entries.some((e) =>
          JSON.stringify(e).includes("medaglione"),
        ),
      key,
    );
    await openAssistant();
    await ask("Dove è nascosto il medaglione d’argento?");
    answer = await card().innerText();
    check(answer.includes("Non trovo nulla su questo"), "Private note answered: " + answer);
    check(!answer.includes("letto della locanda"), "Private note text leaked");
    passed.push(
      '"Solo io" note of the player: the assistant finds nothing and says it does not invent',
    );

    // ---------------------------------------------------------------------------------
    // C. DM: DM notes answer the DM only; the player's questions are never shown to the DM.
    await setRole("dm");
    await openAssistant();
    check(!(await content()).includes("medaglione"), "DM sees the player's question");
    await ask("Cosa c’è nel sarcofago?");
    answer = await card().innerText();
    check(answer.includes("È vuoto: il corpo di Maestro Oben"), "DM note not used for the DM");
    check(answer.includes("Riservato al DM"), "DM-only source not labelled");
    await page.screenshot({ path: shots + "b60-05-dm-ask-dm-only-1440.png", fullPage: true });
    await setRole("player");
    await openAssistant();
    await ask("Cosa c’è nel sarcofago?");
    check((await card().innerText()).includes("Non trovo nulla"), "Player reads DM notes");
    check(
      !(await card().getByRole("button", { name: "Riprova" }).count()),
      "A not-found answer still offers Try again",
    );
    passed.push(
      "DM asks about the sarcophagus → DM note cited as 'Riservato al DM'; the player gets nothing",
    );

    // Own model (Phil's AI Assistant): the prompt carries only accessible sources.
    await tab("consent").click();
    await page.locator('[data-assistant-engine][value="external"]').check();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext["core-settings"].personal.player?.[
          "assistant-engine.engine"
        ] === "external",
      key,
    );
    await tab("ask").click();
    await ask("Chi è Maestro Oben?");
    const prompt = await page.locator("[data-assistant-prompt]").inputValue();
    check(
      prompt.includes("SOLO le fonti numerate") && prompt.includes("Rivolgersi a Maestro Oben"),
      "Prompt wrong",
    );
    check(!prompt.includes("È vuoto"), "Prompt leaks a DM note");
    await button("Copia il prompt").click();
    await page.locator("#toast", { hasText: "Prompt copiato" }).waitFor();
    await page
      .locator("[data-assistant-external]")
      .fill("Oben è il custode della lanterna [1] e un mago [7].");
    await button("Registra la risposta").click();
    await card().locator(".error", { hasText: "[7]" }).waitFor();
    await tab("consent").click();
    await page.locator('[data-assistant-engine][value="demo"]').check();
    passed.push(
      "Own model: prompt with accessible sources only, copied; pasted answer recorded with citation [7] flagged",
    );

    // Assisted writing: theme, context, Keep / Try again / Discard (Quest Portal).
    await tab("write").click();
    await page.locator("[data-assistant-theme]").selectOption("npc");
    await page
      .locator('[data-assistant-form="write"] [name=prompt]')
      .fill("Maestro Oben, custode della torre");
    await button("Genera la proposta").click();
    await card()
      .locator(".assistant-line", { hasText: "Ruolo (dalla tua richiesta): custode della torre" })
      .waitFor();
    check((await card().innerText()).includes("non li inventa"), "NPC proposal invents");
    for (const name of ["Tieni", "Riprova", "Scarta"])
      check(await card().getByRole("button", { name }).count(), name + " missing");
    await card().getByRole("button", { name: "Riprova" }).click();
    await card().locator(".badge", { hasText: "Tentativo 2" }).waitFor();
    await page.screenshot({ path: shots + "b60-06-write-npc-1440.png", fullPage: true });
    passed.push(
      "Scrivi: NPC from an idea with cited facts and 'does not invent'; Keep / Try again / Discard present, Try again works",
    );

    // ---------------------------------------------------------------------------------
    // D. DM Session Review: private draft, three beat levels, entity edit, summary re-run.
    await setRole("dm");
    await openAssistant(page, "review");
    const period = page.locator('[data-assistant-form="review-new"] [name=window]');
    // Refreshed by the round-2 regression (29/09/2026): the example's stamps are authored
    // around Thursday 17/09/2026 and move by whole weeks to the visit (sample-clock.mjs,
    // hand-offs), so the last evening is that Thursday moved the same way.
    const evening = await page.evaluate(async () =>
      (await import("/sample-clock.mjs")).sampleDay("2026-09-17"),
    );
    check(
      (await period.inputValue()) === "day:" + evening,
      "Default period is not the evening of the last session (17/09 moved to " + evening + ")",
    );
    await button("Prepara la bozza").click();
    await page.locator(".assistant-review").waitFor();
    const beats = page.locator("[data-beat-text]");
    check((await beats.count()) === 3, "Expected 3 beats, got " + (await beats.count()));
    const draftText = await page.locator(".assistant-review").innerText();
    check(
      !draftText.includes("simbolo inciso") && !draftText.includes("chiudere alle 23"),
      "Whisper or OOC in the recap",
    );
    await page.locator("[data-assistant-sources] summary").click();
    const exclusions = await page.locator(".assistant-excluded").innerText();
    check(/Sussurri e messaggi nascosti: [1-9]/.test(exclusions), "Whisper exclusion not reported");
    // Tab / Shift+Tab change the level of a beat (Archivist) from the start of its text;
    // at the outer level Tab moves on.
    await beats.nth(2).click();
    // Caret to the start of the text: Home, or Cmd+Left on macOS (Home does not move it).
    const mac = await page.evaluate(() => /Mac/.test(navigator.platform));
    await page.keyboard.press(mac ? "Meta+ArrowLeft" : "Home");
    await page.keyboard.press("Tab");
    check(
      (await page.locator(".assistant-beat").nth(2).getAttribute("class")).includes("level-2"),
      "Tab did not indent the beat",
    );
    check(
      await page.evaluate(() => document.activeElement?.dataset.beatText === "2"),
      "Tab moved focus while indenting",
    );
    await page.keyboard.press("Shift+Tab");
    check(
      (await page.locator(".assistant-beat").nth(2).getAttribute("class")).includes("level-1"),
      "Shift+Tab did not outdent",
    );
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    check(
      await page.evaluate(() => document.activeElement?.dataset.beatText !== "2"),
      "Tab at the deepest level traps the keyboard",
    );
    await page.locator('[data-review-field="title"]').fill("La lanterna riaccesa");
    await page.locator('[data-entity-kind="0"]').selectOption("person");
    await page.locator('[data-assistant-act="remove-beat"][data-index="1"]').click();
    await button("Ripristina").click();
    check((await beats.count()) === 3, "Removed beat not restored");
    check(
      (await page.locator("[data-assistant-dirty]").innerText()) === "Modifiche non salvate",
      "Dirty state not shown",
    );
    // Leaving with unsaved edits asks first (draft guard); "Continua a modificare" stays.
    await sidebar("journal").click();
    await page.locator("#dialog[open]", { hasText: "Bozza del resoconto non salvata" }).waitFor();
    await button("Continua a modificare").click();
    check(
      (await page.locator('[data-review-field="title"]').inputValue()) === "La lanterna riaccesa",
      "Edit lost",
    );
    await button("Salva la bozza").click();
    await page.locator("[data-assistant-dirty]", { hasText: "Salvata" }).waitFor();
    await page.reload();
    await page.locator("#content").waitFor();
    await setRole("dm"); // the demo identity is not persisted: a reload starts as the player
    await openAssistant(page, "review");
    check(
      (await page.locator('[data-review-field="title"]').inputValue()) === "La lanterna riaccesa",
      "Title lost after reload",
    );
    check(
      (await page.locator(".assistant-beat").nth(2).getAttribute("class")).includes("level-2"),
      "Beat level lost after reload",
    );
    await page.locator("[data-review-prompt]").fill("corda");
    await button("Rigenera il riassunto").click();
    await page.waitForFunction(() =>
      document
        .querySelector('[data-review-field="summary"]')
        ?.value.startsWith("Doran controlla la corda"),
    );
    check((await beats.count()) === 3, "Re-running the summary changed the beats");
    await page.screenshot({ path: shots + "b60-07-session-review-1440.png", fullPage: true });
    passed.push(
      "Session Review: 17/09 period, 3 beats without whisper/OOC; Home then Tab/Shift+Tab levels (no keyboard trap); entity kind; remove+restore beat; draft guard; save; reload keeps title and level; summary re-run with 'corda' keeps beats",
    );

    // Offline: publishing (shared) is refused; online, the review dialog then publishes.
    await setOffline(true);
    await button("Rivedi e pubblica…").click();
    await page.locator("#dialog[open]").waitFor();
    const reviewDialog = await page.locator("#dialog").innerText();
    check(reviewDialog.includes("Giocatore · Livia, DM"), "Audience not listed");
    check(
      reviewDialog.includes("Bozza preparata dall’assistente (simulazione) e rivista dal DM"),
      "Provenance line missing",
    );
    await button("Pubblica nel Diario").click();
    await page.locator("#dialog .dialog-error", { hasText: "senza rete" }).waitFor();
    await page.locator("#dialog [data-close]").first().click();
    await setOffline(false);
    await button("Rivedi e pubblica…").click();
    check(!(await page.locator('#dialog [name="reviewed"]').count()), "Attestation box is back");
    await page.screenshot({ path: shots + "b60-08-publish-review-dialog-1440.png" });
    await button("Pubblica nel Diario").click();
    await page.locator(".assistant-review.published").waitFor();
    data = await assistant();
    const review = data.reviews.at(-1);
    check(review.status === "published" && review.publishedEntryId, "Not published");
    passed.push(
      "Offline publish refused with the shell message; online the review dialog (audience, provenance, preview; no attestation box) publishes to the journal",
    );

    // Player: the recap is in the journal and in "Dove eravamo rimasti"; entry assistant.
    await setRole("player");
    await openCampaign();
    await sidebar("overview").click();
    await page.locator("#content h1", { hasText: "Panoramica" }).waitFor();
    await page
      .locator("#content", { hasText: "La lanterna riaccesa" })
      .waitFor({ timeout: 5000 })
      .catch(() => check(false, "Overview does not show the new recap"));
    await sidebar("journal").click();
    await page
      .locator("#content article", { hasText: "La lanterna riaccesa" })
      .getByRole("button", { name: "Leggi" })
      .click();
    await page.locator(".assistant-entry").waitFor();
    check(
      (await content()).includes("rivista dal DM prima della condivisione"),
      "Published text lacks provenance",
    );
    await page
      .locator(".assistant-entry")
      .getByRole("button", { name: "Riassumi questa voce" })
      .click();
    await page.locator(".assistant-entry .assistant-answer").waitFor();
    const entrySummary = await page
      .locator(".assistant-entry .assistant-answer .assistant-text")
      .allInnerTexts();
    check(entrySummary.join(" ").includes("Riassunto:"), "Entry summary missing");
    check(
      !/Momenti principali|\[\d+\] \[\d+\]/.test(entrySummary.join(" ")),
      "Entry summary re-reads markers or headings: " + entrySummary.join(" "),
    );
    await page.screenshot({ path: shots + "b60-09-player-journal-entry-1440.png", fullPage: true });
    passed.push(
      "Player: the published recap appears in Overview and Journal; its entry page offers 'Riassumi questa voce' with a cited proposal",
    );

    // DM withdraws with a reason; the player no longer reads it.
    await setRole("dm");
    await openAssistant(page, "review");
    await button("Ritira dal Diario…").click();
    await page.locator('#dialog [name="reason"]').fill("Manca la scena del portone");
    await button("Ritira").click();
    await page
      .locator(".assistant-review.published", { hasText: "Manca la scena del portone" })
      .waitFor();
    await setRole("player");
    await openCampaign();
    await sidebar("journal").click();
    check(
      !(await content()).includes("La lanterna riaccesa"),
      "Withdrawn recap still readable by the player",
    );
    await setRole("dm");
    await openAssistant(page, "consent");
    const log = page.locator(".assistant-card", { hasText: "Registro del consenso" });
    await log.locator("summary").click();
    check(
      (await log.innerText()).includes("motivo: Manca la scena del portone"),
      "Withdrawal reason not in the log",
    );
    passed.push(
      "DM withdraws with a reason → the player's journal no longer lists it; the consent log keeps the reason",
    );

    // Table drawer: a quick question during play.
    await setRole("player");
    await openCampaign();
    await page
      .locator(".campaign-sidebar")
      .getByRole("button", { name: "Entra al Tavolo" })
      .click();
    await acceptReminder();
    await openTablePanel(page, "assistant"); // B62: Reference › Assistant
    await page.locator(".assistant-drawer").waitFor();
    await ask("Chi porta la corda nella cripta?");
    const drawerAnswer = await page.locator(".assistant-drawer .assistant-answer").innerText();
    check(drawerAnswer.includes("15 metri di corda"), "Drawer answer wrong");
    check(
      (await page.locator(".assistant-drawer .assistant-citations > li").count()) >= 1,
      "Drawer answer without its numbered sources",
    );
    await page.screenshot({ path: shots + "b60-10-table-drawer-1440.png" });
    passed.push(
      "Table: 'Assistente' drawer answers from the forum thread with a compact cited answer",
    );
    check(await noOverflow(), "Desktop overflow");
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);

    // ---------------------------------------------------------------------------------
    // E. EN phone 390x844, touch: same data on a new device, English labels, no overflow.
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await phone.addInitScript(
      ([k, value]) => {
        if (!sessionStorage.getItem("b60-seeded")) {
          localStorage.setItem(k, value);
          sessionStorage.setItem("b60-seeded", "1");
        }
      },
      [key, snapshot],
    );
    mobile = await phone.newPage();
    mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
    await mobile.goto(base + "#campaign?tab=assistant");
    await mobile.locator("[data-service=preferences]").tap();
    await mobile.locator("#dialog [name=lang]").selectOption("en");
    await mobile.locator("#dialog button[type=submit]").tap();
    await mobile.getByRole("heading", { name: "Assistant", level: 1 }).waitFor();
    await styled(mobile);
    check(
      (await mobile.locator(".assistant-sim-badge").first().innerText()) === "Simulation",
      "No EN simulation label",
    );
    const field = mobile.locator("[data-assistant-question]");
    await field.tap();
    await field.fill("Who is Oben?");
    await mobile
      .locator('[data-assistant-form="ask"]')
      .getByRole("button", { name: "Ask", exact: true })
      .tap();
    await mobile.locator(".assistant-answer h3", { hasText: "Who is Oben?" }).waitFor();
    const phoneAnswer = await mobile.locator(".assistant-answer").first().innerText();
    check(
      phoneAnswer.includes("From the sources you can read:") &&
        phoneAnswer.includes("Maestro Oben"),
      "EN answer wrong: " + phoneAnswer,
    );
    await mobile
      .locator(".assistant-answer")
      .first()
      .getByRole("button", { name: "Try again" })
      .tap();
    await mobile.locator(".assistant-answer .badge", { hasText: "Attempt 2" }).waitFor();
    check(await noOverflow(mobile), "Phone Ask overflows");
    const phoneSmall = await smallTargets(
      ".assistant button, .assistant input, .assistant select",
      mobile,
    );
    check(!phoneSmall.length, "Small phone targets: " + JSON.stringify(phoneSmall));
    await mobile.screenshot({ path: shots + "b60-11-phone-ask-en.png", fullPage: true });
    await mobile.locator('.assistant-tabs [data-assistant-tab="consent"]').tap();
    await mobile.getByRole("heading", { name: "Consent and data", level: 2 }).waitFor();
    check(await noOverflow(mobile), "Phone consent overflows");
    await mobile.screenshot({ path: shots + "b60-12-phone-consent-en.png", fullPage: true });
    passed.push(
      "EN phone 390 touch: English labels and answer, Try again by tap, no overflow, all controls ≥ 40 px",
    );
  } catch (error) {
    // Keep the failing screen next to the evidence, then report the failure.
    await (mobile ?? page)
      .screenshot({ path: shots + "b60-failure.png", fullPage: true })
      .catch(() => {});
    const where = await (mobile ?? page)
      .evaluate(() => `${location.hash} as ${document.querySelector("#demo-role")?.value}`)
      .catch(() => "?");
    error.message +=
      `\nAt ${where}. Trail: ${trail.slice(-8).join(" | ")}. Passed so far:\n- ` +
      passed.join("\n- ");
    throw error;
  } finally {
    await mobile?.context().close();
  }
  await context.close();
  check(!errors.length, "Page errors: " + errors.join(" | "));
  return { passed, errors };
};
