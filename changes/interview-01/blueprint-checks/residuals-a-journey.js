async (rootPage) => {
  // Residuals of re-audit 3 (single writer, 29/09/2026), part A, 1440 × 900 IT, as a
  // first-time user (visible labels only):
  // 1. PG-53: «SRD 2024» off and «Legacy 2014» on lists the 2014 rows on their own (D&D
  //    Beyond source toggles), each with its learn/prepare control.
  // 2. X-A1: «Applica a una scheda…» names each campaign sheet's missing steps (D&D Beyond
  //    campaign homebrew) and refuses in one language; after «Abilita in campagna» and
  //    «Condividi in lettura con i giocatori» Doran takes the forged Longsword +1.
  // 3. BI-24: equipped, the forged sword attacks at +3 (Strength +0, Proficiency +2, +1).
  // 4. X-A3: «Crea variante…» of the Wizard saves at the first «Salva» with the class table's
  //    Italian feature names (X-A2: «Incantesimi, Adepto dei rituali, Recupero arcano»).
  // 5. CA-57: the hand-off dialog names the member «Livia, Mira · Giocatore».
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
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  // Visual pass 2 (30/09/2026): whoever runs the session finds Party (and Pause, Hide
  // scene…) in the map's one «Sessione» menu (Owlbear keeps one row of controls); open it.
  const sessionMenu = async (p = page) => {
    const menu = p.locator(".session-view-hud [data-session-menu]");
    if ((await menu.count()) && (await menu.getAttribute("aria-expanded")) !== "true")
      await menu.click();
  };
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept().catch(() => {}));
  const sleep = (ms) => page.waitForTimeout(ms);
  const button = (name, root = page) => root.getByRole("button", { name });
  const main = () => page.locator("main");
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
  const closeDialogs = async () => {
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("Escape");
      await sleep(120);
    }
  };
  let step = "setup";
  try {
    // ------------------------------------------------------------ 1. PG-53
    step = "PG-53";
    await reset("dm");
    await go("campaign?tab=settings");
    await main()
      .locator("button, a, [role=tab]")
      .filter({ hasText: /^Fonti/ })
      .first()
      .click();
    await sleep(600);
    await page
      .getByRole("switch", { name: /legacy/i })
      .or(page.getByRole("checkbox", { name: /legacy/i }))
      .first()
      .click();
    await sleep(800);
    await setRole("player");
    await go("characters?id=livia");
    await main()
      .locator("[role=tab], .tabs button")
      .filter({ hasText: /^Magie$/ })
      .first()
      .click();
    await sleep(500);
    await button(/^Gestisci magie/)
      .first()
      .click();
    await sleep(700);
    await main()
      .locator("button, [role=tab]")
      .filter({ hasText: /^Lista di classe$/ })
      .first()
      .click();
    await sleep(700);
    await page.locator("[data-spl-source=srd]").click();
    await sleep(600);
    const legacyRows = await page.locator("[data-spl-legacy-row]").count();
    const list = (await page.locator("[data-spl-class-list]").innerText()).replace(/\s+/g, " ");
    check(
      legacyRows >= 4 && !/Nessuna magia con questi filtri/.test(list),
      "2014-only list: " + list.slice(0, 200),
    );
    check((await page.locator("[data-spl-class-row]").count()) === 0, "a 2024 row is still listed");
    const fireBolt = (await page.locator('[data-spl-legacy-row="fire-bolt"]').innerText()).replace(
      /\s+/g,
      " ",
    );
    check(
      /Preferisci la 2014/.test(fireBolt) && /Conosciuto/.test(fireBolt),
      "Fire Bolt 2014: " + fireBolt,
    );
    await page.screenshot({ path: shots + "ra-01-pg53-legacy-only.png" });
    passed.push(
      `1. PG-53: SRD 2024 off → ${legacyRows} rows «Legacy 2014» on their own; «${fireBolt.slice(0, 60)}…»`,
    );

    // ------------------------------------------------------------ 2. X-A1
    step = "X-A1";
    await setRole("dm");
    await go("library");
    await button(/^Crea contenuto$/)
      .first()
      .click();
    await sleep(800);
    await openDialog()
      .getByLabel(/Cosa vuoi creare/)
      .selectOption({ label: "Oggetto magico · Forgia: oggetto di base + modello" });
    await sleep(400);
    await openDialog()
      .getByRole("button", { name: /^Crea bozza privata$|^Apri la Forgia|^Crea/ })
      .last()
      .click();
    await sleep(1000);
    const provenance = ((await main().innerText())
      .replace(/\s+/g, " ")
      .match(/SRD 5\.2\.1 · [^·]*\+[^)]*\)/) ?? [""])[0];
    check(
      /Spada lunga \+ Arma \+1 \(IT p\./.test(provenance),
      "forge provenance in Italian: " + provenance,
    );
    await button(/^Crea la bozza forgiata$/)
      .first()
      .click();
    await sleep(1000);
    await main()
      .getByRole("button", { name: /^Salva$/ })
      .first()
      .click();
    await sleep(1200);
    await button(/^Applica a una scheda…$/)
      .first()
      .click();
    await sleep(800);
    let options = await openDialog()
      .locator("select")
      .first()
      .evaluate((s) => [...s.options].map((o) => o.text));
    const doranOption = options.find((o) => /^Doran/.test(o)) ?? "";
    check(
      /prima: «Abilita in campagna» · «Condividi in lettura con i giocatori»/.test(doranOption),
      "Doran's missing steps: " + options.join(" | "),
    );
    await openDialog().locator("select").first().selectOption({ label: doranOption });
    await openDialog()
      .getByRole("button", { name: /^Applica alla scheda$/ })
      .click();
    await sleep(700);
    const refusal = await openDialog().locator(".dialog-error").innerText();
    check(
      /^Prima di applicarla a Doran: «Abilita in campagna»/.test(refusal) && !/ \/ /.test(refusal),
      "refusal: " + refusal,
    );
    await page.screenshot({ path: shots + "ra-02-xa1-refusal.png" });
    await closeDialogs();
    await button(/^Abilita in campagna$/)
      .first()
      .click();
    await sleep(800);
    await button(/^Condividi in lettura con i giocatori$/)
      .first()
      .click();
    await sleep(800);
    await button(/^Applica a una scheda…$/)
      .first()
      .click();
    await sleep(800);
    options = await openDialog()
      .locator("select")
      .first()
      .evaluate((s) => [...s.options].map((o) => o.text));
    check(
      options.some((o) => /^Doran · prerequisiti soddisfatti$/.test(o)),
      "after the steps: " + options.join(" | "),
    );
    await openDialog()
      .locator("select")
      .first()
      .selectOption({ label: "Doran · prerequisiti soddisfatti" });
    await openDialog()
      .getByRole("button", { name: /^Applica alla scheda$/ })
      .click();
    await sleep(1000);
    passed.push(`2. X-A1: «${doranOption}», refused «${refusal}», applied after the two steps`);

    // ------------------------------------------------------------ 3. BI-24
    step = "BI-24";
    await go("characters?id=doran");
    await main()
      .locator("[role=tab], .tabs button")
      .filter({ hasText: /^Inventario$/ })
      .first()
      .click();
    await sleep(600);
    for (let i = 0; i < 3; i++) {
      const held = main()
        .locator(".item-row, li, article")
        .filter({ hasNotText: /Spada lunga \+1/ })
        .getByRole("button", { name: /^Riponi$/ });
      if (!(await held.count())) break;
      await held.first().click();
      await sleep(500);
    }
    await main()
      .locator(".item-row, li, article")
      .filter({ hasText: /Spada lunga \+1/ })
      .last()
      .getByRole("button", { name: /^Equipaggia$/ })
      .first()
      .click();
    await sleep(800);
    await main()
      .locator("[role=tab], .tabs button")
      .filter({ hasText: /^Azioni$/ })
      .first()
      .click();
    await sleep(600);
    const aria = await main()
      .locator("button")
      .evaluateAll((els) =>
        els
          .map((e) => e.getAttribute("aria-label") ?? "")
          .filter((a) => /^Tiro per colpire con Spada lunga \+1/.test(a)),
      );
    check(
      aria.some((a) => /\+3$/.test(a)),
      "forged sword attack: " + aria.join(" | "),
    );
    await page.screenshot({ path: shots + "ra-03-bi24-sheet.png" });
    passed.push(`3. BI-24: «${aria[0]}» (Strength +0, Proficiency +2, weapon +1)`);

    // ------------------------------------------------------------ 4. X-A3
    step = "X-A3";
    await reset("player");
    await go("characters");
    await button(/^Crea personaggio$/)
      .first()
      .click();
    await sleep(800);
    await main()
      .locator("button")
      .filter({ hasText: /^Classi e punti ferita/ })
      .first()
      .click();
    await sleep(600);
    await button(/Sfoglia le classi/)
      .first()
      .click();
    await sleep(700);
    await openDialog()
      .getByText(/^Mago$/)
      .first()
      .click();
    await sleep(400);
    const pickerText = (await openDialog().innerText()).replace(/\s+/g, " ");
    check(
      /Incantesimi, Adepto dei rituali, Recupero arcano/.test(pickerText),
      "picker in Italian: " + pickerText.slice(0, 300),
    );
    await openDialog()
      .getByRole("button", { name: /Crea variante nell/ })
      .click();
    await sleep(1000);
    await openDialog()
      .getByRole("button", { name: /^Crea bozza privata$/ })
      .click();
    await sleep(1000);
    await page
      .getByLabel(/^Nome · italiano/)
      .first()
      .fill("Mago delle lanterne");
    await main()
      .getByRole("button", { name: /^Salva$/ })
      .first()
      .click();
    await sleep(1300);
    check(/#builder\?/.test(page.url()), "back to the builder: " + page.url());
    const classChoice = await main()
      .locator("select")
      .evaluateAll((els) => els.map((s) => s.options[s.selectedIndex]?.text ?? ""));
    check(classChoice.includes("Mago delle lanterne"), "class chosen: " + classChoice.join(" | "));
    await page.screenshot({ path: shots + "ra-04-xa3-builder.png" });
    passed.push("4. X-A3: the Wizard variant saved at the first «Salva» and came back chosen");

    // ------------------------------------------------------------ 5. CA-57
    step = "CA-57";
    await reset("dm");
    await go("table");
    await sessionMenu();
    await page.locator('[data-sv="group"]').first().click();
    await sleep(700);
    await button(/Cedi il ruolo di DM a Livia/)
      .first()
      .click();
    await sleep(800);
    const member = await openDialog()
      .locator("select[name=to]")
      .evaluate((s) => s.options[s.selectedIndex]?.text ?? "");
    check(member === "Livia, Mira · Giocatore", "member: " + member);
    await closeDialogs();
    passed.push(`5. CA-57: the hand-off dialog reads «${member}»`);
    await context.close();
  } catch (error) {
    return { passed, failedAt: step, error: String(error.message).slice(0, 900), errors };
  }
  return { passed, errors };
}
