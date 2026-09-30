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
  await button("Crea personaggio").click()
  await field("identity.name").fill("Bozza dei dadi")
  await section("abilities").click()
  await page.locator("[data-builder-method]").selectOption("point-buy")
  await button("Cambia metodo").click()
  for (const id of ["str", "dex", "con", "int", "wis", "cha"])
    await field("abilities.scores." + id).fill("15")
  check(
    (await page.locator("[data-builder-point-count]").innerText()).includes("-27"),
    "Overspending counter not exposed",
  )
  await section("review").click()
  check(await button("Crea scheda").isDisabled(), "Overspending created valid sheet")
  passed.push("point-buy overspending visible and cannot apply")
  await section("abilities").click()
  await page.locator("[data-builder-method]").selectOption("roll")
  await button("Cambia metodo").click()
  await page
    .locator('[data-builder-roll="abilities"][data-index="0"][data-mode="physical"]')
    .click()
  await button("Registra facce naturali").click()
  let state = await saved(),
    draft = state.characterDrafts.at(-1)
  check(draft.rolls.at(-1).status === "pending", "Missing physical faces became a result")
  for (const [index, face] of [6, 5, 2, 1].entries())
    await page.locator('[data-builder-face][data-index="' + index + '"]').fill(String(face))
  await button("Registra facce naturali").click()
  state = await saved()
  draft = state.characterDrafts.at(-1)
  check(draft.rolls.at(-1).total === 13, "4d6 drop-lowest arithmetic wrong")
  check(
    state.characterBuildRolls.at(-1).values.join(",") === "6,5,2,1",
    "Physical faces absent from durable ledger",
  )
  check(state.log.at(-1).visibility === "private", "Draft roll leaked shared audit")
  await page.locator('[data-builder-roll="abilities"][data-index="1"][data-mode="digital"]').click()
  state = await saved()
  check(state.characterBuildRolls.at(-1).values.length === 4, "Digital faces missing")
  await page.reload()
  check((await saved()).characterBuildRolls.length === 2, "Reload changed accepted dice")
  passed.push(
    "physical empty faces rejected",
    "physical and digital accepted faces survive reload privately",
  )
  await section("identity").click()
  await field("identity.name").fill("Modifica non salvata")
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm")
  await button("Scarta solo le modifiche non salvate").click()
  await page.getByRole("heading", { name: "Personaggi", exact: true }).waitFor()
  check(
    !(await page.locator("#content").innerText()).includes("Bozza dei dadi"),
    "DM sees another identity draft",
  )
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("player")
  const id = draft.id
  await page.locator('[data-character-action="resume-build"][data-draft="' + id + '"]').click()
  check(
    (await field("identity.name").inputValue()) === "Bozza dei dadi",
    "Discard unsaved lost saved draft or retained unsaved name",
  )
  passed.push("identity switch protects dirty draft and private resumption")
  await page.getByRole("button", { name: "Preferenze", exact: true }).click()
  await page.locator("[name=lang]").selectOption("en")
  await button("Salva preferenze").click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  )
  check(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    "Builder mobile horizontal overflow",
  )
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/builder-mobile-en.png",
    fullPage: true,
  })
  passed.push("English mobile navigation without page overflow")
  errors.push(...(await page.evaluate(() => window.__builderErrors || [])))
  check(errors.length === 0, errors.join("; "))
  return { passed, errors }
}
