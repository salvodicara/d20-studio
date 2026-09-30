async (rootPage) => {
  // B62: the log is the first sub-tab of the sidebar's «Chat» tab; the core's toggle
  // (data-table="log") is a hidden handle. As the old Registro tab: an open log closes with
  // its own ✕, otherwise the log opens (the Chat tab, then its Registro sub-tab if needed).
  const toggleLog = async (p, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const close = p.locator("#content [data-chat-close]");
    if (await close.count()) return press(close.first());
    if ((await p.locator("#table-sidebar-panel").getAttribute("data-table-panel")) === "log")
      return press(p.locator('.table-tabs [data-table-section="chat"]'));
    if (!(await p.locator('.table-subtabs [data-table-subtab="log"]').count())) {
      const chat = p.locator('.table-tabs [data-table-section="chat"]');
      if ((await chat.getAttribute("aria-selected")) !== "true") await press(chat);
    }
    if ((await p.locator("#table-sidebar-panel").getAttribute("data-table-panel")) !== "log")
      await press(p.locator('.table-subtabs [data-table-subtab="log"]'));
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
  // B29 — account, profile and personal data. Real clicks, keys and taps on the one app:
  // IT desktop 1440 (player and DM), EN phone 390 with touch, reload persistence,
  // corrections, offline refusals, the access gate after signing out (pages, search,
  // bell, commands and keys closed), the account menu of the header, the published avatar
  // in the member list (B13) and chat (B17), the ownership offer of a deletion (B13) and
  // an export that never carries what the DM keeps hidden.
  // Synthetic data only; resets this browser's demo state.
  // Fixtures (synthetic) in the evidence directory: avatar-fixture.png (valid PNG),
  // broken-fixture.png (text), big-fixture.png (2.6 MB), notes-fixture.txt.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B29/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const passed = [],
    errors = [],
    notes = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const button = (name) => page.getByRole("button", { name, exact: true });
  const content = () => page.locator("#content").innerText();
  const noOverflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  const focusedHas = (attribute) =>
    page.evaluate((name) => document.activeElement?.hasAttribute(name) === true, attribute);
  // Evidence images hide the transient toast (its text is asserted separately).
  const shot = async (name) => {
    await page.evaluate(() => document.querySelector("#toast")?.classList.remove("shown"));
    await page.screenshot({ path: dir + name + ".png" });
  };
  const toast = async (pattern) => {
    await page.waitForFunction(
      (source) => new RegExp(source).test(document.querySelector("#toast")?.textContent ?? ""),
      pattern.source,
    );
    return page.locator("#toast").innerText();
  };
  const role = async (value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForTimeout(80);
  };
  // The header's account control opens its menu (DDB avatar menu); "Profilo" opens the
  // page. Waits for the render that follows the hash change, not the previous page's.
  const openAccount = async () => {
    await page.locator('.service-nav [data-service="account"]').click();
    await page.locator('#dialog [data-account-menu="profile"]').click();
    await page.waitForFunction(
      () =>
        location.hash === "#account" &&
        (document.querySelector('.account-tabs [aria-current="page"]')?.dataset.accountTab ===
          "profile" ||
          document.querySelector("[data-account-signin]")),
    );
  };
  const tab = async (name) => {
    await page.locator(".account-tabs").getByRole("button", { name, exact: true }).click();
    await page.waitForFunction(
      (text) => document.querySelector('.account-tabs [aria-current="page"]')?.textContent === text,
      name,
    );
  };
  const setOffline = async (value) => {
    await button("Preferenze").click();
    const box = page.locator("#dialog [name=offline]");
    if ((await box.isChecked()) !== value) await box.click();
    await button("Salva preferenze").click();
  };
  // The access gate shows the sign-in page in place of any page (the address keeps the
  // requested one).
  const signInScreen = () =>
    page.waitForFunction(
      () => document.querySelector("#account-signin-title")?.textContent === "Accedi a d20 Studio",
    );
  const dialogOpen = () => page.evaluate(() => document.querySelector("#dialog")?.open === true);
  const readDownload = async (download) => {
    const stream = await download.createReadStream();
    let text = "";
    for await (const chunk of stream) text += chunk.toString("utf8");
    return text;
  };
  const openCampaignMembers = async () => {
    await button("Inizio").click();
    await page.locator(".resume-scene").getByRole("button", { name: "Apri campagna" }).click();
    await openCampaignSection(page, "campaign-members"); // B62: «Gestione DM» / «Strumenti»
    await page.locator(".cm-member").first().waitFor();
  };

  // 1. Reset through the visible control; reach the account from the header in one click
  // or Enter, with focus on the page heading.
  await page.goto(base);
  await page.evaluate((k) => localStorage.removeItem(k), key);
  await page.reload();
  await page.getByRole("heading", { name: "La prossima avventura", level: 1 }).waitFor();
  await button("Ripristina esempio").click();
  await button("Ripristina").click();
  const headerButton = page.locator('.service-nav [data-service="account"]');
  check(
    (await headerButton.getAttribute("aria-label")) === "Account e profilo",
    "Header account control missing or unlabeled",
  );
  check(
    !(await page.locator("[data-account-home]").count()),
    "Home notice shown for an active account",
  );
  await headerButton.focus();
  await page.keyboard.press("Enter");
  // DDB avatar menu: who is signed in, the four sections and "Esci".
  await page.locator("#dialog .account-menu-head").waitFor();
  check(
    (await page.locator("#dialog .account-menu-head").innerText()).includes("Giocatore") &&
      (await page.locator("#dialog .account-menu-head .account-avatar").count()) === 1,
    "Account menu without the avatar and name",
  );
  check(
    (await page.locator("#dialog .account-menu button").allInnerTexts()).join("|") ===
      "Profilo|Accesso e servizi|Privacy|I miei dati|Esci",
    "Account menu items: " +
      (await page.locator("#dialog .account-menu button").allInnerTexts()).join("|"),
  );
  await shot("account-menu-it");
  await page.locator('#dialog [data-account-menu="profile"]').focus();
  await page.keyboard.press("Enter");
  await page.getByRole("heading", { name: "Account e profilo", level: 1 }).waitFor();
  check(page.url().endsWith("#account"), "Header control did not open #account: " + page.url());
  check(await focusedHas("data-account-heading"), "Focus not on the page heading after Enter");
  check(
    (await page.locator("[data-account-heading-name]").innerText()) === "Giocatore",
    "Player name not split by language: " +
      (await page.locator("[data-account-heading-name]").innerText()),
  );
  check(
    (await page.locator("[data-account-status]").innerText()) === "Account attivo",
    "Account status badge",
  );
  check(
    !(await page.locator("[data-account-heading-role]").count()),
    'Heading repeats the role: "Giocatore · Giocatore"',
  );
  // "Salva nome" on the unchanged default and a role word are refused, nothing saved.
  await button("Salva nome").click();
  await toast(/già questo/);
  await page.locator("[data-account-name]").fill("DM");
  await page.locator("[data-account-name]").press("Enter");
  await toast(/indica un ruolo/);
  check(
    !(await stored()).ext.account.profiles.player.nameHistory.length,
    "A refused name entered the history",
  );
  await page.locator("[data-account-name]").fill("Giocatore");
  check(
    (await content()).includes("Dimostrazione: nessuna autenticazione reale"),
    "Demonstration label missing",
  );
  await page.locator('[data-account-tab="access"]').focus();
  await page.keyboard.press("Enter");
  await page.getByRole("heading", { name: "Metodi d’accesso", level: 2 }).waitFor();
  check(
    await page.evaluate(() => document.activeElement?.dataset.accountTab === "access"),
    "Focus not kept on the chosen tab",
  );
  passed.push(
    'Header "Account e profilo" (Enter) opens the account menu (avatar, name, four sections, Esci); "Profilo" opens #account with focus on its heading; the player is "Giocatore" without a repeated role; "Salva nome" unchanged and "DM" refused; tabs keep keyboard focus',
  );
  await button("Cerca").click();
  const query = page.locator("#dialog [name=query]");
  if (await query.count()) {
    await query.fill("esporta");
    await page
      .locator("#dialog .search-result", { hasText: "Esporta o elimina i miei dati" })
      .click();
    await page.getByRole("heading", { name: "Esporta i miei dati", level: 2 }).waitFor();
    check(page.url().endsWith("#account?tab=data"), "Search result target: " + page.url());
    passed.push(
      'Search "esporta" lists "Esporta o elimina i miei dati" and opens #account?tab=data',
    );
  } else {
    // B23's palette replaces the core search: the account provider answers there.
    await page.locator("#dialog [data-cmdk-input]").fill("esporta");
    await page
      .locator("#dialog [data-cmdk-option]", { hasText: "Esporta o elimina i miei dati" })
      .first()
      .click();
    await page.getByRole("heading", { name: "Esporta i miei dati", level: 2 }).waitFor();
    check(page.url().endsWith("#account?tab=data"), "Palette result target: " + page.url());
    passed.push(
      'Search (B23 palette) "esporta" lists "Esporta o elimina i miei dati" and opens #account?tab=data',
    );
  }

  // 2. Acceptance (1): the DM changes display name (Enter) and avatar (emblem dialog); the
  // player sees both in the account member list, the journal, the campaign member list
  // of B13 and the chat of B17.
  await role("dm");
  await openAccount();
  const nameField = page.locator("[data-account-name]");
  await nameField.fill("Marco il Custode");
  await button("Inizio").click();
  await page.getByRole("heading", { name: "Nome non salvato" }).waitFor();
  await button("Continua a modificare").click();
  check((await nameField.inputValue()) === "Marco il Custode", "Guard lost the typed name");
  await nameField.press("Enter");
  await toast(/Nome salvato/);
  check(
    (await page.locator("[data-account-heading-name]").innerText()) === "Marco il Custode" &&
      (await page.locator("[data-account-heading-role]").innerText()) === "DM",
    "Heading name/role not updated",
  );
  await button("Crea emblema").click();
  await page.locator("#dialog").getByText("Spada", { exact: true }).click();
  await page.locator("#dialog").getByText("Viola", { exact: true }).click();
  check(
    (await page.locator("#dialog [data-account-emblem-preview] svg").count()) === 1,
    "Emblem preview not updated",
  );
  await button("Aggiungi e usa").click();
  await toast(/Nuovo avatar in uso/);
  check(
    (await page.locator(".account-preview .account-member-row svg").count()) === 1,
    "Preview without the emblem",
  );
  let data = await stored();
  const dmMember = data.campaign.members.find((m) => m.id === "dm");
  check(dmMember.name === "Marco il Custode", "Member name not published: " + dmMember.name);
  check(!("avatar" in dmMember), "Avatar still copied into the member record");
  const dmProfile = data.ext.account.profiles.dm;
  const inUse = dmProfile.avatars.find((a) => a.id === dmProfile.activeAvatarId);
  check(
    inUse.kind === "emblem" && inUse.glyph === "sword" && inUse.color === "violet",
    "Emblem not in use: " + JSON.stringify(inUse),
  );
  check(
    data.log.at(-1).visibility === "private" && data.log.at(-1).label === "Avatar aggiornato",
    "Profile change announced in the shared log: " + JSON.stringify(data.log.at(-1)),
  );
  await page.reload();
  await page.getByRole("heading", { name: "Account e profilo", level: 1 }).waitFor();
  await role("dm");
  await openAccount();
  check(
    (await page.locator("[data-account-name]").inputValue()) === "Marco il Custode",
    "Name lost on reload",
  );
  check(
    (await page.locator(".account-avatar-item.is-active svg").count()) === 1,
    "Emblem not in use after reload",
  );
  await shot("account-profile-dm-it");
  await role("player");
  await openAccount();
  await tab("Privacy");
  const dmRow = page.locator('[data-account-member="dm"]');
  check(
    (await dmRow.innerText()).includes("Marco il Custode"),
    "Member list without the new DM name",
  );
  check(
    (await dmRow.locator(".account-avatar svg").count()) === 1,
    "Member list without the DM emblem",
  );
  check(
    !(await dmRow.locator("[data-account-last-seen]").count()),
    "DM last access visible without consent",
  );
  await button("Inizio").click();
  await page.locator(".resume-scene").getByRole("button", { name: "Apri campagna" }).click();
  const sidebar = page.locator(".campaign-sidebar");
  await sidebar.getByRole("button", { name: "Diario", exact: true }).click();
  await page.locator(".campaign-row", { hasText: "Marco il Custode" }).first().waitFor();
  await openCampaignSection(page, "campaign-members"); // B62: folded group
  const b13Row = page.locator(".cm-member", { hasText: "Marco il Custode" }).first();
  await b13Row.waitFor();
  check(
    (await b13Row.locator(".cm-avatar.account-avatar-in svg").count()) === 1,
    "B13 member list does not draw the DM emblem",
  );
  check(
    (await b13Row.innerText()).includes("Ultimo accesso non condiviso"),
    "B13 member list shows the DM last access without consent",
  );
  await shot("account-b13-members-player-it");
  // Chat (B17) at the Table: the DM's out-of-character message carries name and emblem.
  await page.evaluate(() => (location.hash = "#table"));
  await page.locator("#battle-map").waitFor();
  if (await page.evaluate(() => !document.querySelector("[data-chat-text]"))) await toggleLog(page);
  const dmLine = page.locator(".chat-head", { hasText: "Marco il Custode" }).first();
  await dmLine.waitFor();
  check(
    (await dmLine.locator(".chat-avatar.account-avatar-in svg").count()) === 1,
    "Chat does not draw the DM emblem",
  );
  await page.locator("[data-chat-text]").fill("/ooc Arrivo al ponte");
  await page.locator("[data-chat-send]").click();
  await page.locator(".chat-head", { hasText: "Giocatore" }).last().waitFor();
  await shot("account-chat-player-it");
  const stream = await page.locator('[data-ext-slot="table-panel:log"]').innerText();
  check(
    !/DM · (Nome visualizzato|Avatar|Eliminazione)/.test(stream),
    "The DM's account changes appear in the player's log/chat",
  );
  passed.push(
    "Acceptance 1: DM name (Enter, guarded) and Spada/Viola emblem saved and kept on reload; the player sees name and emblem in the account member list, as journal author, in the B13 member list and on the DM's chat message (B17)",
  );

  // 3. Acceptance (5): last access to the campaign visible only after consent, the same
  // value in the account and in the B13 member list; correction by turning it off.
  await role("dm");
  await openAccount();
  await tab("Privacy");
  check(
    !(await page.locator("[data-account-lastseen]").isChecked()),
    "Last access sharing not off by default",
  );
  await page.getByText("Mostra il mio ultimo accesso ai membri delle mie campagne").click();
  await toast(/ora vedono il tuo ultimo accesso/);
  data = await stored();
  check(data.ext.account.profiles.dm.privacy.showLastSeen === true, "Consent not saved");
  const campaignAccess = data.ext["campaign-members"].campaigns.lanterns.lastAccess.dm;
  await role("player");
  await openAccount();
  await tab("Privacy");
  const shared = page.locator('[data-account-member="dm"] [data-account-last-seen]');
  check((await shared.count()) === 1, "Consented last access not visible to the player");
  const expected = await page.evaluate(
    (value) =>
      new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value),
      ),
    campaignAccess,
  );
  check(
    (await shared.innerText()).includes(expected),
    `Account shows another last access than B13 (${expected}): ${await shared.innerText()}`,
  );
  await shot("account-privacy-player-it");
  await openCampaignMembers();
  check(
    !(
      await page.locator(".cm-member", { hasText: "Marco il Custode" }).first().innerText()
    ).includes("non condiviso"),
    "B13 member list still hides the consented last access",
  );
  await role("dm");
  await openAccount();
  await tab("Privacy");
  await page.locator("[data-account-lastseen]").click();
  await toast(/ora è nascosto/);
  await role("player");
  await openAccount();
  await tab("Privacy");
  check(
    !(await page.locator('[data-account-member="dm"] [data-account-last-seen]').count()),
    "Last access still visible after withdrawing consent",
  );
  // Alchemy Profile → Safety (SVC-073): the personal safety profile of B27.
  await page.locator("[data-account-safety]").click();
  await page.waitForFunction(() => location.hash === "#safety-profile");
  await page.locator("#content h1").first().waitFor();
  passed.push(
    "Acceptance 5: last access hidden by default, shown to the player after the DM opts in with the same timestamp B13 records, hidden again after opting out; Privacy links to the personal safety profile (B27)",
  );

  // 4. Acceptance (2) and the sign-in gate: methods are a demonstration, Discord is a
  // linked service; signing out closes the app for that identity until it signs in.
  await openAccount();
  await tab("Accesso e servizi");
  const methods = page.locator("[data-account-method]");
  check(
    (await methods.allInnerTexts()).join("|").includes("g•••@example.test"),
    "Masked example address missing",
  );
  check(
    !(await page.locator('[data-account-method="discord"]').count()),
    "Discord listed as a sign-in method",
  );
  check(
    (await page.locator('[data-account-service="discord"]').innerText()).includes(
      "Non serve per accedere",
    ),
    "Discord not described as non-login",
  );
  await button("Aggiungi Apple").click();
  check(
    (await page.locator("#dialog").innerText()).includes("nessuna credenziale viene chiesta"),
    "Simulation notice missing",
  );
  await button("Aggiungi metodo").click();
  await page.locator('[data-account-method="apple"]').waitFor();
  await page.locator('[data-account-method="google"] button').click();
  await page.locator("#dialog").getByRole("button", { name: "Rimuovi", exact: true }).click();
  await page.locator('[data-account-method="google"]').waitFor({ state: "detached" });
  await page.locator('[data-account-link="discord"]').click();
  check(
    (await page.locator("#dialog").innerText()).includes("solo nome utente e ID"),
    "Requested Discord data not shown",
  );
  await page.locator("#dialog [name=handle]").fill("Nome Con Spazi");
  await button("Autorizza (simulato)").click();
  await toast(/non valido/);
  check(await page.locator("#dialog").isVisible(), "Invalid handle closed the dialog");
  await page.locator("#dialog [name=handle]").fill("giocatore_d20");
  await button("Autorizza (simulato)").click();
  await page.locator('[data-account-unlink="discord"]').waitFor();
  await shot("account-access-player-it");
  // Offline, signing out is refused: there would be no way back in.
  await setOffline(true);
  await page.locator("[data-account-signout]").click();
  await toast(/per rientrare serve la rete/);
  check(
    (await stored()).ext.account.profiles.player.session === "account",
    "Offline sign-out applied",
  );
  await setOffline(false);
  check((await page.locator(".table-return").count()) === 1, "Table strip missing before");
  // DDB: "Sign out" in the avatar menu.
  await page.locator('.service-nav [data-service="account"]').click();
  await page.locator("#dialog [data-account-menu-signout]").click();
  await signInScreen();
  await toast(/Sei uscito/);
  check(
    (await page.locator("#content").innerText()).includes(
      "la ricerca, le notifiche e i comandi restano chiusi",
    ),
    "The sign-in screen does not say what stays closed",
  );
  // The access gate (review P2): nothing of this identity is reachable from the header,
  // the palette's keys or the Table strip; nothing is written.
  check(!(await page.locator(".table-return").count()), '"Torna al Tavolo" still offered');
  const before = JSON.stringify(await stored());
  await page.locator('.service-nav [data-service="search"]').click();
  await toast(/Accedi per continuare/);
  check(!(await dialogOpen()), "Search opened while signed out");
  // Evidence with the refusal toast visible.
  await page.screenshot({ path: dir + "account-gate-search-refused-it.png" });
  await page.locator('.service-nav [data-service="requests"]').click();
  await toast(/Accedi per continuare/);
  check(!(await dialogOpen()), "The bell opened while signed out");
  check(
    !(await page.locator('.service-nav [data-service="requests"] .ext-count').count()),
    "The bell counts notifications while signed out",
  );
  await page.locator("#content h1").focus();
  await page.keyboard.press("Control+k");
  await page.keyboard.press("n");
  await page.waitForTimeout(150);
  check(!(await dialogOpen()), "Palette or quick create opened by keys while signed out");
  check(JSON.stringify(await stored()) === before, "Something was written while signed out");
  // This device's preferences stay (the way back online).
  await button("Preferenze").click();
  await page.locator("#dialog [name=offline]").waitFor();
  await page.keyboard.press("Escape");
  check(
    !(await page.locator("[data-account-heading-name]").count()),
    "The sign-in screen shows the account's identity",
  );
  check(
    !(await page.locator('[data-account-signin="discord"]').count()),
    "Discord offered as a login",
  );
  // P1 IN-10 (DDB Quickbuilder without login, the Forge sandbox): the signed-out screen
  // offers one explicit trial on the sample campaign, whose data stays on this device.
  check(
    (await page.locator("[data-account-trial] [data-account-trial-start]").count()) === 1 &&
      (await page.locator("[data-account-trial]").innerText()).includes("su questo dispositivo"),
    "The trial without an account is not offered on the sign-in screen",
  );
  // Another page (navigation, then a typed address) shows the sign-in page instead.
  await page.locator('.app-header [data-nav="characters"]').click();
  await page.waitForFunction(() => location.hash === "#characters");
  await signInScreen();
  await page.evaluate(() => (location.hash = "#characters?id=livia"));
  await page.waitForFunction(() => location.hash === "#characters?id=livia");
  await signInScreen();
  check(!(await content()).includes("Scheda controllata da te"), "Sheet reachable signed out");
  check(!(await content()).includes("Livia"), "Sheet content rendered while signed out");
  await role("dm");
  await page.getByRole("heading", { name: "Account e profilo", level: 1 }).waitFor();
  check(
    (await page.locator("[data-account-heading-name]").count()) === 1,
    "The DM, still signed in, lost the account page",
  );
  await role("player");
  await signInScreen();
  await shot("account-signin-it");
  await setOffline(true);
  await page.locator('[data-account-signin="apple"]').click();
  await toast(/per accedere serve la connessione/);
  await setOffline(false);
  await page.locator('[data-account-signin="google"]').click();
  await toast(/Nessun account con Google/);
  const lastSeenBefore = (await stored()).ext.account.profiles.player.lastSeenAt;
  await page.locator('[data-account-signin="apple"]').click();
  await page.waitForFunction(() => location.hash.startsWith("#characters?id=livia"));
  await page.locator("#content").getByText("Livia").first().waitFor();
  data = await stored();
  check(data.ext.account.profiles.player.session === "account", "Apple sign-in failed");
  check(data.ext.account.profiles.player.lastSeenAt > lastSeenBefore, "Last sign-in not updated");
  check(
    data.log
      .filter((l) => /Metodo|Discord|Accesso|Uscita/.test(l.label))
      .every((l) => l.visibility === "private"),
    "Account events leaked to the shared log",
  );
  passed.push(
    'Acceptance 2 and access gate: methods listed as demonstration (add Apple, remove Google), Discord linked with requested data and never a login; offline sign-out and sign-in refused with the reason; "Esci" from the header menu; signed out, search, bell, Mod+K and N refused with the reason, no bell count, no Table strip, nothing written, Preferences kept; Personaggi and a typed sheet address show the sign-in page while the DM stays signed in; Apple returns the player to Livia\'s sheet',
  );

  // 5. Acceptance (3): export only one's own data, as one sees it. The DM applies a
  // condition to Livia with a private stated cause; the player's file never carries it.
  await role("dm");
  await page.evaluate(() => (location.hash = "#characters?id=livia"));
  await button("Danni, cure e condizioni").click();
  const conditionsDialog = page.locator("#dialog");
  await conditionsDialog.locator("[data-conditions-add]").click();
  await conditionsDialog.locator('[data-conditions-definition="poisoned"]').click();
  await conditionsDialog
    .locator('[data-conditions-field="originLabel"]')
    .fill("Veleno segreto di Oswin");
  await conditionsDialog.locator('[data-conditions-field="sourcePrivate"]').check();
  await conditionsDialog.locator("[data-conditions-preview]").click();
  await conditionsDialog.getByRole("button", { name: "Applica", exact: true }).click();
  await page.waitForFunction(
    (k) =>
      JSON.parse(localStorage.getItem(k)).actors.livia.conditions?.some(
        (c) => c.id === "poisoned" || c.conditionId === "poisoned",
      ),
    key,
  );
  await page.keyboard.press("Escape");
  check(
    JSON.stringify((await stored()).actors.livia.conditions).includes("Veleno segreto di Oswin"),
    "The DM's private cause was not recorded on the sheet",
  );
  await button("Appunti personali").click();
  await page.locator('[data-campaign-new="note"]').click();
  await page.locator('[data-campaign-path="data.title"]').fill("Segreto del DM");
  await page
    .locator('[data-campaign-path="data.body"]')
    .fill("Il cartografo lavora per la Gilda. Testo sintetico.");
  await page.locator("[data-campaign-save]").click();
  await page.locator("[data-campaign-apply]").click();
  await page.getByRole("heading", { name: "Segreto del DM", level: 1 }).waitFor();
  await role("player");
  await button("Appunti personali").click();
  await page.locator('[data-campaign-new="note"]').click();
  await page.locator('[data-campaign-path="data.title"]').fill("Promemoria di Livia");
  await page
    .locator('[data-campaign-path="data.body"]')
    .fill("Chiedere a Doran del faro. Testo sintetico.");
  await page.locator("[data-campaign-save]").click();
  await page.locator("[data-campaign-apply]").click();
  await page.getByRole("heading", { name: "Promemoria di Livia", level: 1 }).waitFor();
  await openAccount();
  await tab("I miei dati");
  check(
    (await page.locator(".account-summary").innerText()).includes("Livia, Mira"),
    "Export summary without own characters",
  );
  const downloadWait = page.waitForEvent("download");
  await page.locator("[data-account-export]").click();
  const download = await downloadWait;
  check(
    /^d20-studio-dati-personali-player-\d{4}-\d{2}-\d{2}\.json$/.test(download.suggestedFilename()),
    "Export file name: " + download.suggestedFilename(),
  );
  await download.saveAs(dir + "account-export-player.json");
  const exported = JSON.parse(await readDownload(download));
  const text = JSON.stringify(exported);
  check(
    exported.format === "d20-studio-personal-data" && exported.identity === "player",
    "Export header",
  );
  // Own sheets only: Livia and Mira in the campaign, Iria personal (B21's example).
  const own = Object.values((await stored()).actors)
    .filter((a) => a.owner === "player" && (a.kind === "character" || a.companion))
    .map((a) => a.id);
  check(
    exported.characters.map((c) => c.id).join() === own.join() &&
      ["livia", "mira", "iria"].every((id) => own.includes(id)),
    "Export characters: " + exported.characters.map((c) => c.id),
  );
  check(
    exported.characters.find((c) => c.id === "iria")?.visibility === "private",
    "Personal sheet Iria missing from the export",
  );
  const poisoned = exported.characters[0].conditions.instances.find((i) => i.id === "poisoned");
  check(
    poisoned && poisoned.sourceHidden === true && poisoned.origin === null,
    "Visible condition missing or with its private origin: " + JSON.stringify(poisoned),
  );
  check(text.includes("Chiedere a Doran del faro"), "Own private note missing from export");
  for (const foreign of [
    "Veleno segreto di Oswin",
    "cartografo",
    "Segreto del DM",
    "dm@example.test",
    "custode_bruma",
  ])
    check(!text.includes(foreign), "Export leaks " + foreign);
  await toast(/File scaricato/);
  passed.push(
    'Acceptance 3: the DM applies Avvelenato to Livia with the private cause "Veleno segreto di Oswin"; the player\'s export has Livia, Mira, the personal sheet Iria, the player note and Avvelenato with hidden origin, never the cause, the DM note, e-mail or Discord',
  );

  // 6. Acceptance (4): deletion of an account that owns two campaigns (one created with
  // B13 and parked), identity check, typed confirmation, recovery window, bell, Home,
  // offline refusal, cancellation.
  await role("dm");
  await page.evaluate(() => (location.hash = "#campaigns"));
  await page.getByRole("heading", { name: "Campagne", level: 1 }).waitFor();
  await page.locator('.page-heading [data-cm="create"]').click();
  await page.locator("#dialog [name=name]").fill("La torre di sale");
  await page.locator("#dialog").getByRole("button", { name: "Crea campagna", exact: true }).click();
  await page.waitForURL(/#campaigns\?id=campaign-/);
  await openAccount();
  await tab("I miei dati");
  check(
    (await page.locator("[data-account-export-scope]").innerText()).includes(
      "preparazione delle tue campagne",
    ),
    "DM export note still speaks of 'the DM's preparation'",
  );
  // The DM's own safety profile (B27: one line, one veil) is part of the export.
  check(
    /Linee e veli \(sicurezza\)\s*2/.test(await page.locator(".account-summary").innerText()),
    "Safety profile not counted in the export summary",
  );
  await button("Elimina account…").click();
  const dialogText = await page.locator("#dialog").innerText();
  for (const expected of [
    "«Le lanterne di Bruma»: la guidi come DM; la proprietà, con PNG, scene e preparazione, viene proposta",
    "«La torre di sale»: nessun altro membro a cui trasferirla",
    "Doran: resta nella campagna senza proprietario; il nuovo DM può riassegnarla",
    "1 appunto «Solo io»",
    "scollegato Discord",
    "Hai 30 giorni per annullare",
    "Conferma la tua identità con",
  ])
    check(dialogText.includes(expected), "Consequence missing: " + expected);
  check(
    (await page.locator('#dialog select[name^="transfer:"]').count()) === 1,
    "Unexpected transfer choices",
  );
  // R20-207: the irreversible request is drawn as a danger action, not the gold primary.
  check(
    await page.evaluate(() => {
      const b = document.querySelector('#dialog footer button[type="submit"]');
      return b?.classList.contains("danger") && !b.classList.contains("primary");
    }),
    "The final delete button is not danger-styled",
  );
  await shot("account-delete-dialog-it");
  const dialogError = page.locator("#dialog .dialog-error");
  await button("Elimina account").click();
  await dialogError.waitFor();
  check((await dialogError.innerText()).includes("conseguenze"), "Missing acknowledgement");
  await page.locator("#dialog").getByText("Ho letto le conseguenze").click();
  await page.locator('#dialog select[name="transfer:lanterns"]').selectOption("player");
  await page.locator("#dialog [data-account-typed]").fill("ELIMINA ACCOUNT");
  await button("Elimina account").click();
  await page.waitForFunction(() =>
    /identità/.test(document.querySelector("#dialog .dialog-error")?.textContent ?? ""),
  );
  await page.locator("#dialog [data-account-confirm-with]").selectOption("email");
  await page.locator("#dialog [data-account-typed]").fill("elimina");
  await button("Elimina account").click();
  await page.waitForFunction(() =>
    /ELIMINA ACCOUNT/.test(document.querySelector("#dialog .dialog-error")?.textContent ?? ""),
  );
  check(
    !(await stored()).ext.account.profiles.dm.deletion,
    "An invalid request scheduled a deletion",
  );
  await page.locator("#dialog [data-account-typed]").fill("ELIMINA ACCOUNT");
  await button("Elimina account").click();
  await toast(/Eliminazione programmata.*La proposta di trasferimento è arrivata al nuovo DM/);
  data = await stored();
  const deletion = data.ext.account.profiles.dm.deletion;
  check(
    deletion &&
      Math.round(
        (Date.parse(deletion.recoverUntil) - Date.parse(deletion.requestedAt)) / 86400000,
      ) === 30,
    "Recovery window not 30 days",
  );
  check(deletion.transfers.lanterns === "player", "Transfer not recorded");
  // The transfer is B13's own ownership offer, pending until the player answers.
  const offer = data.ext["campaign-members"].campaigns.lanterns.transfer;
  check(
    offer?.status === "pending" &&
      offer.from === "dm" &&
      offer.to === "player" &&
      deletion.offers.lanterns.id === offer.id,
    "No B13 transfer offer: " + JSON.stringify(offer),
  );
  check(
    (await page.locator('[data-account-transfer="lanterns"]').innerText()).includes(
      "proposta in attesa di risposta",
    ),
    "The pending panel does not show the offer's state",
  );
  check(deletion.confirmedWith === "email", "Identity check not recorded");
  check(
    data.campaign.members.find((m) => m.id === "dm").role === "dm" && data.actors.doran,
    "Deletion changed campaign data before the window ended",
  );
  await page.reload();
  await role("dm");
  await page.locator("[data-account-pending]").waitFor();
  await button("Inizio").click();
  await page.locator('[data-account-home="deletion"]').waitFor();
  await shot("account-home-deletion-it");
  await page.locator('.service-nav [data-service="requests"]').click();
  await page.waitForFunction(() =>
    /Eliminazione dell’account programmata/.test(
      document.querySelector("#dialog [data-notifications-centre]")?.textContent ?? "",
    ),
  );
  await shot("account-bell-deletion-it");
  await page.keyboard.press("Escape");
  // The chosen new DM is told in the bell and finds the offer in Campaigns (B13).
  await role("player");
  await page.locator('.service-nav [data-service="requests"]').click();
  await page.waitForFunction(() =>
    /Proprietà proposta · Le lanterne di Bruma/.test(
      document.querySelector("#dialog [data-notifications-centre]")?.textContent ?? "",
    ),
  );
  await shot("account-transfer-offer-player-it");
  await page.keyboard.press("Escape");
  await role("dm");
  await button("Inizio").click();
  await page.locator('[data-account-home="deletion"]').waitFor();
  await setOffline(true);
  await page.locator('[data-account-home="deletion"] [data-account-cancel-deletion]').click();
  await toast(/senza rete/);
  check((await stored()).ext.account.profiles.dm.deletion, "Offline cancel changed state");
  await setOffline(false);
  await page
    .locator('[data-account-home="deletion"]')
    .getByRole("button", { name: "Vedi dettagli" })
    .click();
  await page.locator("[data-account-pending]").waitFor();
  await shot("account-deletion-pending-it");
  await page.locator("[data-account-pending] [data-account-cancel-deletion]").click();
  await toast(/Eliminazione annullata.*La proposta di trasferimento è stata revocata/);
  check(!(await stored()).ext.account.profiles.dm.deletion, "Cancellation not saved");
  check(
    (await stored()).ext["campaign-members"].campaigns.lanterns.transfer.status === "revoked",
    "The offer was not revoked with the cancellation",
  );
  check(await focusedHas("data-account-delete"), "Focus not returned to the delete control");
  passed.push(
    "Acceptance 4: both DM campaigns listed (Le lanterne di Bruma offered through B13, the parked La torre di sale deleted with the account), Doran for the new DM, danger-styled final button, identity check and typed ELIMINA ACCOUNT refused in place, 30-day window kept across reload, notice in the requester's bell and Home, the offer in the player's bell (\"Proprietà proposta\"), offline refusal, cancellation that revokes the offer",
  );

  // 7. Corrections: name history restore and avatar delete/restore; gameplay Undo on the
  // Table leaves the account untouched.
  await tab("Profilo");
  await page.locator("[data-account-restore-name]").first().click();
  await toast(/Nome precedente ripristinato/);
  check(
    (await stored()).campaign.members.find((m) => m.id === "dm").name === "DM",
    "Restore did not bring back DM",
  );
  await page.locator("[data-account-restore-name]").first().click();
  await toast(/Nome precedente ripristinato/);
  check(
    (await stored()).campaign.members.find((m) => m.id === "dm").name === "Marco il Custode",
    "Second restore failed",
  );
  const emblemId = (await stored()).ext.account.profiles.dm.activeAvatarId;
  await page.locator(`[data-account-remove-avatar="${emblemId}"]`).click();
  await page.locator(".account-undo").waitFor();
  check(
    (await stored()).ext.account.profiles.dm.activeAvatarId === "initials",
    "Deleted avatar still in use",
  );
  await page.locator("[data-account-restore-avatar]").click();
  await page.locator(".account-undo").waitFor({ state: "detached" });
  check(
    (await stored()).ext.account.profiles.dm.activeAvatarId === emblemId,
    "Restored avatar not in use",
  );
  await button("Inizio").click();
  await button("Entra al Tavolo").click();
  await page.locator("#battle-map").waitFor();
  const accountBefore = JSON.stringify((await stored()).ext.account);
  const undo = page.getByRole("button", { name: "Annulla ultima modifica" });
  if (await undo.count()) {
    await undo.click();
    await page.waitForTimeout(200);
  }
  check(
    JSON.stringify((await stored()).ext.account) === accountBefore,
    "Gameplay Undo changed account data",
  );
  // Signing out at the Table with an area tool active: the tool is torn down (no refusal),
  // the sign-in page replaces the Table, and signing in brings the Table back.
  // B61: Measure stands in the "Misura e sagome" toolbar group: open the group, then pick it.
  if (!(await page.locator('button.map-tool[data-tool="measure"]').isVisible()))
    await page.locator('[data-tool-group="measure"]').click();
  await page.locator('button.map-tool[data-tool="measure"]').click();
  await page.locator('.service-nav [data-service="account"]').click();
  await page.locator("#dialog [data-account-menu-signout]").click();
  await signInScreen();
  await toast(/Sei uscito/);
  check(
    (await page.evaluate(() => location.hash)) === "#table" &&
      !(await page.locator(".app-header.table-header").count()) &&
      !(await page.locator("#battle-map").count()),
    "The Table stayed visible after signing out",
  );
  await page.locator('[data-account-signin="email"]').click();
  await page.locator("#battle-map").waitFor();
  passed.push(
    "Corrections: name restored twice from history, avatar deleted and restored; gameplay Undo leaves account data alone; signing out at the Table with the measure tool active shows the sign-in page there and signing in brings the Table back",
  );

  // 8. Avatar upload errors and a real image (player); the DM sees the image in B13.
  await role("player");
  await openAccount();
  const upload = page.locator("[data-account-upload]");
  await upload.setInputFiles(dir + "notes-fixture.txt");
  await page.locator("[data-account-upload-error]").waitFor();
  check(
    (await page.locator("[data-account-upload-error]").innerText()).includes(
      "Formato non supportato",
    ),
    "Wrong type accepted",
  );
  await page.locator("[data-account-upload]").setInputFiles(dir + "big-fixture.png");
  await page.waitForFunction(() =>
    /troppo grande/.test(document.querySelector("[data-account-upload-error]")?.textContent ?? ""),
  );
  await page.locator("[data-account-upload]").setInputFiles(dir + "broken-fixture.png");
  await page.waitForFunction(() =>
    /illeggibile/.test(document.querySelector("[data-account-upload-error]")?.textContent ?? ""),
  );
  await page.locator("[data-account-upload]").setInputFiles(dir + "avatar-fixture.png");
  await toast(/Immagine caricata/);
  data = await stored();
  const playerProfile = data.ext.account.profiles.player;
  const image = playerProfile.avatars.find((a) => a.id === playerProfile.activeAvatarId);
  check(
    image.kind === "image" &&
      /^data:image\/(webp|png);base64,/.test(image.src) &&
      image.src.length < 40000,
    "Uploaded avatar not small: " + image.src?.slice(0, 30) + " " + image.src?.length,
  );
  check((await page.locator(".account-identity img").count()) === 1, "Uploaded image not shown");
  await shot("account-profile-player-image-it");
  check(await noOverflow(), "Horizontal overflow at 1440");
  await role("dm");
  await openCampaignMembers();
  check(
    (await page
      .locator(".cm-member", { hasText: "Giocatore" })
      .first()
      .locator(".cm-avatar.account-avatar-in.is-image img")
      .count()) === 1,
    "B13 member list does not show the player's image to the DM",
  );
  passed.push(
    "Upload: text, 2.6 MB and broken files refused with readable errors; a real PNG becomes a small cropped image avatar that the DM sees in the B13 member list",
  );

  // 9. EN phone 390 with touch in its own context.
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    acceptDownloads: true,
  });
  const mobile = await phone.newPage();
  mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
  await mobile.goto(base);
  await mobile.getByRole("heading", { name: "La prossima avventura", level: 1 }).waitFor();
  await mobile.locator('.service-nav [data-service="preferences"]').tap();
  await mobile.locator("#dialog [name=lang]").selectOption("en");
  await mobile.getByRole("button", { name: "Salva preferenze", exact: true }).tap();
  await mobile.locator('.service-nav [data-service="account"]').tap();
  const menuTargets = await mobile.evaluate(() =>
    [...document.querySelectorAll("#dialog .account-menu button")].map((b) => [
      b.textContent.trim(),
      Math.round(b.getBoundingClientRect().height),
    ]),
  );
  check(
    menuTargets.length === 5 && menuTargets.every(([, h]) => h >= 40),
    "Account menu targets on the phone: " + JSON.stringify(menuTargets),
  );
  await mobile.locator('#dialog [data-account-menu="profile"]').tap();
  await mobile.getByRole("heading", { name: "Account and profile", level: 1 }).waitFor();
  check(
    (await mobile.locator("[data-account-heading-name]").innerText()) === "Player",
    "English name not split: " + (await mobile.locator("[data-account-heading-name]").innerText()),
  );
  const phoneOverflow = () =>
    mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  const small = () =>
    mobile.evaluate(() =>
      [
        ...document.querySelectorAll(
          "#content button, #content .account-upload, #content input[type=checkbox]",
        ),
      ]
        .filter((el) => el.offsetParent !== null)
        .map((el) => {
          const target = el.matches("input[type=checkbox]") ? el.closest("label") : el;
          const r = target.getBoundingClientRect();
          return [
            el.textContent.trim().slice(0, 24) || el.outerHTML.slice(0, 40),
            Math.round(r.width),
            Math.round(r.height),
          ];
        })
        .filter(([, w, h]) => w < 40 || h < 40),
    );
  check(await phoneOverflow(), "Phone overflow on Profile");
  check((await small()).length === 0, "Small targets on Profile: " + JSON.stringify(await small()));
  await mobile.locator("[data-account-emblem]").tap();
  await mobile.locator("#dialog").getByText("Book", { exact: true }).tap();
  await mobile.locator("#dialog").getByText("Sky", { exact: true }).tap();
  await mobile.getByRole("button", { name: "Add and use", exact: true }).tap();
  await mobile.waitForFunction(() =>
    /New avatar in use/.test(document.querySelector("#toast")?.textContent ?? ""),
  );
  const hideToast = () =>
    mobile.evaluate(() => document.querySelector("#toast")?.classList.remove("shown"));
  await hideToast();
  await mobile.screenshot({ path: dir + "account-profile-en-390.png", fullPage: true });
  for (const [name, heading] of [
    ["Sign-in and services", "Sign-in methods"],
    ["Privacy", "Last access"],
    ["My data", "Export my data"],
  ]) {
    await mobile.locator(".account-tabs").getByRole("button", { name, exact: true }).tap();
    await mobile.getByRole("heading", { name: heading, level: 2 }).waitFor();
    check(await phoneOverflow(), "Phone overflow on " + name);
    const tiny = await small();
    check(tiny.length === 0, "Small targets on " + name + ": " + JSON.stringify(tiny));
    await mobile.screenshot({
      path: dir + "account-" + heading.split(" ")[0].toLowerCase() + "-en-390.png",
      fullPage: true,
    });
  }
  await mobile.getByRole("button", { name: "Delete account…", exact: true }).tap();
  check(
    (await mobile.locator("#dialog").innerText()).includes("To confirm, type DELETE ACCOUNT"),
    "English typed phrase",
  );
  await mobile.locator("#dialog").getByText("I have read the consequences").tap();
  await mobile.locator("#dialog [data-account-confirm-with]").selectOption("google");
  await mobile.locator("#dialog [data-account-typed]").fill("ELIMINA ACCOUNT");
  await mobile.getByRole("button", { name: "Delete account", exact: true }).tap();
  await mobile.waitForFunction(() =>
    /DELETE ACCOUNT/.test(document.querySelector("#dialog .dialog-error")?.textContent ?? ""),
  );
  await mobile.screenshot({ path: dir + "account-delete-en-390.png" });
  await mobile.keyboard.press("Escape");
  check(
    !(await mobile.evaluate(
      () =>
        JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")).ext.account.profiles.player
          .deletion,
    )),
    "Escape scheduled a deletion",
  );
  await mobile.locator("[data-account-signout]").tap();
  await mobile.getByRole("heading", { name: "Sign in to d20 Studio", level: 2 }).waitFor();
  check(await phoneOverflow(), "Phone overflow on the sign-in screen");
  await hideToast();
  await mobile.screenshot({ path: dir + "account-sign-in-en-390.png", fullPage: true });
  await phone.close();
  passed.push(
    'EN phone 390 touch: header tap opens the account menu (five ≥40 px items), "Player" (split name), emblem added, four tabs without overflow and with ≥40 px targets, English typed phrase enforced after the identity check, Escape discards, "Sign out" leads to the sign-in screen',
  );

  check(errors.length === 0, "Page errors: " + errors.join("; "));
  await context.close();
  return { passed, notes, errors };
};
