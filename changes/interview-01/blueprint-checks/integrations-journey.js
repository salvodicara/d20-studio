async (rootPage) => {
  // B62: shows a token-menu command by id (opening the labelled submenu that holds it)
  // and returns its locator, for a journey that waits for it or presses it itself.
  const revealMenuItem = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const menu = page.locator("body > .token-menu");
    const item = menu.locator(`[data-token-menu-item="${id}"]`);
    await menu.locator("[data-nav]").first().waitFor();
    if (await item.count()) return item.first();
    const ids = await menu
      .locator("[data-token-menu-category]")
      .evaluateAll((els) => els.map((e) => e.dataset.tokenMenuCategory));
    for (const category of ids) {
      await press(menu.locator(`[data-token-menu-category="${category}"]`));
      if (await item.count()) return item.first();
      await press(menu.locator("[data-token-menu-back]"));
    }
    return item.first();
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
  // B55 — simulated external integrations in the one app, with real clicks, keys and touch.
  // Group 1 modules (DM, IT 1440): Foundry dependency prompt, save, Undo bar, API on.
  // Group 2 Discord relay: public physical/digital Table rolls and a private initiative roll;
  // the channel preview shows only the public ones; zero requests outside the local server;
  // /dnote note withdrawn with a reason; Avrae !campaign link listed; player view.
  // Group 3 calendar: session scheduled from Sessions, .ics downloaded with the correct UTC
  // instant, duration, personal feed rotated, in-app reminder chosen and delivered in the bell.
  // Group 4 external sheet on a token: link, open in a new tab (no import), DM-only link hidden
  // from the player. Group 5 documented import: errors with lines, new private character in
  // the library, Avrae-style update, Undo. Group 6 API tokens and webhooks. Group 7 reload
  // persistence and offline. Group 8 EN phone 390 touch. Group 9 (independent review, B55-rf):
  // another identity's private activity never reaches the DM's withheld count, Discord webhook
  // removal with Undo, refusals shown inside confirmation dialogs, a paused webhook never
  // back-fills, light-theme contrast, who reads an unshared sheet link, file names per language.
  // Synthetic data; resets this browser's demo state.
  // Run: playwright-cli -s=<own session> run-code --filename=<this file>
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B55-rf/";
  const browser = rootPage.context().browser();
  const passed = [],
    errors = [],
    outside = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  // Every request outside the local server is recorded and answered locally: the external
  // sheet tab gets a stub page, so nothing reaches the internet during the journey.
  const guard = async (context, label) => {
    await context.route(
      (url) =>
        !url.href.startsWith(base) &&
        !url.href.startsWith("blob:") &&
        !url.href.startsWith("data:"),
      (route) => {
        outside.push(label + ": " + route.request().url());
        return route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<!doctype html><title>External sheet (stub)</title><p>Stub page served by the journey.</p>",
        });
      },
    );
  };
  // Refreshed by the round-2 regression (29/09/2026): since P1 IN-11 the app registers a
  // pass-through service worker; a fetch it answers never reaches context.route, so the guard
  // below would miss an outside request. Service workers are blocked to keep the guard whole.
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    timezoneId: "Europe/Rome",
    locale: "it-IT",
    acceptDownloads: true,
    serviceWorkers: "block",
  });
  await guard(context, "desktop");
  const page = await context.newPage();
  await page.clock.install({ time: new Date() });
  page.on("pageerror", (error) => errors.push("desktop: " + error.message));
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const slice = async (p = page) => (await stored(p)).ext.integrations;
  const rec = async (p = page) => (await slice(p)).campaigns.lanterns;
  const quietTips = async (p = page) => {
    const off = p.getByRole("button", { name: /Non mostrare suggerimenti|Stop showing tips/ });
    if (await off.count()) await off.first().click();
  };
  const role = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await p.waitForTimeout(120);
    await quietTips(p);
  };
  const dialog = (p = page) => p.locator("#dialog[open]");
  const submitDialog = async (p = page, tap = false) => {
    const button = p.locator('#dialog[open] button[type="submit"]');
    await (tap ? button.tap() : button.click());
    await p.waitForFunction(() => !document.querySelector("#dialog")?.open);
  };
  const toast = (p = page) => p.locator("#toast").innerText();
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const smallTargets = (p, scope) =>
    p
      .locator(
        `${scope} button, ${scope} select, ${scope} input, ${scope} summary, ${scope} textarea`,
      )
      .evaluateAll((nodes) =>
        nodes
          .filter(
            (n) =>
              n.getClientRects().length &&
              getComputedStyle(n).visibility !== "hidden" &&
              !["radio", "checkbox", "file"].includes(n.type),
          )
          .map((n) => [
            (n.textContent || n.getAttribute("aria-label") || n.name || "").trim().slice(0, 40),
            Math.round(n.getBoundingClientRect().height),
          ])
          .filter(([, h]) => h < 40),
      );
  // Screenshots wait for the last toast to fade (5.5 s in the shell) so it covers nothing.
  const quiet = (p) =>
    p
      .waitForFunction(() => !document.querySelector("#toast")?.classList.contains("shown"), null, {
        timeout: 8000,
      })
      .catch(() => {});
  const shot = async (name, locator = null, p = page) => {
    if (locator) await locator.evaluate((el) => el.scrollIntoView({ block: "start" }));
    await quiet(p);
    await p.screenshot({ path: dir + name });
  };
  const readDownload = async (download) => {
    let text = "";
    for await (const chunk of await download.createReadStream()) text += chunk;
    return text;
  };
  const tab = (id, p = page) => p.locator(`[data-int-tab="${id}"]`);
  const openTab = async (id, p = page, tap = false) => {
    await (tap ? tab(id, p).tap() : tab(id, p).click());
    await p.locator(`[data-int-page="${id}"]`).waitFor();
  };
  // Inside the campaign the section is one click away (sidebar); from the Table two
  // ("Back to the campaign", then the sidebar); from elsewhere Campaigns → the campaign's
  // "Open campaign" → the sidebar.
  const openIntegrations = async (p = page) => {
    if (!(await p.locator(".campaign-sidebar").count())) {
      const back = p.getByRole("button", { name: /Torna alla campagna|Back to the campaign/ });
      if (await back.count()) await back.first().click();
      else {
        await p.locator('.nav-link[data-nav="campaigns"]').click();
        await p.getByRole("button", { name: "Le lanterne di Bruma", exact: true }).first().click();
        await p
          .getByRole("button", { name: /Apri campagna|Open campaign/ })
          .first()
          .click();
      }
    }
    await openCampaignSection(p, "integrations");
    await p.locator("[data-int-page]").waitFor();
  };
  // W2b1 (B34): «Tira i dadi» opens the Dadi tab (DDB-151) and the roll is made in the tray;
  // the relay reads the tray's log line as the roll, in its own roll format. The one-die
  // «Tiro libero» dialog stays the fallback.
  const tableRoll = async ({ mode, natural = null, modifier }) => {
    await page.locator('[data-table="dice"]').click();
    await page.locator("[data-dtray-formula], #dialog[open] [name=sides]").first().waitFor();
    if (await page.locator("[data-dtray-formula]").count()) {
      const before = (await stored()).log.length;
      await page.locator("[data-dtray-formula]").fill("1d20+" + modifier);
      await page.locator("[data-dtray-formula]").press("Tab");
      await page.locator(`label.dtray-seg:has([data-dtray-mode][value="${mode}"])`).click();
      if (natural !== null) await page.locator('[data-dtray-face="0"]').fill(String(natural));
      await page.locator("[data-dtray-roll-button]").click();
      await page.waitForFunction(
        ([k, n]) => JSON.parse(localStorage.getItem(k)).log.length > n,
        [key, before],
      );
      return;
    }
    await dialog().waitFor();
    await page.locator('#dialog [name="sides"]').selectOption("20");
    await page.locator('#dialog [name="modifier"]').fill(String(modifier));
    await page.locator('#dialog [name="mode"]').selectOption(mode);
    if (natural !== null) await page.locator('#dialog [name="natural"]').fill(String(natural));
    await submitDialog();
  };
  const group = async (name, run) => {
    await run();
    passed.push(name);
  };

  try {
    // ------------------------------------------------------------------ 1 modules
    await group("1 · modules: dependency prompt, save, Undo bar, API enabled", async () => {
      await page.goto(base + "#home");
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.locator('.nav-link[data-nav="campaigns"]').waitFor();
      await quietTips();
      await role("dm");
      await openIntegrations();
      check(
        (await page.locator("[data-campaign-heading]").innerText()) === "Integrazioni",
        "heading",
      );
      check(
        (await page.locator(".int-sim").innerText()).includes("nessuna chiamata di rete"),
        "simulation note missing",
      );
      const tabs = await page.locator("[data-int-tab]").allInnerTexts();
      // P9 SV-41: «API e webhook» is always listed; the first token switches the module on.
      check(
        tabs.join("|") === "Moduli|Discord|Calendario|Importa|API e webhook",
        "tabs: " + tabs.join("|"),
      );
      // Keyboard: focus the relay switch and press Space → Foundry's dependency prompt.
      await page.locator('[data-int-module="relay"]').focus();
      await page.keyboard.press("Space");
      await dialog().waitFor();
      check(
        (await page.locator("[data-int-dependency]").innerText()).includes("«Collegamento Avrae»"),
        "dependency prompt text",
      );
      check(
        await page.locator('[data-int-module="relay"]').isChecked(),
        "switch changed before confirming",
      );
      await page.getByRole("button", { name: "Spegni entrambi", exact: true }).click();
      await page.locator("[data-int-pending]", { hasText: "2 modifiche non salvate" }).waitFor();
      check((await rec()).modules.relay === true, "unsaved switches were saved");
      await page.locator("[data-int-modules-reset]").click();
      await page
        .locator("[data-int-pending]", { hasText: "Nessuna modifica da salvare." })
        .waitFor();
      // Enable API and webhooks, save.
      await page.locator('[data-int-module="api"]').check();
      await page.locator("[data-int-modules-save]").click();
      await page.locator('[data-int-tab="api"]').waitFor();
      check((await rec()).modules.api === true, "API not saved");
      check(
        (await page.locator("[data-int-history]").innerText()).includes(
          "Modulo attivato: API e webhook",
        ),
        "history row",
      );
      // The inline Undo reverses it (correction in the log), then save again.
      await page.locator("[data-int-undo]").click();
      await page.waitForFunction(() => !document.querySelector('[data-int-module="api"]')?.checked);
      check((await rec()).modules.api === false, "Undo did not restore the switch");
      const log = (await stored()).log;
      check(log.at(-1).kind === "correction", "no correction recorded");
      await page.locator('[data-int-module="api"]').check();
      await page.locator("[data-int-modules-save]").click();
      await page.locator('[data-int-tab="api"]').waitFor();
      await shot("b55-01-modules-dm-1440.png", page.locator("[data-campaign-heading]"));
      // The player sees the same state, read-only.
      await role("player");
      check((await page.locator("[data-int-modules-form]").count()) === 0, "player sees the form");
      check(
        (await page.locator('[data-int-module-row="api"]').innerText()).includes("Attivo"),
        "player module row",
      );
      check((await page.locator("[data-int-history]").count()) === 0, "player sees history");
    });

    // ------------------------------------------------------------------ 2 Discord relay
    const requestsBefore = outside.length;
    const pageRequests = [];
    page.on("request", (request) => pageRequests.push(request.url()));
    await group(
      "2 · Discord relay: public rolls only, no network, /dnote, Avrae, player view",
      async () => {
        // DM links an Avrae channel first (rolls after the link reach it).
        await role("dm");
        await openTab("discord");
        await page.locator('[data-int-avrae-form] [name="channel"]').fill("tiri");
        await page.locator('[data-int-avrae-form] button[type="submit"]').click();
        await page.locator("[data-int-links] [data-int-link]").waitFor();
        check((await rec()).avrae.links[0].channel === "tiri", "Avrae link not stored");
        check(
          (await page.locator("[data-int-avrae-command]").inputValue()) ===
            "!campaign https://d20-studio.example/campaigns/lanterns",
          "Avrae command",
        );
        await page.locator("[data-int-copy-command]").click();
        await page.waitForTimeout(150);
        // Player: two public free rolls at the Table (physical 14 + 3, digital + 5).
        await role("player");
        await page.goto(base + "#table");
        await page.locator("#battle-map").waitFor();
        await quietTips();
        await page.locator('#battle-map [data-actor="livia"]').click();
        await tableRoll({ mode: "physical", natural: 14, modifier: 3 });
        await tableRoll({ mode: "digital", modifier: 5 });
        // DM: a private digital initiative roll for the Sentinel in the encounter preparation.
        await role("dm");
        await page.getByRole("button", { name: "Avvia combattimento", exact: true }).click();
        // R8 refresh (27/09): since R5 the Sentinel's initiative is rolled in the start
        // dialog (Foundry's roll call), not in Preparation's «Incontro preparato».
        await dialog().locator('[data-ct-start-roll-one="goblin-1"]').waitFor();
        const before = (await stored()).log.length;
        await dialog().locator('[data-ct-start-roll-one="goblin-1"]').click();
        await page.waitForFunction(
          ([k, n]) => JSON.parse(localStorage.getItem(k)).log.length > n,
          [key, before],
        );
        const privateRoll = (await stored()).log.at(-1).rolls?.[0];
        check(privateRoll?.visibility === "private", "initiative roll not private");
        await dialog().locator("[data-ct-rollcall-close]").click();
        if (await dialog().count()) await page.keyboard.press("Escape");
        await openIntegrations();
        await openTab("discord");
        const feed = page.locator("[data-int-preview]");
        const text = await feed.innerText();
        check(
          text.includes("Livia · Tiro libero: 1d20 [14] + 3 = 17 · dadi fisici"),
          "physical roll: " + text,
        );
        check(
          /Livia · Tiro libero: 1d20 \[\d+\] \+ 5 = \d+ · dadi digitali/.test(text),
          "digital roll",
        );
        check(!text.includes("Sentinella") && !text.includes("Iniziativa"), "private roll leaked");
        check(!/Integrazioni ·/.test(text), "own configuration changes relayed");
        check(
          (await page.locator("[data-int-withheld]").innerText()).includes("1 tiro privato"),
          "withheld count for the DM",
        );
        // A timestamped note (keyboard submit), then withdrawn with a reason.
        await page
          .locator('[data-int-note-form] [name="note"]')
          .fill("Data sbagliata: sabato alle 20.");
        await page.locator('[data-int-note-form] button[type="submit"]').focus();
        await page.keyboard.press("Enter");
        await page
          .locator("[data-int-preview]", { hasText: "Data sbagliata: sabato alle 20." })
          .waitFor();
        await page.locator("[data-int-retract]").click();
        await dialog().waitFor();
        await page
          .locator('#dialog [name="reason"]')
          .fill("Orario corretto nel messaggio seguente");
        await submitDialog();
        await page.waitForFunction(() => !document.querySelector("[data-int-retract]"));
        check(
          (await rec()).relay.notes[0].retracted?.reason ===
            "Orario corretto nel messaggio seguente",
          "retract reason",
        );
        await page
          .locator('[data-int-note-form] [name="note"]')
          .fill("Prossima sessione: portate le mappe della torre.");
        await page.locator('[data-int-note-form] button[type="submit"]').click();
        await page
          .locator("[data-int-preview]", { hasText: "portate le mappe della torre" })
          .waitFor();
        // Avrae destination: rolls only.
        await page.locator("[data-int-destination]").selectOption({ index: 1 });
        await page.locator("[data-int-preview]").waitFor();
        const avrae = await page.locator("[data-int-preview]").innerText();
        check(
          avrae.includes("dadi fisici") && !avrae.includes("portate le mappe"),
          "Avrae channel content: " + avrae,
        );
        await page.locator("[data-int-destination]").selectOption("webhook");
        await shot("b55-02-discord-dm-1440.png", page.locator("#int-preview-title"));
        // No request left the local server while relaying.
        check(outside.length === requestsBefore, "outside requests: " + outside.join(", "));
        check(
          pageRequests.every((url) => url.startsWith(base) || url.startsWith("blob:")),
          "request outside base",
        );
        // Player: read-only status, same messages, no webhook address and no withheld count.
        await role("player");
        await page.locator("[data-int-relay-status]").waitFor();
        const html = await page.locator("[data-int-page]").innerHTML();
        check(
          !html.includes("api/webhooks") && !html.includes("lanterne-demo-token"),
          "webhook leaked",
        );
        check(
          !(await page.locator("[data-int-withheld]").innerText()).includes("tiro privato"),
          "player told about hidden rolls",
        );
        check(
          (await page.locator("[data-int-preview]").innerText()).includes("portate le mappe"),
          "player preview",
        );
        check(
          (await page.locator("[data-int-note-form], [data-int-relay-form]").count()) === 0,
          "player forms",
        );
        await shot("b55-03-discord-player-1440.png", page.locator("#int-relay-title"));
      },
    );

    // ------------------------------------------------------------------ 3 calendar
    let startsAt = null;
    await group(
      "3 · calendar: session scheduled, .ics with the right instant, feed, reminder",
      async () => {
        await role("dm");
        await page.locator('.campaign-sidebar [data-campaign-tab="sessions"]').click();
        await page.getByRole("heading", { name: "Sessioni", exact: true, level: 1 }).waitFor();
        // Refreshed by the round-2 regression (29/09/2026): the example always has «Il sigillo
        // della torre» on the coming Thursday at 20:30 (sample-clock.mjs, hand-offs); it is
        // cancelled, as in sessions-plus-journey, so the session scheduled here is the next one.
        await page.locator('[data-campaign-cancel-session="session-sample-13"]').click();
        await page.locator('[data-campaign-path="data.reason"]').fill("Sostituita dalla torre");
        await page.locator("[data-campaign-save]").click();
        await page.locator("[data-campaign-apply]").click();
        await page.locator('[data-campaign-cancel-session="session-sample-13"]').waitFor({
          state: "detached",
        });
        await page.getByRole("heading", { name: "Sessioni", exact: true, level: 1 }).waitFor();
        const local = await page.evaluate(() => {
          const d = new Date(Date.now() + 10 * 24 * 3600e3);
          const pad = (n) => String(n).padStart(2, "0");
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T21:00`;
        });
        await page.locator('[data-campaign-new-session="direct"]').click();
        await page.locator('[data-campaign-path="data.title"]').fill("La torre della lanterna");
        await page.locator('[data-campaign-path="data.localTime"]').fill(local);
        await page.locator('[data-campaign-path="data.timeZone"]').fill("Europe/Rome");
        await page.locator("[data-campaign-save]").click();
        await page.locator("[data-campaign-apply]").click();
        await page.getByRole("heading", { name: "Sessioni", exact: true, level: 1 }).waitFor();
        const session = (await stored()).campaign.sessions.find(
          (s) => s.title === "La torre della lanterna",
        );
        startsAt = session.startsAt;
        // The browser resolves 21:00 in Rome independently: the expected UTC instant.
        const expected = await page.evaluate((l) => new Date(l).toISOString(), local);
        check(startsAt === expected, `session instant ${startsAt} vs ${expected}`);
        await openCampaignSection(page, "integrations");
        await openTab("calendar");
        check(
          (await page.locator("[data-int-next-time]").innerText()).includes("21:00"),
          "next session local time",
        );
        const utc = startsAt.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
        const end = new Date(Date.parse(startsAt) + 3 * 3600e3)
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d{3}/, "");
        // The next session's «Aggiungi al calendario» menu holds the .ics (01/10/2026).
        await page.locator("[data-int-next] details.int-cal-menu summary").click();
        const [download] = await Promise.all([
          page.waitForEvent("download"),
          page.locator("[data-int-next] [data-int-cal-ics]").click(),
        ]);
        check(
          /^le-lanterne-di-bruma-\d{4}-\d{2}-\d{2}\.ics$/.test(download.suggestedFilename()),
          "file name",
        );
        const ics = await readDownload(download);
        await download.saveAs(dir + "b55-next-session.ics");
        check(ics.includes(`DTSTART:${utc}\r\n`), "DTSTART " + utc + " in " + ics);
        check(ics.includes(`DTEND:${end}\r\n`), "DTEND");
        check(ics.includes("SUMMARY:Le lanterne di Bruma · La torre della lanterna"), "SUMMARY");
        check(ics.includes("Europe/Rome"), "agreed zone in the description");
        // DM duration 4 h → the file follows.
        await page.locator("[data-int-duration]").selectOption("4");
        await page.locator("[data-int-duration]").waitFor();
        check((await rec()).calendar.durationHours === 4, "duration");
        await shot("b55-04-calendar-dm-1440.png", page.locator("#int-next-title"));
        // Player: personal feed link, rotated with confirmation; reminder 1 hour before.
        await role("player");
        await page.locator("[data-int-feed-create]").click();
        const first = await page.locator("[data-int-feed-url]").inputValue();
        check(
          /^webcal:\/\/d20-studio\.example\/feeds\/lanterns\/[A-Za-z0-9]+\.ics$/.test(first),
          "feed url " + first,
        );
        await page.locator("[data-int-feed-rotate]").click();
        await submitDialog();
        const second = await page.locator("[data-int-feed-url]").inputValue();
        check(second !== first, "rotation kept the same link");
        check((await slice()).feeds.player.retired.length === 1, "retired link not listed");
        check(!(await slice()).feeds.dm, "feed of the DM created");
        await page.locator('[data-int-reminder="remind-1h"]').check();
        await page.waitForFunction(
          (k) =>
            JSON.parse(localStorage.getItem(k)).ext["core-settings"].personal.player[
              "notifications.remind-1h"
            ] === true,
          key,
        );
        // Fifty minutes before the start the reminder is in the bell (B24), for the player only.
        await page.clock.setSystemTime(new Date(Date.parse(startsAt) - 50 * 60e3));
        await page.locator('.service-nav [data-service="requests"]').click();
        await page.locator("#dialog [data-notifications-centre]").waitFor();
        const bell = await page.locator("#dialog").innerText();
        check(
          bell.includes("Promemoria: «La torre della lanterna»") ||
            bell.includes("Promemoria: La torre della lanterna"),
          "reminder missing: " + bell.slice(0, 400),
        );
        await page.keyboard.press("Escape");
        await page.clock.setSystemTime(new Date());
        await shot("b55-05-calendar-player-1440.png", page.locator("#int-feed-title"));
      },
    );

    // ------------------------------------------------------------------ 4 external sheet
    await group(
      "4 · external sheet: link on Livia, new tab, nothing imported; DM link hidden",
      async () => {
        await page.goto(base + "#table");
        await page.locator("#battle-map").waitFor();
        await role("player");
        const menu = page.locator("body > .token-menu");
        await page.locator('#battle-map [data-actor="livia"]').click({ button: "right" });
        await (await revealMenuItem(page, "integrations-sheet-edit")).click(); // B62: «Altro»
        await dialog().waitFor();
        await page
          .locator('#dialog [name="url"]')
          .fill("http://www.dndbeyond.com/characters/000000001");
        await page.locator('#dialog button[type="submit"]').click();
        check(
          (await page.locator("#dialog .dialog-error").innerText()).includes("https://"),
          "http accepted",
        );
        await page
          .locator('#dialog [name="url"]')
          .fill("https://www.dndbeyond.com/characters/000000001");
        await page.locator('#dialog [name="shared"]').check();
        await submitDialog();
        const livia = JSON.stringify((await stored()).actors.livia);
        check(
          (await slice()).sheets.livia.url === "https://www.dndbeyond.com/characters/000000001",
          "link stored",
        );
        await page.locator('#battle-map [data-actor="livia"]').click({ button: "right" });
        await (await revealMenuItem(page, "integrations-sheet-open")).waitFor(); // B62: submenu
        await shot("b55-06-token-menu-sheet-1440.png");
        const openItem = await revealMenuItem(page, "integrations-sheet-open");
        const [tab] = await Promise.all([context.waitForEvent("page"), openItem.click()]);
        await tab.waitForLoadState();
        check(
          tab.url() === "https://www.dndbeyond.com/characters/000000001",
          "new tab url " + tab.url(),
        );
        check(
          outside.some((row) => row.includes("dndbeyond.com/characters/000000001")),
          "stub not used",
        );
        await tab.close();
        check(JSON.stringify((await stored()).actors.livia) === livia, "opening changed the sheet");
        // The inspector line on the Creature tab. The tray rolls of group 2 left this
        // identity's sidebar on Chat › Dadi (B61 remembers the tab): open Creature first.
        await page.keyboard.press("Escape");
        const creatureTab = page.locator('.table-tabs [data-table-tab="creature"]');
        if ((await creatureTab.getAttribute("aria-selected")) !== "true") await creatureTab.click();
        await page.locator('#battle-map [data-actor="livia"]').click();
        await page.locator("[data-int-sheet-panel]").waitFor();
        check(
          (await page.locator("[data-int-sheet-panel]").innerText()).includes("dndbeyond.com"),
          "inspector",
        );
        await shot("b55-07-inspector-sheet-1440.png", page.locator("[data-int-sheet-panel]"));
        // DM: a link on the Sentinel for the DM only; the player's menu for it has no Open.
        await role("dm");
        await page.locator('#battle-map [data-actor="goblin-1"]').click({ button: "right" });
        await (await revealMenuItem(page, "integrations-sheet-edit")).click(); // B62: «Altro»
        await page
          .locator('#dialog [name="url"]')
          .fill("https://www.dndbeyond.com/monsters/16907-goblin-warrior");
        await submitDialog();
        check((await slice()).sheets["goblin-1"].shared === false, "DM link shared");
        check((await stored()).log.at(-1).visibility === "private", "DM link label public");
        // The DM also reads Livia's shared link (Owlbear: the link lives on the token).
        await page.locator('#battle-map [data-actor="livia"]').click({ button: "right" });
        await (await revealMenuItem(page, "integrations-sheet-open")).waitFor(); // B62: submenu
        await page.keyboard.press("Escape");
        await role("player");
        await page.locator('#battle-map [data-actor="goblin-1"]').click({ button: "right" });
        await page.waitForTimeout(250);
        check(
          (await menu.locator('[data-token-menu-item^="integrations-sheet"]').count()) === 0,
          "player reaches the DM's link",
        );
        for (let i = 0; i < 3 && (await menu.evaluate((n) => !n.hidden).catch(() => false)); i++)
          await page.keyboard.press("Escape");
      },
    );

    // ------------------------------------------------------------------ 5 documented import
    await group(
      "5 · import: errors with lines, private character in the library, update, Undo",
      async () => {
        await role("player");
        await openIntegrations();
        await openTab("import");
        await page.locator("[data-int-docs] summary").click();
        check(
          (await page.locator("[data-int-docs]").innerText()).includes("source_id"),
          "documentation",
        );
        await page
          .locator("[data-int-csv]")
          .fill("format,d20-sheet-csv\nversion,1\nsource_id,x\nname,Brina\nlevel,25\ncolore,blu");
        await page.locator("[data-int-preview-import]").click();
        const problems = await page.locator("[data-int-import-errors]").innerText();
        check(
          problems.includes("Riga 5") && problems.includes("colore (riga 6)"),
          "errors: " + problems,
        );
        await page.locator("[data-int-example]").click();
        await page.locator('[data-int-import-preview="new"]').waitFor();
        await shot("b55-08-import-preview-1440.png", page.locator("#int-import-title"));
        await page.locator('[data-int-import-preview="new"] [name="name"]').fill("Tessa");
        await page.locator('[data-int-import-preview="new"] button[type="submit"]').click();
        await page.locator("[data-int-imported]").waitFor();
        const s1 = await stored();
        const id = Object.keys(s1.ext.integrations.imports)[0];
        const tessa = s1.actors[id];
        check(
          tessa.name === "Tessa" && tessa.visibility === "private" && tessa.owner === "player",
          "actor",
        );
        check(
          tessa.imported.format === "d20-sheet-csv" && tessa.inventory.length === 2,
          "provenance/items",
        );
        check(s1.log.at(-1).visibility === "private", "import label public");
        // Update from the same source_id: level 4, DEX 17; inventory stays.
        await page
          .locator("[data-int-csv]")
          .fill(
            [
              "campo,valore",
              "format,d20-sheet-csv",
              "version,1",
              "source_id,tessa-001",
              "name,Tessa Pietralieve",
              "class,Ladra",
              "level,4",
              "str,8",
              "dex,17",
              "con,14",
              "int,12",
              "wis,10",
              "cha,13",
              "max_hp,31",
              "ac,14",
              "speed,9",
            ].join("\n"),
          );
        await page.locator("[data-int-preview-import]").click();
        await page.locator('[data-int-import-preview="update"]').waitFor();
        const changes = await page.locator("[data-int-changes]").innerText();
        check(
          changes.includes("Livello") && changes.includes("DEX") && changes.includes("31"),
          "changes: " + changes,
        );
        await page.locator("[data-int-import-update]").click();
        await page.waitForFunction(
          ([k, i]) => JSON.parse(localStorage.getItem(k)).actors[i].level === 4,
          [key, id],
        );
        const after = (await stored()).actors[id];
        check(
          after.abilities.dex === 17 && after.maxHp === 31 && after.inventory.length === 2,
          "update result",
        );
        // Undo the update from the section.
        await page.locator("[data-int-undo]").click();
        await page.waitForFunction(
          ([k, i]) => JSON.parse(localStorage.getItem(k)).actors[i].level === 3,
          [key, id],
        );
        // The character opens in the library (Characters page), private.
        await page.locator(`[data-int-open-sheet="${id}"]`).click();
        await page.waitForFunction((i) => location.hash.includes(i), id);
        check((await page.locator("#content").innerText()).includes("Tessa"), "sheet page");
        await page.locator('.nav-link[data-nav="characters"]').click();
        await page.locator("#content", { hasText: "Tessa" }).waitFor();
        await role("dm");
        check(
          !(await page.locator("#content").innerText()).includes("Tessa"),
          "DM sees the private import",
        );
      },
    );

    // ------------------------------------------------------------------ 6 API and webhooks
    await group(
      "6 · API: token shown once, 200 then 401 after revoke; DM webhooks with test and Undo",
      async () => {
        await role("player");
        await openIntegrations();
        await openTab("api");
        check((await page.locator("[data-int-webhook-new]").count()) === 0, "player sees webhooks");
        await page.locator('[data-int-token-form] [name="name"]').fill("Bot del gruppo");
        await page.locator('[data-int-token-form] button[type="submit"]').click();
        await dialog().waitFor();
        const secret = await page.locator("#dialog [data-int-secret]").inputValue();
        check(/^d20_pat_[A-Za-z0-9]{32}$/.test(secret), "secret " + secret);
        await page.keyboard.press("Escape");
        check(!JSON.stringify(await stored()).includes(secret), "secret stored");
        check(
          (await page.locator('[data-int-api-form] [name="token"]').inputValue()) === secret,
          "tester prefill",
        );
        await page.locator('[data-int-api-form] button[type="submit"]').click();
        await page.locator('[data-int-api-result="200"]').waitFor();
        const body = await page.locator("[data-int-api-result]").innerText();
        check(
          body.includes('"Livia"') && body.includes('"Mira"') && !body.includes("Tessa"),
          "API body: " + body,
        );
        await shot("b55-09-api-player-1440.png", page.locator("#int-tokens-title"));
        await page.locator("[data-int-token-revoke]").click();
        await submitDialog();
        await page.locator('[data-int-api-form] button[type="submit"]').click();
        await page.locator('[data-int-api-result="401"]').waitFor();
        // DM: a webhook with a test delivery, deleted and restored with Undo.
        await role("dm");
        await page.locator("[data-int-webhook-new]").click();
        await dialog().waitFor();
        await page.locator('#dialog [name="name"]').fill("Annunci del gruppo");
        await page.locator('#dialog [name="url"]').fill("https://hooks.example/lanterne");
        await page.locator('#dialog [name="event"]').selectOption("sessions");
        await page.locator('#dialog [name="format"]').selectOption("discord");
        await submitDialog();
        const hookId = (await rec()).webhooks[0].id;
        await page.locator(`[data-int-webhook-test="${hookId}"]`).click();
        await page.locator(`[data-int-webhook="${hookId}"] details summary`).click();
        check(
          (
            await page.locator(`[data-int-webhook="${hookId}"] [data-int-deliveries]`).innerText()
          ).includes("Consegna di prova"),
          "test delivery",
        );
        await shot("b55-10-webhooks-dm-1440.png", page.locator("#int-webhooks-title"));
        await page.locator(`[data-int-webhook-delete="${hookId}"]`).click();
        await submitDialog();
        await page.locator("[data-int-webhooks-empty]").waitFor();
        await page.locator("[data-int-undo]").click();
        await page.locator(`[data-int-webhook="${hookId}"]`).waitFor();
        check(
          outside.filter((r) => r.includes("hooks.example")).length === 0,
          "webhook called the network",
        );
      },
    );

    // ------------------------------------------------------------------ 7 reload and offline
    await group(
      "7 · reload keeps everything; offline blocks shared changes, downloads still work",
      async () => {
        await page.reload();
        await page.locator("[data-int-page]").waitFor();
        const r = await rec();
        const s = await slice();
        check(
          r.modules.api && r.avrae.links.length === 1 && r.webhooks.length === 1,
          "campaign data",
        );
        check(r.relay.notes.length === 2 && r.calendar.durationHours === 4, "notes/duration");
        check(
          s.sheets.livia && s.sheets["goblin-1"] && Object.keys(s.imports).length === 1,
          "sheets/imports",
        );
        check(s.tokens.player[0].revokedAt && s.feeds.player.retired.length === 1, "tokens/feeds");
        await role("dm");
        await page.locator('[data-service="preferences"]').click();
        await page.locator('#dialog [name="offline"]').check();
        await submitDialog();
        await openTab("discord");
        await page.locator(".int-offline").waitFor();
        await page.locator('[data-int-note-form] [name="note"]').fill("Senza rete");
        await page.locator('[data-int-note-form] button[type="submit"]').click();
        check(
          (await page.locator("[data-int-note-form] [data-int-form-error]").innerText()).includes(
            "senza rete",
          ),
          "offline refusal",
        );
        check((await rec()).relay.notes.length === 2, "offline note stored");
        await openTab("calendar");
        // The next session's «Aggiungi al calendario» menu holds the .ics (01/10/2026).
        await page.locator("[data-int-next] details.int-cal-menu summary").click();
        const [download] = await Promise.all([
          page.waitForEvent("download"),
          page.locator("[data-int-next] [data-int-cal-ics]").click(),
        ]);
        check((await readDownload(download)).includes("BEGIN:VEVENT"), "offline download");
        await page.locator('[data-service="preferences"]').click();
        await page.locator('#dialog [name="offline"]').uncheck();
        await submitDialog();
        check(await noOverflow(), "desktop overflow");
        const small = await smallTargets(page, ".int-page");
        check(!small.length, "desktop targets < 40px: " + JSON.stringify(small));
      },
    );

    // ------------------------------------------------------------------ 8 EN phone 390
    const saved = await page.evaluate((k) => localStorage.getItem(k), key);
    await group(
      "8 · EN phone 390 touch: calendar .ics, Discord preview, external sheet, no overflow",
      async () => {
        const phoneContext = await browser.newContext({
          viewport: { width: 390, height: 844 },
          hasTouch: true,
          isMobile: true,
          timezoneId: "Europe/London",
          locale: "en-GB",
          acceptDownloads: true,
          serviceWorkers: "block",
        });
        await guard(phoneContext, "phone");
        const phone = await phoneContext.newPage();
        phone.on("pageerror", (error) => errors.push("phone: " + error.message));
        await phone.goto(base + "#home");
        await phone.evaluate(([k, v]) => localStorage.setItem(k, v), [key, saved]);
        await phone.reload();
        await phone.locator('[data-service="preferences"]').tap();
        await phone.locator('#dialog [name="lang"]').selectOption("en");
        await submitDialog(phone, true);
        await role("player", phone);
        await phone.goto(base + "#campaign?tab=integrations&id=calendar");
        await phone.locator('[data-int-page="calendar"]').waitFor();
        check(
          (await phone.locator("[data-campaign-heading]").innerText()) === "Integrations",
          "EN heading",
        );
        check(
          (await phone.locator("[data-int-next-time]").innerText()).includes("(Europe/Rome)"),
          "zone label",
        );
        await phone.locator("[data-int-next] details.int-cal-menu summary").tap();
        const [download] = await Promise.all([
          phone.waitForEvent("download"),
          phone.locator("[data-int-next] [data-int-cal-ics]").tap(),
        ]);
        const ics = await readDownload(download);
        const utc = startsAt.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
        check(ics.includes(`DTSTART:${utc}\r\n`), "phone DTSTART in another zone");
        check(
          ics.includes("Agreed time") && ics.includes("Planned duration: 4 h"),
          "EN description",
        );
        check(await noOverflow(phone), "phone overflow calendar");
        let small = await smallTargets(phone, ".int-page");
        check(!small.length, "phone targets: " + JSON.stringify(small));
        await shot(
          "b55-11-calendar-phone-390.png",
          phone.locator("[data-campaign-heading]"),
          phone,
        );
        await openTab("discord", phone, true);
        check(
          (await phone.locator("[data-int-preview]").innerText()).includes("physical dice"),
          "EN preview text",
        );
        const metaLine = await phone.locator(".int-meta").first().innerText();
        check(
          metaLine.startsWith("Pattern: Foundry to Discord and relay modules"),
          "EN pattern line: " + metaLine,
        );
        check(await noOverflow(phone), "phone overflow discord");
        small = await smallTargets(phone, ".int-page");
        check(!small.length, "phone targets discord: " + JSON.stringify(small));
        await shot("b55-12-discord-phone-390.png", phone.locator("#int-preview-title"), phone);
        await openTab("import", phone, true);
        const [template] = await Promise.all([
          phone.waitForEvent("download"),
          phone.locator("[data-int-template]").tap(),
        ]);
        check(
          template.suggestedFilename() === "d20-sheet-csv-example.csv",
          "EN template name " + template.suggestedFilename(),
        );
        await phone.locator("[data-int-example]").tap();
        await phone.locator('[data-int-import-preview="update"]').waitFor();
        check(await noOverflow(phone), "phone overflow import");
        await shot(
          "b55-13-import-phone-390.png",
          phone.locator("[data-int-import-preview]"),
          phone,
        );
        // Table: tap Livia, then "…" (Owlbear) → Open external sheet.
        await phone.goto(base + "#table");
        await phone.locator("#battle-map").waitFor();
        await quietTips(phone);
        await phone.locator('#battle-map [data-actor="livia"]').tap();
        await phone.locator("[data-token-menu-open]").scrollIntoViewIfNeeded();
        await phone.locator("[data-token-menu-open]").tap();
        const item = await revealMenuItem(phone, "integrations-sheet-open", true); // B62
        check((await item.innerText()).includes("Open external sheet"), "EN menu label");
        const [tab] = await Promise.all([phoneContext.waitForEvent("page"), item.tap()]);
        await tab.waitForLoadState();
        check(tab.url() === "https://www.dndbeyond.com/characters/000000001", "phone new tab");
        await tab.close();
        await phoneContext.close();
      },
    );

    // ------------------------------------------------------------------ 9 review fixes
    await group(
      "9 · review: private counts, webhook removal, dialog errors, pauses, light theme, audience",
      async () => {
        await page.goto(base + "#campaign?tab=integrations&id=import");
        await page.locator('[data-int-page="import"]').waitFor();
        const [template] = await Promise.all([
          page.waitForEvent("download"),
          page.locator("[data-int-template]").click(),
        ]);
        check(template.suggestedFilename() === "d20-sheet-csv-esempio.csv", "IT template name");
        // (a) The player's "Just me" note never changes what the DM is told.
        await role("dm");
        await openTab("discord");
        const withheldBefore = await page.locator("[data-int-withheld]").innerText();
        await role("player");
        await page.goto(base + "#notes");
        await page.getByRole("button", { name: "Nuovo appunto", exact: true }).first().click();
        await page.locator("#content textarea").first().fill("Sospetto che Doran menta sul faro.");
        await page.getByRole("button", { name: "Salva bozza e aggiorna anteprima" }).click();
        await page.getByRole("button", { name: "Salva contenuto per questi destinatari" }).click();
        await page.waitForFunction(
          (k) =>
            JSON.parse(localStorage.getItem(k)).log.some(
              (e) =>
                e.controller === "player" &&
                e.visibility === "private" &&
                e.label === "Contenuto di campagna aggiornato",
            ),
          key,
        );
        await role("dm");
        await page.goto(base + "#campaign?tab=integrations&id=discord");
        await page.locator('[data-int-page="discord"]').waitFor();
        const withheldAfter = await page.locator("[data-int-withheld]").innerText();
        check(
          withheldAfter === withheldBefore,
          `the DM learns about the player's private note: ${withheldBefore} → ${withheldAfter}`,
        );
        // (b) Discord's "Delete Webhook": the secret leaves the app; Undo brings it back.
        await page.locator("[data-int-relay-remove]").click();
        await dialog().waitFor();
        check((await dialog().innerText()).includes("••••0001"), "masked address in the dialog");
        await submitDialog();
        await page.waitForFunction(() => !document.querySelector("[data-int-relay-remove]"));
        check((await rec()).relay.webhook === "", "webhook kept");
        check(
          (await page.locator('[data-int-destination] option[value="webhook"]').count()) === 0,
          "removed webhook still a destination",
        );
        check(
          (await rec()).history.at(-1).it === "Webhook Discord rimosso",
          "history row for the removal",
        );
        await page.locator("[data-int-undo]").click();
        await page.locator("[data-int-relay-remove]").waitFor();
        check((await rec()).relay.webhook.endsWith("0001"), "Undo did not restore the webhook");
        // (c) A paused webhook never delivers later what happened while it was paused.
        const hookId = (await rec()).webhooks[0].id;
        const newSession = async (title, days) => {
          await page.goto(base + "#campaign?tab=sessions");
          await page.getByRole("heading", { name: "Sessioni", exact: true, level: 1 }).waitFor();
          const local = await page.evaluate((n) => {
            const d = new Date(Date.now() + n * 24 * 3600e3);
            const pad = (v) => String(v).padStart(2, "0");
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T21:00`;
          }, days);
          await page.locator('[data-campaign-new-session="direct"]').click();
          await page.locator('[data-campaign-path="data.title"]').fill(title);
          await page.locator('[data-campaign-path="data.localTime"]').fill(local);
          await page.locator('[data-campaign-path="data.timeZone"]').fill("Europe/Rome");
          await page.locator("[data-campaign-save]").click();
          await page.locator("[data-campaign-apply]").click();
          await page.getByRole("heading", { name: "Sessioni", exact: true, level: 1 }).waitFor();
        };
        const apiTab = async () => {
          await page.goto(base + "#campaign?tab=integrations&id=api");
          await page.locator('[data-int-page="api"]').waitFor();
        };
        await apiTab();
        await page.locator(`[data-int-webhook-toggle="${hookId}"]`).uncheck();
        await page.waitForFunction(
          (k) =>
            JSON.parse(localStorage.getItem(k)).ext.integrations.campaigns.lanterns.webhooks[0]
              .active === false,
          key,
        );
        await newSession("La cripta del faro", 12);
        await apiTab();
        await page.locator(`[data-int-webhook-toggle="${hookId}"]`).check();
        await page.waitForFunction(
          (k) =>
            JSON.parse(localStorage.getItem(k)).ext.integrations.campaigns.lanterns.webhooks[0]
              .active === true,
          key,
        );
        await newSession("Il ritorno a Bruma", 14);
        await apiTab();
        await page.locator(`[data-int-webhook="${hookId}"] details summary`).click();
        const deliveries = await page
          .locator(`[data-int-webhook="${hookId}"] [data-int-deliveries]`)
          .innerText();
        check(
          deliveries.includes("Il ritorno a Bruma") && !deliveries.includes("La cripta del faro"),
          "paused period delivered: " + deliveries.slice(0, 300),
        );
        // (d) Offline: refusals inside the confirmation dialogs (never a toast behind them).
        await page.locator('[data-service="preferences"]').click();
        await page.locator('#dialog [name="offline"]').check();
        await submitDialog();
        await page.locator(`[data-int-webhook-delete="${hookId}"]`).click();
        await dialog().waitFor();
        await page.locator('#dialog button[type="submit"]').click();
        await page.locator("#dialog .dialog-error:not([hidden])").waitFor();
        check(
          (await page.locator("#dialog .dialog-error").innerText()).includes("senza rete"),
          "offline error in the dialog",
        );
        check((await rec()).webhooks.length === 1, "deleted offline");
        await page.keyboard.press("Escape");
        await page.goto(base + "#table");
        await page.locator("#battle-map").waitFor();
        await role("player");
        const menu = page.locator("body > .token-menu");
        await page.locator('#battle-map [data-actor="livia"]').click({ button: "right" });
        await (await revealMenuItem(page, "integrations-sheet-edit")).click(); // B62: «Altro»
        await dialog().waitFor();
        check(
          (await page.locator("#int-sheet-audience").innerText()).includes("chi la gioca e il DM"),
          "who reads an unshared link",
        );
        await page.locator("#dialog [data-int-sheet-remove]").click();
        await page.locator("#dialog .dialog-error:not([hidden])").waitFor();
        check(
          (await page.locator("#dialog .dialog-error").innerText()).includes("senza rete"),
          "offline link removal error in the dialog",
        );
        check(Boolean((await slice()).sheets.livia), "link removed offline");
        await page.keyboard.press("Escape");
        await page.locator('[data-service="preferences"]').click();
        await page.locator('#dialog [name="offline"]').uncheck();
        await submitDialog();
        // (e) Light theme: the channel, the command field and code blocks stay readable.
        const themeSelect = '#dialog select[name="setting:preferences-look.theme"]';
        await page.locator('[data-service="preferences"]').click();
        const originalTheme = await page.locator(themeSelect).inputValue();
        await page.locator(themeSelect).selectOption({ label: "Chiaro" });
        await submitDialog();
        await role("dm");
        await page.goto(base + "#campaign?tab=integrations&id=discord");
        await page.locator('[data-int-page="discord"]').waitFor();
        const contrast = (selectors) =>
          page.evaluate((list) => {
            const lum = (c) => {
              const [r, g, b] = c
                .match(/[\d.]+/g)
                .slice(0, 3)
                .map((v) => {
                  const x = Number(v) / 255;
                  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
                });
              return 0.2126 * r + 0.7152 * g + 0.0722 * b;
            };
            const background = (node) => {
              for (let n = node; n; n = n.parentElement) {
                const c = getComputedStyle(n).backgroundColor;
                if (c !== "transparent" && !/rgba\(.*, 0\)$/.test(c)) return c;
              }
              return "rgb(255, 255, 255)";
            };
            return Object.fromEntries(
              list.map((sel) => {
                const n = document.querySelector(sel);
                if (!n) return [sel, null];
                const [a, b] = [lum(getComputedStyle(n).color), lum(background(n))].sort(
                  (x, y) => y - x,
                );
                return [sel, Math.round(((a + 0.05) / (b + 0.05)) * 10) / 10];
              }),
            );
          }, selectors);
        const discord = await contrast([".int-msg-text", ".int-command input"]);
        check(
          Object.values(discord).every((v) => v !== null && v >= 4.5),
          "light contrast " + JSON.stringify(discord),
        );
        await shot("b55-14-discord-light-1440.png", page.locator("#int-preview-title"));
        await apiTab();
        await page.locator(`[data-int-webhook="${hookId}"] details summary`).click();
        const api = await contrast([".int-deliveries pre"]);
        check(api[".int-deliveries pre"] >= 4.5, "light contrast code " + JSON.stringify(api));
        await page.locator('[data-service="preferences"]').click();
        await page.locator(themeSelect).selectOption(originalTheme);
        await submitDialog();
      },
    );

    check(!errors.length, "page errors: " + errors.join(" | "));
    check(
      outside.every((row) => row.includes("dndbeyond.com")),
      "unexpected outside requests: " + outside.join(", "),
    );
    return { passed, outside, errors };
  } catch (error) {
    await page.screenshot({ path: dir + "b55-failure.png" }).catch(() => {});
    return { failed: error.message, passed, outside, errors };
  } finally {
    await context.close();
  }
}
