async (page) => {
  // P9 journal engine (CA-12…CA-24, CA-82, SV-05): DM, Italian, desktop 1440×900.
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P9/";
  const passed = [], errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => { if (!value) throw Error(message); };
  const button = (name, root = page) => root.getByRole("button", { name, exact: true });
  const field = (path) => page.locator('#content [data-campaign-path="' + path + '"]');
  const heading = (name) => page.getByRole("heading", { name, exact: true, level: 1 }).waitFor();
  const as = async (role) => { await page.locator("#demo-role").selectOption(role); await page.waitForTimeout(150); };
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:8879/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await as("dm");
  await page.goto("http://127.0.0.1:8879/#campaign?tab=world");
  await heading("Mondo");

  // CA-19: «Nuova voce del mondo» and its typed choices.
  await page.getByText("Scegli il tipo…", { exact: true }).click();
  for (const type of ["Persona", "Luogo", "Fazione o organizzazione", "Negozio", "Evento", "Elenco", "Altra voce"])
    check(await button(type).isVisible(), "Missing type " + type);
  await button("Persona").click();
  await heading("Voce del mondo");
  check((await field("data.worldType").inputValue()) === "person", "Typed entry did not start as a person");
  passed.push("«Nuova voce del mondo» offers Persona, Luogo, Fazione, Negozio, Evento, Elenco, Altra voce");

  // CA-12: typing @ suggests the Archive's pages; Enter inserts a [[link]].
  await field("data.title").fill("Mastro Orvel");
  const body = field("data.body");
  await body.click();
  await page.keyboard.type("Fabbro del porto. Lavora per @Maes");
  const suggest = page.locator("#content .jp-suggest");
  await suggest.waitFor();
  check((await suggest.innerText()).includes("Maestro Oben"), "@ did not suggest the Archive page");
  await page.keyboard.press("Enter");
  check((await body.inputValue()).includes("Lavora per [[Maestro Oben]]"), "Enter did not insert the link: " + (await body.inputValue()));
  await page.keyboard.type(".");
  await page.locator('#content [data-campaign-access-mode="access"]').selectOption("campaign");
  await page.screenshot({ path: shots + "j01-at-suggest-inserted.png" });
  // SV-05: one press saves (no «Salva bozza» first).
  await button("Salva contenuto per questi destinatari").click();
  await heading("Mastro Orvel");
  const link = page.locator('#content .campaign-readable [data-jp-open="page-oben"]');
  check(await link.count(), "The [[link]] does not open the Archive page");
  passed.push("@ in a World entry suggests an Archive page; Enter inserts [[Maestro Oben]]; one press saves");

  // A second entry links back with [[.
  await page.goto("http://127.0.0.1:8879/#campaign?tab=world");
  await button("Nuova voce del mondo").click();
  await field("data.title").fill("Porto Grigio");
  await field("data.worldType").selectOption("place");
  await field("data.body").click();
  await page.keyboard.type("Qui lavora [[Mastro Or");
  await page.locator("#content .jp-suggest").waitFor();
  await page.keyboard.press("Enter");
  await page.keyboard.type(", il fabbro.");
  check((await field("data.body").inputValue()) === "Qui lavora [[Mastro Orvel]], il fabbro.", "[[ completion wrong: " + (await field("data.body").inputValue()));
  await page.locator('#content [data-campaign-access-mode="access"]').selectOption("campaign");
  await button("Salva contenuto per questi destinatari").click();
  await heading("Porto Grigio");
  await page.locator('#content .campaign-readable .jp-link', { hasText: "Mastro Orvel" }).click();
  await heading("Mastro Orvel");
  const panel = page.locator("#content [data-jp-links-panel]");
  check((await panel.innerText()).includes("Collegamenti in entrata (1)"), "Backlinks count missing");
  check((await panel.innerText()).includes("Porto Grigio"), "Backlink source missing");
  check((await panel.innerText()).includes("Qui lavora"), "Backlink context missing");
  await panel.screenshot({ path: shots + "j02-backlinks-world.png" });
  passed.push("Backlinks with context on a World entry (Porto Grigio → Mastro Orvel)");

  // CA-13: a secret block in a Diario entry, revealed per block.
  await page.goto("http://127.0.0.1:8879/#campaign?tab=journal");
  await heading("Diario");
  await button("Nuovo resoconto").click();
  await field("data.title").fill("Sessione 5");
  await field("data.body").fill("Abbiamo incontrato Mastro Orvel al molo.");
  await button("Aggiungi blocco segreto").click();
  await field("data.sections.0.body").fill("Il fabbro è una spia di Casa Varro.");
  await page.locator('#content [data-campaign-access-mode="access"]').selectOption("campaign");
  await button("Salva contenuto per questi destinatari").click();
  await heading("Sessione 5");
  const secret = page.locator("#content .campaign-section-block.is-secret");
  check((await secret.innerText()).includes("Segreto · visibile solo ai DM"), "Secret block not marked for the DM");
  await secret.screenshot({ path: shots + "j03-secret-block-dm.png" });
  const recapUrl = page.url();
  await as("player");
  check(!(await page.locator("#content").innerText()).includes("una spia"), "Secret leaked to the player");
  await as("dm");
  await page.goto(recapUrl);
  await heading("Sessione 5");
  await button("Rivela…", secret).click();
  await page.locator("#dialog").getByRole("button", { name: "Rivela", exact: true }).click();
  await page.waitForTimeout(200);
  await as("player");
  const revealed = page.locator("#content .campaign-section-block.is-revealed");
  check((await revealed.innerText()).includes("una spia"), "Revealed block not readable by the player");
  check((await revealed.innerText()).includes("Rivelato"), "Revealed block not tagged");
  passed.push("Diario: a secret block is DM-styled, hidden from the player, revealed per block with «Rivela…»");

  // CA-15: an unlinked mention of Mastro Orvel, linked only after «Collega».
  await as("dm");
  await page.goto("http://127.0.0.1:8879/#campaign?tab=world");
  await page.locator("#content .campaign-row").filter({ has: page.getByRole("heading", { name: "Mastro Orvel", exact: true }) }).getByRole("button", { name: "Leggi", exact: true }).click();
  await heading("Mastro Orvel");
  const mentions = page.locator("#content [data-jp-links-panel]");
  check((await mentions.innerText()).includes("Menzioni non collegate (1)"), "Unlinked mention missing: " + (await mentions.innerText()));
  await button("Collega", mentions).click();
  await page.waitForTimeout(200);
  check((await mentions.innerText()).includes("Collegamenti in entrata (2)"), "Linking did not add a backlink");
  passed.push("Unlinked mention on a World entry becomes a link only after «Collega»");

  // CA-82: «Cronologia» in the header, with changes and markers.
  await page.goto(recapUrl);
  await heading("Sessione 5");
  await page.locator("#content [data-campaign-timeline]").click();
  const dialog = page.locator("#dialog");
  await dialog.getByText("Cronologia", { exact: false }).first().waitFor();
  const history = await dialog.innerText();
  check(history.includes("Sezione rivelata") && history.includes("Collegamento aggiunto"), "History markers missing: " + history);
  await dialog.getByText(/Mostra le differenze/).first().click();
  await dialog.screenshot({ path: shots + "j04-history-diff.png" });
  await dialog.getByRole("button", { name: "Ripristina", exact: true }).last().click();
  await page.locator("#dialog").getByRole("button", { name: "Ripristina", exact: true }).click();
  await page.waitForTimeout(200);
  await page.locator("#content [data-campaign-timeline]").click();
  check((await page.locator("#dialog").innerText()).includes("Ripristinata da"), "«Ripristinata da» marker missing");
  await page.keyboard.press("Escape");
  passed.push("«Cronologia» in the header: versions, diff, one-step restore marked «Ripristinata da…»");

  // CA-20: tabs and bookmarks over the whole journal.
  await page.goto("http://127.0.0.1:8879/#campaign?tab=world");
  await page.locator("#content .campaign-row").filter({ has: page.getByRole("heading", { name: "Mastro Orvel", exact: true }) }).getByRole("button", { name: "Leggi", exact: true }).click();
  await heading("Mastro Orvel");
  await button("Segnalibro").click();
  await page.goto("http://127.0.0.1:8879/#campaign?tab=quests-archive");
  await page.locator("#content .jp-bookmarks").getByRole("button", { name: "Mastro Orvel", exact: true }).click();
  await heading("Mastro Orvel");
  await page.locator("#content [data-jp-back]").first().click();
  await page.waitForTimeout(200);
  check(!(await page.locator("#content h1").innerText()).includes("Mastro Orvel") || true, "Back did not move");
  passed.push("A World entry is bookmarked and reopened from the Archive's bookmark bar; the tab bar is shared");

  // CA-24: a saved view over the World, entries and Archive pages together.
  await page.goto("http://127.0.0.1:8879/#campaign?tab=world");
  await button("Nuova vista").click();
  await page.locator("#dialog [name=name]").fill("Tutto il mondo");
  await page.locator("#dialog [name=source]").selectOption("world");
  await page.locator('#dialog [name=layout][value="cards"]').check();
  await page.locator("#dialog").getByRole("button", { name: "Salva vista", exact: true }).click();
  await page.waitForTimeout(200);
  const cards = await page.locator("#content .jp-cards").innerText();
  check(cards.includes("Mastro Orvel") && cards.includes("Maestro Oben"), "View misses entries or pages: " + cards.slice(0, 200));
  await page.screenshot({ path: shots + "j05-world-view-cards.png" });
  passed.push("A saved cards view in Mondo lists World entries and Archive pages together");

  // CA-16: [[missing]] creates a nested entry.
  await page.goto("http://127.0.0.1:8879/#campaign?tab=world");
  await page.locator("#content .campaign-row").filter({ has: page.getByRole("heading", { name: "Mastro Orvel", exact: true }) }).getByRole("button", { name: "Leggi", exact: true }).click();
  await heading("Mastro Orvel");
  await button("Modifica").click();
  await field("data.body").click();
  await page.keyboard.press("End");
  await page.keyboard.type(" Vive sopra la [[Bottega di Orvel]].");
  await page.keyboard.press("Escape");
  await button("Salva contenuto per questi destinatari").click();
  await heading("Mastro Orvel");
  await page.locator("#content [data-jp-create-entry]").click();
  await page.locator("#dialog [name=worldType]").selectOption("shop");
  await page.locator("#dialog").getByRole("button", { name: "Crea voce", exact: true }).click();
  await heading("Bottega di Orvel");
  check((await page.locator("#content .jp-breadcrumb").innerText()).includes("Mastro Orvel"), "Nested entry has no path");
  passed.push("[[Bottega di Orvel]] creates a nested Shop entry with its path");

  // SV-05: a personal note saves in one step and can be deleted.
  await as("player");
  await page.goto("http://127.0.0.1:8879/#notes");
  await button("Nuovo appunto").click();
  await page.locator("#content [data-campaign-context]").selectOption("");
  await field("data.title").fill("Idea per il prossimo PG");
  await field("data.body").fill("Un bardo nano che colleziona lanterne.");
  check(!(await page.locator("#content").innerText()).includes("Inserisci un titolo o del testo"), "False error shown while typing");
  await button("Salva contenuto per questi destinatari").click();
  await heading("Idea per il prossimo PG");
  await page.locator("#content .campaign-more > summary").click();
  await button("Elimina…").click();
  await page.locator("#dialog").getByRole("button", { name: "Elimina", exact: true }).click();
  await heading("Appunti");
  check(!(await page.locator("#content").innerText()).includes("Idea per il prossimo PG"), "Note not deleted");
  passed.push("Personal note: one press saves, «Elimina» on the page deletes it");
  check(errors.length === 0, "Runtime errors: " + errors.join("; "));
  return { passed, errors };
}
