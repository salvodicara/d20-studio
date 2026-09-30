async (page) => {
  // P8 fix journey (26/09/2026): Library, one-save homebrew editor, Library update equal to
  // the editor's apply, campaign homebrew revisions and automation, roll embeds in notes.
  // Synthetic demo data only; resets the example in this browser. Screenshots go to the
  // folder below (create it first).
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P8/";
  const errors = [],
    passed = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const button = (p, name) => p.getByRole("button", { name, exact: true });
  const saved = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const role = async (value) => {
    await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption(value);
    await page.waitForTimeout(250);
  };
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:8879/#library");
  await page.reload();
  await button(page, "Ripristina esempio").click();
  await button(page, "Ripristina").click();
  await role("player");

  // BI-01: one search in «Disponibili» reaches the SRD; the Campaign tab keeps its own filter.
  await page.goto("http://127.0.0.1:8879/#library?tab=available");
  await page.locator("[data-library-query]").fill("Dardo");
  await page.locator('[data-library-filter="origin"]').selectOption("");
  await page.locator("[data-library-search] button[type=submit]").click();
  await page.locator('[data-library-srd="srd2024:spell:fire-bolt"]').waitFor();
  await page.screenshot({ path: dir + "j01-disponibili-dardo.png" });
  await page.locator('[data-library-scope="campaign"]').click();
  await page.locator('[data-library-scope="campaign"][aria-current="page"]').waitFor();
  check((await page.locator("[data-library-query]").inputValue()) === "", "filter leaked into Campaign");
  passed.push("«Dardo» in Disponibili finds Dardo di fuoco (SRD); Campaign keeps its own search");

  // BI-15: a DM feat, created, shared and enabled with one «Salva»; the missing author named.
  await role("dm");
  await page.goto("http://127.0.0.1:8879/#library");
  await page.locator("[data-library-new]").click();
  await page.locator("#dialog [name=kind]").selectOption("feat");
  await button(page, "Crea bozza privata").click();
  await page.locator('[data-hbe-path="name.it"]').fill("Occhio di lince");
  await page.locator('[data-hbe-path="description.it"]').fill("Vedi lontano come una lince.");
  await page.locator('[data-hbe="save-content"]').click();
  await page.locator('[data-hbe-path="source.label"] ~ .hbe-field-error').waitFor();
  check(
    /autore o la fonte/.test(await page.locator(".hbe-field-error").first().innerText()),
    "missing author reason not beside the field",
  );
  await page.screenshot({ path: dir + "j02-autore-mancante.png" });
  await page.locator('[data-hbe-path="source.label"]').fill("Tavolo di Bruma");
  await page.locator('[data-hbe-publish="share"]').check();
  await page.locator('[data-hbe-publish="enable"]').check();
  await page.locator('[data-hbe="save-content"]').click();
  await page.locator("[data-hbe-detail]").waitFor();
  let state = await saved(page);
  const content = state.library.find((c) => c.revisions.at(-1).data.name.it === "Occhio di lince");
  const rev1 = content.revisions[0].id;
  check(content.accessByRevision[rev1].readers.includes("player"), "not shared by the save");
  check(state.campaign.enabledContent.some((r) => r.revisionId === rev1), "not enabled by the save");
  passed.push("DM feat created, shared and enabled with one Salva; «Autore o fonte» reason beside it");

  // BI-16: Livia gets rev. 1 from the Library, then rev. 2 through «Rivedi aggiornamento».
  await role("player");
  await page.goto(`http://127.0.0.1:8879/#library?id=${content.id}&revision=${rev1}&tab=available`);
  await page.locator("[data-library-actor]").selectOption("livia");
  await page.locator("[data-library-assign]").click();
  await page.locator("[data-library-apply]").click();
  await page.getByRole("heading", { name: "Livia", exact: true, level: 1 }).waitFor();
  await role("dm");
  await page.goto(`http://127.0.0.1:8879/#homebrew-editor?id=${content.id}&revision=${rev1}`);
  await page.locator('[data-hbe="revise"]').click();
  await page.locator('[data-hbe="subform"][data-subform="modifiers"]').click();
  await page.locator('[data-hbe="add-modifier"]').click();
  await page.locator('[data-hbe-path="structured.modifiers.0.target"]').selectOption("wis");
  await page.waitForTimeout(200);
  await page.locator('[data-hbe-path="structured.modifiers.0.value"]').fill("1");
  await page.locator('[data-hbe-path="structured.modifiers.0.value"]').blur();
  await page.locator('[data-hbe="subform"][data-subform="activities"]').click();
  await page.locator('[data-hbe="add-activity"]').click();
  await page.locator('[data-hbe-path="structured.activities.0.name.it"]').fill("Sguardo intimidatorio");
  await page.locator('[data-hbe="activity-tab"]', { hasText: "Effetto" }).click();
  await page.locator('[data-hbe-path="structured.activities.0.effect.conditionId"]').selectOption("frightened");
  await page.waitForTimeout(200);
  await page.locator('[data-hbe-publish="share"]').check();
  await page.locator('[data-hbe-publish="enable"]').check();
  await page.locator('[data-hbe="save-content"]').click();
  await page.locator("[data-hbe-detail]").waitFor();
  await role("player");
  await page.goto("http://127.0.0.1:8879/#characters?id=livia&tab=features");
  await page.locator("[data-hbe-update]").first().waitFor();
  check(/rev\. 1 → rev\. 2/.test(await page.locator("[data-hbe-update]").first().innerText()), "no update notice");
  await page.locator('[data-hbe="review-update"]').first().click();
  await page.locator("[data-library-update]").click();
  await page.locator('[data-library-diff-structured="modifiers"]').waitFor();
  const diff = await page.locator("[data-library-diff-structured]").allInnerTexts();
  check(diff.some((d) => /Saggezza: \+1/.test(d)), "diff lacks the modifier");
  check(diff.some((d) => /Sguardo intimidatorio/.test(d)), "diff lacks the activity");
  await page.screenshot({ path: dir + "j03-confronto-aggiornamento.png", fullPage: true });
  await page.locator("[data-library-apply]").click();
  await page.getByRole("heading", { name: "Livia", exact: true, level: 1 }).waitFor();
  state = await saved(page);
  const entry = state.ext["homebrew-editor"].sheets.livia.entries.find((e) => e.contentId === content.id);
  check(state.actors.livia.abilities.wis === 13, `Livia's Wisdom is ${state.actors.livia.abilities.wis}`);
  check(entry?.activities?.[0]?.name?.it === "Sguardo intimidatorio", "activity not on Livia");
  passed.push("Livia: rev. 2 through «Rivedi aggiornamento» → Saggezza 13 and «Sguardo intimidatorio»");

  // BI-28 / CA-72: the campaign table reads the revision in play and lists Livia's copy.
  await role("dm");
  await page.goto("http://127.0.0.1:8879/#campaign?tab=homebrew-editor");
  const row = await page.locator(`[data-hbe-campaign-row="${content.id}"]`).innerText();
  check(/Automazione completa/.test(row) && /Livia \(rev\. 2\)/.test(row), `campaign row: ${row}`);
  check(/Abilitata: rev\. 1, 2/.test(row), "enabled revisions not named");
  await page.locator(".hbe-campaign").scrollIntoViewIfNeeded();
  await page.screenshot({ path: dir + "j04-campagna-homebrew.png" });
  passed.push("Campaign Homebrew: rev. 2 · Automazione completa, Livia (rev. 2), «Abilitata: rev. 1, 2»");

  // CA-26 / BI-10: «Inserisci tiro» adds a damage roll; a random table rolls in the note.
  await page.goto("http://127.0.0.1:8879/#campaign?tab=world");
  await page.locator('[data-campaign-new="world"]').first().click();
  await page.locator('[data-campaign-path="data.title"]').fill("La trappola del faro");
  await page.locator('[data-campaign-path="data.body"]').fill("Una lastra scatta sotto i piedi.");
  await page.locator('[data-campaign-insert-roll="data.body"]').click();
  await page.locator("#dialog [data-embed-kind]").selectOption("damage");
  await page.locator("#dialog [name=dice]").fill("2d6");
  await page.locator("#dialog [name=type]").selectOption("fire");
  await button(page, "Inserisci").click();
  await page.locator('[data-campaign-insert-roll="data.body"]').click();
  await page.locator("#dialog [data-embed-kind]").selectOption("table");
  await page.locator("#dialog [name=table]").selectOption("lantern-rumours");
  await button(page, "Inserisci").click();
  check(
    (await page.locator('[data-campaign-path="data.body"]').inputValue()).includes("@Embed[damage:2d6:fire]"),
    "damage marker not inserted",
  );
  await page.locator("[data-campaign-save]").click();
  await page.waitForTimeout(300);
  await page.locator("[data-campaign-apply]").click();
  await page.locator('[data-text-embed="compendium-damage"]').waitFor();
  const before = (await saved(page)).log.length;
  await page.locator('[data-embed-draw="lantern-rumours"]').click();
  await page.locator('[data-text-embed="compendium-tables"] [data-compendium-last-roll]').waitFor();
  check((await saved(page)).log.length === before + 1, "table roll not in the log");
  check(/#campaign\?tab=entry/.test(page.url()), "the table roll left the note");
  await page.locator('[data-text-embed="compendium-damage"] [data-compendium-roll]').click();
  await button(page, "Registra tiro").click();
  await page.locator('[data-text-embed="compendium-damage"] [data-compendium-last-roll]').waitFor();
  await page.screenshot({ path: dir + "j05-tiri-nella-nota.png", fullPage: true });
  passed.push("Note: «Inserisci tiro» damage 2d6 fire rolls in place; the rumours table rolls in the note and the log");

  // Phone (touch), English: the roll picker and the rendered damage button.
  const context = await page
    .context()
    .browser()
    .newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const phone = await context.newPage();
  phone.on("pageerror", (error) => errors.push(`phone: ${error.message}`));
  await phone.goto("http://127.0.0.1:8879/#campaign?tab=world");
  await button(phone, "Ripristina esempio").tap();
  await button(phone, "Ripristina").tap();
  await phone.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm");
  await button(phone, "Preferenze").tap();
  await phone.locator("#dialog [name=lang]").selectOption("en");
  await button(phone, "Salva preferenze").tap();
  await phone.goto("http://127.0.0.1:8879/#campaign?tab=world");
  await phone.locator('[data-campaign-new="world"]').first().tap();
  await phone.locator('[data-campaign-path="data.title"]').fill("Frozen ford");
  await phone.locator('[data-campaign-insert-roll="data.body"]').tap();
  check(/Damage \(e\.g\. 2d6 fire\)/.test(await phone.locator("#dialog").innerText()), "picker not in English");
  await phone.locator("#dialog [data-embed-kind]").selectOption("damage");
  await phone.locator("#dialog [name=dice]").fill("1d8");
  await phone.locator("#dialog [name=type]").selectOption("cold");
  await button(phone, "Insert").tap();
  await phone.locator("[data-campaign-save]").tap();
  await phone.waitForTimeout(300);
  await phone.locator("[data-campaign-apply]").tap();
  await phone.locator('[data-text-embed="compendium-damage"] [data-compendium-roll]').waitFor();
  check(/Damage 1d8 cold/.test(await phone.locator('[data-text-embed="compendium-damage"]').innerText()), "EN damage button");
  check(
    !(await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)),
    "phone page overflows",
  );
  await phone.screenshot({ path: dir + "j06-telefono-en-danni.png" });
  await context.close();
  passed.push("Phone 390×844 touch, English: «Insert roll…» damage 1d8 cold renders a roll button");
  check(!errors.length, errors.join(" | "));
  return passed;
}
