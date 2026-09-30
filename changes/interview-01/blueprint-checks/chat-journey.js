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
  // B17: Table chat, messages and archive. Real clicks, keys and touch in an isolated
  // context: IT desktop 1440 (player and DM), EN phone 390 with touch. Resets this
  // browser's synthetic demo state; screenshots go to the B17 evidence directory.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B17/";
  const context = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const button = (name) => page.getByRole("button", { name, exact: true });
  const panel = page.locator("[data-chat-panel]");
  const text = page.locator("[data-chat-panel] [data-chat-text]");
  const stream = page.locator("[data-chat-panel] [data-chat-stream]");
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const messages = async () => (await stored()).ext.chat.messages;
  const pageText = () => page.evaluate(() => document.body.innerText);
  const role = async (value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForFunction((v) => document.querySelector("#demo-role")?.value === v, value);
  };
  const toTable = async () => {
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
  };
  const openLog = async () => {
    if (!(await panel.count())) await toggleLog(page);
    await panel.waitFor();
  };
  const send = async (value) => {
    await text.fill(value);
    await text.press("Enter");
    await stream.locator(".chat-item").last().waitFor();
  };
  const item = (fragment) => stream.locator(".chat-item", { hasText: fragment });
  const mode = (name) => panel.locator("label.chat-mode", { hasText: name }).click();
  const menu = async (fragment, action) => {
    await item(fragment).locator("summary").click();
    await item(fragment).getByRole("button", { name: action }).click();
  };
  const shot = (name) => page.screenshot({ path: dir + name });
  // Captures what the export writes (the click still downloads a real file).
  await context.addInitScript(() => {
    window.__chatBlobs = [];
    const original = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      blob.text().then((value) => window.__chatBlobs.push(value));
      return original(blob);
    };
  });

  // 1. Player: in character, out of character, action; rolls from the log as cards.
  await toTable();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("#battle-map").waitFor();
  // B61: the Registro tab (the chat's own close button also carries data-table="log").
  // B62: the log is the first sub-tab of the sidebar's «Chat» tab (Foundry's chat tab), which
  // carries the unread badge; the core's data-table="log" toggle is a hidden handle.
  const registro = page.locator('.table-tabs [data-table-section="chat"]');
  check(
    (await registro.getAttribute("aria-expanded")) === "false",
    "Registro not marked collapsed",
  );
  await registro.click();
  await panel.waitFor();
  check(
    await page.evaluate(() => document.activeElement?.matches("[data-chat-text]")),
    "Opening the log does not focus the composer",
  );
  // B61: the log is a tab of the Table's right sidebar; the chat fills that column beside
  // the map (Foundry chat tab), with the map uncovered to its left. Visual pass 2
  // (30/09/2026): the sidebar is 340 px up to 1599 px (DESIGN §4, Foundry v13), so the chat
  // is the column's 340 px less its 1 px edge (was ≥ 360 against the older, wider column).
  const dock = await page.evaluate(() => ({
    map: document.querySelector(".table-stage").getBoundingClientRect().right,
    panel: document.querySelector("[data-chat-panel]").getBoundingClientRect().left,
    width: document.querySelector("[data-chat-panel]").getBoundingClientRect().width,
    mapWidth: document.querySelector(".table-stage").getBoundingClientRect().width,
  }));
  check(
    Math.abs(dock.map - dock.panel) < 3 && dock.width >= 338 && dock.mapWidth >= 600,
    "Chat is not docked beside the Table: " + JSON.stringify(dock),
  );
  await send("Qualcuno ha riacceso la lanterna. Restiamo uniti.");
  check(
    await item("Qualcuno ha riacceso").evaluate(
      (li) => li.classList.contains("chat-kind-ic") && li.innerText.includes("Livia"),
    ),
    "IC message not shown as Livia in character",
  );
  await mode("Fuori personaggio");
  await send("Pausa di cinque minuti?");
  check(
    (await item("Pausa di cinque minuti?").innerText()).includes("fuori personaggio"),
    "OOC message not tagged",
  );
  check(
    await item("Pausa di cinque minuti?").evaluate(
      (li) => li.classList.contains("chat-kind-ooc") && li.innerText.includes("Giocatore"),
    ),
    "OOC does not speak as the player",
  );
  await send("/em si avvicina al portone.");
  check(
    (await item("si avvicina al portone").innerText()).includes("Livia si avvicina al portone."),
    "Emote not rendered as an action",
  );
  await mode("Dialogo");
  // A physical and a digital roll through the Table's existing roll service.
  // W2b1 integration: with B34 built «Tira i dadi» opens the Dadi tab of the sidebar (DDB-151);
  // the same rolls are made there and the Registro tab is reopened to read their cards. The
  // one-die «Tiro libero» dialog stays the fallback.
  const trayRoll = async (formula, mode, face) => {
    await button("Tira i dadi").click();
    await page.locator("[data-dtray-formula], #dialog [name=sides]").first().waitFor();
    if (!(await page.locator("[data-dtray-formula]").count())) return false;
    await page.locator("[data-dtray-formula]").fill(formula);
    await page.locator("[data-dtray-formula]").press("Tab");
    await page.locator(`label.dtray-seg:has([data-dtray-mode][value="${mode}"])`).click();
    if (face) await page.locator('[data-dtray-face="0"]').fill(face);
    await page.locator("[data-dtray-roll-button]").click();
    await openLog();
    return true;
  };
  const usedTray = await trayRoll("1d20+5", "physical", "14");
  if (!usedTray) {
    await page.locator("#dialog [name=modifier]").fill("5");
    await page.locator("#dialog [name=mode]").selectOption("physical");
    await page.locator("#dialog [name=natural]").fill("14");
    await button("Registra tiro").click();
  }
  await stream.locator(".chat-roll-card", { hasText: "Dado fisico" }).waitFor();
  const physical = await stream
    .locator(".chat-roll-card", { hasText: "Dado fisico" })
    .last()
    .innerText();
  check(
    physical.includes("19") && physical.includes("1d20 [14] + 5"),
    "Physical roll card wrong: " + physical,
  );
  if (!(await trayRoll("1d8", "digital"))) {
    await page.locator("#dialog [name=sides]").selectOption("8");
    await button("Registra tiro").click();
  }
  await stream.locator(".chat-roll-card", { hasText: "Dado digitale" }).waitFor();
  // W2b1 integration: the tray's physical/digital switch is a personal setting (B34) and logs
  // a private «Impostazione aggiornata: Dadi per i tiri sul posto» line, an event for its
  // author only; those lines are left out of the order check.
  const order = await stream.locator(".chat-item").evaluateAll((els) =>
    els
      .filter(
        (el) => !(el.dataset.chatType === "events" && /Impostazione aggiornata/.test(el.innerText)),
      )
      .slice(-5)
      .map((el) => el.dataset.chatType),
  );
  check(
    order.join(",") === "messages,messages,messages,rolls,rolls",
    "Messages and rolls not interleaved in time order: " + order,
  );
  let saved = await messages();
  check(
    ["ic", "ooc", "emote"].every((kind) =>
      saved.some((m) => m.kind === kind && m.author === "player"),
    ),
    "Kinds not stored distinctly",
  );
  // Gameplay Undo corrects the last roll; the chat is untouched and shows the correction.
  // W2b1 integration: a tray roll (B34) is withdrawn from the tray's own list («Ritira»), never
  // by the gameplay Undo (a roll stays in the log, as in Roll20 and Foundry); the Undo is then
  // shown on a gameplay change made after the rolls, one step of Livia on the map.
  if (usedTray) {
    await page.locator("#battle-map").focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
  }
  const before = saved.length;
  await button("Annulla ultima modifica").click();
  await stream.locator(".chat-event", { hasText: "Correzione" }).waitFor();
  check((await messages()).length === before, "Gameplay Undo removed a chat message");
  await shot("b17-01-kinds-rolls-1440.png");
  passed.push(
    "Player IT 1440: IC, OOC and /em stored and shown distinctly beside physical/digital roll cards; Undo leaves the chat and appears as a correction",
  );

  // 2. Whispers: to Doran (the DM controls him) and to Mira (the DM is not included).
  await panel.locator("[data-chat-to]").selectOption("actor:doran");
  await send("Copri la porta, entro io.");
  const whisper = await item("Copri la porta").innerText();
  check(
    // Final review P3: readers are named by the characters they play (CA-57, Owlbear).
    whisper.includes("Sussurro a Doran") &&
      whisper.includes("leggono: Livia, Mira · Giocatore; DM"),
    "Whisper line wrong: " + whisper,
  );
  await panel.locator("[data-chat-to]").selectOption("all");
  await send("/w Mira Passami la corda di nascosto.");
  check(
    (await item("Passami la corda").innerText()).includes("leggono: Livia, Mira · Giocatore"),
    "Whisper to Mira readers wrong",
  );
  saved = await messages();
  check(
    JSON.stringify(saved.at(-1).readers) === '["player"]' &&
      JSON.stringify(saved.at(-2).readers) === '["player","dm"]',
    "Stored readers wrong",
  );
  await page.reload();
  await page.locator("#battle-map").waitFor();
  await openLog();
  check(
    (await item("Copri la porta").count()) && (await item("Passami la corda").count()),
    "Whispers lost after reload",
  );
  passed.push(
    "Whispers: panel select and /w; readers recorded (Doran → player+DM, Mira → player only); persisted after reload",
  );

  // 3. DM: log closed → badge and notices for the player's messages and rolls.
  await role("dm");
  await page.locator("#battle-map").waitFor();
  check(!(await panel.count()), "The log stayed open across the role change");
  const badge = page.locator('.table-tabs [data-table-section="chat"] .table-log-badge');
  await badge.waitFor();
  check(
    (await badge.innerText()) === "6",
    "Badge should count 4 messages + 2 rolls, got " + (await badge.innerText()),
  );
  check(
    (await registro.getAttribute("aria-describedby")) === "table-log-unread",
    "Badge count not exposed to assistive tech",
  );
  // B61: Registro is an icon tab of the Table's sidebar, named by aria-label; the badge
  // never changes that name.
  check(
    (await registro.getAttribute("aria-label")) === "Chat" &&
      (await page.getByRole("tab", { name: "Chat", exact: true }).count()) === 1,
    "Chat tab accessible name changed",
  );
  const toasts = page.locator(".chat-toast");
  await toasts.first().waitFor();
  const noticeText = await page.locator(".chat-toasts").innerText();
  check(
    (await toasts.count()) === 3 &&
      noticeText.includes("4 altre novità") &&
      noticeText.includes("Livia"),
    "Notices wrong: " + noticeText,
  );
  await page.waitForTimeout(300); // let the notices finish their short entrance
  await shot("b17-02-dm-badge-notices-1440.png");
  check(
    !(await pageText()).includes("Passami la corda"),
    "Whisper to Mira leaked to the DM (notices/page)",
  );
  await toasts.first().getByRole("button", { name: "Apri il registro" }).click();
  await panel.waitFor();
  check(
    !(await badge.count()) && !(await toasts.count()),
    "Badge or notices remain after opening the log",
  );
  check((await item("Copri la porta").count()) === 1, "DM does not read the whisper to Doran");
  check(
    !(await page.content()).includes("Passami la corda"),
    "Whisper to Mira present in the DM markup",
  );
  passed.push(
    'DM: closed log shows badge 6 (name stays "Registro") and DDB-style notices without the Mira whisper; "Apri il registro" opens and clears them',
  );

  // 4. DM narrates, speaks as "Guardia" in Elvish, whispers to Doran, deletes and hides.
  await send("La nebbia sale dal fossato. Una voce chiama dalla torre.");
  check(
    await item("La nebbia sale").evaluate(
      // Final review F26: labels are small caps (DESIGN §2), the text stays «Narrazione».
      (li) => li.classList.contains("chat-kind-desc") && /narrazione/i.test(li.innerText),
    ),
    "Narration not rendered as narration",
  );
  await mode("Dialogo");
  await panel.locator("[data-chat-speaker]").selectOption("npc");
  await panel.locator("[data-chat-npc]").fill("Guardia");
  await panel.locator("[data-chat-language]").selectOption("elvish");
  await send("Fermi! Chi vi manda alla torre?");
  const guard = await item("Chi vi manda alla torre").innerText();
  check(
    guard.includes("Guardia") &&
      guard.includes("Elfico") &&
      guard.includes("PNG") &&
      guard.includes("Capiscono: Livia"),
    "NPC speech wrong: " + guard,
  );
  await mode("Narrazione");
  await panel.locator("[data-chat-to]").selectOption("actor:doran");
  await send("Doran, senti odore di zolfo dietro il portone.");
  await panel.locator("[data-chat-to]").selectOption("all");
  // Theatre!-style audible range: the sentinel's whisper reaches no character, its shout
  // reaches the party (tokens 10–15 m away).
  await mode("Dialogo");
  await panel.locator("[data-chat-speaker]").selectOption("actor:goblin-1");
  await panel.locator("[data-chat-range]").selectOption("whisper");
  await send("Svegliati, arrivano.");
  check(
    (await item("Svegliati, arrivano").innerText()).includes("sentono: nessun personaggio"),
    "Range whisper audience wrong",
  );
  await panel.locator("[data-chat-range]").selectOption("shout");
  await send("Intrusi al portone!");
  const heard = await item("Intrusi al portone").innerText();
  check(
    heard.includes("Udibile entro 30 m") && heard.includes("Livia") && heard.includes("Mira"),
    "Shout audience wrong: " + heard,
  );
  await panel.locator("[data-chat-range]").selectOption("all");
  await menu("Pausa di cinque minuti?", "Elimina…");
  await page.locator("#dialog [name=reason]").fill("fuori tema");
  await page.locator("#dialog").getByRole("button", { name: "Elimina", exact: true }).click();
  await stream.locator(".chat-removed", { hasText: "Motivo: fuori tema" }).waitFor();
  check(
    (await stream.locator(".chat-removed").last().innerText()).includes(
      "Messaggio eliminato da DM",
    ),
    "Deletion trace wrong",
  );
  check(
    !(await page.content()).includes("Pausa di cinque minuti?"),
    "Deleted text still in the markup",
  );
  check((await messages()).find((m) => m.removed)?.text === "", "Deleted content still stored");
  await menu("La nebbia sale", "Nascondi ai giocatori");
  await item("La nebbia sale").locator(".chat-hidden-line").waitFor();
  await panel.getByRole("button", { name: "Voto", exact: true }).click();
  await page.locator("#dialog [name=question]").fill("Entriamo nella cripta stanotte?");
  await button("Apri il voto").click();
  await item("Entriamo nella cripta").getByRole("button", { name: "Sì · 0" }).click();
  await item("Entriamo nella cripta").getByRole("button", { name: "Sì · 1" }).waitFor();
  await shot("b17-03-dm-narration-guard-vote-1440.png");
  passed.push(
    'DM: narration, "Guardia" in Elvish (PNG, readers listed), whisper to Doran, Sentinella heard within 1.5 m (no one) and 30 m (party), delete with reason leaves a trace (content gone), hide, yes/no vote opened and cast',
  );

  // 5. Player: privacy, languages per character, vote, share card, pasted image, snapshot.
  await role("player");
  await page.locator("#battle-map").waitFor();
  // B61: each identity finds its last sidebar tab again. The player left Registro open in
  // step 2, so the DM's new messages show in it at once; a closed Registro shows the badge.
  if ((await registro.getAttribute("aria-expanded")) !== "true") await badge.waitFor();
  await openLog();
  const playerMarkup = await page.content();
  check(!playerMarkup.includes("zolfo"), "DM → Doran whisper reached the player");
  check(!playerMarkup.includes("La nebbia sale"), "Hidden narration visible to the player");
  check(
    !playerMarkup.includes("Svegliati, arrivano") && playerMarkup.includes("Intrusi al portone!"),
    "Audible range not applied to the player",
  );
  check(
    (await item("Chi vi manda alla torre").innerText()).includes("Elfico"),
    "Livia (Elvish) cannot read the guard",
  );
  check(
    (await stream.locator(".chat-removed", { hasText: "Motivo: fuori tema" }).count()) === 1,
    "Player does not see the removal trace",
  );
  await item("Entriamo nella cripta").getByRole("button", { name: "Sì · 1" }).click();
  await item("Entriamo nella cripta").getByRole("button", { name: "Sì · 2" }).waitFor();
  await panel.locator("[data-chat-speaker]").selectOption("actor:mira");
  await panel
    .locator(".chat-hint", { hasText: "Mira capisce: Comune, Gnomesco, Halfling" })
    .waitFor();
  check(
    !(await panel.innerHTML()).includes("Chi vi manda alla torre") &&
      !(await page.locator(".chat-toast").count()),
    "Mira reads Elvish",
  );
  const scrambled = stream.locator(".chat-item", {
    hasText: "Mira non conosce questa lingua: Elfico",
  });
  check(
    (await scrambled.count()) === 1 && (await scrambled.locator(".chat-scrambled").count()) === 1,
    "Scrambled Elvish missing for Mira",
  );
  await scrambled.scrollIntoViewIfNeeded();
  await shot("b17-04-player-mira-scrambled-1440.png");
  await panel.locator("[data-chat-speaker]").selectOption("actor:livia");
  await send("/mood preoccupata Sentite anche voi questo rumore?");
  check(
    (await item("Sentite anche voi").innerText()).includes("(preoccupata)"),
    "/mood not shown with the speaker",
  );
  await panel.getByRole("button", { name: "Condividi", exact: true }).click();
  await page.locator("#dialog").getByText("Mani brucianti").click();
  await page.locator("#dialog [name=comment]").fill("Attenti al cono");
  await page.locator("#dialog").getByRole("button", { name: "Condividi", exact: true }).click();
  await stream.locator(".chat-card", { hasText: "Mani brucianti" }).click();
  await page.locator("#dialog").getByRole("heading", { name: "Mani brucianti" }).waitFor();
  const detail = await page.locator("#dialog").innerText();
  check(
    detail.includes("SRD 5.2.1") &&
      detail.includes("EN p. 114 · IT p. 163") &&
      detail.includes("3d6 fuoco") &&
      detail.includes("Incantesimo di 1º livello"),
    "Card detail incomplete: " + detail.slice(0, 300),
  );
  await shot("b17-05-card-detail-1440.png");
  await page.locator("#dialog footer").getByRole("button", { name: "Chiudi" }).click();
  // Chat Images: an image pasted into the field (clipboard event with a real PNG file).
  await text.click();
  await page.evaluate(async () => {
    const canvas = Object.assign(document.createElement("canvas"), { width: 80, height: 48 });
    const g = canvas.getContext("2d");
    g.fillStyle = "#7a5a2e";
    g.fillRect(0, 0, 80, 48);
    g.fillStyle = "#f4e4bf";
    g.fillRect(28, 8, 24, 32);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const data = new DataTransfer();
    data.items.add(new File([blob], "simbolo.png", { type: "image/png" }));
    document
      .querySelector("[data-chat-text]")
      .dispatchEvent(
        new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }),
      );
  });
  await panel.locator(".chat-attachment", { hasText: "simbolo.png" }).waitFor();
  await send("Il simbolo sul portone");
  await item("Il simbolo sul portone").locator("img").waitFor();
  await item("Il simbolo sul portone").locator("button.chat-image").click();
  await page.locator("#dialog img.chat-image-full").waitFor();
  await page.locator("#dialog footer").getByRole("button", { name: "Chiudi" }).click();
  check(
    /^data:image\/png;base64,/.test((await messages()).at(-1).image?.src ?? ""),
    "Pasted image not stored",
  );
  // BG3 photo mode as a recap snapshot.
  await panel.getByRole("button", { name: "Istantanea", exact: true }).click();
  await page.locator("#dialog img.chat-snapshot-preview").waitFor();
  await page.locator("#dialog [name=caption]").fill("Prima di entrare");
  await button("Condividi l’istantanea").click();
  await stream.locator(".chat-photo", { hasText: "Prima di entrare" }).waitFor();
  // Author retraction as a correction with a trace.
  await menu("Qualcuno ha riacceso", "Ritira il messaggio…");
  await page.locator("#dialog").getByRole("button", { name: "Elimina", exact: true }).click();
  await stream.locator(".chat-removed", { hasText: "Messaggio ritirato da Giocatore" }).waitFor();
  passed.push(
    "Player: DM whisper, out-of-range and hidden lines absent; Livia reads Elvish, Mira sees scrambled text; /mood shown; vote 2–0; Burning Hands card opens SRD 5.2.1 details; pasted PNG shown and enlarged; snapshot shared; own retraction leaves a trace",
  );

  // 6. DM closes the vote and restores the narration; the player sees both.
  await role("dm");
  await page.locator("#battle-map").waitFor();
  await openLog();
  await item("Entriamo nella cripta")
    .getByRole("button", { name: "Chiudi il voto e mostra l’esito" })
    .click();
  await item("Entriamo nella cripta")
    .locator(".chat-vote-outcome", { hasText: "Esito: Sì (2–0)" })
    .waitFor();
  await menu("La nebbia sale", "Mostra ai giocatori");
  await role("player");
  await page.locator("#battle-map").waitFor();
  await openLog();
  await item("La nebbia sale").waitFor();
  check(
    (await item("Entriamo nella cripta").innerText()).includes("Esito: Sì (2–0)"),
    "Player does not see the vote outcome",
  );
  passed.push(
    'Vote closed by the DM with outcome Sì (2–0); "Mostra ai giocatori" restores the hidden narration',
  );

  // 7. Offline: nothing is sent, the draft stays; online again it is sent.
  const setOffline = async (value) => {
    await page.locator("[data-service=preferences]").click();
    const box = page.locator("#dialog [name=offline]");
    if (value) await box.check();
    else await box.uncheck();
    await button("Salva preferenze").click();
  };
  await setOffline(true);
  await openLog();
  await text.fill("Aspettate, arrivo dal cortile.");
  await text.press("Enter");
  await panel.locator("[data-chat-error]", { hasText: "senza rete" }).waitFor();
  check(
    (await text.inputValue()) === "Aspettate, arrivo dal cortile.",
    "Offline send lost the draft",
  );
  check(
    !(await messages()).some((m) => m.text.includes("Aspettate, arrivo")),
    "Offline message stored",
  );
  await setOffline(false);
  await openLog();
  check(
    (await text.inputValue()) === "Aspettate, arrivo dal cortile.",
    "Draft lost after reconnecting",
  );
  await text.press("Enter");
  await item("Aspettate, arrivo dal cortile").waitFor();
  passed.push(
    "Offline: send refused with the reason, draft kept; after reconnecting the same draft is sent",
  );

  // 8. Keyboard: ↑ recalls, Escape closes and returns focus to Registro.
  await text.focus();
  await text.press("ArrowUp");
  check(
    (await text.inputValue()) === "Aspettate, arrivo dal cortile.",
    "↑ does not recall the last sent message",
  );
  await text.fill("");
  await text.press("Escape");
  await panel.waitFor({ state: "detached" });
  check(
    await page.evaluate(() => document.activeElement?.matches('[data-table-section="chat"]')),
    "Focus not returned to the Chat tab (Registro)",
  );
  passed.push(
    "Keyboard: ↑ recalls sent text; Escape closes the docked log and returns focus to Registro",
  );

  // 9. Archive between sessions: days, Hide whispers, export; search respects privacy.
  await openLog();
  await panel.getByRole("button", { name: "Archivio", exact: true }).click();
  await page.getByRole("heading", { name: "Archivio della chat", level: 1 }).waitFor();
  check(
    !(await page.content()).includes("zolfo") && !(await page.content()).includes("Svegliati"),
    "The archive shows the player a message they cannot read",
  );
  const days = await page.locator(".chat-archive-day h2").allInnerTexts();
  // Review fix: revealed handouts are cards too, so the seeded "Avviso della gilda" (shown
  // on 10 September) can open the archive before the 17 September session.
  check(
    days.length >= 2 && days.some((day) => day.includes("17 settembre 2026")),
    "Archive not grouped across sessions: " + days,
  );
  await button("Nascondi sussurri").click();
  check(
    (await page.locator('.chat-archive-list [data-chat-type="whispers"]:visible').count()) === 0,
    "Whispers still visible with Hide whispers",
  );
  const exportWait = page.waitForEvent("download");
  await button("Esporta (.txt)").click();
  const download = await exportWait;
  await download.saveAs(dir + "b17-export-player-no-whispers.txt");
  await button("Nascondi sussurri").click();
  await button("Esporta (.txt)").click();
  const exports = () =>
    page.evaluate(() => window.__chatBlobs.filter((b) => b.startsWith("d20 Studio — ")));
  await page.waitForFunction(
    () => window.__chatBlobs.filter((b) => b.startsWith("d20 Studio — ")).length >= 2,
  );
  const noWhispers = (await exports()).find((b) => b.includes("sussurri esclusi"));
  const withWhispers = (await exports()).find((b) => b.includes("sussurri inclusi"));
  check(
    !noWhispers.includes("Copri la porta") && noWhispers.includes("Chi vi manda alla torre"),
    "Export without whispers wrong",
  );
  check(
    withWhispers.includes("Copri la porta") &&
      withWhispers.includes("Passami la corda") &&
      !withWhispers.includes("zolfo"),
    "Player export privacy wrong",
  );
  const allItems = await page.locator(".chat-archive-list .chat-item:visible").count();
  await page.locator("[data-chat-archive-q]").fill("lanterna");
  const found = await page.locator(".chat-archive-list .chat-item:visible").allInnerTexts();
  check(
    found.length >= 1 &&
      found.length < allItems &&
      found.every((t) => t.toLowerCase().includes("lanterna")),
    "Archive search wrong: " + found.length + "/" + allItems,
  );
  await page.locator("[data-chat-archive-q]").fill("");
  await shot("b17-06-archive-1440.png");
  await page.locator("[data-service=search]").click();
  await page.locator("#dialog [name=query]").fill("zolfo");
  await page.waitForTimeout(250);
  check(
    !(await page.locator("#dialog").innerText()).includes("zolfo"),
    "Search leaked the DM whisper",
  );
  await page.locator("#dialog [name=query]").fill("portone");
  await page.locator("#dialog .search-result", { hasText: "portone" }).first().click();
  await page.locator(".chat-highlight").waitFor();
  passed.push(
    "Archive: days 17/09 and today, Hide whispers, real .txt download and privacy-correct content, search result opens the highlighted message; DM whisper never found",
  );

  // 10. Campaign discussions: new thread, reply, DM pin and sink, reload.
  await page.goto(base + "#campaign?tab=chat-forum");
  await page.getByRole("heading", { name: "Discussioni", level: 1 }).waitFor();
  check(
    (await page.locator(".chat-forum-row").first().innerText()).includes(
      "Calendario e regole del tavolo",
    ),
    "Pinned thread not first",
  );
  await button("Nuova discussione").click();
  await page.locator("#dialog [name=title]").fill("Chi scrive il resoconto?");
  await page.locator("#dialog [name=text]").fill("Stasera lo scrivo io, va bene?");
  await button("Pubblica").click();
  await page.getByRole("heading", { name: "Chi scrive il resoconto?", level: 1 }).waitFor();
  await page.locator("[data-chat-reply-text]").fill("Aggiungo l’istantanea del cortile.");
  await button("Pubblica la risposta").click();
  await page.locator(".chat-forum-post", { hasText: "Aggiungo l’istantanea" }).waitFor();
  await shot("b17-07a-forum-thread-1440.png");
  await role("dm");
  await page.goto(base + "#campaign?tab=chat-forum");
  await page.locator(".chat-forum-open", { hasText: "Chi scrive il resoconto?" }).click();
  await button("Metti in evidenza").click();
  await page.getByRole("button", { name: "Togli dall’evidenza" }).waitFor();
  await button("Tutte le discussioni").click();
  await page.locator(".chat-forum-open", { hasText: "Chi porta la corda" }).click();
  await button("Sposta in fondo").click();
  await button("Tutte le discussioni").click();
  await page.reload();
  await page.locator(".chat-forum-row").first().waitFor();
  const rows = await page.locator(".chat-forum-row").allInnerTexts();
  check(
    rows[0].includes("Chi scrive il resoconto?") &&
      rows[0].includes("In evidenza") &&
      rows.at(-1).includes("Chi porta la corda") &&
      rows.at(-1).includes("In fondo"),
    "Forum order after reload: " + rows.join(" | "),
  );
  await shot("b17-07-forum-1440.png");
  passed.push(
    "Discussions: new thread and reply as player; DM pins it and sinks another; order kept after reload",
  );

  // 11. DM export, then clearing with the typed confirmation (a reload resets the demo role).
  await page.goto(base + "#campaign?tab=chat-archive");
  await role("dm");
  await page.getByRole("heading", { name: "Archivio della chat", level: 1 }).waitFor();
  await button("Esporta (.txt)").click();
  await page.waitForFunction(() => window.__chatBlobs.some((b) => b.includes("Esportato da: DM")));
  const dmExport = (await exports()).find((b) => b.includes("Esportato da: DM"));
  check(
    dmExport.includes("zolfo") &&
      dmExport.includes("Copri la porta") &&
      !dmExport.includes("Passami la corda"),
    "DM export privacy wrong",
  );
  await button("Svuota l’archivio…").click();
  await page.locator("#dialog [name=phrase]").fill("elimina");
  await button("Svuota definitivamente").click();
  await page.locator("#dialog .dialog-error").waitFor();
  await shot("b17-08a-clear-confirmation-1440.png");
  await page
    .locator("#dialog .dialog-error", { hasText: "Scrivi esattamente «ELIMINA CHAT»" })
    .waitFor();
  await page.locator("#dialog [name=phrase]").fill("ELIMINA CHAT");
  await button("Svuota definitivamente").click();
  await page
    .locator(".chat-system", { hasText: "Il DM ha svuotato l’archivio della chat" })
    .waitFor();
  check(
    (await page.locator("[data-chat-archive-count]").innerText()) === "1 elemento",
    "Archive count wrong after clearing",
  );
  await shot("b17-08-archive-cleared-dm-1440.png");
  await page.reload();
  await page.locator(".chat-system").waitFor();
  check(
    (await page.locator(".chat-archive-list .chat-item").count()) === 1 &&
      (await messages()).length === 1,
    "Archive not cleared after reload",
  );
  passed.push(
    'DM export includes the Doran whisper but not Livia → Mira; clear refuses a wrong phrase, accepts "ELIMINA CHAT", leaves one system trace after reload',
  );

  // 12. Structured combat rolls: a real encounter start and a digital Fire Bolt appear as
  // roll cards with the action name; the DM's private creature rolls stay with the DM.
  await page.goto(base + "#table");
  await button("Ripristina esempio").click();
  await button("Ripristina").click();
  await role("dm");
  await page.locator("#battle-map").waitFor();
  await button("Avvia combattimento").click();
  // Refreshed by the hand-off writer (29/09/2026): R5 PR-32 replaced Preparation's «Incontro
  // preparato» with the Table's start dialog (Foundry roll call): who fights and each typed
  // d20; the Initiative bonus comes from the sheet.
  await page.locator("[data-ct-start-dialog]").waitFor();
  {
    const naturals = { livia: 18, "goblin-1": 12, doran: 10, "goblin-2": 8 };
    const startIds = await page
      .locator("[data-ct-start-include]")
      .evaluateAll((els) => els.map((el) => el.dataset.ctStartInclude));
    for (const id of startIds) {
      const box = page.locator('[data-ct-start-include="' + id + '"]');
      if ((await box.isChecked()) !== Object.hasOwn(naturals, id)) await box.click();
    }
    for (const [id, natural] of Object.entries(naturals)) {
      const d20 = page.locator('[data-ct-start-natural="' + id + '"]');
      await d20.fill(String(natural));
      await d20.dispatchEvent("change");
    }
  }
  await button("Inizia combattimento").click();
  await page.locator("[data-select=livia]").waitFor();
  await role("player");
  await page.locator("[data-select=livia]").click();
  await page.locator("[data-combat-action=fire-bolt]").click();
  await page.locator("[data-combat-action=fire-bolt][aria-pressed=true]").waitFor();
  await page.locator("#battle-map [data-actor=goblin-1]").click();
  await page.waitForFunction(
    (k) =>
      JSON.parse(localStorage.getItem(k)).log.some((l) =>
        (l.rolls ?? []).some((r) => r.kind === "attack" && r.actorId === "livia"),
      ),
    key,
  );
  if (await page.locator("#dialog[open]").count()) await page.keyboard.press("Escape");
  await openLog();
  const attackCard = stream.locator(".chat-roll-card", { hasText: "Dardo di fuoco · Attacco" });
  await attackCard.first().waitFor();
  const attackText = await attackCard.first().innerText();
  check(
    attackText.includes("1d20") && attackText.includes("Dado digitale"),
    "Fire Bolt attack card wrong: " + attackText,
  );
  check(
    !(await panel.innerText()).includes("Iniziativa"),
    "The DM's private initiative rolls reached the player",
  );
  await role("dm");
  await page.locator("#battle-map").waitFor();
  // B61: a Registro the DM left open shows the roll at once; a closed one shows the badge.
  if ((await registro.getAttribute("aria-expanded")) !== "true") await badge.waitFor();
  await openLog();
  await stream
    .locator(".chat-roll-card", { hasText: "Dardo di fuoco · Attacco" })
    .first()
    .waitFor();
  check(
    (await stream.locator(".chat-roll-card", { hasText: "Iniziativa" }).count()) >= 4,
    "The DM does not see the initiative cards",
  );
  await shot("b17-10-combat-roll-cards-dm-1440.png");
  passed.push(
    "Combat: prepared initiative and a digital Fire Bolt appear as roll cards (Dardo di fuoco · Attacco, 1d20, digital) for the player and for the DM (with a badge while the DM's Registro is closed); initiative cards stay with the DM",
  );

  // 13. EN phone 390 with touch: full-screen sheet, send by tap, no overflow, 40 px targets.
  const phone = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobile = await phone.newPage();
  mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
  await mobile.goto(base + "#table");
  await mobile.evaluate(() => localStorage.clear());
  await mobile.reload();
  await mobile.locator("#battle-map").waitFor();
  await mobile.locator("[data-service=preferences]").tap();
  await mobile.locator("#dialog [name=lang]").selectOption("en");
  await mobile.getByRole("button", { name: "Salva preferenze", exact: true }).tap();
  await toggleLog(mobile, true);
  const sheet = mobile.locator("[data-chat-panel]");
  await sheet.waitFor();
  const box = await sheet.boundingBox();
  check(
    box.x === 0 && Math.round(box.width) === 390,
    "Phone sheet not full width: " + JSON.stringify(box),
  );
  await sheet.getByRole("heading", { name: "Log and chat" }).waitFor();
  await sheet.locator("[data-chat-text]").tap();
  await sheet.locator("[data-chat-text]").fill("On my way to the gate.");
  await sheet.getByRole("button", { name: "Send", exact: true }).tap();
  await sheet.locator(".chat-item", { hasText: "On my way to the gate." }).waitFor();
  const layout = await mobile.evaluate(() => {
    const panel = document.querySelector("[data-chat-panel]");
    const small = [
      ...panel.querySelectorAll(
        "button, select, input:not(.chat-sr):not([type=radio]), textarea, summary, .chat-mode span",
      ),
    ]
      .filter((el) => el.offsetParent !== null)
      .map((el) => [
        el.textContent.trim().slice(0, 20) || el.getAttribute("aria-label") || el.tagName,
        Math.round(el.getBoundingClientRect().height),
      ])
      .filter(([, h]) => h < 40);
    return {
      overflow: document.documentElement.scrollWidth > 390,
      panelOverflow: panel.scrollWidth > panel.clientWidth,
      small,
    };
  });
  check(
    !layout.overflow && !layout.panelOverflow && !layout.small.length,
    "Phone layout: " + JSON.stringify(layout),
  );
  await mobile.screenshot({ path: dir + "b17-09-phone-390-en.png" });
  await sheet.getByRole("button", { name: "Close the log" }).tap();
  await sheet.waitFor({ state: "detached" });
  await phone.close();
  passed.push(
    "EN phone 390 (touch): full-width sheet, send by tap, no horizontal overflow, every control ≥ 40 px, closes by tap",
  );

  check(!errors.length, "Page errors: " + errors.join(" | "));
  await context.close();
  return { passed, count: passed.length };
};
