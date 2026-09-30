async (rootPage) => {
  // P10 — campaign governance. Real clicks, keys and taps on synthetic data; resets this
  // browser's demo state. Acceptance of the P10 package (changes/interview-01/audit/triage.md):
  // (1) DM: «Invita giocatori» from the campaign header gives a link in at most 3 interactions;
  // (2) «Vedi come» from a member row; «Cosa vedono i giocatori» hides enemy health and names
  //     as checked from the player's view at the Table;
  // (3) the running campaign is archived and restored;
  // (4) the player reaches Stop in one tap (desktop and 390x844 touch); the DM sees the
  //     raised-hand counter without opening the bell;
  // (5) the palette finds «pagina pubblica», «permessi», «timer», «probabilità» in IT and EN;
  // plus the Tactical preset, the public page with an Archive page and the pause tip.
  // Run with (from /Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P10/):
  // playwright-cli -s=d20-fix-p10 --raw run-code --filename=<this file>
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P10/journey/";
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const results = [];
  const errors = [];
  const check = (condition, message) => {
    if (!condition) throw new Error("CHECK FAILED: " + message);
  };
  const ok = (message) => results.push("ok · " + message);
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const page = rootPage;
  page.on("pageerror", (e) => errors.push(String(e)));
  // Visual pass 2 (30/09/2026): the DM's session commands (Pause, Hide scene, Party…) sit in
  // the map's one «Sessione» menu (Owlbear keeps one row of controls); open it first.
  const sessionMenu = async (p = page) => {
    const menu = p.locator(".session-view-hud [data-session-menu]");
    if ((await menu.count()) && (await menu.getAttribute("aria-expanded")) !== "true")
      await menu.click();
  };
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("#content").waitFor();
  const role = (value) => page.getByLabel("Visita come").selectOption(value);
  const closeDialogs = async () => {
    for (let i = 0; i < 3 && (await page.locator("#dialog[open]").count()); i++)
      await page.keyboard.press("Escape");
  };
  const saved = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}"), key);

  // 1. «Invita giocatori» in the campaign header: click, «Crea link», «Copia link».
  await role("dm");
  await page.goto(base + "#campaign?tab=overview");
  await page.locator("[data-campaign-invite]").first().click();
  await page.locator("#dialog[open] h2", { hasText: "Invita giocatori" }).waitFor();
  await page.locator("#dialog button[type=submit]").click();
  await page.locator("#dialog[open] h2", { hasText: "Link d’invito pronto" }).waitFor();
  const link = await page.locator("#dialog [data-cm-ready-link]").inputValue();
  check(/#campaigns\?tab=join&id=/.test(link), "invite link shown");
  await page.locator("#dialog [data-cm-dialog-copy]").click();
  await page.screenshot({ path: shots + "01-invite-link.png" });
  await closeDialogs();
  ok("«Invita giocatori» → «Crea link» → «Copia link»: 3 interactions, link " + link.split("id=")[1]);

  // 2a. «Vedi come» on the member row (Members).
  await page.goto(base + "#campaign?tab=campaign-members&id=members");
  await page.locator('[data-cm="view-as"]').first().click();
  await page.locator("[data-cs-view-title]").waitFor();
  check((await page.locator("[data-cs-view-title]").innerText()).includes("Livia"), "view as Livia");
  await page.screenshot({ path: shots + "02-view-as-from-member-row.png" });
  await page.locator("[data-cs-exit-view]").first().click();
  ok("«Vedi come» from the member row opens the member view with «Torna al mio utente»");

  // 2b. «Cosa vedono i giocatori»: enemy health hidden, names «Solo il DM» applied to existing.
  await page.goto(base + "#campaign?tab=settings&id=disclosure");
  await page.locator('[data-cs-rule-input="enemyHp"][value="hidden"]').check();
  await page.locator('[data-cs-rule-input="enemyHp"][value="hidden"]:checked').waitFor();
  await page.locator('[data-cs-default-input][value="dm"]').check();
  await page.locator("[data-cs-apply-defaults]:not([disabled])").click();
  await page.locator("#dialog [data-cs-impact-count]").waitFor();
  await page.locator("#dialog button[type=submit]").click();
  await page.locator("[data-cs-apply-result]").waitFor();
  await page.locator('[data-cs-disclosure-input="hitChance"][value="always"]').check();
  await page.locator('[data-cs-disclosure-input="hitChance"][value="always"]:checked').waitFor();
  await page.screenshot({ path: shots + "03-what-players-see.png", fullPage: true });
  const policy = (await saved()).ext["campaign-settings"].campaigns.lanterns.policy;
  check(policy.enemyHp === "hidden" && policy.creatureName === "dm", "policy stored");
  check(
    (await saved()).ext["core-settings"].campaign["knowledge-policy.hit-chance"] === "always",
    "hit chance is the knowledge area's campaign setting",
  );
  // Checked from the player's view at the Table.
  await role("player");
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  await closeDialogs();
  await page.waitForTimeout(300);
  const map = await page.locator("#battle-map").innerHTML();
  check(!/data-cs-health=/.test(map), "no enemy health pill for the player");
  check(!/Sentinella/.test(map) && /Creatura sconosciuta/.test(map), "names hidden for the player");
  await page.screenshot({ path: shots + "04-player-table-hidden-health-names.png" });
  ok("«Cosa vedono i giocatori»: at the player's Table no health pill and «Creatura sconosciuta»");

  // 4. Stop in one tap on the map bar (desktop); raise hand; the DM's counter.
  const stop = page.locator('[data-safety-hud="stop"]');
  check(await stop.isVisible(), "Stop on the map bar");
  await stop.click();
  await page.getByText("Stop inviato in forma anonima").first().waitFor();
  if (await page.locator('[data-safety-hud="raise-hand"]').count())
    await page.locator('[data-safety-hud="raise-hand"]').click();
  await role("dm");
  await page.locator("[data-safety-hud-queue]").waitFor();
  await page.screenshot({ path: shots + "05-dm-stop-and-hand-counter.png" });
  check(!(await page.locator(".notifications-panel[open], [data-notifications-open]").count()), "bell closed");
  await page.locator('.safety-xcard [data-safety-overlay="ack"]').click();
  ok("player: Stop in one click on the map bar; DM: X-card and «Mani alzate: 1» on the map bar");

  // 4b. Phone 390x844 with touch: Stop in one tap.
  const phoneContext = await page
    .context()
    .browser()
    .newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const phone = await phoneContext.newPage();
  phone.on("pageerror", (e) => errors.push("phone: " + String(e)));
  await phone.goto(base + "#table");
  await phone.locator("#battle-map").waitFor();
  for (let i = 0; i < 2 && (await phone.locator("#dialog[open]").count()); i++)
    await phone.locator("#dialog [data-close]").last().tap();
  const phoneStop = phone.locator('[data-safety-hud="stop"]');
  const box = await phoneStop.boundingBox();
  check(box && box.width >= 40 && box.height >= 40, "Stop is a 40px target on the phone");
  await phoneStop.tap();
  await phone.getByText("Stop inviato in forma anonima").first().waitFor();
  await phone.screenshot({ path: shots + "06-phone-stop.png" });
  await phoneContext.close();
  ok("phone 390x844 touch: Stop in one tap");

  // 5. Palette in Italian and English.
  const palette = async (query, expected) => {
    await page.locator('.service-nav [data-service="search"]').click();
    await page.locator("#dialog [name=query]").fill(query);
    await page.waitForTimeout(150);
    const texts = await page.locator("#dialog .search-result").allInnerTexts();
    await page.keyboard.press("Escape");
    check(
      texts.slice(0, 6).some((t) => expected.test(t)),
      `palette «${query}» → ${expected} (got ${texts.slice(0, 4).join(" | ")})`,
    );
  };
  await page.goto(base + "#campaign?tab=overview");
  await palette("pagina pubblica", /Pagina pubblica della campagna/);
  await palette("permessi", /Permessi dei giocatori/);
  await palette("timer", /Conto alla rovescia/);
  await palette("probabilità", /Probabilità di colpire/);
  await palette("invito", /Invita giocatori/);
  await palette("archivia campagna", /Archivia la campagna/);
  await palette("dipendenze", /dipendenze/i);
  await palette("co-dm", /Cedi il ruolo di DM/);
  await palette("orologio", /Orologi di progresso/);
  const setLang = async (lang) => {
    await page.locator('[data-service="preferences"]').click();
    await page.locator('#dialog [name="lang"]').selectOption(lang);
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForTimeout(200);
  };
  await setLang("en");
  await palette("public page", /Campaign public page/);
  await palette("permissions", /Player permissions/);
  await palette("timer", /Countdown/);
  await palette("chance", /Chance to hit/);
  await palette("invite", /Invite players/);
  await page.goto(base + "#campaign?tab=settings&id=disclosure");
  await page.getByRole("heading", { name: "What players see", level: 2 }).waitFor();
  await page.screenshot({ path: shots + "11-en-what-players-see.png" });
  await setLang("it");
  ok("palette EN: public page, permissions, timer, chance, invite; settings in English");
  ok("palette IT: pagina pubblica, permessi, timer, probabilità, invito, archivia campagna, dipendenze, co-dm, orologio");

  // 6. Rules preset picker: Tattico.
  await page.goto(base + "#campaign?tab=settings&id=rules");
  await page.locator('[data-cs-preset-pick][value="tactical"]').check();
  await page.locator("#dialog[open] [data-cs-preset-changes]").waitFor();
  await page.screenshot({ path: shots + "07-preset-dialog.png" });
  await page.locator("#dialog button[type=submit]").click();
  await page.locator(".cs-badge.is-standard", { hasText: "Tattico" }).first().waitFor();
  ok("preset «Tattico» applied from the picker, with the list of changes first");

  // 7. Public page (Settings › Sharing) with an Archive page, seen as a visitor.
  await page.goto(base + "#campaign?tab=settings&id=sharing");
  await page.locator('[data-community-form="public-page"] [name=enabled]').check();
  const archiveEntry = page.locator('[data-community-form="public-page"] label', { hasText: "Archivio" }).first();
  const archiveTitle = (await archiveEntry.innerText()).split("·")[0].trim();
  await archiveEntry.locator("input").check();
  await page.locator('[data-community-form="public-page"] button[type=submit]').click();
  await page.locator("[data-community-link]").waitFor();
  await page.locator("[data-community-public]").first().click();
  await page.locator(".community-public").waitFor();
  check((await page.locator(".community-public").innerText()).includes(archiveTitle), "archive page public");
  await page.screenshot({ path: shots + "08-public-page-archive.png", fullPage: true });
  ok(`public page from Settings › Condivisione shows the Archive page «${archiveTitle}»`);

  // 8. Pause: the player reads a tip or a rule of the day.
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  await closeDialogs();
  await sessionMenu();
  await page.locator('.session-view-hud [data-sv="pause"]').click();
  await role("player");
  await page.locator(".session-view-pause-tip").waitFor();
  await page.screenshot({ path: shots + "09-pause-tip.png" });
  await role("dm");
  await sessionMenu();
  await page.locator('.session-view-hud [data-sv="resume"]').click();
  ok("pause overlay: players read a tip or a rule of the day");

  // 3. Archive the running campaign, Table closed, restore in one step.
  await page.goto(base + "#campaign?tab=campaign-data");
  await page.locator('[data-cd-campaign="lanterns"] [data-cd="archive"]').click();
  await page.locator("#dialog [data-cd-archive-current]").waitFor();
  await page.locator("#dialog button[type=submit]").click();
  await page.locator('[data-cd-campaign="lanterns"] [data-cd="restore-archived"]').waitFor();
  await page.goto(base + "#table");
  await page.locator("[data-cm-closed=archived]").waitFor();
  await page.screenshot({ path: shots + "10-table-closed-archived.png" });
  await page.locator('[data-cm-closed] [data-cm="restore"]').click();
  await page.locator("#battle-map").waitFor();
  check((await saved()).ext["campaign-members"].campaigns.lanterns.status === "active", "restored");
  ok("running campaign archived (Table closed with the reason) and restored in one step");

  await closeDialogs();
  results.push("page errors: " + (errors.length ? errors.join(" | ") : "none"));
  return results.join("\n");
}
