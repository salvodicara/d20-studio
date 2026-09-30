async (rootPage) => {
  // Residuals of re-audit 3 (single writer, 29/09/2026), part B, as a first-time user:
  // 1. TV-52 (Improved Initiative «group initiative»): «Avvia combattimento» on «Agguato sulla
  //    strada» shows «Goblin guerriero A, B» with «Un solo tiro per il gruppo» and its SRD
  //    source; unticked, the two goblins roll separately; ticked again, one row.
  // 2. TV-59 (Mob Attack Tool): on goblin A's turn «Attiva il turno di gruppo…» applies at
  //    once: «Attacco di gruppo» lists both goblins and one «Turno successivo» passes the group.
  // 3. BI-45 (Shard/Foundry compendium packs): the enabled sample pack's «Lanterna vagante»
  //    is in the Table bestiary and lands with its «Vampata»; the Library search and the
  //    builder's Wizard subclasses list the pack's entries with their page.
  // 4. Phone 390 EN touch: the start dialog's «One roll for the group» and no overflow.
  // Synthetic demo data only; resets the example.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const shots =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-29/residual/";
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const browser = rootPage.context().browser();
  let context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let page = await context.newPage();
  const watch = (p) => {
    p.setDefaultTimeout(8000);
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("dialog", (d) => d.accept().catch(() => {}));
  };
  watch(page);
  const sleep = (ms) => page.waitForTimeout(ms);
  const button = (name, root = page) => root.getByRole("button", { name });
  const openDialog = () => page.locator("dialog[open]").last();
  const setRole = async (value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await sleep(300);
  };
  const reset = async (role) => {
    await page.goto(base + "#home");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.locator("#demo-role").waitFor();
    await setRole(role);
  };
  const go = async (hash) => {
    await page.goto(base + "#" + hash);
    await sleep(600);
  };
  // The 3D dice card («Clic o Esc per chiudere») may sit over the dialog after a roll.
  const diceCard = async () => {
    const card = page.getByText("Clic o Esc per chiudere");
    if (
      (await card.count()) &&
      (await card
        .first()
        .isVisible()
        .catch(() => false))
    ) {
      await card
        .first()
        .dispatchEvent("click")
        .catch(() => {});
      await sleep(400);
    }
  };
  const order = async () => {
    const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    const at = text.indexOf("Combattimento · Round");
    return text.slice(at, at + 150);
  };
  const startRows = async () =>
    openDialog()
      .locator("[data-ct-start-row]")
      .evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, " ").trim()));
  let step = "setup";
  try {
    // ------------------------------------------------------------ 1. TV-52
    step = "TV-52";
    await reset("dm");
    await go("table");
    await button(/^Scene$/)
      .first()
      .click();
    await sleep(800);
    await button(/Attiva per il gruppo · Agguato sulla strada/).click();
    await sleep(1300);
    await diceCard();
    await button(/^Avvia combattimento/)
      .first()
      .click();
    await sleep(1000);
    let rows = await startRows();
    check(
      rows.some((r) => /^Goblin guerriero A, B .*Un solo tiro per il gruppo/.test(r)),
      "merged row: " + rows.join(" | "),
    );
    const note = await openDialog().innerText();
    check(
      /Creature identiche: un solo tiro d’iniziativa per il gruppo \(SRD 5\.2\.1 EN 13 \/ IT 14\)/.test(
        note,
      ),
      "source line",
    );
    await openDialog()
      .getByRole("switch", { name: /Un solo tiro per il gruppo/ })
      .click();
    await sleep(800);
    rows = await startRows();
    check(
      rows.some((r) => /^Goblin guerriero A PNG/.test(r)) &&
        rows.some((r) => /^Goblin guerriero B PNG/.test(r)),
      "split rows: " + rows.join(" | "),
    );
    await page.screenshot({ path: shots + "rb-01-tv52-split.png" });
    await openDialog()
      .getByRole("switch", { name: /Un solo tiro per il gruppo/ })
      .first()
      .click();
    await sleep(800);
    rows = await startRows();
    check(
      rows.some((r) => /^Goblin guerriero A, B /.test(r)),
      "merged again: " + rows.join(" | "),
    );
    passed.push(
      "1. TV-52: «Goblin guerriero A, B · Un solo tiro per il gruppo» (SRD EN 13 / IT 14) splits into two rows and joins again",
    );

    // ------------------------------------------------------------ 2. TV-59
    step = "TV-59";
    const goblins = openDialog()
      .locator("[data-ct-start-row]")
      .filter({ hasText: /Goblin guerriero/ })
      .first();
    await goblins.locator("input[type=number]").fill("20");
    await goblins.locator("input[type=number]").press("Tab");
    await sleep(600);
    for (const name of ["Livia", "Doran", "Mira"]) {
      const row = openDialog()
        .locator("[data-ct-start-row]")
        .filter({ hasText: new RegExp("^\\d*\\s*" + name) })
        .first();
      await row.locator("input[type=number]").fill("2");
      await row.locator("input[type=number]").press("Tab");
      await sleep(300);
    }
    await openDialog()
      .getByRole("button", { name: /^Inizia combattimento$/ })
      .click();
    await sleep(1200);
    await diceCard();
    check(
      /Goblin guerriero A Turno attuale/.test(await order()),
      "goblin A first: " + (await order()),
    );
    await page
      .locator("[role=tab]")
      .filter({ hasText: /^Combattimento$/ })
      .or(page.locator("[role=tab][aria-label^=Combattimento]"))
      .first()
      .click();
    await sleep(700);
    await page
      .locator("#table-drawer")
      .getByRole("button", { name: /Attacco di gruppo/ })
      .first()
      .click();
    await sleep(800);
    check(
      /serve la regola della casa/.test(await openDialog().innerText()),
      "the 2024 baseline is explained first",
    );
    await openDialog()
      .getByRole("button", { name: /Attiva il turno di gruppo/ })
      .click();
    await sleep(800);
    await openDialog()
      .getByLabel(/Turno di gruppo per creature uguali/)
      .check();
    await openDialog()
      .getByRole("button", { name: /^Salva$/ })
      .click();
    await sleep(900);
    await page
      .locator("#table-drawer")
      .getByRole("button", { name: /Attacco di gruppo/ })
      .first()
      .click();
    await sleep(800);
    const mob = await openDialog().innerText();
    check(
      !/serve la regola della casa/.test(mob) && /Turno di gruppo \(regola della casa\)/.test(mob),
      "mob dialog: " + mob.slice(0, 300),
    );
    const attackers = await openDialog()
      .locator("input[name=attacker]:checked")
      .evaluateAll((els) => els.map((e) => e.value));
    check(attackers.length === 2, "both goblins attack: " + attackers.join(", "));
    await page.screenshot({ path: shots + "rb-02-tv59-mob.png" });
    await openDialog()
      .getByRole("button", { name: /^Attacca$/ })
      .click();
    await sleep(1300);
    await diceCard();
    // Visual regression (30/09/2026): the goblins' digital d20s are random. When one hits
    // Livia, her Shield offer («Reazioni da scegliere · Livia · Scudo») is a pending
    // consequence and «Turno successivo» is refused until it is answered (4 runs in 5). The
    // DM declines it, as simultaneous-reactions-journey does; declining spends nothing.
    for (let i = 0; i < 4; i++) {
      const choose = page
        .getByRole("button", { name: "Scegli", exact: true })
        .filter({ visible: true });
      if (!(await choose.count())) break;
      await choose.first().click();
      await page
        .getByRole("button", { name: "Rinuncia per questa occasione", exact: true })
        .filter({ visible: true })
        .first()
        .click();
      await sleep(900);
      await diceCard();
    }
    const back = openDialog().getByRole("button", { name: /^Torna al gioco$/ });
    if (await back.count()) await back.click();
    await sleep(500);
    await button(/^Turno successivo|^Termina turno/)
      .first()
      .click();
    await sleep(1100);
    await diceCard();
    const after = await order();
    check(
      /(Livia|Doran|Mira) Turno attuale/.test(after) &&
        !/Goblin guerriero B Turno attuale/.test(after),
      "after the group: " + after,
    );
    passed.push(
      "2. TV-59: enabled on goblin A's turn, «Attacco di gruppo» lists both goblins; one «Turno successivo» passes the whole group to the party",
    );

    // ------------------------------------------------------------ 3. BI-45
    step = "BI-45";
    await reset("dm");
    await go("library");
    await page
      .locator("main button")
      .filter({ hasText: /^Pacchetti di compatibilità$/ })
      .first()
      .click();
    await sleep(700);
    await button(/^Prova il pacchetto di esempio$/)
      .first()
      .click();
    await sleep(900);
    await button(/^Abilita in questa campagna$/)
      .first()
      .click();
    await sleep(800);
    check(
      /Le creature sono nel bestiario del Tavolo/.test(await page.locator("main").innerText()),
      "where the pack is used",
    );
    await go("table");
    await page.keyboard.press("Control+k");
    await sleep(300);
    await page.locator("[data-cmdk-input]").fill("aggiungi creatura");
    await sleep(500);
    await page
      .locator("[data-cmdk-option]")
      .filter({ hasText: /Aggiungi creatura/ })
      .first()
      .click();
    await sleep(800);
    await page
      .getByPlaceholder(/goblin, lupo/)
      .first()
      .fill("Lanterna");
    await sleep(700);
    const bestiary = page
      .locator("[data-token-menu-drawer-list], [data-token-menu-creature-list]")
      .first();
    const found = (await bestiary.innerText()).replace(/\s+/g, " ");
    check(/Lanterna vagante · GS 1 · pacchetto, p\. 42/.test(found), "bestiary: " + found);
    await bestiary
      .getByRole("button", { name: /^Aggiungi/ })
      .first()
      .click();
    await sleep(1100);
    await page
      .getByRole("button", { name: /^Lanterna vagante, / })
      .first()
      .click();
    await sleep(700);
    const bar = (await page.locator(".action-dock, .table-hotbar").first().innerText()).replace(
      /\s+/g,
      " ",
    );
    check(
      /Lanterna vagante PF 22\/22/.test(bar) && /Vampata/.test(bar),
      "the pack creature on the map: " + bar.slice(0, 200),
    );
    await page.screenshot({ path: shots + "rb-03-bi45-token.png" });
    await setRole("player");
    await go("library");
    await page.locator("[data-library-query]").fill("Lanterna vagante");
    await page
      .locator("main")
      .getByRole("button", { name: /^Cerca$/ })
      .click();
    await sleep(800);
    const libraryRow = (await page.locator("[data-library-pack]").first().innerText()).replace(
      /\s+/g,
      " ",
    );
    check(
      /Creatura · Pacchetto «Valle di Bruma · esempio \(simulazione\)» · p\. 42/.test(libraryRow),
      "library: " + libraryRow,
    );
    await go("characters?id=livia");
    await button(/^Rivedi scelte/)
      .first()
      .click();
    await sleep(1100);
    await page
      .locator("main button")
      .filter({ hasText: /^Classi e punti ferita/ })
      .first()
      .click();
    await sleep(700);
    const subclasses = await page
      .locator("main select")
      .filter({ has: page.locator("option", { hasText: /Invocatore/ }) })
      .first()
      .evaluate((s) => [...s.options].map((o) => o.text));
    check(
      subclasses.includes("Custode del faro · pacchetto, p. 60"),
      "subclasses: " + subclasses.join(" | "),
    );
    passed.push(
      "3. BI-45: «Lanterna vagante · GS 1 · pacchetto, p. 42» in the bestiary, on the map with «Vampata»; Library row and «Custode del faro · pacchetto, p. 60» in the builder",
    );
    await context.close();

    // ------------------------------------------------------------ 4. Phone, English, touch
    step = "phone";
    context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    page = await context.newPage();
    watch(page);
    await reset("dm");
    await page.locator('[data-service="preferences"]').first().tap();
    await page.locator("#dialog [name=lang]").selectOption("en");
    await page.locator("#dialog button[type=submit]").tap();
    await page.locator("#dialog[open]").waitFor({ state: "detached" });
    await go("table");
    await button(/^Scenes$/)
      .first()
      .tap();
    await sleep(800);
    await button(/Activate for the party · Agguato sulla strada/).tap();
    await sleep(1300);
    await diceCard();
    await button(/^Start combat/)
      .first()
      .tap();
    await sleep(1000);
    rows = await startRows();
    check(
      rows.some((r) => /^Goblin guerriero A, B .*One roll for the group/.test(r)),
      "EN merged row: " + rows.join(" | "),
    );
    check(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      "overflow at 390",
    );
    await page.screenshot({ path: shots + "rb-04-phone-en-start.png" });
    passed.push(
      "4. Phone 390 EN touch: «Goblin guerriero A, B · One roll for the group», no horizontal overflow",
    );
    await context.close();
  } catch (error) {
    return { passed, failedAt: step, error: String(error.message).slice(0, 900), errors };
  }
  return { passed, errors };
}
