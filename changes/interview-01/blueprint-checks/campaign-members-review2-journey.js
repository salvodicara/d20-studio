async (rootPage) => {
  // B13 review round 2 — real clicks and keys against the one app, both identities, IT
  // desktop 1440 then a 390 phone. Each block reproduces a round-2 finding and checks the
  // fix. Synthetic data only; resets this browser's demo state. Screenshots go to the B13
  // evidence folder, never into the checkout.
  const browser = rootPage.context().browser();
  for (const prior of browser.contexts()) if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B13/";
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const as = async (role) => {
    await page.locator("#demo-role").selectOption(role);
    await page.waitForTimeout(150);
  };
  const button = (name, root = page) => root.getByRole("button", { name, exact: true });
  const card = (name) => page.locator(".cm-card", { hasText: name });
  const content = () => page.locator("#content").innerText();
  const dialog = page.locator("#dialog[open]");
  const submit = () => page.locator("#dialog[open] button[type=submit]").click();
  const shot = (name) => page.screenshot({ path: dir + name });
  const go = async (hash) => {
    await page.goto(base + "#" + hash);
    await page.waitForTimeout(250);
  };
  const noOverflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  const moveWithKeys = async (actorId, key = "ArrowLeft") => {
    await page.locator("#battle-map").waitFor();
    const token = page.locator(`#battle-map [data-actor="${actorId}"]`);
    const before = await token.getAttribute("transform");
    await token.focus();
    await page.keyboard.press("Enter");
    await page.locator("#battle-map").focus();
    await page.keyboard.press(key);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
    return { before, after: await token.getAttribute("transform") };
  };
  const role = async (target, next) => {
    await go("campaigns?id=lanterns&tab=members");
    await page.locator(`[data-cm="role"][data-target="${target}"][data-role="${next}"]`).click();
    await dialog.waitFor();
    const body = await dialog.innerText();
    await submit();
    await page.waitForTimeout(250);
    return body;
  };
  const sidebarBadge = async () => {
    await go("campaign");
    return page.locator(".campaign-sidebar .badge").innerText();
  };

  // 1. P1 seats: an observer, then an unassigned owner, controls nothing until a Claim.
  await page.goto(base + "#campaigns");
  await page.evaluate((k) => localStorage.removeItem(k), key);
  await page.reload();
  await page.getByRole("heading", { name: "Campagne", level: 1 }).waitFor();
  await as("dm");
  await role("player", "observer");
  let data = await stored();
  check(
    data.campaign.members.find((m) => m.id === "player").role === "observer",
    "Player not an observer",
  );
  await as("player");
  await go("table");
  let moved = await moveWithKeys("livia");
  check(moved.after === moved.before, "Observer still moves Livia: " + JSON.stringify(moved));
  check(
    !(await content()).includes("Sotto il tuo controllo"),
    "Observer's Table still says «Sotto il tuo controllo»",
  );
  await shot("r2-01-observer-table.png");
  await go("home");
  await page.locator(".cm-home-summary").waitFor();
  check(
    (await content()).includes("Segui questa campagna senza personaggio"),
    "Home still offers Livia to the observer",
  );
  check((await sidebarBadge()) === "Osservatore", "Sidebar badge is not «Osservatore»");
  await go("characters?id=livia");
  await page.getByText("Sola consultazione in questa campagna").waitFor();
  check(!(await button("Correggi valori").count()), "Observer can still correct Livia");
  check(
    (await content()).includes("Consultazione · modifiche riservate ai controllori"),
    "Sheet still says «Scheda controllata da te»",
  );
  await shot("r2-01-observer-sheet.png");
  passed.push(
    "Observer: Livia does not move (Enter + ArrowLeft + Enter), Home «Segui … senza personaggio», badge «Osservatore», sheet view-only with the reason",
  );
  await as("dm");
  await role("player", "player");
  await as("player");
  await go("table");
  moved = await moveWithKeys("livia");
  check(moved.after === moved.before, "Unassigned owner still moves Livia");
  await go("characters?id=livia");
  await page.getByText("Livia non è assegnato a nessuno").waitFor();
  await button("Reclama").click();
  await page.getByText("Scheda controllata da te").waitFor();
  check(await button("Correggi valori").count(), "Claimed sheet not editable");
  await go("table");
  moved = await moveWithKeys("livia");
  check(moved.after !== moved.before, "Claimed Livia does not move");
  check(
    (await sidebarBadge()) === "Giocatore · Livia",
    "Sidebar badge not «Giocatore · Livia» after the claim",
  );
  passed.push(
    "Player again: Livia stays unassigned and does not move; «Reclama» from the sheet gives her back (moves, editable, badge «Giocatore · Livia»)",
  );

  // 2. P2 co-DM: the promoted co-DM moves the campaign's creatures; demoted, no longer.
  await as("dm");
  const body = await role("player", "co-dm");
  check(body.includes("Muovere e far agire le creature della campagna al Tavolo"), "Power list");
  await as("player");
  await go("table");
  moved = await moveWithKeys("goblin-1");
  check(moved.after !== moved.before, "Co-DM cannot move goblin-1");
  check((await sidebarBadge()).startsWith("Co-DM"), "Sidebar badge ignores the co-DM role");
  await go("preparation");
  const preparationText = await content();
  await as("dm");
  await role("player", "player");
  await as("player");
  await go("table");
  moved = await moveWithKeys("goblin-2");
  check(moved.after === moved.before, "Demoted player still moves goblin-2");
  passed.push(
    `Co-DM moves goblin-1 by keyboard; demoted, goblin-2 stays. Preparation for the co-DM (deviation, core gate): «${preparationText.split("\n")[0]}»`,
  );

  // 3. P1 handover relabelled: the owner entrusts the creatures, nothing more is promised.
  await as("dm");
  await go("campaigns?id=lanterns&tab=manage");
  await button("Cedi il ruolo di DM per la sessione…").click();
  await dialog.waitFor();
  check(
    // P10 CA-57: the Owlbear label, with what stays with the owner said plainly.
    // Hand-off (R7 CA-57): the runner guides the whole session; private data stays the DM's.
    (await dialog.innerText()).includes("guida tutta la sessione") &&
      (await dialog.innerText()).includes("mai i tuoi appunti privati"),
    "Hand-off dialog does not say what stays with the DM",
  );
  await submit();
  await page.getByText("ha ceduto il ruolo di DM a").waitFor();
  await shot("r2-03-entrust-banner.png");
  await as("player");
  await go("table");
  moved = await moveWithKeys("goblin-2");
  check(moved.after !== moved.before, "Entrusted creature does not move");
  await as("dm");
  await go("campaigns?id=lanterns&tab=manage");
  await button("Riprendi il ruolo di DM").click();
  await page.waitForTimeout(250);
  check(!(await stored()).ext["campaign-members"].campaigns.lanterns.handover, "Not taken back");
  passed.push(
    "«Affida le creature per questa sessione…»: the player moves goblin-2, «Riprendi le creature» ends it; no DM-role claim left in the UI",
  );

  // 4. P2 Undo: a join in a parked campaign keeps the DM's Undo, which keeps the join.
  await go("campaigns");
  await page.locator('.page-heading [data-cm="create"]').click();
  await page.locator("#dialog [name=name]").fill("Rovine di Vetro");
  await submit();
  await page.waitForURL(/tab=invites/);
  const id = page.url().match(/id=(campaign-[a-z0-9-]+)/)[1];
  await page.locator("[data-cm-form=link] [name=uses]").selectOption("5");
  await page.locator("[data-cm-form=link] button").click();
  await page.waitForTimeout(250);
  const link = await page.locator(".cm-link:not(.is-closed) [data-cm-url]").first().inputValue();
  await go("table");
  moved = await moveWithKeys("goblin-1");
  check(moved.after !== moved.before, "DM move failed");
  await as("player");
  await page.goto(link);
  await page.waitForTimeout(300);
  await page.locator('[data-cm="join-path"][data-path="own"]').click();
  check(
    (await page.locator('[role="radiogroup"]').getAttribute("aria-label")) === "I tuoi personaggi",
    "Choice list has no accessible name",
  );
  await page.locator(".cm-choice", { hasText: "Mira" }).click();
  await page.locator("form[data-cm-form=join] button.primary").click();
  await dialog.waitFor();
  await submit();
  await page.waitForTimeout(300);
  await as("dm");
  await go("table");
  await button("Annulla ultima modifica").click();
  await page.waitForTimeout(300);
  const undone = await page
    .locator('#battle-map [data-actor="goblin-1"]')
    .getAttribute("transform");
  check(undone === moved.before, `DM Undo lost after the join: ${undone}`);
  data = await stored();
  check(data.actors.mira.campaignIds.includes(id), "The Undo reverted Mira's join");
  check(data.ext["campaign-members"].campaigns[id].seats.mira?.memberId === "player", "Seat lost");
  passed.push(
    "DM moves goblin-1, the player joins Rovine with Mira (radio group «I tuoi personaggi»), the DM's «Annulla ultima modifica» puts goblin-1 back and Mira stays in Rovine",
  );

  // 5. P2 launch: a player cannot switch the campaign in play; focus follows a launch.
  await as("player");
  await go("campaigns");
  check(!(await card("Rovine di Vetro").getByRole("button", { name: "Avvia" }).count()), "Avvia");
  check(
    (await card("Rovine di Vetro").innerText()).includes("la avvia il DM"),
    "No reason shown to the player",
  );
  await go("home");
  check(
    await page
      .locator(".cm-home-row", { hasText: "Rovine di Vetro" })
      .getByRole("button", {
        name: "Dettagli",
      })
      .count(),
    "Home row offers no Details",
  );
  await go("campaigns");
  await shot("r2-05-player-waiting.png");
  await as("dm");
  await go("campaigns");
  const launchButton = card("Rovine di Vetro").getByRole("button", { name: "Avvia" });
  await launchButton.focus();
  await page.keyboard.press("Enter");
  await page.locator(".table-topline h1", { hasText: "Scena iniziale" }).waitFor();
  await page.waitForTimeout(250);
  const focused = await page.evaluate(() => document.activeElement?.id);
  check(focused === "content", "Focus after Launch is not on #content: " + focused);
  await as("player");
  await go("campaigns");
  check(
    !(await card("Le lanterne di Bruma").getByRole("button", { name: "Avvia" }).count()),
    "Player can launch the lanterns",
  );
  check(
    await card("Rovine di Vetro").getByRole("button", { name: "Entra al Tavolo" }).count(),
    "No «Entra al Tavolo» on the campaign in play",
  );
  check((await sidebarBadge()) === "Giocatore · Mira", "Badge does not name Mira in Rovine");
  await as("dm");
  await go("campaigns");
  await card("Le lanterne di Bruma").getByRole("button", { name: "Avvia" }).click();
  await page.locator("#battle-map").waitFor();
  passed.push(
    "Player sees «Non in corso: la avvia il DM» and «Dettagli» (no «Avvia»); DM launches Rovine with Enter and focus lands on #content; badge «Giocatore · Mira» in Rovine",
  );

  // 6. P2 + P1 removed member: sheet view-only, no shared log line, no spectator map.
  await go("campaigns?id=lanterns&tab=members");
  await page.locator('[data-cm="remove"][data-target="player"]').click();
  await submit();
  await page.waitForTimeout(300);
  await go("campaigns?id=lanterns&tab=characters");
  const form = page.locator("form[data-cm-form=assign][data-actor=livia]");
  await form.locator("select").selectOption("dm");
  await form.locator("button").click();
  await page.waitForTimeout(300);
  data = await stored();
  check(data.actors.livia.owner === "player", "The DM seized Livia");
  const logLength = data.log.length;
  await as("player");
  await go("characters?id=livia");
  await page.getByText("Non fai più parte di «Le lanterne di Bruma»").waitFor();
  for (const name of ["Riposa", "Correggi valori", "Avanza di livello"])
    check(!(await button(name).count()), `Removed owner still has «${name}»`);
  await shot("r2-06-removed-sheet.png");
  check((await stored()).log.length === logLength, "A log line was added by the removed player");
  await go("session-view-display");
  await page.getByRole("heading", { name: "Non fai parte di questa campagna" }).waitFor();
  const spectator = await content();
  check(
    !/Livia|Doran|Sentinella|Esploratore|Mira/.test(spectator) &&
      !(await page.locator("#content svg").count()),
    "The spectator view still shows the map",
  );
  await shot("r2-06-removed-spectator.png");
  for (const hash of ["table", "preparation"]) {
    await go(hash);
    await page.getByRole("heading", { name: "Non fai parte di questa campagna" }).waitFor();
  }
  await as("dm");
  await go("session-view-display");
  check(!(await content()).includes("Non fai parte"), "The DM lost the spectator view");
  passed.push(
    "Removed player: Livia's sheet (reassigned to the DM, still the player's) is view-only with the reason and no shared log line; #session-view-display, #table and #preparation say «Non fai parte di questa campagna»; the DM still has the spectator view",
  );

  // 7. P3 offline: the refused approval box goes back to the stored setting.
  await go(`campaigns?id=${id}&tab=invites`);
  await button("Preferenze").click();
  await page.locator("[name=offline]").check();
  await button("Salva preferenze").click();
  await page.waitForTimeout(200);
  const box = page.locator("[data-cm-approval]");
  await box.click();
  await page.waitForTimeout(300);
  check(!(await box.isChecked()), "The refused approval box stays ticked");
  check(!(await stored()).ext["campaign-members"].campaigns[id].approval, "Approval stored");
  await shot("r2-07-offline-approval.png");
  await button("Preferenze").click();
  await page.locator("[name=offline]").uncheck();
  await button("Salva preferenze").click();
  await page.waitForTimeout(200);
  passed.push("Offline: ticking «Approva ogni ingresso…» is refused and the box goes back");

  // 8. Phone 390: the removed owner's sheet notice and the player's list, no overflow.
  await page.setViewportSize({ width: 390, height: 844 });
  await as("player");
  await go("characters?id=livia");
  await page.getByText("Sola consultazione in questa campagna").waitFor();
  check(await noOverflow(), "Overflow on the sheet notice at 390");
  await page.screenshot({ path: dir + "r2-08-phone-sheet-notice.png", fullPage: true });
  await go("campaigns");
  check(await noOverflow(), "Overflow on the list at 390");
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("#content .cm-card .button, #content .cm-deactivated .button")]
      .filter((el) => el.offsetParent !== null)
      .map((el) => [
        el.textContent.trim().slice(0, 30),
        Math.round(el.getBoundingClientRect().height),
      ])
      .filter(([, h]) => h < 40),
  );
  check(!small.length, "Targets under 40 px: " + JSON.stringify(small));
  await page.screenshot({ path: dir + "r2-08-phone-list.png", fullPage: true });
  passed.push("390: sheet notice and campaign list without overflow; targets ≥ 40 px");

  check(!errors.length, "Page errors: " + errors.join(" | "));
  await context.close();
  return passed;
}
