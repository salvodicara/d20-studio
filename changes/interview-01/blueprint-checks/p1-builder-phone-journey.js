async (page) => {
  // P1 builder on a 390x844 touch phone, in English: the compendium picker (PG-06), the
  // background origin feat and allowed increases (PG-05), «Fix» landing on the field
  // (PG-03) and the personality lists (PG-10), all by taps.
  const out = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P1/";
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const phone = await page
    .context()
    .browser()
    .newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await phone.newPage();
  await p.goto("http://127.0.0.1:8879/#home");
  await p.locator("[data-home-page]").waitFor();
  await p.locator("[data-service=preferences]").tap();
  await p.locator("#dialog select[name=lang]").selectOption("en");
  await p.locator("#dialog button[type=submit]").tap();
  await p.goto("http://127.0.0.1:8879/#builder-plus");
  await p.getByRole("button", { name: "Start step by step" }).tap();
  await p.locator('.builder-sections [data-builder-section="origin"]').tap();
  await p.getByRole("button", { name: "Browse backgrounds…" }).tap();
  await p.locator("#dialog [data-picker-search]").fill("sol");
  const visible = await p
    .locator("#dialog [data-picker-option]")
    .evaluateAll((rows) => rows.filter((row) => row.offsetParent !== null).map((row) => row.innerText));
  check(visible.length === 1 && /Soldier/.test(visible[0]), "search did not filter: " + visible);
  await p.locator('#dialog [data-picker-option="soldier"]').tap();
  const preview = await p.locator("#dialog [data-picker-preview]").innerText();
  check(/Origin feat/.test(preview) && /Savage Attacker/.test(preview), "preview: " + preview);
  await p.screenshot({ path: out + "PG-06-picker-phone-en.png" });
  await p.getByRole("button", { name: "Choose", exact: true }).tap();
  await p.locator("[data-builder-origin-feat]").waitFor();
  const increases = await p.locator("[data-builder-increases] input").count();
  check(increases === 3, "allowed increases shown: " + increases);
  const fix = p.locator('.builder-errors [data-builder-fix^="origin.backgroundBonuses"]');
  await fix.tap();
  await p.waitForTimeout(300);
  const focused = await p.evaluate(() => document.activeElement?.dataset?.builderPath);
  check(/^origin\.backgroundBonuses\./.test(focused ?? ""), "Fix focus: " + focused);
  await p.locator('.builder-sections [data-builder-section="story"]').tap();
  await p.locator('[data-builder-personality-random="flaws"]').tap();
  const flaws = await p.locator('[data-builder-personality="flaws"] .builder-personality-list li').count();
  check(flaws === 1, "random flaw not added");
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  check(!overflow, "builder scrolls sideways on the phone");
  await p.screenshot({ path: out + "PG-10-personality-phone-en.png" });
  await p.locator("[data-service=preferences]").tap();
  await p.locator("#dialog select[name=lang]").selectOption("it");
  await p.locator("#dialog button[type=submit]").tap();
  await phone.close();
  return JSON.stringify({ increases, focused, flaws, overflow });
}
