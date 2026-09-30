async (rootPage) => {
  // B62: token-menu commands of labelled submenus are one step deeper (Foundry Token HUD
  // FVT-119, D&D Beyond token menu DDB-117): open the submenu holding it, then the command.
  const menuPick = async (page, name, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const menu = page.locator("body > .token-menu");
    const item = () => menu.getByRole("menuitem", { name });
    await menu.locator("[data-nav]").first().waitFor();
    if (await item().count()) return press(item().first());
    const ids = await menu
      .locator("[data-token-menu-category]")
      .evaluateAll((els) => els.map((e) => e.dataset.tokenMenuCategory));
    for (const id of ids) {
      await press(menu.locator(`[data-token-menu-category="${id}"]`));
      if (await item().count()) return press(item().first());
      await press(menu.locator("[data-token-menu-back]"));
    }
    throw Error("token menu command not found: " + name);
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
  // B46 — knowledge, examination, stealth and cover in the one app, with real clicks, keys,
  // drags and touch: (1) Examine the goblin at level 1, a successful Study raises it to 2, the
  // DM grants and corrects, never data not granted; (2) «Figura incappucciata» replaces the
  // name in the log and chat until the reveal; (3) Livia hidden in the lantern tower: who
  // notices her only for the DM, the loss explained; (4) cover ½/¾/total at the destination
  // and +2 AC in the attack detail; (5) line of sight private or public; (6) modifiers under
  // the target, the % only when the policy allows; (7) pickpocket with a check and the DM's
  // decision. Group 1 IT desktop 1440 (player and DM), group 2 isolated EN phone 390 with
  // touch. Synthetic demo data only; resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B46/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const know = async (p = page) => (await stored(p)).ext.knowledge;
  const waitStored = (fn, arg = null, p = page) =>
    p
      .waitForFunction(
        ([k, source, a]) => {
          const s = JSON.parse(localStorage.getItem(k));
          return new Function("s", "a", "return (" + source + ")(s, a)")(s, a);
        },
        [key, fn.toString(), arg],
        { timeout: 8000 },
      )
      .catch((error) => {
        throw Error(`State never became: ${fn.toString()} — ${error.message.split("\n")[0]}`);
      });
  const dismissTips = async (p = page) => {
    const got = p.getByRole("button", { name: /^(Ho capito|Got it)$/ });
    for (let i = 0; i < 3 && (await got.count()); i++)
      await got
        .first()
        .click({ timeout: 1500 })
        .catch(() => {});
  };
  const role = async (value, p = page) => {
    if ((await p.locator("#demo-role").inputValue()) === value) return;
    await p.locator("#demo-role").selectOption(value);
    await p.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await dismissTips(p);
  };
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const shot = async (name, locator = null, p = page) => {
    if (locator) await locator.first().evaluate((el) => el.scrollIntoView({ block: "center" }));
    await p.waitForTimeout(250);
    await p.screenshot({ path: dir + name });
  };
  const dialog = (p = page) => p.locator("#dialog[open]");
  const submit = async (p = page) => dialog(p).locator('button[type="submit"]').click();
  const closeDialog = async (p = page) => {
    if (await dialog(p).count()) await dialog(p).locator("footer [data-close]").click();
    await dialog(p).waitFor({ state: "detached" });
  };
  const rollIn = async (faces, p = page) => {
    await dialog(p).locator('[name="diceMode"]').selectOption("physical");
    for (let i = 0; i < faces.length; i++)
      await dialog(p).locator(`[name="face${i}"]`).fill(String(faces[i]));
    await submit(p);
    await dialog(p).waitFor({ state: "detached" });
  };
  const token = (id, p = page) => p.locator(`#battle-map [data-actor="${id}"]`);
  const centre = async (id, p = page) => {
    const b = await token(id, p).boundingBox();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const scenePoint = (x, y, p = page) =>
    p.evaluate(
      ([x, y]) => {
        const m = document.querySelector("#battle-map #tokens").getScreenCTM();
        const q = new DOMPoint(x, y).matrixTransform(m);
        return { x: q.x, y: q.y };
      },
      [x, y],
    );
  const menu = (p = page) => p.locator("body > .token-menu");
  const openMenu = async (id, p = page) => {
    await p.keyboard.press("Escape");
    const c = await centre(id, p);
    await p.mouse.click(c.x, c.y, { button: "right" });
    await menu(p).waitFor({ state: "visible" });
  };
  // B62: a command of a labelled submenu is opened through its submenu (menuPick).
  const menuItem = async (label, p = page) => {
    await menuPick(p, label);
  };
  const select = async (id, p = page) => {
    await p.keyboard.press("Escape");
    const c = await centre(id, p);
    await p.mouse.click(c.x, c.y);
    await p.waitForTimeout(150);
  };
  const creatureTab = async (p = page) => {
    const tab = p.locator('[data-table-tab="creature"]').first();
    if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
    await p.locator("[data-knowledge-panel]").waitFor();
  };
  const panelText = (p = page) => p.locator("[data-knowledge-panel]").innerText();
  const drag = async (from, to, p = page, steps = 10, hold = null) => {
    await p.mouse.move(from.x, from.y);
    await p.mouse.down();
    for (let i = 1; i <= steps; i++)
      await p.mouse.move(
        from.x + ((to.x - from.x) * i) / steps,
        from.y + ((to.y - from.y) * i) / steps,
      );
    if (hold) await hold();
    await p.mouse.up();
  };
  const activateScene = async (id) => {
    await role("dm");
    // Refreshed by the hand-off writer (29/09/2026): P6 TV-106, the title row's «Scene» lists
    // the scenes and «Prepara le scene» opens Preparation.
    await page.locator('.table-topline [data-table="scenes"]').click();
    await page.locator("#dialog [data-table-scene-prepare]").click();
    await page.locator(`[data-prep-activate="${id}"]`).waitFor({ state: "attached" });
    await page.evaluate((sceneId) => {
      const details = document
        .querySelector(`[data-prep-activate="${sceneId}"]`)
        .closest("details");
      if (details && !details.open) details.querySelector("summary").click();
    }, id);
    await page.locator(`[data-prep-activate="${id}"]`).click();
    await submit();
    await waitStored((s, a) => s.activeSceneId === a, id);
    await page.locator("#battle-map").waitFor();
    await dismissTips();
  };

  // ------------------------------------------------------------ reset
  await page.goto(base + "#table");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("#battle-map").waitFor();
  await dismissTips();
  check(
    (await know()).links["goblin-1"] === "srd2024:creature:goblin-warrior",
    "Seed profile link missing",
  );
  await role("player");

  // ------------------------------------------------------------ 1. Examine and Study (player)
  await openMenu("goblin-1");
  await menuItem("Esamina");
  await dialog().waitFor();
  let text = await dialog().innerText();
  check(/Esamina · Sentinella/.test(text), "Examine window title");
  check(/Conoscenza del gruppo: 1\/4/.test(text), "Level 1 not shown: " + text);
  check(/Goblin guerriero/.test(text) && /Folletto \(goblinoide\)/.test(text), "Level 1 facts");
  check(/Da scoprire: CA, punti ferita tipici/.test(text), "Locked tier 2 not announced");
  for (const secret of ["Classe Armatura", "3d6", "Scimitarra", "Fuga agile", "CD"])
    check(!text.includes(secret), "Level 1 leaks " + secret);
  await shot("b46-01-examine-level1-player-it-1440.png");
  // Study from the Examine window: Intelligence (Arcana) for a Fey, physical die.
  await dialog().locator("[data-knowledge-exam-study]").click();
  await dialog().locator("[data-knowledge-study-dialog]").waitFor();
  text = await dialog().innerText();
  check(/Intelligenza \(Arcano\) \+3/.test(text), "Study profile: " + text);
  await rollIn([9]);
  await waitStored(
    (s) => s.ext.knowledge.campaigns.lanterns.kinds["srd2024:creature:goblin-warrior"].level === 2,
  );
  // Undo in the action dock (Livia selected) withdraws the level; the die stays as evidence.
  await select("livia");
  await page
    .getByRole("button", { name: /Annulla ultima modifica/ })
    .first()
    .click();
  await waitStored(
    (s) =>
      !s.ext.knowledge.campaigns.lanterns?.kinds?.["srd2024:creature:goblin-warrior"] &&
      s.ext["knowledge-rolls"].rolls.length === 1,
  );
  // From the Creature tab: select the goblin and Study again (the undone die stays in the
  // evidence; a digital retry would reuse it, see the Node test I-229).
  await select("goblin-1");
  await creatureTab();
  check(/1\/4 · Goblin guerriero/.test(await panelText()), "Creature tab summary");
  await page.locator("[data-knowledge-study]").click();
  await rollIn([9]);
  await waitStored(
    (s) =>
      s.ext.knowledge.campaigns.lanterns.kinds["srd2024:creature:goblin-warrior"].level === 2 &&
      s.ext["knowledge-rolls"].rolls.length === 2 &&
      s.log.at(-1).rolls?.[0]?.source === "knowledge",
  );
  await page.reload();
  await page.locator("#battle-map").waitFor();
  await dismissTips();
  await role("player");
  await select("goblin-2");
  await creatureTab();
  await page.locator("[data-knowledge-examine]").click();
  text = await dialog().innerText();
  check(/Conoscenza del gruppo: 2\/4/.test(text), "Pooled level 2 after reload: " + text);
  check(/Classe Armatura\s+12/.test(text), "Esploratore's own AC 12 at level 2: " + text);
  check(/10 \(3d6\)/.test(text) && !text.includes("Scimitarra"), "Level 2 content");
  await shot("b46-02-examine-level2-pooled-it-1440.png");
  await closeDialog();
  // Keyboard: the Creature tab's «Esamina» opens with Enter, Escape closes the window.
  await page.locator("[data-knowledge-examine]").focus();
  await page.keyboard.press("Enter");
  await dialog().waitFor();
  check(/Esamina · Esploratore/.test(await dialog().innerText()), "Enter did not open Examine");
  await page.keyboard.press("Escape");
  await dialog().waitFor({ state: "detached" });
  passed.push(
    "1a. Player: right-click Sentinella › «Esamina» (BG3 window) at 1/4: Goblin guerriero, Folletto (goblinoide), tiers 2–4 locked with what they hide, no AC/HP/attacks/DC in the DOM; «Studia (Arcano)» physical 9 + 3 = 12 ≥ 10 → 2/4; «Annulla ultima modifica» withdraws the level while the accepted die stays in the evidence; Study again from the Creature tab (physical 9) → 2/4 with the roll in the log entry; after reload Esploratore (same profile, WotR pooled) shows 2/4 with its own AC 12 and 10 (3d6), no attacks; keyboard: focus «Esamina» + Enter opens it, Escape closes",
  );

  // DM grants 4, then corrects to 3 (reason required).
  await role("dm");
  await openMenu("goblin-1");
  await menuItem("Esamina");
  text = await dialog().innerText();
  check(/Solo il DM/.test(text) && /I giocatori lo sanno/.test(text), "DM tier badges");
  check(/CD di Studio proposta: 10 \(Arcano\)/.test(text), "DM reads the proposed DC");
  await dialog().locator("[data-knowledge-grant-level]").selectOption("4");
  await submit();
  await waitStored(
    (s) => s.ext.knowledge.campaigns.lanterns.kinds["srd2024:creature:goblin-warrior"].level === 4,
  );
  await openMenu("goblin-1");
  await menuItem("Esamina");
  await dialog().locator("[data-knowledge-grant-level]").selectOption("3");
  await submit();
  check(
    /serve un motivo/.test(await dialog().locator(".dialog-error").innerText()),
    "Lowering without a reason was not refused",
  );
  await dialog().locator("[data-knowledge-grant-reason]").fill("Confuso con il goblin capo");
  await submit();
  await waitStored(
    (s) => s.ext.knowledge.campaigns.lanterns.kinds["srd2024:creature:goblin-warrior"].level === 3,
  );
  await role("player");
  await select("goblin-1");
  await creatureTab();
  await page.locator("[data-knowledge-examine]").click();
  text = await dialog().innerText();
  check(/Conoscenza del gruppo: 3\/4/.test(text) && /Scimitarra/.test(text), "Tier 3 visible");
  check(!/Fuga agile/.test(text), "Tier 4 still locked for players");
  await dialog().locator(".knowledge-history summary").click();
  text = await dialog().innerText();
  check(/Correzione del DM 4 → 3 · Confuso con il goblin capo/.test(text), "Correction reason");
  check(!/CD 10/.test(text), "Players never read the lore DC");
  await closeDialog();
  passed.push(
    "1b. DM: «Esamina» shows every tier with «I giocatori lo sanno / Solo il DM» and the proposed DC 10 (Arcano); grants 4/4, lowering to 3/4 without a reason is refused in the dialog, with «Confuso con il goblin capo» it is recorded as a correction; the player then reads tier 3 (Scimitarra) but not tier 4 (Fuga agile) and the correction reason, never the DC",
  );

  // ------------------------------------------------------------ 2. Hidden identity (DM)
  await role("dm");
  await openMenu("goblin-2");
  await menuItem("Nascondi identità…");
  check(
    (await dialog().locator("[data-knowledge-alias]").inputValue()) === "Figura incappucciata",
    "Default unidentified name",
  );
  await submit();
  await waitStored((s) => s.actors["goblin-2"].name === "Figura incappucciata");
  // The DM speaks as the hooded figure in the chat (Log tab).
  await openTablePanel(page, "log"); // B62: Chat › Registro
  await page.locator('input[name="chat-mode"][value="ic"]').check();
  await page.locator("[data-chat-speaker]").selectOption("actor:goblin-2");
  await page.locator("[data-chat-text]").fill("Andatevene dalla mia torre.");
  await page.locator("[data-chat-send]").click();
  await waitStored((s) =>
    s.ext.chat.messages.some((m) => m.text === "Andatevene dalla mia torre."),
  );
  await page.waitForTimeout(300);
  const dmLog = await page.locator("#table-sidebar-panel").innerText();
  check(
    /Figura incappucciata · Esploratore/.test(dmLog),
    "DM does not see the true name beside the alias",
  );
  await shot("b46-03-identity-dm-log-it-1440.png");
  await role("player");
  await openTablePanel(page, "log"); // B62: Chat › Registro
  const playerLog = await page.locator("#table-sidebar-panel").innerText();
  check(/Figura incappucciata/.test(playerLog), "Player chat speaker is not the alias");
  const whole = await page.locator("body").innerText();
  check(!whole.includes("Esploratore"), "The true name leaks to the player");
  check(
    (await token("goblin-2").getAttribute("aria-label")).startsWith("Figura incappucciata"),
    "Map token not renamed",
  );
  await select("goblin-2");
  await creatureTab();
  check(/Identità sconosciuta/.test(await panelText()), "Player Creature tab: unknown identity");
  await page.locator("[data-knowledge-examine]").click();
  check(
    /Identità sconosciuta/.test(await dialog().innerText()) &&
      !(await dialog().innerText()).includes("Goblin"),
    "Examine leaks the kind of an unidentified creature",
  );
  await shot("b46-04-identity-player-examine-it-1440.png");
  await closeDialog();
  passed.push(
    "2. DM: token menu › «Nascondi identità…» (FG ID toggle) with «Figura incappucciata»; speaks as it in the chat; the DM's log and chat read «Figura incappucciata · Esploratore»; the player's page text (map token, log, chat speaker) never contains «Esploratore»; the player's Examine says «Identità sconosciuta» without the goblin profile",
  );

  // ------------------------------------------------------------ 3. Stealth in the tower
  await activateScene("lantern-tower");
  await role("player");
  await select("livia");
  await creatureTab();
  text = await panelText();
  check(/Visibile · Luce fioca · leggermente oscurata/.test(text), "Tower obscurity: " + text);
  check(/Nessun nemico che vedi/.test(text), "The fog must hide the goblins from the player");
  check(!/Percezione passiva/.test(text), "Players never read who notices");
  await page.locator('[data-knowledge-hide="livia"]').click();
  await dialog().locator("[data-knowledge-hide-dialog]").waitFor();
  check(/CD 15/.test(await dialog().innerText()), "Hide DC 15");
  await rollIn([15]);
  await waitStored((s) => s.ext.knowledge.hidden.livia?.total === 17);
  const liviaConditions = (await stored()).actors.livia.conditions.map((c) => c.id ?? c);
  check(liviaConditions.includes("invisible"), "Hidden without the Invisible condition");
  check(
    /Nascosta · CD per trovarla 17/.test(await panelText()),
    "Hidden status in the Creature tab",
  );
  check(await page.locator('[data-knowledge-hidden-mark="livia"]').count(), "No hidden mark");
  await page.reload();
  await page.locator("#battle-map").waitFor();
  await dismissTips();
  await role("player");
  await select("livia");
  await creatureTab();
  check(/Nascosta · CD per trovarla 17/.test(await panelText()), "Hiding lost on reload");
  await role("dm");
  await select("livia");
  await creatureTab();
  text = await panelText();
  check(
    /Esploratore · non ti vede · Copertura totale · Percezione passiva 11 · non la nota/.test(text),
    "DM awareness row: " + text,
  );
  await shot("b46-05-hidden-dm-awareness-it-1440.png", page.locator("[data-knowledge-stealth]"));
  // The player speaks aloud in the chat: the loss is detected and explained.
  await role("player");
  await openTablePanel(page, "log"); // B62: Chat › Registro
  await page.locator('input[name="chat-mode"][value="ic"]').check();
  await page.locator("[data-chat-to]").selectOption("all");
  await page.locator("[data-chat-text]").fill("C'è qualcuno qui?");
  await page.locator("[data-chat-send]").click();
  await waitStored(
    (s) =>
      !s.ext.knowledge.hidden.livia &&
      s.ext.knowledge.events.at(-1).kind === "lost" &&
      s.ext.knowledge.events.at(-1).reason === "sound",
  );
  check(
    !(await stored()).actors.livia.conditions.some((c) => (c.id ?? c) === "invisible"),
    "Invisible not removed with the hiding",
  );
  await select("livia");
  await creatureTab();
  text = await panelText();
  check(
    /Livia non è più nascosta: ha parlato più forte di un sussurro · SRD 5\.2\.1 · EN 183 \/ IT 210/.test(
      text,
    ),
    "Loss not explained: " + text,
  );
  await shot("b46-06-loss-explained-player-it-1440.png", page.locator("[data-knowledge-loss]"));
  // DM correction: she stays hidden (reason required).
  await role("dm");
  await select("livia");
  await creatureTab();
  await page.locator("[data-knowledge-keep]").click();
  await dialog().locator("[data-knowledge-reason]").fill("Il vento copre la voce");
  await submit();
  await waitStored((s) => s.ext.knowledge.hidden.livia?.total === 17);
  passed.push(
    "3. DM activates «La torre della lanterna»; player selects Livia › Creature tab: «Luce fioca · leggermente oscurata», no enemy she can see (fog of B35 hides the goblins), no passive Perception; «Nasconditi…» DC 15, physical 15 + 2 = 17 → Invisible, «Nascosta · CD per trovarla 17», hidden mark on the token, kept after reload; the DM reads «Esploratore · non ti vede · Copertura totale · Percezione passiva 11 · non la nota» with «Trovata da…»; the player says «C'è qualcuno qui?» aloud in the chat (Dialogo, to everyone) → hiding and Invisible end, explained with SRD EN 183 / IT 210; the DM's «Mantieni nascosta…» with a reason restores it",
  );

  // ------------------------------------------------------------ 4. Cover at the destination (DM)
  // The DM opens the store door (door dialog › «Intervento del DM» › «Imposta aperta»).
  await page.locator('#battle-map [data-door="tower-store-door"]').click();
  await dialog().locator(".door-dm-controls summary").click();
  await dialog().locator('[data-correct-door="open"]').click();
  await waitStored(
    (s) =>
      s.scenes.find((x) => x.id === "lantern-tower").walls.find((w) => w.id === "tower-store-door")
        .doorState === "open",
  );
  await closeDialog();
  const from = await centre("livia");
  const to = await scenePoint(425, 325);
  let chip = "";
  await drag(from, to, page, 12, async () => {
    await page.locator("[data-knowledge-cover-chip]").waitFor();
    chip = await page.locator("[data-knowledge-cover-chip]").evaluate((n) => n.textContent);
    await page.screenshot({ path: dir + "b46-07-cover-destination-drag-dm-it-1440.png" });
  });
  check(/Figura incappucciata: ¾/.test(chip), "Destination chip: " + chip);
  await waitStored((s) => {
    const t = s.scenes
      .find((x) => x.id === "lantern-tower")
      .tokens.find((x) => x.actorId === "livia");
    return Math.abs(t.x - 425) < 30 && Math.abs(t.y - 325) < 30;
  });
  await select("livia");
  await creatureTab();
  check(
    /Figura incappucciata · Esploratore · non ti vede · Copertura dei tre quarti/.test(
      await panelText(),
    ),
    "Cover after the move: " + (await panelText()),
  );
  passed.push(
    "4a. DM opens the store door and drags Livia towards the doorway: during the drag the XCOM chip under the pointer reads «Figura incappucciata: ¾» and «Sentinella: ■» (the door frame gives three-quarters, the walls total); after the drop the DM's Creature tab lists «Figura incappucciata · Esploratore · non ti vede · Copertura dei tre quarti»",
  );

  // Livia stops hiding by her own choice before leaving the tower (explained as well).
  await role("player");
  await select("livia");
  await creatureTab();
  await page.locator('[data-knowledge-unhide="livia"]').click();
  await waitStored((s) => !s.ext.knowledge.hidden.livia);
  check(/ha smesso di nascondersi/.test(await panelText()), "Chosen loss not explained");

  // ------------------------------------------------------------ 4b/6. Attack detail in the courtyard
  await activateScene("old-watch");
  await drag(await centre("goblin-1"), await scenePoint(500, 360));
  await waitStored((s) => {
    const t = s.scenes
      .find((x) => x.id === "old-watch")
      .tokens.find((x) => x.actorId === "goblin-1");
    return Math.abs(t.x - 500) < 20 && Math.abs(t.y - 360) < 20;
  });
  await role("player");
  await select("livia");
  await page.locator('[data-combat-action="fire-bolt"]').click();
  const target = await centre("goblin-2");
  await page.mouse.move(target.x - 30, target.y - 30);
  await page.mouse.move(target.x, target.y);
  await page.locator("[data-knowledge-target-chip]").waitFor();
  text = await page.locator("#combat-detail").innerText();
  check(/CA del bersaglio \+2: Mezza copertura · SRD 5\.2\.1 p\. 16/.test(text), "Detail: " + text);
  check(!/Probabilità di colpire/.test(text), "The % shows though the policy says never");
  chip = await page.locator("[data-knowledge-target-chip]").evaluate((n) => n.textContent);
  check(/Mezza copertura · CA \+2/.test(chip) && !/%/.test(chip), "Target chip: " + chip);
  await shot("b46-08-attack-detail-cover-player-it-1440.png");
  await page.keyboard.press("Escape");
  // The DM allows the % in the campaign's disclosure policy (Preferences).
  await role("dm");
  await page.locator('.service-nav [data-service="preferences"]').click();
  await dialog()
    .locator('[name="setting:knowledge-policy.hit-chance"]')
    .selectOption({ label: "Sempre (come BG3)" });
  await submit();
  await waitStored(
    (s) => s.ext["core-settings"].campaign["knowledge-policy.hit-chance"] === "always",
  );
  await role("player");
  await select("livia");
  await page.locator('[data-combat-action="fire-bolt"]').click();
  await page.mouse.move(target.x - 30, target.y - 30);
  await page.mouse.move(target.x, target.y);
  await page.waitForFunction(() =>
    /Probabilità di colpire: 60%/.test(document.querySelector("#combat-detail")?.innerText ?? ""),
  );
  chip = await page.locator("[data-knowledge-target-chip]").evaluate((n) => n.textContent);
  check(/Probabilità di colpire: 60%/.test(chip), "Chip % : " + chip);
  await shot("b46-09-hit-chance-policy-always-it-1440.png");
  await page.keyboard.press("Escape");
  passed.push(
    "4b/6. DM drags Sentinella between Livia and Esploratore; player: «Dardo di fuoco», hover Esploratore → the attack detail lists «CA del bersaglio +2: Mezza copertura · SRD 5.2.1 p. 16» (IT page) and the BG3 chip under the target «Mezza copertura · CA +2», no % (policy «Mai»); the DM sets «Probabilità di colpire mostrata ai giocatori: Sempre» in Preferences → detail and chip show «Probabilità di colpire: 60%» (+5 vs AC 12 + 2)",
  );

  // ------------------------------------------------------------ 5. Line of sight private/public
  await page.locator('[data-tool-group="measure"]').click();
  await page.locator('[data-tool="knowledge-los"]').click();
  await drag(await centre("livia"), await centre("goblin-2"));
  await page.locator("[data-knowledge-los]").waitFor();
  check(
    (await page.locator("[data-knowledge-los]").getAttribute("data-knowledge-los")) === "half",
    "LOS result",
  );
  check(
    await page.locator('[data-knowledge-rays="half"] [data-ray="partial"]').count(),
    "No yellow lines",
  );
  text = await page.locator("[data-knowledge-los]").innerText();
  check(/Livia → Figura incappucciata: Mezza copertura/.test(text), "LOS endpoints: " + text);
  check(/9 linee: 9 attraverso creature/.test(text), "LOS line counts: " + text);
  await shot("b46-10-los-private-player-it-1440.png", page.locator("[data-knowledge-los]"));
  await role("dm");
  check(!(await page.locator("[data-knowledge-los]").count()), "A private check reached the DM");
  await role("player");
  await page
    .locator('[data-tool-group="measure"]')
    .click()
    .catch(() => {});
  await page.locator('[data-tool="knowledge-los"]').click();
  await drag(await centre("livia"), await centre("goblin-2"));
  await page.locator("[data-knowledge-los-share]").click();
  await waitStored((s) => s.ext.knowledge.shared["old-watch"]?.length === 1);
  await role("dm");
  await creatureTab();
  check(/Linee di vista condivise/.test(await panelText()), "Shared check not listed for the DM");
  check(await page.locator(".knowledge-rays.is-shared").count(), "Shared lines not drawn");
  await shot("b46-11-los-public-dm-it-1440.png", page.locator("[data-knowledge-shared]"));
  await page.locator("[data-knowledge-unshare]").click();
  await waitStored((s) => s.ext.knowledge.shared["old-watch"].length === 0);
  passed.push(
    "5. Player: Measure › «Linea di vista», drag Livia → the hooded Esploratore: Peekaboo lines, «Livia → Figura incappucciata: Mezza copertura», «9 linee: 9 attraverso creature» (yellow through Sentinella), private: the DM sees nothing; again and «Mostra a tutti» → the DM's Creature tab lists it and the map draws it; the DM removes it",
  );

  // ------------------------------------------------------------ 7. Pickpocket
  await role("player");
  // Back to Move: the Select group of the left toolbar.
  await page.locator('[data-tool-group="select"]').click();
  if ((await page.locator('.map-tool[data-tool="move"]').getAttribute("aria-pressed")) !== "true")
    await page.locator('.map-tool[data-tool="move"]').click();
  await page.locator('.map-tool[data-tool="move"][aria-pressed="true"]').waitFor();
  // North of Sentinella, around the courtyard's hidden pressure plate (B41 region).
  await drag(await centre("livia"), await scenePoint(500, 310));
  await waitStored((s) => {
    const t = s.scenes.find((x) => x.id === "old-watch").tokens.find((x) => x.actorId === "livia");
    return Math.abs(t.x - 500) < 20 && Math.abs(t.y - 310) < 20;
  });
  await openMenu("goblin-1");
  await menuItem("Borseggia…");
  await dialog().locator('[name="wish"]').fill("la chiave");
  await submit();
  await waitStored((s) => s.ext.knowledge.pickpocket.at(-1)?.status === "asked");
  await role("dm");
  const bell = page.locator('.service-nav [data-service="requests"]');
  await bell.click();
  await page.locator("#dialog [data-notifications-centre]").waitFor();
  const row = page
    .locator("#dialog .notifications-item")
    .filter({ hasText: "Livia vuole borseggiare Sentinella" });
  check(await row.count(), "DM bell has no pickpocket request");
  await closeDialog();
  await creatureTab();
  await page.locator("[data-knowledge-decide]").click();
  await dialog().locator('[name="dc"]').fill("11");
  await dialog().locator('[name="lootName"]').fill("Chiave di ottone della torre");
  await submit();
  await waitStored((s) => s.ext.knowledge.pickpocket.at(-1).status === "ready");
  await role("player");
  await select("livia");
  await creatureTab();
  check(!/CD 11/.test(await panelText()), "The player reads the DM's DC");
  await page.locator("[data-knowledge-pickroll]").click();
  await rollIn([10]);
  await waitStored((s) =>
    s.actors.livia.inventory.some((row) => row.name === "Chiave di ottone della torre"),
  );
  await page.locator('[data-table="inventory"]').click();
  await page.waitForFunction(() => /Chiave di ottone della torre/.test(document.body.innerText));
  await page.waitForTimeout(400);
  await dismissTips();
  // The sheet's Inventory tab lists the key (the toast also names it: read the page itself).
  const keyRow = page.locator("#content").getByText("Chiave di ottone della torre").first();
  await keyRow.waitFor();
  await shot("b46-12-pickpocket-inventory-player-it-1440.png", keyRow);
  // Refreshed by the hand-off writer (29/09/2026): P2 PG-20 opens the Table's «Inventario» as
  // a sheet drawer over the map (Foundry sheet window); it is closed, not left open over it.
  if (await page.locator("[data-sheet-overlay-close]").count())
    await page
      .getByRole("button", { name: "Chiudi la scheda e torna alla mappa", exact: true })
      .click();
  else await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  await dismissTips();
  await role("dm");
  await creatureTab();
  await page.locator("[data-knowledge-revert]").click();
  await dialog().locator("[data-knowledge-reason]").fill("Era un'illusione");
  await submit();
  await waitStored(
    (s) =>
      !s.actors.livia.inventory.some((row) => row.name === "Chiave di ottone della torre") &&
      s.ext.knowledge.pickpocket.at(-1).status === "reverted",
  );
  passed.push(
    "7. Player drags Livia next to Sentinella › token menu «Borseggia…» «la chiave»; the DM's bell lists the request; Creature tab «Decidi…» DC 11, «Chiave di ottone della torre»; the player never reads the DC, «Tira Rapidità di Mano…» physical 10 + 2 = 12 → the key appears in Livia's inventory (sheet); the DM's «Annulla con motivo…» «Era un'illusione» puts it back",
  );

  // ------------------------------------------------------------ 2b. Reveal
  await openMenu("goblin-2");
  await menuItem("Rivela identità");
  await waitStored((s) => s.actors["goblin-2"].name === "Esploratore");
  await role("player");
  await openTablePanel(page, "log"); // B62: Chat › Registro
  check(
    /Esploratore/.test(await page.locator("#table-sidebar-panel").innerText()),
    "After the reveal the chat speaker is the true name",
  );
  passed.push(
    "2b. DM token menu «Rivela identità»: the player's chat and log read «Esploratore» again",
  );
  check(await noOverflow(), "Desktop overflow");

  // ------------------------------------------------------------ Group 2: EN phone 390, touch
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
  await phone.locator("#battle-map").waitFor();
  await dismissTips(phone);
  await phone.locator('.service-nav [data-service="preferences"]').click();
  await phone.locator('#dialog [name="lang"]').selectOption("en");
  await phone.locator('#dialog button[type="submit"]').click();
  await dismissTips(phone);
  await role("player", phone);
  const cdp = await phoneContext.newCDPSession(phone);
  const longPress = async (selector) => {
    const node = phone.locator(selector);
    await node.scrollIntoViewIfNeeded();
    const b = await node.boundingBox();
    const x = b.x + b.width / 2,
      y = b.y + b.height / 2;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await phone.waitForTimeout(750);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await phone.waitForTimeout(250);
  };
  await longPress('#battle-map [data-actor="goblin-1"]');
  await menu(phone).waitFor({ state: "visible" });
  await menu(phone).getByRole("menuitem", { name: "Examine" }).tap();
  await dialog(phone).waitFor();
  text = await dialog(phone).innerText();
  check(/Party knowledge: 1\/4/.test(text) && /Goblin Warrior/.test(text), "EN Examine: " + text);
  check(/To discover: AC, typical hit points/.test(text), "EN locked tier");
  check(await noOverflow(phone), "Phone overflow with the Examine window");
  await phone.screenshot({ path: dir + "b46-13-examine-phone-en-390.png" });
  await dialog(phone).locator("[data-knowledge-exam-study]").tap();
  await dialog(phone).locator('[name="diceMode"]').selectOption("physical");
  await dialog(phone).locator('[name="face0"]').fill("11");
  await dialog(phone).locator('button[type="submit"]').tap();
  await waitStored(
    (s) => s.ext.knowledge.campaigns.lanterns.kinds["srd2024:creature:goblin-warrior"].level === 2,
    null,
    phone,
  );
  await phone.locator('#battle-map [data-actor="livia"]').tap();
  const phoneTab = phone.locator('[data-table-tab="creature"]').first();
  if ((await phoneTab.getAttribute("aria-selected")) !== "true") await phoneTab.tap();
  await phone.locator("[data-knowledge-stealth]").scrollIntoViewIfNeeded();
  text = await phone.locator("[data-knowledge-panel]").innerText();
  check(/Visible · Bright light · not obscured/.test(text), "EN stealth status: " + text);
  check(/You need a Heavily Obscured area/.test(text), "EN hide reasons");
  check(
    (await phone.locator('[data-knowledge-hide="livia"]').getAttribute("disabled")) !== null,
    "Hide must be disabled with its reasons in the open courtyard",
  );
  const small = await phone.locator("[data-knowledge-panel] button").evaluateAll(
    (nodes) =>
      nodes
        .filter((n) => n.offsetParent)
        .map((n) => n.getBoundingClientRect())
        .filter((r) => r.height < 39.5).length,
  );
  check(small === 0, `${small} knowledge buttons under 40 px on the phone`);
  check(await noOverflow(phone), "Phone overflow with the Creature tab");
  await phone.screenshot({ path: dir + "b46-14-stealth-phone-en-390.png" });
  await phone.reload();
  await phone.locator("#battle-map").waitFor();
  check(
    (await stored(phone)).ext.knowledge.campaigns.lanterns.kinds["srd2024:creature:goblin-warrior"]
      .level === 2,
    "Phone reload lost the level",
  );
  passed.push(
    "Phone EN 390 (touch, isolated context): long-press Sentinella › «Examine»: «Party knowledge: 1/4», «Goblin Warrior», «To discover: AC, typical hit points…», no overflow; «Study (Arcana)…» physical 11 → 2/4, kept after reload; tap Livia › Creature tab: «Visible · Bright light · not obscured», the Heavily Obscured reason, «Hide…» disabled, every knowledge button ≥ 40 px, no overflow",
  );
  await phoneContext.close();
  await context.close();
  check(!errors.length, "Page errors: " + errors.join(" | "));
  return { passed, errors };
};
