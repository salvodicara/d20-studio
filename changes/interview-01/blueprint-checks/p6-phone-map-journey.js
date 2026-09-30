async (page) => {
  // P6 TV-06/TV-36 on a 390×844 touch phone: one finger on the empty map pans, two fingers
  // pinch-zoom, tokens stay one cell wide, the tools fold into one button and the status line
  // is readable above the action bar. Real touch events through CDP. Synthetic data only.
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P6/";
  const errors = [];
  const ctx = await page
    .context()
    .browser()
    .newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
      locale: "it-IT",
    });
  const phone = await ctx.newPage();
  phone.on("pageerror", (e) => errors.push(e.message));
  await phone.goto("http://127.0.0.1:8879/#table");
  await phone
    .getByRole("button", { name: "Ripristina esempio", exact: true })
    .tap()
    .catch(async () => {
      await phone.getByRole("button", { name: "Ripristina esempio", exact: true }).click();
    });
  await phone.getByRole("button", { name: "Ripristina", exact: true }).click();
  const map = phone.locator("#battle-map");
  await map.waitFor();
  await map.scrollIntoViewIfNeeded();
  // Visual pass 2 (30/09/2026): the phone map fills the screen above the pinned hotbar once in
  // view, through the Table's «Mappa» button (the page's top keeps the zoom row under the
  // hotbar, so tapping «Centra la scena» there made the driver centre it, 100 px past the map's
  // top). The status-line checks below are unchanged.
  await phone.locator("[data-table-map-link]").tap();
  const cdp = await ctx.newCDPSession(phone);
  const touch = async (type, points) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: points.map((p, i) => ({ x: p.x, y: p.y, id: i })),
    });
  const toScreen = async (p) =>
    map.evaluate((svg, p) => {
      const m = svg.getScreenCTM();
      return { x: m.a * p.x + m.e, y: m.d * p.y + m.f };
    }, p);
  const stored = async () =>
    phone.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const pos = async (id) => {
    const s = await stored();
    return s.scenes.find((x) => x.id === s.activeSceneId).tokens.find((t) => t.actorId === id);
  };
  const passed = [];
  // Tools folded into one button.
  const visibleTools = await phone.locator(".map-toolbar [data-tool]:visible").count();
  if (visibleTools)
    throw Error("Phone shows " + visibleTools + " tool buttons before opening the tools");
  await phone.locator("[data-map-tools-toggle]").tap();
  if (!(await phone.locator(".map-toolbar [data-tool]:visible").count()))
    throw Error("Tools button did not open the tools");
  await phone.locator("[data-map-tools-toggle]").tap();
  passed.push("tools fold into one button");
  // Tokens no wider than a cell.
  const widths = await phone.evaluate(() => {
    const svg = document.querySelector("#battle-map");
    const m = svg.getScreenCTM();
    const cell = 50 * m.a;
    return [...svg.querySelectorAll(".map-token .token-display > circle:first-child")].map(
      (c) => c.getBoundingClientRect().width / cell,
    );
  });
  if (widths.some((w) => w > 1.05))
    throw Error("A Medium token is wider than a cell: " + widths.map((w) => w.toFixed(2)));
  passed.push("tokens one cell wide");
  // One finger on the empty map pans; nobody moves.
  const livia = await pos("livia");
  const before = await map.getAttribute("viewBox");
  const e0 = await toScreen({ x: 520, y: 170 });
  await touch("touchStart", [e0]);
  for (let i = 1; i <= 6; i++) await touch("touchMove", [{ x: e0.x + i * 8, y: e0.y + i * 5 }]);
  await touch("touchEnd", []);
  await phone.waitForTimeout(150);
  const after = await map.getAttribute("viewBox");
  if (after === before) throw Error("One finger did not pan");
  const l1 = await pos("livia");
  if (l1.x !== livia.x || l1.y !== livia.y) throw Error("One-finger pan moved Livia");
  passed.push("one-finger pan");
  await phone.getByRole("button", { name: "Centra la scena", exact: true }).tap();
  // Two fingers pinch-zoom.
  const mid = await toScreen({ x: 500, y: 325 });
  await touch("touchStart", [
    { x: mid.x - 40, y: mid.y },
    { x: mid.x + 40, y: mid.y },
  ]);
  for (let i = 1; i <= 6; i++)
    await touch("touchMove", [
      { x: mid.x - 40 - i * 10, y: mid.y },
      { x: mid.x + 40 + i * 10, y: mid.y },
    ]);
  await touch("touchEnd", []);
  await phone.waitForTimeout(200);
  const vb = (await map.getAttribute("viewBox")).split(" ").map(Number);
  if (!(vb[2] < 1000)) throw Error("Pinch did not zoom: " + vb);
  passed.push("pinch zoom");
  await phone.getByRole("button", { name: "Centra la scena", exact: true }).tap();
  // Drag Livia with a finger: the status line (distance) is readable, not under the bar.
  const a = await toScreen(livia);
  await touch("touchStart", [a]);
  for (let i = 1; i <= 8; i++) await touch("touchMove", [{ x: a.x + i * 9, y: a.y - i * 4 }]);
  const caption = await phone.locator("#map-message").boundingBox();
  const dock = await phone.locator(".table-hotbar").boundingBox();
  const text = await phone.locator("#map-message").textContent();
  await phone.screenshot({ path: shots + "m01-phone-drag.png" });
  await touch("touchEnd", []);
  if (!/Distanza/.test(text)) throw Error("No distance in the status line: " + text);
  const overlap =
    caption && dock && caption.y < dock.y + dock.height && caption.y + caption.height > dock.y;
  if (overlap) throw Error("Status line under the action bar: " + JSON.stringify([caption, dock]));
  if (caption.y < 0 || caption.y + caption.height > 844)
    throw Error("Status line off screen: " + JSON.stringify(caption));
  passed.push("status line readable above the bar");
  const l2 = await pos("livia");
  if (l2.x === livia.x && l2.y === livia.y) throw Error("Finger drag did not move Livia");
  passed.push("finger drag moves own token");
  // Touching an enemy never draws a path for it.
  const g = await pos("goblin-1");
  const gs = await toScreen(g);
  await touch("touchStart", [gs]);
  for (let i = 1; i <= 5; i++) await touch("touchMove", [{ x: gs.x + i * 8, y: gs.y }]);
  const pathForEnemy = await phone.locator("#preview-layer path").count();
  await touch("touchEnd", []);
  if (pathForEnemy) throw Error("A path was drawn for an enemy token");
  passed.push("enemy token never drags");
  await phone.screenshot({ path: shots + "m02-phone-table.png" });
  // TV-36: a finger measure writes its distance above the finger, readable.
  await phone.locator("[data-map-tools-toggle]").tap();
  await phone.locator('[data-tool-group="measure"]').tap();
  await phone
    .locator('.map-subtools:not([hidden]) [data-tool="measure"]')
    .tap()
    .catch(async () => {
      await phone.locator("[data-map-tools-toggle]").tap();
      await phone.locator('[data-tool="measure"]').first().tap();
    });
  const m0 = await toScreen({ x: 400, y: 400 });
  await touch("touchStart", [m0]);
  for (let i = 1; i <= 6; i++) await touch("touchMove", [{ x: m0.x + i * 14, y: m0.y - i * 6 }]);
  const finger = { x: m0.x + 84, y: m0.y - 36 };
  const label = await phone
    .locator("[data-annot-live] text.is-lifted")
    .first()
    .boundingBox()
    .catch(() => null);
  await phone.screenshot({ path: shots + "m03-phone-measure.png" });
  await touch("touchEnd", []);
  if (!label) throw Error("No lifted measure label under the finger");
  if (!(label.y + label.height < finger.y - 30))
    throw Error("Measure label not above the finger: " + JSON.stringify([label, finger]));
  if (label.height < 12) throw Error("Measure label too small to read: " + label.height);
  passed.push("finger measure label above the finger, readable");
  await ctx.close();
  if (errors.length) throw Error(errors.join(";"));
  return { passed };
}
