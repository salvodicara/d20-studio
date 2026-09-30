async (rootPage) => {
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
  // B21 review fixes: the reviewer's reproductions, rerun on the fixed code with real clicks,
  // keys and taps (IT desktop 1440 for both identities, EN phone 390 with touch). Roles are
  // swapped where a third identity would be needed (the DM owns Doran; the player is
  // "another player" for him). Synthetic data only; resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B21/review-fixes/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const button = (name) => page.getByRole("button", { name, exact: true });
  const dialog = page.locator("#dialog");
  const submit = () => dialog.locator('button[type="submit"]').click();
  const closed = () => page.waitForFunction(() => !document.querySelector("#dialog").open);
  const card = (id) => page.locator(`[data-clib-card="${id}"]`);
  const visibleCards = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("[data-clib-card]")]
        .filter((el) => !el.hidden)
        .map((el) => el.querySelector("h3").textContent)
        .sort(),
    );
  const noOverflow = (target = page) =>
    target.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  const shot = async (name, target = page) => {
    await target.evaluate(() => document.querySelector("#toast")?.classList.remove("shown"));
    await target.screenshot({ path: dir + name + ".png" });
  };
  const toast = (pattern) =>
    page.waitForFunction(
      (source) => new RegExp(source).test(document.querySelector("#toast")?.textContent ?? ""),
      pattern.source,
    );
  const role = async (value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForTimeout(80);
  };
  const go = async (hash, ready) => {
    await page.goto(base + hash);
    await page.locator(ready).first().waitFor();
  };
  const openLibrary = async () => {
    await page.locator('.app-header nav [data-nav="characters"]').click();
    await page.locator("[data-clib-page]").waitFor();
  };
  const manage = async (name) => {
    await page.getByRole("button", { name: `Gestisci ${name}`, exact: true }).click();
    await dialog.locator("[data-clib-manage]").waitFor();
  };
  const small = (selector) =>
    page.evaluate(
      (sel) =>
        [...document.querySelectorAll(sel)]
          .filter((b) => b.offsetParent)
          .map((b) => [b.textContent.trim(), Math.round(b.getBoundingClientRect().height)])
          .filter(([, h]) => h < 40),
      selector,
    );
  const setOffline = async (value) => {
    await page.getByRole("button", { name: "Preferenze" }).click();
    const box = dialog.locator("input[name=offline]");
    if (value) await box.check();
    else await box.uncheck();
    await page.getByRole("button", { name: "Salva preferenze" }).click();
    await closed();
  };

  try {
    await page.goto(base);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("heading", { name: "La prossima avventura", level: 1 }).waitFor();
    await button("Ripristina esempio").click();
    await button("Ripristina").click();
    await openLibrary();

    // P2 non-owner Manage/export: readers open the sheet, only the owner manages.
    check(await card("doran").getByRole("button", { name: "Apri scheda" }).count(), "reads");
    check(!(await button("Gestisci Doran").count()), "no Manage on the DM's Doran");
    await go("#characters?id=doran", ".character-breadcrumb");
    check(!(await button("Gestisci personaggio").count()), "no Manage in the sheet bar");
    await go("#character-library-print?id=doran", "h1");
    check(
      (await page.locator("h1").first().innerText()) === "Scheda non disponibile",
      "no print view of another's sheet",
    );
    await role("dm");
    await openLibrary();
    check(!(await button("Gestisci Livia").count()), "the DM does not manage Livia either");
    check(await button("Gestisci Doran").count(), "the DM manages his own Doran");
    await shot("p2-dm-library-manage-own-only-it-1440");
    passed.push(
      "P2 export: Manage (JSON, PDF, print) is the owner's; readers keep 'Apri scheda' only",
    );

    // P1 B20 lock: the player withholds DM edits; the DM can compare but not save/restore.
    await role("player");
    await go("#characters?id=livia&tab=actions", '[data-cs-sheet-allow="livia"]');
    await page.locator('[data-cs-sheet-allow="livia"]').uncheck();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext["campaign-settings"]?.campaigns?.lanterns?.policy
          ?.dmSheetEdit?.livia === false,
      key,
    );
    await role("dm");
    await go("#characters?id=livia&tab=character-library-revisions", "[data-clib-revisions]");
    check(
      !(await page.locator("[data-clib-rev-restore], [data-clib-rev-save]").count()),
      "no Save/Restore for the locked DM",
    );
    check(
      (await page.locator("[data-clib-rev-locked]").innerText()).includes(
        "Modifica riservata a chi gioca Livia",
      ),
      "the lock is explained",
    );
    await page.locator("[data-clib-rev-compare]").first().click();
    check((await page.locator("[data-clib-diff]").innerText()).length > 0, "the DM still compares");
    check(!(await small("[data-clib-revisions] button")).length, "revision controls ≥ 40px");
    await shot("p1-dm-revisions-locked-it-1440");
    await page.locator("[data-clib-go-access]").click();
    await page.getByRole("button", { name: "Chiedi autorizzazione" }).first().waitFor();
    check((await stored()).actors.livia.level === 3, "Livia unchanged");
    passed.push(
      "P1 B20: with DM edits withheld, Revisioni offers compare only and leads to B20's 'Chiedi autorizzazione'",
    );

    // P1 privacy: the DM restricts Doran; the player gets the summary everywhere.
    await openLibrary();
    await manage("Doran");
    await dialog.locator('[data-clib-act="privacy"]').click();
    await dialog.locator("[data-clib-audience]").waitFor();
    const example = await dialog.locator('[data-audience="players"]').innerText();
    check(/chi gioca (Livia|Mira)/.test(example) && !example.includes("Doran"), example);
    await dialog.getByText("Solo giocatore e DM", { exact: true }).click();
    await submit();
    await toast(/Privacy aggiornata/);
    await role("player");
    await openLibrary();
    const doran = await card("doran").innerText();
    check(doran.includes("Guerriero · Livello 3") && doran.includes("Giocatore"), doran);
    check(!/27\/31|CA 16/.test(doran), "no HP or AC on the summary card");
    check(
      !(await card("doran").locator('[data-character-action="open"]').count()),
      "no sheet to open",
    );
    await page.locator("[data-clib-search]").fill("elf");
    check(!(await visibleCards()).includes("Doran"), "no species search on a summary");
    await page.locator("[data-clib-search]").fill("");
    await shot("p1-player-library-doran-summary-it-1440");
    for (const hash of [
      "#characters?id=doran",
      "#characters?id=doran&tab=character-library-revisions",
      "#characters?id=doran&tab=inventory",
    ]) {
      await go(hash, "[data-clib-summary-page]");
      check(!(await page.locator("[data-character-tab], [data-clib-revisions]").count()), hash);
      check(!/27|31|Spada|Inventario/.test(await page.locator("main").innerText()), hash);
    }
    await shot("p1-player-doran-summary-page-it-1440");
    await page.locator('[data-clib-summary-page] [data-character-action="collection"]').click();
    await page.locator("[data-clib-page]").waitFor();
    await go("#character-library-print?id=doran", "h1");
    check((await page.locator("h1").first().innerText()) === "Scheda non disponibile", "no print");
    passed.push(
      "P1 privacy: Doran 'Solo giocatore e DM' gives the player only name, class, level and player (card, sheet URL, tabs, print)",
    );

    // P1 history: a personal draft revision never reaches the DM after linking.
    await go("#characters?id=iria&tab=story", ".character-breadcrumb");
    await button("Modifica storia").click();
    await dialog.locator("textarea[name=backstory]").fill("SEGRETO: Iria lavora per il culto.");
    await submit();
    await closed();
    await go("#characters?id=iria&tab=character-library-revisions", "[data-clib-rev-save]");
    await page.locator("[data-clib-rev-save]").click();
    await dialog.locator("[name=label]").fill("bozza privata");
    await submit();
    await page.locator("[data-clib-tab-notice]").getByText("Revisione salvata").waitFor();
    await go("#characters?id=iria&tab=story", ".character-breadcrumb");
    await button("Modifica storia").click();
    await dialog.locator("textarea[name=backstory]").fill("Custode dei registri del faro.");
    await submit();
    await closed();
    await openLibrary();
    await manage("Iria");
    await dialog.locator('[data-clib-act="link"]').click();
    const disclosure = await dialog.locator("[data-clib-link-disclosure]").innerText();
    check(
      disclosure.includes("restano visibili solo a te") &&
        disclosure.includes("Solo giocatore e DM"),
      disclosure,
    );
    await shot("p1-link-disclosure-it-1440");
    await submit();
    await toast(/Iria ora è nella campagna/);
    await role("dm");
    await go("#characters?id=iria&tab=character-library-revisions", "[data-clib-revisions]");
    const dmHistory = await page.locator("[data-clib-revisions]").innerText();
    check(!dmHistory.includes("bozza privata"), "the DM never lists the pre-link revision");
    check(dmHistory.includes("Collegata a Le lanterne di Bruma"), "shared history starts here");
    const fromOptions = await page
      .locator("[data-clib-compare] [name=from] option")
      .allInnerTexts();
    check(!fromOptions.some((o) => o.includes("bozza privata")), "not in the compare list");
    await page.locator("[data-clib-rev-compare]").first().click();
    check(!(await page.locator("[data-clib-diff]").innerText()).includes("SEGRETO"), "no text");
    await shot("p1-dm-revisions-after-link-it-1440");
    await role("player");
    await go("#characters?id=iria&tab=character-library-revisions", "[data-clib-revisions]");
    check(
      (await page.locator("[data-clib-revisions]").innerText()).includes("bozza privata"),
      "the owner keeps the whole history",
    );
    passed.push(
      "P1 history: after 'Collega', the DM sees only 'Collegata a…' (no pre-link revision or text); the owner keeps all",
    );

    // P2 false notice: an offline shared change is refused and no success notice follows.
    await setOffline(true);
    await go("#characters?id=livia&tab=character-library-log", "[data-clib-log-add]");
    await page.locator("[data-clib-log-add]").click();
    await dialog.locator("[name=title]").fill("Sessione offline");
    await submit();
    await dialog.locator(".dialog-error").waitFor({ state: "visible" });
    check(
      (await dialog.locator(".dialog-error").innerText()).includes("senza rete"),
      "refused offline",
    );
    await dialog.locator("footer [data-close]").click();
    await page.locator('[data-character-tab="actions"]').click();
    // B62: the Notes sub-tabs leave with the category; then Notes › Log again.
    await page
      .locator('[data-character-subtab="character-library-log"]')
      .waitFor({ state: "detached" });
    await openSheetTab(page, "character-library-log"); // B62: Notes › Log
    await page.locator("[data-clib-log]").waitFor();
    check(!(await page.locator("[data-clib-tab-notice]").count()), "no false 'Voce aggiunta'");
    check((await page.locator("[data-clib-log-row]").count()) === 2, "rows unchanged");
    await shot("p2-offline-no-false-notice-it-1440");
    await setOffline(false);
    passed.push(
      "P2 notice: offline, 'Aggiungi voce' shows the refusal and leaves no success notice",
    );

    // P3 search: "liv" finds Livia only; level by number.
    await openLibrary();
    const search = page.locator("[data-clib-search]");
    await search.click();
    await page.keyboard.type("liv");
    check(JSON.stringify(await visibleCards()) === '["Livia"]', "liv: " + (await visibleCards()));
    await search.fill("");
    await page.keyboard.type("livello 5");
    check(
      JSON.stringify(await visibleCards()) === '["Iria"]',
      "livello 5: " + (await visibleCards()),
    );
    await shot("p3-search-liv-it-1440");
    await search.fill("");
    await search.dispatchEvent("input");
    passed.push("P3 search: 'liv' → Livia only; 'livello 5' → Iria");

    // P3 focus: after Copy (Enter) focus lands on the new card; after Delete on Restore.
    await button("Copia Livia").click();
    await dialog.locator("[name=name]").press("Enter");
    await page.waitForFunction(() =>
      document.activeElement?.matches?.('[data-clib-card] [data-character-action="open"]'),
    );
    check(
      (await page.evaluate(
        () => document.activeElement.closest("[data-clib-card]").querySelector("h3").textContent,
      )) === "Livia (copia)",
      "focus on the new card",
    );
    await button("Elimina Livia (copia)").click();
    await submit();
    await page.waitForFunction(() => document.activeElement?.closest?.("[data-clib-notice]"));
    check(
      (await page.evaluate(() => document.activeElement.textContent.trim())) === "Ripristina",
      "focus on the notice's Restore",
    );
    await page.keyboard.press("Enter");
    await toast(/Scheda ripristinata/);
    passed.push(
      "P3 focus: Copy → new card's 'Apri scheda'; Delete → notice's 'Ripristina' (Enter restores)",
    );

    // P3 release: private plans move to the kept copy; notice names both; claim clears badge.
    await go("#characters?id=mira&tab=extras", ".character-breadcrumb");
    await button("Modifica piano").click();
    await dialog.locator("textarea[name=text]").fill("Piano di Mira: ritrovare il bosco");
    await submit();
    await closed();
    await openLibrary();
    await manage("Mira");
    await dialog.locator('[data-clib-act="release"]').click();
    check(
      (await dialog.locator("[data-clib-release-notes]").innerText()).includes(
        "passano alla copia",
      ),
      "plans disclosed",
    );
    check((await dialog.locator("[name=name]").inputValue()) === "Mira (copia)", "copy name");
    await shot("p3-release-dialog-it-1440");
    await submit();
    await page.locator("[data-clib-notice]").getByText("resta in Le lanterne di Bruma").waitFor();
    check(
      (await page.locator("[data-clib-notice]").innerText()).includes("Mira (copia)"),
      "notice names the copy",
    );
    const released = await stored();
    const kept = Object.values(released.actors).find((a) => a.name === "Mira (copia)");
    check(kept?.personalPlans?.player?.startsWith("Piano di Mira"), "plan on the copy");
    check(released.actors.mira.personalPlans?.player === undefined, "plan left the campaign sheet");
    check((await card("mira").innerText()).includes("Rilasciata da"), "released badge");
    await shot("p3-release-notice-it-1440");
    await go("#campaigns?id=lanterns&tab=characters", '[data-cm="claim"][data-actor="mira"]');
    await page.locator('[data-cm="claim"][data-actor="mira"]').click();
    if (await dialog.evaluate((d) => d.open)) await submit();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext["campaign-members"].campaigns.lanterns.seats.mira
          ?.memberId === "player",
      key,
    );
    await openLibrary();
    check(!(await card("mira").innerText()).includes("Rilasciata da"), "badge gone after claim");
    passed.push(
      "P3 release: plan moves to 'Mira (copia)', notice names campaign and copy, 'Rilasciata da' clears after Reclama",
    );

    // Revision 1 of Livia (level 2) carries no subclass (SRD 5.2.1: subclass at level 3).
    const rev1 = (await stored()).ext["character-library"].revisions.livia[0];
    check(rev1.data.level === 2 && !rev1.data.buildSeed.classes[0].subclassId, "no subclass");
    check(await noOverflow(), "desktop overflow");
    passed.push("P3 data: Livia's level-2 sample revision has no subclass; no overflow at 1440");

    // EN phone 390 with touch: the summary page and card read in English, no overflow.
    const snapshotStorage = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await phone.addInitScript((data) => {
      if (sessionStorage.getItem("b21r-seeded")) return;
      for (const [k, v] of Object.entries(JSON.parse(data))) localStorage.setItem(k, v);
      sessionStorage.setItem("b21r-seeded", "1");
    }, snapshotStorage);
    const mobile = await phone.newPage();
    mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
    await mobile.goto(base);
    await mobile.getByRole("heading", { level: 1 }).first().waitFor();
    await mobile.getByRole("button", { name: "Preferenze" }).tap();
    await mobile.locator("#dialog select[name=lang]").selectOption("en");
    await mobile.getByRole("button", { name: "Salva preferenze" }).tap();
    await mobile.getByRole("heading", { name: "Your next adventure", level: 1 }).waitFor();
    await mobile.locator('.app-header nav [data-nav="characters"]').tap();
    await mobile.locator("[data-clib-page]").waitFor();
    const phoneCard = await mobile.locator('[data-clib-card="doran"]').innerText();
    check(phoneCard.includes("Player and DM only") && phoneCard.includes("Fighter"), phoneCard);
    check(await noOverflow(mobile), "phone library overflow");
    await mobile.screenshot({ path: dir + "phone-library-summary-en-390.png", fullPage: true });
    await mobile.goto(base + "#characters?id=doran");
    await mobile.locator("[data-clib-summary-page]").waitFor();
    check(
      (await mobile.locator("[data-clib-summary-page]").innerText()).includes(
        "reserved to its player and the DM",
      ),
      "EN summary page",
    );
    await mobile.locator('[data-clib-summary-page] [data-character-action="collection"]').tap();
    await mobile.locator("[data-clib-page]").waitFor();
    await mobile.goto(base + "#characters?id=doran");
    await mobile.locator("[data-clib-summary-page]").waitFor();
    check(await noOverflow(mobile), "phone summary overflow");
    await mobile.screenshot({ path: dir + "phone-doran-summary-en-390.png" });
    await phone.close();
    passed.push(
      "EN phone 390 (touch): summary card and page in English, back to the list, no overflow",
    );
    await context.close();
  } catch (error) {
    throw Error(`after ${passed.length} passed checks (last: ${passed.at(-1)}): ${error.message}`);
  }
  check(!errors.length, "page errors: " + errors.join(" | "));
  return { passed: passed.length, checks: passed, errors };
};
