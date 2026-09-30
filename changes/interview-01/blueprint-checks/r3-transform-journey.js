async (page) => {
  // R3 PG-79 + PG-77 (dnd5e Transform dialog and token swap, BG3 Polymorph): the DM finds
  // «metamorfosi» in the search, turns the Sentinella into a Wolf, the token shows the wolf
  // emblem and «Lupo (Sentinella)»; «Torna alla forma originale» brings the old image back at
  // once. Then the same in English. Desktop 1440 × 900.
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R3/images/";
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const mod = await page.evaluate(() => (/Mac|iPhone|iPad/.test(navigator.platform) ? "Meta" : "Control"));
  const palette = async (text) => {
    await page.keyboard.press(`${mod}+k`);
    await page.locator("#dialog [data-cmdk-input]").waitFor();
    await page.locator("#dialog [data-cmdk-input]").fill(text);
    await page.waitForTimeout(200);
  };
  const choose = async (title) => {
    const option = page.locator("#dialog [data-cmdk-option]", { hasText: title }).first();
    check(await option.count(), `«${title}» not in the search results`);
    await option.click();
    await page.locator("#dialog [data-forms-transform]").waitFor();
  };
  const token = (id) => page.locator(`#battle-map .map-token[data-actor="${id}"]`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:8879/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("#demo-role").selectOption("dm");
  await page.waitForTimeout(150);
  await page.goto("http://127.0.0.1:8879/#table");
  await token("goblin-1").waitFor();
  const before = await page.evaluate(() => document.querySelector("#media-art-goblin-1 image")?.getAttribute("href") ?? "");
  check(before, "the Sentinella has no token image before the transformation");

  await palette("metamorfosi");
  const list = await page.locator("#dialog [data-cmdk-list]").innerText();
  check(/Metamorfosi…/.test(list), "«metamorfosi» does not find the command: " + list.slice(0, 300));
  await choose("Metamorfosi…");
  await page.locator('#dialog [data-tf="actorId"]').selectOption("goblin-1");
  await page.waitForTimeout(100);
  const out = await page.locator('#dialog .forms-beast.is-out').count();
  const wolf = page.locator('#dialog input[data-tf="profileId"][value="srd2024:wolf"]');
  check(await wolf.isEnabled(), "the Wolf is not selectable for the Sentinella");
  await wolf.check();
  await page.waitForTimeout(100);
  const summary = await page.locator("#dialog [data-tf-summary]").innerText();
  check(/Sentinella → Lupo/.test(summary) && /PF temporanei 11/.test(summary), "summary: " + summary);
  await page.locator("#dialog").screenshot({ path: shots + "r3-transform-dialog-it.png" });
  await page.locator('#dialog footer button[type="submit"]').click();
  await page.waitForTimeout(300);
  check(!(await page.locator("#dialog[open]").count()), "the dialog did not close");
  const shown = await token("goblin-1").getAttribute("aria-label");
  const name = await token("goblin-1").locator(".token-name").textContent();
  check(name === "Lupo (Sentinella)" && /^Lupo \(Sentinella\)/.test(shown), `token label: ${name} / ${shown}`);
  check((await token("goblin-1").getAttribute("data-token-form")) === "srd2024:wolf", "no form mark");
  const emblem = await page.evaluate(() => ({
    path: Boolean(document.querySelector("#media-art-goblin-1 path")),
    image: Boolean(document.querySelector("#media-art-goblin-1 image")),
    word: document.querySelector("#media-art-goblin-1 text")?.textContent,
  }));
  check(emblem.path && !emblem.image && emblem.word === "FORMA", "form emblem: " + JSON.stringify(emblem));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")).actors["goblin-1"]);
  check(saved.activeForm?.kind === "polymorph" && saved.tempHp === 11 && saved.hp === 7, "state: " + JSON.stringify({ f: saved.activeForm?.kind, t: saved.tempHp, h: saved.hp }));
  await page.locator("#battle-map").screenshot({ path: shots + "r3-transform-wolf-it.png" });
  passed.push(`IT: search «metamorfosi» → «Metamorfosi…» → Sentinella → Lupo (${out} beasts out with their reason): the token reads «${name}», shows the wolf emblem with «FORMA», 11 temporary HP, HP 7 kept`);

  await palette("forma originale");
  await choose("Torna alla forma originale");
  const current = await page.locator("#dialog [data-tf-current]").innerText();
  check(/Lupo \(Sentinella\)/.test(current), "current form: " + current);
  await page.locator('#dialog footer button[type="submit"]').click();
  await page.waitForTimeout(300);
  const back = await page.evaluate(() => document.querySelector("#media-art-goblin-1 image")?.getAttribute("href") ?? "");
  check(back && !(await token("goblin-1").getAttribute("data-token-form")), "the old image is not back");
  check((await token("goblin-1").locator(".token-name").textContent()) === "Sentinella", "the name is not back");
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")).actors["goblin-1"]);
  check(!after.activeForm && !after.tempHp, "form or temporary HP left: " + JSON.stringify(after.activeForm));
  passed.push("IT: «Torna alla forma originale» (search «forma originale») brings back the Sentinella's image and name at once; the form's temporary HP vanish");

  // English.
  await page.locator('[data-service="preferences"]').first().click();
  await page.locator('#dialog [name="lang"]').selectOption("en");
  await page.locator('#dialog button[type="submit"]').click();
  await page.waitForTimeout(300);
  await palette("polymorph");
  await choose("Polymorph…");
  await page.locator('#dialog [data-tf="actorId"]').selectOption("goblin-2");
  await page.waitForTimeout(100);
  await page.locator('#dialog input[data-tf="profileId"][value="srd2024:cat"]').check();
  await page.waitForTimeout(100);
  check((await page.locator('#dialog footer button[type="submit"]').textContent()) === "Transform", "EN submit label");
  await page.locator('#dialog footer button[type="submit"]').click();
  await page.waitForTimeout(300);
  const en = await token("goblin-2").locator(".token-name").textContent();
  check(en === "Cat (Esploratore)", "EN token name: " + en);
  await page.locator("#battle-map").screenshot({ path: shots + "r3-transform-cat-en.png" });
  passed.push(`EN: «polymorph» → «Polymorph…» → Esploratore → Cat: the token reads «${en}»`);
  check(!errors.length, "page errors: " + errors.join(" | "));
  return passed.join("\n");
}
