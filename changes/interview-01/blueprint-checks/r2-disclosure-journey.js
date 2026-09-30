async (rootPage) => {
  // R2 CA-71 (C1) and CA-57 part (C3) with real clicks, IT desktop 1440:
  // (1) DCs hidden (Fantasy Grounds hidden DC; the C1 stand-in until R7's «CD dei tiri:
  //     Nascoste» lands): the DM requests a Dex save DC 13 from Livia; the player's tray card
  //     and Registro read «CD nascosta», the result still shows; the DM reads CD 13 (the bell
  //     and the 3D dice are covered by tests/r2-disclosure.test.mjs).
  // (2) Failed passive checks shown (BG3 passive roll; C1 stand-in): the DM hides the
  //     Sentinella with a reason and a 20; the player's Creature tab and Registro read «Livia
  //     non nota nulla (Percezione passiva N)» without naming what; the DM's view has none.
  // (3) Session hand-off (Owlbear): palette «cedi il ruolo» → the player runs the session:
  //     Dadi › Richieste has «Chiedi un tiro», the runner's request is sent; the DM's hidden
  //     goblin answer reaches the runner's Registro, not the other lines of the DM.
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
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const shot = (name) => page.screenshot({ path: shots + name, fullPage: false });
  const text = async (selector) =>
    ((await page.locator(selector).first().innerText()) ?? "").replace(/\s+/g, " ");
  const dialog = () => page.locator("#dialog[open]");
  const dismissTips = async () => {
    for (let i = 0; i < 3; i++) {
      const tip = page.getByRole("button", { name: /^(Ho capito|Got it)$/ }).first();
      if (!(await tip.isVisible().catch(() => false))) return;
      await tip.click();
      await page.waitForTimeout(100);
    }
  };
  const role = async (value) => {
    if ((await page.locator("#demo-role").inputValue()) === value) return;
    await page.locator("#demo-role").selectOption(value);
    await page.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await page.waitForTimeout(200);
    await dismissTips();
  };
  const skipDice = async () => {
    for (
      let i = 0;
      i < 3 && (await page.locator("[data-dice3d-layer]:not([hidden])").count());
      i++
    ) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
    }
  };
  const openTablePanel = async (id) => {
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
      if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
    }
    if ((await now()) !== id)
      await page.locator(`.table-subtabs [data-table-subtab="${id}"]`).click();
    await page.waitForFunction(
      (i) => document.querySelector("#table-sidebar-panel")?.dataset.tablePanel === i,
      id,
    );
  };
  const traySection = async (name) => {
    await openTablePanel("dice-tray");
    const tab = page.locator(`[data-dtray-section="${name}"]`);
    if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
    await page.locator(`[data-dtray-section="${name}"][aria-selected="true"]`).waitFor();
  };
  const token = (id) => page.locator(`#battle-map [data-actor="${id}"]`);
  const select = async (id) => {
    await page.keyboard.press("Escape");
    const b = await token(id).boundingBox();
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(150);
  };
  const creatureTab = async () => {
    await openTablePanel("creature");
    await page.locator("[data-knowledge-panel]").waitFor();
  };
  // The C1 switches are R7's («Cosa vedono i giocatori»); until they are integrated this
  // journey uses the documented reader seam of chat-domain.mjs, same module instance.
  const disclosure = (value) =>
    page.evaluate(
      async (v) => (await import("/chat-domain.mjs")).useDisclosureReader(v ? () => v : null),
      value,
    );
  const sendRequest = async ({ dc = "", targets }) => {
    await traySection("requests");
    await page.locator('[data-dtray-rq="dc"]').fill(String(dc));
    const boxes = page.locator("[data-dtray-rq-target]");
    for (let i = 0; i < (await boxes.count()); i++) {
      const box = boxes.nth(i);
      const want = targets.includes(await box.getAttribute("value"));
      if (want !== (await box.isChecked())) await box.click();
    }
    await page.locator("[data-dtray-request-send]").click();
    await page.waitForTimeout(300);
  };

  try {
    await page.goto(base + "#table");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    await dismissTips();

    // (1) DCs hidden.
    await disclosure({ dc: "hidden" });
    await role("dm");
    await sendRequest({ dc: 13, targets: ["livia"] });
    check(/CD 13/.test(await text("[data-dtray-group]")), "the DM's card lost the DC");
    const requestLine = (await stored()).log.at(-1).label;
    check(/CD nascosta → Livia$/.test(requestLine), "the shared request line: " + requestLine);
    await role("player");
    await traySection("requests");
    const playerCard = await text("[data-dtray-group]");
    check(
      /Tiro salvezza su Destrezza · CD nascosta/.test(playerCard) && !/CD 13/.test(playerCard),
      "player card: " + playerCard,
    );
    await page.locator("[data-dtray-group]").first().scrollIntoViewIfNeeded();
    await shot("r2d-01-player-dc-hidden-1440.png");
    await page.locator("[data-dtray-answer]").first().click();
    await page.waitForTimeout(400);
    await skipDice();
    const after = await text("[data-dtray-group]");
    check(
      /(Successo|Fallimento)/.test(after) && /CD nascosta/.test(after),
      "result hidden: " + after,
    );
    await openTablePanel("log");
    const log = (await page.locator("[data-chat-item]").allInnerTexts()).join(" | ");
    check(/CD nascosta/.test(log) && !/CD 13/.test(log), "player Registro: " + log.slice(-400));
    await role("dm");
    await traySection("requests");
    check(/CD 13/.test(await text("[data-dtray-group]")), "the DM's card after the answer");
    await disclosure(null);
    passed.push(
      "(1) DCs hidden: the DM's request «CD 13»; the shared line and the player's tray card and Registro «CD nascosta» with the result; the DM still reads CD 13",
    );

    // (2) Failed passive checks shown.
    await disclosure({ passiveFailures: "shown" });
    await select("goblin-1");
    await creatureTab();
    await page.locator('[data-knowledge-hide="goblin-1"]').click();
    await dialog().locator("[data-knowledge-hide-dialog]").waitFor();
    await dialog().locator('[name="dmReason"]').fill("Nell'ombra del muro");
    await dialog().locator('[name="diceMode"]').selectOption("physical");
    await dialog().locator('[name="face0"]').fill("20");
    await dialog().locator('button[type="submit"]').click();
    await page.waitForFunction(
      (k) => !!JSON.parse(localStorage.getItem(k)).ext.knowledge.hidden["goblin-1"],
      key,
    );
    await skipDice();
    await role("player");
    await select("livia");
    await creatureTab();
    const passive = await text("[data-knowledge-passive]");
    check(
      /Prove passive Livia non nota nulla \(Percezione passiva \d+\)/.test(passive),
      "Creature tab: " + passive,
    );
    check(!/Sentinella|goblin/i.test(passive), "the line names what was missed");
    await page.locator("[data-knowledge-passive]").scrollIntoViewIfNeeded();
    await shot("r2d-02-failed-passive-creature-1440.png");
    await openTablePanel("log");
    check(
      (await page.locator(".chat-passive").allInnerTexts()).some((t) =>
        /Livia non nota nulla/.test(t),
      ),
      "no passive line in the Registro",
    );
    await role("dm");
    check(
      !(await page.locator(".chat-passive").count()),
      "the DM's Registro has the player's line",
    );
    await disclosure(null);
    passed.push(
      "(2) failed passive shown: the Sentinella hides (DM reason, 20); Livia's Creature tab and the player's Registro read «Livia non nota nulla (Percezione passiva N)» naming nothing; not for the DM",
    );

    // (3) Session hand-off: the runner asks rolls and reads the DM's hidden session rolls.
    await role("dm");
    await sendRequest({ targets: ["goblin-2"] });
    await page.locator("[data-dtray-answer]").first().click();
    await page.waitForTimeout(300);
    await skipDice();
    await role("player");
    await openTablePanel("log");
    const hiddenBefore = (await page.locator("[data-chat-item]").allInnerTexts()).join(" | ");
    check(!/Esploratore · Prova/.test(hiddenBefore), "a player reads the goblin's hidden roll");
    await role("dm");
    await page.keyboard.press("Meta+K");
    await page.locator("[data-cmdk-input]").fill("cedi il ruolo");
    await page.waitForTimeout(250);
    await page.keyboard.press("Enter");
    await dialog().waitFor();
    await dialog().locator('button[type="submit"]').click();
    await page.waitForFunction((k) => {
      const s = JSON.parse(localStorage.getItem(k));
      return !!s.ext["campaign-members"]?.campaigns?.[s.campaign.id]?.handover;
    }, key);
    await page.goto(base + "#table");
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    await role("player");
    await openTablePanel("log");
    const runnerLog = (await page.locator("[data-chat-item]").allInnerTexts()).join(" | ");
    check(/Esploratore/.test(runnerLog), "the runner does not read the DM's hidden goblin roll");
    await traySection("requests");
    check(/Chiedi un tiro/.test(await text("[data-dtray]")), "the runner has no request form");
    await sendRequest({ targets: ["livia"] });
    const asked = (await stored()).combatAttempts.filter((a) => a.kind === "roll-request").at(-1);
    check(
      asked.rollRequest.requestedBy === "player",
      "the runner's request: " + JSON.stringify(asked.rollRequest),
    );
    await shot("r2d-03-runner-requests-1440.png");
    passed.push(
      "(3) palette «cedi il ruolo»: the player runs the session, reads the DM's hidden goblin roll in the Registro and sends a request from Dadi › Richieste (requestedBy player)",
    );
  } catch (error) {
    throw Error(`After ${passed.length} passed (${passed.at(-1) ?? "start"}): ${error.message}`);
  }
  if (errors.length) throw Error("Page errors: " + errors.join(" | "));
  return { passed, errors };
};
