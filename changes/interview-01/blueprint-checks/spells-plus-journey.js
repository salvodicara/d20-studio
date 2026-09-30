async (rootPage) => {
  // B38 Spells: management, lists, comparison, rituals and items. Real clicks, keys and taps
  // against the running blueprint (synthetic data; resets this browser's demo state).
  // Acceptance (CAPABILITY_CENSUS B38): (1) Iria adds spells from the compendium filtered to
  // her class, prepares and unprepares; "always prepared" cannot be removed; a message when
  // preparation cannot change. (2) List "Esplorazione" saved and recalled as a proposal with
  // differences. (3) Side-by-side comparison and return to the choice. (4) Ritual: +10
  // minutes on the clock, no slot. (5) One icon with the available levels. (6) Wand: charges,
  // not slots. (7) New Concentration warning. (8) Copying with time and cost. (9) Missing
  // focus or material component flagged.
  // IT desktop 1440x900 (player, then DM vs player on Livia), then an EN 390x844 touch
  // context. Reload persistence, Undo/correction. Run: playwright-cli -s=d20-b38 --raw
  // run-code --filename=<this file> from
  // /Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B38/.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B38/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push("desktop: " + error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const ok = (message) => passed.push(message);
  const saved = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const dialog = (p = page) => p.locator("#dialog[open]");
  const submit = (p = page) => p.locator("#dialog[open] button[type=submit]");
  const toast = (p = page) =>
    p
      .locator("#toast")
      .innerText()
      .catch(() => "");
  const row = (id, p = page) => p.locator(`[data-spl-row="${id}"]`);
  const setRole = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForTimeout(250);
  };
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const smallTargets = (p = page) =>
    p.evaluate(() =>
      [
        ...document.querySelectorAll(
          ".spl-panel button, .spl-panel select, .spl-panel input[type=search]",
        ),
      ]
        .filter((el) => el.offsetParent !== null && el.getBoundingClientRect().height > 0)
        .map((el) => ({
          text: (el.innerText || el.getAttribute("aria-label") || el.name || "")
            .trim()
            .slice(0, 30),
          h: Math.round(el.getBoundingClientRect().height),
          w: Math.round(el.getBoundingClientRect().width),
        }))
        .filter((box) => box.h < 40 || box.w < 40),
    );
  const styled = (p = page) =>
    p.waitForFunction(() =>
      [...document.styleSheets].some(
        (s) => s.href?.endsWith("/spells-plus.css") && s.cssRules.length,
      ),
    );
  const dismissTips = async (p = page) => {
    for (const name of ["Non mostrare suggerimenti", "Don’t show tips", "Ho capito", "Got it"]) {
      const b = p.getByRole("button", { name, exact: true });
      if (await b.count())
        await b
          .first()
          .click()
          .catch(() => {});
    }
  };
  const openSpells = async (id, p = page) => {
    await p.goto(base + `#characters?id=${id}&tab=spells`);
    await p.locator(".spl-panel").waitFor();
    await p.waitForTimeout(150);
  };

  let phoneContext = null;
  try {
    // -----------------------------------------------------------------------------------
    // A. Reach: Personaggi → Apri scheda (Iria) → Magie: three clicks.
    await page.goto(base);
    await page.evaluate((k) => localStorage.removeItem(k), key);
    await page.reload();
    await page.locator("#content").waitFor();
    await styled();
    await dismissTips();
    await page.locator('.app-header [data-nav="characters"]').click();
    await page.locator('[data-character-action="open"][data-actor="iria"]').click();
    await page.locator('[data-character-tab="spells"]').click();
    await page.locator(".spl-panel").waitFor();
    await dismissTips();
    const header = await page.locator(".spl-stats").innerText();
    check(/Mago 5/.test(header) && /\+7/.test(header) && /15/.test(header), "header: " + header);
    check(/7 \/ 9/.test(header), "prepared count missing: " + header);
    check(
      (await page.locator(".spl-window").innerText()).includes("Puoi cambiare le magie preparate"),
      "window message missing",
    );
    await page.screenshot({ path: shots + "b38-01-magie-it-1440.png" });
    ok(
      "A. Personaggi → Apri scheda (Iria) → Magie in 3 clicks; DDB header Mago 5 · INT +4 · attacco +7 · CD 15 · preparate 7/9 (+2 sempre); BG3 message: preparation can change now",
    );

    // -----------------------------------------------------------------------------------
    // B. (1) Manage spells: class list filtered to the Wizard, add Sleep to the book, prepare
    // it, unprepare Mage Armor; always prepared locked.
    await page.locator('.spl-heading [data-spl="manage"]').click();
    await page.locator("#spl-manage").waitFor();
    check(
      (await page.locator('.spl-heading [data-spl="manage"]').getAttribute("aria-expanded")) ===
        "true",
      "manage not expanded",
    );
    await page.locator('[data-spl-tab="class"]').click();
    await page.locator("[data-spl-class-list]").waitFor();
    check(
      !(await page.locator('[data-spl-class-row="cure-wounds"]').count()),
      "class list shows a Cleric spell",
    );
    check(
      (await page.locator('[data-spl-class-row="polymorph"]').innerText()).includes(
        "Serve uno slot di livello 4",
      ),
      "level 4 spell not explained",
    );
    await page.locator("[data-spl-mquery]").fill("sonno");
    check(
      !(await page.locator('[data-spl-class-row="fireball"]').isVisible()),
      "search did not filter",
    );
    await page.locator('[data-spl-class-row="sleep"] [data-spl="add-book"]').click();
    await page.waitForTimeout(200);
    let state = await saved();
    const sleep = state.actors.iria.spells.find((r) => r.catalogId === "sleep");
    check(sleep && sleep.bookOrigin === "level" && !sleep.prepared, "Sleep not added to the book");
    await page.screenshot({ path: shots + "b38-02-manage-class-list-1440.png" });
    await page.locator('[data-spl-tab="prepare"]').click();
    await page.locator(`[data-spl-manage-row="${sleep.id}"] [data-spl="toggle"]`).click();
    await page.locator('[data-spl-manage-row="iria-mage-armor"] [data-spl="toggle"]').click();
    await page.locator("[data-spl-draft]").waitFor();
    const draftText = await page.locator("[data-spl-draft]").innerText();
    check(/\+1 −1 · 7 \/ 9/.test(draftText), "draft count: " + draftText);
    check(
      /\+ Sonno/.test(draftText) && /− Armatura magica/.test(draftText),
      "draft diff: " + draftText,
    );
    check(
      (await page.locator('[data-spl-manage-row="iria-detect-magic"]').innerText()).includes(
        "Sempre preparata: non conta nel limite e non si toglie",
      ) && !(await page.locator('[data-spl-manage-row="iria-detect-magic"] button').count()),
      "always prepared has a toggle",
    );
    state = await saved();
    check(
      state.actors.iria.spells.find((r) => r.id === "iria-mage-armor").prepared,
      "draft applied before confirmation",
    );
    ok(
      "B. (1) DDB Manage Spells: class list filtered to the Wizard (no Cura ferite; Metamorfosi explains the level 4 slot); search «sonno» → Aggiungi al libro (free level choice); Libro: Prepara Sonno, Togli Armatura magica → draft +1 −1 · 7/9, nothing applied yet; Individuazione del magico locked «Sempre preparata»",
    );

    // -----------------------------------------------------------------------------------
    // C. (2) Save the draft as «Esplorazione», discard, recall as a proposal, confirm.
    await page.locator('[data-spl-tab="lists"]').click();
    await page.locator("[data-spl-save-list] input[name=name]").fill("Esplorazione");
    await page.locator("[data-spl-save-list] button[type=submit]").click();
    await page.locator('[data-spl-saved]:has-text("Esplorazione")').waitFor();
    await page.locator('[data-spl="discard"]').click();
    await page.waitForTimeout(200);
    check(!(await page.locator("[data-spl-draft]").count()), "draft not discarded");
    state = await saved();
    check(
      state.actors.iria.spells.find((r) => r.id === "iria-mage-armor").prepared,
      "discard lost the confirmed preparation",
    );
    await page
      .locator('[data-spl-saved]:has-text("Esplorazione") [data-spl="list-recall"]')
      .click();
    await dialog().waitFor();
    const proposal = await dialog().innerText();
    check(
      /Da preparare \(\+1\)[\s\S]*Sonno[\s\S]*Da togliere \(−1\)[\s\S]*Armatura magica/.test(
        proposal,
      ),
      "proposal differences: " + proposal,
    );
    await page.screenshot({ path: shots + "b38-03-list-proposal-1440.png" });
    await submit().click();
    await page.locator('[data-spl-draft]:has-text("dalla lista «Esplorazione»")').waitFor();
    await page.locator('[data-spl="confirm"]').click();
    await page.waitForTimeout(250);
    state = await saved();
    check(
      state.actors.iria.spells.find((r) => r.catalogId === "sleep").prepared &&
        !state.actors.iria.spells.find((r) => r.id === "iria-mage-armor").prepared &&
        state.actors.iria.spells.find((r) => r.id === "iria-detect-magic").prepared,
      "confirmed preparation wrong",
    );
    // Close regression (01/10/2026): since the final review's UX F10 (D&D Beyond: the spell
    // list right under the tabs) a closed window is one line and its rule sits behind «Perché?».
    // Open it, then read both sentences as before.
    await page.locator('.spl-window[data-spl-window="closed"] .spl-window-why summary').click();
    check(
      (await page.locator(".spl-window").innerText()).includes(
        "Preparazione non modificabile ora",
      ) &&
        (await page.locator(".spl-window").innerText()).includes(
          "Le magie preparate si cambiano al termine di un riposo lungo",
        ),
      "closed message missing",
    );
    await page.locator('[data-spl-tab="prepare"]').click();
    const lockedToggle = page.locator(
      '[data-spl-manage-row="iria-mage-armor"] [data-spl="toggle"]',
    );
    check(await lockedToggle.isDisabled(), "toggle enabled while preparation is closed");
    // Refreshed by the round-2 regression (29/09/2026): SV-37 (round 2) names a disabled
    // control's cause and remedy in a visible sentence linked by aria-describedby, not a title.
    const whyId = await lockedToggle.getAttribute("aria-describedby");
    const why = page.locator("#" + (whyId || "missing-reason"));
    check(
      Boolean(whyId) && (await why.isVisible()) && /riposo lungo/.test(await why.innerText()),
      "disabled toggle does not say why",
    );
    await page.screenshot({ path: shots + "b38-04-preparation-closed-1440.png" });
    await page.reload();
    await page.locator(".spl-panel").waitFor();
    state = await saved();
    check(
      state.actors.iria.spells.find((r) => r.catalogId === "sleep").prepared &&
        state.ext["spells-plus"].lists.iria[0].name === "Esplorazione",
      "reload lost preparation or list",
    );
    ok(
      "C. (2) «Esplorazione» saved from the draft; Annulla modifiche keeps the confirmed preparation; Richiama opens the proposal (Da preparare +1 Sonno, Da togliere −1 Armatura magica); Usa come proposta → draft «dalla lista» → Conferma; (1) now «Preparazione non modificabile ora… riposo lungo», toggles disabled with the reason; reload keeps both",
    );

    // -----------------------------------------------------------------------------------
    // D. (3) Compare Shield and Fireball side by side, back to the choice.
    // After the reload the side panel is closed again (like D&D Beyond's sidebar).
    check(!(await page.locator("#spl-manage").count()), "manage panel survived a reload");
    await row("iria-shield").locator('[data-spl="compare"]').click();
    await row("iria-fireball").locator('[data-spl="compare"]').click();
    await page.locator(".spl-compare-tray").waitFor();
    check(
      (await page.locator(".spl-compare-tray").innerText()).includes("Confronto (2)"),
      "tray count",
    );
    const beforeCompare = JSON.stringify(await saved());
    await page.locator('[data-spl="compare-open"]').click();
    await dialog().waitFor();
    const table = await page.locator("#dialog .spl-compare").innerText();
    check(
      /Tempo di lancio\s+1 reazione\s+1 azione/.test(table) &&
        /Danni o cure\s+non disponibile\s+8d6 Fuoco/.test(table),
      "compare table: " + table,
    );
    await page.screenshot({ path: shots + "b38-05-compare-1440.png" });
    await page.getByRole("button", { name: "Torna alla scelta", exact: true }).click();
    await page.waitForTimeout(200);
    check(!(await dialog().count()), "compare dialog still open");
    check(
      await page.evaluate(() => document.activeElement?.dataset?.spl === "compare-open"),
      "focus did not return to Confronta",
    );
    check(JSON.stringify(await saved()) === beforeCompare, "comparing changed the state");
    await page.locator('[data-spl="compare-clear"]').click();
    ok(
      "D. (3) Confronta on Scudo and Palla di fuoco → tray «Confronto (2)» → same criteria side by side (1 reazione / 1 azione; danni «non disponibile» vs 8d6 Fuoco, no winner) → «Torna alla scelta» returns focus to Confronta; state unchanged",
    );

    // -----------------------------------------------------------------------------------
    // E. (4) Detect Magic as a Ritual: +10 minutes on Iria's personal clock, no slot.
    const slotsBefore = JSON.stringify((await saved()).actors.iria.spellSlots);
    await row("iria-detect-magic").locator('[data-spl="cast"][data-via="ritual"]').click();
    await dialog().waitFor();
    const ritualText = await dialog().innerText();
    check(
      /Nessuno slot: rituale/.test(ritualText) &&
        /Orologio personale: Giorno 1 · 00:00 → Giorno 1 · 00:10/.test(ritualText),
      "ritual dialog: " + ritualText,
    );
    check((await submit().innerText()) === "Lancia come rituale", "ritual submit label");
    await page.screenshot({ path: shots + "b38-06-ritual-1440.png" });
    await submit().click();
    await page.waitForTimeout(250);
    state = await saved();
    check(state.restTime.clocks["personal:iria"].seconds === 600, "clock not +10 minutes");
    check(JSON.stringify(state.actors.iria.spellSlots) === slotsBefore, "ritual spent a slot");
    check(
      state.actors.iria.concentration?.name?.it === "Individuazione del magico",
      "no concentration",
    );
    check(
      (await page.locator("[data-spl-clock]").innerText()).includes("Giorno 1 · 00:10"),
      "clock not shown",
    );
    ok(
      "E. (4) «Come rituale» on Individuazione del magico: usage dialog «Nessuno slot: rituale · Orologio personale 00:00 → 00:10» → personal clock 600 s, slots unchanged, Concentration started, clock shown in the tab",
    );

    // -----------------------------------------------------------------------------------
    // F. (5) One icon, its levels: Magic Missile opened from the keyboard, level 2.
    const variants = row("iria-magic-missile").locator('[data-spl="variants"]');
    await variants.focus();
    await page.keyboard.press("Enter");
    const levels = page.locator("#spl-var-iria-magic-missile");
    await levels.waitFor();
    check((await variants.getAttribute("aria-expanded")) === "true", "variants not expanded");
    const levelText = await levels.innerText();
    check(
      /1° · 4\/4/.test(levelText) && /2° · 3\/3/.test(levelText) && /3° · 2\/2/.test(levelText),
      "levels: " + levelText,
    );
    await page.screenshot({ path: shots + "b38-07-variants-1440.png" });
    await levels.locator('button:has-text("2°")').click();
    await dialog().waitFor();
    check(
      await page.locator('#dialog input[name=variant][value="slot:2"]').isChecked(),
      "level 2 not preselected",
    );
    check((await dialog().innerText()).includes("Slot di livello 2: 3 → 2"), "cost not shown");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    check((await saved()).actors.iria.spellSlots[2].used === 0, "Escape spent a slot");
    await levels.locator('button:has-text("2°")').click();
    await submit().click();
    await page.waitForTimeout(250);
    check((await saved()).actors.iria.spellSlots[2].used === 1, "level 2 slot not spent");
    ok(
      "F. (5) Dardo incantato: one «Lancia ▾» opened with Enter shows 1° 4/4 · 2° 3/3 · 3° 2/2 (BG3 variants); 2° preselects the level in the dnd5e usage dialog (Slot 2: 3 → 2); Escape spends nothing; Lancia spends one level 2 slot",
    );

    // -----------------------------------------------------------------------------------
    // G. (9) Put the focus away: Fly is blocked; (7) the new Concentration warning.
    await page.locator('[data-spl-focus="iria-focus"] [data-spl="hold"]').click();
    await page.waitForTimeout(200);
    check(
      !(await saved()).actors.iria.inventory.find((r) => r.id === "iria-focus").equipped,
      "focus still held",
    );
    await row("iria-fly").locator('[data-spl="cast"]').click();
    await dialog().waitFor();
    let flyText = await dialog().innerText();
    check(
      /Serve un focus impugnato \(focus arcano o libro degli incantesimi\)/.test(flyText) &&
        /Cristallo \(focus arcano\) non è impugnato/.test(flyText),
      "missing focus not flagged: " + flyText,
    );
    check(await submit().isDisabled(), "cast allowed without a focus");
    await page.screenshot({ path: shots + "b38-08-focus-missing-1440.png" });
    await page.locator("#dialog [data-spl-hold]").click();
    await page.waitForTimeout(250);
    flyText = await dialog().innerText();
    check(!/Serve un focus/.test(flyText), "focus still missing after holding it");
    check(
      (await page.locator("#dialog [data-spl-conc-warning]").innerText()).includes(
        "Interromperà la concentrazione su Individuazione del magico",
      ),
      "concentration warning missing",
    );
    check(
      (await submit().innerText()) === "Lancia e termina la concentrazione",
      "submit label does not name the consequence",
    );
    await page.screenshot({ path: shots + "b38-09-concentration-warning-1440.png" });
    await submit().click();
    await page.waitForTimeout(250);
    state = await saved();
    check(state.actors.iria.concentration.name.it === "Volare", "Fly not concentrating");
    check(state.actors.iria.spellSlots[3].used === 1, "Fly slot not spent");
    check(
      (await page.locator(".spl-log").innerText()).includes(
        "termina la concentrazione su Individuazione del magico",
      ),
      "log does not record the ended concentration",
    );
    // Find Familiar: the costly consumed incense is flagged; the casting belongs to Forms.
    await row("iria-find-familiar").locator('[data-spl="cast"][data-via="ritual"]').click();
    await dialog().waitFor();
    const familiar = await dialog().innerText();
    check(
      /Manca il componente materiale: incenso acceso del valore di almeno 10 mo, consumato dal lancio/.test(
        familiar,
      ) && /Apri Trova Famiglio/.test(familiar),
      "incense not flagged: " + familiar,
    );
    await page.keyboard.press("Escape");
    ok(
      "G. (9) «Riponi» the crystal focus → Volare blocked «Serve un focus impugnato (focus arcano o libro degli incantesimi)… Cristallo non è impugnato», Lancia disabled; «Impugna il focus» in the dialog fixes it; (7) «Interromperà la concentrazione su Individuazione del magico», submit «Lancia e termina la concentrazione» → Volare concentrating, log records the end; Trova famiglio flags the 10 mo incense and routes to Forme e compagni",
    );

    // -----------------------------------------------------------------------------------
    // H. (8) Copy Web from the scroll: 4 hours, 100 gp, Arcana DC 12; Undo; the face stays.
    await page.locator('.spl-heading [data-spl="manage"]').click();
    await page.locator('[data-spl-tab="copy"]').click();
    await page.locator('[data-spl-scroll="iria-scroll-web"] [data-spl="transcribe"]').click();
    await dialog().waitFor();
    const copyText = await dialog().innerText();
    check(
      /4 ore \(2 per livello\)/.test(copyText) &&
        /100 mo \(50 per livello\)/.test(copyText) &&
        /contro CD 12/.test(copyText),
      "copy dialog: " + copyText,
    );
    await page.locator("#dialog select[name=mode]").selectOption("physical");
    await page.locator("#dialog input[name=face]").fill("10");
    await page.screenshot({ path: shots + "b38-10-transcription-1440.png" });
    await submit().click();
    await page.waitForTimeout(250);
    state = await saved();
    const web = state.actors.iria.spells.find((r) => r.catalogId === "web");
    check(web?.bookOrigin === "transcribed", "Web not copied");
    check(
      state.actors.iria.currency.gp === 50,
      "coins not spent: " + JSON.stringify(state.actors.iria.currency),
    );
    check(
      state.restTime.clocks["personal:iria"].seconds === 600 + 4 * 3600,
      "copy time not on the clock",
    );
    check(!state.actors.iria.inventory.some((r) => r.id === "iria-scroll-web"), "scroll kept");
    check((await toast()).includes("Ragnatela è nel libro"), "copy toast");
    // Undo from the log, then retry with digital dice: the accepted 10 is reused.
    await page.locator('.spl-log ~ .toolbar [data-character-action="undo"]').click();
    await page.waitForTimeout(250);
    state = await saved();
    check(
      state.actors.iria.currency.gp === 150 &&
        !state.actors.iria.spells.some((r) => r.catalogId === "web"),
      "undo did not revert the copy",
    );
    await page
      .locator('[data-spl-tab="copy"]')
      .click()
      .catch(() => {});
    await page.locator('[data-spl-scroll="iria-scroll-web"] [data-spl="transcribe"]').click();
    await dialog().waitFor();
    await submit().click();
    await page.waitForTimeout(250);
    state = await saved();
    const copy = state.ext["spells-plus"].transcriptions.at(-1);
    check(copy.check.face === 10 && copy.check.reused === true, "Undo granted a free reroll");
    check((await page.locator(".spl-log").innerText()).includes("Riusato"), "reuse not shown");
    ok(
      "H. (8) Trascrivi dalla pergamena: 4 ore · 100 mo · Arcano +7 contro CD 12, physical d20 = 10 → Ragnatela in the book, 150 → 50 mo, personal clock +4 h, scroll destroyed; «Annulla» from the log reverts coins, time, scroll and row; the digital retry reuses the accepted 10 («Riusato»)",
    );

    // -----------------------------------------------------------------------------------
    // I. (6) Livia's wand (Inventory area charges): 2 charges, physical dice, no slot.
    await openSpells("livia");
    const liviaSlots = JSON.stringify((await saved()).actors.livia.spellSlots);
    const wandRow = page.locator('[data-spl-item="invp-wand"]');
    check((await wandRow.innerText()).includes("Cariche: 3 / 7"), "wand charges not shown");
    await wandRow.locator('[data-spl="cast-item"]').click();
    await dialog().waitFor();
    await page.locator('#dialog input[name=charges][value="2"]').check();
    await page.locator("#dialog select[name=mode]").selectOption("physical");
    for (const [i, face] of ["1", "2", "3", "4"].entries())
      await page.locator(`#dialog input[name=face${i}]`).fill(face);
    const wandText = await dialog().innerText();
    check(
      /Cariche: 3 → 1 \(nessuno slot\)/.test(wandText) && /4d4 \+ 4/.test(wandText),
      "wand dialog: " + wandText,
    );
    await page.screenshot({ path: shots + "b38-11-wand-charges-1440.png" });
    await submit().click();
    await page.waitForTimeout(250);
    state = await saved();
    check(
      state.actors.livia.inventory.find((r) => r.id === "invp-wand").charges.value === 1,
      "charges not spent",
    );
    check(JSON.stringify(state.actors.livia.spellSlots) === liviaSlots, "the wand spent a slot");
    check(
      (await page.locator(".spl-log").innerText()).includes("4d4 + 4: 1, 2, 3, 4 = 14"),
      "wand roll not logged",
    );
    ok(
      "I. (6) Livia · Incantesimi dagli oggetti: Bacchetta di dardi incantati 3/7 → 2 cariche (livello 2 · 4 dardi), dadi fisici 1, 2, 3, 4 → «Cariche: 3 → 1 (nessuno slot)», 4d4 + 4 = 14 logged, spell slots unchanged (the Inventory area's charge engine)",
    );

    // -----------------------------------------------------------------------------------
    // J. DM vs player on Livia: DM exception, Detect Magic added and prepared; the player's
    // Ritual asks the DM for shared time; the DM advances the campaign clock.
    check(
      !(await page.locator('[data-spl="exception"]').count()),
      "a player sees the DM exception",
    );
    await setRole("dm");
    await openSpells("livia");
    await page.locator('[data-spl="exception"]').click();
    await page.locator("#dialog input[name=reason]").fill("Riposo lungo di ieri non registrato");
    await submit().click();
    await page.locator('.spl-window[data-spl-window="open"]').waitFor();
    await page.locator('.spl-heading [data-spl="manage"]').click();
    await page.locator('[data-spl-tab="class"]').click();
    await page.locator('[data-spl-class-row="detect-magic"] [data-spl="add-book"]').click();
    await page.waitForTimeout(200);
    await page.locator('[data-spl-tab="prepare"]').click();
    await page
      .locator('[data-spl-manage-row]:has-text("Individuazione del magico") [data-spl="toggle"]')
      .click();
    await page.locator('[data-spl="confirm"]').click();
    await page.waitForTimeout(250);
    state = await saved();
    check(
      state.actors.livia.spells.find((r) => r.catalogId === "detect-magic")?.prepared,
      "DM preparation not applied",
    );
    // The DM cannot open Iria's personal sheet.
    await page.goto(base + "#characters?id=iria&tab=spells");
    await page.waitForTimeout(300);
    check(!(await page.locator(".spl-panel").count()), "the DM reads Iria's spells");
    await setRole("player");
    await openSpells("livia");
    await page
      .locator(
        '.spl-row:has-text("Individuazione del magico") [data-spl="cast"][data-via="ritual"]',
      )
      .click();
    await dialog().waitFor();
    check(
      (await dialog().innerText()).includes(
        "+10 min: richiesta al DM per l'orologio della campagna",
      ),
      "player ritual does not ask the DM",
    );
    await submit().click();
    await page.waitForTimeout(250);
    check(
      (await page.locator("[data-spl-request]").innerText()).includes("in attesa del DM"),
      "request not shown",
    );
    check(
      !(await page.locator('[data-spl="time-apply"]').count()),
      "player can advance shared time",
    );
    const clockBefore = (await saved()).restTime?.clocks?.lanterns?.seconds ?? 0;
    await setRole("dm");
    await openSpells("livia");
    await page.locator("[data-spl-request]").scrollIntoViewIfNeeded();
    await page.screenshot({ path: shots + "b38-12-dm-time-request-1440.png" });
    await page.locator('[data-spl="time-apply"]').click();
    await page.waitForTimeout(250);
    state = await saved();
    check(
      state.restTime.clocks.lanterns.seconds === clockBefore + 600,
      "campaign clock not advanced",
    );
    check(!(await page.locator("[data-spl-request]").count()), "request still pending");
    ok(
      "J. DM vs player: the player has no «Deroga del DM»; the DM records one with a reason, adds Individuazione del magico to Livia's book and prepares it; the DM cannot open Iria's personal sheet; the player's Ritual becomes «+10 min: richiesta al DM», the player cannot advance shared time; the DM clicks «Avanza di 10 min» → campaign clock +600 s",
    );
    check(await noOverflow(), "desktop overflow");
    const smallDesk = await smallTargets();
    check(
      !smallDesk.length,
      "desktop targets under 40px: " + JSON.stringify(smallDesk.slice(0, 6)),
    );
    await setRole("player");

    // -----------------------------------------------------------------------------------
    // L. The core controls stay in the replaced tab (other areas' flows rely on them), and a
    // Table spell goes to the existing combat preview with its level chosen.
    await openSpells("livia");
    const burning = page.locator(".item-row", { hasText: "Mani brucianti" });
    check((await burning.count()) === 1, "Mani brucianti rows: " + (await burning.count()));
    await burning.getByRole("button", { name: "Dettagli", exact: true }).click();
    await dialog().waitFor();
    const shareCount = await page.locator("#dialog [data-share-to-chat]").count();
    check((await dialog().innerText()).includes("Cono 4,5 m"), "details lack the SRD facts");
    await page.keyboard.press("Escape");
    const slotsLivia = JSON.stringify((await saved()).actors.livia.spellSlots);
    await page.getByRole("button", { name: "Registra concentrazione", exact: true }).click();
    await page.locator("[name=effectName]").fill("Benedizione di prova");
    await page.locator("[name=effectSource]").fill("Correzione sintetica della sessione");
    // Livia concentrates on the Ritual cast in J: the core asks to replace it.
    check((await submit().innerText()) === "Sostituisci concentrazione", "core replace label");
    await submit().click();
    await page.waitForTimeout(200);
    state = await saved();
    check(
      state.actors.livia.concentration?.name === "Benedizione di prova",
      "core concentration record broken",
    );
    check(
      JSON.stringify(state.actors.livia.spellSlots) === slotsLivia,
      "recording concentration spent a slot",
    );
    await page.locator('[data-character-action="slots"][data-pool="2"]').click();
    await page.locator("#dialog [name=max]").waitFor();
    await page.keyboard.press("Escape");
    await row("sample-magic-missile").locator('[data-spl="variants"]').click();
    await page.locator('#spl-var-sample-magic-missile button:has-text("2°")').click();
    await dialog().waitFor();
    await page.locator("#dialog [data-spl-table]").click();
    await page.locator("#combat-detail").waitFor();
    check(
      (await page.locator("#combat-detail").innerText()).includes("Dardo incantato") &&
        (await page
          .locator('#combat-detail select[data-combat-param="slotLevel"]')
          .inputValue()) === "2",
      "Table preview not opened at level 2",
    );
    check(
      (await saved()).actors.livia.spellSlots[2].used === 1,
      "preparing at the Table spent a slot",
    );
    await page.screenshot({ path: shots + "b38-15-table-preview-1440.png" });
    await page.locator("#combat-detail [data-combat-cancel]").click();
    ok(
      `L. Core controls kept in the replaced tab: one «Mani brucianti» sheet row with «Dettagli» (SRD facts; chat share button ${shareCount ? "present" : "absent: chat area not loaded"}), «Registra concentrazione» records without spending, «Correggi risorsa» opens the slot correction; «Prepara al Tavolo» from Dardo incantato 2° opens the existing combat preview with «Slot da usare» = 2 and spends nothing`,
    );

    // -----------------------------------------------------------------------------------
    // K. EN phone 390x844, touch: manage, class list, cast a cantrip, no overflow.
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
    phoneContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await phoneContext.addInitScript(
      ([k, value]) => {
        if (!sessionStorage.getItem("b38-seeded")) {
          localStorage.setItem(k, value);
          sessionStorage.setItem("b38-seeded", "1");
        }
      },
      [key, snapshot],
    );
    const phone = await phoneContext.newPage();
    phone.on("pageerror", (error) => errors.push("phone: " + error.message));
    await phone.goto(base + "#characters");
    await styled(phone);
    await phone.locator('[data-service="preferences"]').tap();
    await phone.locator('#dialog [name="lang"]').selectOption("en");
    await phone.locator("#dialog button[type=submit]").tap();
    await openSpells("iria", phone);
    await dismissTips(phone);
    check((await phone.locator(".spl-stats").innerText()).includes("Spell attack"), "EN header");
    check(await noOverflow(phone), "phone overflow on the tab");
    await phone.locator(".spl-panel").scrollIntoViewIfNeeded();
    await phone.screenshot({ path: shots + "b38-13-phone-en-390.png" });
    await phone.locator('.spl-heading [data-spl="manage"]').tap();
    await phone.locator('[data-spl-tab="class"]').tap();
    await phone.locator("[data-spl-class-list]").waitFor();
    check((await phone.locator("#spl-manage").innerText()).includes("Class list"), "EN manage");
    check(await noOverflow(phone), "phone overflow with the manage panel");
    await phone.screenshot({ path: shots + "b38-14-phone-manage-en-390.png" });
    await phone.locator('[data-spl="manage-close"]').tap();
    await phone.locator('[data-spl-row="iria-mage-hand"] [data-spl="cast"]').tap();
    await dialog(phone).waitFor();
    check((await dialog(phone).innerText()).includes("Cantrip: no slot"), "EN cantrip dialog");
    await submit(phone).tap();
    await phone.waitForTimeout(250);
    check(
      (await phone.locator(".spl-log").innerText()).includes("Mage Hand"),
      "EN cast not logged",
    );
    const smallPhone = await smallTargets(phone);
    check(
      !smallPhone.length,
      "phone targets under 40px: " + JSON.stringify(smallPhone.slice(0, 6)),
    );
    await phone.reload();
    await phone.locator(".spl-panel").waitFor();
    check(
      /Mage Hand|Mano magica/.test(await phone.locator(".spl-log").innerText()) &&
        (await saved(phone)).ext["spells-plus"].casts.at(-1).entryId === "srd2024:spell:mage-hand",
      "reload lost the cast",
    );
    ok(
      "K. EN phone 390 (touch): Spells tab and Manage spells › Class list without horizontal overflow; tap Cast on Mage Hand → «Cantrip: no slot» → logged; reload keeps it; every B38 control ≥ 40px",
    );
  } catch (error) {
    await page.screenshot({ path: shots + "zz-failure-desktop.png" }).catch(() => {});
    return JSON.stringify({ result: "FAIL", error: error.message, passed, errors }, null, 2);
  } finally {
    if (phoneContext) await phoneContext.close().catch(() => {});
    await context.close().catch(() => {});
  }
  return JSON.stringify(
    { result: errors.length ? "FAIL (page errors)" : "PASS", passed, errors },
    null,
    2,
  );
}
