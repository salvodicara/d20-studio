async (page) => {
  // P1 IN-06 (DDB draft resume, Roll20 resumable Charactermancer): a quick-path draft left
  // at step 2 resumes in the quick path, step 2, with Guerriero still chosen — desktop
  // 1440x900 with the mouse and a separate 390x844 touch context with taps.
  const out = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P1/";
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const run = async (p, tap) => {
    const press = (l) => (tap ? l.tap() : l.click());
    await p.goto("http://127.0.0.1:8879/#home");
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.goto("http://127.0.0.1:8879/#builder-plus");
    await press(p.getByRole("button", { name: "Percorso rapido", exact: true }));
    await press(p.getByRole("button", { name: "Guerriero" }));
    await press(p.getByRole("button", { name: "Scegli Guerriero" }));
    await p.getByRole("heading", { name: "Scegli un background" }).waitFor();
    await press(p.getByRole("button", { name: "Esci (la bozza resta)" }));
    await press(p.locator('header nav [data-nav="home"]'));
    const row = p.locator("[data-home-work] .home-row").first();
    const detail = await row.locator("small").innerText();
    check(/Percorso rapido · passo 2 di 5: Background/.test(detail), "Home row: " + detail);
    await press(row.locator("[data-home-resume]"));
    await p.getByRole("heading", { name: "Scegli un background" }).waitFor();
    check(/tab=quick/.test(p.url()), "resumed outside the quick path: " + p.url());
    const chosen = await p.locator('[data-bp-step-choice="class"]').innerText();
    check(chosen === "Guerriero", "class not in view: " + chosen);
    const current = await p.locator('.bp-step[aria-current="step"]').innerText();
    check(/2\s*Background/.test(current), "not at step 2: " + current);
    return { detail, chosen };
  };
  await page.setViewportSize({ width: 1440, height: 900 });
  const desktop = await run(page, false);
  await page.screenshot({ path: out + "IN-06-journey-desktop.png" });
  const phone = await page
    .context()
    .browser()
    .newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const mobile = await phone.newPage();
  const touch = await run(mobile, true);
  await mobile.screenshot({ path: out + "IN-06-journey-phone.png" });
  const overflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  check(!overflow, "phone page scrolls sideways");
  await phone.close();
  return JSON.stringify({ desktop, touch, overflow });
}
