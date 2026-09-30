async (page) => {
  // P1 PG-92 (ddb-importer / Foundry «Import Data»): a synthetic Foundry dnd5e actor file is
  // previewed with its mapped and unmapped fields, imported as a new sheet, then a newer
  // export of the same actor updates that sheet («Aggiorna da file»).
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P1/";
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:8879/#characters");
  await page.locator("[data-clib-import]").waitFor({ state: "attached" });
  await page.locator("[data-clib-import]").setInputFiles(dir + "foundry-kael-synthetic.json");
  const preview = page.locator("#dialog [data-clib-import-preview]");
  await preview.waitFor();
  check((await preview.getAttribute("data-clib-import-format")) === "foundry-dnd5e", "format");
  const mapped = await preview.locator("[data-clib-mapped]").innerText();
  const ignored = await preview.locator("[data-clib-ignored]").innerText();
  check(/system\.abilities/.test(mapped) && /items\[class\]/.test(mapped), "mapped: " + mapped);
  check(/system\.currency/.test(ignored), "unmapped: " + ignored);
  await page.screenshot({ path: dir + "PG-92-foundry-preview.png" });
  await page.locator("#dialog button[type=submit]").click();
  let kael = Object.values((await saved()).actors).find((a) => a.imported?.sourceId === "fvttSyntheticKael");
  check(kael && kael.maxHp === 20 && kael.level === 2, "imported sheet");
  const before = Object.keys((await saved()).actors).length;
  await page.locator("[data-clib-import]").setInputFiles(dir + "foundry-kael-synthetic-level3.json");
  await page.locator("#dialog [data-clib-import-mode]").waitFor();
  await page.locator("#dialog button[type=submit]").click();
  const state = await saved();
  kael = state.actors[kael.id];
  check(Object.keys(state.actors).length === before, "update created a new sheet");
  check(kael.level === 3 && kael.maxHp === 28, `updated: ${kael.level} / ${kael.maxHp}`);
  return JSON.stringify({ mapped, ignored: ignored.slice(0, 120), level: kael.level, maxHp: kael.maxHp });
}
