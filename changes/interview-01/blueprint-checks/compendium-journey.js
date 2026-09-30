async (rootPage) => {
  // B62: the log is the first sub-tab of the sidebar's «Chat» tab; the core's toggle
  // (data-table="log") is a hidden handle. As the old Registro tab: an open log closes with
  // its own ✕, otherwise the log opens (the Chat tab, then its Registro sub-tab if needed).
  const toggleLog = async (p, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const close = p.locator("#content [data-chat-close]");
    if (await close.count()) return press(close.first());
    if ((await p.locator("#table-sidebar-panel").getAttribute("data-table-panel")) === "log")
      return press(p.locator('.table-tabs [data-table-section="chat"]'));
    if (!(await p.locator('.table-subtabs [data-table-subtab="log"]').count())) {
      const chat = p.locator('.table-tabs [data-table-section="chat"]');
      if ((await chat.getAttribute("aria-selected")) !== "true") await press(chat);
    }
    if ((await p.locator("#table-sidebar-panel").getAttribute("data-table-panel")) !== "log")
      await press(p.locator('.table-subtabs [data-table-subtab="log"]'));
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
  // B16 — Library compendium, reader, glossary and attribution. Real clicks, keys and taps
  // in isolated browser contexts (synthetic demo data only; each context starts from the
  // seeded example). Acceptance checks of the B16 card:
  //  1 spell facets (level 1 + concentration + Wizard) with removable chips and counts
  //  2 entry with SRD 5.2.1 source, revision and 2024 label; nested lockable, followable tooltip
  //  3 reader with contents, position, previous/next and a bookmark found again after reload
  //  4 same entry in Italian with the Italian attribution; legal page with EN and IT sentences
  //  5 composable DM screen opened from the Table without leaving the scene
  //  6 stat block embedded in a journal entry, rolled with a physical and a digital die
  //  7 printable view of an entry
  // plus sheet/scene flows, undo, reload persistence, DM/player privacy, EN phone 390 touch.
  // Review fixes (24/09): DM-only scene log line, hidden arrival and drop at the clicked
  // point, log rolls with reasoned correction/withdrawal, table embeds, full creature copy,
  // keyboard focus (chips, tabs, DM screen), touch outside tap, phone reader bar.
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B16/";
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();

  async function open(viewport, extra = {}) {
    const context = await rootPage
      .context()
      .browser()
      .newContext({ viewport, ...extra });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base);
    await page.locator("#content").waitFor();
    return { context, page };
  }
  const tools = (page) => ({
    button: (name) => page.getByRole("button", { name, exact: true }),
    stored: () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key),
    content: () => page.locator("#content").innerText(),
    count: () => page.locator("[data-result-count]").innerText(),
    noOverflow: () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    role: async (value) => {
      await page.locator("#demo-role").selectOption(value);
      await page.locator("#content").waitFor();
    },
  });

  // ------------------------------------------------------------ group 1: IT desktop, player
  {
    const { context, page } = await open({ width: 1440, height: 900 });
    const { button, stored, count } = tools(page);
    // Reachable from the main navigation in two clicks.
    await page.locator('.app-header [data-nav="library"]').click();
    await page.locator('[data-library-scope="compendium"]').click();
    await page.locator(".compendium-categories").waitFor();
    check(
      (await count()) === "68 incantesimi",
      "Spell list does not start with the full sample: " + (await count()),
    );
    check(
      await page.locator('.app-header [data-nav="library"].active').count(),
      "Library navigation not active on the compendium",
    );

    // 1. Facets narrow the list; chips are removable; the count follows.
    await page.locator('[data-facet="level"][value="1"]').check();
    check((await count()) === "26 incantesimi", "Level 1 did not narrow: " + (await count()));
    // Keyboard: Space toggles the focused facet option.
    await page.locator('[data-facet="concentration"][value="yes"]').focus();
    await page.keyboard.press("Space");
    await page.locator('[data-facet="class"][value="wizard"]').check();
    check(
      (await count()) === "2 incantesimi",
      "Three facets did not narrow to 2: " + (await count()),
    );
    const names = await page.locator(".compendium-row-name").allInnerTexts();
    check(
      names.join("|") === "Individuazione del magico|Sonno",
      "Unexpected results: " + names.join("|"),
    );
    const chips = await page.locator(".compendium-chip").allInnerTexts();
    check(
      chips.length === 3 && chips.some((c) => c.startsWith("Mago")),
      "Chips missing: " + chips.join("|"),
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: shots + "b16-01-browse-facets-it.png" });
    await page.locator('.compendium-chip[data-chip-facet="class"]').focus();
    await page.keyboard.press("Enter");
    check(
      (await count()) === "9 incantesimi",
      "Removing the Mago chip did not widen: " + (await count()),
    );
    check(
      await page.evaluate(() =>
        document.activeElement.matches(".compendium-chip, [data-result-count]"),
      ),
      "Focus left the chip row after Enter on a chip",
    );
    await page.locator('[data-facet="class"][value="wizard"]').check();
    // Inline expansion of a row (DDB listing) shows the entry without leaving the list.
    await page.locator('[data-row-toggle="srd2024:spell:sleep"]').click();
    check(
      await page.locator(".compendium-row.open .compendium-facts").count(),
      "Row did not expand inline",
    );
    passed.push(
      "1 facets level 1 + concentration (Space key) + Wizard → 2 spells; chips removable with Enter, focus stays in the chip row (9 → 2); inline row",
    );

    // 2. Entry with source, revision, 2024 label; nested tooltip locked and followed.
    // ARIA tabs: arrow keys move and select, the list is the tab panel.
    await page.locator('[data-category="spells"]').focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() => document.activeElement?.dataset.category === "creatures");
    check(
      (await page.locator('[role="tabpanel"]').getAttribute("aria-labelledby")) ===
        "compendium-tab-creatures" &&
        (await page.locator('[data-category="spells"]').getAttribute("tabindex")) === "-1",
      "Category tabs do not follow the tabs pattern",
    );
    await page.locator("[data-compendium-query]").fill("lupo");
    await page.waitForFunction(
      () => document.querySelector("[data-result-count]")?.textContent === "2 creature",
    );
    await page
      .locator(
        '.compendium-row:has([data-row-toggle="srd2024:creature:wolf"]) [data-compendium-go]',
      )
      .first()
      .click();
    await page.locator(".compendium-statblock").waitFor();
    const entryText = await page.locator(".compendium-entry").innerText();
    for (const needle of [
      "Regole 2024",
      "SRD 5.2.1",
      "Revisione 5.2.1",
      "Edizione 2024",
      "pagina 394",
      "Quest'opera include materiale",
    ])
      check(entryText.includes(needle), "Entry lacks " + needle);
    const prone = page.locator(
      '.compendium-entry [data-compendium-term="srd2024:condition:prone"]',
    );
    await prone.hover();
    const tip = page.locator('.compendium-tip[data-level="0"]');
    await tip.waitFor();
    check((await tip.locator("h4").innerText()) === "Prono", "Hover tooltip is not Prono");
    await tip.hover({ position: { x: 20, y: 20 } });
    await page.waitForSelector('.compendium-tip[data-level="0"].locked', { timeout: 3000 });
    const nestedTerm = tip.locator('[data-compendium-term="srd2024:rule:disadvantage"]');
    await nestedTerm.hover();
    const nested = page.locator('.compendium-tip[data-level="1"]');
    await nested.waitFor();
    check(
      (await nested.locator("h4").innerText()) === "Svantaggio",
      "Nested tooltip is not Svantaggio",
    );
    await nested.locator("[data-tip-lock]").click();
    check(
      (await nested.locator("[data-tip-lock]").getAttribute("aria-pressed")) === "true",
      "Nested tooltip did not lock",
    );
    await page.mouse.move(1400, 880);
    await page.waitForTimeout(500);
    check(
      (await page.locator(".compendium-tip").count()) === 2,
      "Locked tooltips closed when the pointer left",
    );
    await page.screenshot({ path: shots + "b16-02-entry-nested-tooltips-it.png" });
    await nested.locator("[data-tip-follow]").click();
    await page.waitForURL(
      /revision=srd2024%3Arule%3Adisadvantage|revision=srd2024:rule:disadvantage/,
    );
    await page
      .locator(".compendium-entry h2", { hasText: "Svantaggio" })
      .waitFor({ timeout: 5000 });
    await page.goBack();
    await page.locator(".compendium-statblock").waitFor();
    // Keyboard: Enter opens locked with focus inside; Escape closes and returns focus.
    await page
      .locator('.compendium-entry [data-compendium-term="srd2024:condition:prone"]')
      .focus();
    await page.keyboard.press("Enter");
    await page.locator('.compendium-tip[data-level="0"].locked').waitFor();
    check(
      await page.evaluate(() => !!document.activeElement.closest(".compendium-tip")),
      "Keyboard tooltip did not take focus",
    );
    await page.keyboard.press("Escape");
    check(
      (await page.locator(".compendium-tip").count()) === 0,
      "Escape did not close the tooltip",
    );
    check(
      await page.evaluate(
        () => document.activeElement.dataset.compendiumTerm === "srd2024:condition:prone",
      ),
      "Focus did not return to the term",
    );
    passed.push(
      "2 wolf entry: SRD 5.2.1 p.394 IT, revision/edition 2024; hover Prono → auto-lock → nested Svantaggio locked, survives pointer leave, followed; Enter/Escape",
    );

    // 4. Content language: English text with EN source/attribution, UI still Italian; back to IT.
    await page.locator('[data-content-lang-set="en"]').first().click();
    const enText = await page.locator(".compendium-entry").innerText();
    check(
      enText.includes("Wolf") &&
        enText.includes("This work includes material") &&
        enText.includes("English · pagina 364"),
      "English content/attribution missing",
    );
    check(
      await page.getByRole("heading", { name: "Biblioteca", level: 1 }).count(),
      "UI language changed with content language",
    );
    const enBadges = await page.locator(".compendium-entry .compendium-badges").innerText();
    check(
      enBadges.includes("Disponibile anche in italiano") &&
        !enBadges.includes("Traduzione italiana ufficiale"),
      "Badge claims the Italian translation over English content: " + enBadges,
    );
    await page.locator('[data-content-lang-set="it"]').first().click();
    const itText = await page.locator(".compendium-entry").innerText();
    check(
      itText.includes("Traduzione italiana ufficiale (SRD IT)") &&
        itText.includes("Italiano · pagina 394") &&
        itText.includes("Quest'opera include materiale tratto dal System Reference Document 5.2.1"),
      "Italian attribution missing",
    );
    await page.screenshot({ path: shots + "b16-03-entry-wolf-it.png", fullPage: true });
    await button("Fonti e attribuzione").first().click();
    await page.locator(".compendium-legal").waitFor();
    const en = await page.locator('[data-attribution="en"]').innerText();
    const it = await page.locator('[data-attribution="it"]').innerText();
    check(
      en.startsWith("This work includes material from the System Reference Document 5.2.1"),
      "EN attribution sentence wrong",
    );
    check(
      it.startsWith("Quest'opera include materiale tratto dal System Reference Document 5.2.1"),
      "IT attribution sentence wrong",
    );
    check(
      (await page.locator(".compendium-legal").innerText()).includes(
        "a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718",
      ),
      "IT hash missing",
    );
    const log = await page.locator(".compendium-legal table").innerText();
    check(
      log.includes("5.2.1") && log.includes("Nessuna revisione successiva"),
      "Revision log missing",
    );
    await page.screenshot({ path: shots + "b16-04-legal-en-it.png", fullPage: true });
    passed.push(
      "4 content language EN/IT with matching source and attribution; legal page shows both exact sentences, files, hashes, CC BY 4.0, revision log",
    );

    // 7. Printable view: only entry, source and attribution; print command invoked.
    await page.goBack();
    await page.locator(".compendium-statblock").waitFor();
    await button("Vista stampabile").click();
    await page.locator(".compendium-print-page").waitFor();
    await page.evaluate(() => {
      window.__printed = 0;
      window.print = () => (window.__printed += 1);
    });
    await button("Stampa").click();
    check((await page.evaluate(() => window.__printed)) === 1, "Print command not invoked");
    await page.emulateMedia({ media: "print" });
    const printed = await page.evaluate(() => ({
      header: getComputedStyle(document.querySelector(".app-header")).display,
      bar: getComputedStyle(document.querySelector(".compendium-print-bar")).display,
      page: getComputedStyle(document.querySelector(".compendium-print-page")).display,
      buttons: document.querySelectorAll(".compendium-print-page button").length,
      attribution:
        document.querySelector(".compendium-print-page .compendium-attribution")?.textContent ?? "",
    }));
    check(
      printed.header === "none" && printed.bar === "none" && printed.page !== "none",
      "Print media shows app chrome: " + JSON.stringify(printed),
    );
    check(
      printed.buttons === 0 && printed.attribution.startsWith("Quest'opera"),
      "Print page has controls or no attribution",
    );
    await page.screenshot({ path: shots + "b16-05-print-media.png", fullPage: true });
    await page.emulateMedia({ media: "screen" });
    passed.push(
      "7 print view: chrome hidden in print media, no controls, source and IT attribution kept; Stampa calls window.print once",
    );

    // 3. Reader: contents, position, previous/next, bookmark after reload.
    await button("Torna alla voce").click();
    await page.locator(".compendium-statblock").waitFor();
    await button("Regole: lettore").click();
    await button("6. Condizioni").first().click();
    await page.locator('[data-reader-section="srd2024:condition:prone"]').waitFor();
    await page.locator('[data-reader-jump="srd2024:condition:prone"]').click();
    await page.waitForFunction(() =>
      document.querySelector("[data-reader-position]")?.textContent.includes("Prono"),
    );
    check(
      (await page
        .locator('[data-reader-jump="srd2024:condition:prone"]')
        .getAttribute("aria-current")) === "location",
      "Contents do not mark the current section",
    );
    await page.locator('[data-reader-bookmark="srd2024:condition:prone"]').click();
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-reader-bookmark="srd2024:condition:prone"]')
          ?.getAttribute("aria-pressed") === "true",
    );
    await page.screenshot({ path: shots + "b16-06-reader-position-bookmark.png" });
    await page
      .locator(".compendium-pager")
      .getByRole("button", { name: /Riposo e sensi/ })
      .click();
    await page.locator('[data-reader-section="srd2024:rule:short-rest"]').waitFor();
    check(
      /5 di 6/i.test(await page.locator(".compendium-reader-main .compendium-kind").innerText()),
      "Previous chapter not opened",
    );
    await page
      .locator(".compendium-pager")
      .getByRole("button", { name: /Condizioni/ })
      .click();
    await page.locator('[data-reader-section="srd2024:condition:blinded"]').waitFor();
    await page.locator('[data-reader-jump="srd2024:condition:paralyzed"]').click();
    await page.waitForFunction(() =>
      document.querySelector("[data-reader-position]")?.textContent.includes("Paralizzato"),
    );
    await page.goto(base + "#library?tab=compendium&revision=reader");
    await page.reload();
    await page.locator(".compendium-resume").waitFor();
    check(
      (await page.locator(".compendium-resume").innerText()).includes("Paralizzato"),
      "Resume does not offer the last position",
    );
    check(
      (await page.locator("[data-bookmark-open]").first().innerText()) === "Prono · Condizioni",
      "Bookmark lost after reload",
    );
    const seen = (id) =>
      page
        .waitForFunction(
          (sel) => {
            const r = document.querySelector(sel)?.getBoundingClientRect();
            return r && r.top >= -5 && r.top < innerHeight / 2;
          },
          `[data-reader-section="${id}"]`,
          { timeout: 5000 },
        )
        .then(
          () => true,
          () => false,
        );
    await page.locator("[data-reader-resume]").click();
    await page.waitForFunction(() =>
      document.querySelector("[data-reader-position]")?.textContent.includes("Paralizzato"),
    );
    check(
      await seen("srd2024:condition:paralyzed"),
      "Resume did not bring the last section into view",
    );
    await page.locator("[data-bookmark-open]").first().click();
    await page.waitForFunction(() =>
      document.querySelector("[data-reader-position]")?.textContent.includes("Prono"),
    );
    check(await seen("srd2024:condition:prone"), "Bookmark did not bring the section into view");
    let data = await stored();
    check(
      data.ext.compendium.bookmarks.player.length === 1 &&
        data.ext.compendium.bookmarks.dm.length === 0,
      "Bookmark not stored privately",
    );
    passed.push(
      "3 reader: contents mark the section, previous/next chapter, resume (Paralizzato) and the Prono bookmark survive reload and return to their sections",
    );

    // Class summary and spell list pages.
    await page.goto(base + "#library?tab=compendium");
    await page.locator('[data-category="classes"]').click();
    await page
      .locator('.compendium-row:has([data-row-toggle="srd2024:class:wizard"]) [data-compendium-go]')
      .click();
    await page.locator(".compendium-class-table").waitFor();
    const row1 = await page.locator(".compendium-class-table tbody tr").first().innerText();
    check(
      row1.includes("Incantesimi, Adepto dei rituali, Recupero arcano"),
      "Wizard level-1 features not in Italian: " + row1,
    );
    const row5 = await page.locator(".compendium-class-table tbody tr").nth(4).innerText();
    check(/^5\s+\+3/.test(row5) && row5.includes("4\t3\t2"), "Wizard level 5 row wrong: " + row5);
    await button("Scuola").click();
    check(
      await page.getByRole("heading", { name: "Invocazione", level: 4 }).count(),
      "Spell list not grouped by school",
    );
    await page.screenshot({ path: shots + "b16-07-class-wizard.png" });
    await page.goto(base + "#library?tab=compendium&revision=class:paladin");
    await page.locator(".compendium-class-table").waitFor();
    const paladinHead = await page.locator(".compendium-class-table thead").innerText();
    check(
      !paladinHead.includes("Trucchetti") && paladinHead.includes("Incantesimi preparati"),
      "Paladin shows an always-0 cantrip column: " + paladinHead,
    );
    check(
      (await page.locator(".compendium-class-table tbody tr").first().innerText()).includes(
        "Imposizione delle mani",
      ),
      "Paladin level-1 features not in Italian",
    );
    passed.push(
      "class summary (FVT-173) level 5: PB +3, slots 4/3/2; IT feature names (Adepto dei rituali, Imposizione delle mani); no always-0 cantrip column for the Paladin; spell list (FVT-174) grouped by school",
    );

    // Sheet context: Library button on Livia's spells → compendium → add → back to the sheet.
    await page.locator('.app-header [data-nav="characters"]').click();
    await page.goto(base + "#characters?id=livia&tab=spells");
    await page.getByRole("button", { name: "Cerca nella Biblioteca" }).click();
    await page.locator('[data-library-scope="compendium"]').click();
    check(
      (await page.locator(".compendium-context").innerText()).includes("Scegli per Livia · Magie"),
      "Sheet context lost in the compendium",
    );
    await page.locator("[data-compendium-query]").fill("sonno");
    await page.waitForFunction(
      () => document.querySelector("[data-result-count]")?.textContent === "1 incantesimo",
    );
    await page.locator(".compendium-row [data-compendium-go]").first().click();
    await button("Aggiungi a Livia").click();
    check(
      (await page.locator('#dialog input[name="grant"]').inputValue()) === "Classe: Mago",
      "Grant not prefilled from Livia's class",
    );
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForURL(/#characters\?id=livia&tab=spells/);
    check(
      (await page.locator("#content").innerText()).includes("Sonno"),
      "Sonno not on Livia's sheet",
    );
    await page.screenshot({ path: shots + "b16-08-sheet-spell-added.png" });
    await page.reload();
    await page.locator("#content").waitFor();
    check(
      (await page.locator("#content").innerText()).includes("Sonno"),
      "Added spell lost after reload",
    );
    data = await stored();
    const sleepRow = data.actors.livia.spells.find(
      (s) => s.compendiumRef?.id === "srd2024:spell:sleep",
    );
    check(
      sleepRow && sleepRow.prepared === false && sleepRow.source.revision === "5.2.1",
      "Spell row lacks SRD provenance",
    );
    await page.goto(base + "#library?tab=compendium&revision=srd2024:spell:sleep");
    await button("Aggiungi a una scheda…").click();
    await page.locator("#dialog button[type=submit]").click();
    check(
      (await page.locator("#dialog .dialog-error").innerText()).includes(
        "è già nelle magie di Livia",
      ),
      "Duplicate spell not refused",
    );
    await page.keyboard.press("Escape");
    passed.push(
      "sheet flow: Livia → Magie → Cerca nella Biblioteca → Compendio SRD → Sonno → Aggiungi a Livia → back to sheet; persisted; duplicate refused",
    );

    // Library copy: an editable private copy. P8 BI-26 (Fantasy Grounds «copy from module»
    // with Revert, D&D Beyond homebrew copy): it opens the one structured homebrew editor,
    // which keeps the entry's structure and its source (no longer the Library text editor).
    await page.goto(base + "#library?tab=compendium&revision=srd2024:spell:shield");
    await button("Crea una copia modificabile").click();
    await page.waitForURL(/#homebrew-editor\?id=.*&tab=identity/);
    await page.getByRole("heading", { name: "Anteprima" }).waitFor();
    const preview = await page.locator("#content").innerText();
    const sourceField = (path) => page.locator(`[data-hbe-path="${path}"]`).inputValue();
    check(
      preview.includes("Scudo") &&
        preview.includes("Modello: Scudo · SRD 5.2.1") &&
        (await sourceField("source.label")).includes("SRD 5.2.1 · Shield / Scudo") &&
        (await sourceField("source.reference")).includes("CC BY 4.0") &&
        preview.includes("Tempo di lancio: 1 reazione") &&
        preview.includes("Componenti: V, S") &&
        preview.includes("Durata: 1 round") &&
        preview.includes("Copia modificabile di un modello SRD."),
      "Library copy not prefilled with its SRD source and game data",
    );
    await page.locator('[data-hbe="save-content"]').click();
    await page.waitForFunction(
      (k) => (JSON.parse(localStorage.getItem(k)).library ?? []).length === 1,
      key,
    );
    await page.locator("[data-hbe-detail]").waitFor();
    check(
      (await page.locator("#content").innerText()).includes(
        "SRD 5.2.1 · Shield / Scudo · EN p. 161, 162 / IT p. 186 · srd2024:spell:shield · CC BY 4.0",
      ),
      "Saved copy does not credit its SRD source",
    );
    const copy = (await stored()).library[0];
    check(
      copy.owner === "player" &&
        copy.revisions.at(-1).data.source.kind === "reconstruction" &&
        copy.revisions.at(-1).data.fields.level === 1 &&
        copy.revisions.at(-1).data.structured?.template?.id === "srd2024:spell:shield",
      "Library copy not saved as a personal revision",
    );
    // A creature copy opens the monster creator with its stat block as fields (P8 BI-23/26;
    // the page says so before the copy is made).
    await page.goto(base + "#library?tab=compendium&revision=srd2024:creature:wolf");
    check(
      (await page.locator("#compendium-copy-note").innerText()).includes("creatore di mostri"),
      "Creature copy note missing",
    );
    await button("Crea una copia modificabile").click();
    await page.waitForURL(/#homebrew-editor\?id=.*&tab=identity/);
    await page.getByRole("heading", { name: "Anteprima" }).waitFor();
    const wolfCopy = await page.locator("#content").innerText();
    for (const needle of ["CA 12", "PF 11 (2d8", "DES 15", "Morso.", "Colpire +4", "GS 1/4"])
      check(wolfCopy.includes(needle), "Creature copy lacks " + needle);
    passed.push(
      "library copy: Scudo → structured private draft (homebrew editor) with SRD source, CC BY reference and its casting time/range/components → saved as the player's own revision; the wolf copy opens the monster creator with AC, HP, abilities, bite and CR",
    );

    // Pronunciation (device voice) and offline: a personal bookmark is kept, a shared roll is refused.
    await page.goto(base + "#library?tab=compendium&revision=srd2024:creature:wolf");
    await page.locator(".compendium-statblock").waitFor();
    const speaker = page.locator('[data-cmd="speak"]');
    if (await speaker.count()) {
      await page.evaluate(() => {
        window.__spoken = [];
        speechSynthesis.speak = (u) => window.__spoken.push([u.text, u.lang]);
      });
      await speaker.click();
      const spoken = await page.evaluate(() => window.__spoken);
      check(
        spoken.length === 1 && spoken[0][0] === "Lupo" && spoken[0][1] === "it-IT",
        "Pronunciation not spoken: " + JSON.stringify(spoken),
      );
      passed.push("pronunciation: speaker button speaks «Lupo» with the it-IT device voice");
    } else
      passed.push(
        "pronunciation: no speechSynthesis in this browser, so no speaker button is shown",
      );
    await button("Preferenze").click();
    await page.locator("#dialog [name=offline]").check();
    await button("Salva preferenze").click();
    await button("Aggiungi ai segnalibri").click();
    await page.locator('[data-cmd="bookmark"][aria-pressed="true"]').waitFor();
    await page
      .locator(".compendium-entry [data-compendium-roll]", { hasText: "Colpire +4" })
      .click();
    await page.locator("#dialog button[type=submit]").click();
    check(
      (await page.locator("#dialog .dialog-error").innerText()).includes("Sei senza rete"),
      "Offline shared roll not refused",
    );
    await page.keyboard.press("Escape");
    check((await stored()).ext["compendium-rolls"].rolls.length === 0, "Offline roll recorded");
    check(
      (await stored()).ext.compendium.bookmarks.player.length === 2,
      "Offline personal bookmark not kept",
    );
    await button("Preferenze").click();
    await page.locator("#dialog [name=offline]").uncheck();
    await button("Salva preferenze").click();
    passed.push(
      "offline: personal bookmark saved locally, shared roll refused with the offline message, nothing recorded",
    );

    // Privacy: the DM sees none of the player's bookmarks.
    await tools(page).role("dm");
    await page.goto(base + "#library?tab=compendium&revision=reader");
    await page.locator(".compendium-bookmarks").waitFor();
    check(
      (await page.locator("[data-bookmark-open]").count()) === 0,
      "DM sees the player's bookmarks",
    );
    check(
      !(await page.locator(".compendium-resume").count()),
      "DM sees the player's reading position",
    );
    passed.push("privacy: the DM identity sees no player bookmark or reading position");
    await context.close();
  }

  // ------------------------------------------------------------ group 2: IT desktop, DM
  {
    const { context, page } = await open({ width: 1440, height: 900 });
    const { button, stored } = tools(page);
    await tools(page).role("dm");
    // A scene prepared but not revealed to the party (Preparation's own flow).
    await page.goto(base + "#preparation");
    await page.getByRole("button", { name: "Nuova scena", exact: true }).click();
    await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Cripta segreta");
    await page.getByRole("button", { name: "Crea bozza", exact: true }).click();
    await page.getByRole("button", { name: "Salva preparazione", exact: true }).click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).scenes.some((s) => s.name === "Cripta segreta"),
      key,
    );
    await page.goto(base + "#library?tab=compendium&revision=srd2024:creature:wolf");
    await page.locator(".compendium-statblock").waitFor();
    // Scene flow with undo: a free spot, DM-only log line.
    await button("Aggiungi a una scena…").click();
    check(
      !(await page.locator("#dialog [name=hidden]").isChecked()) &&
        (await page.locator("#dialog [name=where][value=map]").isChecked()),
      "Dialog defaults wrong for the revealed active scene",
    );
    await page.locator("#dialog [name=name]").fill("Figura nell'ombra");
    await page.locator('#dialog select[name="team"]').selectOption("watch");
    await page.locator("#dialog [name=where][value=free]").check();
    await page.locator("#dialog button[type=submit]").click();
    await page.locator(".compendium-status").waitFor();
    let data = await stored();
    const wolves = () =>
      Object.values(data.actors).filter((a) => a.compendiumRef?.id === "srd2024:creature:wolf");
    check(wolves().length === 1, "Wolf NPC not created");
    check(
      data.log.at(-1).visibility === "private" && data.log.at(-1).label.includes("(Lupo)"),
      "Scene log line is not DM-only: " + JSON.stringify(data.log.at(-1)),
    );
    await page.locator("[data-status-undo]").click();
    data = await stored();
    check(
      wolves().length === 0 &&
        data.log.at(-1).kind === "correction" &&
        data.log.at(-1).visibility === "private",
      "Undo did not remove the wolf with a DM-only correction",
    );
    // A scene not yet revealed defaults to a hidden arrival and a free spot; its name and
    // the creature stay out of the players' log.
    await button("Aggiungi a una scena…").click();
    const hiddenScene = await page
      .locator('#dialog select[name="scene"] option')
      .evaluateAll((options) => options.find((o) => o.textContent.includes("non rivelata"))?.value);
    check(hiddenScene, "The unrevealed scene is not offered");
    await page.locator('#dialog select[name="scene"]').selectOption(hiddenScene);
    check(
      (await page.locator("#dialog [name=hidden]").isChecked()) &&
        (await page.locator("#dialog [name=where][value=free]").isChecked()) &&
        !(await page.locator("#dialog [data-scene-where-map]").isVisible()),
      "Unrevealed scene: hidden arrival / free spot not the default",
    );
    await page.locator("#dialog [name=name]").fill("Guardiano della cripta");
    await page.locator("#dialog button[type=submit]").click();
    await page.locator("[data-status-prep]").waitFor();
    data = await stored();
    const guardian = Object.values(data.actors).find((a) => a.name === "Guardiano della cripta");
    check(
      data.scenes
        .find((s) => s.id === hiddenScene)
        .tokens.some((t) => t.actorId === guardian?.id && t.hidden === true),
      "Guardian not placed hidden on the unrevealed scene",
    );
    await button("Aggiungi a una scena…").click();
    // Drop at the clicked point (Foundry/Roll20): hidden arrival, then the Table tool.
    await page.locator("#dialog [name=name]").fill("Figura nell'ombra");
    await page.locator('#dialog select[name="team"]').selectOption("watch");
    await page.locator("#dialog [name=hidden]").check();
    await page.locator("#dialog [name=where][value=map]").check();
    await page.locator("#dialog button[type=submit]").click();
    await page.locator("#battle-map").waitFor();
    await page.locator("[data-compendium-place]").waitFor();
    await page.waitForFunction(
      () =>
        document
          .querySelector('.map-tool[data-tool="compendium-place"]')
          ?.getAttribute("aria-pressed") === "true",
    );
    check(
      (await page.locator("#map-message").innerText()).includes("Figura nell'ombra"),
      "Placement tool did not explain where to click",
    );
    check(
      !wolves().some((a) => a.name === "Figura nell'ombra"),
      "Creature created before the click",
    );
    const mapBox = await page.locator("#battle-map").boundingBox();
    await page.mouse.click(mapBox.x + mapBox.width * 0.25, mapBox.y + mapBox.height * 0.3);
    await page.waitForFunction(
      (k) =>
        Object.values(JSON.parse(localStorage.getItem(k)).actors).some(
          (a) => a.name === "Figura nell'ombra",
        ),
      key,
    );
    data = await stored();
    const wolf = wolves().find((a) => a.name === "Figura nell'ombra");
    const wolfToken = data.scenes
      .find((s) => s.id === "old-watch")
      .tokens.find((t) => t.actorId === wolf.id);
    check(
      wolf && wolf.hp === 11 && wolf.ac === 12 && wolf.combatProfile.meleeAttack.attackBonus === 4,
      "Wolf stat values not carried",
    );
    check(wolfToken?.hidden === true, "Wolf did not arrive hidden");
    check(!data.combat.order.includes(wolf.id), "Wolf joined initiative");
    check(!(await page.locator("[data-compendium-place]").count()), "Placement still pending");
    await page.screenshot({ path: shots + "b16-13-dm-placed-hidden.png" });
    // The player sees neither the hidden token nor the SRD name or scene in the log.
    await tools(page).role("player");
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    check(
      !(await page.locator('.map-token[data-actor="' + wolf.id + '"]').count()),
      "The player sees the hidden token",
    );
    await toggleLog(page); // B62: Chat › Registro
    await page.waitForTimeout(300);
    check(
      !/Lupo|Figura nell'ombra|Cripta segreta|Guardiano/.test(
        await page.locator("#content").innerText(),
      ),
      "The player's log names the SRD creature or the unrevealed scene",
    );
    await tools(page).role("dm");
    await page.goto(base + "#library?tab=compendium&revision=srd2024:creature:wolf");
    await page.locator(".compendium-statblock").waitFor();
    await button("Fissa nello schermo del DM").click();
    passed.push(
      "scene flow (preparation NPC): DM-only log line and DM-only Undo correction; on the unrevealed Cripta segreta the guardian arrives hidden on a free spot by default; drop at the clicked point with the Table tool; wolf arrives hidden with AC/HP/bite, not in initiative; the player sees no token and no SRD name in the log",
    );

    // 5. DM screen from the Table without leaving the scene.
    await page.locator("[data-status-table]").click();
    await page.locator("#battle-map").waitFor();
    check(
      await page.locator('.map-token[data-actor="' + wolf.id + '"]').count(),
      "Wolf token missing at the Table",
    );
    await openTablePanel(page, "compendium-screen"); // B62: Reference › DM screen
    const screen = page.locator(".compendium-screen");
    await screen.waitFor();
    check(
      page.url().includes("#table") && (await page.locator("#battle-map").isVisible()),
      "Opening the screen left the scene",
    );
    const titles = await screen.locator(".compendium-screen-cell > header h3").allInnerTexts();
    check(
      titles.join("|") === "Condizioni|Azioni|Regole di combattimento|Lupo",
      "Unexpected screen panels: " + titles.join("|"),
    );
    // The entry picker only belongs to "Voce del compendio" and searches every category.
    await screen.getByRole("button", { name: "Aggiungi riquadro…" }).click();
    check(
      !(await page.locator("#dialog [data-cell-entry]").isVisible()),
      "Entry picker shown for a panel kind that ignores it",
    );
    await page.locator('#dialog select[name="kind"]').selectOption("entry");
    await page.locator("#dialog [data-cell-search]").fill("prono");
    const pickable = await page
      .locator("#dialog [data-cell-entry-select] option:not([disabled])")
      .allInnerTexts();
    check(
      pickable.length === 1 && pickable[0] === "Prono",
      "Picker search across categories failed: " + pickable.join("|"),
    );
    await page.locator("#dialog footer [data-close]").click();
    await screen.getByRole("button", { name: "Aggiungi riquadro…" }).click();
    await page.locator('#dialog select[name="kind"]').selectOption("xp");
    await page.locator("#dialog button[type=submit]").click();
    await screen.getByRole("heading", { name: "PE per grado di sfida" }).waitFor();
    check(
      (await screen.locator(".screen-table").last().innerText()).includes("155.000"),
      "XP table stops before CR 30",
    );
    // Keyboard: the moved panel keeps focus on its own tool.
    await screen.getByRole("button", { name: "Sposta prima: PE per grado di sfida" }).focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() =>
      document.activeElement?.getAttribute("aria-label")?.includes("PE per grado di sfida"),
    );
    let order = await screen.locator(".compendium-screen-cell > header h3").allInnerTexts();
    check(order[3] === "PE per grado di sfida", "Move earlier failed: " + order.join("|"));
    const cellTitles = () => page.locator(".compendium-screen-cell > header h3").allInnerTexts();
    await screen.getByRole("button", { name: "Rimuovi: Azioni" }).focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () =>
        ![...document.querySelectorAll(".compendium-screen-cell > header h3")].some(
          (h) => h.textContent === "Azioni",
        ),
    );
    check(!(await cellTitles()).includes("Azioni"), "Remove failed");
    check(
      await page.evaluate(() => document.activeElement?.closest?.(".compendium-screen") !== null),
      "Focus left the DM screen after removing a panel",
    );
    await page.locator("[data-screen-undo]").click();
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".compendium-screen-cell > header h3")].some(
        (h) => h.textContent === "Azioni",
      ),
    );
    // Apply from the conditions panel goes to the selected creature, with Prono preselected.
    await page.locator('.map-token[data-actor="goblin-1"]').click();
    await screen.locator('[data-compendium-term="srd2024:condition:prone"]').first().click();
    await page.locator(".compendium-tip [data-tip-apply]").click();
    await page
      .locator("#dialog [data-conditions-definition]")
      .first()
      .waitFor({ state: "attached" })
      .catch(() => {});
    const dialogText = await page.locator("#dialog").innerText();
    check(
      dialogText.includes("Sentinella") && dialogText.includes("Prono"),
      "Apply did not open Conditions for Sentinella with Prono",
    );
    await page.keyboard.press("Escape");
    // A roll from the pinned stat block, without leaving the Table.
    await screen.locator("[data-compendium-roll]", { hasText: "Colpire +4" }).click();
    await page.locator('#dialog input[name="dieMode"][value="digital"]').check();
    await page.locator("#dialog button[type=submit]").click();
    await screen.locator("[data-compendium-last-roll]").waitFor();
    check(page.url().includes("#table"), "Rolling from the screen left the Table");
    await page.screenshot({ path: shots + "b16-09-dm-screen-table.png", fullPage: true });
    // The demo identity is not persisted: after a reload the visit starts as player again.
    await page.reload();
    await page.locator("#content").waitFor();
    check(
      !(await page.locator('[data-table-drawer="compendium-screen"]').count()),
      "The player sees the DM screen",
    );
    await tools(page).role("dm");
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    // B61: the DM screen is a sidebar tab remembered per identity: reopen it only if closed.
    await openTablePanel(page, "compendium-screen"); // B62: reopens only if closed
    await page.locator(".compendium-screen-cell > header h3").first().waitFor();
    order = await page.locator(".compendium-screen-cell > header h3").allInnerTexts();
    check(
      order.join("|") === "Condizioni|Azioni|Regole di combattimento|PE per grado di sfida|Lupo",
      "Screen layout lost after reload: " + order.join("|"),
    );
    // "Posiziona sulla mappa…" from the pinned block: the same dialog, Enter drops it at the
    // centre with the placement tool (keyboard path of the handouts pin).
    await page.locator(".compendium-screen [data-cell-place]").first().click();
    await page.locator("#dialog [name=name]").fill("Lupo di guardia");
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForFunction(
      () =>
        document
          .querySelector('.map-tool[data-tool="compendium-place"]')
          ?.getAttribute("aria-pressed") === "true",
    );
    await page.locator("#battle-map").focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      (k) =>
        Object.values(JSON.parse(localStorage.getItem(k)).actors).some(
          (a) => a.name === "Lupo di guardia",
        ),
      key,
    );
    // The XP table goes into a new personal note through the same embed flow.
    await page.locator("[data-cell-embed]").first().click();
    await page.locator('#dialog select[name="target"]').selectOption("new:note");
    await page.locator("#dialog button[type=submit]").click();
    await page.locator("[data-campaign-form]").waitFor();
    check(
      (await page.locator("[data-campaign-form] textarea").first().inputValue()).endsWith(
        "@Embed[srd2024:table:xp-by-cr]",
      ),
      "XP table embed marker missing",
    );
    // P9 SV-05: a private personal note folds its preview away (one save); open it to read
    // the embedded table.
    const notePreview = page.locator('details[data-campaign-details="preview"]');
    if ((await notePreview.count()) && !(await notePreview.evaluate((d) => d.open)))
      await notePreview.locator("summary").click();
    await page.locator(".text-embed .screen-table").first().waitFor();
    passed.push(
      "5 DM screen in a Table drawer (scene stays): entry picker only for entries, searching every category; full XP table (CR 30); add/move/remove/undo panels with focus kept on the panel tools; Apply Prono to the selected Sentinella; digital roll; place a pinned wolf with Enter; XP table embedded in a note; layout survives reload",
    );

    // 6. Embed in a journal entry; physical and digital rolls; DM-only roll hidden from player.
    // First a rollable table (the campaign's "Voci alla Lanterna", open to players).
    await page.goto(base + "#library?tab=compendium");
    await button("Incorpora una tabella…").click();
    await page.locator('#dialog select[name="subject"]').selectOption("table:lantern-rumours");
    await page.locator('#dialog select[name="target"]').selectOption("legacy-recap-summary");
    await page.locator("#dialog button[type=submit]").click();
    await page.locator("[data-campaign-form]").waitFor();
    check(
      (await page.locator("[data-campaign-form] textarea").first().inputValue()).endsWith(
        "@Embed[table:lantern-rumours]",
      ),
      "Random table embed marker missing",
    );
    await page.locator("[data-campaign-apply]").click();
    if (await page.locator("[data-campaign-apply]").count())
      await page.locator("[data-campaign-apply]").click();
    await page.waitForURL(/tab=entry&id=legacy-recap-summary/);
    await page.locator(".text-embed [data-embed-draw]").waitFor();
    await page.goto(base + "#library?tab=compendium&revision=srd2024:creature:wolf");
    await button("Incorpora nel diario…").click();
    await page.locator('#dialog select[name="target"]').selectOption("legacy-recap-summary");
    await page.locator("#dialog button[type=submit]").click();
    await page.locator("[data-campaign-form]").waitFor();
    check(
      (await page.locator("[data-campaign-form] textarea").first().inputValue()).endsWith(
        "@Embed[srd2024:creature:wolf]",
      ),
      "Editor body lacks the embed marker",
    );
    check(
      await page.locator(".campaign-preview .text-embed .compendium-statblock").count(),
      "Preview does not show the embedded block",
    );
    await page.locator("[data-campaign-apply]").click();
    if (await page.locator("[data-campaign-apply]").count())
      await page.locator("[data-campaign-apply]").click();
    await page.waitForURL(/tab=entry&id=legacy-recap-summary/);
    const embed = page.locator(".text-embed");
    await embed.locator(".compendium-statblock").waitFor();
    await embed.locator("[data-compendium-roll]", { hasText: "Colpire +4" }).click();
    await page.locator('#dialog input[name="dieMode"][value="physical"]').check();
    await page.locator('#dialog input[name="face-0"]').fill("21");
    await page.locator("#dialog button[type=submit]").click();
    check(
      await page.locator('#dialog input[name="face-0"]').evaluate((el) => el.matches(":invalid")),
      "Face 21 on a d20 accepted",
    );
    check(
      (await stored()).ext["compendium-rolls"].rolls.length === 1,
      "An invalid physical face recorded a roll",
    );
    await page.locator('#dialog input[name="face-0"]').fill("14");
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForFunction(() =>
      document
        .querySelector(".text-embed [data-compendium-last-roll]")
        ?.textContent.includes("= 18"),
    );
    check(
      (await embed.locator("[data-compendium-last-roll]").innerText()).includes("dado fisico"),
      "Physical roll not recorded",
    );
    // A mistyped physical face: reasoned correction; the first faces stay on record.
    await embed.locator("[data-roll-correct]").click();
    await page.locator('#dialog input[name="face-0"]').fill("16");
    await page.locator("#dialog button[type=submit]").click();
    check(
      await page
        .locator('#dialog textarea[name="reason"]')
        .evaluate((el) => el.matches(":invalid")),
      "A correction without a reason was accepted",
    );
    await page.locator('#dialog textarea[name="reason"]').fill("Letto 14, il dado diceva 16");
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForFunction(() =>
      document
        .querySelector(".text-embed [data-compendium-last-roll]")
        ?.textContent.includes("Corretto: Letto 14, il dado diceva 16 (prima 14)"),
    );
    await embed.locator("[data-compendium-roll]", { hasText: "Danni" }).click();
    await page.locator('#dialog input[name="dieMode"][value="digital"]').check();
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForFunction(() =>
      document
        .querySelector(".text-embed [data-compendium-last-roll]")
        ?.textContent.includes("dado digitale"),
    );
    // A digital roll made by mistake is withdrawn with a reason (never edited).
    check(
      !(await embed.locator("[data-roll-correct]").count()),
      "Digital faces offered for correction",
    );
    await embed.locator("[data-roll-withdraw]").click();
    await page.locator('#dialog textarea[name="reason"]').fill("Premuto per errore");
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForFunction(() =>
      document
        .querySelector(".text-embed [data-compendium-last-roll]")
        ?.textContent.includes("Ritirato: Premuto per errore"),
    );
    await page.screenshot({ path: shots + "b16-10-journal-embed-rolls.png", fullPage: true });
    // A DM-only roll then the player's view.
    await embed.locator("[data-compendium-roll]", { hasText: "Colpire +4" }).click();
    await page.locator('#dialog select[name="visibility"]').selectOption("private");
    await page.locator("#dialog button[type=submit]").click();
    data = await stored();
    const rolls = data.ext["compendium-rolls"].rolls;
    check(
      rolls.length === 4 &&
        rolls[1].mode === "physical" &&
        rolls[1].total === 20 &&
        rolls[1].status === "corrected" &&
        rolls[1].corrections[0].values[0] === 14 &&
        rolls[2].status === "withdrawn" &&
        rolls[3].visibility === "private",
      "Roll records wrong: " +
        JSON.stringify(rolls.map((r) => [r.mode, r.total, r.status, r.visibility])),
    );
    const physicalEntry = data.log.find(
      (l) => l.label.includes("Lupo · Morso · tiro per colpire") && l.label.includes("dado fisico"),
    );
    check(
      physicalEntry?.rolls?.[0]?.source === "compendium" && physicalEntry.rolls[0].values[0] === 14,
      "Roll not in the session log as a log roll",
    );
    const correctionEntry = data.log.find((l) => l.label.startsWith("Correzione del tiro"));
    check(
      correctionEntry?.rolls?.[0]?.correctionReason === "Letto 14, il dado diceva 16" &&
        correctionEntry.rolls[0].previousValues[0] === 14,
      "Correction not logged with its reason",
    );
    await tools(page).role("player");
    await page.goto(base + "#campaign?tab=entry&id=legacy-recap-summary");
    await page.locator(".text-embed .compendium-statblock").waitFor();
    const playerLast = await page
      .locator(".text-embed [data-compendium-last-roll]")
      .first()
      .innerText();
    check(
      playerLast.includes("danni") && !playerLast.includes("solo DM"),
      "Player sees the DM-only roll: " + playerLast,
    );
    check(
      !(await page.locator(".text-embed [data-roll-withdraw]").count()),
      "The player is offered to withdraw the DM's roll",
    );
    // The player reads the embedded random table and rolls through its own area.
    const rumours = page.locator(".text-embed", { hasText: "Voci alla Lanterna" });
    check(await rumours.locator("tbody tr").count(), "Player does not see the embedded table rows");
    await rumours.locator("[data-embed-draw]").click();
    // P8 (Foundry roll table drawn from a journal link, Roll20 inline table roll): a simple
    // campaign table is drawn in place; the result is a notice and a log roll, the entry stays.
    await page.locator("#toast", { hasText: "Voci alla Lanterna" }).waitFor();
    check(
      /#campaign\?tab=entry&id=legacy-recap-summary/.test(page.url()),
      "Drawing the embedded table left the entry: " + page.url(),
    );
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    // The chat log shows the compendium roll cards with the correction reason. The sidebar
    // remembers the player's last tab (it may already be the log): open it, never toggle.
    await openTablePanel(page, "log"); // B62: Chat › Registro
    await page.locator(".chat-roll-card").first().waitFor();
    const cards = await page.locator(".chat-roll-card").allInnerTexts();
    check(
      cards.some((c) => c.includes("Lupo") && c.includes("Correzione: Letto 14")),
      "Chat lacks the corrected compendium roll: " + cards.join(" | "),
    );
    check(
      (await page.locator("#table-sidebar-panel").innerText()).includes("Voci alla Lanterna"),
      "The player's table draw is not in the log",
    );
    check(!cards.some((c) => c.includes("solo DM")), "Chat shows a DM-only roll");
    passed.push(
      "6 journal embed via the campaign editor (stat block and the rollable Voci alla Lanterna table, read and drawn in place by the player, draw in the log); physical face validated (21 refused, 14 → 18), corrected to 16 with a reason (= 20, 14 kept); digital damage withdrawn with a reason; log rolls in the chat with the correction; DM-only roll hidden from the player",
    );
    await context.close();
  }

  // ------------------------------------------------------------ group 3: EN phone 390 touch
  {
    const { context, page } = await open(
      { width: 390, height: 844 },
      { hasTouch: true, isMobile: true },
    );
    const { button, count, noOverflow } = tools(page);
    await button("Preferenze").tap();
    await page.locator('#dialog [name="lang"]').selectOption("en");
    await button("Salva preferenze").tap();
    await page.locator('.app-header [data-nav="library"]').tap();
    await page.locator('[data-library-scope="compendium"]').tap();
    await page.locator(".compendium-categories").waitFor();
    check((await count()) === "68 spells", "English count wrong: " + (await count()));
    check(
      !(await page.locator("[data-filter-box]").evaluate((el) => el.open)),
      "Filters not collapsed on the phone",
    );
    await page.locator("[data-filter-box] > summary").tap();
    await page.locator('[data-facet="level"][value="1"]').tap();
    check((await count()) === "26 spells", "Phone facet failed: " + (await count()));
    check(await noOverflow(), "Browser overflows at 390");
    const small = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          ".compendium button, .compendium input[type=checkbox], .compendium select",
        ),
      ]
        .filter((el) => el.offsetParent && !el.matches(".compendium-term"))
        .map((el) => {
          const target = el.matches("input[type=checkbox]") ? el.closest("label") : el;
          const r = target.getBoundingClientRect();
          return [
            el.textContent.trim().slice(0, 24) || el.outerHTML.slice(0, 40),
            Math.round(r.height),
          ];
        })
        .filter(([, h]) => h < 40),
    );
    check(!small.length, "Targets under 40px: " + JSON.stringify(small.slice(0, 6)));
    await page.screenshot({ path: shots + "b16-11-phone-en-browse.png", fullPage: true });
    await page.goto(base + "#library?tab=compendium&revision=srd2024:creature:wolf");
    await page.locator(".compendium-statblock").waitFor();
    check(
      (await page.locator(".compendium-entry h2").innerText()) === "Wolf",
      "English content not default for an English UI",
    );
    await page.locator('.compendium-entry [data-compendium-term="srd2024:condition:prone"]').tap();
    const tip = page.locator('.compendium-tip[data-level="0"].locked');
    await tip.waitFor();
    const box = await tip.boundingBox();
    check(box.x >= 0 && box.x + box.width <= 390 + 1, "Tooltip leaves the phone viewport");
    await page.screenshot({ path: shots + "b16-12-phone-en-tooltip.png" });
    await page.locator(".compendium-alt-name").tap();
    check(
      (await page.locator(".compendium-tip").count()) === 0,
      "Outside tap did not close the tooltip",
    );
    // DDB-166: an outside tap on a control only dismisses; it does not also press it.
    await page.locator('.compendium-entry [data-compendium-term="srd2024:condition:prone"]').tap();
    await page.locator('.compendium-tip[data-level="0"].locked').waitFor();
    const chaCheck = page.locator(".compendium-abilities [data-compendium-roll]").nth(10);
    await chaCheck.scrollIntoViewIfNeeded();
    await chaCheck.tap();
    await page.waitForTimeout(400);
    check(
      (await page.locator(".compendium-tip").count()) === 0 &&
        !(await page.evaluate(() => document.querySelector("#dialog")?.open)),
      "Outside tap closed the tooltip and also opened the roll dialog",
    );
    await chaCheck.tap();
    await page.locator("#dialog[open]").waitFor();
    await page.keyboard.press("Escape");
    const pdf = await page.locator(".compendium-source a").first().boundingBox();
    check(pdf.height >= 40, "Footer link under 40px: " + pdf.height);
    check(await noOverflow(), "Entry overflows at 390");
    // Reader on the phone: contents folded, "chapter · section" bar in view mid-chapter.
    await page.goto(base + "#library?tab=compendium&revision=reader:conditions");
    await page.locator('[data-reader-section="srd2024:condition:prone"]').waitFor();
    check(
      !(await page.locator("[data-toc-box]").evaluate((el) => el.open)),
      "Contents not folded on the phone",
    );
    await page.locator('[data-reader-section="srd2024:condition:prone"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    const bar = await page.evaluate(() => {
      const r = document.querySelector(".compendium-position-bar").getBoundingClientRect();
      return {
        inView: r.top >= 0 && r.bottom <= innerHeight,
        text: document.querySelector("[data-reader-position]").textContent,
      };
    });
    check(
      bar.inView && /Conditions · Now reading: /.test(bar.text),
      "Reading position not in view mid-chapter: " + JSON.stringify(bar),
    );
    await page.screenshot({ path: shots + "b16-14-phone-reader-bar.png" });
    await page.locator("[data-reader-toc]").tap();
    check(
      await page.locator("[data-toc-box]").evaluate((el) => el.open),
      "Contents button did not open the contents",
    );
    for (const view of [
      "reader:conditions",
      "legal",
      "class:wizard",
      "print:srd2024:creature:wolf",
    ]) {
      await page.goto(base + "#library?tab=compendium&revision=" + view);
      await page.locator(".compendium").waitFor();
      check(await noOverflow(), "Overflow at 390 on " + view);
    }
    passed.push(
      "EN phone 390 touch: collapsed filters, facet tap, English content by default, tooltip inside viewport and closed by an outside tap that does not also press the control under it; footer link 40px; reader with folded contents and a chapter · section bar in view mid-chapter; no overflow on browse/entry/reader/legal/class/print, targets ≥ 40px",
    );
    await context.close();
  }

  check(!errors.length, "Page errors: " + errors.join(" | "));
  return { passed, errors };
};
