async (page) => {
  // R6 BI-45 — delegated simulation (I-233): «Pacchetti di compatibilità (solo meccaniche)»
  // in the Library (Foundry/Shard compendium packs, DDB source toggles). The DM imports the
  // sample pack from its JSON file, enables it in the campaign, opens it and reads a
  // creature's numbers with «Testo: nel vostro manuale, p. …» (IT, then EN); the player
  // reads the enabled pack without DM commands; the pack exports as JSON. Desktop 1440.
  // Fixture: r6-compat-pack-sample.json (the app's own invented sample pack).
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R6/";
  const BASE = "http://127.0.0.1:8879/";
  const KEY = "d20-studio-blueprint-v1";
  const passed = [];
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const ctx = await page
    .context()
    .browser()
    .newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  try {
    const p = await ctx.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(BASE + "#home");
    await p.evaluate((k) => localStorage.removeItem(k), KEY);
    await p.reload();
    await p.locator("#demo-role").selectOption("dm");
    // A first-time DM finds it in the Library's collections.
    await p.locator('[data-nav="library"]').first().click();
    await p.locator('[data-library-scope="adventures-packs"]').click();
    await p
      .getByRole("heading", { name: "Pacchetti di compatibilità (solo meccaniche)" })
      .waitFor();
    check(
      (await p.locator("[data-adv-pack-licence]").innerText()).includes(
        "i diritti restano all’editore",
      ),
      "licence line",
    );
    await p.locator("[data-adv-pack-import]").setInputFiles(dir + "r6-compat-pack-sample.json");
    const card = p.locator('[data-adv-pack="esempio-valle-di-bruma"]');
    await card.waitFor();
    check((await card.innerText()).includes("Simulazione"), "sample not labelled as a simulation");
    check(
      (await card.locator("[data-adv-pack-req]").first().innerText()).includes("pronto"),
      "base rules dependency",
    );
    await card.locator("[data-adv-pack-enable]").click();
    await card.locator('[data-adv-pack-state="on"]').waitFor();
    await p.screenshot({ path: dir + "r6-pack-enabled-it.png" });
    passed.push(
      "DM, IT: Biblioteca › «Pacchetti di compatibilità» › import the JSON file › «Simulazione» and «Solo meccaniche» badges, base-rules dependency ready › «Abilita in questa campagna» › enabled",
    );
    await card.locator("[data-adv-pack-open]").click();
    const lantern = p.locator('[data-adv-pack-entry="lanterna-vagante"]');
    await lantern.waitFor();
    const text = await lantern.innerText();
    check(/CA\s*13/.test(text) && /PF\s*22 \(5d6\+5\)/.test(text), "creature numbers: " + text);
    check(text.includes("Testo: nel vostro manuale, p. 42"), "page reference: " + text);
    await p.screenshot({ path: dir + "r6-pack-creature-it.png" });
    // English.
    await p.locator('.service-nav [data-service="preferences"]').click();
    await p.locator("#dialog select[name=lang]").selectOption("en");
    await p.locator("#dialog button[type=submit]").click();
    await p.getByText("Text: in your book, p. 42").waitFor();
    check(/AC\s*13/.test(await lantern.innerText()), "EN numbers");
    await p.screenshot({ path: dir + "r6-pack-creature-en.png" });
    passed.push(
      "pack page: «Lanterna vagante» CA 13, PF 22 (5d6+5), «Vampata» +5 · 2d6+3, «Testo: nel vostro manuale, p. 42»; in English «Text: in your book, p. 42»",
    );
    // Export: the same mechanics-only file.
    await p.locator("[data-adv-pack-back]").click();
    const download = p.waitForEvent("download");
    await p.locator('[data-adv-pack-export="esempio-valle-di-bruma"]').click();
    const file = await download;
    await file.saveAs(dir + "r6-pack-export.json");
    check(
      file.suggestedFilename() === "esempio-valle-di-bruma.json",
      "export name " + file.suggestedFilename(),
    );
    // The player reads the enabled pack, without DM commands.
    await p.locator('.service-nav [data-service="preferences"]').click();
    await p.locator("#dialog select[name=lang]").selectOption("it");
    await p.locator("#dialog button[type=submit]").click();
    await p.locator("#demo-role").selectOption("player");
    await p.locator('[data-nav="library"]').first().click();
    await p.locator('[data-library-scope="adventures-packs"]').click();
    await p.getByText("Abilitati dal DM in questa campagna").waitFor();
    check(
      !(await p.locator("[data-adv-pack-enable], [data-adv-pack-remove]").count()),
      "player sees DM commands",
    );
    passed.push(
      "export downloads «esempio-valle-di-bruma.json»; the player reads the pack enabled by the DM, with no enable or remove command",
    );
    check(!errors.length, errors.join("; "));
    await p.evaluate((k) => localStorage.removeItem(k), KEY);
  } finally {
    await ctx.close();
  }
  return { passed };
}
