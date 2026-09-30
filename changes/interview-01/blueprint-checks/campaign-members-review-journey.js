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
  // B13 review fixes — real clicks and keys against the one app, both identities, IT desktop
  // 1440 then a 390 phone. Each block reproduces a review finding and checks the fix.
  // Synthetic data only; resets this browser's demo state. Screenshots go to the B13
  // evidence folder, never into the checkout.
  const browser = rootPage.context().browser();
  for (const prior of browser.contexts()) if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B13/";
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const as = async (role) => {
    await page.locator("#demo-role").selectOption(role);
    await page.waitForTimeout(150);
  };
  const button = (name, root = page) => root.getByRole("button", { name, exact: true });
  const card = (name) => page.locator(".cm-card", { hasText: name });
  const content = () => page.locator("#content").innerText();
  const dialog = page.locator("#dialog[open]");
  const submit = () => page.locator("#dialog[open] button[type=submit]").click();
  const shot = (name) => page.screenshot({ path: dir + name });
  const go = async (hash) => {
    await page.goto(base + "#" + hash);
    await page.waitForTimeout(250);
  };
  const noOverflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  const moveWithKeys = async (actorId, key = "ArrowLeft") => {
    await page.locator("#battle-map").waitFor();
    const token = page.locator(`#battle-map [data-actor="${actorId}"]`);
    const before = await token.getAttribute("transform");
    await token.focus();
    await page.keyboard.press("Enter");
    await page.locator("#battle-map").focus();
    await page.keyboard.press(key);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
    return { before, after: await token.getAttribute("transform") };
  };
  const tableLog = async () => {
    // B61: Registro is a tab of the Table's sidebar, remembered per identity: open it only
    // when it is not the open tab already.
    // B62: the log is the first sub-tab of the Chat tab; open it only if it is not open.
    if ((await page.locator("#table-sidebar-panel").getAttribute("data-table-panel")) !== "log")
      await toggleLog(page);
    await page.waitForTimeout(250);
    // The message list only (B17 chat stream, or the core log), not the composer.
    const stream = page.locator(".chat-stream, .table-log").first();
    return (await stream.count()) ? await stream.innerText() : "";
  };

  // 1. Reset. DM creates Rovine di Vetro and a five-use player link.
  await page.goto(base + "#campaigns");
  await page.evaluate((k) => localStorage.removeItem(k), key);
  await page.reload();
  await page.getByRole("heading", { name: "Campagne", level: 1 }).waitFor();
  await as("dm");
  await page.locator('.page-heading [data-cm="create"]').click();
  await page.locator("#dialog [name=name]").fill("Rovine di Vetro");
  await submit();
  await page.waitForURL(/#campaigns\?id=campaign-[a-z0-9-]+&tab=invites/);
  const id = page.url().match(/id=(campaign-[a-z0-9-]+)/)[1];
  await page.locator("[data-cm-form=link] [name=uses]").selectOption("5");
  await button("Crea link").click();
  await page.waitForTimeout(200);
  const link = await page.locator(".cm-link:not(.is-closed) [data-cm-url]").first().inputValue();
  let data = await stored();
  check(
    data.log.every((entry) => entry.visibility === "private"),
    "Creation or link line is shared: " + JSON.stringify(data.log.map((e) => e.visibility)),
  );
  passed.push("Created Rovine di Vetro and a 5-use link; both log lines are private to the DM");

  // 2. P3 focus: choosing a join path with the keyboard keeps focus on that path.
  await as("player");
  await page.goto(link);
  await page.locator('.cm-path[data-path="own"]').waitFor();
  await page.locator('.cm-path[data-path="own"]').focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  const focused = await page.evaluate(() => ({
    path: document.activeElement?.dataset?.path ?? null,
    pressed: document.activeElement?.getAttribute("aria-pressed"),
  }));
  check(
    focused.path === "own" && focused.pressed === "true",
    "Focus lost: " + JSON.stringify(focused),
  );
  await page.keyboard.press("Tab");
  check(
    (await page.evaluate(() => document.activeElement?.name)) === "actorId",
    "Tab after the path does not reach the character choice",
  );
  await page.locator(".cm-choice", { hasText: "Mira" }).click();
  await button("Controlla chi vedrà la scheda").click();
  await dialog.waitFor();
  await submit();
  await page.locator(".cm-seat", { hasText: "Giocato da Giocatore" }).waitFor();
  passed.push(
    "Keyboard: Enter on «Entra con un tuo personaggio» keeps focus there; Tab reaches the choice; Mira joined",
  );

  // 3. P2 rename: DM moves a goblin, renames the lanterns, Undo reverts only the goblin.
  await as("dm");
  await go("table");
  const move = await moveWithKeys("goblin-1");
  check(move.after !== move.before, "Goblin move failed");
  await go("campaigns?id=lanterns&tab=manage");
  await button("Modifica nome, immagine e descrizione…").click();
  await page.locator("#dialog [name=name]").fill("Le lanterne di Bruma II");
  await page.locator("#dialog [name=description]").fill("Descrizione nuova");
  await submit();
  await page.locator(".cm-hero-title", { hasText: "Le lanterne di Bruma II" }).waitFor();
  await go("table");
  await button("Annulla ultima modifica").click();
  await page.locator("#toast.shown", { hasText: "Modifica annullata" }).waitFor();
  data = await stored();
  check(
    (await page.locator('#battle-map [data-actor="goblin-1"]').getAttribute("transform")) ===
      move.before,
    "Undo did not restore the goblin",
  );
  check(
    data.campaign.name === "Le lanterne di Bruma II",
    "Undo reverted the rename: " + data.campaign.name,
  );
  check(
    data.ext["campaign-members"].campaigns.lanterns.description === "Descrizione nuova",
    "Description lost",
  );
  passed.push(
    "Rename: Undo restored the goblin, kept «Le lanterne di Bruma II» and the new description",
  );

  // 4. P2 log privacy: a secret campaign's link and approval never reach the player's log.
  await go("campaigns");
  await page.locator('.page-heading [data-cm="create"]').click();
  await page.locator("#dialog [name=name]").fill("Campagna segreta del giovedì");
  await submit();
  await page.waitForURL(/tab=invites/);
  await page.locator("[data-cm-form=link] [name=role]").selectOption("observer");
  await button("Crea link").click();
  await page.locator("[data-cm-approval]").check();
  await page.waitForTimeout(200);
  await as("player");
  await go("table");
  const playerLog = await tableLog();
  check(
    !/Campagna segreta|Approvazione degli ingressi|Link d’invito/.test(playerLog),
    "Player log shows another campaign's administration: " + playerLog.slice(0, 400),
  );
  passed.push(
    "Player's Table log shows nothing of «Campagna segreta del giovedì» (link, approval)",
  );

  // 5. P2 deactivate: the owner cannot connect back a sheet the DM deactivated.
  await as("dm");
  await go("campaigns?id=lanterns&tab=characters");
  await page
    .locator(".cm-seat", { hasText: "Livia" })
    .getByRole("button", { name: "Disattiva" })
    .click();
  await page.locator(".cm-seat", { hasText: "Livia" }).getByText("Disattivato").waitFor();
  await as("player");
  await go("characters?id=livia&tab=actions");
  await page.locator(".cm-deactivated").waitFor();
  check(
    (await page.locator(".cm-deactivated").innerText()).includes("Il DM ha disattivato Livia"),
    "Deactivation notice missing on the sheet",
  );
  await page.locator('[data-character-action="connect-campaign"]').click();
  await dialog.waitFor();
  await submit();
  await page.locator("#dialog .dialog-error", { hasText: "Il DM ha disattivato" }).waitFor();
  await shot("r-05-deactivated-connect-refused.png");
  await page.keyboard.press("Escape");
  data = await stored();
  check(!data.actors.livia.campaignIds.includes("lanterns"), "Deactivated Livia rejoined");
  await as("dm");
  await go("campaigns?id=lanterns&tab=characters");
  await page
    .locator(".cm-seat", { hasText: "Livia" })
    .getByRole("button", { name: "Riattiva" })
    .click();
  await page.waitForTimeout(200);
  check((await stored()).actors.livia.campaignIds.includes("lanterns"), "Reactivate failed");
  passed.push(
    "Deactivate: sheet says why; «Collega alla campagna» refused with the reason; DM reactivates",
  );

  // 6. P1 access: a removed player reaches neither the Table (also through search) nor moves Livia.
  await go("campaigns?id=lanterns&tab=members");
  await page.locator('[data-cm="remove"][data-target="player"]').click();
  await page.locator("#dialog [name=reason]").fill("Fine della collaborazione");
  await submit();
  await page.waitForTimeout(250);
  await go("table");
  const dmMove = await moveWithKeys("goblin-1");
  check(dmMove.after !== dmMove.before, "DM move after removal failed");
  await as("player");
  await go("table");
  await page.getByRole("heading", { name: "Non fai parte di questa campagna" }).waitFor();
  check(!(await page.locator("#battle-map").count()), "Removed player still sees the map");
  await shot("r-06-removed-player-table.png");
  await go("home");
  await page.locator('.service-nav [data-service="search"]').click();
  await page.waitForTimeout(250);
  await page.keyboard.type("Tavolo");
  await page.waitForTimeout(300);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  const viaSearch = await page.evaluate(() => location.hash);
  if (viaSearch.startsWith("#table"))
    await page.getByRole("heading", { name: "Non fai parte di questa campagna" }).waitFor();
  check(!(await page.locator("#battle-map").count()), "Search led the removed player to the map");
  await go("preparation");
  check(
    !(await page.locator(".prep-collection, #prep-map").count()),
    "Preparation open to a non-member",
  );
  data = await stored();
  check(
    !data.log.some((entry) => entry.controller === "player" && /Movimento/.test(entry.label)),
    "Removed player recorded a move",
  );
  passed.push(
    `Removed player: #table and search (${viaSearch || "no hash"}) show «Non fai parte di questa campagna»; no move recorded`,
  );

  // 7. P1 isolation and P2 selection: the DM launches Rovine; the player there sees only Rovine.
  await as("dm");
  await go("campaigns");
  await card("Rovine di Vetro").getByRole("button", { name: "Avvia" }).click();
  await page.locator(".table-topline h1", { hasText: "Scena iniziale" }).waitFor();
  const dmDock = await page.locator(".action-dock strong").first().innerText();
  check(dmDock !== "Livia", "DM Table in Rovine still selects Livia");
  await shot("r-07-table-rovine-dm.png");
  data = await stored();
  check(data.log.length === 0, "Rovine inherited the lanterns log: " + data.log.length);
  check(
    !data.ext.chat || data.ext.chat.messages.length === 0,
    "Rovine inherited the lanterns chat",
  );
  check(
    !data.ext.handouts || data.ext.handouts.materials.length === 0,
    "Rovine inherited the lanterns handouts",
  );
  await as("player");
  await go("home");
  await page.locator(".resume-scene h2", { hasText: "Rovine di Vetro" }).waitFor();
  const summary = await page.locator(".cm-home-summary").innerText();
  check(summary.includes("Mira") && !summary.includes("Livia"), "Home summary: " + summary);
  await page.locator(".resume-scene").getByRole("button", { name: "Entra al Tavolo" }).click();
  await page.locator(".table-topline h1", { hasText: "Scena iniziale" }).waitFor();
  check(
    (await page.locator(".action-dock strong").first().innerText()) === "Mira",
    "Player Table in Rovine does not select Mira",
  );
  const rovineLog = await tableLog();
  check(
    !/Movimento confermato|Membro espulso|Livia|Doran|lanterne/i.test(rovineLog),
    "Rovine log shows lanterns content: " + rovineLog.slice(0, 400),
  );
  await shot("r-07-player-rovine-log.png");
  const composer = page.locator("#chat-text");
  const hasChat = (await composer.count()) > 0;
  if (hasChat) {
    await composer.fill("Solo nelle Rovine di Vetro");
    await page.locator("[data-chat-send]").click();
    await page.waitForTimeout(300);
  }
  passed.push(
    `Rovine: empty log, chat and materials for both identities; DM dock «${dmDock}», player dock «Mira»; Home shows Mira${hasChat ? "; player wrote in the Rovine chat" : ""}`,
  );

  // 8. P1 isolation back: the lanterns get their own log and chat again.
  await as("dm");
  await go("campaigns");
  await card("Le lanterne di Bruma II").getByRole("button", { name: "Avvia" }).click();
  await page.locator(".table-topline h1", { hasText: "Il cortile dell’osservatorio" }).waitFor();
  data = await stored();
  check(
    data.log.some((entry) => entry.label.includes("Membro espulso")),
    "Lanterns log not restored",
  );
  check(
    !data.log.some((entry) => /Rovine/.test(entry.label) && entry.visibility !== "private"),
    "A Rovine line reached the lanterns log",
  );
  if (hasChat)
    check(
      !data.ext.chat.messages.some((m) => /Solo nelle Rovine/.test(m.text ?? "")) &&
        data.ext.chat.messages.length > 0,
      "Chat not per campaign",
    );
  const back = data.ext["campaign-members"].parked[id];
  check(back.core && Array.isArray(back.core.log), "Rovine core records not parked");
  passed.push(
    `Back to the lanterns: log (${data.log.length} lines) and chat (${data.ext.chat?.messages.length ?? 0} messages) restored; Rovine keeps its own`,
  );

  // 9. P1 ex-DM: after a transfer and leaving, the former DM gets neither Preparation nor Table.
  await go(`campaigns?id=${id}&tab=manage`);
  await button("Trasferisci la proprietà…").click();
  await page.locator("#dialog [name=to]").selectOption("player");
  await submit();
  await as("player");
  await go("campaigns");
  await page
    .locator(".cm-inbox-row", { hasText: "ti propone la proprietà" })
    .getByRole("button", { name: "Accetta" })
    .click();
  await page.waitForTimeout(250);
  await card("Rovine di Vetro").getByRole("button", { name: "Avvia" }).click();
  await page.locator(".table-topline h1", { hasText: "Scena iniziale" }).waitFor();
  await as("dm");
  await go(`campaigns?id=${id}&tab=manage`);
  await button("Esci dalla campagna…").click();
  await submit();
  await page.waitForTimeout(250);
  await go("preparation");
  await page.getByRole("heading", { name: "Non fai parte di questa campagna" }).waitFor();
  await shot("r-09-exdm-preparation.png");
  await go("table");
  await page.getByRole("heading", { name: "Non fai parte di questa campagna" }).waitFor();
  check(
    !(await page.getByRole("button", { name: "Avvia combattimento" }).count()),
    "Ex-DM keeps DM tools",
  );
  passed.push(
    "Former DM after transfer and leave: #preparation and #table say «Non fai parte di questa campagna»",
  );

  // 10. P3 bell: a personal invitation opens the join page, where it can be declined.
  await as("player");
  await go(`campaigns?id=${id}&tab=invites`);
  await page.locator("[data-cm-form=direct] [name=to]").selectOption("dm");
  await button("Invia invito").click();
  await page.waitForTimeout(200);
  await as("dm");
  await page.locator('.service-nav [data-service="requests"]').click();
  const notice = page.getByText("Invito · Rovine di Vetro").first();
  await notice.waitFor();
  await notice.click();
  await page.waitForTimeout(300);
  if (!(await page.locator(".cm-decline").count())) {
    const open = page.getByRole("button", { name: "Apri", exact: true }).first();
    if (await open.count()) await open.click();
    await page.waitForTimeout(300);
  }
  await page.locator(".cm-decline").waitFor();
  await shot("r-10-invite-decline.png");
  await button("Rifiuta l’invito").click();
  await page.getByText("Hai rifiutato questo invito.").waitFor();
  passed.push("Bell → invitation → join page with «Rifiuta l’invito»; declining closes it");

  // 11. Phone 390: not-member state and Home summary, no overflow, targets ≥ 40 px.
  await page.setViewportSize({ width: 390, height: 844 });
  await go("table");
  await page.getByRole("heading", { name: "Non fai parte di questa campagna" }).waitFor();
  check(await noOverflow(), "Overflow on the not-member state at 390");
  await as("player");
  await go("home");
  await page.locator(".cm-home-summary").waitFor();
  check(await noOverflow(), "Overflow on Home at 390");
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("#content .cm-home-summary button, #content .cm-home .button")]
      .filter((el) => el.offsetParent !== null)
      .map((el) => [
        el.textContent.trim().slice(0, 30),
        Math.round(el.getBoundingClientRect().height),
      ])
      .filter(([, h]) => h < 40),
  );
  check(!small.length, "Targets under 40 px: " + JSON.stringify(small));
  await page.screenshot({ path: dir + "r-11-phone-home-summary.png", fullPage: true });
  passed.push("390: not-member Table and Home summary without overflow; targets ≥ 40 px");

  check(!errors.length, "Page errors: " + errors.join(" | "));
  await context.close();
  return passed;
};
