async (rootPage) => {
  // P3 fix package: privacy of the log and the DM's answers (IT desktop 1440 × 900).
  // TV-90: the DM's «Chi vede il risultato: Solo DM» covers a listed check of the tray;
  // TV-96: a hidden prepared modifier leaves no public line; X-02: the DM's service lines
  // stay out of the players' log; TV-92: the DM's request reaches the player as a card with
  // «Tira»; TV-69: a player's damage proposal is accepted from the bell in one click; TV-105:
  // the chat's «Tono» selector. Synthetic demo data only; resets this browser's example.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P3/";
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const saved = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const button = (name) => page.getByRole("button", { name, exact: true });
  const role = (r) =>
    page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption(r);
  const openTablePanel = async (id) => {
    const now = () => page.locator("#table-sidebar-panel").getAttribute("data-table-panel");
    if ((await now()) === id) return;
    if (!(await page.locator(`.table-subtabs [data-table-subtab="${id}"]`).count())) {
      const section = await page
        .locator(
          `.table-panel-index [data-table-drawer="${id}"], .table-panel-index [data-table="${id}"]`,
        )
        .first()
        .getAttribute("data-table-section-of");
      await page.locator(`.table-tabs [data-table-tab="${section}"]`).click();
    }
    if ((await now()) !== id)
      await page.locator(`.table-subtabs [data-table-subtab="${id}"]`).click();
    await page.waitForFunction(
      (i) => document.querySelector("#table-sidebar-panel")?.dataset.tablePanel === i,
      id,
    );
  };
  const logText = async () => {
    await openTablePanel("log");
    return page.locator("#table-sidebar-panel").innerText();
  };
  await page.goto(base + "#table");
  await button("Ripristina esempio").click();
  await button("Ripristina").click();
  await page.goto(base + "#table");

  // 1. TV-90: the DM rolls the Sentinel's Stealth from the tray list with «Solo DM».
  await role("dm");
  await openTablePanel("dice-tray");
  const panel = page.locator("#table-sidebar-panel");
  await panel.locator("[data-dtray-actor]").selectOption("goblin-1");
  await panel.locator('[data-dtray-audience][value="self"]').check({ force: true });
  const stealth = panel.locator('[data-dtray-roll][data-kind="skill"][data-skill="stealth"]');
  await stealth.scrollIntoViewIfNeeded();
  await stealth.click();
  let data = await saved();
  const hidden = data.ext["dice-tray"].rolls.at(-1);
  check(hidden.audience === "self" && hidden.actorId === "goblin-1", "listed check not «Solo DM»");
  passed.push("TV-90: «Solo DM» selected in the tray covers the listed check (audience self)");

  // 2. TV-96: a hidden prepared modifier.
  await panel.locator("[data-dtray-presets-manager] summary").click();
  await panel.locator('[data-dtray-preset-field="label"]').fill("Nebbia fitta");
  await panel.locator('[data-dtray-preset-field="value"]').fill("-2");
  await panel.locator('[data-dtray-preset-field="visible"]').uncheck();
  await panel.locator("[data-dtray-preset-add]").click();
  data = await saved();
  const presetLine = data.log.findLast((e) => e.label.includes("Nebbia fitta"));
  check(presetLine?.visibility === "private", "prepared modifier line is public");
  passed.push("TV-96: «Nebbia fitta» (hidden) is logged for the DM only");

  // 3. TV-92: the DM asks the group a DEX save DC 13.
  await panel.locator('[data-dtray-section="requests"]').click();
  await panel.locator('[data-dtray-rq="ability"]').selectOption("dex");
  await panel.locator('[data-dtray-rq="dc"]').fill("13");
  await panel.locator("[data-dtray-request-send]").click();
  passed.push("TV-92: the DM sent «TS Destrezza CD 13» to the group");

  // 4. Player: the log shows no Stealth, no Nebbia fitta, no DM service line; the request is
  //    a card with «Tira».
  await role("player");
  await page.goto(base + "#table");
  const text = await logText();
  check(!/Furtività|Stealth/.test(text), "player log reveals the DM's hidden Stealth");
  check(!text.includes("Nebbia fitta"), "player log names the hidden modifier");
  check(!text.includes("Modificatore preparato"), "player log shows the DM's preset line");
  const requestCard = page.locator(".chat-request-card").last();
  await requestCard.waitFor();
  await requestCard.scrollIntoViewIfNeeded();
  await requestCard.screenshot({ path: shots + "p3-10-player-request-card.png" });
  const tira = requestCard.getByRole("button", { name: "Tira", exact: true }).first();
  await tira.click();
  data = await saved();
  const answered = data.combatAttempts.find(
    (a) => a.kind === "roll-request" && a.actorId === "livia",
  );
  check(answered?.requests[0]?.status === "resolved", "«Tira» on the card did not answer");
  passed.push(
    "Player log: no Stealth, no «Nebbia fitta», no preset line; request card «Tira» answered Livia's save",
  );

  // 5. TV-105: «Tono» beside the message type.
  const mood = page.locator("[data-chat-mood]");
  await mood.fill("preoccupata");
  await page.locator("[data-chat-text]").fill("Qualcosa non va.");
  await page.locator("[data-chat-text]").press("Enter");
  const message = page.locator(".chat-msg").last();
  await message.waitFor();
  check((await message.innerText()).includes("(preoccupata)"), "message lacks the mood");
  passed.push("TV-105: «Tono: preoccupata» beside the message type shows «(preoccupata)»");

  // 6. TV-69: the player proposes 3 fire damage to the Sentinel; the DM accepts from the bell.
  await page.locator('.map-token[data-actor="goblin-1"]').click();
  const creatureTab = page.locator('.table-tabs [data-table-tab="creature"]');
  if ((await creatureTab.getAttribute("aria-selected")) !== "true") await creatureTab.click();
  const propose = page.locator('#table-sidebar-panel [data-dt-details="propose"]');
  if ((await propose.getAttribute("open")) === null) await propose.locator("summary").click();
  await propose.locator("[data-dt-propose-amount]").fill("3");
  await propose.locator("[data-dt-propose-type]").selectOption("fire");
  await propose.locator("[data-dt-propose]").click();
  await role("dm");
  const before = (await saved()).actors["goblin-1"].hp;
  await page.locator('.service-nav [data-service="requests"]').click();
  const accept = page.locator('#dialog [data-notifications-action="accept"]').first();
  await accept.waitFor();
  await page.screenshot({ path: shots + "p3-11-dm-bell-accept.png" });
  await accept.click();
  data = await saved();
  check(data.actors["goblin-1"].hp === before - 3, "the bell's Accept did not apply 3 damage");
  passed.push(`TV-69: bell «Accetta e applica» in one click: Sentinella ${before} → ${before - 3}`);

  // 7. TV-141: the DM rolls the Sentinel's Perception for everyone, then hides its identity
  //    from the token menu: the players' log names no «Sentinella», old lines included, and
  //    has no «Identità nascosta» line.
  if (await page.locator("#dialog[open]").count())
    await page.locator("#dialog footer [data-close]").click();
  await openTablePanel("dice-tray");
  await panel.locator('[data-dtray-section="roll"]').click();
  await panel.locator("[data-dtray-actor]").selectOption("goblin-1");
  await panel.locator('[data-dtray-audience][value="public"]').check({ force: true });
  const perception = panel.locator('[data-dtray-roll][data-kind="skill"][data-skill="perception"]');
  await perception.scrollIntoViewIfNeeded();
  await perception.click();
  await page.locator('.map-token[data-actor="goblin-1"]').click({ button: "right" });
  await page.getByRole("menuitem", { name: /Visibilità/ }).first().click();
  await page.getByRole("menuitem", { name: /Nascondi identità/ }).first().click();
  await page.locator("#dialog [data-knowledge-alias]").fill("Figura incappucciata");
  await page.getByRole("button", { name: "Nascondi identità", exact: true }).click();
  data = await saved();
  check(data.actors["goblin-1"].name === "Figura incappucciata", "identity not hidden");
  check(
    data.log.findLast((e) => e.label.startsWith("Identità nascosta"))?.visibility === "private",
    "«Identità nascosta» is a public line",
  );
  await role("player");
  await page.goto(base + "#table");
  const masked = await logText();
  check(!masked.includes("Sentinella"), "the players' log still names «Sentinella»");
  check(!masked.includes("Identità nascosta"), "the players' log announces the disguise");
  check(masked.includes("Figura incappucciata"), "the old Perception line is not under the disguise");
  passed.push(
    "TV-141: after «Nascondi identità» the players' log reads «Figura incappucciata» in old lines, no «Sentinella», no «Identità nascosta»",
  );

  check(!errors.length, "page errors: " + errors.join(" | "));
  await context.close();
  return passed;
}
