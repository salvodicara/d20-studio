async (rootPage) => {
  // Increment 10 closure: token status badges (Prone, Unconscious, dying, dead, several
  // conditions) are readable on the token rim at 1440 and 390; the inspector keeps the
  // full list. Synthetic state built in-page through the conditions domain.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const dir =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/inc10-closure/";
  const passed = [],
    errors = [],
    findings = [],
    measures = {};
  const check = (c, m) => {
    if (!c) throw Error(m);
  };
  async function prepare(page, lang, role) {
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/*.mjs", (route) => route.continue());
    await page.goto("http://127.0.0.1:8879/");
    await page.evaluate(async () => {
      const { createInitialState } = await import("/state.mjs");
      const c = await import("/conditions.mjs");
      const s = createInitialState();
      const src = { kind: "authored-demo", edition: "2024", revision: "badge-journey" };
      const apply = (actorId, conditionId) =>
        c.applyConditionEvent(s, {
          eventId: "badge-" + actorId + "-" + conditionId,
          kind: "apply",
          actorId,
          conditionId,
          source: src,
          immunityConfirmed: true,
        });
      apply("livia", "prone");
      // Doran drops to 0 HP (death saves); the first Sentinel dies at 0 HP.
      for (const id of ["doran", "goblin-1"])
        c.applyVitalityEvent(s, {
          eventId: "badge-zero-" + id,
          actorId: id,
          kind: "damage",
          amount: s.actors[id].hp,
          source: src,
        });
      for (const id of ["poisoned", "frightened", "restrained"]) apply("goblin-2", id);
      localStorage.setItem("d20-studio-blueprint-v1", JSON.stringify(s));
    });
    await page.goto("http://127.0.0.1:8879/#table");
    await page.reload();
    if (lang === "en") {
      await page.locator('[data-service="preferences"]').click();
      await page.locator('#dialog [name="lang"]').selectOption("en");
      await page.locator('#dialog button[type="submit"]').click();
    }
    await page.locator("#demo-role").selectOption(role);
    await page.locator("#battle-map .token-status").first().waitFor();
  }
  // On-screen size of every badge and of its glyph, and whether a badge covers the
  // token's letter (it must sit on the rim, not over the initial).
  const badges = (page) =>
    page.locator("#battle-map .map-token").evaluateAll((tokens) =>
      tokens
        .filter((t) => t.querySelector(".token-status"))
        .map((t) => {
          const badge = t.querySelector(".token-status"),
            circle = badge.querySelector("circle"),
            glyph = badge.querySelector("text"),
            letter = t.querySelector(".token-display > text").getBoundingClientRect(),
            b = circle.getBoundingClientRect(),
            g = glyph.getBoundingClientRect(),
            style = getComputedStyle(circle);
          return {
            actor: t.dataset.actor,
            status: badge.dataset.tokenStatus,
            label: t.getAttribute("aria-label"),
            title: badge.querySelector("title")?.textContent,
            diameter: Math.round(b.width * 10) / 10,
            glyph: glyph.textContent,
            glyphHeight: Math.round(g.height * 10) / 10,
            fill: style.fill,
            overlapsLetter: !(
              b.right <= letter.left ||
              b.left >= letter.right ||
              b.bottom <= letter.top ||
              b.top >= letter.bottom
            ),
          };
        }),
    );
  const browser = rootPage.context().browser();

  // Desktop, Italian.
  let context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  let page = await context.newPage();
  await prepare(page, "it", "dm");
  let list = await badges(page);
  measures.desktop = list;
  const by = (l, id) => l.find((x) => x.actor === id);
  check(
    by(list, "livia")?.status === "conditions" &&
      by(list, "doran")?.status === "dying" &&
      by(list, "goblin-1")?.status === "dead" &&
      by(list, "goblin-2")?.glyph === "3",
    "Badge states wrong: " + JSON.stringify(list),
  );
  check(
    list.every((x) => x.diameter >= 18 && x.glyphHeight >= 11 && !x.overlapsLetter),
    "Desktop badges too small or over the initial: " + JSON.stringify(list),
  );
  check(
    new Set(list.map((x) => x.fill)).size >= 3,
    "Dead, dying and condition badges are not distinguishable by colour",
  );
  check(
    /Prono/.test(by(list, "livia").title) && /Morente/.test(by(list, "doran").label),
    "Badge names missing from title/accessible label",
  );
  await page.locator("#battle-map").screenshot({ path: dir + "badges-desktop-it.png" });
  // Full list in the inspector: select the three-condition Sentinel.
  await page.locator('#battle-map [data-actor="goblin-2"]').click();
  const inspector = await page.locator(".table-inspector").innerText();
  check(
    ["Avvelenato", "Spaventato", "Trattenuto"].every((n) => inspector.includes(n)),
    "Inspector does not list every condition: " + inspector.slice(0, 300),
  );
  await page.screenshot({ path: dir + "badges-desktop-inspector-it.png" });
  passed.push(
    "1440: dead, dying and condition badges sit on the token rim with distinct colours and readable glyphs; the inspector lists every condition",
  );
  await context.close();

  // Phone, English, touch.
  context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  page = await context.newPage();
  // The player sees the same public badges; the DM's wider toolbar is checked below.
  await prepare(page, "en", "player");
  // Refreshed by the round-2 regression (29/09/2026): P6 TV-06 (TouchVTT, Roll20 tablet)
  // draws a Medium token no wider than its cell on a phone, and the phone opens on the whole
  // scene, so at that view every token, its initial and its badge are small together (the
  // badge keeps its size relative to the token, as status markers drawn on the token do in
  // Foundry and Roll20). The badge stays on the rim there; readability is checked once the
  // player has zoomed with the map's own «+» until a cell is a 44 px finger target (the size
  // P6 gives the touch target), which is where tokens themselves are read.
  list = await badges(page);
  measures.phoneWholeScene = list;
  check(
    list.length === 4 && list.every((x) => !x.overlapsLetter),
    "Phone badges missing or over the initial: " + JSON.stringify(list),
  );
  const cellPx = () =>
    page.evaluate(() => 50 * (document.querySelector("#battle-map").getScreenCTM()?.a ?? 1));
  for (let taps = 0; taps < 10 && (await cellPx()) < 44; taps++) {
    await page.locator('[data-table="zoom-in"]').tap();
    await page.waitForTimeout(150);
  }
  measures.phoneCellPx = Math.round((await cellPx()) * 10) / 10;
  check(measures.phoneCellPx >= 44, "Zoom in did not reach a 44 px cell: " + measures.phoneCellPx);
  list = await badges(page);
  measures.phone = list;
  check(
    list.every((x) => x.diameter >= 14 && x.glyphHeight >= 9 && !x.overlapsLetter),
    "Phone badges too small or over the initial: " + JSON.stringify(list),
  );
  await page.locator('[data-table="fit"]').tap();
  await page.waitForTimeout(150);
  // A mobile layout viewport grows to fit wide content, so compare against 390 itself
  // and name the outermost elements that stick out.
  const overflow = () =>
    page.evaluate(() => ({
      width: document.documentElement.scrollWidth - 390,
      wide: [...document.querySelectorAll("#app *")]
        .filter((n) => n.getBoundingClientRect().right > 391)
        .filter((n) => !(n.parentElement?.getBoundingClientRect().right > 391))
        .map((n) => n.tagName + "." + String(n.className?.baseVal ?? n.className))
        .slice(0, 4),
    }));
  const playerOverflow = await overflow();
  check(
    playerOverflow.width <= 0,
    "Page overflows horizontally at 390: " + JSON.stringify(playerOverflow),
  );
  await page.locator("#battle-map").screenshot({ path: dir + "badges-phone-en.png" });
  await page.locator('#battle-map [data-actor="livia"]').tap();
  const label = await page.locator('#battle-map [data-actor="livia"] .token-status-label');
  check((await label.textContent()).includes("Prone"), "Selected token does not name Prone");
  await page.screenshot({ path: dir + "badges-phone-selected-en.png" });
  passed.push(
    "390: badges stay readable on the rim, the selected token names its condition, no overflow",
  );
  // Outside the badge scope: the DM Table toolbar at 390 (reported, not asserted here).
  await page.locator("#demo-role").selectOption("dm");
  const dmOverflow = await overflow();
  if (dmOverflow.width > 0)
    findings.push("DM Table at 390 is wider than the screen: " + JSON.stringify(dmOverflow));
  await context.close();
  check(errors.length === 0, errors.join("; "));
  return { passed, findings, errors, measures };
}
