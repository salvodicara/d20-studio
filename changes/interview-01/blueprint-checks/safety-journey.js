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
  // B62: campaign sections sit in Kanka-style groups; a folded group is opened first.
  const openCampaignSection = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const link = page.locator(`.campaign-sidebar nav [data-campaign-tab="${id}"]`);
    await link.waitFor({ state: "attached" });
    const toggle = page.locator(
      `.campaign-sidebar [data-campaign-group]:has([data-campaign-tab="${id}"]) [data-campaign-group-toggle]`,
    );
    if ((await toggle.getAttribute("aria-expanded")) === "false") await press(toggle);
    await press(link);
  };
  // B27 Table safety: lines and veils in the profile with the anonymous combined list,
  // DM expectations sheet + session zero outline reminded before the session without a
  // trace, anonymous Stop flashing on the DM view and group notice without names, named
  // raise-hand queue (click and Mod+Shift+U), Undo that never removes a Stop, withdrawal,
  // stars and wishes, marked map blurred for a matching personal filter with Show (mouse
  // and keyboard). Review fixes: the reminder waits for a pending X-card, the X-card moves
  // inside an open dialog and docks at the top of the map after its flash, the drawer
  // brings Stop into view, Stop cannot be unticked, anonymous notices keep no originator,
  // every action confirms. Second review: one notification surface (B24 centre and
  // pop-ups with each person's setting; B27 draws only the DM's X-card, docked clear of
  // pop-ups), lines and veils always on, 'Marca una mappa' follows the chosen map, an
  // offline profile edit waits for its device to be back online.
  // IT desktop 1440x900, then an EN 390x844 touch context. Synthetic data;
  // resets this browser's demo state. Run with: playwright-cli -s=d20-b27 run-code
  // --filename=<this file> from the evidence directory.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const deviceKey = "d20-studio-safety-device-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B27/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  const findings = [];
  page.on("pageerror", (error) => errors.push("desktop: " + error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const button = (name, p = page) => p.getByRole("button", { name, exact: true });
  // B61: Safety is a tab of the Table's sidebar, remembered per identity: open it only
  // when it is not the open tab already (a second press would return to the Creature tab).
  // B62: Safety is a sub-tab of the Chat tab (with the Log and the Dice).
  const openSafety = async (p, tap = false) => {
    await openTablePanel(p, "safety", tap);
  };
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const safety = async (p = page) => (await stored(p)).ext.safety;
  const campaignData = async (p = page) => (await safety(p)).campaigns.lanterns;
  const setRole = (value, p = page) => p.locator("#demo-role").selectOption(value);
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const toast = (p = page) => p.locator("#toast").innerText();
  // Area stylesheets are linked when the areas register: wait for ours before images.
  const styled = (p = page) =>
    p.waitForFunction(() =>
      [...document.styleSheets].some(
        (sheet) => sheet.href?.endsWith("/safety.css") && sheet.cssRules.length,
      ),
    );
  const dialogOpen = (p = page) =>
    p.evaluate(() => document.querySelector("#dialog")?.open === true);
  // B62: Safety sits in the «Gioco» group of the campaign rail (folded by default).
  const sidebar = (tab, p = page) => ({ click: () => openCampaignSection(p, tab) });
  const smallTargets = (selector, p = page) =>
    p.evaluate(
      (sel) =>
        [...document.querySelectorAll(sel)]
          .filter((el) => el.offsetParent !== null || el.getBoundingClientRect().height > 0)
          .map((el) => ({
            text: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 40),
            h: el.getBoundingClientRect().height,
            w: el.getBoundingClientRect().width,
          }))
          .filter((box) => box.h > 0 && (box.h < 40 || box.w < 40)),
      selector,
    );
  // The pre-session reminder opens by itself when an identity joins the Table.
  const acceptReminder = async (p, title, accept, shot = null) => {
    const opened = await p
      .locator("#dialog[open] h2", { hasText: title })
      .waitFor({ timeout: 2500 })
      .then(() => true)
      .catch(() => false);
    if (opened && shot) await p.screenshot({ path: shot });
    // Scoped to the dialog: other areas may show a button with the same label (home tips).
    if (opened)
      await p.locator("#dialog").getByRole("button", { name: accept, exact: true }).click();
    return opened;
  };

  let mobile = null;
  try {
    // ---------------------------------------------------------------------------------
    // A. Player profile: a line and a veil (keyboard + mouse), refusal, correction, then
    // the campaign's combined list without names; reload keeps it; the DM sees no names.
    await page.goto(base);
    await page.evaluate(
      ([k, d]) => {
        localStorage.removeItem(k);
        localStorage.removeItem(d);
      },
      [key, deviceKey],
    );
    await page.reload();
    await page.locator("#content").waitFor();
    let clicks = 0;
    const openCampaign = page.getByRole("button", { name: "Apri campagna", exact: true }).first();
    if (await openCampaign.count()) {
      await openCampaign.click();
      clicks++;
    } else {
      await page.goto(base + "#campaign");
      findings.push("Home has no 'Apri campagna' button: opened #campaign directly");
    }
    await sidebar("safety").click();
    clicks++;
    await page.getByRole("heading", { name: "Sicurezza del tavolo", level: 1 }).waitFor();
    await button("Il mio profilo di sicurezza").click();
    clicks++;
    await page.getByRole("heading", { name: "Sicurezza", level: 1, exact: true }).waitFor();
    check(page.url().includes("#safety-profile"), "Profile route not reached: " + page.url());
    check(clicks <= 3, "Profile needs more than 3 clicks from Home");
    const lineInput = page.locator('[data-safety-input="lines"]');
    await lineInput.fill("Ragni");
    await lineInput.press("Enter");
    await page.locator('[data-safety-own="lines"] li', { hasText: "Ragni" }).waitFor();
    check(
      (await page.evaluate(() => document.activeElement?.dataset?.safetyInput)) === "lines",
      "Focus did not return to the line field after Enter",
    );
    await lineInput.fill("Insetti e sciami");
    await button("Aggiungi linea").click();
    await button("Togli Insetti e sciami dalle linee").click();
    await page
      .locator('[data-safety-own="lines"] li', { hasText: "Insetti" })
      .waitFor({ state: "detached" });
    const veilInput = page.locator('[data-safety-input="veils"]');
    await veilInput.fill("Annegamento prolungato");
    await button("Aggiungi velo").click();
    await page
      .locator('[data-safety-own="veils"] li', { hasText: "Annegamento prolungato" })
      .waitFor();
    await veilInput.fill("ragni");
    await button("Aggiungi velo").click();
    check(
      (await toast()).includes("È già tra le tue linee"),
      "Line/veil conflict not refused: " + (await toast()),
    );
    let data = await stored();
    const own = data.ext.safety.profiles.player;
    check(
      own.lines.length === 1 &&
        own.lines[0].topic === "spiders" &&
        own.veils.length === 1 &&
        own.veils[0].custom === "Annegamento prolungato",
      "Profile not stored as one line (spiders) and one custom veil: " + JSON.stringify(own),
    );
    check(
      data.log.slice(-4).every((entry) => entry.visibility === "private"),
      "Profile edits are not private in the log",
    );
    passed.push(
      "Profile reached in 3 clicks; line by Enter (focus kept), veil by click, cross-list refusal, wrong line removed",
    );

    await button("Vedi l’elenco combinato della campagna").click();
    const combined = page.locator("[data-safety-combined]");
    await combined.waitFor();
    const combinedText = async () => combined.innerText();
    let text = await combinedText();
    for (const topic of ["Ragni", "Violenza sui bambini", "Annegamento prolungato", "Tortura"])
      check(text.includes(topic), `Combined list misses ${topic}: ${text}`);
    for (const name of ["Livia", "Giocatore", "DM"])
      check(!text.includes(name), `Combined list names ${name}`);
    await page.reload();
    await combined.waitFor();
    check(
      (await combinedText()).includes("Annegamento prolungato"),
      "Reload lost the veil in the combined list",
    );
    await styled(page);
    await page.screenshot({ path: shots + "b27-01-combined-list-it.png", fullPage: true });
    await setRole("dm");
    await combined.waitFor();
    text = await combinedText();
    check(
      text.includes("Ragni") && !/Livia|Giocatore/.test(text),
      "DM view of the combined list is wrong or names people",
    );
    await button("Il mio profilo di sicurezza").click();
    await page.locator('[data-safety-own="lines"]').waitFor();
    check(
      !(await page.locator('[data-safety-own="lines"]').innerText()).includes("Ragni"),
      "The DM reads the player's profile",
    );
    passed.push(
      "Combined list shows 2 lines + 2 veils without names (player and DM), survives reload; the DM's profile page shows only the DM's own entries",
    );

    // ---------------------------------------------------------------------------------
    // B. DM expectations sheet (tool required to share) and session zero outline; the
    // player reads them; reminder before the session, once, leaving no shared trace.
    await button("Torna indietro").click();
    await button("Modifica aspettative").click();
    const dlg = page.locator("#dialog");
    await dlg
      .locator('[name="welcome"]')
      .fill("Esplorazione, intrighi fra le famiglie di Bruma, combattimenti tattici.");
    await dlg.locator('[name="warnings-custom"]').fill("Cadaveri");
    await dlg.locator('[name="sessionWarnings"]').fill("Una scena nella cripta sotto la torre.");
    // Stop is locked on (Alchemy, Roll20): unticking every other tool still shares Stop.
    // Lines and veils too: they come from each member's profile (Alchemy, SVC-073).
    for (const tool of ["stop", "lines"]) {
      const box = dlg.locator(`input[name="tools"][value="${tool}"]`);
      check(
        (await box.isChecked()) && (await box.isDisabled()),
        `${tool} is not locked on in the sheet`,
      );
    }
    check(
      (await dlg.locator("#safety-tools-note").innerText()).includes("sparisce dalle carte"),
      "The sheet does not say what unticking a tool does",
    );
    for (const box of await dlg.locator('input[name="tools"]:not([disabled])').all())
      await box.uncheck();
    await dlg.locator('[name="shared"]').check();
    await button("Salva aspettative").click();
    await page.locator(".safety-status", { hasText: "Condivise con il gruppo" }).waitFor();
    check(
      (await campaignData()).expectations.tools.join() === "stop,lines",
      "Unticking every tool did not keep exactly Stop and lines/veils",
    );
    await button("Modifica aspettative").click();
    for (const tool of ["pace", "hand", "stars"])
      await dlg.locator(`input[name="tools"][value="${tool}"]`).check();
    await dlg.locator('[name="remind"]').check();
    await button("Salva aspettative").click();
    await page.locator(".safety-status", { hasText: "Condivise con il gruppo" }).waitFor();
    check(
      await page.locator(".safety-status", { hasText: "Ricordate prima di ogni sessione" }).count(),
      "Reminder badge missing",
    );
    await button("Aggiorna traccia").click();
    await dlg.locator('[name="limits-done"]').check();
    await dlg
      .locator('[name="limits-note"]')
      .fill("Raccolti nel profilo di ciascuno, elenco anonimo.");
    await dlg.locator('[name="absence-done"]').check();
    await dlg.locator('[name="absence-note"]').fill("Il DM guida il personaggio assente.");
    await button("Salva traccia").click();
    await page.locator(".safety-note", { hasText: "4 di 7" }).waitFor();
    let camp = await campaignData();
    check(
      camp.expectations.shared && camp.expectations.remind && camp.expectations.revision === 3,
      "Expectations not saved/shared",
    );
    check(
      camp.expectations.tools.join() === "stop,pace,hand,lines,stars",
      "Tools not saved: " + camp.expectations.tools,
    );
    await styled(page);
    await page.screenshot({ path: shots + "b27-02-expectations-dm-it.png", fullPage: true });
    await setRole("player");
    const section = await page.locator("#content").innerText();
    check(
      section.includes("Cadaveri") && section.includes("Il DM guida il personaggio assente"),
      "Player does not read the shared sheet and outline",
    );
    const before = JSON.stringify(await safety());
    const logLength = (await stored()).log.length;
    await page.locator(".campaign-sidebar [data-nav='table']").click();
    const reminderText = page
      .locator("#dialog[open] .safety-reminder")
      .innerText({ timeout: 2500 })
      .catch(() => "");
    const reminderShown = await reminderText;
    for (const topic of [
      "Ragni",
      "Violenza sui bambini",
      "Annegamento prolungato",
      "Tortura",
      "Cadaveri",
      "Stop (carta X)",
      "cripta",
    ])
      check(
        reminderShown.includes(topic),
        `Reminder misses ${topic}: ${reminderShown.slice(0, 300)}`,
      );
    check(
      await acceptReminder(
        page,
        "Prima di giocare",
        "Ho letto",
        shots + "b27-02b-reminder-player-it.png",
      ),
      "Reminder did not open when joining the Table",
    );
    passed.push(
      "DM: Stop and lines/veils locked on (unticking every tool keeps both), sheet shared with reminder, outline 4 of 7; player reads both",
    );
    check(
      JSON.stringify(await safety()) === before,
      "Reading the reminder changed shared safety data",
    );
    check((await stored()).log.length === logLength, "Reading the reminder wrote a log entry");
    await page.locator(".app-header [data-nav='campaign']").click();
    await page.locator(".campaign-sidebar [data-nav='table']").click();
    await page.waitForTimeout(600);
    check(!(await dialogOpen()), "Reminder shown twice on the same day and device");
    await page.reload();
    await page.locator("#battle-map").waitFor();
    await page.waitForTimeout(600);
    check(!(await dialogOpen()), "Reminder shown again after reload on the same device");
    passed.push(
      "Reminder opens on joining the Table, closes with 'Ho letto', not repeated (navigation, reload), no shared data or log written",
    );

    // ---------------------------------------------------------------------------------
    // C. During play: anonymous Stop, Undo of a gameplay change keeps it, named hand by
    // click and hotkey, withdrawal; DM: X-card in the middle, play not blocked, acknowledge.
    // The player chooses safety pop-ups (B24 preferences); the DM keeps the default.
    const setDelivery = async (label, p = page) => {
      await p.locator('[data-service="preferences"]').first().click();
      await p.locator('#dialog select[name*="cat-safety"]').selectOption({ label });
      await p.locator('#dialog button[type="submit"]').click();
      await p.locator("#dialog").waitFor({ state: "hidden" });
    };
    await setDelivery("Nel centro e come avviso");
    const token = page.locator("[data-actor=livia]");
    const origin = await token.getAttribute("transform");
    let box = await token.locator("circle").first().boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 - 20, { steps: 8 });
    await page.mouse.up();
    check((await token.getAttribute("transform")) !== origin, "Drag did not move Livia");
    await openSafety(page);
    await page.locator(".safety-drawer").waitFor();
    // Review fix: one click brings the signal cards into view, focus on their group.
    await page.waitForFunction(() => document.activeElement?.classList.contains("safety-cards"));
    // B61: the panel may sit in the Table's right sidebar beside the action bar; the bar
    // hides the cards only where it lies across them.
    const inView = (p = page) =>
      p.evaluate(() => {
        const box = document.querySelector(".safety-cards").getBoundingClientRect();
        const dock = document.querySelector("#content .action-dock")?.getBoundingClientRect();
        const across = dock && dock.left < box.right && dock.right > box.left;
        return box.top >= 0 && box.bottom <= Math.min(innerHeight, across ? dock.top : innerHeight);
      });
    check(await inView(), "Signal cards not fully in view after opening the drawer (desktop)");
    await page.locator('[data-safety-act="signal"][data-kind="stop"]').click();
    check((await toast()).includes("forma anonima"), "No sender confirmation: " + (await toast()));
    data = await stored();
    camp = data.ext.safety.campaigns.lanterns;
    check(
      camp.signals.length === 1 &&
        Object.keys(camp.signals[0]).sort().join() === "at,id,kind,withdrawHash" &&
        /^[0-9a-f]{64}$/.test(camp.signals[0].withdrawHash),
      "Signal stores more than id/kind/time/withdraw hash: " + JSON.stringify(camp.signals),
    );
    // The withdraw token stays in this identity's device memory, never in shared data.
    const tokens = await page.evaluate(
      (d) => JSON.parse(localStorage.getItem(d) || "{}").tokens?.player ?? {},
      deviceKey,
    );
    check(
      tokens[camp.signals[0].id] && !JSON.stringify(data).includes(tokens[camp.signals[0].id]),
      "Withdraw token missing on the device or present in shared data",
    );
    check(data.log.at(-1).visibility === "private", "Anonymous send visible in the shared log");
    await page.locator(".safety-sent li", { hasText: "Stop" }).waitFor();
    await button("Annulla ultima modifica").click();
    check((await token.getAttribute("transform")) === origin, "Undo did not restore Livia's move");
    check((await campaignData()).signals.length === 1, "Gameplay Undo removed the Stop");
    await page.locator('[data-safety-act="raise-hand"]').click();
    await page.locator('[data-safety-act="lower-hand"][aria-pressed="true"]').waitFor();
    check(
      (await page.locator(".safety-queue").innerText()).includes("Giocatore · Livia"),
      "Hand not queued by name",
    );
    await page.locator("#content").focus();
    await page.keyboard.press("Control+Shift+U");
    await page.waitForTimeout(200);
    const afterHotkey = (await campaignData()).hands.length;
    if (afterHotkey === 0) {
      await page.keyboard.press("Control+Shift+U");
      await page.waitForTimeout(200);
      check((await campaignData()).hands.length === 1, "Hotkey did not raise the hand again");
      passed.push("Mod+Shift+U lowers and raises the named hand");
    } else
      findings.push("Mod+Shift+U did not toggle the hand (shortcut taken by an earlier area?)");
    await page.locator('[data-safety-act="signal"][data-kind="pace"]').click();
    await page
      .locator(".safety-sent li", { hasText: "Rallenta" })
      .getByRole("button", { name: "Ritira" })
      .click();
    camp = await campaignData();
    check(
      camp.signals.length === 1 && camp.signals[0].kind === "stop",
      "Withdrawal failed: " + JSON.stringify(camp.signals),
    );
    passed.push(
      "Player: Stop sent (id/kind/time only, private log), Undo restores the move but keeps the Stop, hand raised by name, mistaken Slow down withdrawn",
    );

    await page.evaluate(() => scrollTo(0, 0));
    await setRole("dm");
    const xcard = page.locator(".safety-xcard");
    await xcard.waitFor();
    // Review fix: the pre-session reminder waits; nothing covers the X-card.
    await page.waitForTimeout(700);
    check(!(await dialogOpen()), "A dialog opened on top of the pending X-card");
    const hitsCard = (p = page) =>
      p.evaluate(() => {
        const box = document.querySelector(".safety-xcard").getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return Boolean(hit?.closest(".safety-xcard"));
      });
    check(await hitsCard(), "The X-card is not the top element at its centre");
    const arrivals = await page.evaluate(() =>
      Object.entries(
        JSON.parse(localStorage.getItem("d20-studio-notifications:arrivals:v1") || "{}"),
      ).filter(([k]) => k.includes("safety-signal")),
    );
    check(
      arrivals.length && arrivals.every(([, v]) => v.by === null),
      "The notification cache attributes the anonymous Stop: " + JSON.stringify(arrivals),
    );
    const xbox = await xcard.boundingBox();
    const cx = xbox.x + xbox.width / 2;
    const cy = xbox.y + xbox.height / 2;
    check(Math.abs(cx - 720) < 30 && Math.abs(cy - 450) < 30, `X-card not centred: ${cx},${cy}`);
    const animation = await xcard.evaluate((el) => getComputedStyle(el).animationName);
    check(animation === "safety-flash", "X-card does not flash: " + animation);
    check(!/Livia|Giocatore/.test(await xcard.innerText()), "X-card names the sender");
    // Second review: the overlay holds the X-card only; with the default "centre only"
    // nothing else pops up for the DM, and the bell holds the named hand.
    check(
      (await page.locator(".safety-overlay > *").count()) === 1 &&
        !(await page.locator(".notifications-toast").count()),
      "A second notice surface is shown next to the X-card",
    );
    await styled(page);
    await page.screenshot({ path: shots + "b27-03-xcard-dm-it.png" });
    // Review fix: any modal dialog (here Search) shows the pending X-card inside it.
    await page.locator('.app-header [data-service="search"]').click();
    await page.locator("dialog[open] .safety-xcard").waitFor();
    check(await hitsCard(), "The X-card is covered by the open dialog");
    await page.screenshot({ path: shots + "b27-09-xcard-in-dialog-it.png" });
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => document.querySelector(".safety-overlay")?.parentElement === document.body,
    );
    await page.locator('.app-header [data-service="requests"]').click();
    const handRow = page.locator("#dialog .notifications-item", {
      hasText: "Giocatore · Livia ha alzato la mano",
    });
    await handRow.waitFor();
    check(
      (await handRow.innerText()).includes("Sicurezza del tavolo"),
      "The hand is not listed under 'Sicurezza del tavolo'",
    );
    check(
      !(await page.locator("#dialog .notifications-item", { hasText: "Stop" }).count()),
      "The DM's Stop is listed in the centre as well as on the X-card",
    );
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => document.querySelector(".safety-overlay")?.parentElement === document.body,
    );
    // Play is not blocked: the DM still selects and moves a token outside the card.
    box = await token.locator("circle").first().boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 40, box.y + box.height / 2 + 30, { steps: 6 });
    await page.mouse.up();
    check(
      (await token.getAttribute("transform")) !== origin,
      "DM could not move a token while the X-card was shown",
    );
    // Review fix: after its flash the X-card docks at the top of the map; centre free.
    await page.locator(".safety-xcard.is-docked").waitFor({ timeout: 9000 });
    const dockedAtMapTop = (p = page) =>
      p.evaluate(() => {
        const card = document.querySelector(".safety-xcard").getBoundingClientRect();
        const map = document.querySelector("#content .map-container").getBoundingClientRect();
        const hit = document.elementFromPoint(map.left + map.width / 2, map.top + map.height / 2);
        return {
          inMapTop: card.top >= map.top && card.bottom <= map.top + map.height / 2,
          inside: card.left >= map.left && card.right <= map.right,
          centreFree: !hit?.closest(".safety-xcard"),
          height: card.height,
        };
      });
    const docked = await dockedAtMapTop();
    check(
      docked.inMapTop && docked.inside && docked.centreFree && docked.height <= 72,
      "Docked X-card not at the top of the map: " + JSON.stringify(docked),
    );
    await page.screenshot({ path: shots + "b27-10-xcard-docked-it.png" });
    await button("Annulla ultima modifica").click();
    check(await xcard.isVisible(), "X-card vanished without acknowledgement");
    const dmLog = (await stored()).log.filter(
      (l) => l.visibility !== "private" || l.controller === "dm",
    );
    check(
      !dmLog.some((l) => /segnale anonimo/i.test(l.label)),
      "The DM's log shows the anonymous send",
    );
    await xcard.getByRole("button", { name: "Ricevuto" }).click();
    await xcard.waitFor({ state: "detached" });
    check((await campaignData()).signals.length === 0, "Acknowledge did not clear the Stop");
    check(
      await acceptReminder(page, "Prima di giocare", "Ho letto"),
      "The reminder held back by the X-card did not follow Ricevuto",
    );
    await openSafety(page);
    await page
      .locator(".safety-queue li", { hasText: "Giocatore · Livia" })
      .getByRole("button", { name: "Dai la parola" })
      .click();
    check((await campaignData()).hands.length === 0, "Give the floor did not clear the queue");
    check(
      (await toast()).includes("La parola a Giocatore · Livia"),
      "No confirmation for Dai la parola: " + (await toast()),
    );
    await page.locator('[data-safety-act="signal"][data-kind="pace"]').click();
    passed.push(
      "DM: no reminder over the pending X-card; X-card centred and flashing without names, the overlay's only content, inside the Search dialog while it is open, docked at the top of the map after the flash (centre free); anonymous arrival cached without originator; the named hand listed once in the bell under 'Sicurezza del tavolo' (no pop-up by the default setting, no Stop row), token still movable, log hides the sender, Ricevuto clears then the reminder opens, Dai la parola confirmed",
    );

    await setRole("player");
    // The player chose pop-ups: exactly one, from B24, and no notice drawn by B27.
    const pace = page.locator(".notifications-toast", { hasText: "Rallenta · anonimo" });
    await pace.waitFor();
    check(
      (await pace.innerText()).includes("Qualcuno chiede meno intensità"),
      "Group notice missing",
    );
    check(!/DM|Giocatore/.test(await pace.innerText()), "Group notice names the sender");
    check(
      (await page.locator(".notifications-toast").count()) === 1 &&
        !(await page.locator(".safety-overlay > *").count()),
      "The Slow down reached the player on more than one surface",
    );
    await pace.getByRole("button", { name: "Chiudi avviso" }).click();
    await pace.waitFor({ state: "detached" });
    await setRole("dm");
    await openSafety(page);
    await page
      .locator(".safety-sent li", { hasText: "Rallenta" })
      .getByRole("button", { name: "Ritira" })
      .click();
    check((await campaignData()).signals.length === 0, "DM could not withdraw their own signal");
    passed.push(
      "Group told without names through B24's one surface (Slow down sent by the DM: one pop-up for the player who chose pop-ups, nothing drawn by B27), dismissed, withdrawn by its sender",
    );

    // ---------------------------------------------------------------------------------
    // D. Stars and wishes: optional, anonymous unless signed, withdrawable while open.
    await page.locator(".app-header [data-nav='campaign']").click();
    await sidebar("safety").click();
    await page.locator('[data-safety-tab="after"]').click();
    await button("Chiedi stelle e desideri").click();
    await setRole("player");
    const invite = page.locator(".notifications-toast", {
      hasText: "Il DM chiede stelle e desideri",
    });
    await invite.waitFor();
    await invite.getByRole("button", { name: "Apri" }).click();
    await button("Scrivi stelle e desideri").click();
    await dlg.locator('[name="star"]').fill("Il duello sul tetto dell’osservatorio.");
    await button("Invia").click();
    await page.locator(".safety-star-entry", { hasText: "Il duello" }).waitFor();
    await button("Scrivi stelle e desideri").click();
    await dlg.locator('[name="wish"]').fill("Una sessione in città, con più intrighi.");
    await dlg.locator('[name="signed"]').check();
    await button("Invia").click();
    await button("Scrivi stelle e desideri").click();
    await dlg.locator('[name="star"]').fill("prova sbagliata");
    await button("Invia").click();
    await page
      .locator(".safety-star-entry", { hasText: "prova sbagliata" })
      .getByRole("button", { name: "Ritira" })
      .click();
    await page
      .locator(".safety-star-entry", { hasText: "prova sbagliata" })
      .waitFor({ state: "detached" });
    check(
      (await toast()).includes("Voce ritirata"),
      "No confirmation for Ritira: " + (await toast()),
    );
    camp = await campaignData();
    const round = camp.rounds.at(-1);
    check(
      round.entries.length === 2,
      "Round should keep 2 entries: " + JSON.stringify(round.entries),
    );
    check(
      round.entries[0].signedBy === null && round.entries[1].signedBy === "player",
      "Signature choice not respected",
    );
    await setRole("dm");
    const after = await page.locator("#content").innerText();
    check(
      after.includes("Anonimo") &&
        after.includes("Giocatore · Livia") &&
        after.includes("Una sessione in città"),
      "DM does not see stars and wishes correctly",
    );
    await button("Chiudi la raccolta").click();
    // Review fix: closing cannot be undone, so it asks first; the choice is confirmed.
    await page.locator("#dialog[open] h2", { hasText: "Chiudere la raccolta?" }).waitFor();
    check(
      (await campaignData()).rounds.at(-1).closedAt === null,
      "The collection closed before confirmation",
    );
    await dlg.getByRole("button", { name: "Chiudi la raccolta" }).click();
    check((await toast()).includes("Raccolta chiusa"), "No confirmation after closing");
    await page.reload();
    await page.locator(".safety-round h3", { hasText: "raccolta chiusa" }).first().waitFor();
    check(
      (await page.locator("#content").innerText()).includes("Il duello sul tetto"),
      "Reload lost stars and wishes",
    );
    await styled(page);
    await page.screenshot({ path: shots + "b27-04-stars-wishes-it.png", fullPage: true });
    passed.push(
      "Stars and wishes: invitation as a B24 pop-up opening the collection, anonymous star, signed wish, mistaken entry withdrawn (confirmed), DM closes after a confirmation step; reload keeps them",
    );

    // ---------------------------------------------------------------------------------
    // E. Marked map + personal filter: blurred with Show (mouse and keyboard), tokens
    // sharp and usable, per-visit reveal, DM unaffected.
    await setRole("dm");
    await page.locator('[data-safety-tab="agreements"]').click();
    await button("Marca una mappa").click();
    await dlg.locator('input[name="topics"][value="gore"]').check();
    await button("Salva marcatura").click();
    await page.locator(".safety-list li", { hasText: "Il cortile dell’osservatorio" }).waitFor();
    await setRole("player");
    await page.locator(".safety-list li", { hasText: "Non sfumata per te" }).waitFor();
    await button("Filtri nel mio profilo").click();
    await page.locator('[data-safety-filter="enabled"]').check();
    await page.locator("fieldset.safety-extra:not([disabled])").waitFor();
    await page.locator('[data-safety-filter="extra"][value="gore"]').check();
    data = await stored();
    check(
      data.ext.safety.profiles.player.filter.enabled &&
        data.ext.safety.profiles.player.filter.extra.join() === "gore",
      "Filter not stored",
    );
    await button("Torna indietro").click();
    await page.locator(".campaign-sidebar [data-nav='table']").click();
    const veil = page.locator("[data-safety-veil]");
    await veil.waitFor();
    const blur = () =>
      page.evaluate(
        () =>
          getComputedStyle(document.querySelector("#battle-map > svg, #battle-map > image")).filter,
      );
    check((await blur()).includes("blur"), "Base map not blurred: " + (await blur()));
    check(
      (await page.evaluate(() => getComputedStyle(document.querySelector("#tokens")).filter)) ===
        "none",
      "Tokens are blurred",
    );
    await styled(page);
    await page.screenshot({ path: shots + "b27-05-filtered-map-it.png" });
    const target = page.locator('[data-actor="doran"]');
    await target.click();
    await page.locator('[data-actor="doran"].selected').waitFor();
    await page.locator('[data-safety-veil-act="show"]').focus();
    await page.keyboard.press("Enter");
    await page.locator("[data-safety-veil-shown]").waitFor();
    check((await blur()) === "none", "Show did not reveal the map");
    check(
      (await page.evaluate(() => document.activeElement?.dataset?.safetyVeilAct)) === "hide",
      "Focus not on 'Sfuma di nuovo' after Show",
    );
    await page.keyboard.press("Enter");
    await veil.waitFor();
    await page.locator('[data-safety-veil-act="show"]').click();
    await page.locator("[data-safety-veil-shown]").waitFor();
    await page.reload();
    await veil.waitFor();
    check((await blur()).includes("blur"), "Reload kept the map revealed (reveal is per visit)");
    await setRole("dm");
    await page.waitForTimeout(300);
    check(
      !(await page.locator("[data-safety-veil]").count()),
      "The DM's map is blurred without a filter",
    );
    passed.push(
      "Marked map: blurred only for the player whose filter matches, tokens sharp and selectable, Show by keyboard and mouse, Blur again, reload blurs again, DM unaffected",
    );

    // The palette (B23) lists the anonymous Stop command.
    await page.keyboard.press("ControlOrMeta+k");
    await page.locator("#dialog[open]").waitFor();
    await page.keyboard.type("Stop anonimo");
    await page
      .locator("#dialog[open]", { hasText: "Invia Stop anonimo (carta X)" })
      .waitFor({ timeout: 3000 });
    await page.keyboard.press("Escape");
    passed.push("Palette (B23) lists «Invia Stop anonimo (carta X)»");

    // Desktop layout checks for the area's own controls.
    await openSafety(page);
    await page.locator(".safety-drawer").waitFor();
    const drawerSmall = await smallTargets(".safety-drawer button");
    check(!drawerSmall.length, "Small drawer targets: " + JSON.stringify(drawerSmall));
    check(await noOverflow(), "Desktop Table overflows with the drawer");
    await page.locator(".app-header [data-nav='campaign']").click();
    await sidebar("safety").click();
    const sectionSmall = await smallTargets(".safety-section button");
    check(!sectionSmall.length, "Small section targets: " + JSON.stringify(sectionSmall));
    check(await noOverflow(), "Desktop safety section overflows");
    passed.push("Desktop: every area button ≥ 40 px, no horizontal overflow");
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);

    // ---------------------------------------------------------------------------------
    // F. EN phone 390x844, touch: a new device with the same synthetic state.
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await phone.addInitScript(
      ([k, value]) => {
        if (!sessionStorage.getItem("b27-seeded")) {
          localStorage.setItem(k, value);
          sessionStorage.setItem("b27-seeded", "1");
        }
      },
      [key, snapshot],
    );
    mobile = await phone.newPage();
    mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
    await mobile.goto(base + "#campaign?tab=safety");
    await mobile.locator('[data-service="preferences"]').tap();
    await mobile.locator('#dialog [name="lang"]').selectOption("en");
    await mobile.locator("#dialog button[type=submit]").tap();
    await mobile.getByRole("heading", { name: "Table safety", level: 1 }).waitFor();
    check(await noOverflow(mobile), "Phone safety section overflows");
    await mobile.locator('[data-safety-tab="play"]').tap();
    await mobile.locator('[data-safety-act="raise-hand"]').tap();
    await mobile.locator(".safety-queue li", { hasText: "Player · Livia" }).waitFor();
    await mobile.locator('[data-safety-act="lower-hand"]').first().tap();
    await mobile.locator(".safety-queue").waitFor({ state: "detached" });
    const phoneSmall = await smallTargets(".safety-section button", mobile);
    check(!phoneSmall.length, "Small phone targets: " + JSON.stringify(phoneSmall));
    await styled(mobile);
    await mobile.screenshot({ path: shots + "b27-06-phone-during-play-en.png", fullPage: true });
    await button("My safety profile", mobile).tap();
    await mobile.getByRole("heading", { name: "Safety", level: 1, exact: true }).waitFor();
    check(await noOverflow(mobile), "Phone profile overflows");
    const phoneLine = mobile.locator('[data-safety-input="lines"]');
    await phoneLine.tap();
    await phoneLine.fill("Drowning and suffocation");
    await button("Add line", mobile).tap();
    await button("Remove Drowning and suffocation from lines", mobile).tap();
    await mobile
      .locator('[data-safety-own="lines"] li', { hasText: "Drowning" })
      .waitFor({ state: "detached" });
    const removeSmall = await smallTargets(".safety-chip-remove", mobile);
    check(!removeSmall.length, "Small chip remove targets: " + JSON.stringify(removeSmall));
    await button("Go back", mobile).tap();
    await mobile.locator(".campaign-sidebar [data-nav='table']").tap();
    check(
      await acceptReminder(mobile, "Before playing", "Got it"),
      "A new device did not show the reminder",
    );
    const phoneVeil = mobile.locator("[data-safety-veil]");
    await phoneVeil.waitFor();
    check(
      (await phoneVeil.textContent()).includes("Map blurred by your filter"),
      "Veil not in English",
    );
    await mobile.locator('[data-safety-veil-act="show"]').tap();
    await mobile.locator("[data-safety-veil-shown]").waitFor();
    // B62: the phone control holding Safety is the Chat tab of the pinned bar.
    const phoneToggle = await mobile
      .locator('.table-tabs [data-table-section="chat"]')
      .evaluate((el) => el.getBoundingClientRect().height);
    check(phoneToggle >= 40, "Phone Safety toggle under 40 px: " + phoneToggle);
    await openSafety(mobile, true);
    await mobile.locator(".safety-drawer").waitFor();
    await mobile.waitForFunction(() => document.activeElement?.classList.contains("safety-cards"));
    check(await inView(mobile), "Signal cards not fully in view after opening the drawer (phone)");
    check(await noOverflow(mobile), "Phone Table overflows with the drawer");
    await mobile.locator('[data-safety-act="signal"][data-kind="stop"]').tap();
    check((await toast(mobile)).includes("Stop sent anonymously"), "English confirmation missing");
    await styled(mobile);
    await mobile.screenshot({ path: shots + "b27-07-phone-drawer-en.png" });
    // Simulated offline: a shared signal is refused with the shell's message; nothing sent.
    const setOffline = async (value) => {
      await mobile.locator('[data-service="preferences"]').tap();
      const box = mobile.locator('#dialog [name="offline"]');
      if (value) await box.check();
      else await box.uncheck();
      await mobile.locator("#dialog button[type=submit]").tap();
    };
    await setOffline(true);
    await openSafety(mobile, true);
    await mobile.locator('[data-safety-act="signal"][data-kind="pace"]').tap();
    check(
      (await toast(mobile)).includes("offline"),
      "Offline signal not refused: " + (await toast(mobile)),
    );
    check(
      (await campaignData(mobile)).signals.length === 1,
      "Offline refusal still stored a signal",
    );
    await setOffline(false);
    passed.push("Offline (simulated): Slow down refused with the shell's message, nothing stored");
    await mobile.evaluate(() => scrollTo(0, 0));
    await setRole("dm", mobile);
    const phoneX = mobile.locator(".safety-xcard");
    await phoneX.waitFor();
    await mobile.waitForTimeout(700);
    check(!(await dialogOpen(mobile)), "Phone: a dialog opened on top of the pending X-card");
    const px = await phoneX.boundingBox();
    check(
      px.x >= 0 && px.x + px.width <= 390 && px.y >= 0 && px.y + px.height <= 844,
      "X-card outside the phone viewport",
    );
    // Second review (probe p2): nothing of this area covers the Table's sticky dock.
    const dockCovered = (p) =>
      p.evaluate(() =>
        [...document.querySelectorAll("#content .action-dock button")]
          .filter((b) => {
            const r = b.getBoundingClientRect();
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return hit?.closest(".safety-overlay");
          })
          .map((b) => b.innerText.trim()),
      );
    check(!(await dockCovered(mobile)).length, "The X-card covers the Table's dock (flash)");
    await styled(mobile);
    await mobile.screenshot({ path: shots + "b27-08-phone-xcard-dm-en.png" });
    await mobile.locator(".safety-xcard.is-docked").waitFor({ timeout: 9000 });
    const phoneDock = await dockedAtMapTop(mobile);
    check(
      phoneDock.inMapTop && phoneDock.inside && phoneDock.centreFree && phoneDock.height <= 72,
      "Phone docked X-card misplaced: " + JSON.stringify(phoneDock),
    );
    await mobile.screenshot({ path: shots + "b27-11-phone-xcard-docked-en.png" });
    check(!(await dockCovered(mobile)).length, "The X-card covers the Table's dock (docked)");
    // A pop-up (B24, chosen by the DM) arriving while the X-card is docked at the top of
    // the map: the X-card moves below it, both stay usable, and it returns afterwards.
    await mobile.locator('[data-service="preferences"]').first().tap();
    await mobile
      .locator('#dialog select[name*="cat-safety"]')
      .selectOption({ label: "In the centre and as a pop-up" });
    await mobile.locator("#dialog button[type=submit]").tap();
    await setRole("player", mobile);
    await openSafety(mobile, true);
    await mobile.locator('[data-safety-act="raise-hand"]').tap();
    await setRole("dm", mobile);
    const popup = mobile.locator(".notifications-toast", { hasText: "raised a hand" });
    await popup.waitFor();
    // W1b integration: B24 places the pop-up stack below the header's row in the page (not
    // at the screen top): scroll the map so the X-card's dock (map top + 56 px) meets it.
    const toMapTop = () =>
      mobile.evaluate(() => {
        const pops = document.querySelector(".notifications-toasts").getBoundingClientRect();
        const map = document.querySelector("#content .map-container").getBoundingClientRect();
        scrollBy(0, map.top - Math.max(0, pops.top - 40));
      });
    await toMapTop();
    await mobile.waitForTimeout(300);
    const clear = () =>
      mobile.evaluate(() => {
        const hit = (el) => {
          const r = el.getBoundingClientRect();
          return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
        };
        const card = document.querySelector(".safety-xcard").getBoundingClientRect();
        const pops = document.querySelector(".notifications-toasts").getBoundingClientRect();
        return {
          apart: !pops.height || card.top >= pops.bottom || card.bottom <= pops.top,
          ack: hit(document.querySelector('.safety-xcard [data-safety-overlay="ack"]')),
          close: [...document.querySelectorAll("[data-notifications-toast-close]")].every(hit),
          top: Math.round(card.top),
        };
      });
    const withPopup = await clear();
    check(
      withPopup.apart && withPopup.ack && withPopup.close,
      "Docked X-card and pop-up overlap: " + JSON.stringify(withPopup),
    );
    await mobile.screenshot({ path: shots + "b27-14-phone-xcard-below-popup-en.png" });
    await popup.waitFor({ state: "detached", timeout: 12000 });
    await mobile.waitForTimeout(300);
    const afterPopup = await clear();
    check(
      afterPopup.top < withPopup.top && afterPopup.ack,
      "The X-card did not return to the map top: " + JSON.stringify(afterPopup),
    );
    await phoneX.getByRole("button", { name: "Acknowledge" }).tap();
    await phoneX.waitFor({ state: "detached" });
    check(
      (await campaignData(mobile)).signals.length === 0,
      "Phone acknowledge did not clear the Stop",
    );
    check(
      await acceptReminder(mobile, "Before playing", "Got it"),
      "Phone: the reminder did not follow Acknowledge",
    );
    passed.push(
      "EN phone (touch): section, hand queue, profile add/remove, reminder on a new device, veil Show, 40 px Safety toggle, drawer brings Stop into view above the sticky dock, DM X-card inside the viewport with no dialog over it and never over the Table's dock, docked after the flash, a pop-up chosen by the DM arriving meanwhile pushes it below (both usable) and it returns when the pop-up leaves, Acknowledge then reminder; ≥ 40 px targets, no overflow",
    );

    // ---------------------------------------------------------------------------------
    // G. Second review, desktop: 'Marca una mappa' follows the chosen map (probe p3), and
    // an offline profile edit waits for its device to be back online (probe p1).
    await page.bringToFront();
    await setRole("dm");
    await page.locator(".campaign-sidebar [data-campaign-tab='preparation']").click();
    await page.locator("[data-prep-new]").click();
    await dlg.locator('input[name="name"]').fill("La cripta");
    await dlg.locator('button[type="submit"]').click();
    await page.locator("[data-prep-save]").first().click();
    const crypt = (await stored()).scenes.find((scene) => scene.name === "La cripta")?.id;
    check(crypt, "The new scene was not saved");
    await openCampaignSection(page, "safety");
    await button("Marca una mappa").click();
    await dlg.locator('select[name="scene"]').selectOption(crypt);
    await dlg.locator('input[name="topics"][value="spiders"]').check();
    await button("Salva marcatura").click();
    await button("Marca una mappa").click();
    const ticked = () =>
      dlg.locator('input[name="topics"]:checked').evaluateAll((els) => els.map((el) => el.value));
    check(
      (await ticked()).join() === "gore",
      "The dialog does not open on the active map's own mark",
    );
    await dlg.locator('select[name="scene"]').selectOption(crypt);
    check(
      (await ticked()).join() === "spiders" &&
        (await dlg.locator("[data-safety-mark-state]").innerText()).includes("già marcata: Ragni"),
      "Choosing another map did not load its own mark",
    );
    await page.screenshot({ path: shots + "b27-12-mark-dialog-other-map-it.png" });
    await button("Salva marcatura").click();
    const marks = Object.fromEntries(
      (await campaignData()).marks.map((mark) => [mark.sceneId, mark.topics.map((t) => t.topic)]),
    );
    check(
      marks[crypt]?.join() === "spiders" && marks["old-watch"]?.join() === "gore",
      "A mark was overwritten: " + JSON.stringify(marks),
    );
    passed.push(
      "Marca una mappa: opens on the active map's mark; choosing La cripta loads its Ragni and says saving replaces it; saving keeps both maps' marks",
    );

    const setDesktopOffline = async (value) => {
      await page.locator('[data-service="preferences"]').first().click();
      const box = dlg.locator('[name="offline"]');
      if (value) await box.check();
      else await box.uncheck();
      await dlg.locator('button[type="submit"]').click();
      await dlg.waitFor({ state: "hidden" });
    };
    await setRole("player");
    await setDesktopOffline(true);
    await button("Il mio profilo di sicurezza").click();
    const offlineLine = page.locator('[data-safety-input="lines"]');
    await offlineLine.fill("Crolli e sepolture");
    await offlineLine.press("Enter");
    await page.locator('[data-safety-own="lines"] li', { hasText: "Crolli" }).waitFor();
    check(
      (await toast()).includes("Arriva al gruppo quando torni in rete"),
      "Offline add does not say when the group gets it: " + (await toast()),
    );
    check(
      (await page.locator(".safety-page [role=status]").innerText()).includes(
        "il gruppo vede le tue linee e i tuoi veli di prima",
      ),
      "The profile does not say the group still sees the previous version",
    );
    await page.screenshot({ path: shots + "b27-13-offline-profile-it.png" });
    await setRole("dm");
    await button("Torna indietro").click();
    await combined.waitFor();
    check(
      !(await combinedText()).includes("Crolli"),
      "The group saw an edit made on an offline device",
    );
    await setDesktopOffline(false);
    check(
      !(await combinedText()).includes("Crolli"),
      "The player's edit arrived before the player's device was back in use",
    );
    await setRole("player");
    await page.waitForFunction(() =>
      document.querySelector("#toast")?.innerText.includes("Di nuovo in rete"),
    );
    await setRole("dm");
    await combined.waitFor();
    check(
      (await combinedText()).includes("Crolli e sepolture"),
      "The player's offline edit did not reach the group once back online",
    );
    passed.push(
      "Offline profile edit: saved on the player's device with a clear note, the DM's combined list keeps the previous version (also after the DM is back online), the player's device back online sends it (toast) and the DM sees it",
    );

    // "Reset example" reseeds the area and forgets this device's safety memory.
    await page.bringToFront();
    await button("Ripristina esempio").click();
    await button("Ripristina").click();
    await page.waitForTimeout(300);
    const reset = await safety();
    check(
      !reset.profiles.player && reset.campaigns.lanterns.expectations.revision === 1,
      "Reset did not reseed safety data",
    );
    check(
      (await page.evaluate((d) => localStorage.getItem(d), deviceKey)) === "{}",
      "Reset kept the device's safety memory",
    );
    passed.push("Reset example reseeds the safety slice and clears the device memory");
    check(errors.length === 0, "Page errors: " + errors.join("; "));
    await phone.close();
    await context.close();
    return { passed, findings, errors };
  } catch (error) {
    await page.screenshot({ path: shots + "b27-failure-desktop.png" }).catch(() => {});
    if (mobile) await mobile.screenshot({ path: shots + "b27-failure-phone.png" }).catch(() => {});
    throw Error(error.message + " | passed so far: " + passed.join(" / "));
  }
};
