async (rootPage) => {
  // B62: the log is the first sub-tab of the sidebar's «Chat» tab; the core's toggle
  // (data-table="log") is a hidden handle. As the old Registro tab: its own ✕ closes an open
  // log, otherwise the log opens (the Chat tab, then its Registro sub-tab when needed).
  const toggleLog = async (p, tap = false) => {
    const close = p.locator("#content [data-chat-close]");
    if (await close.count()) return tap ? close.first().tap() : close.first().click();
    return openTablePanel(p, "log", tap);
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
  // B17 review fixes: one browser check per finding, in the review's order. Each step
  // resets this browser's synthetic demo state; images go to the B17 evidence directory
  // (review-fixes/). The fixtures noise0-3.png (434 KB) and big-680kb.png live there too.
  const steps = [
    [
      "P1 · DM language note names only campaign characters (no private builder sheet)",
      async (page) => {
        const base = "http://127.0.0.1:8879/";
        const shots =
          "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B17/review-fixes/";
        const out = {};
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.goto(base + "#characters");
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        const button = (name) => page.getByRole("button", { name, exact: true });
        const field = (path) => page.locator('[data-builder-path="' + path + '"]');
        const section = (id) =>
          page.locator('.builder-sections [data-builder-section="' + id + '"]');
        const saved = () =>
          page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
        await page.locator("#demo-role").selectOption("player");
        await button("Crea personaggio").click();
        await field("identity.name").fill("Neris");
        await section("class").click();
        if ((await field("classes.0.classId").count()) === 0)
          await button("Aggiungi classe").click();
        await field("classes.0.classId").selectOption("fighter");
        await section("origin").click();
        await field("origin.backgroundId").selectOption("criminal");
        await field("origin.backgroundBonuses.dex").fill("2");
        await field("origin.backgroundBonuses.con").fill("1");
        await field("origin.speciesId").selectOption("halfling");
        await section("abilities").click();
        for (const [index, ability] of ["str", "dex", "con", "int", "wis", "cha"].entries())
          await field("abilities.assignment." + ability).selectOption(String(index));
        await section("skills").click();
        for (const skill of ["athletics", "perception"])
          await page
            .locator('[data-builder-list="skills.selected"][value="' + skill + '"]')
            .check();
        for (const language of ["elvish", "dwarvish"])
          await page
            .locator('[data-builder-list="skills.languages"][value="' + language + '"]')
            .check();
        await field("skills.confirmed").check();
        await section("features").click();
        for (const [grant, option] of [
          ["class:fighter:fighting-style", "defense"],
          ["class:fighter:mastery", "quarterstaff"],
          ["class:fighter:mastery", "dagger"],
          ["class:fighter:mastery", "longsword"],
        ])
          await page
            .locator('[data-builder-feature="' + option + '"][data-grant="' + grant + '"]')
            .check();
        await field("features.confirmed").check();
        await section("spells").click();
        await field("spells.confirmed").check();
        await section("equipment").click();
        await field("equipment.confirmed").check();
        await section("review").click();
        if (await page.locator("[data-builder-accept-incomplete]").count())
          await page.locator("[data-builder-accept-incomplete]").check();
        await button("Crea scheda").click();
        await page.getByRole("heading", { name: "Neris", exact: true }).waitFor();
        const st = await saved();
        const neris = Object.values(st.actors).find((a) => a.name === "Neris");
        out.neris = {
          id: neris.id,
          visibility: neris.visibility,
          owner: neris.owner,
          campaignIds: neris.campaignIds,
          languages: neris.languages,
        };
        // DM speaks Elvish as a named NPC
        await page.locator("#demo-role").selectOption("dm");
        await page.goto(base + "#table");
        await page.locator("#battle-map").waitFor();
        const panel = page.locator("[data-chat-panel]");
        if (!(await panel.count())) await toggleLog(page);
        await panel.waitFor();
        await panel.locator("label.chat-mode", { hasText: "Dialogo" }).click();
        await page.waitForTimeout(150);
        await panel.locator("[data-chat-speaker]").selectOption("npc");
        await page.waitForTimeout(150);
        await panel.locator("[data-chat-npc]").fill("Guardia");
        await panel.locator("[data-chat-language]").selectOption("elvish");
        await page.waitForTimeout(150);
        await panel.locator("[data-chat-text]").fill("Fermi, chi va là?");
        await panel.locator("[data-chat-text]").press("Enter");
        await page.waitForTimeout(400);
        out.dmNote = await panel
          .locator(".chat-item", { hasText: "Fermi, chi va là?" })
          .innerText();
        out.ok = /Capiscono: Livia$/m.test(out.dmNote) && !out.dmNote.includes("Neris");
        await panel
          .locator(".chat-item", { hasText: "Fermi, chi va là?" })
          .screenshot({ path: shots + "f1-dm-understood-by.png" });
        return out;
      },
    ],
    [
      "P1 · chat attachment budget: per-file limit, refusal with space used, later changes persist, deleting frees space",
      async (page) => {
        const base = "http://127.0.0.1:8879/";
        const dir =
          "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B17/review-fixes/";
        const big = dir + "big-680kb.png";
        const out = {};
        const stored = () =>
          page.evaluate(() => localStorage.getItem("d20-studio-blueprint-v1").length);
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(base + "#table");
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.locator("#battle-map").waitFor();
        const panel = page.locator("[data-chat-panel]");
        const text = panel.locator("[data-chat-text]");
        if (!(await panel.count())) await toggleLog(page);
        await panel.waitFor();
        // A 680 KB file is refused by the per-file limit, before anything is stored.
        await panel.locator("[data-chat-file]").setInputFiles(big);
        await panel.locator("[data-chat-error]:not([hidden])").waitFor();
        out.tooBig = await panel.locator("[data-chat-error]").innerText();
        out.sizes = [await stored()];
        for (let i = 0; i < 2; i++) {
          await panel.locator("[data-chat-file]").setInputFiles(dir + `noise${i}.png`);
          await panel.locator(".chat-attachment").waitFor();
          await text.fill("Mappa " + i);
          await text.press("Enter");
          await page.waitForTimeout(400);
          out.sizes.push(await stored());
        }
        // The third image does not fit the chat's budget: refused at once with the space used.
        await text.fill("Mappa 2");
        await panel.locator("[data-chat-file]").setInputFiles(dir + "noise2.png");
        await panel.locator("[data-chat-error]:not([hidden])").waitFor();
        out.refusal = await panel.locator("[data-chat-error]").innerText();
        out.attachedAfterRefusal = await panel.locator(".chat-attachment").count();
        out.draftKept = await text.inputValue();
        await page.screenshot({ path: dir + "f2-budget-refusal-1440.png" });
        // An unrelated game change still persists: a physical free roll survives the reload.
        await page.getByRole("button", { name: "Tira i dadi", exact: true }).click();
        // W2b1 integration: with B34 built «Tira i dadi» opens the Dadi tray (DDB-151); the same
        // physical 17 + 2 is recorded from it. The one-die dialog stays the fallback.
        await page.locator("[data-dtray-formula], #dialog [name=modifier]").first().waitFor();
        if (await page.locator("[data-dtray-formula]").count()) {
          await page.locator("[data-dtray-formula]").fill("1d20+2");
          await page.locator("[data-dtray-formula]").press("Tab");
          await page.locator('label.dtray-seg:has([data-dtray-mode][value="physical"])').click();
          await page.locator('[data-dtray-face="0"]').fill("17");
          await page.locator("[data-dtray-roll-button]").click();
        } else {
          await page.locator("#dialog [name=modifier]").fill("2");
          await page.locator("#dialog [name=mode]").selectOption("physical");
          await page.locator("#dialog [name=natural]").fill("17");
          await page.getByRole("button", { name: "Registra tiro", exact: true }).click();
        }
        await page.waitForTimeout(400);
        out.storageWarning = await page.locator(".save-warning").count();
        await page.reload();
        await page.locator("#battle-map").waitFor();
        out.lastLabels = await page.evaluate(() =>
          JSON.parse(localStorage.getItem("d20-studio-blueprint-v1"))
            .log.map((l) => l.label)
            .slice(-2),
        );
        out.storedImages = await page.evaluate(
          () =>
            Object.values(
              JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")).ext.chat.messages,
            ).filter((m) => m.image).length,
        );
        // Deleting an old image frees space: the refused image then fits.
        await page.locator("#demo-role").selectOption("player");
        const p2 = page.locator("[data-chat-panel]");
        if (!(await p2.count())) await toggleLog(page);
        await p2.waitFor();
        const item = p2.locator("[data-chat-message]", { hasText: "Mappa 0" });
        await item.locator("summary").click();
        await item.getByRole("button", { name: "Ritira il messaggio…" }).click();
        await page.locator("#dialog").getByRole("button", { name: "Elimina", exact: true }).click();
        await page.waitForTimeout(300);
        await p2.locator("[data-chat-file]").setInputFiles(dir + "noise2.png");
        await p2.locator(".chat-attachment").waitFor();
        await p2.locator("[data-chat-text]").fill("Mappa 2");
        await p2.locator("[data-chat-text]").press("Enter");
        await page.waitForTimeout(400);
        out.afterFree = await page.evaluate(() =>
          JSON.parse(localStorage.getItem("d20-studio-blueprint-v1"))
            .ext.chat.messages.filter((m) => m.image)
            .map((m) => m.text),
        );
        out.ok =
          /massimo 500 KB/.test(out.tooBig) &&
          /Spazio della chat esaurito/.test(out.refusal) &&
          out.attachedAfterRefusal === 0 &&
          out.draftKept === "Mappa 2" &&
          out.storageWarning === 0 &&
          /(d20: 17|\[17\]) \+ 2 = 19/.test(out.lastLabels.join(" ")) &&
          out.storedImages === 2 &&
          out.afterFree.join() === "Mappa 1,Mappa 2";
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        return out;
      },
    ],
    [
      "P2 · notices leave with the Table; #table?tab=chat-log opens the log once",
      async (page) => {
        const base = "http://127.0.0.1:8879/";
        const out = {};
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(base + "#table");
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.locator("#battle-map").waitFor();
        const role = async (v) => {
          await page.locator("#demo-role").selectOption(v);
          await page.waitForTimeout(300);
        };
        await role("dm");
        await page.goto(base + "#table");
        await page.locator("#battle-map").waitFor();
        await role("player");
        await page.goto(base + "#table");
        await page.locator("#battle-map").waitFor();
        const panel = page.locator("[data-chat-panel]");
        await toggleLog(page);
        await panel.waitFor();
        await panel.locator("[data-chat-text]").fill("Ci vediamo alla torre");
        await panel.locator("[data-chat-text]").press("Enter");
        await page.waitForTimeout(250);
        await panel.locator("[data-chat-close]").click();
        await role("dm");
        await page.goto(base + "#table");
        await page.locator("#battle-map").waitFor();
        await page.waitForTimeout(400);
        out.toastsOnTable = await page.locator(".chat-toast").count();
        // navigate away to the campaign page while notices are up
        await page.goto(base + "#campaign");
        await page.waitForTimeout(500);
        out.toastsOnCampaign = await page.locator(".chat-toast").count();
        out.hash1 = await page.evaluate(() => location.hash);
        if (out.toastsOnCampaign) {
          await page.locator(".chat-toast [data-chat-toast-open]").first().click();
          await page.waitForTimeout(500);
        }
        out.hashAfterOpen = await page.evaluate(() => location.hash);
        out.panelOpen = await page.locator("[data-chat-panel]").count();
        // From the campaign page, the notice's button is not there any more; use the route directly.
        await page.goto(base + "#campaign");
        await page.waitForTimeout(300);
        await page.evaluate(() => (location.hash = "#table?tab=chat-log"));
        await page.locator("[data-chat-panel]").waitFor();
        out.routeOpens = await page.locator("[data-chat-panel]").count();
        out.focusInComposer = await page.evaluate(() =>
          document.activeElement?.matches("[data-chat-text]"),
        );
        // Closing it keeps it closed on later renders of the same view.
        await page.locator("[data-chat-close]").click();
        await page.waitForTimeout(300);
        await page.locator("#demo-role").selectOption("player");
        await page.waitForTimeout(300);
        await page.locator("#demo-role").selectOption("dm");
        await page.waitForTimeout(300);
        out.staysClosed = (await page.locator("[data-chat-panel]").count()) === 0;
        out.ok =
          out.toastsOnTable > 0 &&
          out.toastsOnCampaign === 0 &&
          out.routeOpens === 1 &&
          out.focusInComposer &&
          out.staysClosed;
        return out;
      },
    ],
    [
      "P2 · a chat notification in the bell opens the Table with the log open",
      async (page) => {
        const base = "http://127.0.0.1:8879/";
        const out = {};
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(base + "#table");
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.locator("#battle-map").waitFor();
        const role = async (v) => {
          await page.locator("#demo-role").selectOption(v);
          await page.waitForTimeout(300);
        };
        await role("dm");
        await page.goto(base + "#campaign");
        await page.waitForTimeout(300);
        await role("player");
        await page.goto(base + "#table");
        await page.locator("#battle-map").waitFor();
        const panel = page.locator("[data-chat-panel]");
        await toggleLog(page);
        await panel.waitFor();
        await panel.locator("[data-chat-text]").fill("Messaggio per il DM dalla campagna");
        await panel.locator("[data-chat-text]").press("Enter");
        await page.waitForTimeout(250);
        await panel.locator("[data-chat-close]").click();
        await role("dm");
        await page.goto(base + "#campaign");
        await page.waitForTimeout(400);
        await page.getByRole("button", { name: /Notifiche/ }).click();
        await page.waitForTimeout(300);
        const row = page
          .locator("dialog[open] :is(button,a,li)", {
            hasText: "Messaggio per il DM dalla campagna",
          })
          .last();
        out.rowCount = await row.count();
        await row.click();
        await page.waitForTimeout(600);
        out.hash = await page.evaluate(() => location.hash);
        out.panelOpen = await page.locator("[data-chat-panel]").count();
        out.registro = await page
          .locator('#content .table-tabs [data-table-section="chat"]')
          .first()
          .getAttribute("aria-label")
          .catch(() => "");
        out.bellAfter = await page
          .getByRole("button", { name: /Notifiche/ })
          .first()
          .getAttribute("aria-label");
        await page.screenshot({
          path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B17/review-fixes/f3b-bell-opens-log-1440.png",
        });
        out.ok = /#table\?tab=chat-log/.test(out.hash) && out.panelOpen === 1;
        return out;
      },
    ],
    [
      "P2 · keyboard focus after hide/show, delete and closing a vote",
      async (page) => {
        const base = "http://127.0.0.1:8879/";
        const out = {};
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(base + "#table");
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.locator("#battle-map").waitFor();
        await page.locator("#demo-role").selectOption("dm");
        await page.locator("#battle-map").waitFor();
        await page.waitForTimeout(300);
        await toggleLog(page);
        const panel = page.locator("[data-chat-panel]");
        await panel.waitFor();
        const item = panel.locator(".chat-item", { hasText: "Qualcuno l’ha riaccesa" });
        await item.locator("summary").focus();
        await page.keyboard.press("Enter");
        await page.waitForTimeout(150);
        await page.keyboard.press("Tab");
        out.focusedInMenu = await page.evaluate(() => document.activeElement?.textContent);
        await page.keyboard.press("Enter");
        await page.waitForTimeout(400);
        out.afterHideFocus = await page.evaluate(() => ({
          tag: document.activeElement?.tagName,
          key: document.activeElement?.dataset?.chatFocus,
        }));
        out.hiddenLine = await panel
          .locator(".chat-item", { hasText: "Qualcuno l’ha riaccesa" })
          .innerText();
        // Delete via dialog, check focus after
        const item2 = panel.locator(".chat-item", { hasText: "Stasera devo chiudere" });
        await item2.locator("summary").click();
        await item2.getByRole("button", { name: /Elimina/ }).click();
        await page.locator("dialog[open] input[name=reason]").fill("fuori tema");
        await page
          .locator("dialog[open]")
          .getByRole("button", { name: "Elimina", exact: true })
          .click();
        await page.waitForTimeout(400);
        out.afterDeleteFocus = await page.evaluate(() => ({
          tag: document.activeElement?.tagName,
          text: document.activeElement?.textContent?.slice(0, 40),
        }));
        out.trace = await panel.locator(".chat-removed").last().innerText();
        // Show again with the keyboard: focus stays on the same ⋯.
        const item3 = panel.locator(".chat-item", { hasText: "Qualcuno l’ha riaccesa" });
        await item3.locator("summary").focus();
        await page.keyboard.press("Enter");
        await page.waitForTimeout(150);
        await page.keyboard.press("Tab");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(400);
        out.afterShowFocus = await page.evaluate(() => document.activeElement?.dataset?.chatFocus);
        // Vote: open, close with the keyboard, focus lands on the outcome.
        await panel.getByRole("button", { name: "Voto", exact: true }).click();
        await page.locator("dialog[open] input[name=question]").fill("Entriamo nella torre?");
        await page.locator("dialog[open]").getByRole("button", { name: "Apri il voto" }).click();
        await page.waitForTimeout(400);
        out.afterVoteOpenFocus = await page.evaluate(
          () => document.activeElement?.dataset?.chatFocus,
        );
        const closeVote = panel.getByRole("button", { name: "Chiudi il voto e mostra l’esito" });
        await closeVote.focus();
        await page.keyboard.press("Enter");
        await page.waitForTimeout(400);
        out.afterCloseVote = await page.evaluate(() => ({
          key: document.activeElement?.dataset?.chatFocus,
          text: document.activeElement?.textContent,
        }));
        out.ok =
          /^menu-/.test(out.afterHideFocus.key ?? "") &&
          out.afterDeleteFocus.tag === "LI" &&
          /^menu-/.test(out.afterShowFocus ?? "") &&
          out.afterVoteOpenFocus === "text" &&
          /^outcome-/.test(out.afterCloseVote.key ?? "");
        return out;
        // Tab out of the panel at phone width: is background reachable?
        return out;
      },
    ],
    [
      "P2 · phone sheet is a modal dialog: Tab stays inside, tip under it, docked again on desktop",
      async (rootPage) => {
        const base = "http://127.0.0.1:8879/";
        const dir =
          "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B17/review-fixes/";
        const out = {};
        // Keyboard at phone width: Tab stays inside the sheet.
        const c = await rootPage
          .context()
          .browser()
          .newContext({ viewport: { width: 390, height: 844 } });
        const page = await c.newPage();
        await page.goto(base + "#table");
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.locator("#battle-map").waitFor();
        await toggleLog(page);
        const panel = page.locator("[data-chat-panel]");
        await panel.waitFor();
        out.role = await panel.getAttribute("role");
        out.ariaModal = await panel.getAttribute("aria-modal");
        await panel.locator("[data-chat-help]").focus();
        const trail = [];
        for (let i = 0; i < 4; i++) {
          await page.keyboard.press("Tab");
          trail.push(
            await page.evaluate(() => {
              const a = document.activeElement;
              return `${a.closest("[data-chat-panel]") ? "panel" : "BEHIND"}:${(a.getAttribute("aria-label") || a.textContent || a.tagName).trim().slice(0, 25)}`;
            }),
          );
        }
        out.trail = trail;
        await panel.locator("[data-chat-filter]").focus();
        await page.keyboard.press("Shift+Tab");
        out.backToHelp = await page.evaluate(() => document.activeElement?.dataset?.chatFocus);
        // Resizing to a desktop width docks it again as a non-modal region.
        await page.setViewportSize({ width: 1280, height: 844 });
        await page.waitForTimeout(300);
        out.dockedModal = await page.locator("[data-chat-panel]").getAttribute("aria-modal");
        await c.close();
        // Touch at phone width on a first visit: the Table tip stays under the sheet.
        const t = await rootPage
          .context()
          .browser()
          .newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
        const phone = await t.newPage();
        await phone.goto(base + "#table");
        await phone.evaluate(() => localStorage.clear());
        await phone.reload();
        await phone.locator("#battle-map").waitFor();
        await phone.waitForTimeout(500);
        out.tipShown = await phone.locator(".home-pop-tip").count();
        await toggleLog(phone, true);
        await phone.locator("[data-chat-panel]").waitFor();
        await phone.waitForTimeout(400);
        out.onComposer = await phone.evaluate(() => {
          const composer = document.querySelector("[data-chat-text]").getBoundingClientRect();
          const hit = document.elementFromPoint(composer.left + 20, composer.top + 10);
          return hit?.closest("[data-chat-panel]") ? "chat" : hit?.className || hit?.tagName;
        });
        const box = await phone.locator("[data-chat-text]").boundingBox();
        await phone.touchscreen.tap(box.x + 20, box.y + 10);
        out.focusAfterTap = await phone.evaluate(() => document.activeElement?.dataset?.chatFocus);
        await phone.screenshot({ path: dir + "f5-phone-sheet-over-tip-390.png" });
        // Closing the sheet brings the tip back.
        await phone.locator("[data-chat-close]").tap();
        await phone.waitForTimeout(300);
        out.tipAfterClose = await phone.locator(".home-pop-tip").count();
        await t.close();
        out.ok =
          out.role === "dialog" &&
          out.ariaModal === "true" &&
          out.trail.every((step) => step.startsWith("panel")) &&
          out.backToHelp === "help" &&
          out.dockedModal === null &&
          out.onComposer === "chat" &&
          out.focusAfterTap === "text";
        return out;
      },
    ],
    [
      "P2 · share to chat from spell/item details; revealed handout card opens the material",
      async (page) => {
        const base = "http://127.0.0.1:8879/";
        const dir =
          "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B17/review-fixes/";
        const out = {};
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(base + "#characters?id=livia&tab=spells");
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.locator("#demo-role").selectOption("player");
        await page.goto(base + "#characters?id=livia&tab=spells");
        const row = page.locator(".item-row", { hasText: "Mani brucianti" });
        await row.getByRole("button", { name: "Dettagli" }).click();
        const dialog = page.locator("#dialog[open]");
        await dialog.waitFor();
        out.spellButton = await dialog
          .getByRole("button", { name: "Condividi nella chat…" })
          .count();
        await dialog.getByRole("button", { name: "Condividi nella chat…" }).click();
        await page.locator("#dialog[open] input[name=entry]:checked").waitFor();
        out.checked = await page
          .locator("#dialog[open] input[name=entry]:checked")
          .getAttribute("value");
        await page.locator("#dialog[open] select[name=to]").selectOption("all");
        await page.locator("#dialog[open] input[name=comment]").fill("Occhio al cono");
        await page.screenshot({ path: dir + "f6-share-from-sheet-1440.png" });
        await page
          .locator("#dialog[open]")
          .getByRole("button", { name: "Condividi", exact: true })
          .click();
        await page.waitForTimeout(300);
        out.toast = await page.locator("#toast").innerText();
        // Item details too (inventory tab).
        await page.goto(base + "#characters?id=livia&tab=inventory");
        // W2b1 integration: B36's inventory rows are `.invp-row` (D&D Beyond); «Dettagli» opens the
        // same item dialog with «Condividi nella chat…».
        const item = page
          .locator(".item-row, .invp-row")
          .filter({ has: page.getByRole("button", { name: "Dettagli" }) })
          .first();
        out.itemName = (await item.innerText()).split("\n")[0];
        await item.getByRole("button", { name: "Dettagli" }).click();
        out.itemButton = await page
          .locator("#dialog[open]")
          .getByRole("button", { name: "Condividi nella chat…" })
          .count();
        await page.keyboard.press("Escape");
        // The DM reads the card in the Table log and opens it.
        await page.locator("#demo-role").selectOption("dm");
        await page.goto(base + "#table");
        await page.locator("#battle-map").waitFor();
        if (!(await page.locator("[data-chat-panel]").count())) await toggleLog(page);
        const panel = page.locator("[data-chat-panel]");
        await panel.waitFor();
        out.card = await panel.locator(".chat-kind-share").last().innerText();
        // DM reveals the crypt handout to the whole party through the handouts area.
        await page.goto(base + "#campaign?tab=handouts");
        await page.locator('[data-hs-show="material-crypt"]').first().click();
        await page.locator("#dialog[open] input[name=mode][value=all]").check();
        await page
          .locator("#dialog[open]")
          .getByRole("button", { name: "Mostra", exact: true })
          .click();
        await page.waitForTimeout(300);
        await page.locator("#demo-role").selectOption("player");
        await page.goto(base + "#table");
        await page.locator("#battle-map").waitFor();
        await page.waitForTimeout(400);
        // The handouts area opens a newly shown material on the recipients' screen: close it.
        out.autoOpened = await page.locator("#dialog[open]").count();
        if (out.autoOpened) await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
        if (!(await page.locator("[data-chat-panel]").count())) await toggleLog(page);
        await page.locator("[data-chat-panel]").waitFor();
        const handout = page.locator('[data-chat-handout="material-crypt"]');
        out.handoutCard = await handout.innerText();
        await handout.scrollIntoViewIfNeeded();
        await page.screenshot({ path: dir + "f6-handout-card-player-1440.png" });
        await handout.click();
        await page.waitForTimeout(600);
        out.hash = await page.evaluate(() => location.hash);
        out.viewerOpen = await page
          .locator("#dialog[open]")
          .innerText()
          .catch(() => "");
        out.ok =
          out.spellButton === 1 &&
          out.checked === "spell:sample-burning-hands" &&
          /Condiviso nella chat: Mani brucianti · tutti/.test(out.toast) &&
          out.itemButton === 1 &&
          /Mani brucianti/.test(out.card) &&
          /Occhio al cono/.test(out.card) &&
          /Cripta sotto l’osservatorio/.test(out.handoutCard) &&
          /tab=handouts/.test(out.hash) &&
          /Cripta sotto l’osservatorio/.test(out.viewerOpen);
        return out;
      },
    ],
    [
      "P3 · Registro badge follows the centre's read state; its notices go too",
      async (page) => {
        const base = "http://127.0.0.1:8879/";
        const out = {};
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(base + "#table");
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.locator("#battle-map").waitFor();
        const role = async (v) => {
          await page.locator("#demo-role").selectOption(v);
          await page.waitForTimeout(300);
        };
        await role("dm");
        await page.goto(base + "#table");
        await page.locator("#battle-map").waitFor();
        await role("player");
        await page.goto(base + "#table");
        await page.locator("#battle-map").waitFor();
        const panel = page.locator("[data-chat-panel]");
        await toggleLog(page);
        await panel.waitFor();
        for (const m of ["Primo messaggio", "Secondo messaggio"]) {
          await panel.locator("[data-chat-text]").fill(m);
          await panel.locator("[data-chat-text]").press("Enter");
          await page.waitForTimeout(250);
        }
        await panel.locator("[data-chat-close]").click();
        await role("dm");
        await page.goto(base + "#table");
        await page.locator("#battle-map").waitFor();
        await page.waitForTimeout(400);
        // B61: Registro is an icon tab; its name (aria-label) plus the badge read as before.
        const logText = async () => {
          const tab = page.locator('.table-tabs [data-table-section="chat"]'); // B62: «Chat»
          const badge = tab.locator(".table-log-badge");
          return `${await tab.getAttribute("aria-label")} ${(await badge.count()) ? await badge.innerText() : ""}`.trim();
        };
        out.badgeBefore = await logText();
        out.bellBefore = await page
          .getByRole("button", { name: /Notifiche/ })
          .getAttribute("aria-label");
        await page.getByRole("button", { name: /Notifiche/ }).click();
        await page.waitForTimeout(300);
        const centre = page
          .locator("dialog[open], [data-notifications-panel], .notifications-panel")
          .first();
        out.centreText = (await centre.innerText().catch(() => "")).slice(0, 600);
        const markAll = page.getByRole("button", {
          name: /Segna tutte come lette|Segna tutto come letto/,
        });
        out.markAllCount = await markAll.count();
        if (out.markAllCount) await markAll.first().click();
        await page.waitForTimeout(300);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
        out.bellAfter = await page
          .getByRole("button", { name: /Notifiche/ })
          .getAttribute("aria-label");
        out.badgeAfter = await logText();
        // Toasts on another page
        out.toastsNow = await page.locator(".chat-toast").count();
        out.ok =
          /Chat\s*2/.test(out.badgeBefore) &&
          out.markAllCount > 0 &&
          out.badgeAfter.trim() === "Chat" &&
          out.toastsNow === 0;
        return out;
      },
    ],
    [
      "P3 · phone: one notice above the action dock, opens the modal log",
      async (rootPage) => {
        const base = "http://127.0.0.1:8879/";
        const shots =
          "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B17/review-fixes/";
        const out = {};
        const ctxp = await rootPage
          .context()
          .browser()
          .newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
        const page = await ctxp.newPage();
        await page.goto(base + "#table");
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.locator("#battle-map").waitFor();
        const role = async (v) => {
          await page.locator("#demo-role").selectOption(v);
          await page.waitForTimeout(300);
        };
        await role("dm");
        await page.goto(base + "#table");
        await page.locator("#battle-map").waitFor();
        await page.waitForTimeout(300);
        await toggleLog(page, true);
        const panel = page.locator("[data-chat-panel]");
        await panel.waitFor();
        for (const msg of [
          "Il vento spegne le torce.",
          "Senti passi sulle scale.",
          "Una voce chiama Livia.",
          "Silenzio.",
        ]) {
          await panel.locator("[data-chat-text]").fill(msg);
          await panel.getByRole("button", { name: "Invia", exact: true }).tap();
          await page.waitForTimeout(250);
        }
        await panel.locator("[data-chat-close]").tap();
        await role("player");
        await page.goto(base + "#table");
        await page.locator("#battle-map").waitFor();
        await page.waitForTimeout(600);
        out.toasts = await page.locator(".chat-toast").count();
        out.toastBoxes = await page.evaluate(() =>
          [...document.querySelectorAll(".chat-toast, .chat-toast .button")].map((e) => {
            const r = e.getBoundingClientRect();
            return [e.className, Math.round(r.top), Math.round(r.height), Math.round(r.width)];
          }),
        );
        // what is covered: elements under the toast stack
        out.covered = await page.evaluate(() => {
          const host = document.querySelector(".chat-toasts");
          if (!host) return null;
          const r = host.getBoundingClientRect();
          return {
            top: r.top,
            bottom: r.bottom,
            registro: document
              .querySelector('#content .table-tabs [data-table-section="chat"]')
              .getBoundingClientRect().top,
            bell: document
              .querySelector('[data-service="notifications"], button[aria-label*="Notifiche"]')
              ?.getBoundingClientRect().top,
          };
        });
        out.dock = await page.evaluate(() => {
          const r = document.querySelector("#content .action-dock").getBoundingClientRect();
          return [Math.round(r.top), Math.round(r.bottom), innerHeight];
        });
        out.text = await page.locator(".chat-toast").first().innerText();
        await page.screenshot({ path: shots + "f7-phone-toast-390.png" });
        // Its button opens the log (the modal sheet).
        await page.locator(".chat-toast [data-chat-toast-open]").tap();
        await page.locator("[data-chat-panel]").waitFor();
        out.opened = await page.locator("[data-chat-panel]").getAttribute("aria-modal");
        out.ok =
          out.toasts === 1 &&
          out.covered.top > out.covered.bell &&
          out.covered.bottom <= out.dock[0] &&
          /\+\d novità/.test(out.text) &&
          out.opened === "true";
        await ctxp.close();
        return out;
      },
    ],
    [
      "P3 · 901–1279 px: the log takes the inspector column (map keeps its width, header services reachable); EN help and snapshot file name",
      async (rootPage) => {
        const base = "http://127.0.0.1:8879/";
        const dir =
          "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B17/review-fixes/";
        const out = { widths: {} };
        // Tablets: from 901 to 1279 px the open log takes the inspector's column; the map keeps
        // its width. At 820 (portrait tablet) the log stays the modal sheet (see the report).
        for (const [w, h] of [
          [820, 1180],
          [1024, 768],
          [1180, 820],
          [1280, 800],
        ]) {
          const c = await rootPage
            .context()
            .browser()
            .newContext({ viewport: { width: w, height: h } });
          const page = await c.newPage();
          await page.goto(base + "#table");
          await page.evaluate(() => localStorage.clear());
          await page.reload();
          await page.locator("#battle-map").waitFor();
          const before = await page.evaluate(() =>
            Math.round(document.querySelector(".map-container").getBoundingClientRect().width),
          );
          await toggleLog(page);
          await page.locator("[data-chat-panel]").waitFor();
          out.widths[w] = await page.evaluate((before) => {
            const box = (s) => document.querySelector(s).getBoundingClientRect();
            const bell = [...document.querySelectorAll(".service-nav button")]
              .map((b) => b.getBoundingClientRect())
              .filter((r) => r.width);
            return {
              before,
              map: Math.round(box(".map-container").width),
              panelLeft: Math.round(box("[data-chat-panel]").left),
              modal: document.querySelector("[data-chat-panel]").getAttribute("aria-modal"),
              // B61: the log is a tab of the Table's sidebar, under the header: a service is
              // reachable when it lies left of the log or above it.
              servicesVisible:
                bell.every(
                  (r) =>
                    r.right <= box("[data-chat-panel]").left + 1 ||
                    r.bottom <= box("[data-chat-panel]").top + 1,
                ) ||
                document.querySelector("[data-chat-panel]").getAttribute("aria-modal") === "true",
              overflow: document.documentElement.scrollWidth > innerWidth,
            };
          }, before);
          await page.screenshot({ path: dir + `f9-log-open-${w}.png` });
          await c.close();
        }
        // EN: the DM's help shows /as "Guard"; the snapshot file name is English.
        const c = await rootPage
          .context()
          .browser()
          .newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
        const page = await c.newPage();
        await page.goto(base + "#table");
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.locator("#battle-map").waitFor();
        await page.locator("[data-service=preferences]").click();
        await page.locator("#dialog [name=lang]").selectOption("en");
        await page.getByRole("button", { name: "Salva preferenze", exact: true }).click();
        await page.locator("#demo-role").selectOption("dm");
        await page.waitForTimeout(200);
        if (!(await page.locator("[data-chat-panel]").count())) await toggleLog(page);
        const panel = page.locator("[data-chat-panel]");
        await panel.waitFor();
        await panel.locator("[data-chat-help]").click();
        out.help = await panel.locator("#chat-help").innerText();
        await panel.getByRole("button", { name: "Snapshot", exact: true }).click();
        await page
          .locator("#dialog[open]")
          .getByRole("button", { name: "Share the snapshot" })
          .click();
        await page.waitForTimeout(300);
        const download = page.waitForEvent("download");
        await panel.getByRole("button", { name: "Save image" }).last().click();
        out.file = (await download).suggestedFilename();
        await c.close();
        const w = out.widths;
        out.ok =
          w[820].modal === "true" &&
          // B61: the log is a tab of the Table's fixed-width sidebar: opening it never narrows
          // the map (same width as before opening), which keeps most of the window.
          [1024, 1180, 1280].every((k) => w[k].map === w[k].before && w[k].map >= 0.55 * k) &&
          w[1024].modal === null &&
          w[1024].servicesVisible &&
          w[1180].servicesVisible &&
          Object.values(w).every((row) => !row.overflow) &&
          /\/as "Guard" text/.test(out.help) &&
          /\/r d20\+5/.test(out.help) &&
          /^snapshot-old-watch-\d{4}-\d{2}-\d{2}\.svg$/.test(out.file);
        return out;
      },
    ],
    [
      "P3 · /w Tab completion, /r prefilled free roll, undone roll marked, speaker selects token, latest posts on Home, recipient label",
      async (page) => {
        const base = "http://127.0.0.1:8879/";
        const dir =
          "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B17/review-fixes/";
        const out = {};
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(base + "#table");
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.locator("#battle-map").waitFor();
        await page.locator("#demo-role").selectOption("player");
        await page.waitForTimeout(200);
        if (!(await page.locator("[data-chat-panel]").count())) await toggleLog(page);
        const panel = page.locator("[data-chat-panel]");
        await panel.waitFor();
        const text = panel.locator("[data-chat-text]");
        // Tab completes /w names.
        await text.fill("/w Mi");
        await text.press("Tab");
        out.completed = await text.inputValue();
        out.focusStays = await page.evaluate(() => document.activeElement?.dataset?.chatFocus);
        await text.fill("");
        // /r opens the Table's free roll, prefilled; the physical result becomes a card.
        await text.fill("/r d20+5");
        await text.press("Enter");
        const dialog = page.locator("#dialog[open]");
        // W2b1 integration: with B34 built, /r opens the Dadi tray with the formula prefilled
        // (B34's chat hook, Roll20 /r); the one-die «Tiro libero» dialog stays the fallback.
        await page.locator("[data-dtray-formula], #dialog[open]").first().waitFor();
        if (await page.locator("[data-dtray-formula]").count()) {
          out.rollDialog = "Dadi";
          out.prefill = [await page.locator("[data-dtray-formula]").inputValue()];
          await page.locator('label.dtray-seg:has([data-dtray-mode][value="physical"])').click();
          await page.locator('[data-dtray-face="0"]').fill("14");
          await page.locator("[data-dtray-roll-button]").click();
        } else {
          out.rollDialog = await dialog.locator("h2").innerText();
          out.prefill = [
            await dialog.locator("[name=sides]").inputValue(),
            await dialog.locator("[name=modifier]").inputValue(),
          ];
          await dialog.locator("[name=mode]").selectOption("physical");
          await dialog.locator("[name=natural]").fill("14");
          await dialog.getByRole("button", { name: "Registra tiro" }).click();
        }
        await page.waitForTimeout(300);
        if (!(await page.locator("[data-chat-panel]").count())) await toggleLog(page);
        out.card = await panel.locator(".chat-roll-card").last().innerText();
        // Undo: the card stays, marked undone, and the correction says what it reversed.
        // W2b1 integration: a tray roll (B34) is not undone by the gameplay Undo (a roll stays in
        // the log, as in Roll20 and Foundry): its owner withdraws it from the tray's recent rolls
        // («Ritira», with a reason, B34), which is what reverses the card here.
        if (out.rollDialog === "Dadi") {
          await page.locator('.action-dock [data-table="dice"]').click();
          await page.locator("[data-dtray-withdraw]").first().click();
          await page.locator("#dialog[open] [data-dtray-reason]").fill("Tiro di prova sbagliato");
          await page
            .locator("#dialog[open]")
            .getByRole("button", { name: "Ritira", exact: true })
            .click();
        } else await page.getByRole("button", { name: "Annulla ultima modifica" }).click();
        await page.waitForTimeout(300);
        if (!(await page.locator("[data-chat-panel]").count())) await toggleLog(page);
        out.reversedCard = await panel.locator(".chat-roll-reversed").last().innerText();
        out.correction = await panel.locator(".chat-event").last().innerText();
        // Refreshed by the round-2 regression (29/09/2026): P3 TV-87 (DDB game log card) folds
        // a tray withdrawal into the roll's own card («Ritirato: <motivo>») and hides the
        // separate «Tiro ritirato» line, so the reason is read on the card and no such line
        // may still show in the log.
        out.withdrawalLines = await panel
          .locator(".chat-event", { hasText: "Tiro ritirato" })
          .count();
        await panel.locator(".chat-roll-reversed").last().scrollIntoViewIfNeeded();
        await page.screenshot({ path: dir + "f8-undone-roll-1440.png" });
        // The speaker's name selects the token on the map (Doran is the DM's: Livia here).
        await panel.locator('[data-chat-show-token="doran"]').first().click();
        await page.waitForTimeout(200);
        out.selected = await page.locator(".map-token.selected").getAttribute("data-actor");
        // B61: the log stays open beside the map; the selected creature is named by the sidebar's
        // Creature tab (its inspector is one click away there).
        out.inspector = (
          (await page
            .locator('.table-tabs [data-table-tab="creature"]')
            .getAttribute("aria-label")) ?? ""
        ).replace(/^Creatura: /, "");
        out.focusAfterShow = await page.evaluate(() => document.activeElement?.dataset?.chatFocus);
        // Home: the latest forum posts.
        await page.goto(base + "#home");
        await page.locator(".chat-home").waitFor();
        out.home = await page.locator(".chat-home").innerText();
        await page.locator(".chat-home [data-chat-home-thread]").first().click();
        await page.waitForTimeout(300);
        out.homeHash = await page.evaluate(() => location.hash);
        // DM: the share dialog names "Only me (DM)" and EN help shows /as "Guard".
        await page.locator("#demo-role").selectOption("dm");
        await page.goto(base + "#table");
        await page.locator("#battle-map").waitFor();
        if (!(await page.locator("[data-chat-panel]").count())) await toggleLog(page);
        await panel.waitFor();
        await panel.locator("label.chat-mode", { hasText: "Dialogo" }).click();
        await page.waitForTimeout(150);
        await panel.locator("[data-chat-speaker]").selectOption("actor:doran");
        await page.waitForTimeout(150);
        await panel.locator("[data-chat-to]").selectOption("self");
        await page.waitForTimeout(150);
        await panel.getByRole("button", { name: "Condividi", exact: true }).click();
        out.shareTo = await page
          .locator("#dialog[open] select[name=to] option:checked")
          .innerText();
        await page.keyboard.press("Escape");
        out.ok =
          out.completed === "/w Mira " &&
          out.focusStays === "text" &&
          ((out.rollDialog === "Tiro libero" && out.prefill.join() === "20,5") ||
            (out.rollDialog === "Dadi" && /^1?d20 ?\+ ?5$/.test(out.prefill[0]))) &&
          /19/.test(out.card) &&
          (out.rollDialog === "Dadi"
            ? /Ritirato: Tiro di prova sbagliato/.test(out.reversedCard) &&
              out.withdrawalLines === 0
            : /Annullato/.test(out.reversedCard) &&
              /Annullato: Livia · d20: 14 \+ 5 = 19 \(fisico\)/.test(out.correction)) &&
          out.selected === "doran" &&
          out.inspector === "Doran" &&
          out.focusAfterShow === "show-m3" &&
          /Ultime discussioni/.test(out.home) &&
          /tab=chat-forum&id=t/.test(out.homeHash) &&
          out.shareTo === "Sussurro a Solo io (DM)";
        return out;
      },
    ],
  ];
  const passed = [];
  const errors = [];
  const onError = (error) => errors.push(error.message);
  rootPage.on("pageerror", onError);
  try {
    for (const [name, step] of steps) {
      const out = await step(rootPage);
      if (!out.ok) throw Error(name + " failed: " + JSON.stringify(out));
      passed.push(name);
    }
  } finally {
    rootPage.off("pageerror", onError);
  }
  if (errors.length) throw Error("Page errors: " + errors.join(" | "));
  return { passed, count: passed.length, pageErrors: 0 };
};
