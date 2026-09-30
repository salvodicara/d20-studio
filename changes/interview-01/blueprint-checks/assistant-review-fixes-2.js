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
  // B60 review fixes, round 2, in the browser with real clicks, keys and taps (declared
  // simulation, synthetic data; resets this browser's demo state). Covers: consent can be
  // declined from the banner (and changed later); own-model use disclosed and shown per member,
  // with a per-member opt-out from external prompts; a world section made "Solo io" after an
  // answer leaves the stored answer and "Salva negli appunti"; a member's section made "Solo io"
  // after the recap draft is hidden in the editor and blocks publishing until re-run; publish
  // without an attestation box; the published recap reads as prose and its entry page links the
  // sources; NPC idea → SRD 5.2.1 stat block → "Crea il PNG…" → hidden token and sheet; "/" in
  // the note editor; withdraw while the assistant is off; phone 390 EN (decline, NPC dialog).
  // Run from the evidence dir: playwright-cli -s=d20-b60 --raw run-code --filename=<this file>
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
  const content = (p = page) => p.locator("#content").innerText();
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
  const ask = async (question) => {
    const field = page.locator("[data-assistant-question]").first();
    await field.fill(question);
    await field.press("Enter");
    await page.locator(".assistant-answer h3", { hasText: question }).first().waitFor();
    return card().innerText();
  };
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const smallTargets = (p, scope) =>
    p.evaluate(
      (selector) =>
        [...document.querySelectorAll(`${selector} button, ${selector} input, ${selector} select`)]
          .filter((el) => el.getBoundingClientRect().height > 0 && el.type !== "hidden")
          .map((el) => ({
            text: (el.innerText || el.getAttribute("aria-label") || el.name || "")
              .trim()
              .slice(0, 30),
            h: Math.round(el.getBoundingClientRect().height),
            w: Math.round(el.getBoundingClientRect().width),
            type: el.type,
          }))
          // Checkboxes and radios sit in 40 px labels (campaign-check).
          .filter((box) => !["checkbox", "radio"].includes(box.type))
          .filter((box) => box.h < 40 || box.w < 40),
      scope,
    );
  // The entry editor (B12): an entry with one section of the given audience.
  const editSection = async ({ title, body, section, sectionBody, mode }) => {
    if (title !== undefined) {
      await page.locator('[data-campaign-path="data.title"]').fill(title);
      await page.locator('[data-campaign-path="data.body"]').fill(body);
      await page.locator('[data-campaign-access-mode="access"]').selectOption("campaign");
    }
    const details = page.locator('[data-campaign-details="sections"]');
    if ((await details.getAttribute("open")) === null) await details.locator("summary").click();
    if (section !== undefined) {
      await page.locator("[data-campaign-add-section]").click();
      await page.locator('[data-campaign-path="data.sections.0.title"]').fill(section);
      await page.locator('[data-campaign-path="data.sections.0.body"]').fill(sectionBody);
    }
    await page.locator('[data-campaign-access-mode="data.sections.0.access"]').selectOption(mode);
    await page.locator("[data-campaign-save]").click();
    await page.locator("[data-campaign-apply]:not([disabled])").click();
    await page.locator("[data-campaign-apply]").waitFor({ state: "detached" });
  };
  let mobile = null;
  try {
    // ------------------------------------------------ P2: own-model disclosure when enabling
    await page.goto(base);
    await page.evaluate((k) => localStorage.removeItem(k), key);
    await page.reload();
    await setRole("dm");
    await openAssistant("consent");
    await button("Attiva l’assistente…").click();
    const disclosure = await page.locator("#dialog").innerText();
    check(disclosure.includes("fuori da queste promesse"), "Enable dialog hides own-model copying");
    await button("Attiva l’assistente").click();
    await page.locator(".assistant-status.on").waitFor();
    const pendingSnapshot = await page.evaluate((k) => localStorage.getItem(k), key);

    // ------------------------------------------------ P2: decline is as easy as consent
    await setRole("player");
    await openAssistant();
    const banner = page.locator(".assistant-consent-banner");
    await banner.waitFor();
    check(
      (await banner.innerText()).includes("può copiarne estratti in uno strumento esterno"),
      "Banner lacks the own-model disclosure",
    );
    await page.screenshot({ path: shots + "b60-r2-01-banner-decline.png" });
    await banner.getByRole("button", { name: "Non do il consenso" }).click();
    await banner.waitFor({ state: "detached" });
    check(
      (await stored()).ext.assistant.campaigns.lanterns.consent.player.status === "declined",
      "Decline not stored",
    );
    await page.locator('[data-service="requests"]').first().click();
    await page.locator("#dialog[open]").waitFor();
    check(
      !(await page.locator("#dialog[open]").innerText()).includes("dai o nega il consenso"),
      "Consent notification after declining",
    );
    await page.keyboard.press("Escape");
    await tab("ask").click();
    check(!(await banner.count()), "Banner comes back after declining");
    await openAssistant("consent");
    const members = page.locator(".assistant-card", { hasText: "Consenso dei membri" });
    check((await members.innerText()).includes("Consenso non dato"), "Declined not shown");
    check(
      (await members.innerText()).includes("fuori dalle promesse di conservazione"),
      "Consent card hides own-model copying",
    );
    check(
      (
        await page.locator(".assistant-card", { hasText: "Conservazione dei dati" }).innerText()
      ).includes("lì valgono le regole di quello strumento"),
      "Retention card still says nothing leaves the browser",
    );
    await members.getByRole("button", { name: "Do il consenso", exact: true }).click();
    await members.getByRole("button", { name: "Revoca il consenso…" }).waitFor();
    passed.push(
      "P2: banner offers 'Non do il consenso' → stored 'declined', banner and bell notice gone, card 'Consenso non dato', consent given later from the card; disclosure in enable dialog, banner, consent and retention cards",
    );

    // ------------------------------------------------ P2: engines per member, opt-out
    await setRole("dm");
    await openAssistant("consent");
    await page.locator('[data-assistant-engine][value="external"]').check();
    await setRole("player");
    await openAssistant("consent");
    check(
      /DM[\s\S]*motore: il suo modello/.test(await members.innerText()),
      "The DM's own-model engine is not shown to the player",
    );
    await page.locator("[data-assistant-external-consent]").uncheck();
    await members.getByText("esclude i propri contenuti dai prompt esterni").waitFor();
    await page.screenshot({ path: shots + "b60-r2-02-consent-engines.png", fullPage: true });
    await setRole("dm");
    await openAssistant();
    await ask("Chi ha riacceso la lanterna?");
    const prompt = await card().locator("[data-assistant-prompt]").inputValue();
    check(!prompt.includes("Qualcuno l’ha riaccesa"), "Opted-out line in the DM's prompt");
    check(
      prompt.includes("Qualcuno ha riacceso la lanterna sulla torre"),
      "Prompt lost its sources",
    );
    await openAssistant("consent");
    await page.locator('[data-assistant-engine][value="demo"]').check();
    await setRole("player");
    await openAssistant("consent");
    await page.locator("[data-assistant-external-consent]").check();
    passed.push(
      "P2: DM on 'Il tuo modello' shown to the player as 'motore: il suo modello'; the player unticks external prompts → the DM's prompt leaves her line out, other sources stay",
    );

    // ------------------------------------------------ P1 A: a world section made "Solo io"
    await setRole("dm");
    await openCampaign();
    await sidebar("world").click();
    await page.locator("[data-campaign-new]").first().click();
    await editSection({
      title: "Torre di Oben",
      body: "La torre sorge sul colle di Bruma.",
      section: "Segreto del custode",
      sectionBody: "Il custode Oben nasconde una chiave di ossidiana sotto il faro.",
      mode: "campaign",
    });
    await setRole("player");
    await openAssistant();
    const before = await ask("Cosa sai della torre di Oben e della chiave di ossidiana?");
    check(before.includes("sotto il faro"), "Shared section not quoted");
    check(before.includes("sorge sul colle"), "Entry body not quoted");
    await setRole("dm");
    await openCampaign();
    await sidebar("world").click();
    await page
      .locator("#content article", { hasText: "Torre di Oben" })
      .getByRole("button", { name: "Leggi" })
      .click();
    await button("Modifica").first().click();
    await editSection({ mode: "private" });
    await setRole("player");
    await openAssistant();
    const answerNow = await card().innerText();
    check(!answerNow.includes("sotto il faro"), "Revoked section still quoted: " + answerNow);
    check(answerNow.includes("non dice più quel testo"), "No hidden-part notice");
    await page.screenshot({ path: shots + "b60-r2-03-section-revoked-answer.png", fullPage: true });
    await card().getByRole("button", { name: "Salva negli appunti" }).click();
    const noteBody = await page.locator('[data-campaign-path="data.body"]').inputValue();
    check(!noteBody.includes("sotto il faro"), "Revoked text copied into a note");
    check(noteBody.includes("sorge sul colle"), "Still-readable text not kept");
    // Discard that note draft (the editor asks for confirmation).
    await button("Scarta bozza").click();
    if (await page.locator("#dialog[open]").count())
      await page.locator("#dialog[open] button[type=submit]").click();
    await page.locator("#dialog[open]").waitFor({ state: "detached" });
    passed.push(
      "P1: DM world section 'Segreto del custode' made 'Solo io' after the player's answer → the stored answer hides that quote and excerpt ('… non dice più quel testo') and keeps the body sentence; 'Salva negli appunti' copies only the still-readable part",
    );

    // ------------------------------------------------ P1 B: author privatizes after a draft
    await page.locator("[data-service=notes]").click();
    await button("Nuovo appunto").click();
    await page.locator("[data-campaign-context]").selectOption("lanterns");
    await editSection({
      title: "Diario di Livia",
      body: "Livia esplora la cripta sotto la torre.",
      section: "Paura",
      sectionBody: "Livia teme il buio della cripta più di ogni mostro.",
      mode: "campaign",
    });
    await setRole("dm");
    await openAssistant("review");
    await page.locator('[data-assistant-form="review-new"] [name=window]').selectOption("all");
    await button("Prepara la bozza").click();
    await page.locator('[data-assistant-form="review"]').waitFor();
    await page.locator("[data-review-prompt]").fill("buio cripta mostro");
    await button("Rigenera il riassunto").click();
    await page.waitForFunction(() =>
      document.querySelector('[data-review-field="summary"]')?.value.includes("teme il buio"),
    );
    await setRole("player");
    await page.locator("[data-service=notes]").click();
    await page
      .locator("#content article", { hasText: "Diario di Livia" })
      .getByRole("button", { name: "Leggi" })
      .click();
    await button("Modifica").first().click();
    await editSection({ mode: "private" });
    await setRole("dm");
    await openAssistant("review");
    const editor = page.locator('[data-assistant-form="review"]');
    await editor.waitFor();
    check(!(await editor.innerText()).includes("teme il buio"), "Editor renders withdrawn text");
    check(
      !(
        await editor
          .locator("input, textarea")
          .evaluateAll((els) => els.map((e) => e.value).join(" "))
      ).includes("teme il buio"),
      "A field still holds the withdrawn text",
    );
    await page.locator("[data-assistant-summary-hidden]").waitFor();
    await page.locator("[data-assistant-stale]").waitFor();
    await page.screenshot({ path: shots + "b60-r2-04-draft-masked.png", fullPage: true });
    await button("Rivedi e pubblica…").click();
    await editor.locator(".error", { hasText: "è cambiata" }).waitFor();
    check(!(await page.locator("#dialog[open]").count()), "Publish dialog opened on stale text");
    // Re-run the summary on what the group reads now; remove the hidden beats.
    await page.locator("[data-review-prompt]").fill("");
    await button("Rigenera il riassunto").click();
    await page.locator('[data-review-field="summary"]').waitFor();
    while (await page.locator(".assistant-beat.assistant-masked").count())
      await page.locator(".assistant-beat.assistant-masked .icon-button").first().click();
    while (await page.locator(".assistant-entity.assistant-masked").count())
      await page.locator(".assistant-entity.assistant-masked .icon-button").first().click();
    await button("Salva la bozza").click();
    await page.locator("[data-assistant-stale]").waitFor({ state: "detached" });
    // P3: the review dialog publishes without an attestation box.
    await button("Rivedi e pubblica…").click();
    await page.locator("#dialog[open]").waitFor();
    check(!(await page.locator('#dialog [name="reviewed"]').count()), "Attestation box present");
    check(!(await page.locator("#dialog").innerText()).includes("teme il buio"), "Preview leaks");
    await button("Pubblica nel Diario").click();
    await page.locator(".assistant-review.published").waitFor();
    const published = (await stored()).ext.assistant.reviews.at(-1);
    const entry = (await stored()).campaignContent.entries.find(
      (e) => e.id === published.publishedEntryId,
    );
    const body = JSON.stringify(entry);
    check(!body.includes("teme il buio") && !body.includes("Paura"), "Withdrawn text published");
    passed.push(
      "P1: the player's 'Paura' section made 'Solo io' after the DM's draft → editor hides summary, beats and names that use it (no field holds it), stale notice; 'Rivedi e pubblica…' refused inline; re-run summary + remove hidden beats → published without it",
    );

    // ------------------------------------------------ P3: prose recap, source links
    await setRole("player");
    await openCampaign();
    await sidebar("journal").click();
    await page
      .locator("#content article", { hasText: "Resoconto della campagna" })
      .getByRole("button", { name: "Leggi" })
      .click();
    await page.locator(".assistant-recap-sources").waitFor();
    const prose = (await content()).split("\nFonti\n")[0];
    check(!/\S \[\d+\]/.test(prose), "Inline markers in the published prose");
    await page.screenshot({ path: shots + "b60-r2-05-recap-sources.png", fullPage: true });
    const link = page.locator(".assistant-recap-sources .button").first();
    const route = JSON.parse(await link.getAttribute("data-assistant-source"));
    await link.click();
    await page.waitForFunction((tabId) => location.hash.includes(tabId), route.tab ?? route.page);
    // A handout opens in its viewer dialog: close it before going on.
    await page.waitForTimeout(300);
    if (await page.locator("#dialog[open]").count()) await page.keyboard.press("Escape");
    await page.locator("#dialog[open]").waitFor({ state: "detached" });
    passed.push(
      "P3: the published recap reads as prose (no raw [n]); its page lists 'Fonti del resoconto' as links; a link opens its source",
    );

    // ------------------------------------------------ P2: NPC idea → SRD block → NPC
    await setRole("dm");
    await openAssistant("write");
    await page.locator("[data-assistant-theme]").selectOption("npc");
    await page
      .locator('[data-assistant-form="write"] [name=prompt]')
      .fill("Maestro Oben, custode della torre");
    await button("Genera la proposta").click();
    await card()
      .locator(".assistant-line", { hasText: "Guardia · GS 1/8 · CA 16 · PF 11" })
      .waitFor();
    await card().getByRole("button", { name: "Crea il PNG…" }).click();
    const npcDialog = page.locator("#dialog[open]");
    await npcDialog.waitFor();
    check(
      (await npcDialog.locator("[name=block]").inputValue()) === "srd2024:creature:guard",
      "Guard not proposed",
    );
    check((await npcDialog.innerText()).includes("custode della torre"), "Role reason missing");
    // Like the compendium's "Add to scene": hidden by default only on an unrevealed scene.
    await npcDialog.locator("[name=hidden]").check();
    await page.screenshot({ path: shots + "b60-r2-06-npc-dialog.png" });
    await button("Crea il PNG").click();
    await card().getByText("PNG creato").waitFor();
    const state = await stored();
    const npc = Object.values(state.actors).find((a) => a.name === "Maestro Oben");
    check(npc?.kind === "npc" && npc.ac === 16 && npc.hp === 11, "NPC stats wrong");
    check(npc.compendiumRef?.id === "srd2024:creature:guard", "No compendium link");
    check(npc.notes.includes("Nome: Maestro Oben"), "Facts not kept as notes");
    const token = state.scenes.flatMap((scene) => scene.tokens).find((t) => t.actorId === npc.id);
    check(token?.hidden === true, "Token not hidden from players");
    await card().getByRole("button", { name: "Apri la scheda di Maestro Oben" }).click();
    await page.locator("#content h1", { hasText: "Maestro Oben" }).waitFor();
    await page.screenshot({ path: shots + "b60-r2-07-npc-sheet.png", fullPage: true });
    passed.push(
      "P2: 'Maestro Oben, custode della torre' → proposed Guardia (SRD 5.2.1, cited) → 'Crea il PNG…' (profile select, disposition, scene, hidden) → NPC AC 16 HP 11 with compendium link, facts as notes, hidden token; 'Apri la scheda' opens it",
    );

    // ------------------------------------------------ P3: "/" in the note editor
    await page.locator("[data-service=notes]").click();
    await button("Nuovo appunto").click();
    const text = page.getByRole("textbox", { name: "Testo", exact: true });
    await text.fill("Indizi sulla torre.");
    await text.press("End");
    await text.press("Enter");
    await page.keyboard.type("/");
    await page.waitForFunction(() =>
      document.activeElement?.matches("[data-assistant-editor-theme]"),
    );
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.activeElement?.dataset.campaignPath === "data.body");
    check((await text.inputValue()).endsWith("\n/"), "Escape lost the '/'");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("/");
    await page.waitForFunction(() =>
      document.activeElement?.matches("[data-assistant-editor-theme]"),
    );
    await page.keyboard.press("Tab");
    await page.keyboard.type("torre");
    await page.keyboard.press("Enter");
    const panel = page.locator(".assistant-editor");
    await panel.locator(".assistant-answer").waitFor();
    await panel.getByRole("button", { name: "Tieni: inserisci nel testo" }).click();
    const inserted = await text.inputValue();
    check(/^Indizi sulla torre\.\n\nRiassunto:/.test(inserted), "Not inserted in place of '/'");
    check(!inserted.includes("\n/"), "The '/' is still there");
    check(
      (await panel.locator(".assistant-answer").innerText()).includes(
        "Inserita nella bozza della nota",
      ),
      "Kept label claims more than an insert",
    );
    await page.screenshot({ path: shots + "b60-r2-08-slash-insert.png", fullPage: true });
    // The note draft is discarded: the proposal no longer claims to be kept anywhere.
    await button("Scarta bozza").click();
    if (await page.locator("#dialog[open]").count())
      await page.locator("#dialog[open] button[type=submit]").click();
    await page.locator("#dialog[open]").waitFor({ state: "detached" });
    await openAssistant("write");
    check((await content()).includes("Bozza scartata"), "Kept label ignores the discarded draft");
    passed.push(
      "P3: '/' on an empty line of Testo → focus on the assistant theme; Esc back to the text keeping '/'; again '/' → Tab → request + Enter → 'Tieni: inserisci nel testo' replaces the '/'; label 'Inserita nella bozza della nota', then 'Bozza scartata' once the note draft is discarded",
    );

    // ------------------------------------------------ P3: Ask after Discard; withdraw while off
    await openAssistant();
    await ask("Chi è Maestro Oben?");
    await card().getByRole("button", { name: "Scarta" }).click();
    check(!(await content()).includes("Nessuna domanda finora"), "Empty text despite history");
    await openAssistant("consent");
    await button("Disattiva…").click();
    await button("Disattiva").click();
    await page.locator(".assistant-status.off").waitFor();
    await openAssistant("review");
    await button("Ritira dal Diario…").click();
    await page.locator('#dialog [name="reason"]').fill("Assistente spento: ritiro il resoconto");
    await button("Ritira").click();
    await page.locator(".assistant-review.published", { hasText: "Ritirato il" }).waitFor();
    check(!(await button("Ripubblica").count()), "Publish again offered while off");
    await page.screenshot({ path: shots + "b60-r2-09-withdraw-while-off.png", fullPage: true });
    check(await noOverflow(), "Desktop overflow");
    passed.push(
      "P3: after Discard the Ask tab does not say 'Nessuna domanda finora'; with the assistant off the Resoconto tab still lists the published recap and 'Ritira dal Diario…' works; no 'Ripubblica' while off",
    );

    // ------------------------------------------------ phone 390 EN, touch
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await phone.addInitScript(
      ([k, value]) => {
        if (!sessionStorage.getItem("b60-r2-seeded")) {
          localStorage.setItem(k, value);
          sessionStorage.setItem("b60-r2-seeded", "1");
        }
      },
      [key, pendingSnapshot],
    );
    mobile = await phone.newPage();
    mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
    await mobile.goto(base);
    await mobile.locator("[data-service=preferences]").tap();
    await mobile.locator("#dialog [name=lang]").selectOption("en");
    await mobile.locator("#dialog button[type=submit]").tap();
    await setRole("player", mobile);
    await openCampaign(mobile);
    await sidebar("assistant", mobile).tap();
    const phoneBanner = mobile.locator(".assistant-consent-banner");
    await phoneBanner.waitFor();
    check(await noOverflow(mobile), "Phone banner overflows");
    const bannerSmall = await smallTargets(mobile, ".assistant-consent-banner");
    check(!bannerSmall.length, "Small banner targets: " + JSON.stringify(bannerSmall));
    await mobile.screenshot({ path: shots + "b60-r2-10-phone-banner-en.png", fullPage: true });
    await phoneBanner.getByRole("button", { name: "Decline consent" }).tap();
    await phoneBanner.waitFor({ state: "detached" });
    await setRole("dm", mobile);
    await openCampaign(mobile);
    await sidebar("assistant", mobile).tap();
    await tab("write", mobile).tap();
    await mobile.locator("[data-assistant-theme]").selectOption("npc");
    await mobile.locator('[data-assistant-form="write"] [name=prompt]').fill("Grax, goblin boss");
    await mobile.getByRole("button", { name: "Generate the proposal", exact: true }).tap();
    await card(mobile).locator(".assistant-line", { hasText: "Goblin Boss · CR 1" }).waitFor();
    await card(mobile).getByRole("button", { name: "Create the NPC…" }).tap();
    await mobile.locator("#dialog[open]").waitFor();
    check(await noOverflow(mobile), "Phone NPC dialog overflows");
    const dialogSmall = await smallTargets(mobile, "#dialog[open]");
    check(!dialogSmall.length, "Small dialog targets: " + JSON.stringify(dialogSmall));
    await mobile.screenshot({ path: shots + "b60-r2-11-phone-npc-dialog-en.png", fullPage: true });
    await mobile.getByRole("button", { name: "Create the NPC", exact: true }).tap();
    await card(mobile).getByText("NPC created").waitFor();
    passed.push(
      "EN phone 390 touch: banner with 'Decline consent' (no overflow, targets ≥ 40 px) declines; DM 'Grax, goblin boss' → Goblin Boss CR 1 → 'Create the NPC…' dialog fits and creates the NPC",
    );
  } catch (error) {
    await (mobile ?? page)
      .screenshot({ path: shots + "b60-r2-failure.png", fullPage: true })
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
