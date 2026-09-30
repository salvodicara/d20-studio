async (rootPage) => {
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
  // B51 Sessions: recurrence, absences, seats and attendance. Real clicks, keys and taps in
  // the one app. (1) A weekly series of ten dates from Campaign → Sessions; one date moved
  // alone, then this-and-following moved and undone with the explicit correction. (2) The
  // player skips the next session three hours before it starts: warned, never blocked, the
  // DM notified; after the move the player's earlier answer is asked again; skipping is
  // distinct from leaving (Members → Leave campaign). (3) Two seats filled by guests the DM
  // records on their behalf, the player waitlisted first, a freed seat promotes the player
  // with a B24 notice. (4) Four hours later (browser clock) the DM records attendance,
  // corrects it with a reason, is offered Stars and wishes (B27) and writes the recap,
  // which shows the attendance to the party. Reload keeps everything. IT desktop 1440x900
  // (Europe/Rome), then EN phone 390x844 touch (Europe/London). Synthetic data; resets this
  // browser's demo state. Review additions (B51-rf): a date is never moved into the past;
  // a full session offers "Join the waitlist" (Warhorn); focus returns after a dialog; a
  // cancellation reason is shown to the player and a restored date asks again; the player
  // is told when the DM answers for them; the attendance sheet reads the evening at the
  // Table (B14). The clock starts at a fixed morning so that evening is the same day.
  // Run with: playwright-cli -s=d20-b51-rf run-code --filename=<this file>
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B51-rf/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    timezoneId: "Europe/Rome",
    locale: "it-IT",
  });
  const page = await context.newPage();
  await page.clock.install({ time: new Date("2026-10-08T07:50:00+02:00") });
  const passed = [];
  const errors = [];
  let mobile = null;
  page.on("pageerror", (error) => errors.push("desktop: " + error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const slice = async (p = page) => (await stored(p)).ext["sessions-plus"];
  const session = async (id, p = page) =>
    (await stored(p)).campaign.sessions.find((row) => row.id === id);
  const setRole = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForTimeout(120);
  };
  const toast = (p = page) => p.locator("#toast").innerText();
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const smallTargets = (selector, p = page) =>
    p.evaluate(
      (sel) =>
        [...document.querySelectorAll(sel)]
          .filter((el) => el.getClientRects().length && getComputedStyle(el).display !== "none")
          .map((el) => ({
            text: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 40),
            h: el.getBoundingClientRect().height,
            w: el.getBoundingClientRect().width,
          }))
          .filter((box) => box.h > 0 && (box.h < 40 || box.w < 40)),
      selector,
    );
  const styled = (p = page) =>
    p.waitForFunction(() =>
      [...document.styleSheets].some(
        (sheet) => sheet.href?.endsWith("/sessions-plus.css") && sheet.cssRules.length,
      ),
    );
  const row = (id, p = page) => p.locator(`.campaign-session:has([data-sp-session="${id}"])`);
  const submit = async (p = page) => {
    await p.locator("#dialog button[type=submit]").click();
    await p.waitForTimeout(120);
  };
  const dialogError = (p = page) => p.locator("#dialog .dialog-error").innerText();
  const sessionsTab = async (p = page) => {
    await p.locator('.campaign-sidebar [data-campaign-tab="sessions"]').click();
    await p.getByRole("heading", { name: "Sessioni", level: 1 }).waitFor();
  };
  const bellText = async (p = page) => {
    await p.locator('.service-nav [data-service="requests"]').click();
    await p.locator("#dialog [data-notifications-centre]").waitFor();
    const text = await p.locator("#dialog").innerText();
    return text;
  };
  const focusKey = (p = page) => p.evaluate(() => document.activeElement?.dataset?.spFocus ?? null);
  const closeDialog = async (p = page) => {
    await p.keyboard.press("Escape");
    await p.waitForTimeout(100);
  };
  // Local date and time strings in the page's time zone (the series zone).
  const localIn = (p, ms) =>
    p.evaluate((offset) => {
      const d = new Date(Date.now() + offset);
      const m = d.getMinutes();
      if (m % 30) d.setMinutes(m + (30 - (m % 30)), 0, 0);
      const pad = (n) => String(n).padStart(2, "0");
      return {
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      };
    }, ms);
  try {
    // ---------------------------------------------------------------------------------
    // Fresh demo state; Campaign → Sessions reached from the campaign page (sidebar).
    await page.goto(base + "#campaign");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await styled();
    await setRole("dm");
    await sessionsTab();
    check(
      (await page.locator(".sp-block h2").innerText()) === "Serie ricorrenti",
      "Series block missing for the DM",
    );
    // Refreshed by the hand-off writer (29/09/2026): the example always has «Il sigillo della
    // torre» on the coming Thursday (sample-clock.mjs); it is cancelled so the series' first
    // date is «the next session» the player answers.
    await page.locator('[data-campaign-cancel-session="session-sample-13"]').click();
    await page.locator('[data-campaign-path="data.reason"]').fill("Sostituita dalla serie");
    await page.locator("[data-campaign-save]").click();
    await page.locator("[data-campaign-apply]").click();
    await sessionsTab();

    // (1) Weekly series of ten dates -------------------------------------------------
    const first = await localIn(page, 7 * 24 * 3600e3);
    await page.getByRole("button", { name: "Nuova serie ricorrente…" }).click();
    await page.locator('#dialog input[name="title"]').fill("Giovedì a Bruma");
    await page.locator('#dialog input[name="startDate"]').fill(first.date);
    await page.locator('#dialog input[name="time"]').fill("21:00");
    check(
      (await page.locator('#dialog input[name="timeZone"]').inputValue()) === "Europe/Rome",
      "Series zone does not default to the viewer's zone",
    );
    await page.locator('#dialog input[name="frequency"][value="weekly"]').check();
    await page.locator('#dialog input[name="count"]').fill("10");
    await page.locator('#dialog input[name="seats"]').fill("2");
    await page.locator('#dialog input[name="guests"][value="sim-greta"]').check();
    await page.locator('#dialog input[name="guests"][value="sim-tomas"]').check();
    await page.locator("#dialog .sp-dates li").nth(9).waitFor();
    check((await page.locator("#dialog .sp-dates li").count()) === 10, "Preview is not ten dates");
    await page.locator("#dialog .sp-preview").scrollIntoViewIfNeeded();
    await page.screenshot({ path: shots + "b51-01-series-dialog-it-1440.png" });
    await submit();
    check((await toast()).includes("10 date programmate"), "Series toast missing");
    let sp = await slice();
    const ids = sp.series[0].sessionIds;
    check(ids.length === 10, "Series does not hold ten dates");
    const all = (await stored()).campaign.sessions;
    const dates = ids.map((id) => all.find((row) => row.id === id));
    check(
      dates.every((row) => row.status === "scheduled" && row.localTime.endsWith("T21:00")),
      "A date is not an agreed 21:00 session",
    );
    const days = dates.map((row) => Date.parse(row.localTime.slice(0, 10) + "T00:00Z"));
    check(
      days.slice(1).every((d, i) => d - days[i] === 7 * 24 * 3600e3),
      "Dates are not one week apart",
    );
    check(
      (await page.locator("[data-sp-series-card] .sp-cadence").innerText()).startsWith(
        "Ogni settimana",
      ),
      "Series card cadence",
    );
    check(
      (await page.locator("[data-sp-series]").count()) === 10,
      "Each date in Sessions carries the series block",
    );
    check(
      !(await row(ids[0]).locator(`[data-campaign-change-session="${ids[0]}"]`).isVisible()),
      "The core single-date button competes with the scope choice",
    );
    await page.screenshot({ path: shots + "b51-02-dm-series-it-1440.png" });
    passed.push(
      "DM: Campaign → Sessions → New recurring series: weekly, 10 dates previewed then created as ordinary campaign sessions one week apart at 21:00 Europe/Rome, each date in the same list with its series block",
    );

    // (2a) Player answers with the Sesh buttons, by mouse and keyboard -----------------
    await setRole("player");
    check(
      (await page.locator(".sp-mine h2").innerText()) === "La tua presenza",
      "Player card missing",
    );
    // The B23 palette reaches "Skip the next session" too.
    await page.keyboard.press("Control+k");
    await page.locator("#dialog [data-cmdk-input]").fill("Salto la prossima");
    await page.locator("#dialog .cmdk-option", { hasText: "Salto la prossima sessione" }).click();
    await page.waitForTimeout(120);
    check((await slice()).rsvps[ids[0]].player.status === "skipping", "Palette skip not stored");
    check(
      (await page.locator(".sp-mine [data-sp-mine]").innerText()).includes("Salta"),
      "Card does not show the palette skip",
    );
    await row(ids[0]).locator(`[data-sp-focus="row-${ids[0]}-attending"]`).click();
    check((await slice()).rsvps[ids[0]].player.status === "attending", "Click answer not stored");
    await row(ids[0]).locator(`[data-sp-focus="row-${ids[0]}-maybe"]`).focus();
    await page.keyboard.press("Enter");
    check((await slice()).rsvps[ids[0]].player.status === "maybe", "Keyboard Enter answer");
    check(
      (await page.evaluate(() => document.activeElement?.dataset?.spFocus)) ===
        `row-${ids[0]}-maybe`,
      "Focus did not return to the pressed answer after the re-render",
    );
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Space");
    check((await slice()).rsvps[ids[0]].player.status === "attending", "Keyboard Space answer");
    check(
      (await row(ids[0])
        .locator(`[data-sp-focus="row-${ids[0]}-attending"]`)
        .getAttribute("aria-pressed")) === "true",
      "Pressed state not announced",
    );
    check(
      !(await page.locator('[data-sp-act="edit"], [data-sp-act="behalf"]').count()),
      "Player sees organizer controls",
    );
    passed.push(
      "Player: “Salto la prossima sessione” from the B23 palette (Ctrl+K); Partecipo / Forse / Salto buttons by click, Enter and Space; aria-pressed; focus returns to the pressed control; no organizer controls",
    );

    // (1b) + (2b) The DM moves only the first date to three hours from now --------------
    await setRole("dm");
    const soon = await localIn(page, 3 * 3600e3);
    const yesterday = await localIn(page, -24 * 3600e3);
    await row(ids[0]).locator('[data-sp-act="edit"]').click();
    check(
      await page.locator('#dialog input[name="scope"][value="one"]').isChecked(),
      "Scope does not default to only this date",
    );
    await page.locator('#dialog input[name="date"]').fill(yesterday.date);
    await page.locator("#dialog button[type=submit]").click();
    check((await dialogError()).includes("già passata"), "A date moved into the past was accepted");
    check(
      (await session(ids[0])).localTime === dates[0].localTime,
      "A refused move changed the date",
    );
    await page.locator('#dialog input[name="date"]').fill(soon.date);
    await page.locator('#dialog input[name="time"]').fill(soon.time);
    await submit();
    let moved = await session(ids[0]);
    check(moved.localTime === `${soon.date}T${soon.time}`, "Single date not moved");
    check(
      (await session(ids[1])).localTime === dates[1].localTime,
      "Moving one date moved another",
    );
    await setRole("player");
    check(
      (await row(ids[0]).locator("[data-sp-reask]").innerText()).includes("conferma di nuovo"),
      "Moved session does not ask again",
    );
    check(
      (await row(ids[0]).locator('[data-sp-person="player"]').innerText()).includes(
        "Da riconfermare",
      ),
      "Stale answer still counted",
    );
    const reask = await bellText();
    check(reask.includes("Conferma di nuovo: «Giovedì a Bruma»"), "No re-ask notice in B24");
    await page.screenshot({ path: shots + "b51-03-player-reask-bell-it-1440.png" });
    await closeDialog();
    passed.push(
      "Review: moving a date into the past is refused in the dialog (“la nuova data è già passata”), nothing moves",
    );
    passed.push(
      "DM moves only date 1 (scope “Solo questa data”): the other nine keep their time; the player's earlier answer becomes “Da riconfermare” with a row notice and a B24 “Conferma di nuovo” notice (StartPlaying's carried-over skip trap avoided)",
    );

    // (2c) Skip the next one, three hours before: warned, not blocked -------------------
    await page.locator('[data-sp-focus="next-skipping"]').click();
    check((await toast()).includes("La sessione inizia fra 3 ore"), "No late warning toast");
    sp = await slice();
    check(
      sp.rsvps[ids[0]].player.status === "skipping" && sp.rsvps[ids[0]].player.late === true,
      "Late skip not recorded",
    );
    check(await row(ids[0]).locator("[data-sp-late]").isVisible(), "Row late notice missing");
    check(await page.locator(".sp-mine .sp-late").isVisible(), "Card late notice missing");
    await row(ids[0]).locator('[data-sp-act="note"]').click();
    await page.locator('#dialog textarea[name="note"]').fill("Imprevisto al lavoro, mi spiace");
    await submit();
    check(
      (await slice()).rsvps[ids[0]].player.note === "Imprevisto al lavoro, mi spiace",
      "Note to the DM not saved",
    );
    await page.locator(".sp-mine").scrollIntoViewIfNeeded();
    await page.screenshot({ path: shots + "b51-04-player-late-skip-it-1440.png" });
    // Skipping is not leaving: the leave path is B13's own, from Members.
    await page.getByRole("button", { name: "Esci dalla campagna…" }).click();
    await page.locator('[data-cm="leave"]').first().waitFor();
    const state = await stored();
    check(
      !state.campaign.members || state.campaign.members.some((m) => m.id === "player"),
      "Skipping removed the player from the campaign",
    );
    await sessionsTab();
    await setRole("dm");
    const dmBell = await bellText();
    check(
      dmBell.includes("Giocatore · Livia, Mira salta «Giovedì a Bruma»") &&
        dmBell.includes("A ridosso: mancavano 3 ore") &&
        dmBell.includes("Imprevisto al lavoro"),
      "DM did not get the late-skip notice with the message",
    );
    await closeDialog();
    check(
      (await row(ids[0]).locator('[data-sp-person="player"]').innerText()).includes(
        "Imprevisto al lavoro",
      ),
      "DM does not read the player's message",
    );
    passed.push(
      "Player “Salto la prossima” 3 hours before the start: recorded (no block), warning toast and notices in the row and card, optional message to the DM; the DM gets a B24 notice “salta … A ridosso: mancavano 3 ore” with the message. “Esci dalla campagna…” opens Members (B13) where leaving is a separate step; the player is still a member",
    );

    // (3) Seats and waitlist -----------------------------------------------------------
    const second = ids[1];
    const behalf = async (person, status, reason) => {
      await row(second).locator('[data-sp-act="behalf"]').click();
      await page.locator('#dialog select[name="person"]').selectOption(person);
      await page.locator('#dialog select[name="status"]').selectOption(status);
      await page.locator('#dialog input[name="reason"]').fill(reason);
      await submit();
    };
    // The reason is required: the dialog stays open with the message.
    await row(second).locator('[data-sp-act="behalf"]').click();
    await page.locator('#dialog select[name="person"]').selectOption("sim-greta");
    await page.locator('#dialog input[name="reason"]').fill("   ");
    await page.locator("#dialog button[type=submit]").click();
    check((await dialogError()).includes("Scrivi perché"), "Empty reason accepted");
    await closeDialog();
    await behalf("sim-greta", "attending", "Ha risposto su Discord");
    // Tomas by keyboard: focus comes back to the opener after the dialog closes.
    await row(second).locator('[data-sp-act="behalf"]').focus();
    await page.keyboard.press("Enter");
    await page.locator('#dialog select[name="person"]').selectOption("sim-tomas");
    await page.locator('#dialog select[name="status"]').selectOption("attending");
    await page.locator('#dialog input[name="reason"]').fill("Ha risposto su Discord");
    await page.locator('#dialog input[name="reason"]').press("Enter");
    await page.waitForTimeout(150);
    check(
      (await focusKey()) === `row-${second}-behalf`,
      "Focus did not return to “Risposta per conto di…” after the dialog",
    );
    const counts = await row(second).locator("[data-sp-counts]").innerText();
    check(counts.includes("Posti: 2 su 2") && counts.includes("completo"), "Seats not full");
    await setRole("player");
    const join = row(second).locator(`[data-sp-focus="row-${second}-attending"]`);
    check(
      (await join.innerText()) === "Mettimi in lista d’attesa",
      "A full session does not offer the waitlist by name (Warhorn)",
    );
    await join.click();
    check((await toast()).includes("lista d’attesa, 1°"), "No waitlist toast");
    check(
      (await join.innerText()) === "In lista d’attesa (1°)" &&
        (await join.getAttribute("aria-pressed")) === "true",
      "The pressed answer does not say it is the waitlist",
    );
    check(
      (await row(second).locator('[data-sp-person="player"]').innerText()).includes(
        "In lista d’attesa (1°)",
      ),
      "Waitlist position not shown",
    );
    await row(second).scrollIntoViewIfNeeded();
    await page.screenshot({ path: shots + "b51-05-player-waitlist-it-1440.png" });
    await setRole("dm");
    await behalf("sim-tomas", "skipping", "Ha scritto che non riesce");
    check((await toast()).includes("Posto libero: Giocatore · Livia, Mira"), "No promotion toast");
    await setRole("player");
    check(
      (await slice()).rsvps[second].player.status === "attending",
      "Freed seat did not go to the first waitlisted",
    );
    check(
      (await row(second).locator('[data-sp-person="player"]').innerText()).includes("Partecipa"),
      "Row does not show the promotion",
    );
    const seatBell = await bellText();
    check(seatBell.includes("Si è liberato un posto"), "No freed-seat notice");
    await page.screenshot({ path: shots + "b51-06-player-seat-notice-it-1440.png" });
    await closeDialog();
    await row(second).locator("details.sp-log summary").click();
    const logText = await row(second).locator("details.sp-log").innerText();
    check(
      logText.includes("dalla lista d’attesa a Partecipa") &&
        !logText.includes("Ha scritto che non riesce"),
      "Log wrong or leaks the DM's reasons about others to the player",
    );
    passed.push(
      "Seats 2: the DM records Greta and Tomas on their behalf (reason required, empty refused in the dialog; by keyboard focus returns to the opener), the session is full and the player's button reads “Mettimi in lista d’attesa” (Warhorn), then “In lista d’attesa (1°)”; Tomas skipping frees the seat and the player is promoted first-in-first-out, with a toast for the DM and a B24 “Si è liberato un posto” notice for the player; the log shows the steps without the DM's reasons about others",
    );

    // (1c) This and all following, then the explicit correction ----------------------
    await setRole("dm");
    const third = ids[2];
    await row(third).locator('[data-sp-act="edit"]').click();
    await page.locator('#dialog input[name="scope"][value="future"]').check();
    check(
      (await page.locator("#dialog").innerText()).includes("Questa e tutte le successive (8)"),
      "Scope does not count the following dates",
    );
    await page.locator('#dialog input[name="time"]').fill("20:30");
    await page.screenshot({ path: shots + "b51-07-edit-following-dialog-it-1440.png" });
    await submit();
    let times = [];
    for (const id of ids) times.push((await session(id)).localTime.slice(11));
    check(
      times[1] === "21:00" && times.slice(2).every((t) => t === "20:30"),
      "This-and-following edit wrong: " + times.join(","),
    );
    const revert = page.locator('[data-sp-series-card] [data-sp-act="revert"]');
    check(
      (await revert.innerText()).includes("orario di 8 date"),
      "Correction button does not say what it undoes",
    );
    await revert.click();
    check((await toast()).includes("correzione registrata"), "Correction toast missing");
    times = [];
    for (const id of ids.slice(2)) times.push((await session(id)).localTime.slice(11));
    check(
      times.every((t) => t === "21:00"),
      "Correction did not restore 21:00",
    );
    check(
      (await session(ids[9])).history.length === 3,
      "Move and correction are not both in the core history",
    );
    passed.push(
      "DM edits date 3 with “Questa e tutte le successive (8)”: dates 3–10 move to 20:30, 1–2 unchanged; “Annulla l’ultima modifica (orario di 8 date)” restores 21:00 as a recorded correction (both steps in each session's history)",
    );

    // Review: a cancellation reason reaches the player; a restored date asks again; the
    // player is told when the DM records their answer.
    const fourth = ids[3];
    await setRole("player");
    await row(fourth).locator(`[data-sp-focus="row-${fourth}-attending"]`).click();
    await setRole("dm");
    await row(fourth).locator('[data-sp-act="cancel"]').click();
    await page.locator('#dialog input[name="reason"]').fill("Festa di Mira");
    await submit();
    await setRole("player");
    check(
      (await row(fourth).locator("[data-sp-cancel-reason]").innerText()).includes(
        "Motivo dell’annullamento: Festa di Mira",
      ),
      "The player does not see the cancellation reason",
    );
    await row(fourth).locator("details.sp-log summary").click();
    check(
      (await row(fourth).locator("details.sp-log").innerText()).includes("Festa di Mira"),
      "The log hides the cancellation reason from the player",
    );
    await setRole("dm");
    await row(fourth).locator('[data-sp-act="restore"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(150);
    check((await session(fourth)).status === "scheduled", "Date not restored");
    check(
      (await focusKey()) === `row-${fourth}-edit`,
      "Focus lost after restoring (expected the date's Modifica…)",
    );
    await setRole("player");
    check(
      (await row(fourth).locator("[data-sp-reask]").innerText()).includes(
        "di nuovo in programma",
      ) &&
        (await row(fourth).locator('[data-sp-person="player"]').innerText()).includes(
          "Da riconfermare",
        ),
      "A restored date does not ask again",
    );
    const restoreBell = await bellText();
    check(
      restoreBell.includes("prima dell’annullamento: rispondi di nuovo"),
      "No B24 notice asking again after the restore",
    );
    await closeDialog();
    await setRole("dm");
    const fifth = ids[4];
    await row(fifth).locator('[data-sp-act="behalf"]').click();
    await page.locator('#dialog select[name="person"]').selectOption("player");
    await page.locator('#dialog select[name="status"]').selectOption("maybe");
    await page.locator('#dialog input[name="reason"]').fill("Me l’ha detto a voce");
    await submit();
    await setRole("player");
    const recordedBell = await bellText();
    check(
      recordedBell.includes("Risposta registrata per te") &&
        recordedBell.includes("Me l’ha detto a voce"),
      "The player is not told about an answer recorded for them",
    );
    await page.screenshot({ path: shots + "b51-rf-01-player-restore-recorded-bell-it-1440.png" });
    await closeDialog();
    passed.push(
      "Review: the DM cancels a date the player had accepted with a reason: the player reads “Motivo dell’annullamento: Festa di Mira” in the row and the log; “Ripristina questa data” (keyboard, focus lands on the date's Modifica…) asks again: “Da riconfermare”, row notice and B24 “… prima dell’annullamento: rispondi di nuovo”; an answer the DM records for the player reaches them as “Risposta registrata per te” with the reason",
    );

    // Reload keeps every answer, seat and change.
    await page.reload();
    await styled();
    await page.getByRole("heading", { name: "Sessioni", level: 1 }).waitFor();
    await setRole("player");
    check(
      (await row(ids[0]).locator('[data-sp-person="player"]').innerText()).includes("Salta") &&
        (await row(second).locator('[data-sp-person="player"]').innerText()).includes("Partecipa"),
      "Reload lost answers",
    );
    passed.push("Reload keeps the series, answers, waitlist promotion and correction");
    // Offline (simulated): a shared answer is refused with a message and nothing changes.
    const offlineBox = async (on) => {
      await page.locator('[data-service="preferences"]').click();
      const box = page.locator('#dialog [name="offline"]');
      if (on) await box.check();
      else await box.uncheck();
      await submit();
    };
    await offlineBox(true);
    await row(third).locator(`[data-sp-focus="row-${third}-maybe"]`).click();
    check((await toast()).includes("Sei senza rete"), "Offline answer not refused");
    check(!(await slice()).rsvps[third]?.player, "Offline answer changed shared data");
    await offlineBox(false);
    passed.push(
      "Offline (simulated): an answer is refused with “Sei senza rete…” and no data changes",
    );

    // (4) Four hours later: attendance, correction, Stars and wishes, recap ------------
    await page.clock.setSystemTime(new Date((await page.evaluate(() => Date.now())) + 4 * 3600e3));
    await page.reload();
    await styled();
    await setRole("dm");
    check(
      (await page.locator(".sp-pending").innerText()).includes("Presenze da registrare"),
      "The DM is not reminded to record attendance",
    );
    // The evening at the Table (B14): the player is away before it starts, the DM starts
    // it and it links today's series date.
    await setRole("player");
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await page.locator('.session-view-hud [data-sv="group"]').click();
    await page.locator("#dialog input[name=status][value=away]").check();
    await page.locator("#dialog input[name=message]").fill("Febbre");
    await page.getByRole("button", { name: "Aggiorna il mio stato", exact: true }).click();
    await page.waitForTimeout(150);
    await setRole("dm");
    await openTablePanel(page, "session-view-controls"); // B62: Scene › Session
    await page.getByRole("button", { name: "Avvia sessione", exact: true }).click();
    await page.waitForTimeout(200);
    const evening = (await stored()).ext["session-view"].sessions.at(-1);
    check(
      evening.status === "live" && evening.campaignSessionId === ids[0],
      "The evening at the Table is not linked to the series date",
    );
    await page.goto(base + "#campaign?tab=sessions");
    await page.getByRole("heading", { name: "Sessioni", level: 1 }).waitFor();
    await row(ids[0]).locator('[data-sp-act="attendance"]').click();
    check(
      (await page.locator("#dialog").innerText()).includes("dalla serata al Tavolo") &&
        (await page
          .locator("#dialog .sp-attendee", { hasText: "Livia" })
          .locator("[data-sp-table-hint]")
          .innerText()) === "Al Tavolo: assente per tutta la serata — Febbre",
      "The attendance sheet does not read the evening at the Table",
    );
    await page.locator("#dialog [data-sp-table-hint]").first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: shots + "b51-rf-02-attendance-table-hint-it-1440.png" });
    check(
      await page.locator('#dialog input[name="status-player"][value="absent"]').isChecked(),
      "A skip does not suggest absent",
    );
    check(
      await page.locator('#dialog input[name="status-dm"][value="present"]').isChecked(),
      "The DM is not suggested present",
    );
    await page.locator('#dialog input[name="status-sim-tomas"][value="absent"]').check();
    await page.locator('#dialog input[name="note-sim-tomas"]').fill("Non si è collegato");
    await page.screenshot({ path: shots + "b51-08-attendance-dialog-it-1440.png" });
    await submit();
    sp = await slice();
    check(
      sp.attendance[ids[0]].records["sim-tomas"].status === "absent" &&
        sp.attendance[ids[0]].records.player.status === "absent",
      "Attendance not recorded",
    );
    await row(ids[0]).getByRole("button", { name: "Correggi presenze…" }).click();
    await page.locator('#dialog input[name="status-sim-tomas"][value="present"]').check();
    await page.locator('#dialog input[name="note-sim-tomas"]').fill("Arrivato alle 22");
    await page.locator("#dialog button[type=submit]").click();
    check(
      await page.locator("#dialog[open]").isVisible(),
      "Correction without a reason closed the dialog",
    );
    await page.locator('#dialog input[name="reason"]').fill("Era solo in ritardo");
    await submit();
    sp = await slice();
    check(
      sp.attendance[ids[0]].revision === 2 &&
        sp.attendance[ids[0]].history[0].records["sim-tomas"].status === "absent",
      "Correction did not keep the earlier version",
    );
    const attendance = await row(ids[0]).locator(".sp-attendance").innerText();
    check(attendance.includes("1 correzione"), "Correction count missing");
    check(
      (await row(ids[0]).locator(".sp-stars").innerText()).includes("Fine sessione"),
      "Stars and wishes not offered at the end of the session",
    );
    await row(ids[0]).scrollIntoViewIfNeeded();
    await page.screenshot({ path: shots + "b51-09-attendance-stars-it-1440.png" });
    passed.push(
      "Four hours later (browser clock): Sessions reminds “Presenze da registrare”; the player was away at the Table (B14 “Febbre”) and the DM started the evening, linked to date 1: the sheet says “suggerite dalle risposte e dalla serata al Tavolo” and shows “Al Tavolo: assente per tutta la serata — Febbre”; it suggests the skip as absent and the DM present; saved; a correction without a reason is refused, with a reason it saves version 2 and keeps version 1",
    );
    await row(ids[0]).locator('[data-sp-act="stars"]').click();
    await page.locator('[data-safety-act="open-round"]').first().click();
    await page.waitForTimeout(150);
    const safety = (await stored()).ext.safety.campaigns.lanterns.rounds;
    check(safety.at(-1).closedAt === null, "B27 round not opened");
    await sessionsTab();
    check(
      (await row(ids[0]).locator(".sp-stars").innerText()).includes("raccolta aperta"),
      "Open round not reflected in Sessions",
    );
    await setRole("player");
    check(
      (await row(ids[0]).locator(".sp-stars").innerText()).includes(
        "Il DM chiede stelle e desideri",
      ),
      "Player not offered Stars and wishes",
    );
    await row(ids[0]).locator('[data-sp-act="stars"]').click();
    await page.locator('[data-safety-dialog="star-wish"]').first().waitFor();
    passed.push(
      "End of session: the DM's row offers Stars and wishes (B27 tools), which opens B27's own collection; the row then says it is open and the player's row leads to “Scrivi stelle e desideri”",
    );
    // Recap written from the session shows the attendance, also to the party.
    await sessionsTab();
    await setRole("dm");
    await page.locator(`[data-campaign-session-recap="${ids[0]}"]`).click();
    await page.locator('[data-campaign-path="data.title"]').fill("La lanterna spenta");
    await page
      .locator('[data-campaign-path="data.body"]')
      .fill("Il gruppo ha trovato la torre vuota.");
    await page.locator('[data-campaign-access-mode="access"]').selectOption("campaign");
    await page.locator("[data-campaign-save]").click();
    await page.locator("[data-campaign-apply]").click();
    await page.locator(".sp-recap").waitFor();
    const recap = await page.locator(".sp-recap").innerText();
    check(
      recap.includes("Presenze della sessione") &&
        recap.includes("Tomas Ferri (ospite)") &&
        /Assenti:\s*Giocatore · Livia, Mira/.test(recap),
      "Recap attendance wrong: " + recap,
    );
    await page.screenshot({ path: shots + "b51-10-recap-attendance-it-1440.png" });
    await setRole("player");
    await page.locator(".sp-recap").waitFor();
    const playerRecap = await page.locator(".sp-recap").innerText();
    check(
      playerRecap.includes("Presenti") && !playerRecap.includes("Arrivato alle 22"),
      "Player recap missing attendance or showing organizer notes",
    );
    passed.push(
      "“Scrivi resoconto” from the session: the recap shared with the campaign group shows present/absent; the player reads it without the organizer's attendance notes",
    );
    await sessionsTab();
    const deskSmall = await smallTargets(
      ".sp-overview button, .sp-row button, .sp-row summary, .sp-block button",
    );
    check(!deskSmall.length, "Small desktop targets: " + JSON.stringify(deskSmall));
    check(await noOverflow(), "Desktop Sessions overflows");
    passed.push("Desktop: every area control ≥ 40 px, no horizontal overflow");
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
    const deviceNow = await page.evaluate(() => Date.now());

    // ---------------------------------------------------------------------------------
    // EN phone 390x844, touch, Europe/London: the same synthetic state on another device.
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      timezoneId: "Europe/London",
      locale: "en-GB",
    });
    await phone.addInitScript(
      ([k, value]) => {
        if (!sessionStorage.getItem("b51-seeded")) {
          localStorage.setItem(k, value);
          sessionStorage.setItem("b51-seeded", "1");
        }
      },
      [key, snapshot],
    );
    mobile = await phone.newPage();
    await mobile.clock.install({ time: new Date(deviceNow) });
    mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
    await mobile.goto(base + "#campaign?tab=sessions");
    await styled(mobile);
    await mobile.locator('[data-service="preferences"]').tap();
    await mobile.locator('#dialog [name="lang"]').selectOption("en");
    await mobile.locator("#dialog button[type=submit]").tap();
    await mobile.getByRole("heading", { name: "Sessions", level: 1 }).waitFor();
    check(
      (await mobile.locator(".sp-mine h2").innerText()) === "Your attendance",
      "Phone card not in English",
    );
    check(
      (await mobile.locator(".sp-mine").innerText()).includes("Skip the next one") &&
        (await mobile.locator(".sp-mine").innerText()).includes("Leave campaign…"),
      "Phone skip/leave controls missing",
    );
    await row(third, mobile).locator(`[data-sp-focus="row-${third}-maybe"]`).tap();
    check((await toast(mobile)).includes("Answer recorded"), "Phone answer toast");
    check((await slice(mobile)).rsvps[third].player.status === "maybe", "Phone tap did not answer");
    check(
      (await row(third, mobile).locator('[data-sp-person="player"]').innerText()).includes("Maybe"),
      "Phone row not updated",
    );
    check(
      (await row(third, mobile).locator(".campaign-meta").first().innerText()).includes(
        "Europe/Rome",
      ),
      "Agreed time zone not shown on the London device",
    );
    const phoneSmall = await smallTargets(
      ".sp-overview button, .sp-row button, .sp-row summary",
      mobile,
    );
    check(!phoneSmall.length, "Small phone targets: " + JSON.stringify(phoneSmall));
    check(await noOverflow(mobile), "Phone Sessions overflows");
    await row(third, mobile).scrollIntoViewIfNeeded();
    await mobile.screenshot({ path: shots + "b51-11-phone-en-390.png" });
    passed.push(
      "EN phone 390 (London): “Your attendance” with “Skip the next one” and “Leave campaign…”, a tap answers Maybe, the agreed Rome time stays visible, targets ≥ 40 px, no overflow",
    );
    check(errors.length === 0, "Page errors: " + errors.join("; "));
    await phone.close();
    await context.close();
    return { passed, errors };
  } catch (error) {
    await page.screenshot({ path: shots + "b51-failure-desktop.png" }).catch(() => {});
    if (mobile) await mobile.screenshot({ path: shots + "b51-failure-phone.png" }).catch(() => {});
    throw Error(error.message + " | passed so far: " + passed.join(" / "));
  }
};
