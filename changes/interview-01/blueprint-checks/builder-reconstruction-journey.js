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
  await button("Ricostruisci una scheda").click()
  await field("identity.name").fill("Iria")
  const draftId = (await saved()).characterDrafts.at(-1).id
  await section("class").click()
  await field("classes.0.classId").selectOption("wizard")
  await field("classes.0.level").fill("3")
  await button("Aggiorna scelte e PF").click()
  await field("classes.0.subclassId").selectOption("evoker")
  await field("hp.maxHp").fill("22")
  await field("hp.currentHp").fill("8")
  await field("hp.tempHp").fill("2")
  await field("hp.currentKnown").check()
  await field("hp.hitDiceUsed.d6").fill("1")
  await section("abilities").click()
  await page.locator("[data-builder-method]").selectOption("manual")
  await button("Cambia metodo").click()
  for (const [key, value] of Object.entries({
    str: 10,
    dex: 14,
    con: 14,
    int: 16,
    wis: 12,
    cha: 10,
  }))
    await field("abilities.scores." + key).fill(String(value))
  await field("abilities.source").fill("Valori della scheda sintetica esistente")
  await section("spells").click()
  await field("spells.slotUses.1").fill("2")
  await field("spells.slotUses.2").fill("1")
  await section("equipment").click()
  await field("equipment.confirmed").check()
  await section("review").click()
  check(
    await button("Crea scheda").isEnabled(),
    "Reconstruction blocked unexpectedly: " +
      (await page.locator(".builder-errors").allTextContents()),
  )
  const countBefore = Object.keys((await saved()).actors).length
  await button("Crea scheda").click()
  check(
    Object.keys((await saved()).actors).length === countBefore,
    "Incomplete reconstruction applied without acknowledging missing data",
  )
  await page.locator("[data-builder-accept-incomplete]").check()
  await button("Crea scheda").click()
  await page.getByRole("heading", { name: "Iria", exact: true }).waitFor()
  let state = await saved(),
    actor =
      state.actors[
        await page.evaluate(() => new URLSearchParams(location.hash.split("?")[1]).get("id"))
      ]
  check(
    actor.hp === 8 && actor.maxHp === 22 && actor.tempHp === 2,
    "Reconstruction healed or invented HP",
  )
  check(
    actor.spellSlots[1].used === 2 && actor.spellSlots[2].used === 1 && actor.hitDice.d6.used === 1,
    "Reconstruction refreshed spent resources",
  )
  check(actor.inventory.length === 0, "Reconstruction granted free equipment")
  check(
    (state.characterBuildRolls || []).every((roll) => roll.draftId !== draftId),
    "Manual score entry fabricated dice",
  )
  await page.locator('[data-character-tab="spells"]').click()
  await page.getByRole("heading", { name: "Magie", exact: true }).waitFor()
  check(
    (await page.locator("#content").innerText()).includes("Slot di livello 2: 1 / 2"),
    "Sheet does not expose canonical second-level slots",
  )
  await page.locator('[data-character-action="slots"][data-pool="2"]').click()
  await page.locator("#dialog [name=max]").fill("1")
  await page.locator("#dialog [name=used]").fill("2")
  await button("Registra correzione").click()
  check(
    (await page.locator("#content").innerText()).includes("Eccedenza conservata: 1"),
    "Overuse hidden or reset",
  )
  await page.reload()
  state = await saved()
  check(state.actors[actor.id].spellSlots[2].used === 2, "Reload reset overuse")
  passed.push(
    "known-sheet reconstruction explicitly acknowledges unknown history",
    "current HP, temporary HP, spent slots and Hit Dice retained without new equipment",
    "per-level slot correction preserves overuse across reload",
  )
  errors.push(...(await page.evaluate(() => window.__builderErrors || [])))
  check(errors.length === 0, errors.join("; "))
  return { passed, errors }
}
