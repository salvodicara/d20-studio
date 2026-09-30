async (rootPage) => {
  // B24 — notification and request centre. Real clicks, keys and taps on the one app:
  // IT desktop 1440 (player and DM), EN phone 390 with touch, reload persistence, Undo
  // and corrections of read state, offline declaration, aria-live announcements.
  // Synthetic data only; each context starts from its own fresh example state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B24/";
  const browser = rootPage.context().browser();
  // The viewer is in London while the DM agrees times in Europe/Rome (review P3: the
  // notice shows the viewer's own time first, like the Sessions page).
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    timezoneId: "Europe/London",
  });
  const page = await context.newPage();
  const passed = [],
    errors = [],
    notes = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const button = (name) => page.getByRole("button", { name, exact: true });
  const role = async (r) => {
    await page.locator("#demo-role").selectOption(r);
    await page.waitForTimeout(150);
  };
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const bell = () => page.locator('.service-nav [data-service="requests"]');
  const bellCount = async () =>
    Number(((await bell().getAttribute("aria-label")) ?? "").match(/· (\d+) notific/)?.[1] ?? 0);
  const openCentre = async () => {
    await bell().click();
    await page.locator("#dialog [data-notifications-centre]").waitFor();
  };
  const closeDialog = async () => {
    if (await page.locator("#dialog[open]").count())
      await page.locator("#dialog footer [data-close]").click();
  };
  const rowOf = (text) => page.locator("#dialog .notifications-item").filter({ hasText: text });
  const field = (path) => page.locator('[data-campaign-path="' + path + '"]');
  const saveEntry = async () => {
    await page.locator("[data-campaign-save]").click();
    await page.locator("[data-campaign-apply]").click();
  };
  // A local "YYYY-MM-DDTHH:MM" in Europe/Rome, some hours from now.
  const romeIn = (hours) =>
    page.evaluate((h) => {
      const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Rome",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        })
          .formatToParts(new Date(Date.now() + h * 3600e3))
          .map((p) => [p.type, p.value]),
      );
      return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
    }, hours);
  const liveText = () =>
    page.evaluate(() => document.querySelector("body > .notifications-live")?.textContent ?? "");
  const liveTextOf = (target) =>
    target.evaluate(() => document.querySelector("body > .notifications-live")?.textContent ?? "");

  await page.goto(base + "#home");
  await page.locator(".service-nav").waitFor();
  await button("Ripristina esempio").click();
  await button("Ripristina").click();
  await page.waitForTimeout(200);

  // 1. Defaults: the bell opens the centre; our sources are empty; nothing pops up.
  const player0 = await bellCount();
  await openCentre();
  check((await page.locator("#dialog h2").innerText()) === "Notifiche e richieste", "centre title");
  check(
    (await page.locator("#dialog .notifications-pending").innerText()).includes(
      "Nessun tiro o reazione in attesa.",
    ),
    "pending requests section missing",
  );
  if (!player0) await page.screenshot({ path: dir + "centre-empty-it-1440.png" });
  await closeDialog();
  await role("dm");
  const dm0 = await bellCount();
  await role("player");
  passed.push(
    `Bell opens "Notifiche e richieste" with pending requests always shown (player baseline ${player0}, DM ${dm0} from other areas)`,
  );

  // 2. Player records concentration on Livia (for the DM's damage later).
  await page.goto(base + "#characters?id=livia&tab=spells");
  await button("Registra concentrazione").click();
  await page.locator("[name=effectName]").fill("Benedizione di prova");
  await page.locator("[name=effectSource]").fill("Correzione sintetica della sessione");
  await button("Registra").click();
  check((await saved()).actors.livia.concentration?.active, "concentration not recorded");

  // 3. DM: session, shared material with a mention, personal invitation, damage.
  await role("dm");
  await page.goto(base + "#campaign?tab=sessions");
  await page.getByRole("heading", { name: "Sessioni", exact: true, level: 1 }).waitFor();
  await page.locator('[data-campaign-new-session="direct"]').click();
  await field("data.title").fill("Partita di ottobre");
  await field("data.localTime").fill(await romeIn(30));
  await field("data.timeZone").fill("Europe/Rome");
  await saveEntry();
  await page.getByRole("heading", { name: "Sessioni", exact: true, level: 1 }).waitFor();
  let state = await saved();
  const session = state.campaign.sessions.findLast((s) => s.title === "Partita di ottobre");
  check(session, "session not scheduled");

  await page.goto(base + "#campaign?tab=world");
  await page.getByRole("heading", { name: "Mondo", exact: true, level: 1 }).waitFor();
  await page.locator('[data-campaign-new="world"]').click();
  await field("data.title").fill("Lettera del sindaco");
  await field("data.body").fill("Il sigillo spezzato è per @Livia: solo lei può aprirlo.");
  await page.locator('[data-campaign-access-mode="access"]').selectOption("campaign");
  await saveEntry();
  await page.getByRole("heading", { name: "Lettera del sindaco", exact: true, level: 1 }).waitFor();
  state = await saved();
  const letter = state.campaignContent.entries.findLast(
    (e) => e.revisions.at(-1).data.title === "Lettera del sindaco",
  );

  await page.goto(base + "#notes");
  await page.locator('[data-campaign-new="note"]').click();
  await page.locator("[data-campaign-context]").selectOption("lanterns");
  await field("data.title").fill("Mappa per Livia");
  await field("data.body").fill("Il passaggio sotto il faro.");
  await page.locator('[data-campaign-access-mode="access"]').selectOption("selected");
  await page
    .locator('[data-campaign-grant="player"][data-access-path="access"]')
    .selectOption("read");
  await saveEntry();
  await page.getByRole("heading", { name: "Mappa per Livia", exact: true, level: 1 }).waitFor();

  // Damage from Livia's sheet (the HP card's "Damage, healing and conditions" entry).
  await page.goto(base + "#characters?id=livia&tab=actions");
  await page.locator("#content [data-conditions-entry=livia]").first().click();
  // Refreshed by the hand-off writer (29/09/2026): P3 PG-22, one HP widget (cause, amount,
  // «Danno» applies at once).
  await page.locator("[data-conditions-command=hp]").click();
  await page.locator("#dialog [data-dt-amount]").waitFor();
  await page.locator("#dialog [data-dt-note]").fill("Dardo della sentinella");
  await page.locator("#dialog [data-dt-amount]").fill("3");
  await page.locator("#dialog [data-dt-damage]").click();
  await page.waitForTimeout(200);
  await closeDialog();
  state = await saved();
  check(
    state.combatAttempts.some((a) =>
      a.requests.some((r) => r.kind === "concentration" && r.status === "pending"),
    ),
    "no concentration request",
  );
  check((await bellCount()) === dm0, "the DM was notified of their own changes");
  passed.push(
    "DM scheduled a session, shared a world entry mentioning @Livia, invited the player to a note and damaged concentrating Livia; the DM's own bell did not change",
  );

  // 4. Player: badge, no pop-up without a choice, rows in the centre.
  await role("player");
  check(!(await page.locator(".notifications-toast").count()), "a pop-up arrived without a choice");
  const afterDm = await bellCount();
  // Review P3: the mention of @Livia travels with the shared letter (one notice, not two).
  check(afterDm === player0 + 4, `expected 4 new notifications, got ${afterDm - player0}`);
  check(
    (await bell().getAttribute("aria-label")).startsWith(
      `Notifiche e richieste · ${afterDm} notifiche`,
    ),
    "bell label",
  );
  await openCentre();
  for (const text of [
    "Nuova sessione: «Partita di ottobre»",
    "Nuovo materiale condiviso: «Lettera del sindaco»",
    "Invito a leggere: «Mappa per Livia»",
    "Tiro richiesto: Livia",
  ])
    check((await rowOf(text).count()) === 1, "missing row " + text);
  check(
    (await rowOf("Tiro richiesto: Livia").innerText()).includes("Concentrazione · CD 10"),
    "request detail",
  );
  check(
    (await page.locator("#dialog .notifications-pending").innerText()).includes(
      "1 richiesta attende una risposta al Tavolo.",
    ),
    "pending request count",
  );
  const letterRow = await rowOf("Lettera del sindaco").innerText();
  check(
    letterRow.includes("Menzioni") && letterRow.includes("Menzione di DM: @Livia"),
    "the letter row carries the mention: " + letterRow,
  );
  const sessionRow = await rowOf("Nuova sessione").innerText();
  check(
    /nel tuo fuso \(Europe\/London\) · ora concordata .* \(Europe\/Rome\)/.test(sessionRow),
    "session time order: " + sessionRow,
  );
  await page.screenshot({ path: dir + "centre-player-it-1440.png" });
  await page.locator('#dialog [data-notifications-filter="mentions"]').click();
  check((await page.locator("#dialog .notifications-item").count()) === 1, "mention filter");
  check(
    (await page.locator("#dialog .notifications-item").innerText()).includes("Lettera del sindaco"),
    "mention filter lists the letter",
  );
  check(
    (await page
      .locator('#dialog [data-notifications-filter="mentions"]')
      .getAttribute("aria-pressed")) === "true",
    "filter state",
  );
  await page.locator('#dialog [data-notifications-filter="all"]').click();
  passed.push(
    "Player bell +4 with no pop-up (default: centre only); rows for session (London time first, agreed Rome time second), shared material carrying the @Livia mention (one row, “Materiali condivisi · Menzioni”), invitation and roll request; category filter",
  );

  // 5. Roll request: the click opens the context (Table, core roll dialog) and marks read.
  await rowOf("Tiro richiesto: Livia").locator("[data-notifications-open]").click();
  await page.getByRole("heading", { name: "Tiri e risultati", exact: true }).waitFor();
  check(page.url().endsWith("#table"), "not at the Table: " + page.url());
  check((await bellCount()) === afterDm - 1, "opening did not mark the request read");
  await page.screenshot({ path: dir + "request-from-notification-it-1440.png" });
  await page.locator("#dialog [data-request-open]").first().click();
  await page.locator("#dialog [name=diceMode]").selectOption("physical");
  await page.locator("#dialog [name=face0]").fill("15");
  await button("Registra tiro").click();
  await page.waitForTimeout(150);
  // W1b integration: B56 shows the BG3 check screen above "Tiri e risultati"; it keeps
  // the closing click (B56 review r2), so dismiss it first as a player would (Esc).
  const diceScreen = page.locator("[data-dice3d-layer]:not([hidden])");
  if (await diceScreen.count()) {
    await page.keyboard.press("Escape");
    await diceScreen.waitFor({ state: "hidden", timeout: 4000 });
  }
  await closeDialog();
  state = await saved();
  const request = state.combatAttempts
    .flatMap((a) => a.requests)
    .find((r) => r.kind === "concentration");
  check(request.status === "resolved" && request.mode === "physical", "roll not resolved");
  await openCentre();
  check(!(await rowOf("Tiro richiesto").count()), "resolved request still listed");
  passed.push(
    "Roll request row → Table with the core 'Tiri e risultati' dialog, badge −1; physical face 15 recorded; resolved request leaves the list",
  );

  // 6. Session row → Campaign › Sessions, read.
  const beforeSession = await bellCount();
  await rowOf("Nuova sessione").locator("[data-notifications-open]").click();
  await page.getByRole("heading", { name: "Sessioni", exact: true, level: 1 }).waitFor();
  check((await bellCount()) === beforeSession - 1, "session not marked read");
  passed.push("Session row opens Campaign › Sessions and marks it read");

  // 7. Preferences: categories, pop-up position and duration, opt-in reminder.
  await openCentre();
  await page.locator("#dialog [data-notifications-preferences]").click();
  await page.getByRole("heading", { name: "Preferenze notifiche", exact: true }).waitFor();
  const prefs = (name) => page.locator(`#dialog [name="${name}"]`);
  check(
    !(await prefs("cat-requests").locator('option[value="off"]').count()),
    "roll requests can be switched off",
  );
  await prefs("cat-sessions").selectOption("toast");
  await prefs("cat-handouts").selectOption("toast");
  await prefs("position").selectOption("bottom-left");
  await prefs("duration").fill("40");
  await button("Salva preferenze notifiche").click();
  // The browser's own range check blocks the submit and says why; nothing is saved.
  check(
    (await prefs("duration").evaluate((el) => el.validity.rangeOverflow && el.validationMessage)) &&
      (await page.locator("#dialog [data-notifications-preferences-form]").count()) === 1 &&
      !(await saved()).ext["core-settings"].personal.player?.["notifications.cat-sessions"],
    "invalid duration accepted",
  );
  await prefs("duration").fill("20");
  await prefs("remind-24h").check();
  await page.screenshot({ path: dir + "preferences-it-1440.png" });
  await button("Salva preferenze notifiche").click();
  await page.locator("#dialog [data-notifications-centre]").waitFor();
  // The region was just inserted with the centre: it is filled after a short pause.
  await page.waitForTimeout(150);
  check(
    (await page.locator("#dialog [data-notifications-live]").textContent()) ===
      "Preferenze delle notifiche salvate.",
    "save not announced",
  );
  state = await saved();
  const personal = state.ext["core-settings"].personal.player;
  check(
    personal["notifications.cat-sessions"] === "toast" &&
      personal["notifications.position"] === "bottom-left" &&
      personal["notifications.duration"] === 20 &&
      personal["notifications.remind-24h"] === true,
    "preferences not saved: " + JSON.stringify(personal),
  );
  await closeDialog();
  passed.push(
    "Preferences: roll requests cannot be muted; a 40 s duration is refused by the field's range check and nothing is saved; sessions/materials as pop-ups, bottom-left, 20 s, 24 h reminder saved personally",
  );

  // 8. DM moves the session within 24 hours and updates the letter.
  await role("dm");
  await page.goto(base + "#campaign?tab=sessions");
  await page.getByRole("heading", { name: "Sessioni", exact: true, level: 1 }).waitFor();
  await page.locator(`[data-campaign-change-session="${session.id}"]`).click();
  await field("data.localTime").fill(await romeIn(20));
  await saveEntry();
  await page.getByRole("heading", { name: "Sessioni", exact: true, level: 1 }).waitFor();
  await page.goto(base + `#campaign?tab=entry&id=${letter.id}`);
  await page.locator("[data-campaign-edit]").click();
  await field("data.body").fill("Il sigillo è stato spezzato stanotte.");
  await saveEntry();
  await page.getByRole("heading", { name: "Lettera del sindaco", exact: true, level: 1 }).waitFor();
  check(
    !(await page.locator(".notifications-toast").count()),
    "the DM got pop-ups for own changes",
  );

  // 9. Player: pop-ups at the chosen position, announced in Italian; reminder listed.
  await role("player");
  await page.locator(".notifications-toast").first().waitFor();
  const toasts = page.locator(".notifications-toast");
  check((await toasts.count()) === 2, "expected two pop-ups, got " + (await toasts.count()));
  check(
    (await page.locator(".notifications-toasts").getAttribute("data-position")) === "bottom-left",
    "position",
  );
  const box = await page.locator(".notifications-toasts").boundingBox();
  check(
    box.x <= 40 && box.y + box.height >= 900 - 100,
    "pop-ups not bottom-left: " + JSON.stringify(box),
  );
  await page.waitForTimeout(150);
  const spoken = await liveText();
  check(
    spoken.startsWith("2 nuove notifiche.") &&
      spoken.includes("Sessioni: Sessione spostata: «Partita di ottobre»") &&
      spoken.includes("Materiali condivisi: Aggiornato: «Lettera del sindaco»"),
    "announcement: " + spoken,
  );
  await page.screenshot({ path: dir + "toasts-bottom-left-it-1440.png" });
  const withToasts = await bellCount();
  const movedText = await toasts.filter({ hasText: "Sessione spostata" }).innerText();
  await toasts
    .filter({ hasText: "Sessione spostata" })
    .getByRole("button", { name: "Apri" })
    .click();
  await page.getByRole("heading", { name: "Sessioni", exact: true, level: 1 }).waitFor();
  check((await bellCount()) === withToasts - 1, "toast Open did not mark read");
  // Review P3: the pop-up's own time equals the Sessions page's "Nel tuo fuso" time.
  const moved = (await saved()).campaign.sessions.find((s) => s.id === session.id);
  const pageTime = await page.locator(`time[datetime="${moved.startsAt}"]`).first().innerText();
  const toastTime = movedText.match(/→ [^·]*?(\d{2}:\d{2}) · nel tuo fuso \(Europe\/London\)/)?.[1];
  check(
    toastTime &&
      pageTime.endsWith(toastTime) &&
      /ora concordata .* \(Europe\/Rome\)/.test(movedText),
    `pop-up time ${toastTime} vs Sessions ${pageTime}: ${movedText}`,
  );
  notes.push(
    `Moved-session pop-up: "${movedText.replace(/\s+/g, " ")}"; Sessions page: ${pageTime}`,
  );
  check((await toasts.count()) === 1, "opened toast not removed");
  await toasts.getByRole("button", { name: "Chiudi avviso" }).click();
  check(!(await toasts.count()), "dismiss");
  await openCentre();
  check((await rowOf("Promemoria: «Partita di ottobre»").count()) === 1, "reminder not listed");
  check(
    /Inizia tra (20|19) ore/.test(await rowOf("Promemoria").innerText()),
    "reminder text: " + (await rowOf("Promemoria").innerText()),
  );
  passed.push(
    "Player sees two pop-ups (moved session, updated material) bottom-left with Italian aria-live text; the pop-up's own time matches the Sessions page (London first, agreed Rome time second); Open goes to Sessions and reads; Dismiss keeps it unread; opt-in 24 h reminder listed (reminders stay in the centre only)",
  );

  // 10. Mark all read, Undo, single-row correction.
  const beforeAll = await bellCount();
  const logBefore = (await saved()).log.length;
  await page.evaluate(() => (document.querySelector("#dialog [data-notifications-live]")._b24 = 1));
  await page.locator("#dialog [data-notifications-read-all]").click();
  check((await bellCount()) === 0, "mark all left a count");
  check(
    (await bell().getAttribute("aria-label")) === "Notifiche e richieste",
    "label still counts",
  );
  check(await page.locator("#dialog [data-notifications-undo]").isVisible(), "no Undo");
  await page.screenshot({ path: dir + "mark-all-undo-it-1440.png" });
  await page.locator("#dialog [data-notifications-undo]").click();
  check((await bellCount()) === beforeAll, "Undo did not restore the count");
  const firstUnread = page.locator("#dialog .notifications-item.is-unread").first();
  const unreadTitle = await firstUnread.locator("strong").innerText();
  await firstUnread.locator("[data-notifications-toggle]").click();
  check((await bellCount()) === beforeAll - 1, "toggle read");
  await rowOf(unreadTitle).locator("[data-notifications-toggle]").click();
  check((await bellCount()) === beforeAll, "toggle back to unread");
  await page.waitForTimeout(150);
  check(
    (await page.locator("#dialog [data-notifications-live]").textContent()) ===
      "Segnata come non letta.",
    "correction announced",
  );
  // Review P3: the centre's live region is the same node after every redraw.
  check(
    await page.evaluate(
      () => document.querySelector("#dialog [data-notifications-live]")._b24 === 1,
    ),
    "the live region was redrawn",
  );
  // Review P2: reading writes nothing to the shared game log (the Table's "Registro").
  const logAfter = (await saved()).log;
  check(
    logAfter.length === logBefore &&
      !logAfter.some((e) => /Notific|Letture ripristinate/.test(e.label)),
    "reading wrote to the game log: " + logAfter.slice(logBefore).map((e) => e.label),
  );
  passed.push(
    "Mark all read → 0 with Undo restoring exactly; one row marked read and corrected back to unread; the live region stays the same node; no line reached the shared game log",
  );

  // 11. Keyboard: Enter opens, Tab reaches a row, Enter opens its context; Escape returns focus.
  await closeDialog();
  await bell().focus();
  await page.keyboard.press("Enter");
  await page.locator("#dialog [data-notifications-centre]").waitFor();
  await page.keyboard.press("Escape");
  check(
    await page.evaluate(() => document.activeElement?.dataset?.service === "requests"),
    "focus did not return to the bell",
  );
  await page.keyboard.press("Enter");
  await page.locator("#dialog [data-notifications-centre]").waitFor();
  let reached = false;
  for (let i = 0; i < 30 && !reached; i++) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(
      () => document.activeElement?.hasAttribute?.("data-notifications-open") ?? false,
    );
  }
  check(reached, "Tab never reached a notification");
  const keyTitle = await page.evaluate(
    () => document.activeElement.querySelector("strong").textContent,
  );
  const beforeKey = await bellCount();
  const wasUnread = await page.evaluate(() =>
    document.activeElement.closest(".notifications-item").classList.contains("is-unread"),
  );
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
  check(!(await page.locator("#dialog [data-notifications-centre]").count()), "Enter did not open");
  check((await bellCount()) === beforeKey - (wasUnread ? 1 : 0), "keyboard open did not read");
  passed.push(
    `Keyboard: Enter on the bell, Escape returns focus; Tab to "${keyTitle}" and Enter opens it`,
  );

  // 12. Reload keeps read state and preferences.
  const beforeReload = await bellCount();
  const marks = () =>
    page.evaluate(
      () => JSON.parse(localStorage.getItem("d20-studio-notifications:read:v1") ?? "{}").player,
    );
  const readBefore = await marks();
  check(Object.keys(readBefore).length > 0, "no device read markers");
  check(!(await saved()).ext.notifications, "read markers still in the shared state");
  await page.reload();
  await page.locator(".service-nav").waitFor();
  check((await bellCount()) === beforeReload, "reload changed the count");
  check(
    JSON.stringify(await marks()) === JSON.stringify(readBefore),
    "read markers changed on reload",
  );
  passed.push(
    `Reload keeps ${Object.keys(readBefore).length} device read markers (not in the shared state) and the count ${beforeReload}`,
  );

  // 13. Offline: shared notices on hold are declared; reading still works locally.
  await page.locator('.service-nav [data-service="preferences"]').click();
  await page.locator('#dialog [name="offline"]').check();
  await button("Salva preferenze").click();
  await openCentre();
  const offlineText = await page.locator("#dialog .notifications-offline").innerText();
  check(
    offlineText.includes("Senza rete") &&
      offlineText.includes("Le notifiche condivise sono in attesa") &&
      offlineText.includes("funzionano anche senza rete"),
    "offline declaration: " + offlineText,
  );
  await page.screenshot({ path: dir + "offline-it-1440.png" });
  const offlineCount = await bellCount();
  const unreadOffline = page.locator("#dialog .notifications-item.is-unread").first();
  if (await unreadOffline.count()) {
    await unreadOffline.locator("[data-notifications-toggle]").click();
    check((await bellCount()) === offlineCount - 1, "offline read marker refused");
  }
  await closeDialog();
  await page.locator('.service-nav [data-service="preferences"]').click();
  await page.locator('#dialog [name="offline"]').uncheck();
  await button("Salva preferenze").click();
  await page.waitForTimeout(150);
  check(
    (await liveText()) === "Di nuovo in rete: le notifiche condivise sono aggiornate.",
    "reconnection not announced",
  );
  passed.push(
    "Offline: centre declares shared notices on hold since the disconnection; a personal read marker still saves; reconnection announced",
  );

  // 14. Privacy and DM view: Solo io never notifies the DM; sharing it is an invitation.
  await page.goto(base + "#notes");
  await page.locator('[data-campaign-new="note"]').click();
  await page.locator("[data-campaign-context]").selectOption("lanterns");
  await field("data.title").fill("Sospetti");
  await field("data.body").fill("Chiedere al @DM chi ha riacceso la lanterna.");
  await saveEntry();
  await page.getByRole("heading", { name: "Sospetti", exact: true, level: 1 }).waitFor();
  await role("dm");
  await openCentre();
  check(!(await rowOf("Sospetti").count()), "a Solo io note reached the DM");
  // Other areas (chat roll results) may list shared items; none of the player's own
  // notices (request, invitation, material, mention for Livia) reach the DM.
  for (const text of ["Tiro richiesto: Livia", "Mappa per Livia", "Lettera del sindaco", "@Livia"])
    check(!(await rowOf(text).count()), "the DM sees the player's notice " + text);
  await page.screenshot({ path: dir + "centre-dm-it-1440.png" });
  const dmBefore = await bellCount();
  await closeDialog();
  await role("player");
  await page.locator("[data-campaign-access]").click();
  await page.locator('#dialog [name="mode"]').selectOption("selected");
  await page.locator('#dialog [name="grant-dm"]').selectOption("read");
  await button("Salva accessi").click();
  await role("dm");
  check((await bellCount()) === dmBefore + 1, "DM should have one invitation with the mention");
  await openCentre();
  check((await rowOf("Sospetti").count()) === 1, "one row for the note");
  check(
    (await rowOf("Invito a leggere: «Sospetti»").innerText()).includes(
      "Menzione di Giocatore: @DM",
    ),
    "the invitation carries the mention",
  );
  await rowOf("Invito a leggere").locator("[data-notifications-open]").click();
  await page.getByRole("heading", { name: "Sospetti", exact: true, level: 1 }).waitFor();
  check((await bellCount()) === dmBefore, "DM read");
  passed.push(
    "Solo io note with @DM never notified the DM; once shared personally the DM gets one invitation carrying the mention and opens the note",
  );

  // 15. Party activity (BG3 CRP-055): the player advances Livia; the DM is told.
  const dmParty = await bellCount();
  await role("player");
  await page.goto(base + "#characters?id=livia&tab=actions");
  await button("Avanza di livello").click();
  const builderField = (path) => page.locator('[data-builder-path="' + path + '"]');
  const builderSection = (id) =>
    page.locator('.builder-sections [data-builder-section="' + id + '"]');
  await builderSection("class").click();
  await builderField("classes.0.level").fill("4");
  await button("Salva bozza").click();
  await builderField("hp.perLevel.4.method").selectOption("fixed");
  await button("Salva bozza").click();
  await builderSection("features").click();
  await page.locator('[data-builder-feature="alert"][data-grant="class:wizard:feat:4"]').click();
  await button("Salva bozza").click();
  await builderSection("review").click();
  // Final review F1 (D&D Beyond «Manage Level Up»): a sheet without a recorded build levels up
  // in the new level only, so nothing already on the sheet asks to be confirmed again.
  check(
    !(await page
      .getByText("Confermo la scheda con gli aspetti da verificare", { exact: false })
      .count()),
    "the level-up asks to confirm what the sheet already has",
  );
  await button("Applica alla scheda").click();
  await page.getByRole("heading", { name: "Livia", exact: true }).waitFor();
  check((await saved()).actors.livia.level === 4, "advancement not applied");
  check(
    !(await page.locator(".notifications-toast").count()),
    "the player was told of own level-up",
  );
  await role("dm");
  check((await bellCount()) === dmParty + 1, "DM not told of the level-up");
  await openCentre();
  const party = rowOf("Avanzamento di livello: Livia");
  check((await party.innerText()).includes("Giocatore · ora al livello 4"), "party row");
  check((await party.innerText()).includes("Attività del gruppo"), "party category");
  await page.screenshot({ path: dir + "party-dm-it-1440.png" });
  await party.locator("[data-notifications-open]").click();
  await page.getByRole("heading", { name: "Livia", exact: true }).waitFor();
  check(page.url().includes("#characters?id=livia"), "party row did not open the sheet");
  passed.push(
    "Party activity: the player's level-up of Livia (level 4, Alert) reaches the DM as “Avanzamento di livello: Livia · Giocatore · ora al livello 4” and opens her sheet",
  );
  check(errors.length === 0, "Page errors: " + errors.join("; "));
  await context.close();

  // 16. EN phone 390 with touch: language, preferences, pop-up full width, English text.
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const mobile = await phone.newPage();
  mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
  await mobile.goto(base + "#home");
  await mobile.locator(".service-nav").waitFor();
  await mobile.locator('.service-nav [data-service="preferences"]').tap();
  await mobile.locator('#dialog [name="lang"]').selectOption("en");
  await mobile.getByRole("button", { name: "Salva preferenze", exact: true }).tap();
  const mbell = () => mobile.locator('.service-nav [data-service="requests"]');
  await mbell().tap();
  await mobile.locator("#dialog [data-notifications-centre]").waitFor();
  check(
    (await mobile.locator("#dialog h2").innerText()) === "Notifications and requests",
    "EN title",
  );
  check(
    (await mobile.locator("#dialog .notifications-pending").innerText()).includes(
      "Pending requests",
    ),
    "EN pending",
  );
  await mobile.locator("#dialog [data-notifications-preferences]").tap();
  await mobile.locator('#dialog [name="cat-sessions"]').selectOption("toast");
  await mobile.locator('#dialog [name="position"]').selectOption("top-right");
  await mobile.getByRole("button", { name: "Save notification preferences", exact: true }).tap();
  await mobile.locator("#dialog [data-notifications-centre]").waitFor();
  const overflow = () =>
    mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check((await overflow()) <= 0, "centre overflows at 390");
  const small = await mobile.evaluate(() =>
    [...document.querySelectorAll("#dialog button, #dialog select")]
      .filter((el) => el.offsetParent)
      .map((el) => [el.textContent.trim().slice(0, 20), el.getBoundingClientRect().height])
      .filter(([, h]) => h < 40),
  );
  check(!small.length, "small targets: " + JSON.stringify(small));
  await mobile.locator("#dialog footer [data-close]").tap();
  await mobile.locator("#demo-role").selectOption("dm");
  await mobile.goto(base + "#campaign?tab=sessions");
  await mobile.getByRole("heading", { name: "Sessions", exact: true, level: 1 }).waitFor();
  await mobile.locator('[data-campaign-new-session="direct"]').tap();
  await mobile.locator('[data-campaign-path="data.title"]').fill("Game night");
  await mobile.locator('[data-campaign-path="data.localTime"]').fill("2026-10-16T21:00");
  await mobile.locator('[data-campaign-path="data.timeZone"]').fill("Europe/Rome");
  await mobile.locator("[data-campaign-save]").tap();
  await mobile.locator("[data-campaign-apply]").tap();
  await mobile.getByRole("heading", { name: "Sessions", exact: true, level: 1 }).waitFor();
  await mobile.locator("#demo-role").selectOption("player");
  const mtoast = mobile.locator(".notifications-toast");
  await mtoast.first().waitFor();
  const mbox = await mtoast.first().boundingBox();
  check(
    mbox.x >= 10 && mbox.x + mbox.width <= 380 && mbox.width >= 360,
    "phone toast width " + JSON.stringify(mbox),
  );
  check(mbox.y < 200, "phone toast not at the top");
  await mobile.waitForTimeout(150);
  const mspoken = await mobile.evaluate(
    () => document.querySelector("body > .notifications-live")?.textContent ?? "",
  );
  check(
    mspoken === "New notification. Sessions: New session: “Game night”.",
    "EN announcement: " + mspoken,
  );
  check((await overflow()) <= 0, "toast overflows at 390");
  await mobile.screenshot({ path: dir + "toast-en-390.png" });
  const mcount = Number(
    ((await mbell().getAttribute("aria-label")) ?? "").match(/· (\d+) notific/)?.[1] ?? 0,
  );
  check(mcount >= 1, "phone badge");
  await mtoast.getByRole("button", { name: "Open", exact: true }).tap();
  await mobile.getByRole("heading", { name: "Sessions", exact: true, level: 1 }).waitFor();
  const mafter = Number(
    ((await mbell().getAttribute("aria-label")) ?? "").match(/· (\d+) notific/)?.[1] ?? 0,
  );
  check(mafter === mcount - 1, "phone Open did not read");
  await mbell().tap();
  await mobile.locator("#dialog [data-notifications-centre]").waitFor();
  check(
    (await mobile
      .locator("#dialog .notifications-item")
      .filter({ hasText: "New session: “Game night”" })
      .count()) === 1,
    "EN row",
  );
  check((await overflow()) <= 0, "centre overflows at 390 with rows");
  await mobile.screenshot({ path: dir + "centre-en-390.png" });
  await phone.close();
  passed.push(
    "EN phone 390 touch: English centre and preferences, ≥40 px targets, no overflow; DM's new session pops up full width at the top with English aria-live; tap Open reads it",
  );

  // 17. Review fixes (B24 review), a fresh context: London zone, reduced motion.
  const review = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    timezoneId: "Europe/London",
    reducedMotion: "reduce",
  });
  const rp = await review.newPage();
  rp.on("pageerror", (error) => errors.push("review: " + error.message));
  const rbutton = (name) => rp.getByRole("button", { name, exact: true });
  const rbell = () => rp.locator('.service-nav [data-service="requests"]');
  const rcount = async () =>
    Number(((await rbell().getAttribute("aria-label")) ?? "").match(/· (\d+) notific/)?.[1] ?? 0);
  const rrole = async (r) => {
    await rp.locator("#demo-role").selectOption(r);
    await rp.waitForTimeout(150);
  };
  const rsaved = () =>
    rp.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const rfield = (path) => rp.locator('[data-campaign-path="' + path + '"]');
  const rsave = async () => {
    await rp.locator("[data-campaign-save]").click();
    await rp.locator("[data-campaign-apply]").click();
  };
  const ropen = async () => {
    await rbell().click();
    await rp.locator("#dialog [data-notifications-centre]").waitFor();
  };
  const rclose = async () => {
    if (await rp.locator("#dialog[open]").count())
      await rp.locator("#dialog footer [data-close]").click();
  };
  const rrow = (text) => rp.locator("#dialog .notifications-item").filter({ hasText: text });
  const romeAt = (minutes) =>
    rp.evaluate((m) => {
      const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Rome",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        })
          .formatToParts(new Date(Date.now() + m * 60e3))
          .map((p) => [p.type, p.value]),
      );
      return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
    }, minutes);
  await rp.goto(base + "#home");
  await rp.locator(".service-nav").waitFor();

  // 17a. P1: the requester's own account-deletion notice (another area, no `by`) counts.
  const r0 = await rcount();
  await rp.goto(base + "#account?tab=data");
  await rbutton("Elimina account…").click();
  await rp.locator("#dialog").getByText("Ho letto le conseguenze").click();
  await rp.locator("#dialog [data-account-confirm-with]").selectOption("email");
  await rp.locator("#dialog [data-account-typed]").fill("ELIMINA ACCOUNT");
  await rbutton("Elimina account").click();
  await rp.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")).ext.account.profiles.player
        .deletion,
  );
  check((await rcount()) === r0 + 1, "account deletion notice not counted");
  await rp.reload();
  await rp.locator(".service-nav").waitFor();
  check((await rcount()) === r0 + 1, "account deletion notice lost on reload");
  await ropen();
  check(
    (await rrow("Eliminazione dell’account programmata").count()) === 1,
    "no account-deletion row",
  );
  await rp.screenshot({ path: dir + "review-account-deletion-it-1440.png" });
  await rclose();
  await rp.goto(base + "#account?tab=data");
  await rp.locator("[data-account-pending] [data-account-cancel-deletion]").click();
  await rp.waitForFunction(
    () =>
      !JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")).ext.account.profiles.player
        .deletion,
  );
  check((await rcount()) === r0, "cancelled deletion still counted");
  // B30's opt-in preview: unread news join the bell for whoever switched it on.
  await rp.goto(base + "#home");
  await rp.locator('[data-home-tab="support"]').click();
  await rp.locator('[data-home-panel="support"]:not([hidden])').waitFor();
  await rp.locator('[data-home-preview="news-bell"]').check();
  await rp.waitForTimeout(200);
  const withNews = await rcount();
  check(withNews > r0, `news preview did not reach the bell (${r0} → ${withNews})`);
  await rp.locator('[data-home-tab="support"]').click();
  await rp.locator('[data-home-preview="news-bell"]').uncheck();
  await rp.waitForTimeout(200);
  check((await rcount()) === r0, "news preview off did not restore the bell");
  passed.push(
    `Review P1: the player's own account deletion counts in the bell (+1, kept on reload, row listed) and leaves with the cancellation; B30's news preview adds ${withNews - r0} unread news for the person who switched it on`,
  );

  // 17b. P2: a DM edit of a DM-only section says nothing to the player; a readable edit does.
  await rrole("dm");
  await rp.goto(base + "#campaign?tab=world");
  await rp.getByRole("heading", { name: "Mondo", exact: true, level: 1 }).waitFor();
  await rp.locator('[data-campaign-new="world"]').click();
  await rfield("data.title").fill("Torre");
  await rfield("data.body").fill("Testo pubblico.");
  await rp.locator('[data-campaign-access-mode="access"]').selectOption("campaign");
  await rp.locator('[data-campaign-details="sections"] summary').click();
  await rp.locator("[data-campaign-add-section]").click();
  await rfield("data.sections.0.title").fill("Segreto");
  await rfield("data.sections.0.body").fill("v1");
  await rsave();
  await rp.getByRole("heading", { name: "Torre", exact: true, level: 1 }).waitFor();
  const torre = (await rsaved()).campaignContent.entries.findLast(
    (e) => e.revisions.at(-1).data.title === "Torre",
  );
  check(torre.revisions.at(-1).data.sections[0].access.mode === "private", "section not DM-only");
  await rrole("player");
  await ropen();
  check((await rrow("«Torre»").count()) === 1, "shared tower not listed");
  await rp.locator("#dialog [data-notifications-read-all]").click();
  await rclose();
  const quiet = await rcount();
  const editTower = async (edit) => {
    await rrole("dm");
    await rp.goto(base + `#campaign?tab=entry&id=${torre.id}`);
    await rp.locator("[data-campaign-edit]").click();
    if (!(await rfield("data.sections.0.body").isVisible()))
      await rp.locator('[data-campaign-details="sections"] summary').click();
    await edit();
    await rsave();
    await rp.getByRole("heading", { name: "Torre", exact: true, level: 1 }).waitFor();
    await rrole("player");
  };
  await editTower(() => rfield("data.sections.0.body").fill("v2 changed secret"));
  check(
    (await rsaved()).campaignContent.entries.find((e) => e.id === torre.id).revisions.length === 2,
    "hidden edit not saved",
  );
  check((await rcount()) === quiet, "a DM-only section edit notified the player");
  await ropen();
  check(!(await rrow("Aggiornato: «Torre»").count()), "update row for a hidden edit");
  await rclose();
  await editTower(() => rfield("data.body").fill("Testo pubblico, corretto."));
  check((await rcount()) === quiet + 1, "a readable edit did not notify the player");
  await ropen();
  const towerUpdate = await rrow("Aggiornato: «Torre»").innerText();
  check(
    towerUpdate.includes("Testo pubblico, corretto.") && !/secret|Segreto/.test(towerUpdate),
    "update row: " + towerUpdate,
  );
  await rclose();
  passed.push(
    "Review P2: the DM's edit of a DM-only section of a shared entry leaves the player's bell unchanged; the next readable edit is one “Aggiornato: «Torre»” without the secret",
  );

  // 17c. P3: pop-ups without sliding under reduced motion; a language change redraws them.
  await ropen();
  await rp.locator("#dialog [data-notifications-preferences]").click();
  await rp.locator('#dialog [name="cat-sessions"]').selectOption("toast");
  await rp.locator('#dialog [name="duration"]').fill("30");
  await rp.locator('#dialog [name="remind-1h"]').check();
  await rbutton("Salva preferenze notifiche").click();
  await rp.locator("#dialog [data-notifications-centre]").waitFor();
  await rclose();
  await rrole("dm");
  await rp.goto(base + "#campaign?tab=sessions");
  await rp.getByRole("heading", { name: "Sessioni", exact: true, level: 1 }).waitFor();
  await rp.locator('[data-campaign-new-session="direct"]').click();
  await rfield("data.title").fill("Serata di prova");
  await rfield("data.localTime").fill(await romeAt(64));
  await rfield("data.timeZone").fill("Europe/Rome");
  await rsave();
  await rp.getByRole("heading", { name: "Sessioni", exact: true, level: 1 }).waitFor();
  await rrole("player");
  const rtoast = rp.locator(".notifications-toast");
  await rtoast.first().waitFor();
  check(
    (await rtoast.first().evaluate((el) => getComputedStyle(el).animationName)) === "none",
    "the pop-up slides despite reduced motion",
  );
  check((await rtoast.first().innerText()).includes("Nuova sessione"), "IT pop-up");
  await rp.locator('.service-nav [data-service="preferences"]').click();
  await rp.locator('#dialog [name="lang"]').selectOption("en");
  await rbutton("Salva preferenze").click();
  await rp.waitForTimeout(200);
  check((await rtoast.count()) === 1, "the language change removed the pop-up");
  const enToast = await rtoast.first().innerText();
  check(
    enToast.includes("New session: “Serata di prova”") &&
      enToast.includes("your timezone (Europe/London)") &&
      enToast.includes("agreed time") &&
      enToast.includes("Open"),
    "EN pop-up: " + enToast,
  );
  await rp.screenshot({ path: dir + "review-toast-relabel-en-1440.png" });
  await rtoast.getByRole("button", { name: "Dismiss notice" }).click();
  passed.push(
    "Review P3: under reduced motion the pop-up has no animation; switching to English redraws it in English (your timezone first, agreed time second) instead of removing it",
  );

  // 17d. P3: the palette's "Mark all notifications as read" opens the centre on its Undo.
  const beforeCommand = await rcount();
  check(beforeCommand > 0, "nothing unread before the command");
  await rp.locator('.service-nav [data-service="search"]').click();
  await rp.locator("#dialog [data-cmdk-input]").fill("Mark all notifications as read");
  await rp.waitForTimeout(150);
  await rp.keyboard.press("Enter");
  await rp.locator("#dialog [data-notifications-undo]").waitFor();
  check((await rcount()) === 0, "command did not mark all read");
  check(
    await rp.evaluate(() => document.activeElement?.hasAttribute("data-notifications-undo")),
    "focus not on Undo",
  );
  await rp.waitForTimeout(150);
  check(
    /notifications? marked as read\. You can undo\./.test(
      await rp.locator("#dialog [data-notifications-live]").textContent(),
    ),
    "command not announced",
  );
  await rp.keyboard.press("Enter");
  check((await rcount()) === beforeCommand, "Undo after the command did not restore");
  await rclose();
  passed.push(
    `Review P3: the palette command marks ${beforeCommand} as read and opens the centre focused on Undo; Enter restores them`,
  );

  // 17e. P3: a reminder falling due on the 30-second clock updates the badge by itself.
  const cp = await review.newPage();
  cp.on("pageerror", (error) => errors.push("clock: " + error.message));
  await cp.clock.install();
  await cp.goto(base + "#home");
  await cp.locator(".service-nav").waitFor();
  const cbell = async () =>
    Number(
      (
        (await cp.locator('.service-nav [data-service="requests"]').getAttribute("aria-label")) ??
        ""
      ).match(/(\d+) notific/)?.[1] ?? 0,
    );
  const beforeClock = await cbell();
  const hash = await cp.evaluate(() => location.hash);
  await cp.clock.fastForward("06:00");
  await cp.waitForTimeout(300);
  const afterClock = await cbell();
  check(afterClock === beforeClock + 1, `clock reminder: ${beforeClock} → ${afterClock}`);
  check((await cp.evaluate(() => location.hash)) === hash, "the page navigated");
  await cp.locator('.service-nav [data-service="requests"]').click();
  check(
    (await cp
      .locator("#dialog .notifications-item")
      .filter({ hasText: /Reminder: “Serata di prova”|Promemoria: «Serata di prova»/ })
      .count()) === 1,
    "reminder row",
  );
  await cp.close();
  passed.push(
    `Review P3: with the 1-hour reminder on and the session 64 minutes away, six minutes on the clock raise the badge ${beforeClock} → ${afterClock} with no navigation; the row reads “Reminder: “Serata di prova””`,
  );
  await review.close();

  // 18. Review 2 fixes, a fresh context (London): a mention marks a notice without hiding
  // it; top pop-ups keep the newest at the edge and leave the bell free; keyboard dismissal
  // keeps focus; the announcement's grammar; BG3 party rewards; whole-second duration.
  {
    const second = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      timezoneId: "Europe/London",
    });
    const page = await second.newPage();
    page.on("pageerror", (error) => errors.push("review 2: " + error.message));
    const button = (name) => page.getByRole("button", { name, exact: true });
    const role = async (r) => {
      await page.locator("#demo-role").selectOption(r);
      await page.waitForTimeout(150);
    };
    const bell = () => page.locator('.service-nav [data-service="requests"]');
    const bellCount = async () =>
      Number(((await bell().getAttribute("aria-label")) ?? "").match(/· (\d+) notific/)?.[1] ?? 0);
    const openCentre = async () => {
      await bell().click();
      await page.locator("#dialog [data-notifications-centre]").waitFor();
    };
    const closeDialog = async () => {
      if (await page.locator("#dialog[open]").count())
        await page.locator("#dialog footer [data-close]").click();
    };
    const rowOf = (text) => page.locator("#dialog .notifications-item").filter({ hasText: text });
    const field = (path) => page.locator('[data-campaign-path="' + path + '"]');
    const saveEntry = async () => {
      await page.locator("[data-campaign-save]").click();
      await page.locator("[data-campaign-apply]").click();
    };
    const saved = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
    const focused = () =>
      page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return "BODY";
        if (a.matches('[data-service="requests"]')) return "BELL";
        if (a.matches("[data-notifications-toast-open]"))
          return "OPEN:" + a.closest(".notifications-toast").querySelector("strong").textContent;
        return a.outerHTML.slice(0, 80);
      });
    const prefs = (name) => page.locator(`#dialog [name="${name}"]`);
    await page.goto(base + "#home");
    await page.locator(".service-nav").waitFor();
    await button("Ripristina esempio").click();
    await button("Ripristina").click();
    await page.waitForTimeout(200);
    await role("player");
    await openCentre();
    await page.locator("#dialog [data-notifications-preferences]").click();
    await prefs("cat-mentions").selectOption("off");
    await prefs("cat-handouts").selectOption("toast");
    await prefs("position").selectOption("top-right");
    await prefs("duration").fill("30");
    await button("Salva preferenze notifiche").click();
    await page.locator("#dialog [data-notifications-centre]").waitFor();
    await closeDialog();
    const start = await bellCount();
    await role("dm");
    await page.goto(base + "#notes");
    await page.locator('[data-campaign-new="note"]').click();
    await page.locator("[data-campaign-context]").selectOption("lanterns");
    await field("data.title").fill("Mappa del faro");
    await field("data.body").fill("Per @Livia e per @tutti: il passaggio sotto il faro.");
    await page.locator('[data-campaign-access-mode="access"]').selectOption("selected");
    await page
      .locator('[data-campaign-grant="player"][data-access-path="access"]')
      .selectOption("read");
    await saveEntry();
    await page.getByRole("heading", { name: "Mappa del faro", exact: true, level: 1 }).waitFor();
    for (let i = 1; i <= 4; i++) {
      await page.goto(base + "#campaign?tab=world");
      await page.getByRole("heading", { name: "Mondo", exact: true, level: 1 }).waitFor();
      await page.locator('[data-campaign-new="world"]').click();
      await field("data.title").fill("Voce " + i);
      await field("data.body").fill("Testo " + i);
      await page.locator('[data-campaign-access-mode="access"]').selectOption("campaign");
      await saveEntry();
      await page.getByRole("heading", { name: "Voce " + i, exact: true, level: 1 }).waitFor();
    }
    await role("player");
    const toasts = page.locator(".notifications-toast");
    await toasts.first().waitFor();
    const order = await toasts.evaluateAll((els) =>
      els.map((el) => el.querySelector("strong").textContent),
    );
    check(
      order.join(" | ") ===
        "Nuovo materiale condiviso: «Voce 4» | Nuovo materiale condiviso: «Voce 3» | Nuovo materiale condiviso: «Voce 2»",
      "stack order: " + order.join(" | "),
    );
    const bellBox = await bell().boundingBox();
    const stackBox = await page.locator(".notifications-toasts").boundingBox();
    check(stackBox.y >= bellBox.y + bellBox.height, "the pop-ups cover the bell");
    await page.waitForTimeout(150);
    const spoken = await liveTextOf(page);
    check(
      spoken.startsWith("4 nuove notifiche. ") &&
        spoken.endsWith("«Voce 2». E un’altra nel centro notifiche."),
      "announcement: " + spoken,
    );
    await page.screenshot({ path: dir + "review2-toasts-top-right-it-1440.png" });
    passed.push(
      `Review 2 P3: top-right stack reads ${order.join(", ")} (newest at the edge), below the bell; aria-live: “${spoken}”`,
    );
    await toasts.first().locator("[data-notifications-toast-close]").focus();
    await page.keyboard.press("Enter");
    const f1 = await focused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    const f2 = await focused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    const f3 = await focused();
    check(
      f1 === "OPEN:Nuovo materiale condiviso: «Voce 3»" &&
        f2 === "OPEN:Nuovo materiale condiviso: «Voce 2»" &&
        f3 === "BELL" &&
        !(await toasts.count()),
      `focus after keyboard dismissal: ${f1} / ${f2} / ${f3}`,
    );
    passed.push(
      `Review 2 P3: Enter on “Chiudi avviso” moves focus to ${f1}, then ${f2}, then ${f3}`,
    );
    check((await bellCount()) === start + 5, "five new notices");
    await openCentre();
    const invite = await rowOf("Invito a leggere: «Mappa del faro»").innerText();
    check(
      invite.includes("Inviti") &&
        !invite.includes("Menzioni") &&
        invite.includes("Menzione di DM: @Livia"),
      "invitation row with Mentions off: " + invite,
    );
    await page.screenshot({ path: dir + "review2-mentions-off-it-1440.png" });
    await page.locator("#dialog [data-notifications-preferences]").click();
    await prefs("cat-mentions").selectOption("tray");
    await button("Salva preferenze notifiche").click();
    await page.locator("#dialog [data-notifications-centre]").waitFor();
    check((await rowOf("Mappa del faro").innerText()).includes("Inviti · Menzioni"), "two labels");
    await page.locator('#dialog [data-notifications-filter="mentions"]').click();
    check((await page.locator("#dialog .notifications-item").count()) === 1, "Menzioni filter");
    await closeDialog();
    passed.push(
      "Review 2 P2/P3: with Mentions off the invitation “Mappa del faro” stays under Inviti, cited by @Livia (not @tutti); with Mentions on it reads “Inviti · Menzioni” and the Menzioni filter lists it",
    );
    // BG3 rewards (CRP-055): the DM awards 300 XP split; the player opens Livia's Experience.
    await role("dm");
    await page.goto(base + "#campaign?tab=loot");
    await page.locator('[data-loot="award-open"]').first().click();
    await page.locator('#dialog input[name="xp"]').fill("300");
    for (const box of await page.locator('#dialog input[name="recipient"]').all())
      if (!(await box.isChecked())) await box.check();
    await button("Assegna").click();
    await page.waitForTimeout(300);
    const awarded = await saved();
    await role("player");
    const beforeReward = await bellCount();
    await openCentre();
    const reward = rowOf("Ricompensa: Livia, Doran, Mira");
    const rewardText = (await reward.innerText()).replace(/\s+/g, " ");
    check(rewardText.includes("100 PE a testa"), "reward row: " + rewardText);
    await page.screenshot({ path: dir + "review2-reward-it-1440.png" });
    await reward.locator("[data-notifications-open]").click();
    await page.getByRole("heading", { name: "Esperienza", exact: true }).waitFor();
    const hash = await page.evaluate(() => location.hash);
    check(hash === "#characters?id=livia&tab=features", "reward target " + hash);
    check((await bellCount()) === beforeReward - 1, "opening the reward did not read it");
    passed.push(
      `Review 2 P2: DM award “${awarded.ext.loot.ledger.at(-1).text.it}” (Livia ${awarded.actors.livia.xp} XP) reaches the player as “${rewardText}”; opening it shows ${hash} (Esperienza)`,
    );
    // Duration 4.5 from the shell Preferences: the centre's form reads 5 and still saves.
    await page.locator('.service-nav [data-service="preferences"]').click();
    await page.locator("#dialog[open]").waitFor();
    await page.locator('#dialog [name="setting:notifications.duration"]').fill("4.5");
    await page.locator("#dialog footer button[type=submit]").click();
    await page.waitForTimeout(300);
    if (await page.locator("#dialog[open]").count()) await page.keyboard.press("Escape");
    const stored = (await saved()).ext["core-settings"].personal.player["notifications.duration"];
    await openCentre();
    await page.locator("#dialog [data-notifications-preferences]").click();
    const shown = await prefs("duration").inputValue();
    await prefs("cat-party").selectOption("toast");
    await button("Salva preferenze notifiche").click();
    await page.locator("#dialog [data-notifications-centre]").waitFor();
    check(
      stored === 4.5 &&
        shown === "5" &&
        (await saved()).ext["core-settings"].personal.player["notifications.cat-party"] === "toast",
      `duration ${stored} / ${shown}`,
    );
    await closeDialog();
    passed.push(
      `Review 2 P3: the shell Preferences stored ${stored} s; the centre's form reads ${shown} and saves a category change`,
    );
    await second.close();
  }

  // 19. Review 2: "Your turn" (Fantasy Grounds turn-change toasts, R20-176) in a real
  // encounter started through Preparation, like the core combat journeys.
  {
    const third = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await third.newPage();
    page.on("pageerror", (error) => errors.push("review 2 turns: " + error.message));
    const button = (name) => page.getByRole("button", { name, exact: true });
    const role = async (r) => {
      await page.locator("#demo-role").selectOption(r);
      await page.waitForTimeout(200);
    };
    const bell = () => page.locator('.service-nav [data-service="requests"]');
    const openCentre = async () => {
      await bell().click();
      await page.locator("#dialog [data-notifications-centre]").waitFor();
    };
    const closeDialog = async () => {
      if (await page.locator("#dialog[open]").count())
        await page.locator("#dialog footer [data-close]").click();
    };
    const rowOf = (text) => page.locator("#dialog .notifications-item").filter({ hasText: text });
    const turnOf = () =>
      page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem("d20-studio-blueprint-v1"));
        return `${s.combat.order[s.combat.turn]}@${s.combat.round}`;
      });
    const endTurn = async () => {
      await page.locator('[data-table="end-turn"]').click();
      await page.waitForTimeout(250);
    };
    await page.goto(base + "#table");
    await button("Ripristina esempio").click();
    await button("Ripristina").click();
    await role("dm");
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
    check((await turnOf()) === "livia@1", "Livia does not start");
    await role("player");
    await openCentre();
    const firstTurn = (await rowOf("È il tuo turno: Livia").innerText()).replace(/\s+/g, " ");
    check(/Turni di combattimento.*Round 1/.test(firstTurn), "turn row: " + firstTurn);
    await page.locator("#dialog [data-notifications-preferences]").click();
    await page.locator('#dialog [name="cat-turns"]').selectOption("toast");
    await page.locator('#dialog [name="duration"]').fill("30");
    await button("Salva preferenze notifiche").click();
    await page.locator("#dialog [data-notifications-centre]").waitFor();
    await closeDialog();
    await page.locator("[data-select=livia]").click();
    await endTurn();
    check((await turnOf()) === "goblin-1@1", "not the Sentinel's turn");
    await openCentre();
    check(!(await rowOf("È il tuo turno").count()), "a finished turn is still listed");
    await closeDialog();
    await role("dm");
    await openCentre();
    check(!(await rowOf("È il tuo turno").count()), "the DM is told of a monster's turn");
    await closeDialog();
    await endTurn();
    await openCentre();
    check((await rowOf("È il tuo turno: Doran").count()) === 1, "Doran's turn for the DM");
    await closeDialog();
    await endTurn();
    await endTurn();
    check((await turnOf()) === "livia@2", "not Livia in round 2");
    await role("player");
    const turnToast = page.locator(".notifications-toast").filter({ hasText: "È il tuo turno" });
    await turnToast.waitFor();
    const toastText = (await turnToast.innerText()).replace(/\s+/g, " ");
    check(toastText.includes("Livia") && toastText.includes("Round 2"), "toast: " + toastText);
    await page.screenshot({ path: dir + "review2-your-turn-it-1440.png" });
    passed.push(
      `Review 2 P3: encounter started by the DM → player row “${firstTurn}”; it leaves when the turn ends; none for the DM on a monster's turn, “È il tuo turno: Doran” for the DM; round 2 pop-up for the player “${toastText}”`,
    );
    await third.close();
  }

  check(errors.length === 0, "Page errors: " + errors.join("; "));
  return { passed, notes, errors };
};
