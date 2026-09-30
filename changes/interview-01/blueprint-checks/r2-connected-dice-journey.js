async (rootPage) => {
  // R2 TV-95 — connected dice, delegated simulation (I-233) of the Pixels pattern (Foundry's
  // Pixels module, Roll20 and D&D Beyond integrations), as a first-time user, real clicks:
  // (1) IT 1440 player: the palette «pixels» opens Dadi › Impostazioni › Dadi connessi;
  //     «Cerca dadi vicini» lists dice with signal and battery; «Collega» pairs Onice and
  //     Aurora; Aurora's 14 % battery warns; «Fai lampeggiare» says so; «Scollega» greys
  //     «Simula il lancio» with its reason; «Ricollega».
  // (2) a Dex save from the tray's list waits for the d20; «Simula il lancio» fills it; the
  //     roll is physical and the log reads «fisico · Pixels d20»; the Registro card names it.
  // (3) «Simula il lancio» with nothing waiting: an unprompted roll, a free card in the tray.
  // (4) per-type method: d6 «Fisico»; 1d20+1d6 waits for the d20 and the typed d6.
  // (5) EN phone 390 with touch: palette «smart dice», the panel fits, pair by tap, battery in
  //     English, a save waits and a tap on «Simulate the throw» records it; no overflow.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R2/images/";
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const slice = async (p = page) => (await stored(p)).ext["dice-tray"];
  const shot = (name, p = page) => p.screenshot({ path: shots + name, fullPage: false });
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  const text = async (selector, p = page) =>
    ((await p.locator(selector).first().innerText()) ?? "").replace(/\s+/g, " ");
  const skipDice = async (p = page) => {
    for (let i = 0; i < 3 && (await p.locator("[data-dice3d-layer]:not([hidden])").count()); i++) {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(150);
    }
  };
  const dismissTips = async (p = page) => {
    for (let i = 0; i < 3; i++) {
      const tip = p.getByRole("button", { name: /^(Ho capito|Got it)$/ }).first();
      if (!(await tip.isVisible().catch(() => false))) return;
      await tip.click();
      await p.waitForTimeout(100);
    }
  };
  // B62: a Table panel is a sub-tab of its sidebar tab: open that tab, then the sub-tab.
  const openTablePanel = async (p, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const now = () => p.locator("#table-sidebar-panel").getAttribute("data-table-panel");
    if ((await now()) === id) return;
    if (!(await p.locator(`.table-subtabs [data-table-subtab="${id}"]`).count())) {
      const own = await p.locator(`.table-tabs [data-table-tab="${id}"]`).count();
      const section = own
        ? id
        : await p
            .locator(
              `.table-panel-index [data-table-drawer="${id}"], .table-panel-index [data-table="${id}"]`,
            )
            .first()
            .getAttribute("data-table-section-of");
      const tab = p.locator(`.table-tabs [data-table-tab="${section}"]`);
      if ((await tab.getAttribute("aria-selected")) !== "true") await press(tab);
    }
    if ((await now()) !== id) await press(p.locator(`.table-subtabs [data-table-subtab="${id}"]`));
    await p.waitForFunction(
      (i) => document.querySelector("#table-sidebar-panel")?.dataset.tablePanel === i,
      id,
    );
  };
  const palette = async (query, p = page) => {
    await p.keyboard.press("Meta+K");
    await p.locator("[data-cmdk-input]").waitFor();
    await p.locator("[data-cmdk-input]").fill(query);
    await p.waitForTimeout(250);
    const first = await p.locator("[data-cmdk-list] [role=option]").first().innerText();
    await p.keyboard.press("Enter");
    await p.locator("[data-dtray-devices]").waitFor();
    return first.replace(/\s+/g, " ");
  };
  const section = async (name, p = page, tap = false) => {
    const tab = p.locator(`[data-dtray-section="${name}"]`);
    if ((await tab.getAttribute("aria-selected")) !== "true") await (tap ? tab.tap() : tab.click());
    await p.locator(`[data-dtray-section="${name}"][aria-selected="true"]`).waitFor();
  };
  const rolls = async (p = page) => (await slice(p)).rolls.length;
  const waitRolls = (n, p = page) =>
    p.waitForFunction(
      ([k, count]) => JSON.parse(localStorage.getItem(k)).ext["dice-tray"].rolls.length >= count,
      [key, n],
    );

  try {
    await page.goto(base + "#table");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    await dismissTips();

    // (1) palette «pixels» → connection panel; scan; pair; battery; blink; disconnect.
    const found = await palette("pixels");
    check(/Dadi connessi \(Pixels, Bluetooth\)/.test(found), "palette first result: " + found);
    check(
      (await page.locator("#table-sidebar-panel").getAttribute("data-table-panel")) === "dice-tray",
      "the palette did not open the Dice tab",
    );
    check(
      /non c'è Bluetooth/.test(await text("[data-dtray-sim-note]")),
      "the panel does not say the simulation",
    );
    await page.getByRole("button", { name: "Cerca dadi vicini" }).click();
    await page.locator("[data-dtray-nearby]").waitFor();
    const nearby = await text("[data-dtray-nearby]");
    check(
      /Pixels d20 Onice d20 · segnale forte · batteria 86%/.test(nearby) &&
        /Pixels d20 Aurora .*batteria 14% Batteria scarica/.test(nearby),
      "scan list: " + nearby,
    );
    await shot("r2j-01-scan-1440.png");
    await page.locator('[data-dtray-connect="px-d20-onyx"]').click();
    await page.locator("[data-dtray-paired]").waitFor();
    await page.locator('[data-dtray-connect="px-d20-aurora"]').click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).ext["dice-tray"].devices.player.length === 2,
      key,
    );
    const paired = await text("[data-dtray-paired]");
    check(
      /Batteria 14% · scarica: ricaricalo presto \(sotto il 20 %\)/.test(paired),
      "no low-battery warning: " + paired,
    );
    const [onyx, aurora] = (await slice()).devices.player;
    check(onyx.state === "connected" && aurora.battery === 14, "devices: " + JSON.stringify(onyx));
    check((await slice()).diceMethods.player["20"] === "connected", "d20 not set to the die");
    await page.locator(`[data-dtray-device-blink="${onyx.id}"]`).click();
    check(/Lampeggia: cercalo sul tavolo/.test(await text("[data-dtray-paired]")), "no blink note");
    await page.locator(`[data-dtray-device="${aurora.id}"]`).scrollIntoViewIfNeeded();
    await shot("r2j-02-paired-battery-blink-1440.png");
    await page.locator(`[data-dtray-device-state="${onyx.id}"]`).click();
    await page.locator(`[data-dtray-device="${onyx.id}"][data-state="disconnected"]`).waitFor();
    const simulate = page.locator(`[data-dtray-device-roll="${onyx.id}"]`);
    check(await simulate.isDisabled(), "a disconnected die can still be thrown");
    const why = await simulate.getAttribute("aria-describedby");
    check(
      why && /non è connesso: ricollegalo/.test(await text(`#${why}`)),
      "the greyed throw has no reason",
    );
    await page.locator(`[data-dtray-device-state="${onyx.id}"]`).click();
    await page.locator(`[data-dtray-device="${onyx.id}"][data-state="connected"]`).waitFor();
    passed.push(
      "(1) palette «pixels» → Dadi connessi; scan with signal and battery; Collega Onice and Aurora; Aurora 14 % warns; Fai lampeggiare; Scollega greys Simula with its reason; Ricollega",
    );

    // (2) a Dex save from the tray's list waits for the connected d20.
    await section("roll");
    check(
      /d20 · Pixels d20 Onice · Connesso · batteria 86%/.test(
        await text("[data-dtray-connected-summary]"),
      ),
      "the Dice section does not say the d20 waits for the die",
    );
    const before = await rolls();
    const save = page.locator('[data-dtray-roll][data-kind="save"][data-ability="dex"]').first();
    await save.scrollIntoViewIfNeeded();
    await save.click();
    await page.locator("[data-dtray-waiting]").waitFor();
    check((await rolls()) === before, "recorded before the die reported");
    const waiting = await text("[data-dtray-waiting]");
    check(
      /In attesa del dado connesso… Livia · Tiro salvezza su Destrezza/.test(waiting) &&
        /Pixels d20 Onice · batteria 86%/.test(waiting),
      "waiting card: " + waiting,
    );
    await page.locator("[data-dtray-waiting]").scrollIntoViewIfNeeded();
    await shot("r2j-03-save-waiting-1440.png");
    await page.locator("[data-dtray-connected-roll]").click();
    await waitRolls(before + 1);
    await skipDice();
    const r = (await slice()).rolls.at(-1);
    check(
      r.kind === "save" && r.mode === "physical" && r.faceModes?.[0] === "connected",
      "save: " + JSON.stringify(r).slice(0, 200),
    );
    const log = (await stored()).log.at(-1).label;
    check(/fisico · Pixels d20 Onice$/.test(log), "log line: " + log);
    check(/fisico · Pixels d20 Onice/.test(await text("[data-dtray-result]")), "result card");
    await openTablePanel(page, "log");
    await page.locator(".chat-roll-card").last().waitFor();
    const card = (await page.locator(".chat-roll-card").last().innerText()).replace(/\s+/g, " ");
    check(/Dado fisico · Pixels d20 Onice/.test(card), "log card: " + card);
    await page.locator(".chat-roll-card").last().scrollIntoViewIfNeeded();
    await shot("r2j-04-log-card-1440.png");
    passed.push(
      "(2) Livia's Dex save waits for the d20; «Simula il lancio» records it physical; log «… · fisico · Pixels d20 Onice»; Registro card «Dado fisico · Pixels d20 Onice»",
    );

    // (3) unprompted: a throw with nothing waiting is a free card in the tray.
    await openTablePanel(page, "dice-tray");
    await page.locator("[data-dtray]").waitFor();
    await section("look");
    const n3 = await rolls();
    await page.locator(`[data-dtray-device-roll="${onyx.id}"]`).click();
    await waitRolls(n3 + 1);
    await skipDice();
    await page.locator('[data-dtray-section="roll"][aria-selected="true"]').waitFor();
    check(
      /Tiro senza richiesta · Pixels d20 Onice/.test(await text("[data-dtray-result]")),
      "no unprompted card",
    );
    passed.push(
      "(3) a throw with nothing waiting lands as «Tiro senza richiesta · Pixels d20 Onice» in the tray",
    );

    // (4) per-type method: the d6 by hand.
    await section("look");
    await page.locator('[data-dtray-method="6"]').selectOption("physical");
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext["dice-tray"].diceMethods.player["6"] === "physical",
      key,
    );
    await section("roll");
    await page.locator("[data-dtray-formula]").fill("1d20+1d6");
    await page.locator("[data-dtray-roll-button]").click();
    await page.locator("[data-dtray-waiting]").waitFor();
    const n4 = await rolls();
    await page.locator("[data-dtray-connected-roll]").click();
    await page.locator('[data-dtray-wait-die="0"][data-state="done"]').waitFor();
    check((await rolls()) === n4, "recorded before the d6 was typed");
    await page.locator('[data-dtray-wait-face="1"]').fill("4");
    await page.locator("[data-dtray-connected-record]").click();
    await waitRolls(n4 + 1);
    await skipDice();
    const r4 = (await slice()).rolls.at(-1);
    check(
      JSON.stringify(r4.faceModes) === '["connected","physical"]' && r4.values[1] === 4,
      "mixed roll: " + JSON.stringify(r4).slice(0, 200),
    );
    await section("look");
    await page.locator('[data-dtray-method="6"]').selectOption("default");
    passed.push(
      "(4) d6 «Fisico, scrivo la faccia»: 1d20+1d6 waits for the d20 and the typed d6; each face keeps its origin",
    );

    // (5) EN phone 390 with touch.
    const phoneContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const phone = await phoneContext.newPage();
    phone.on("pageerror", (error) => errors.push("phone: " + error.message));
    await phone.goto(base + "#table");
    await phone.evaluate(() => localStorage.clear());
    await phone.reload();
    await phone.getByRole("heading", { level: 1 }).first().waitFor();
    await dismissTips(phone);
    await phone.locator('[data-service="preferences"]').tap();
    await phone.locator("#dialog select[name=lang]").selectOption("en");
    await phone.getByRole("button", { name: "Salva preferenze", exact: true }).tap();
    await dismissTips(phone);
    await phone.waitForTimeout(300);
    check(
      (await phone.locator('[data-service="preferences"]').getAttribute("aria-label")) !== null,
      "no preferences control",
    );
    const foundEn = await palette("smart dice", phone);
    check(/Connected dice \(Pixels, Bluetooth\)/.test(foundEn), "EN palette: " + foundEn);
    await phone.locator("[data-dtray-scan]").tap();
    await phone.locator('[data-dtray-connect="px-d20-aurora"]').tap();
    await phone.locator("[data-dtray-paired]").waitFor();
    check(
      /Battery 14% · low: charge it soon \(under 20%\)/.test(
        await text("[data-dtray-paired]", phone),
      ),
      "EN battery warning",
    );
    check(await noOverflow(phone), "the connection panel widens the phone");
    await phone.locator("[data-dtray-paired]").scrollIntoViewIfNeeded();
    await shot("r2j-05-phone-en-panel-390.png", phone);
    await section("roll", phone, true);
    const phoneSave = phone
      .locator('[data-dtray-roll][data-kind="save"][data-ability="wis"]')
      .first();
    await phoneSave.scrollIntoViewIfNeeded();
    const nPhone = await rolls(phone);
    await phoneSave.tap();
    await phone.locator("[data-dtray-waiting]").waitFor();
    check(
      /Waiting for the connected die… Livia · Wisdom saving throw/.test(
        await text("[data-dtray-waiting]", phone),
      ),
      "EN waiting card",
    );
    check(await noOverflow(phone), "the waiting card widens the phone");
    await phone.locator("[data-dtray-waiting]").scrollIntoViewIfNeeded();
    await shot("r2j-06-phone-en-waiting-390.png", phone);
    await phone.locator("[data-dtray-connected-roll]").tap();
    await waitRolls(nPhone + 1, phone);
    await skipDice(phone);
    const rp = (await slice(phone)).rolls.at(-1);
    check(rp.mode === "physical" && rp.devices?.[0]?.en === "Pixels d20 Aurora", "phone roll");
    check(/physical · Pixels d20 Aurora$/.test((await stored(phone)).log.at(-1).label), "EN log");
    passed.push(
      "(5) EN phone 390 touch: palette «smart dice», pair Aurora by tap, «Battery 14% · low: charge it soon», a Wisdom save waits and a tap records it «physical · Pixels d20 Aurora»; no overflow",
    );
    await phoneContext.close();
  } catch (error) {
    throw Error(`After ${passed.length} passed (${passed.at(-1) ?? "start"}): ${error.message}`);
  }
  if (errors.length) throw Error("Page errors: " + errors.join(" | "));
  return { passed, errors };
};
