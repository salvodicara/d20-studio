async (page) => {
  // P1 PG-08 (BG3/DDB Level Up: one click, the new level only, before/after) and PG-16
  // (dnd5e Level Down): a CON 16 Fighter goes 1 → 2 from Home «Avanza» (13 → 22 HP, Action
  // Surge and Tactical Mind) and back 2 → 1 through «Rivedi scelte» (22 → 13 HP, derived,
  // no «valori manuali» note). Synthetic data in this browser only.
  const out = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P1/";
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const bruno = async () => Object.values((await saved()).actors).find((a) => a.name === "Bruno");
  const field = (path) => page.locator(`[data-builder-path="${path}"]`);
  const section = (id) => page.locator(`.builder-sections [data-builder-section="${id}"]`);
  const confirmIncomplete = async () => {
    await page.locator("[data-builder-apply]").waitFor();
    if (await page.locator("[data-builder-accept-incomplete]").count())
      await page.locator("[data-builder-accept-incomplete]").check();
  };
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:8879/#home");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  // 1. A level-1 Fighter from the quick path.
  await page.goto("http://127.0.0.1:8879/#builder-plus");
  await page.getByRole("button", { name: "Percorso rapido", exact: true }).click();
  await page.getByRole("button", { name: "Guerriero" }).click();
  await page.getByRole("button", { name: "Scegli Guerriero" }).click();
  await page.getByRole("button", { name: "Soldato" }).click();
  await page.getByRole("button", { name: "Scegli Soldato" }).click();
  await page.getByRole("button", { name: "Umano" }).click();
  await page.getByRole("button", { name: "Scegli Umano" }).click();
  await page.locator(".bp-identity input, [data-bp-name]").first().fill("Bruno");
  await page.getByRole("button", { name: "Continua al riepilogo" }).click();
  await page.getByRole("checkbox", { name: /Confermo la scheda/ }).check();
  await page.getByRole("button", { name: "Crea personaggio" }).click();
  await page.getByRole("heading", { name: "Bruno", exact: true }).waitFor();
  // 2. CON 16 through «Rivedi scelte» (derived: 11 → 13 HP, never a manual total).
  await page.getByRole("button", { name: "Rivedi scelte", exact: true }).click();
  await section("abilities").click();
  await page.locator('[data-builder-section-title]:has-text("Caratteristiche")').waitFor();
  const assignment = { str: "1", dex: "2", con: "0", int: "5", wis: "4", cha: "3" };
  for (const [id, value] of Object.entries(assignment))
    await field(`abilities.assignment.${id}`).selectOption(value);
  await section("origin").click();
  await field("origin.backgroundBonuses.str").waitFor();
  await field("origin.backgroundBonuses.str").fill("2");
  await field("origin.backgroundBonuses.dex").fill("0");
  await field("origin.backgroundBonuses.con").fill("1");
  await section("review").click();
  await confirmIncomplete();
  await page.getByRole("button", { name: "Applica alla scheda" }).click();
  await page.getByRole("heading", { name: "Bruno", exact: true }).waitFor();
  let actor = await bruno();
  check(actor.abilities.con === 16, "CON not 16: " + actor.abilities.con);
  check(actor.maxHp === 13, "level 1 HP not 13: " + actor.maxHp);
  // 3. 300 XP, then Home «Avanza»: the builder opens on level 2's review.
  await page.getByRole("button", { name: "Gestisci PE", exact: true }).click();
  await page.locator("dialog[open] input[name=amount]").fill("300");
  await page.locator("dialog[open] [data-shp-dialog=add-xp]").click();
  await page.keyboard.press("Escape");
  await page.locator('header nav [data-nav="home"]').click();
  let interactions = 0;
  await page.locator("[data-home-advance]").first().click();
  interactions++;
  await page.locator("[data-builder-compare]").waitFor();
  check(/tab=review/.test(page.url()), "Avanza did not land on the review: " + page.url());
  const compare = await page.locator("[data-builder-compare]").innerText();
  check(/1 → 2/.test(compare), "level change missing: " + compare);
  check(/13 → 22/.test(compare), "HP change missing: " + compare);
  // Refreshed by the residuals writer (29/09/2026): X-A2, the Italian SRD feature names.
  check(/Azione impetuosa/.test(compare) && /Mente tattica/.test(compare), "features: " + compare);
  check(/Dadi Vita d10\s*1 → 2/.test(compare), "hit dice: " + compare);
  await page.screenshot({ path: out + "PG-08-journey-levelup.png" });
  if (await page.locator("[data-builder-accept-incomplete]").count()) {
    await page.locator("[data-builder-accept-incomplete]").check();
    interactions++;
  }
  await page.getByRole("button", { name: "Applica alla scheda" }).click();
  interactions++;
  await page.getByRole("heading", { name: "Bruno", exact: true }).waitFor();
  check(interactions <= 3, "level up took " + interactions + " interactions");
  actor = await bruno();
  check(actor.level === 2 && actor.maxHp === 22, `level 2 / 22 HP: ${actor.level} / ${actor.maxHp}`);
  check(
    actor.features.some((f) => f.definitionId === "fighter:action-surge" && f.max === 1),
    "Action Surge missing",
  );
  // 4. «Rivedi scelte» › Classi › level 1 › Riepilogo: 22 → 13, derived.
  await page.getByRole("button", { name: "Rivedi scelte", exact: true }).click();
  await section("class").click();
  await field("classes.0.level").waitFor();
  await field("classes.0.level").fill("1");
  await section("review").click();
  await page.locator("[data-builder-compare]").waitFor();
  const review = await page.locator(".builder-main").innerText();
  check(/22 → 13/.test(review), "level down HP: " + review.slice(0, 600));
  check(!/valori manuali dichiarati/.test(review), "reported as a manual value");
  check(/Privilegi tolti/.test(review), "removed features not listed");
  await page.screenshot({ path: out + "PG-16-journey-leveldown.png" });
  await confirmIncomplete();
  await page.getByRole("button", { name: "Applica alla scheda" }).click();
  await page.getByRole("heading", { name: "Bruno", exact: true }).waitFor();
  actor = await bruno();
  check(actor.level === 1 && actor.maxHp === 13, `level 1 / 13 HP: ${actor.level} / ${actor.maxHp}`);
  check(!actor.features.some((f) => f.definitionId === "fighter:action-surge"), "Action Surge kept");
  return JSON.stringify({ interactions, level: actor.level, maxHp: actor.maxHp });
}
