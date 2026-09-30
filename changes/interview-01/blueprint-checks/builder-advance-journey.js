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
  let state = await saved()
  const id = state.characterDrafts.find(
    (d) => d.kind === "create" && d.status === "applied" && d.data.identity.name === "Neris",
  )?.result.actorId
  check(id, "Run builder-journey.js first")
  await page.locator('[data-character-action="open"][data-actor="' + id + '"]').click()
  // HP corrections go through Conditions and status (increment 10): Correct, preview, apply.
  const correctHP = async (hp) => {
    await page.locator('#content [data-conditions-entry="' + id + '"]').click()
    await page.locator('#dialog [data-conditions-command="correct"]').click()
    await page.locator('#dialog [data-conditions-field="hp"]').fill(String(hp))
    await page
      .locator('#dialog [data-conditions-field="reason"]')
      .fill("Danno sintetico di verifica")
    await page.locator("#dialog [data-conditions-preview]").click()
    await page.locator("#dialog [data-conditions-apply]").click()
    await page.locator("#dialog footer [data-close]").click()
    check((await saved()).actors[id].hp === hp, "HP correction not applied")
  }
  await correctHP(4)
  const inventory = JSON.stringify((await saved()).actors[id].inventory)
  await button("Avanza di livello").click()
  const draftId = (await saved()).characterDrafts.at(-1).id
  await section("class").click()
  await field("classes.0.level").fill("2")
  await button("Salva bozza").click()
  await field("hp.perLevel.2.method").selectOption("fixed")
  await button("Salva bozza").click()
  await button("Torna alla scheda").click()
  await page.getByRole("heading", { name: "Neris", exact: true }).waitFor()
  await correctHP(2)
  await page.locator('[data-nav="characters"]').click()
  await page.locator('[data-character-action="resume-build"][data-draft="' + draftId + '"]').click()
  await section("review").click()
  check(
    await button("Applica alla scheda").isEnabled(),
    "Advance blocked: " + (await page.locator(".builder-errors").allTextContents()),
  )
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/inc10-closure/builder-advancement.png",
    fullPage: true,
  })
  if (await page.locator("[data-builder-accept-incomplete]").count())
    await page.locator("[data-builder-accept-incomplete]").check()
  await button("Applica alla scheda").click()
  await page.getByRole("heading", { name: "Neris", exact: true }).waitFor()
  state = await saved()
  check(
    state.actors[id].level === 2 && state.actors[id].maxHp === 20,
    "Advancement level/HP formula incorrect",
  )
  check(state.actors[id].hp === 2, "Advancement healed intervening damage")
  check(
    state.actors[id].features.find((feature) => (feature.name.en || feature.name) === "Second Wind")
      .used === 1,
    "Advancement reset spent feature",
  )
  check(
    state.actors[id].backstory === "Custodisce la torre e il ponte.",
    "Advancement reverted edited biography",
  )
  check(
    JSON.stringify(state.actors[id].inventory) === inventory,
    "Advancement recreated or replaced inventory",
  )
  check(
    state.actors[id].visibility === "shared" &&
      state.actors[id].campaignIds.includes(state.campaign.id),
    "Advancement reverted campaign sharing",
  )
  await page.reload()
  check((await saved()).actors[id].hp === 2, "Reload changed applied result")
  passed.push(
    "saved advancement resumes after actual live HP correction",
    "level 1 to 2 changes maximum without healing",
    "inventory and campaign sharing preserved through apply/reload",
  )
  errors.push(...(await page.evaluate(() => window.__builderErrors || [])))
  check(errors.length === 0, errors.join("; "))
  return { passed, errors }
}
