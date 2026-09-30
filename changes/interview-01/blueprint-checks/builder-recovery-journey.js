async (page) => {
  const errors = [],
    passed = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.addInitScript(() => {
    window.__builderErrors = []
    window.addEventListener("error", (event) => window.__builderErrors.push(event.message))
  })
  await page.route("**/*.mjs", (route) => route.continue())
  await page.goto("http://127.0.0.1:8879/#characters")
  await page.reload()
  await page.setViewportSize({ width: 1440, height: 1000 })
  const button = (name) => page.getByRole("button", { name, exact: true })
  const field = (path) => page.locator('[data-builder-path="' + path + '"]')
  const section = (id) => page.locator('.builder-sections [data-builder-section="' + id + '"]')
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")))
  const check = (condition, message) => {
    if (!condition) throw Error(message)
  }
  await button("Ripristina esempio").click()
  await button("Ripristina").click()
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("player")
  await button("Crea personaggio").click()
  await field("identity.name").fill("Prova cambio idea")
  await section("class").click()
  await field("classes.0.classId").selectOption("wizard")
  await section("spells").click()
  await page.locator('[data-builder-spell="shield"][data-grant="class:wizard"]').check()
  await page.locator('[data-builder-prepare="shield"][data-grant="class:wizard"]').check()
  await section("class").click()
  await field("classes.0.classId").selectOption("fighter")
  await section("spells").click()
  await page.locator('[data-builder-remove-spell="shield"][data-grant="class:wizard"]').click()
  await button("Salva bozza").click()
  let draft = (await saved()).characterDrafts.at(-1)
  check(
    !draft.data.spells.selected.some((s) => s.id === "shield") &&
      !draft.data.spells.prepared.some((s) => s.id === "shield"),
    "Obsolete spell grant cannot be removed",
  )
  passed.push("changing class exposes obsolete spell grant and removes its preparation together")
  await section("origin").click()
  await field("origin.backgroundId").selectOption("criminal")
  await field("origin.backgroundBonuses.dex").fill("2")
  await field("origin.backgroundBonuses.con").fill("1")
  await field("origin.backgroundId").selectOption("sage")
  check(
    await field("origin.backgroundBonuses.dex").isEditable(),
    "Incompatible old bonus is locked",
  )
  await field("origin.backgroundBonuses.dex").fill("0")
  await field("origin.backgroundBonuses.int").fill("2")
  await button("Salva bozza").click()
  draft = (await saved()).characterDrafts.at(-1)
  check(
    draft.data.origin.backgroundBonuses.dex === 0 && draft.data.origin.backgroundBonuses.int === 2,
    "Background bonuses cannot be reassigned",
  )
  passed.push("changing background preserves and exposes incompatible bonus for correction")
  await section("abilities").click()
  await page.locator("[data-builder-method]").selectOption("roll")
  await button("Cambia metodo").click()
  await page
    .locator('[data-builder-roll="abilities"][data-index="0"][data-mode="physical"]')
    .click()
  for (const [index, face] of [6, 5, 3].entries())
    await page.locator('[data-builder-face][data-index="' + index + '"]').fill(String(face))
  await button("Registra facce naturali").click()
  check(
    (
      await page.locator("[data-builder-face]").evaluateAll((nodes) => nodes.map((n) => n.value))
    ).join(",") === "6,5,3,",
    "Rejected physical input erased valid faces",
  )
  check(
    ((await saved()).characterBuildRolls || []).length === 0,
    "Incomplete roll became accepted evidence",
  )
  await page.locator('[data-builder-face][data-index="3"]').fill("1")
  await button("Registra facce naturali").click()
  const roll = (await saved()).characterBuildRolls.at(-1)
  check(
    roll.total === 14 && roll.values.join(",") === "6,5,3,1",
    "Correcting only missing face cannot resolve the pending roll",
  )
  passed.push(
    "invalid physical roll retains entered faces; completing only missing face resolves once",
  )
  errors.push(...(await page.evaluate(() => window.__builderErrors || [])))
  check(!errors.length, errors.join("; "))
  return { passed, errors }
}
