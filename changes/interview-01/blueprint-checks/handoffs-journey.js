async (rootPage) => {
  // Hand-offs of audit round 2 (single writer). 1440 × 900 IT, then 390 × 844 EN with touch.
  // 1. TV-89 privacy: Livia's «Solo il DM» Fire Bolt leaves her Registro a card «Risultato
  //    riservato al DM» without the d20 and shows no 3D dice to her; the DM's Registro reads it.
  // 2. PG-47: with Bless on, the Registro card names «1d20 + 1d4 (Benedizione)».
  // 3. TV-52: «Avvia combattimento» on «Agguato sulla strada» shows one row «Goblin guerriero
  //    A, B» with one d20; «Tira PNG» gives both the same die.
  // 4. Sample freshness: «Il sigillo della torre» is the coming Thursday (Home and Campagne), the last
  //    access a few days ago; no sample stamp is in the future.
  // 5. CA-88 / H-05: an Archive page offers «Copia in un’altra campagna…» (C5 «page») and
  //    «Marca una voce» lists Archive pages. Synthetic demo data only; resets the example.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/handoffs/images/";
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const browser = rootPage.context().browser();
  let context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let page = await context.newPage();
  const watch = (p) => {
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("dialog", (d) => d.accept().catch(() => {}));
  };
  watch(page);
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const button = (name) => page.getByRole("button", { name, exact: true });
  const setRole = async (value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await page.waitForTimeout(150);
  };
  let diceSeen = false;
  const settleDice = async () => {
    const layer = page.locator("[data-dice3d-layer]:not([hidden])");
    await layer.waitFor({ timeout: 800 }).catch(() => {});
    if (await layer.count()) diceSeen = true;
    for (let i = 0; i < 8 && (await layer.count()); i++) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(80);
    }
    await layer.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  };
  const closeDialog = async () => {
    if (await page.locator("#dialog[open]").count()) await page.keyboard.press("Escape");
    await page
      .locator("#dialog[open]")
      .waitFor({ state: "detached", timeout: 3000 })
      .catch(() => {});
  };
  const table = async () => {
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await page.waitForTimeout(300);
  };
  const registro = async () => {
    await closeDialog();
    const tab = page.locator('.table-tabs [data-table-tab="chat"]');
    if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
    await page.waitForTimeout(200);
    const log = page.locator('.table-subtabs [data-table-subtab="log"]');
    if (await log.count()) await log.click();
    await page.waitForTimeout(250);
    return page.locator("#table-sidebar-panel");
  };
  const noOverflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  let step = "setup";
  try {
    await table();
    await button("Ripristina esempio").click();
    await button("Ripristina").click();
    await page.locator("#battle-map").waitFor();
    await setRole("player");

    // ------------------------------------------------------------ 1. «Solo il DM» privacy
    step = "blind";
    await page.locator('.map-token[data-actor="livia"]').click();
    const fireBolt = page.locator('[data-combat-action="fire-bolt"]');
    await fireBolt.click({ button: "right" });
    await page.locator(".combat-roll-menu").waitFor();
    await page.locator('.combat-roll-menu [data-combat-menu-audience="blind"]').click();
    await page.locator("#combat-detail").waitFor();
    diceSeen = false;
    await page.locator('.map-token[data-actor="goblin-1"]').click();
    await settleDice();
    await page.waitForTimeout(300);
    const data = await stored();
    const attempt = data.combatAttempts.at(-1);
    check(attempt.audience === "blind", "the attempt keeps «Solo il DM»");
    const roll = data.log
      .flatMap((e) => e.rolls ?? [])
      .find((r) => r.attemptId === attempt.id && r.kind === "attack");
    check(
      roll && roll.audience === "blind" && roll.visibility === "private" && roll.owner === "dm",
      "evidence: " + JSON.stringify(roll),
    );
    check(!diceSeen, "the roller saw 3D dice of a «Solo il DM» roll");
    const d20 = roll.values[0];
    let panel = await registro();
    const hidden = panel.locator('[data-chat-roll-hidden="blind"]');
    await hidden.first().waitFor();
    const hiddenText = await hidden.first().innerText();
    check(/Risultato riservato al DM/.test(hiddenText), "hidden card: " + hiddenText);
    check(!new RegExp(`\\[${d20}`).test(hiddenText), "the roller reads the d20: " + hiddenText);
    await page.screenshot({ path: shots + "h-01-blind-registro-player-it-1440.png" });
    await setRole("dm");
    panel = await registro();
    check(!(await panel.locator("[data-chat-roll-hidden]").count()), "the DM gets a hidden card");
    const dmText = await panel.innerText();
    check(new RegExp(`\\[${d20}`).test(dmText), "the DM does not read the d20 " + d20);
    await page.screenshot({ path: shots + "h-02-blind-registro-dm-it-1440.png" });
    passed.push(
      `1. TV-89: «Solo il DM» Fire Bolt (d20 ${d20}): evidence audience blind, owner DM; no 3D dice for Livia; her Registro «${hiddenText.split("\n").slice(-1)[0]}»; the DM's Registro shows [${d20}]`,
    );

    // ------------------------------------------------------------ 2. Bless in the Registro
    step = "bless";
    await setRole("player");
    await page.goto(base + "#characters?id=livia");
    await page.locator('[data-shp="effect"][data-effect="bless"]').click();
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-shp="effect"][data-effect="bless"]')
          ?.getAttribute("aria-checked") === "true",
    );
    await table();
    await page.locator('.map-token[data-actor="livia"]').click();
    await page.locator('[data-combat-action="fire-bolt"]').click();
    await page.locator("#combat-detail").waitFor();
    await page.locator('.map-token[data-actor="goblin-1"]').click();
    await settleDice();
    panel = await registro();
    const blessCard = panel.locator(".chat-roll-card", { hasText: "(Benedizione)" }).last();
    await blessCard.waitFor();
    const blessText = await blessCard.innerText();
    check(/1d20 \+ 1d4 \(Benedizione\)/.test(blessText), "Bless card: " + blessText);
    await page.screenshot({ path: shots + "h-03-bless-registro-it-1440.png" });
    passed.push(
      `2. PG-47: Registro card «${blessText.split("\n").filter((l) => /Benedizione/.test(l))[0]}»`,
    );

    // ------------------------------------------------------------ 3. one row per group
    step = "group row";
    await setRole("dm");
    await closeDialog();
    await table();
    await page.locator('.table-topline [data-table="scenes"]').click();
    await page.locator('#dialog [data-table-scene-activate="road-ambush"]').click();
    await page.waitForTimeout(400);
    await closeDialog();
    await table();
    await page.locator('[data-table="combat"]').click();
    const dialog = page.locator("[data-ct-start-dialog]");
    await dialog.waitFor();
    const group = dialog.locator("[data-ct-start-group]");
    check((await group.count()) === 1, "one grouped row");
    const groupText = await group.innerText();
    check(/Goblin guerriero A, B/.test(groupText), "group row: " + groupText);
    check(
      (await dialog.locator('[data-ct-start-natural^="goblin-warrior-"]').count()) === 1,
      "one d20 field for the two goblins",
    );
    await dialog.locator('[data-ct-start-roll="npc"]').click();
    await page.waitForTimeout(400);
    const ledger = (await stored()).initiativeRolls.filter((r) =>
      ["goblin-warrior-a", "goblin-warrior-b"].includes(r.actorId),
    );
    check(
      ledger.length === 2 && ledger[0].natural === ledger[1].natural,
      "one die recorded for each goblin: " + JSON.stringify(ledger.map((r) => r.natural)),
    );
    await page.screenshot({ path: shots + "h-04-group-start-row-it-1440.png" });
    passed.push(
      `3. TV-52: start dialog row «${groupText.split("\n")[0]}», one d20 field; «Tira PNG» recorded ${ledger[0].natural} for both goblins`,
    );
    // «Annulla l’avvio» closes the players' roll call with the dialog.
    const cancelStart = dialog.locator("[data-ct-rollcall-close]");
    if (await cancelStart.count()) await cancelStart.click();
    await closeDialog();
    check(!(await page.locator("#dialog[open]").count()), "the start dialog stays open");

    // ------------------------------------------------------------ 4. sample freshness
    step = "freshness";
    const now = await page.evaluate(() => Date.now());
    const state = await stored();
    const session = state.campaign.sessions.find((s) => s.id === "session-sample-13");
    check(session && Date.parse(session.startsAt) > now, "next session in the future");
    check(new Date(session.startsAt).getUTCDay() === 4, "on a Thursday");
    check(Date.parse(session.startsAt) - now <= 7 * 86400000, "within the coming week");
    const stamps = JSON.stringify(state).match(/"20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z"/g) ?? [];
    const future = stamps
      .map((s) => s.slice(1, -1))
      .filter((s) => Date.parse(s) > now + 60000 && s !== session.startsAt);
    check(!future.length, "sample stamps in the future: " + future.slice(0, 5).join(", "));
    await page.goto(base + "#home");
    await page.locator("[data-home-appointment]").waitFor();
    const appointment = await page.locator("[data-home-appointment]").innerText();
    check(/Il sigillo della torre/.test(appointment), "Home appointment: " + appointment);
    await page.goto(base + "#campaigns");
    const card = page.locator("[data-cm-card]").first();
    await card.waitFor();
    const cardText = await card.innerText();
    check(!/Da fissare/.test(cardText), "campaign card without next session: " + cardText);
    check(/giorn[oi] fa|ieri|settimana scorsa/.test(cardText), "last access: " + cardText);
    await page.screenshot({ path: shots + "h-05-campaigns-fresh-it-1440.png" });
    passed.push(
      `4. Freshness: «${session.title}» ${session.localTime} ${session.timeZone}; Home «${appointment.split("\n").slice(1, 3).join(" · ")}»; campaign card «${cardText
        .split("\n")
        .filter((l) => /fa$|ieri|sessione/i.test(l))
        .join(" · ")}»; ${stamps.length} stamps, none in the future`,
    );

    // ------------------------------------------------------------ 5. Archive pages
    step = "archive page";
    await page.goto(base + "#campaign?tab=quests-archive&id=p:page-observatory");
    const copy = page.locator('[data-jp-copy-to="page:page-observatory"]');
    await copy.waitFor();
    await copy.click();
    await page.locator("#dialog[open]").waitFor();
    const copyText = await page.locator("#dialog[open]").innerText();
    check(/Pagina dell’Archivio · Il vecchio osservatorio/.test(copyText), "C5: " + copyText);
    await closeDialog();
    await page.goto(base + "#campaign?tab=safety");
    await page.locator('[data-safety-dialog="mark-entry"]').first().click();
    const options = await page.locator("#dialog[open] select[name=target] option").allInnerTexts();
    check(
      options.includes("Archivio · Il vecchio osservatorio"),
      "mark options: " + options.join(" | "),
    );
    await page
      .locator("#dialog[open] select[name=target]")
      .selectOption({ label: "Archivio · Il vecchio osservatorio" });
    await page.locator('#dialog[open] input[name=topics][value="spiders"]').check();
    await page.locator('#dialog[open] button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector("#dialog")?.open);
    const marks = await page.locator(".safety-block", { hasText: "Voci marcate" }).innerText();
    check(/Archivio · Il vecchio osservatorio/.test(marks), "marked list: " + marks);
    await page.screenshot({ path: shots + "h-06-archive-mark-it-1440.png" });
    passed.push(
      "5. CA-88/H-05: the Archive page's «Copia in un’altra campagna…» opens C5 naming «Pagina dell’Archivio · Il vecchio osservatorio»; «Marca una voce» lists and marks «Archivio · Il vecchio osservatorio»",
    );

    // ------------------------------------------------------------ 5b. casting Polymorph
    step = "polymorph";
    await table();
    const mod = await page.evaluate(() =>
      /Mac|iPhone|iPad/.test(navigator.platform) ? "Meta" : "Control",
    );
    await page.keyboard.press(`${mod}+k`);
    await page.locator("#dialog [data-cmdk-input]").fill("metamorfosi");
    await page.waitForTimeout(200);
    await page.locator("#dialog [data-cmdk-option]", { hasText: "Metamorfosi…" }).first().click();
    await page.locator("#dialog [data-forms-transform]").waitFor();
    // «Agguato sulla strada» is the active scene since step 3: a Goblin Warrior (CR 1/4).
    await page.locator('#dialog [data-tf="actorId"]').selectOption("goblin-warrior-a");
    await page.locator('#dialog input[data-tf="profileId"][value="srd2024:wolf"]').check();
    await page.locator('#dialog [data-tf="casterId"]').selectOption("livia");
    await page.waitForTimeout(150);
    const refused = await page.locator("#dialog [data-tf-summary]").innerText();
    check(
      /Livia non ha uno slot libero di 4° livello o superiore/.test(refused) &&
        /«Nessuno»/.test(refused),
      "Polymorph without a level 4 slot: " + refused,
    );
    await page.screenshot({ path: shots + "h-06b-polymorph-slot-it-1440.png" });
    await page.locator('#dialog [data-tf="casterId"]').selectOption("");
    await page.waitForTimeout(150);
    const free = await page.locator("#dialog [data-tf-summary]").innerText();
    check(!/slot libero/.test(free) && !/Costo del lancio/.test(free), "«Nessuno»: " + free);
    await closeDialog();
    passed.push(
      `5b. PG-79: Polymorph with Livia as caster is refused «${refused
        .split("\n")
        .find((l) => /slot libero/.test(l))}»; with «Nessuno» (an effect the DM decides) no cost`,
    );
    // The same example on the phone (a new context has its own storage).
    const saved = await page.evaluate((k) => localStorage.getItem(k), key);
    await context.close();

    // ------------------------------------------------------------ 6. phone, English, touch
    step = "phone";
    context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    page = await context.newPage();
    watch(page);
    await page.goto(base + "#home");
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, saved]);
    await page.reload();
    await page.locator("#demo-role").selectOption("player");
    await page.waitForTimeout(200);
    // Language is a per-tab preference: set it from Preferences on the home page.
    await page.locator('[data-service="preferences"]').first().tap();
    await page.locator("#dialog [name=lang]").selectOption("en");
    await page.locator("#dialog button[type=submit]").tap();
    await page.locator("#dialog[open]").waitFor({ state: "detached" });
    await page.goto(base + "#home");
    await page.locator("[data-home-appointment]").waitFor();
    const phoneHome = await page.locator("[data-home-appointment]").innerText();
    check(
      /Il sigillo della torre/.test(phoneHome) && /in \d/.test(phoneHome),
      "EN Home: " + phoneHome,
    );
    check(await noOverflow(), "Home overflows at 390");
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await page.waitForTimeout(300);
    const tab = page.locator('[data-table-tab="chat"]').first();
    await tab.tap();
    await page.waitForTimeout(300);
    const logTab = page.locator('.table-subtabs [data-table-subtab="log"]');
    if (await logTab.count()) await logTab.tap();
    await page.waitForTimeout(300);
    const phoneHidden = page.locator('[data-chat-roll-hidden="blind"]').first();
    await phoneHidden.scrollIntoViewIfNeeded();
    const phoneText = await phoneHidden.innerText();
    check(/Result reserved for the DM/.test(phoneText), "EN hidden card: " + phoneText);
    check(await noOverflow(), "Registro overflows at 390");
    await page.screenshot({ path: shots + "h-07-phone-en-hidden-card-390.png" });
    passed.push(
      `6. Phone 390 EN touch: Home «${phoneHome.split("\n").slice(0, 3).join(" · ")}»; Registro «Result reserved for the DM»; no horizontal overflow`,
    );
    await context.close();
  } catch (error) {
    return { passed, failedAt: step, error: String(error.message).slice(0, 900), errors };
  }
  return { passed, errors };
}
