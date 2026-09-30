async (page) => {
  // R3 CA-61 (Foundry ownership on several tokens, Owlbear per-item permissions): the DM groups
  // Livia with the Sentinella (Shift+click, Shift+G) and sets «Chi può muovere il gruppo…» to
  // «Solo il DM»: Livia's player cannot drag or arrow-move her and reads why; set to «Il DM e
  // chi controlla: Livia», her drag brings the Sentinella along. Desktop 1440 × 900, IT.
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R3/images/";
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const tokenOf = (s, id) => s.scenes.find((x) => x.id === s.activeSceneId).tokens.find((t) => t.actorId === id);
  const hit = (id) => page.locator(`#battle-map .map-token[data-actor="${id}"] .token-hit`);
  const drag = async (id, dx, dy) => {
    const b = await hit(id).boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(400);
  };
  const movers = async (choice, tick = []) => {
    await hit("livia").click({ button: "right" });
    const menu = page.locator("body > .token-menu");
    await menu.waitFor();
    await menu.locator('[data-token-menu-category="dm"]').click();
    await menu.locator(".token-menu-item", { hasText: "Chi può muovere il gruppo…" }).click();
    const dialog = page.locator("#dialog");
    await dialog.locator(`input[name="mode"][value="${choice}"]`).check();
    for (const id of tick) await dialog.locator(`input[name="movers"][value="${id}"]`).check();
    await dialog.locator('button[type="submit"]').click();
    await page.waitForTimeout(250);
  };
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:8879/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("#demo-role").selectOption("dm");
  await page.waitForTimeout(150);
  await page.goto("http://127.0.0.1:8879/#table");
  await hit("livia").waitFor();
  await hit("livia").click({ modifiers: ["Shift"] });
  await hit("goblin-1").click({ modifiers: ["Shift"] });
  await page.keyboard.press("Shift+G");
  await page.waitForTimeout(250);
  let s = await saved();
  const groups = Object.values(s.ext["token-menu"].groups ?? {});
  check(groups.length === 1 && groups[0].tokenIds.length === 2, "not grouped: " + JSON.stringify(groups));
  await movers("dm");
  s = await saved();
  check(JSON.stringify(Object.values(s.ext["token-menu"].groups)[0].movers) === "[]", "movers not DM-only");
  passed.push("DM: Shift+click Livia and the Sentinella, Shift+G groups them; token menu › Strumenti DM › «Chi può muovere il gruppo…» → «Solo il DM»");

  await page.locator("#demo-role").selectOption("player");
  await page.waitForTimeout(250);
  const before = { ...tokenOf(await saved(), "livia") };
  await drag("livia", 120, 0);
  s = await saved();
  const message = await page.locator("#map-message").textContent();
  check(tokenOf(s, "livia").x === before.x && /solo il DM/.test(message), `drag not refused: ${JSON.stringify(tokenOf(s, "livia"))} «${message}»`);
  await hit("livia").focus();
  await page.keyboard.press("ArrowRight");
  const keyMessage = await page.locator("#map-message").textContent();
  check(/Questo gruppo lo muove solo il DM\./.test(keyMessage), "keyboard not refused: " + keyMessage);
  await page.locator("#battle-map").screenshot({ path: shots + "r3-groups-refused-it.png" });
  passed.push(`Player: dragging Livia or pressing an arrow on her is refused with «${keyMessage.trim()}»; she stays put`);

  await page.locator("#demo-role").selectOption("dm");
  await page.waitForTimeout(200);
  const liviaToken = tokenOf(await saved(), "livia").id;
  await movers("listed", [liviaToken]);
  await page.locator("#demo-role").selectOption("player");
  await page.waitForTimeout(250);
  s = await saved();
  const goblinBefore = { ...tokenOf(s, "goblin-1") };
  await drag("livia", 0, 100);
  await page.waitForTimeout(300);
  s = await saved();
  check(tokenOf(s, "livia").y > before.y + 60, "Livia did not move");
  check(Math.abs(tokenOf(s, "goblin-1").y - goblinBefore.y - (tokenOf(s, "livia").y - before.y)) < 2, "the Sentinella did not follow: " + JSON.stringify([tokenOf(s, "goblin-1"), goblinBefore]));
  passed.push("DM: «Il DM e chi controlla: Livia»; Player: dragging Livia moves the whole group, the Sentinella (a DM creature) included");
  check(!errors.length, "page errors: " + errors.join(" | "));
  return passed.join("\n");
}
