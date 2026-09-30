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
  // B42 review: the fixes of the independent review of the World area, in the real app.
  // R1 a refused calendar change never names the player's private event to the DM;
  // R2 editing the months keeps the Eclissi reminder on game time (8 h at the Table);
  // R3 a timeline route naming a DM-only place shows nothing of it after a role change;
  // R4 a pin linked to a DM-only entry reads "no linked entry" for the player (F-039);
  // R5 travel days follow the SRD Day column (Fast 2 d 3.5 h, Slow 4 d 1 h);
  // R6 a pin drag refused offline is drawn back where it is saved;
  // R7 EN phone 390 touch: the three views fit, touch hints, map width in miles.
  // Synthetic data; resets this browser's demo state. Run from the evidence directory:
  // playwright-cli -s=d20-b42-rf --raw run-code --filename=<this file>
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B42-rf/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push("desktop: " + error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const world = async (p = page) => (await stored(p)).ext["world-map"].campaigns.lanterns;
  const setRole = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForTimeout(200);
  };
  const button = (name, p = page) => p.getByRole("button", { name, exact: true });
  const wm = (p = page) => p.locator("[data-wm-root]").first();
  const submitDialog = (p = page) => p.locator("#dialog button[type=submit]").click();
  const closeDialog = async (p = page) => {
    if (await p.locator("#dialog[open]").count())
      await p.locator("#dialog footer [data-close]").click();
  };
  const go = async (id, p = page) => {
    await p.goto(`${base}#campaign?tab=world-map&id=${id}`);
    await p.locator("[data-wm-root]").waitFor();
    await p.waitForTimeout(150);
  };
  const pinCenter = async (id, p = page) => {
    const box = await p.locator(`[data-wm-pin="${id}"] .wm-pin-shape`).boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const setOffline = async (value) => {
    await page.locator('[data-service="preferences"]').click();
    const box = page.locator('#dialog [name="offline"]');
    if (value) await box.check();
    else await box.uncheck();
    await submitDialog();
    await page.waitForTimeout(150);
  };
  const monthDays = (index) =>
    page
      .locator('#dialog [data-wm-rows="month"] [data-wm-row]')
      .nth(index)
      .locator('[name="month-days"]');

  let mobile = null;
  try {
    await page.goto(base);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator("#content").waitFor();
    await setRole("dm");

    // R1. Nebbie shortened to 15 days: the DM's "Fiera delle lanterne" is named, Livia's
    // private "Incontro con la capitana del porto" is only counted.
    await go("calendar");
    await button("Impostazioni del calendario").click();
    await monthDays(7).fill("15");
    await submitDialog();
    await page.waitForTimeout(250);
    const refusal = await page.locator("#dialog").innerText();
    check(refusal.includes("Fiera delle lanterne"), "DM event not named: " + refusal.slice(0, 300));
    check(refusal.includes("1 evento privato di un giocatore"), "Private event not counted");
    check(!refusal.includes("capitana"), "The DM reads the player's private title");
    await page.screenshot({ path: shots + "rf-10-calendar-refusal-private-count.png" });
    await closeDialog();
    check((await world()).calendar.months[7].days === 30, "Refused change applied");
    passed.push(
      "R1 Calendar refusal names «Fiera delle lanterne» and counts «1 evento privato di un giocatore»; «capitana» never shown to the DM; nothing changed",
    );

    // R2. DM-only Eclissi (14 Nebbie 15:00, reminder when it arrives); Lunganotte loses a
    // day; eight hours with the Table's own "Tempo" still bring the reminder.
    await button("Nuovo evento").click();
    await page.locator('#dialog [name="title"]').fill("Eclissi");
    await page.locator('#dialog [name="day"]').fill("14");
    await page.locator('#dialog [name="month"]').selectOption("nebbie");
    await page.locator('#dialog [name="year"]').fill("1287");
    await page.locator('#dialog [name="time"]').fill("15:00");
    await page.locator('#dialog [name="visibility"]').selectOption("dm");
    await page.locator('#dialog [name="lead"]').selectOption("0");
    await submitDialog();
    await page.locator(".wm-day.is-today .wm-chip", { hasText: "Eclissi" }).waitFor();
    await button("Impostazioni del calendario").click();
    await monthDays(9).fill("30");
    await submitDialog();
    await page.waitForTimeout(250);
    check(!(await page.locator("#dialog[open]").count()), "Month edit refused");
    check((await world()).calendar.months[9].days === 30, "Lunganotte not saved");
    // The weekday follows the new year length (Fantasy Calendar); the date stays.
    check(
      (await page.locator("[data-wm-today-date]").innerText()).endsWith("14 Nebbie 1287 E.L."),
      "Today moved by the month edit",
    );
    check(!(await page.locator(".wm-reminders").count()), "A reminder fired by editing");
    await page.locator(".campaign-sidebar [data-nav='table']").click();
    await page.waitForTimeout(400);
    await closeDialog();
    await page.locator('[data-table="time"]').click();
    await page.locator("[data-rest-time-value]").fill("8");
    await page.locator("[data-rest-time-unit]").selectOption("3600");
    await page.locator("[data-rest-preview-time]").click();
    await page.locator("[data-rest-apply]").click();
    await page.waitForTimeout(250);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    await closeDialog();
    await openTablePanel(page, "world-map-calendar"); // B62: Exploration › World
    await page.locator(".wm-table-panel [data-wm-today-time]", { hasText: "16:00" }).waitFor();
    await page.locator(".wm-table-panel .wm-reminders", { hasText: "Eclissi" }).waitFor();
    await page.screenshot({ path: shots + "rf-11-table-reminder-after-month-edit.png" });
    passed.push(
      "R2 After Lunganotte 31 → 30 today stays 14 Nebbie and nothing fires; «Tempo» 8 h at the Table brings «Eclissi» to the «Mondo» tab",
    );

    // R3. The DM reads the history of the goblins' lair; after switching to the player the
    // same route shows the whole chronicle, without the DM-only place.
    await go("timeline.tana-goblin");
    check((await wm().innerText()).includes("Storia di «Tana dei goblin»"), "DM place history");
    await setRole("player");
    await page.locator(".wm-timeline").waitFor();
    const playerTimeline = await page.locator("#content").innerText();
    check(!playerTimeline.includes("Tana dei goblin"), "Player reads the DM-only place name");
    check(!playerTimeline.includes("Storia di"), "Player gets a place-history heading");
    check(
      (await page.locator("[data-wm-place]").inputValue()) === "",
      "Place filter not reset to every place",
    );
    await page.screenshot({ path: shots + "rf-12-player-timeline-no-dm-place.png" });
    passed.push(
      "R3 Route timeline.tana-goblin after a role change: the player reads the full chronicle, «Tutti i luoghi», no «Tana dei goblin»",
    );

    // R4. The DM creates a DM-only entry from the Bruma pin; the player reading the pin sees
    // "Nessuna voce collegata." and nothing about a hidden entry.
    await setRole("dm");
    await go("map.valle-di-bruma.bruma");
    await page.locator('[data-wm-pin-panel="bruma"]').waitFor();
    await button("Crea la voce del luogo").click();
    await page.locator('#dialog [name="access"]').selectOption("dms");
    await submitDialog();
    await page.waitForTimeout(250);
    check((await world()).pins.find((p) => p.id === "bruma").entryId, "Entry not linked");
    await setRole("player");
    await go("map.valle-di-bruma.bruma");
    const panel = await page.locator('[data-wm-pin-panel="bruma"]').innerText();
    check(panel.includes("Nessuna voce collegata."), "Player panel: " + panel.slice(0, 200));
    check(!panel.includes("condivisa"), "The player learns a hidden entry exists");
    passed.push(
      "R4 Bruma linked to a DM-only entry: the player reads «Nessuna voce collegata.», no hint of a hidden entry (F-039)",
    );

    // R5. Player measures Bruma → Ponte di pietra → Porto Grigio with the keyboard.
    await button("Misura").click();
    for (const id of ["bruma", "ponte-di-pietra", "porto-grigio"]) {
      await page.locator(`[data-wm-pin="${id}"]`).focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
    }
    await page.locator("[data-wm-total]", { hasText: "112 km" }).waitFor();
    const pace = (id) => page.locator(`.wm-pace [data-wm-pace="${id}"]`).innerText();
    check((await pace("fast")).includes("2 giorni e 3,5 h"), "Fast: " + (await pace("fast")));
    check((await pace("normal")).includes("3 giorni e 1 h"), "Normal: " + (await pace("normal")));
    check((await pace("slow")).includes("4 giorni e 1 h"), "Slow: " + (await pace("slow")));
    await page.screenshot({ path: shots + "rf-13-measure-day-column.png" });
    await button("Chiudi la misura").click();
    passed.push(
      "R5 112 km by keyboard: Veloce 45 km → 2 giorni e 3,5 h, Normale 36 km → 3 giorni e 1 h, Lento 27 km → 4 giorni e 1 h (SRD 5.2.1 Day column)",
    );

    // R6. Offline, the DM drags Bruma: refused with the shell message and drawn back.
    await setRole("dm");
    await go("map.valle-di-bruma");
    await setOffline(true);
    const before = await page.locator('[data-wm-pin="bruma"]').getAttribute("transform");
    const c = await pinCenter("bruma");
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(c.x + 70, c.y + 40, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(250);
    check((await page.locator("#toast").innerText()).includes("senza rete"), "No offline toast");
    check(
      (await page.locator('[data-wm-pin="bruma"]').getAttribute("transform")) === before,
      "The refused pin stays drawn at the new place",
    );
    check(!(await page.locator(".wm-pin.is-dragging").count()), "Pin left in dragging state");
    const saved = (await world()).pins.find((p) => p.id === "bruma");
    check(saved.x === 420 && saved.y === 380, "Offline move saved");
    await setOffline(false);
    passed.push(
      "R6 Offline drag of Bruma: «senza rete» toast, the pin is drawn back at 420,380 and nothing is saved",
    );

    // R7. EN phone 390 touch: views fit, touch hints, map width in miles.
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await phone.addInitScript(
      ([k, value]) => {
        if (!sessionStorage.getItem("b42-rf-seeded")) {
          localStorage.setItem(k, value);
          sessionStorage.setItem("b42-rf-seeded", "1");
        }
      },
      [key, snapshot],
    );
    mobile = await phone.newPage();
    mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
    await mobile.goto(base + "#campaign?tab=world-map&id=map");
    await mobile.locator('[data-service="preferences"]').tap();
    await mobile.locator('#dialog [name="lang"]').selectOption("en");
    await mobile.locator("#dialog button[type=submit]").tap();
    await mobile.getByRole("heading", { name: "Map and calendar", level: 1 }).waitFor();
    if ((await mobile.locator("#demo-role").inputValue()) !== "dm") await setRole("dm", mobile);
    const tabs = await mobile.evaluate(() => {
      const strip = document.querySelector(".wm-tabs");
      return {
        fits: strip.scrollWidth <= strip.clientWidth + 1,
        right: Math.max(
          ...[...strip.querySelectorAll("button")].map((b) => b.getBoundingClientRect().right),
        ),
      };
    });
    check(tabs.fits && tabs.right <= 390, "Phone tabs cut off: " + JSON.stringify(tabs));
    check(
      (await mobile.locator("#wm-hint").innerText()).includes("Double-tap a pin"),
      "Touch hint for selecting",
    );
    await button("Pin", mobile).tap();
    const pinHint = await mobile.locator("#wm-hint").innerText();
    check(
      pinHint.includes("Tap the map to drop a pin") && !pinHint.includes("Right-click"),
      "Pin hint: " + pinHint,
    );
    await button("Map settings", mobile).tap();
    check(
      (await mobile.locator("#dialog").innerText()).includes("Real width of the map (miles)"),
      "Map width not in miles",
    );
    check(
      (await mobile.locator('#dialog [name="width"]').inputValue()) === "160",
      "240 km ≠ 160 miles",
    );
    check(
      await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      "Phone overflow",
    );
    await mobile.screenshot({ path: shots + "rf-14-phone-en-map-settings-miles.png" });
    await mobile.locator("#dialog footer [data-close]").tap();
    await button("Select", mobile).tap();
    await mobile.screenshot({ path: shots + "rf-15-phone-en-tabs-touch-hint.png", fullPage: true });
    passed.push(
      "R7 EN phone 390 touch: World map · Calendar · Timeline fit, touch hints (no right-click), Map settings asks the width in miles (240 km = 160)",
    );
  } catch (error) {
    errors.push("FAILED: " + error.message);
    await page.screenshot({ path: shots + "rf-failure-desktop.png" }).catch(() => {});
    if (mobile) await mobile.screenshot({ path: shots + "rf-failure-phone.png" }).catch(() => {});
  }
  return { passed, errors };
};
