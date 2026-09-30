async (page) => {
  const errors = [],
    passed = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.addInitScript(() => {
    window.__spatialErrors = []
    window.addEventListener("error", (e) => window.__spatialErrors.push(e.message))
  })
  await page.route("**/*.mjs", (r) => r.continue())
  await page.goto("http://127.0.0.1:8879/#preparation")
  await page.evaluate(() => localStorage.removeItem("d20-studio-blueprint-v1"))
  await page.reload()
  await page.setViewportSize({ width: 1440, height: 1050 })
  const button = (name) => page.getByRole("button", { name, exact: true })
  const check = (v, m) => {
    if (!v) throw Error(m)
  }
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")))
  const clickMap = async (selector, x, y) => {
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    )
    await page.locator(selector).scrollIntoViewIfNeeded()
    const p = await page.locator(selector).evaluate(
      (svg, { x, y }) => {
        const p = svg.createSVGPoint()
        p.x = x
        p.y = y
        const q = p.matrixTransform(svg.getScreenCTM())
        return { x: q.x, y: q.y }
      },
      { x, y },
    )
    await page.mouse.click(p.x, p.y)
  }
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm")
  await button("Nuova scena").click()
  await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Cortile delle due porte")
  await button("Crea bozza").click()
  await page.locator("[name=gridSnap]").uncheck()
  const prep = "[data-prep-interactive]"
  for (const [id, x, y] of [
    ["livia", 300, 350],
    ["goblin-1", 540, 350],
  ]) {
    await page
      .getByRole("combobox", { name: "Personaggio o creatura", exact: true })
      .selectOption(id)
    await button("Posiziona sulla mappa").click()
    await clickMap(prep, x, y)
  }
  await button("Muro").click()
  await clickMap(prep, 350, 100)
  await page.keyboard.press("Escape")
  check(
    (await page.locator(".spatial-list [data-spatial-select]").count()) === 0,
    "Escape authored wall",
  )
  await clickMap(prep, 350, 100)
  await clickMap(prep, 350, 300)
  await button("Porta").click()
  await clickMap(prep, 350, 300)
  await clickMap(prep, 350, 400)
  check(
    (await page.locator("[name=interactionRangeMeters]").inputValue()) === "1.5",
    "Door range missing",
  )
  await button("Terreno difficile").click()
  await clickMap(prep, 400, 300)
  await clickMap(prep, 500, 400)
  await button("Calibra scala").click()
  await clickMap(prep, 100, 500)
  await clickMap(prep, 200, 500)
  await page.locator("[name=knownMeters]").fill("3")
  check(
    (await page.locator("[name=gridSize]").inputValue()) === "50",
    "Calibration mutated before apply",
  )
  await button("Applica scala alla bozza").click()
  await button("Salva preparazione").click()
  let data = await saved(),
    scene = data.scenes.find((s) => s.name === "Cortile delle due porte")
  check(
    scene.walls.length === 2 &&
      scene.terrain.length === 1 &&
      scene.walls[1].interactionRangeMeters === 1.5,
    "Authored geometry lost",
  )
  passed.push("cancel drawing spends nothing", "wall door terrain and calibrated scale save")
  // Refreshed by R3 (27/09/2026): with the encounter builder built, the scene's encounter lives
  // in «Incontro della scena» (B19) and «Avvia combattimento» at the Table opens the start
  // dialog (P5 roll call); the scene is activated from its own Preparation command.
  await page.locator(`[data-prep-activate="${scene.id}"]`).click()
  await page.locator('#dialog button[type="submit"]').click()
  await page.waitForTimeout(300)
  check((await saved()).activeSceneId === scene.id, "Scene not active")
  await page.goto("http://127.0.0.1:8879/#table")
  await page.locator("#battle-map").waitFor()
  await button("Avvia combattimento").click()
  const start = page.locator("#dialog")
  await start.locator("[data-ct-start-natural]").first().waitFor()
  for (const [id, natural] of [
    ["livia", 18],
    ["goblin-1", 12],
  ]) {
    await start.locator('[data-ct-start-include="' + id + '"]').check()
    await start.locator('[data-ct-start-natural="' + id + '"]').fill(String(natural))
    await start.locator('[data-ct-start-natural="' + id + '"]').press("Tab")
  }
  for (const id of ["doran", "goblin-2", "mira"])
    if (await start.locator('[data-ct-start-include="' + id + '"]').count())
      await start.locator('[data-ct-start-include="' + id + '"]').uncheck()
  await start.getByRole("button", { name: "Inizia combattimento", exact: true }).click()
  await page.locator("#battle-map").waitFor()
  check((await saved()).combat.active, "Combat not started")
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("player")
  // P6 TV-01: a Move is a drag from the token and follows the route around walls. Dragged
  // through the closed door, Livia walks around its end: no leg crosses the door, and the
  // detour costs more than the straight 3,9 m. Undo brings her back beside the door.
  const liviaAt = await page.locator('#battle-map [data-actor="livia"] .token-hit').boundingBox()
  const target = await page.locator("#battle-map").evaluate((svg) => {
    const p = svg.createSVGPoint()
    p.x = 430
    p.y = 350
    const q = p.matrixTransform(svg.getScreenCTM())
    return { x: q.x, y: q.y }
  })
  await page.mouse.move(liviaAt.x + liviaAt.width / 2, liviaAt.y + liviaAt.height / 2)
  await page.mouse.down()
  await page.mouse.move(target.x, target.y, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  data = await saved()
  const route = data.movements.at(-1)?.path ?? []
  const door = data.scenes.find((s) => s.id === scene.id).walls.find((w) => w.kind === "door")
  const throughDoor = route.slice(1).some((b, i) => {
    const a = route[i]
    if ((a.x - door.a.x) * (b.x - door.a.x) > 0) return false
    const y = a.y + ((b.y - a.y) * (door.a.x - a.x)) / (b.x - a.x || 1)
    return y > door.a.y + 1 && y < door.b.y - 1
  })
  check(
    route.length > 2 && !throughDoor && 9 - data.actors.livia.movement > 3.9,
    "Closed door allowed movement: " + JSON.stringify(route),
  )
  await button("Annulla ultima modifica").click()
  data = await saved()
  check(data.actors.livia.movement === 9, "Undo of the detour failed")
  await page.locator("[data-door]").click()
  await button("Apri con Livia").click()
  data = await saved()
  check(
    data.scenes.find((s) => s.id === scene.id).walls[1].doorState === "open" &&
      data.actors.livia.objectInteractionUsed &&
      !data.actors.livia.action === false,
    "Open door cost incorrect",
  )
  passed.push(
    "a Move dragged at a closed door walks around it, never through (P6 TV-01); Undo restores",
    "door opens using first object interaction",
  )
  await button("Pianifica percorso").click()
  await clickMap("#battle-map", 390, 350)
  await clickMap("#battle-map", 450, 350)
  check((await saved()).actors.livia.movement === 9, "Planning spent movement")
  await page.locator('[data-path-edit="0"]').click()
  await page.locator("[name=x]").fill("390")
  await page.locator("[name=y]").fill("350")
  await button("Aggiorna punto").click()
  await page.locator('[data-path-edit="1"]').click()
  await page.locator("[name=x]").fill("450")
  await page.locator("[name=y]").fill("350")
  await button("Aggiorna punto").click()
  check(
    (await page.locator("#map-message").innerText()).includes("Costo movimento"),
    "Cost breakdown absent",
  )
  await page.waitForFunction(()=>!document.querySelector("#toast").classList.contains("shown"));
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/spatial-path-preview.png",
    fullPage: true,
  })
  await button("Esegui percorso").click()
  data = await saved()
  check(
    data.actors.livia.movement < 3.1 && data.actors.livia.movement > 2.8,
    "Terrain path cost wrong: " + data.actors.livia.movement,
  )
  check(data.movements.at(-1).status === "resolved", "Waypoint movement unresolved")
  passed.push("waypoints editable without spend", "terrain path executed at double terrain cost")
  await button("Annulla ultima modifica").click()
  data = await saved()
  check(data.actors.livia.movement === 9, "Undo movement failed")
  passed.push("undo restores position and movement")
  await button("Pianifica percorso").click()
  await page.locator("#battle-map").focus()
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("Enter")
  check((await page.locator("[data-path-edit]").count()) === 1, "Keyboard waypoint missing")
  await page.keyboard.press("Escape")
  check((await page.locator("[data-path-edit]").count()) === 0, "Escape keeps plan")
  passed.push("keyboard planning and Escape")
  check(errors.length === 0, errors.join(";"))
  check((await page.evaluate(() => window.__spatialErrors)).length === 0, "Window errors")
  return { passed, errors }
}
