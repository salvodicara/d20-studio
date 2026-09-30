async (rootPage) => {
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
  // B60 review fixes, in the browser with real clicks and keys (declared simulation, synthetic
  // data; resets this browser's demo state). Covers: the DM's "Solo io (DM)" chat whisper is
  // never read; a withdrawn recap is not published again after a consent withdrawal; Tab moves
  // through the Session Review without editing and indents only at the start of a worked beat;
  // exclusions survive Save and block publishing until rebuilt; a hook from a world entry; one
  // recap per Table session (B14's story draft completed by the Session Review); SRD 5.2.1
  // rules questions with the page and a citation that opens the compendium; assisted writing
  // inside the note editor that inserts at the cursor; inline offline consent error; chat
  // citations that open the archive on the message; phone 390 editor panel. Run from the
  // evidence dir: playwright-cli -s=d20-b60 --raw run-code --filename=<this file>
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B60/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push("desktop: " + error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const button = (name, p = page) => p.getByRole("button", { name, exact: true });
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const setRole = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForFunction((v) => document.querySelector("#demo-role")?.value === v, value);
  };
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
  const openAssistant = async (sub = null, p = page) => {
    await openCampaign(p);
    await sidebar("assistant", p).click();
    await p.locator(".assistant h1").waitFor();
    if (sub) {
      await tab(sub, p).click();
      await p.locator(`[data-assistant-tab="${sub}"][aria-current="page"]`).waitFor();
    }
  };
  const ask = async (question, scope = page.locator("#content")) => {
    const field = scope.locator("[data-assistant-question]").first();
    await field.fill(question);
    await field.press("Enter");
    await scope.locator(".assistant-answer h3", { hasText: question }).first().waitFor();
    return scope.locator(".assistant-answer").first().innerText();
  };
  const setOffline = async (value) => {
    await page.locator("[data-service=preferences]").click();
    const box = page.locator("#dialog [name=offline]");
    if (value) await box.check();
    else await box.uncheck();
    await page.locator("#dialog button[type=submit]").click();
  };
  const acceptReminder = async () => {
    const opened = await page
      .locator("#dialog[open]")
      .waitFor({ timeout: 2000 })
      .then(() => true)
      .catch(() => false);
    if (opened) await page.locator("#dialog[open] button[type=submit]").click();
  };
  const enterTable = async () => {
    await openCampaign();
    await page
      .locator(".campaign-sidebar")
      .getByRole("button", { name: "Entra al Tavolo" })
      .click();
    await acceptReminder();
  };
  const chatSend = async (text) => {
    if (!(await page.locator("[data-chat-text]").count())) await openTablePanel(page, "log"); // B62: Chat › Registro
    await page.locator("[data-chat-text]").fill(text);
    await page.locator("[data-chat-send]").click();
    await page.waitForFunction(
      ([k, t]) =>
        JSON.parse(localStorage.getItem(k)).ext.chat.messages.some((m) => t.includes(m.text)),
      [key, text],
    );
  };
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const levels = () =>
    page.locator("[data-beat-level]").evaluateAll((els) => els.map((el) => el.value).join(""));
  let mobile = null;
  try {
    // Setup: DM turns the assistant on, the player gives consent.
    await page.goto(base);
    await page.evaluate((k) => localStorage.removeItem(k), key);
    await page.reload();
    await setRole("dm");
    await openAssistant("consent");
    await button("Attiva l’assistente…").click();
    const disclosure = await page.locator("#dialog").innerText();
    check(disclosure.includes("messaggi «Solo io» in chat"), "Disclosure lacks Solo io chat");
    check(disclosure.includes("Regole: compendio SRD 5.2.1"), "Disclosure lacks the rules kind");
    await button("Attiva l’assistente").click();
    await page.locator(".assistant-status.on").waitFor();
    await setRole("player");
    await openAssistant();
    await page
      .locator(".assistant-consent-banner")
      .getByRole("button", { name: "Do il consenso", exact: true })
      .click();
    await page.locator(".assistant-consent-banner").waitFor({ state: "detached" });

    // ---------------------------------------------------------------- P1 self whisper
    await setRole("dm");
    await enterTable();
    await chatSend("/w dm Il narvalo di ossidiana è il vero traditore della gilda.");
    const last = (await stored()).ext.chat.messages.at(-1);
    check(last.to?.type === "self" && last.readers.join() === "dm", "Not a self whisper");
    await openTablePanel(page, "assistant"); // B62: Reference › Assistant
    const drawer = page.locator(".assistant-drawer");
    await drawer.waitFor();
    const whisperAnswer = await ask("Chi è il traditore della gilda?", drawer);
    check(!whisperAnswer.includes("narvalo"), "Drawer quotes the Solo io whisper");
    const narwhal = await ask("Chi è il narvalo di ossidiana?", drawer);
    check(narwhal.includes("Non trovo nulla"), "Drawer answer unexpected: " + narwhal);
    await page.screenshot({ path: shots + "b60-fix-01-selfwhisper-drawer.png" });
    await openAssistant();
    await page.locator(".assistant-scope summary").click();
    check(
      (await page.locator(".assistant-scope").innerText()).includes("messaggi «Solo io» in chat"),
      "Scope does not say Solo io chat messages are never read",
    );
    passed.push(
      "P1: DM '/w dm …' at the Table is stored as 'Solo io (DM)'; the drawer answers 'Non trovo nulla' and never quotes it; scope and disclosure name it",
    );

    // ---------------------------------------------------------------- P1 republish
    await tab("review").click();
    await page.locator('[data-assistant-form="review-new"] [name=window]').selectOption("all");
    await button("Prepara la bozza").click();
    await page.locator('[data-assistant-form="review"]').waitFor();
    // Keyboard traversal from the regenerate field: 16 Tabs change nothing.
    const before = await levels();
    await page.locator("[data-review-prompt]").focus();
    for (let i = 0; i < 16; i++) await page.keyboard.press("Tab");
    check(
      (await levels()) === before,
      `Tab traversal changed levels ${before} → ${await levels()}`,
    );
    check(
      (await page.locator("[data-assistant-dirty]").innerText()) === "Salvata",
      "Tab traversal marked the draft dirty",
    );
    // Indent from the start of a beat the user works in; the change is announced.
    const first = page.locator('[data-beat-text="0"]');
    await first.click();
    // Caret to the start of the text: Home, or Cmd+Left on macOS (Home does not move it).
    const mac = await page.evaluate(() => /Mac/.test(navigator.platform));
    await page.keyboard.press(mac ? "Meta+ArrowLeft" : "Home");
    await page.keyboard.press("Tab");
    check((await levels())[0] === String(Number(before[0]) + 1), "Tab at start did not indent");
    check(
      await page.evaluate(() => document.activeElement?.dataset.beatText === "0"),
      "Indent moved focus",
    );
    check(
      /Momento 1: /.test(await page.locator("[data-assistant-live]").innerText()),
      "Level change not announced",
    );
    await page.keyboard.press("Shift+Tab");
    check((await levels()) === before, "Shift+Tab did not outdent");
    await page.screenshot({ path: shots + "b60-fix-02-review-keyboard.png", fullPage: true });
    passed.push(
      "P2: 16 Tabs from the regenerate field keep levels " +
        before +
        " and 'Salvata'; Home+Tab indents the beat in place with a live announcement; Shift+Tab restores",
    );
    await button("Salva la bozza").click();
    await button("Rivedi e pubblica…").click();
    await button("Pubblica nel Diario").click();
    await page.locator(".assistant-review.published").waitFor();
    await setRole("player");
    await openAssistant("consent");
    await button("Revoca il consenso…").click();
    check(
      (await page.locator("#dialog").innerText()).includes(
        "visibile a tutti i membri nel registro del consenso",
      ),
      "Reason field does not say who reads it",
    );
    await page.locator("#dialog [name=reason]").fill("Non voglio le mie battute nei resoconti");
    await button("Revoca il consenso").click();
    await setRole("dm");
    await openAssistant("review");
    await button("Ritira dal Diario…").click();
    await page.locator('#dialog [name="reason"]').fill("Rispetto la revoca di Livia");
    await button("Ritira").click();
    await page.locator(".assistant-review.published", { hasText: "Non si ripubblica" }).waitFor();
    check(!(await button("Ripubblica").count()), "Ripubblica offered despite the revocation");
    const withdrawnId = (await stored()).ext.assistant.reviews.at(-1).publishedEntryId;
    check(
      (await stored()).campaignContent.entries.find((e) => e.id === withdrawnId).access.mode ===
        "private",
      "Withdrawn recap shared again",
    );
    await page.screenshot({ path: shots + "b60-fix-03-republish-blocked.png", fullPage: true });
    // Round 2: after a choice the banner no longer asks; consent is given again in the card.
    await setRole("player");
    await openAssistant("consent");
    await button("Do il consenso").click();
    await page.locator(".assistant-card", { hasText: "Revoca il consenso…" }).waitFor();
    await setRole("dm");
    await openAssistant("review");
    await button("Ripubblica").click();
    await page.waitForFunction(
      ([k, id]) =>
        JSON.parse(localStorage.getItem(k)).campaignContent.entries.find((e) => e.id === id).access
          .mode === "campaign",
      [key, withdrawnId],
    );
    passed.push(
      "P1: recap citing Livia published → Livia revokes → DM withdraws → 'Non si ripubblica: [n]…', no Ripubblica, entry stays private; after consent again Ripubblica shares it",
    );

    // ---------------------------------------------------------------- P2 exclusions
    await page.locator('[data-assistant-form="review-new"] [name=window]').selectOption("all");
    await button("Prepara la bozza").click();
    await page.locator('[data-assistant-form="review"]').waitFor();
    await page.locator("[data-assistant-sources] summary").click();
    await page.locator('[data-assistant-include][value="chat:m2"]').uncheck();
    await page.locator(".assistant-sources .assistant-pending").waitFor();
    await button("Salva la bozza").click();
    await page.locator("[data-assistant-dirty]", { hasText: "Salvata" }).waitFor();
    check(
      !(await page.locator('[data-assistant-include][value="chat:m2"]').isChecked()),
      "The exclusion was dropped on save",
    );
    check(
      (await stored()).ext.assistant.reviews.at(-1).excludedKeys.includes("chat:m2"),
      "Exclusion not stored",
    );
    await button("Rivedi e pubblica…").click();
    await page
      .locator('.assistant-review .error[role="alert"]', { hasText: "ancora nel testo" })
      .waitFor();
    check(
      !(await page.locator("#dialog[open]").count()),
      "Publish dialog opened with exclusions pending",
    );
    await page.screenshot({ path: shots + "b60-fix-04-exclusion-pending.png", fullPage: true });
    await button("Ricrea la bozza dalle fonti").click();
    await button("Ricrea").click();
    await page.locator('[data-assistant-form="review"]').waitFor();
    check(
      !(await page.locator(".assistant-sources .assistant-pending").count()),
      "Notice still shown after rebuild",
    );
    await button("Rivedi e pubblica…").click();
    const preview = await page.locator("#dialog .assistant-preview").innerText();
    check(!preview.includes("riaccesa"), "Excluded line still in the publish preview");
    await page.locator("#dialog [data-close]").first().click();
    await button("Scarta la bozza").click();
    passed.push(
      "P2: untick Livia's line → notice; Save keeps it unticked and stored; Rivedi e pubblica refused inline ('ancora nel testo'); Ricrea → preview without the line",
    );

    // ---------------------------------------------------------------- P2 one recap per session
    await enterTable();
    await openTablePanel(page, "session-view-controls"); // B62: Scene › Session
    await page.locator("#table-drawer").getByRole("button", { name: "Avvia sessione" }).click();
    await acceptReminder();
    await chatSend(
      "/desc Il portone della cripta si apre con un gemito e la polvere danza nella luce.",
    );
    // B61: Registro and Sessione are two tabs of the Table's sidebar: back to Sessione.
    await openTablePanel(page, "session-view-controls");
    await page
      .getByRole("button", { name: /Termina (la )?sessione/ })
      .first()
      .click();
    await page.locator("#dialog[open]").waitFor();
    await page.locator("#dialog[open] button[type=submit]").click();
    await page.waitForFunction(
      (k) =>
        (JSON.parse(localStorage.getItem(k)).ext["session-view-stories"]?.stories ?? []).length ===
        1,
      key,
    );
    await page.locator('[data-service="requests"]').first().click();
    await page.locator("#dialog[open]").waitFor();
    const bell = await page.locator("#dialog[open]").innerText();
    check(bell.includes("Bozza del racconto di sessione pronta"), "B14 notification missing");
    check(!bell.includes("conclusa: prepara il resoconto"), "Second recap notification: " + bell);
    await page.locator("#dialog[open]").getByText("Bozza del racconto di sessione pronta").click();
    const panel = page.locator(".assistant-editor");
    await panel.waitFor();
    await panel.getByRole("button", { name: /resoconto dell’assistente \(sessione 1\)/ }).click();
    await page.locator('[data-assistant-form="review"]').waitFor();
    await button("Rivedi e pubblica…").click();
    const storyDialog = await page.locator("#dialog").innerText();
    check(
      storyDialog.includes("Completa la bozza «Racconto della sessione 1»"),
      "No adoption line",
    );
    check(storyDialog.includes("Presenze"), "Preview lacks B14 facts");
    await page.screenshot({ path: shots + "b60-fix-05-story-adopted.png" });
    await button("Pubblica nel Diario").click();
    await page.locator(".assistant-review.published").waitFor();
    const afterStory = await stored();
    const story = afterStory.ext["session-view-stories"].stories[0];
    const storyDraft = afterStory.campaignContent.drafts.find((d) => d.id === story.draftId);
    check(storyDraft.status === "applied", "B14 story draft not completed");
    const recapsForSession = afterStory.campaignContent.entries.filter(
      (e) => e.kind === "recap" && JSON.stringify(e).includes("portone della cripta"),
    );
    check(recapsForSession.length === 1, "Recaps for the session: " + recapsForSession.length);
    await page.locator('[data-service="requests"]').first().click();
    const bellAfter = await page.locator("#dialog[open]").innerText();
    check(!bellAfter.includes("Bozza del racconto di sessione pronta"), "Story notice remains");
    await page.keyboard.press("Escape");
    check(
      (await page.locator('[data-assistant-form="review-new"] [name=window]').innerText()).includes(
        "resoconto già nel Diario",
      ),
      "Session not marked as recapped",
    );
    passed.push(
      "P2: End session → one notification (B14 story); its editor → 'Scrivi «Cosa è successo» con il resoconto dell’assistente (sessione 1)' → publish completes the B14 draft: 1 recap with Presenze + Momenti, story notice gone, window marked 'resoconto già nel Diario'",
    );

    // ---------------------------------------------------------------- P2 world hook
    await sidebar("world").click();
    await button("Nuova voce del mondo").click();
    await page.getByRole("textbox", { name: "Titolo (facoltativo)" }).fill("Torre del porto");
    await page
      .getByRole("textbox", { name: "Testo", exact: true })
      .fill(
        "La torre del porto domina Bruma. Il suo faro è spento da anni e nessuno sale le scale.",
      );
    await page.getByLabel("Chi può leggere").selectOption("campaign");
    await button("Salva bozza e aggiorna anteprima").click();
    await button("Salva contenuto per questi destinatari").click();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).campaignContent.entries.some((e) =>
          JSON.stringify(e).includes("Torre del porto"),
        ),
      key,
    );
    await setRole("player");
    await openCampaign();
    await sidebar("world").click();
    await page
      .locator("#content article", { hasText: "Torre del porto" })
      .getByRole("button", { name: "Leggi" })
      .click();
    const entryPanel = page.locator(".assistant-entry");
    await entryPanel.getByRole("button", { name: "Gancio da questa voce" }).click();
    await entryPanel.locator(".assistant-answer").waitFor();
    const hook = await entryPanel.locator(".assistant-answer").innerText();
    check(
      hook.includes("Si riparte da:") && hook.includes("nessuno sale le scale"),
      "Hook: " + hook,
    );
    check(!hook.includes("Non ci sono resoconti"), "Empty hook");
    await page.screenshot({ path: shots + "b60-fix-06-world-hook.png", fullPage: true });
    passed.push("P2: 'Gancio da questa voce' on a world entry starts from that entry (cited)");

    // ---------------------------------------------------------------- P2 rules
    await openAssistant();
    const prone = await ask("Cosa fa la condizione Prono?");
    check(prone.includes("Prono: Striscia o si rialza"), "Rules answer: " + prone);
    check(prone.includes("SRD 5.2.1 IT p. 212"), "No SRD location");
    await page.screenshot({ path: shots + "b60-fix-07-rules-answer.png", fullPage: true });
    await card().locator('[data-assistant-cite="1"]').click();
    await page.locator('[data-compendium-view="entry"]', { hasText: "Prono" }).waitFor();
    check(
      page.url().includes("srd2024%3Acondition%3Aprone") ||
        page.url().includes("srd2024:condition:prone"),
      "Citation did not open the compendium: " + page.url(),
    );
    passed.push(
      "P2: 'Cosa fa la condizione Prono?' → cited SRD summary with 'SRD 5.2.1 IT p. 212'; [1] opens the compendium entry Prono",
    );

    // ---------------------------------------------------------------- P3 chat citation route
    await openAssistant();
    // Out-of-character talk never enters recaps, so the chat line itself is the source.
    await ask("Quando dobbiamo chiudere stasera?");
    const chatCite = card().locator(".assistant-cite[aria-label*='Chat']").first();
    const route = JSON.parse(await chatCite.getAttribute("data-assistant-source"));
    check(
      route.tab === "chat-archive" && route.id,
      "Chat citation without message: " + JSON.stringify(route),
    );
    await chatCite.click();
    await page.locator(`[data-chat-message="${route.id}"].chat-highlight`).waitFor();
    passed.push("P3: a chat citation opens the archive on the message, highlighted");

    // ---------------------------------------------------------------- P2 note editor insert
    await page.locator("[data-service=notes]").click();
    await button("Nuovo appunto").click();
    await page.getByRole("textbox", { name: "Titolo (facoltativo)" }).fill("Indizi");
    const bodyField = page.getByRole("textbox", { name: "Testo", exact: true });
    await bodyField.fill("Primo paragrafo.\nSecondo paragrafo.");
    // Caret at the end of the first line (macOS: Cmd+Up / Cmd+Right; else Ctrl+Home / End).
    await bodyField.click();
    const macKeys = await page.evaluate(() => /Mac/.test(navigator.platform));
    await page.keyboard.press(macKeys ? "Meta+ArrowUp" : "Control+Home");
    await page.keyboard.press(macKeys ? "Meta+ArrowRight" : "End");
    check(
      (await bodyField.evaluate((el) => el.selectionStart)) === "Primo paragrafo.".length,
      "Caret not placed after the first line",
    );
    const editorPanel = page.locator(".assistant-editor");
    await editorPanel.waitFor();
    check(
      (await editorPanel.innerText()).includes(
        "Il testo non salvato di questa bozza non viene letto",
      ),
      "Editor panel does not state its context",
    );
    await editorPanel.locator("[data-assistant-editor-prompt]").fill("lanterna");
    await editorPanel.locator("[data-assistant-editor-prompt]").press("Enter");
    await editorPanel.locator(".assistant-answer").waitFor();
    // P9 SV-05: the private draft saves itself; Enter in the request never saves the note.
    check(
      !(await stored()).campaignContent.entries.some(
        (e) => e.revisions.at(-1).data.title === "Indizi",
      ),
      "Enter in the request saved the note",
    );
    await page.screenshot({ path: shots + "b60-fix-08-editor-proposal.png", fullPage: true });
    await editorPanel.getByRole("button", { name: "Tieni: inserisci nel testo" }).click();
    const inserted = await bodyField.inputValue();
    check(
      /^Primo paragrafo\.\n\nRiassunto:[\s\S]*simulazione\): rivedilo prima di condividerlo\.\nSecondo paragrafo\.$/.test(
        inserted,
      ),
      "Not inserted at the cursor: " + JSON.stringify(inserted.slice(0, 200)),
    );
    check(
      await page.evaluate(() => document.activeElement?.dataset.campaignPath === "data.body"),
      "Focus not back in the text",
    );
    await button("Salva bozza e aggiorna anteprima").click();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).campaignContent.drafts.some(
          (d) => d.data?.title === "Indizi" && d.data.body.includes("Riassunto:"),
        ),
      key,
    );
    passed.push(
      "P2: notes editor → assistant panel inside the editor; Enter in the request generates without saving the note; 'Tieni: inserisci nel testo' inserts at the cursor between the paragraphs, focus back in the text; saved with the editor",
    );

    // ---------------------------------------------------------------- P3 offline consent
    await openAssistant("consent");
    await button("Revoca il consenso…").click();
    await button("Revoca il consenso").click();
    // Round 2: a revoked member is not asked again by the banner; the card offers consent.
    check(!(await page.locator(".assistant-consent-banner").count()), "Banner after a choice");
    await setOffline(true);
    await page
      .locator(".assistant-card", { hasText: "Consenso dei membri" })
      .getByRole("button", { name: "Do il consenso", exact: true })
      .click();
    await page.locator('.assistant-card .error[role="alert"]', { hasText: "senza rete" }).waitFor();
    await page.screenshot({ path: shots + "b60-fix-09-offline-consent.png" });
    await setOffline(false);
    passed.push(
      "P3: offline 'Do il consenso' shows the refusal inside the consent card (role=alert)",
    );
    check(await noOverflow(), "Desktop overflow");

    // ---------------------------------------------------------------- phone 390, EN editor panel
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await phone.addInitScript(
      ([k, value]) => {
        if (!sessionStorage.getItem("b60-fix-seeded")) {
          localStorage.setItem(k, value);
          sessionStorage.setItem("b60-fix-seeded", "1");
        }
      },
      [key, snapshot],
    );
    mobile = await phone.newPage();
    mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
    await mobile.goto(base);
    await mobile.locator("[data-service=preferences]").tap();
    await mobile.locator("#dialog [name=lang]").selectOption("en");
    await mobile.locator("#dialog button[type=submit]").tap();
    await mobile.locator("[data-service=notes]").tap();
    await mobile.getByRole("button", { name: "New note", exact: true }).tap();
    const phonePanel = mobile.locator(".assistant-editor");
    await phonePanel.waitFor();
    await phonePanel.getByRole("button", { name: "Generate the proposal" }).tap();
    await phonePanel.locator(".assistant-answer").waitFor();
    check(await noOverflow(mobile), "Phone editor overflows");
    const small = await mobile.evaluate(() =>
      [
        ...document.querySelectorAll(
          ".assistant-editor button, .assistant-editor input, .assistant-editor select",
        ),
      ]
        .filter((el) => el.getBoundingClientRect().height > 0)
        .map((el) => ({
          text: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 30),
          h: Math.round(el.getBoundingClientRect().height),
          w: Math.round(el.getBoundingClientRect().width),
        }))
        .filter((box) => box.h < 40 || box.w < 40),
    );
    check(!small.length, "Small phone targets: " + JSON.stringify(small));
    await mobile.screenshot({ path: shots + "b60-fix-10-phone-editor-en.png", fullPage: true });
    passed.push(
      "EN phone 390 touch: editor panel in English, proposal by tap, no overflow, targets ≥ 40 px",
    );
  } catch (error) {
    await (mobile ?? page)
      .screenshot({ path: shots + "b60-fix-failure.png", fullPage: true })
      .catch(() => {});
    const where = await (mobile ?? page)
      .evaluate(() => `${location.hash} as ${document.querySelector("#demo-role")?.value}`)
      .catch(() => "?");
    error.message += `\nAt ${where}. Passed so far:\n- ` + passed.join("\n- ");
    throw error;
  } finally {
    await mobile?.context().close();
  }
  await context.close();
  check(!errors.length, "Page errors: " + errors.join(" | "));
  return { passed, errors };
};
