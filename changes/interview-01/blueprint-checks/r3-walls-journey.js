async (page) => {
  // R3 PR-22 (Foundry wall restrictions): in Preparation the DM draws two «Terreno (limitata)»
  // walls between Livia and the Sentinella, with the Esploratore between the two walls; at the
  // Table, with dynamic vision on, Livia's player sees the Esploratore (one terrain wall
  // crossed) and not the Sentinella (two crossed); a normal wall would hide both. Desktop.
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R3/images/";
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const button = (name) => page.getByRole("button", { name, exact: true });
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const clickMap = async (selector, x, y) => {
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.locator(selector).scrollIntoViewIfNeeded();
    const p = await page.locator(selector).evaluate((svg, { x, y }) => {
      const pt = svg.createSVGPoint();
      pt.x = x;
      pt.y = y;
      const q = pt.matrixTransform(svg.getScreenCTM());
      return { x: q.x, y: q.y };
    }, { x, y });
    await page.mouse.click(p.x, p.y);
  };
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("http://127.0.0.1:8879/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("#demo-role").selectOption("dm");
  await page.goto("http://127.0.0.1:8879/#preparation");
  await button("Nuova scena").click();
  await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Erba alta");
  await button("Crea bozza").click();
  await page.locator("[name=gridSnap]").uncheck();
  const prep = "[data-prep-interactive]";
  for (const [id, x, y] of [
    ["livia", 200, 300],
    ["goblin-2", 450, 300],
    ["goblin-1", 700, 300],
  ]) {
    await page.getByRole("combobox", { name: "Personaggio o creatura", exact: true }).selectOption(id);
    await button("Posiziona sulla mappa").click();
    await clickMap(prep, x, y);
  }
  await button("Muro").click();
  const typeList = page.locator("[data-spatial-wall-type]");
  const options = await typeList.locator("option").allTextContents();
  check(options.includes("Terreno (limitata)") && options.includes("Prossimità"), "wall types: " + options.join(", "));
  await typeList.selectOption("terrain");
  const hint = await page.locator(".spatial-wall-type small").textContent();
  check(/due o più/.test(hint), "no description under the wall type: " + hint);
  for (const x of [325, 575]) {
    await clickMap(prep, x, 150);
    await clickMap(prep, x, 450);
    await page.keyboard.press("Escape");
  }
  await page.locator("[data-prep-map], #content").first().screenshot({ path: shots + "r3-walls-prep.png" });
  await button("Salva preparazione").click();
  await page.waitForTimeout(300);
  let s = await saved();
  const scene = s.scenes.find((x) => x.name === "Erba alta");
  check(scene, "scene not saved");
  const terrain = (scene.walls ?? []).filter((w) => w.sightMode === "limited");
  check(terrain.length === 2 && terrain.every((w) => w.blocksMovement === false), "walls: " + JSON.stringify(scene.walls));
  passed.push("Preparation: «Tipo di muro» offers «Terreno (limitata)» and «Prossimità» with their description; two terrain walls saved (sight limited, walked through)");

  // Reveal and activate the scene (Preparation's own commands), turn dynamic vision on at
  // the Table, then look as Livia's player.
  await page.locator(`[data-prep-share="${scene.id}"]`).click();
  await page.locator('#dialog button[type="submit"]').click();
  await page.waitForTimeout(200);
  await page.locator(`[data-prep-activate="${scene.id}"]`).click();
  await page.locator('#dialog button[type="submit"]').click();
  await page.waitForTimeout(300);
  s = await saved();
  check(s.activeSceneId === scene.id, "the scene is not active");
  await page.goto("http://127.0.0.1:8879/#table");
  await page.locator('#battle-map .map-token[data-actor="livia"]').waitFor();
  // Sidebar «Scena» › «Visione» (B62 section with sub-tabs).
  await page.locator('.table-tabs [data-table-tab="scene"]').first().click();
  await page.locator('.table-subtabs [data-table-tab="fog-vision-panel"]').first().click();
  await page.locator('[data-fv-scene="vision"]').first().check();
  await page.waitForTimeout(300);
  s = await saved();
  check(s.ext["fog-vision"].scenes[scene.id]?.vision === true, "dynamic vision not on");
  await page.locator("#demo-role").selectOption("player");
  await page.waitForTimeout(400);
  const hidden = await page.evaluate(() => document.querySelector(".fv-fog-layer")?.dataset.fvHiddenTokens ?? null);
  check(hidden !== null, "no vision layer for the player");
  const ids = hidden.split(" ").filter(Boolean);
  check(ids.includes("goblin-1") && !ids.includes("goblin-2"), "hidden tokens: " + hidden);
  await page.locator("#battle-map").screenshot({ path: shots + "r3-walls-table-player.png" });
  passed.push("Table, player with dynamic vision: the Esploratore behind one terrain wall is seen; the Sentinella behind two is hidden (" + hidden + ")");
  check(!errors.length, "page errors: " + errors.join(" | "));
  return passed.join("\n");
}
