async (page) => {
  // «Aggiungi al calendario» (owner request 01/10/2026): one button and one small menu wherever a
  // session date is shown (Campaign › Sessions, Home, Integrations › Calendar, a session notice):
  // Google, Outlook.com, Microsoft 365, Yahoo in a new tab without an opener, the .ics file, the
  // whole series as a recurring .ics. Keyboard (Enter, Tab, Escape), outside press, phone 390
  // touch. External calendars are answered by a local stub: nothing leaves the machine.
  const base = "http://127.0.0.1:8879/";
  const shots =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-10-01/phase-c-prep/calendar/";
  const passed = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const EXTERNAL =
    /calendar\.google\.com|outlook\.live\.com|outlook\.office\.com|calendar\.yahoo\.com/;
  const opened = [];
  await page.context().route(EXTERNAL, (route) => {
    opened.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "text/plain", body: "stub" });
  });
  const as = async (role, p = page) => {
    await p.locator("#demo-role").selectOption(role);
    await p.waitForTimeout(150);
  };
  const sessionsTab = async (p = page) => {
    await p.goto(base + "#campaign?tab=sessions");
    await p.getByRole("heading", { name: "Sessioni", level: 1 }).waitFor();
  };
  // The .ics is plain ASCII apart from «·» and accents: read as UTF-8 text.
  const readDownload = async (download) => {
    let text = "";
    for await (const chunk of await download.createReadStream()) text += chunk;
    return text;
  };
  // The run-code sandbox has no URL global: the page parses the address.
  const params = (href) =>
    page.evaluate((value) => Object.fromEntries(new URL(value).searchParams), href);
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // 1 · Campaign › Sessions, player: one button, one menu, four calendars and the .ics.
  await as("player");
  await sessionsTab();
  const card = page
    .locator("#content article.campaign-session")
    .filter({ hasText: "Il sigillo della torre" });
  const menu = card.locator("details.int-cal-menu");
  const summary = menu.locator("summary");
  check(
    (await summary.innerText()).includes("Aggiungi al calendario"),
    "no «Aggiungi al calendario»",
  );
  check(!(await menu.locator(".int-cal-list").isVisible()), "menu open before the press");
  await summary.click();
  const list = menu.locator(".int-cal-list");
  await list.waitFor();
  const items = await list.locator(".int-cal-item").allInnerTexts();
  check(
    ["Google Calendar", "Outlook.com", "Microsoft 365 (lavoro o scuola)", "Yahoo Calendar"].every(
      (name) => items.some((text) => text.startsWith(name)),
    ) && items.some((text) => text.includes("Apple Calendario o altro (.ics)")),
    "menu items: " + JSON.stringify(items),
  );
  check(
    (await list.innerText()).includes("controlli e salvi tu"),
    "the menu does not say nothing is sent",
  );
  const anchors = await list
    .locator("a")
    .evaluateAll((els) => els.map((a) => ({ target: a.target, rel: a.rel, href: a.href })));
  check(
    anchors.length === 4 && anchors.every((a) => a.target === "_blank" && /noopener/.test(a.rel)),
    "links not in a new tab without opener: " + JSON.stringify(anchors),
  );
  const google = await params(anchors[0].href);
  check(
    google.ctz === "Europe/Rome" &&
      google.text === "Le lanterne di Bruma · Il sigillo della torre" &&
      /T203000\//.test(google.dates),
    "Google template: " + anchors[0].href,
  );
  check(google.details.includes("#campaign?tab=sessions"), "no campaign link");
  const box = await list.boundingBox();
  check(box.x >= 0 && box.x + box.width <= 1440, "menu leaves the window");
  await page.screenshot({ path: shots + "cal-01-sessions-menu-it-1440.png" });
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    list.locator("a").first().click(),
  ]);
  await popup.waitForLoadState();
  check(EXTERNAL.test(popup.url()), "Google did not open in a new tab: " + popup.url());
  check((await popup.evaluate(() => window.opener)) === null, "the new tab keeps an opener");
  await popup.close();
  await page.waitForTimeout(100);
  check(!(await menu.evaluate((el) => el.open)), "menu stays open after a choice");
  passed.push(
    "Sessions: one button, a menu of four web calendars in a new tab (no opener) and .ics",
  );

  // 2 · Keyboard: Enter opens, Tab reaches the items, Escape closes and returns the focus.
  await summary.focus();
  await page.keyboard.press("Enter");
  check(await menu.evaluate((el) => el.open), "Enter does not open the menu");
  await page.keyboard.press("Tab");
  check(
    (await page.evaluate(() => document.activeElement?.dataset?.intCalLink)) === "google",
    "Tab does not reach Google Calendar",
  );
  await page.keyboard.press("Escape");
  check(!(await menu.evaluate((el) => el.open)), "Escape does not close the menu");
  check(
    await summary.evaluate((el) => el === document.activeElement),
    "Escape does not return the focus to the button",
  );
  await summary.click();
  await page.mouse.click(1300, 120);
  check(!(await menu.evaluate((el) => el.open)), "an outside press does not close the menu");
  passed.push("Keyboard: Enter, Tab, Escape back to the button; an outside press closes");

  // 3 · The .ics of one date: UTC instants, the new title and the campaign link.
  await summary.click();
  const [single] = await Promise.all([
    page.waitForEvent("download"),
    list.locator("[data-int-cal-ics]").click(),
  ]);
  const ics = await readDownload(single);
  await single.saveAs(shots + "cal-session.ics");
  check(/^DTSTART:\d{8}T183000Z\r?$/m.test(ics), "DTSTART not 18:30 UTC (20:30 Rome): " + ics);
  check(ics.includes("SUMMARY:Le lanterne di Bruma · Il sigillo della torre"), "SUMMARY");
  check(
    ics.replace(/\r\n /g, "").includes("#campaign?tab=sessions"),
    "no campaign link in the .ics",
  );
  passed.push(".ics of one date: UTC instant, «Campagna · sessione», campaign link");

  // 4 · Home «Prossimo appuntamento»: the same menu, without the bell.
  await page.goto(base + "#home");
  const appointment = page.locator("#content [data-home-appointment]");
  await appointment.waitFor();
  check((await appointment.locator("[data-int-card-reminders]").count()) === 0, "bell on Home");
  await appointment.locator("details.int-cal-menu summary").click();
  check(
    (await appointment.locator(".int-cal-list a").count()) === 4,
    "Home menu has no four links",
  );
  await page.screenshot({ path: shots + "cal-02-home-menu-it-1440.png" });
  await page.keyboard.press("Escape");
  passed.push("Home «Prossimo appuntamento» opens the same menu");

  // 5 · A recurring series (DM): the whole series as one .ics with RRULE; the note says the web
  // links add one date. The player then gets a notice that carries «Aggiungi al calendario».
  await as("dm");
  await sessionsTab();
  const first = await page.evaluate(() => {
    const d = new Date(Date.now() + 9 * 86400e3);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  await page.getByRole("button", { name: "Nuova serie ricorrente…" }).click();
  await page.locator('#dialog input[name="title"]').fill("Giovedì a Bruma");
  await page.locator('#dialog input[name="startDate"]').fill(first);
  await page.locator('#dialog input[name="time"]').fill("21:00");
  await page.locator('#dialog input[name="frequency"][value="weekly"]').check();
  await page.locator('#dialog input[name="count"]').fill("6");
  await page.locator("#dialog .sp-dates li").nth(5).waitFor();
  await page.locator("#dialog button[type=submit]").click();
  await page.waitForTimeout(200);
  await as("player");
  await sessionsTab();
  const seriesCard = page
    .locator("#content article.campaign-session")
    .filter({ hasText: "Giovedì a Bruma" })
    .first();
  await seriesCard.locator("details.int-cal-menu summary").click();
  const seriesList = seriesCard.locator(".int-cal-list");
  check(
    (await seriesList.innerText()).includes("Tutta la serie (.ics, 6 date)"),
    "no whole-series item",
  );
  check(
    (await seriesList.innerText()).includes("Google, Outlook e Yahoo aggiungono solo questa data"),
    "the single-date note is missing",
  );
  await page.screenshot({ path: shots + "cal-03-series-menu-it-1440.png" });
  const [seriesFile] = await Promise.all([
    page.waitForEvent("download"),
    seriesList.locator("[data-int-cal-series]").click(),
  ]);
  const seriesIcs = await readDownload(seriesFile);
  await seriesFile.saveAs(shots + "cal-series.ics");
  check(/-serie-\d{4}-\d{2}-\d{2}\.ics$/.test(seriesFile.suggestedFilename()), "series file name");
  check(seriesIcs.includes("RRULE:FREQ=WEEKLY;COUNT=6"), "no RRULE: " + seriesIcs);
  // The series zone defaults to the browser's own (Europe/London in the CLI browser).
  const zone = (/DTSTART;TZID=([A-Za-z_/]+):\d{8}T210000/.exec(seriesIcs) ?? [])[1];
  check(zone, "DTSTART not in the series zone at 21:00");
  check(
    seriesIcs.includes("BEGIN:VTIMEZONE") && seriesIcs.includes(`TZID:${zone}`),
    "no VTIMEZONE",
  );
  passed.push("Series: «Tutta la serie» downloads one recurring .ics (RRULE, TZID, VTIMEZONE)");

  await page.locator('.service-nav [data-service="requests"]').click();
  await page.locator("#dialog [data-notifications-centre]").waitFor();
  const action = page
    .locator("#dialog .notifications-item")
    .filter({ hasText: "Giovedì a Bruma" })
    .first()
    .getByRole("button", { name: "Aggiungi al calendario" });
  await action.click();
  await page.locator("#dialog [data-int-add-calendar]").waitFor();
  const dialogText = await page.locator("#dialog").innerText();
  check(
    dialogText.includes("Giovedì a Bruma") &&
      dialogText.includes("Tutte le sessioni, sempre aggiornate"),
    "the notice's calendar dialog: " + dialogText.slice(0, 300),
  );
  check(
    (await page.locator("#dialog .int-cal-list a").count()) === 4,
    "dialog without the four links",
  );
  await page.screenshot({ path: shots + "cal-04-notice-dialog-it-1440.png" });
  await page.keyboard.press("Escape");
  passed.push("A session notice opens «Aggiungi al calendario» with the same choices and the feed");

  // 6 · Integrations › Calendar: the next session offers the same menu.
  await page.goto(base + "#campaign?tab=integrations&id=calendar");
  await page.locator('[data-int-page="calendar"]').waitFor();
  check(
    (await page.locator("[data-int-next] details.int-cal-menu").count()) === 1,
    "no menu in the Calendar tab",
  );
  passed.push("Integrations › Calendar: the next session has the same menu");

  // 7 · Phone 390, touch: the menu opens in place, nothing leaves the screen, tap downloads.
  const saved = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  const phoneContext = await page
    .context()
    .browser()
    .newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      acceptDownloads: true,
      serviceWorkers: "block",
    });
  await phoneContext.route(EXTERNAL, (route) => route.fulfill({ status: 200, body: "stub" }));
  const phone = await phoneContext.newPage();
  phone.on("pageerror", (error) => errors.push("phone: " + error.message));
  await phone.goto(base);
  await phone.evaluate((data) => {
    for (const [k, v] of Object.entries(JSON.parse(data))) localStorage.setItem(k, v);
  }, saved);
  await phone.reload();
  await as("player", phone);
  await sessionsTab(phone);
  const phoneCard = phone
    .locator("#content article.campaign-session")
    .filter({ hasText: "Il sigillo della torre" });
  await phoneCard.locator("details.int-cal-menu summary").tap();
  const phoneList = phoneCard.locator(".int-cal-list");
  await phoneList.waitFor();
  const phoneBox = await phoneList.boundingBox();
  check(phoneBox.x >= 0 && phoneBox.x + phoneBox.width <= 390, "phone menu leaves the screen");
  check(await noOverflow(phone), "phone page scrolls sideways");
  const heights = await phoneList
    .locator(".int-cal-item")
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  check(
    heights.every((h) => h >= 40),
    "phone items under 40 px: " + heights,
  );
  await phoneList.scrollIntoViewIfNeeded();
  await phone.screenshot({ path: shots + "cal-05-sessions-menu-phone-390.png" });
  const [phoneFile] = await Promise.all([
    phone.waitForEvent("download"),
    phoneList.locator("[data-int-cal-ics]").tap(),
  ]);
  check((await readDownload(phoneFile)).includes("BEGIN:VEVENT"), "phone .ics");
  await phoneContext.close();
  passed.push(
    "Phone 390 touch: the menu opens in place, targets ≥ 40 px, no sideways scroll, tap downloads",
  );

  check(!errors.length, "page errors: " + errors.join(" | "));
  return { passed, opened: opened.map((u) => u.split("/")[2]) };
}
