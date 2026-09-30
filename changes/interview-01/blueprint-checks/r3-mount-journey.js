async (page) => {
  // R3 PG-79 mounts (SRD 5.2.1 Mounted Combat; Foundry/Roll20 attached tokens): the DM finds
  // «cavalcatura» in the search and brings a Riding Horse next to Livia; Livia's player opens
  // her token menu › Azioni › «Monta in sella…», keeps «Controllata» and executes; dragging the
  // horse carries Livia, dragging Livia rides the horse. Desktop 1440 × 900, IT.
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R3/images/";
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const tokenOf = (s, id) => s.scenes.find((x) => x.id === s.activeSceneId).tokens.find((t) => t.actorId === id);
  const mod = await page.evaluate(() => (/Mac|iPhone|iPad/.test(navigator.platform) ? "Meta" : "Control"));
  const centre = async (id) => {
    const box = await page.locator(`#battle-map .map-token[data-actor="${id}"] .token-hit`).boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const drag = async (id, dx, dy) => {
    const from = await centre(id);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + dx, from.y + dy, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(400);
  };
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:8879/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("#demo-role").selectOption("dm");
  await page.waitForTimeout(150);
  await page.goto("http://127.0.0.1:8879/#table");
  await page.locator('#battle-map .map-token[data-actor="livia"]').waitFor();
  await page.locator('#battle-map .map-token[data-actor="livia"] .token-hit').click();

  await page.keyboard.press(`${mod}+k`);
  await page.locator("#dialog [data-cmdk-input]").fill("cavalcatura");
  await page.waitForTimeout(200);
  const bring = page.locator("#dialog [data-cmdk-option]", { hasText: "Porta una cavalcatura" }).first();
  check(await bring.count(), "«cavalcatura» does not find «Porta una cavalcatura»");
  await bring.click();
  await page.waitForTimeout(300);
  let s = await saved();
  const horseId = Object.keys(s.actors).find((id) => id.startsWith("sm-horse-"));
  check(horseId, "no horse on the scene");
  const gap = Math.hypot(tokenOf(s, horseId).x - tokenOf(s, "livia").x, tokenOf(s, horseId).y - tokenOf(s, "livia").y);
  check(gap <= 72, "the horse is not next to Livia: " + gap);
  passed.push(`DM: search «cavalcatura» → «Porta una cavalcatura»: ${s.actors[horseId].name} next to Livia (${Math.round(gap)} px)`);

  // Livia's player: token menu › Azioni › Monta in sella… → Controllata → Esegui.
  await page.locator("#demo-role").selectOption("player");
  await page.waitForTimeout(250);
  await page.locator('#battle-map .map-token[data-actor="livia"] .token-hit').click({ button: "right" });
  const menu = page.locator("body > .token-menu");
  await menu.waitFor();
  await menu.locator('[data-token-menu-category="actions"]').click();
  const mount = menu.locator(".token-menu-item", { hasText: "Monta in sella…" });
  check(await mount.count(), "«Monta in sella…» missing from the token menu");
  await mount.click();
  const card = page.locator('[data-sm-card="mount"]');
  await card.waitFor();
  const controlled = card.locator('input[data-sm-controlled][value="controlled"]');
  check((await controlled.isChecked()) && (await controlled.isEnabled()), "«Controllata» is not the chosen, enabled option");
  await page.locator("#content").screenshot({ path: shots + "r3-mount-card-it.png" });
  await card.locator("[data-sm-execute]").click();
  await page.waitForTimeout(300);
  s = await saved();
  check(s.ext["special-moves"].mounts.livia?.mountId === horseId && s.ext["special-moves"].mounts.livia.controlled === true, "not mounted: " + JSON.stringify(s.ext["special-moves"].mounts));
  passed.push("Player: Livia's token menu › Azioni › «Monta in sella…» → «Controllata» (checked, with the SRD meaning) → Esegui: Livia rides the horse, controlled");

  // Dragging the horse carries Livia; dragging Livia rides the horse.
  const offset = (st) => [tokenOf(st, "livia").x - tokenOf(st, horseId).x, tokenOf(st, "livia").y - tokenOf(st, horseId).y];
  const before = { horse: { ...tokenOf(s, horseId) }, off: offset(s) };
  await drag(horseId, 150, 0);
  s = await saved();
  check(Math.abs(tokenOf(s, horseId).x - before.horse.x) > 60, "the horse did not move");
  check(JSON.stringify(offset(s)) === JSON.stringify(before.off), "Livia was not carried: " + JSON.stringify([offset(s), before.off]));
  const afterHorse = { ...tokenOf(s, horseId) };
  await drag("livia", 0, 120);
  s = await saved();
  check(Math.abs(tokenOf(s, horseId).y - afterHorse.y) > 60 && JSON.stringify(offset(s)) === JSON.stringify(before.off), "dragging Livia did not ride the horse");
  await page.locator("#battle-map").screenshot({ path: shots + "r3-mount-ride-it.png" });
  passed.push("Player: dragging the horse carries Livia in the saddle; dragging Livia moves the horse with her (one pair, as Foundry/Roll20 attached tokens)");
  check(!errors.length, "page errors: " + errors.join(" | "));
  return passed.join("\n");
}
