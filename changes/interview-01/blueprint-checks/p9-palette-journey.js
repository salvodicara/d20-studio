async (page) => {
  // P9 search and quick create (SV-02, SV-03, SV-04, CA-11): synonyms of every package,
  // grouped results, a removable category chip, Quick Insert while writing, quick create
  // with «Apri», the Table's quick jot; IT and EN, desktop and phone 390×844 by touch.
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P9/";
  const passed = [], errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => { if (!value) throw Error(message); };
  const button = (name, root = page) => root.getByRole("button", { name, exact: true });
  const as = async (role) => { await page.locator("#demo-role").selectOption(role); await page.waitForTimeout(150); };
  const mod = await page.evaluate(() => (/Mac|iPhone|iPad/.test(navigator.platform) ? "Meta" : "Control"));
  const palette = async () => {
    await page.keyboard.press(`${mod}+k`);
    await page.locator("#dialog [data-cmdk-input]").waitFor();
  };
  const search = async (text) => {
    await page.locator("#dialog [data-cmdk-input]").fill(text);
    await page.waitForTimeout(120);
    return page.locator("#dialog [data-cmdk-list]").innerText();
  };
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:8879/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await as("dm");
  await page.goto("http://127.0.0.1:8879/#campaign?tab=overview");
  await palette();
  const expect = {
    PE: "Assegna PE e monete",
    permessi: "Chi legge e chi modifica questa voce",
    promemoria: "Promemoria delle sessioni",
    cronologia: "Cronologia della voce",
    tema: "tema chiaro o scuro",
    daltonismo: "daltonismo",
    lingua: "lingua dell’interfaccia",
    api: "Crea un token API",
    ical: "Aggiungi la prossima sessione al calendario",
  };
  for (const [query, wanted] of Object.entries(expect)) {
    const list = await search(query);
    const commands = list.split("\n");
    const first = commands.slice(0, 8).join(" | ");
    check(first.includes(wanted), `«${query}» does not return «${wanted}» near the top: ${first}`);
  }
  const typo = await search("ical");
  check(!/Colpo critico|Critical hit/.test(typo), "«ical» still drifts to «Colpo critico»");
  check(!/Stocco/.test(await search("api")), "«api» still drifts to «Stocco»");
  await search("palla di fuoco");
  const groups = await page.locator("#dialog .cmdk-group").allInnerTexts();
  check(groups[0].toLowerCase() === "corrispondenza esatta", "Exact match not first: " + groups.join(", "));
  check(groups.length >= 2, "Results not grouped by type");
  await page.locator("#dialog").screenshot({ path: shots + "p01-palette-grouped.png" });
  passed.push("Palette finds «PE», «permessi», «promemoria», «cronologia», «tema», «daltonismo», «lingua», «api», «ical»; results grouped, exact match first; no drift for «ical»/«api»");

  // A category is a removable chip and never sticky.
  await search("@incantesimi fuoco");
  const chip = page.locator("#dialog [data-cmdk-chip]");
  check(await chip.isVisible(), "Category chip missing");
  await chip.click();
  check(!(await chip.count()), "Chip not removed");
  await page.keyboard.press("Escape");
  await palette();
  check(!(await page.locator("#dialog [data-cmdk-chip]").count()), "Category was sticky");
  await page.keyboard.press("Escape");
  passed.push("The category is a chip removed with ×, not remembered at the next opening");

  // Quick Insert: ⌘K while writing inserts a link, no navigation.
  await page.goto("http://127.0.0.1:8879/#campaign?tab=journal");
  await button("Nuovo resoconto").click();
  const body = page.locator('#content [data-campaign-path="data.body"]');
  await body.click();
  await page.keyboard.type("Abbiamo incontrato ");
  await palette();
  check(await page.locator("#dialog [data-cmdk-insert-note]").isVisible(), "Insert mode not announced");
  await search("Maestro Oben");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  check((await body.inputValue()) === "Abbiamo incontrato [[Maestro Oben]]", "Quick Insert did not insert: " + (await body.inputValue()));
  check(page.url().includes("tab=edit"), "Quick Insert navigated away");
  passed.push("⌘K while writing inserts [[Maestro Oben]] at the cursor and stays in the editor");
  await button("Scarta bozza").click();
  await page.locator("#dialog").getByRole("button", { name: "Scarta bozza", exact: true }).click();

  // Quick create: every type, «Apri» in the notice.
  await page.goto("http://127.0.0.1:8879/#campaign?tab=overview");
  await page.keyboard.press("n");
  const create = page.locator("#dialog [data-cmdk-create-form]");
  await create.waitFor();
  for (const kind of ["Negozio", "Evento", "Elenco", "Oggetto", "Mostro", "Incantesimo", "Sessione", "Personaggio", "Materiale (handout)"])
    check(await create.getByText(kind, { exact: true }).isVisible(), "Quick create lacks " + kind);
  await create.getByText("Negozio", { exact: true }).click();
  await page.locator("#dialog [name=title]").fill("Bottega delle lanterne");
  await page.locator("#dialog").getByRole("button", { name: "Crea", exact: true }).click();
  const toast = page.locator(".ui-action-toast");
  await toast.waitFor();
  await button("Apri", toast).click();
  await page.getByRole("heading", { name: "Bottega delle lanterne", exact: true, level: 1 }).waitFor();
  check((await page.locator("#content").innerText()).includes("Negozio"), "The shop is not typed");
  passed.push("N offers every type (Negozio, Evento, Elenco, Oggetto, Mostro, Incantesimo, Sessione, Personaggio, Materiale); «Apri» opens the new entry");

  // CA-11: at the Table the notes icon opens the quick jot and stays; J does too.
  await as("player");
  await page.goto("http://127.0.0.1:8879/#table");
  await page.locator("#battle-map").waitFor();
  await page.locator('.service-nav [data-service="notes"]').click();
  await page.locator("#dialog").getByRole("heading", { name: "Appunto rapido" }).waitFor();
  await page.locator("#dialog [name=body]").fill("La sentinella zoppica dalla gamba destra.");
  await page.locator("#dialog").getByRole("button", { name: "Salva appunto", exact: true }).click();
  await page.waitForTimeout(200);
  check(page.url().includes("#table"), "The quick jot left the Table");
  check(await page.locator("#battle-map").isVisible(), "Map not visible after the jot");
  await page.keyboard.press("j");
  await page.locator("#dialog").getByRole("heading", { name: "Appunto rapido" }).waitFor();
  await page.keyboard.press("Escape");
  const notes = await page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")).campaignContent.entries.filter((e) => e.kind === "note").map((e) => e.revisions.at(-1).data.title));
  check(notes.includes("La sentinella zoppica dalla gamba destra."), "Jot not saved: " + notes);
  passed.push("At the Table «Appunti personali» (and J) opens the quick jot; the note is saved and the Table stays");

  // English.
  await page.locator('.service-nav [data-service="preferences"]').click();
  await page.locator("#dialog [name=lang]").selectOption("en");
  await page.locator("#dialog").getByRole("button", { name: "Salva preferenze", exact: true }).click();
  await page.waitForTimeout(200);
  await page.locator('.service-nav [data-service="notes"]').click();
  await page.locator("#dialog").getByRole("heading", { name: "Quick jot" }).waitFor();
  await page.keyboard.press("Escape");
  await palette();
  check((await search("theme")).includes("light or dark theme"), "EN settings command missing");
  check((await search("reminders")).includes("Session reminders"), "EN reminders missing");
  await page.keyboard.press("Escape");
  passed.push("English: Quick jot and settings/reminder commands");

  // Phone 390×844 by touch: palette from the header and the jot at the Table.
  const context = await page.context().browser().newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const phone = await context.newPage();
  phone.on("pageerror", (error) => errors.push("phone: " + error.message));
  await phone.goto("http://127.0.0.1:8879/#table");
  await phone.locator("#battle-map").waitFor();
  await phone.locator('.service-nav [data-service="search"]').tap();
  await phone.locator("#dialog [data-cmdk-input]").fill("promemoria");
  await phone.waitForTimeout(150);
  check((await phone.locator("#dialog [data-cmdk-list]").innerText()).includes("Promemoria delle sessioni"), "Phone palette misses reminders");
  const over = await phone.evaluate(() => document.querySelector("#dialog").getBoundingClientRect().right <= innerWidth + 1);
  check(over, "Palette wider than the phone");
  await phone.screenshot({ path: shots + "p02-palette-phone.png" });
  await phone.locator("#dialog [data-close]").last().tap();
  await phone.locator('.service-nav [data-service="notes"]').tap();
  await phone.locator("#dialog").getByRole("heading", { name: "Appunto rapido" }).waitFor();
  await phone.locator("#dialog [name=body]").fill("Nota dal telefono.");
  await phone.locator("#dialog").getByRole("button", { name: "Salva appunto", exact: true }).tap();
  await phone.waitForTimeout(200);
  check(phone.url().includes("#table"), "Phone jot left the Table");
  await phone.screenshot({ path: shots + "p03-jot-phone.png" });
  await context.close();
  passed.push("Phone 390×844 by touch: the palette finds «promemoria»; the notes icon opens the jot at the Table");
  check(errors.length === 0, "Runtime errors: " + errors.join("; "));
  return { passed, errors };
}
