async (page) => {
  // R6 PG-06 (dnd5e Compendium Browser locked to the choice) and BI-22 (Roll20 custom
  // subclass): builder › «Sfoglia le classi…» › «Crea variante…» opens the homebrew editor on
  // the class kind only, from the Wizard; «Salva» comes straight back to the builder with the
  // variant chosen. Desktop IT 1440 (mouse and keyboard) and EN phone 390 × 844 (touch).
  const out = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R6/";
  const BASE = "http://127.0.0.1:8879/";
  const KEY = "d20-studio-blueprint-v1";
  const passed = [];
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const browser = page.context().browser();
  const run = async (p, { lang, tap }) => {
    const it = lang === "it";
    const press = (l) => (tap ? l.tap() : l.click());
    const role = (name, extra = {}) => p.getByRole("button", { name, exact: true, ...extra });
    await p.goto(BASE + "#home");
    await p.evaluate((k) => localStorage.removeItem(k), KEY);
    await p.reload();
    await p.locator("[data-home-page]").waitFor();
    if (!it) {
      await press(p.locator("[data-service=preferences]"));
      await p.locator("#dialog select[name=lang]").selectOption("en");
      await press(p.locator("#dialog button[type=submit]"));
    }
    await p.goto(BASE + "#builder-plus");
    await press(role(it ? "Inizia passo per passo" : "Start step by step"));
    await press(p.locator('.builder-sections [data-builder-section="class"]'));
    await press(role(it ? "Sfoglia le classi…" : "Browse classes…"));
    await p.locator('#dialog [data-picker-option="wizard"]').waitFor();
    await press(p.locator('#dialog [data-picker-option="wizard"]'));
    await press(
      role(it ? "Crea variante nell’editor homebrew…" : "Create a variant in the homebrew editor…"),
    );
    // The one «Crea contenuto» dialog, locked to the class kind, starting from the Wizard.
    const kinds = await p.locator("#dialog [data-hbe-create-kind] option").allInnerTexts();
    check(kinds.length === 1 && /Classe|Class/.test(kinds[0]), "kind not locked: " + kinds);
    const template = p.locator('#dialog select[name="template-class"]');
    check((await template.inputValue()) === "class-levels:wizard", "template not the Wizard");
    await press(p.locator("#dialog button[type=submit]"));
    await p.locator('[data-hbe-path="name.it"]').waitFor();
    check(
      (await p.locator('[data-hbe-path="name.it"]').inputValue()).includes("variante") ||
        (await p.locator('[data-hbe-path="name.en"]').inputValue()).includes("variant"),
      "the variant name does not start from the Wizard",
    );
    const name = it ? "Mago delle lanterne" : "Lantern Wizard";
    await p.locator(`[data-hbe-path="name.${lang}"]`).fill(name);
    await press(p.locator('[data-hbe="subform"][data-subform="advancement"]'));
    const feature = p.locator('[data-hbe-path="structured.advancement.0.features.0.name.it"]');
    await feature.waitFor();
    await feature.fill("Lanterna arcana");
    await p.screenshot({ path: out + `r6-variant-editor-${lang}.png` });
    await press(p.locator('[data-hbe="save-content"]').first());
    // Straight back to the builder, class section, the variant chosen in class row 1.
    await p.locator("[data-builder-form]").first().waitFor();
    await p.waitForFunction(() => location.hash.startsWith("#builder"));
    const chosen = await p
      .locator('[data-builder-path="classes.0.classId"]')
      .evaluate((select) => select.selectedOptions[0]?.textContent ?? "");
    check(chosen === name, "variant not chosen in the builder: " + chosen);
    check(
      (await p.locator("[data-builder-section-title]").innerText()).length > 0 &&
        (await p.locator('[aria-current="step"]').getAttribute("data-builder-section")) === "class",
      "not back on the class section",
    );
    const stored = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
    const draft = stored.characterDrafts.at(-1);
    check(
      /^hb-class:/.test(draft.data.classes[0].classId),
      "draft class: " + draft.data.classes[0].classId,
    );
    check(
      (await p.evaluate(() => document.documentElement.scrollWidth)) <=
        (await p.evaluate(() => innerWidth)),
      "page wider than the screen",
    );
    await p.screenshot({ path: out + `r6-variant-back-in-builder-${lang}.png` });
    if (!it) return name;
    // The same for a species (desktop): «Sfoglia le specie…» › Nano › «Crea variante…».
    await press(p.locator('.builder-sections [data-builder-section="origin"]'));
    await press(role("Sfoglia le specie…"));
    await press(p.locator('#dialog [data-picker-option="dwarf"]'));
    await press(role("Crea variante nell’editor homebrew…"));
    check(
      (await p.locator('#dialog select[name="template-species"]').inputValue()) ===
        "srd-species:dwarf",
      "species template not the Dwarf",
    );
    await press(p.locator("#dialog button[type=submit]"));
    await p.locator('[data-hbe-path="name.it"]').fill("Nano delle miniere");
    await press(p.locator('[data-hbe="save-content"]').first());
    await p.locator('[data-builder-path="origin.speciesId"]').waitFor();
    const species = await p
      .locator('[data-builder-path="origin.speciesId"]')
      .evaluate((select) => select.selectedOptions[0]?.textContent ?? "");
    check(species === "Nano delle miniere", "species variant not chosen: " + species);
    await p.screenshot({ path: out + "r6-variant-species-it.png" });
    return name;
  };
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    const p = await desk.newPage();
    const name = await run(p, { lang: "it", tap: false });
    passed.push(
      `desktop IT: «Sfoglia le classi…» › «Crea variante…» (class only, from the Wizard) › «Salva» › back in the builder with «${name}» chosen; the same for a species variant of the Dwarf`,
    );
  } finally {
    await desk.close();
  }
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  try {
    const p = await phone.newPage();
    const name = await run(p, { lang: "en", tap: true });
    passed.push(
      `phone EN 390 touch: the same by taps, back with “${name}” chosen, no horizontal overflow`,
    );
  } finally {
    await phone.close();
  }
  return { passed };
}
