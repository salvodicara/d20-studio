async (page) => {
  // P9 sessions (CA-43, CA-47, SV-39, CA-21): availability totals and the best date, names
  // instead of «Giocatore / Player», answers carried to the session, «Aggiungi al
  // calendario» and the reminder bell on the card and on Home, the automatic recap draft.
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P9/";
  const passed = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const button = (name, root = page) => root.getByRole("button", { name, exact: true });
  const field = (path) => page.locator('#content [data-campaign-path="' + path + '"]');
  const heading = (name) => page.getByRole("heading", { name, exact: true, level: 1 }).waitFor();
  const as = async (role) => {
    await page.locator("#demo-role").selectOption(role);
    await page.waitForTimeout(150);
  };
  const day = (offset) => {
    const d = new Date(Date.now() + offset * 86400e3);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T21:00`;
  };
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:8879/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await as("dm");
  await page.goto("http://127.0.0.1:8879/#campaign?tab=sessions");
  await heading("Sessioni");
  // Refreshed by the hand-off writer (29/09/2026): the example always has «Il sigillo della
  // torre» on the coming Thursday (sample-clock.mjs); it is cancelled so the session agreed
  // here is the next one (Home's appointment, the calendar).
  await page.locator('[data-campaign-cancel-session="session-sample-13"]').click();
  await page.locator('[data-campaign-path="data.reason"]').fill("Rinviata");
  await page.locator("[data-campaign-save]").click();
  await page.locator("[data-campaign-apply]").click();
  await heading("Sessioni");
  await button("Raccogli disponibilità").click();
  await field("data.title").fill("Serata della torre");
  for (const [i, offset] of [
    [0, 3],
    [1, 4],
  ].map((row) => row)) {
    await button("Aggiungi alternativa").click();
    await field(`data.slots.${i}.localTime`).fill(day(offset));
    await field(`data.slots.${i}.timeZone`).fill("Europe/Rome");
  }
  await button("Apri raccolta disponibilità").click();
  await heading("Sessioni");
  let text = await page.locator("#content").innerText();
  // Refreshed by the hand-off writer (29/09/2026): the example's scheduled session (its «Ora
  // concordata») sits in the same list; the poll's own card is read.
  const pollCard = await page
    .locator("#content li, #content article", { hasText: "Serata della torre" })
    .last()
    .innerText();
  check(
    pollCard.includes("Proposta:") && !pollCard.includes("Ora concordata: "),
    "Poll dates are not labelled «Proposta»: " + pollCard.slice(0, 300),
  );
  check(!text.includes("Giocatore / Player"), "Participant shown as «Giocatore / Player»");
  check(
    text.includes("Livia, Mira (Giocatore)"),
    "Participant not named by character: " + text.slice(0, 400),
  );
  passed.push("Poll dates read «Proposta»; the player appears as «Livia, Mira (Giocatore)»");

  // Answers: player available on the first date, if need be on the second; DM available on the first.
  await as("player");
  const responses = page.locator("#content [data-campaign-response]");
  await responses.nth(0).selectOption("yes");
  await page.waitForTimeout(150);
  await responses.nth(1).selectOption("maybe");
  await page.waitForTimeout(150);
  check(
    (await responses.nth(1).locator("option:checked").innerText()) === "Se necessario",
    "«Se necessario» label missing",
  );
  await as("dm");
  await page.locator("#content [data-campaign-response]").nth(0).selectOption("yes");
  await page.waitForTimeout(150);
  const grid = page.locator("#content .campaign-poll-grid");
  check(
    (await grid.locator("thead th.is-best").count()) === 1,
    "Best date not highlighted in the grid",
  );
  check(
    (await grid.locator("thead th.is-best").innerText()).includes("Migliore"),
    "Best badge missing",
  );
  check(
    (await grid.locator("tfoot td").first().innerText()).includes("2"),
    "Totals row wrong: " + (await grid.locator("tfoot").innerText()),
  );
  check(
    (await page.locator("#content .campaign-poll-slot.is-best").innerText()).includes(
      "2 disponibili",
    ),
    "Slot totals missing",
  );
  await page
    .locator("#content .campaign-poll-grid-wrap")
    .screenshot({ path: shots + "s01-poll-heatmap.png" });
  passed.push(
    "Poll: heatmap with ✓/~ per person, totals row, best date highlighted («Migliore», «Data migliore»)",
  );

  // Confirm the best date: the answers become the session's RSVPs.
  await page.locator("#content .campaign-poll-slot.is-best [data-campaign-confirm-slot]").click();
  await button("Conferma").click();
  await heading("Sessioni");
  await as("player");
  const card = page
    .locator("#content article.campaign-session")
    .filter({ hasText: "Serata della torre" })
    .first();
  check(
    (await card.innerText()).includes("dalla raccolta disponibilità"),
    "«Disponibile» did not carry over: " + (await card.innerText()),
  );
  passed.push("Confirming the best date carries «Disponibile» into the session RSVP");

  // CA-47: «Aggiungi al calendario» and the reminder bell on the card.
  await button("Aggiungi al calendario", card).click();
  const dialog = page.locator("#dialog");
  check((await dialog.innerText()).includes("Scarica il file .ics"), "Calendar dialog has no .ics");
  await button("Crea il mio link del calendario", dialog).click();
  await dialog.locator("[data-int-add-feed-url]").waitFor();
  check(
    (await dialog.locator("[data-int-add-feed-url]").inputValue()).startsWith("webcal://"),
    "No webcal link",
  );
  await dialog.screenshot({ path: shots + "s02-add-to-calendar.png" });
  await page.keyboard.press("Escape");
  await card.locator("[data-int-card-reminders]").click();
  await dialog.locator('[data-int-reminder="remind-24h"]').check();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  check(
    (await card.locator("[data-int-card-reminders]").innerText()).includes("24 ore prima"),
    "Bell does not show the chosen reminder",
  );
  // The same choice in Preferenze › Notifiche, listed in its navigation.
  await page.locator('.service-nav [data-service="preferences"]').click();
  const jump = page.locator("#dialog .pref-jump");
  check(
    (await jump.innerText()).includes("Notifiche"),
    "Preferences navigation misses «Notifiche»",
  );
  await button("Notifiche", jump).click();
  check(
    await page.locator('#dialog [name="setting:notifications.remind-24h"]').isChecked(),
    "Reminder duplicated instead of shared",
  );
  await page.keyboard.press("Escape");
  passed.push(
    "Session card: «Aggiungi al calendario» (.ics and webcal link) and a reminder bell sharing Preferenze › Notifiche",
  );

  // SV-39: Home's next appointment.
  await page.goto("http://127.0.0.1:8879/#home");
  const appointment = page.locator("#content [data-home-appointment]");
  await appointment.waitFor();
  await button("Aggiungi al calendario", appointment).click();
  check(
    (await dialog.innerText()).includes("Serata della torre"),
    "Home calendar dialog wrong session",
  );
  await page.keyboard.press("Escape");
  passed.push("Home «Prossimo appuntamento» offers «Aggiungi al calendario»");

  // CA-21: the recap editor prepares a draft from the evening.
  await as("dm");
  await page.goto("http://127.0.0.1:8879/#campaign?tab=journal");
  await button("Nuovo resoconto").click();
  await button("Prepara bozza automatica").click();
  const body = await field("data.body").inputValue();
  check(
    /Presenze:/.test(body) &&
      /Durata:/.test(body) &&
      /Scene:/.test(body) &&
      /Eventi di gioco:/.test(body),
    "Automatic draft incomplete: " + body,
  );
  check(
    !/Impostazione|Moduli delle integrazioni|Preferenze proposte/.test(body),
    "Administrative events in the draft: " + body,
  );
  // SV-05: the private draft saves itself and says so.
  await page
    .locator("#content [data-campaign-status]", { hasText: "Bozza privata salvata alle" })
    .waitFor();
  await page.screenshot({ path: shots + "s03-recap-autodraft.png" });
  passed.push(
    "«Prepara bozza automatica» fills attendance, duration, scenes and play events (no administrative ones)",
  );

  // Phone 390×844: the poll grid scrolls inside itself; no page overflow.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:8879/#campaign?tab=sessions");
  await heading("Sessioni");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check(overflow <= 1, "Phone page overflows by " + overflow);
  await page.screenshot({ path: shots + "s04-sessions-phone.png", fullPage: false });
  await page.setViewportSize({ width: 1440, height: 900 });
  passed.push("Sessions fit 390×844 without a page scroll sideways");
  check(errors.length === 0, "Runtime errors: " + errors.join("; "));
  return { passed, errors };
}
