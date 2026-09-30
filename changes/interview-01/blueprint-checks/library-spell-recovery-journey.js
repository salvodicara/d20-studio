async (page) => {
  const errors = [],
    passed = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.__libraryErrors = [];
    window.addEventListener("error", (event) => window.__libraryErrors.push(event.message));
  });
  await page.route("**/*.mjs", (route) => route.continue());
  await page.goto("http://127.0.0.1:8879/#characters");
  await page.reload();
  const fixture = await page.evaluate(async () => {
    const s = await import("/state.mjs"),
      b = await import("/character-build.mjs"),
      h = await import("/homebrew.mjs"),
      i = await import("/homebrew-integration.mjs");
    const state = s.createInitialState();
    state.actors.livia.visibility = "private";
    state.actors.livia.campaignIds = [];
    const definition = (id, ref, max) => {
      h.createHomebrewDraft(
        state,
        { id, kind: ref ? "revise" : "create", type: "spell", ref },
        "player",
      );
      const draft = h.getHomebrewDraft(state, id, "player");
      h.saveHomebrewDraft(
        state,
        id,
        {
          data: {
            ...draft.data,
            name: { it: "Luce guida", en: "Guiding light" },
            description: { it: "Esempio originale manuale", en: "Original manual example" },
            source: { ...draft.data.source, label: "Original synthetic fixture" },
            resource: { id: "spark", max, recovery: "manual" },
          },
        },
        "player",
      );
      const p = h.previewHomebrewDraft(state, id, "player");
      if (!p.canApply) throw Error(JSON.stringify(p.errors));
      return h.applyHomebrewDraft(state, id, { reviewKey: p.reviewKey }, "player").ref;
    };
    const ref = definition("spell", null, 3);
    b.createCharacterDraft(state, { id: "setup", kind: "revise", actorId: "livia" }, "player");
    let draft = b.getCharacterDraft(state, "setup", "player");
    draft.data.classes = [{ classId: "wizard", level: 1, subclassId: null }];
    draft.data.origin.backgroundId = "sage";
    draft.data.origin.backgroundBonuses = {};
    draft.data.origin.choices = { magicInitiateAbility: "wis" };
    draft.data.hp = { mode: "manual", maxHp: 22, perLevel: {}, currentKnown: true };
    b.saveCharacterDraft(
      state,
      "setup",
      { data: draft.data, expectedRevision: draft.revision },
      "player",
    );
    const selected = i.addHomebrewToCharacterDraft(
      state,
      ref,
      { page: "builder", draftId: "setup", section: "spells", grantId: "class:wizard" },
      "player",
    );
    draft = b.getCharacterDraft(state, "setup", "player");
    draft.data.spells.selected.push({
      id: selected.instanceId,
      grantId: "background:magic-initiate",
    });
    b.saveCharacterDraft(
      state,
      "setup",
      { data: draft.data, expectedRevision: draft.revision },
      "player",
    );
    let p = b.previewCharacterDraft(state, "setup", "player");
    if (!p.canApply) throw Error(JSON.stringify(p.errors));
    b.applyCharacterDraft(
      state,
      "setup",
      { operationId: "setup", reviewKey: p.reviewKey, allowIncomplete: true },
      "player",
    );
    const actor = state.actors.livia,
      first = actor.spells.find((row) => row.homebrewRef && row.grantId === "class:wizard"),
      second = actor.spells.find(
        (row) => row.homebrewRef && row.grantId === "background:magic-initiate",
      );
    first.used = 1;
    second.used = 2;
    const nextRef = definition("revision", ref, 4);
    h.createHomebrewDraft(
      state,
      { id: "update", kind: "update", actorId: "livia", instanceId: first.id, ref: nextRef },
      "player",
    );
    p = h.previewHomebrewDraft(state, "update", "player");
    if (!p.canApply) throw Error(JSON.stringify(p.errors));
    i.applyLibraryDraftToCharacter(state, "update", p.reviewKey, "player");
    const updated = actor.spells.find((row) => row.id === first.id);
    updated.used = 3;
    localStorage.setItem("d20-studio-blueprint-v1", JSON.stringify(state));
    return { firstId: updated.id, secondId: second.id, catalogId: updated.catalogId, nextRef };
  });
  await page.goto("http://127.0.0.1:8879/#characters?id=livia&tab=spells");
  await page.reload();
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const button = (name) => page.getByRole("button", { name, exact: true });
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const section = (id) => page.locator('.builder-sections [data-builder-section="' + id + '"]');
  const apply = async () => {
    await section("review").click();
    check(
      await page.locator("[data-builder-apply]").isEnabled(),
      "Recovery review blocked: " + (await page.locator("#content").innerText()),
    );
    await page.locator("[data-builder-accept-incomplete]").check();
    await page.locator("[data-builder-apply]").click();
    await page.getByRole("heading", { name: "Livia", exact: true, level: 1 }).waitFor();
  };
  await button("Rivedi scelte").click();
  await section("spells").click();
  await page
    .locator('[data-builder-spell="' + fixture.catalogId + '"][data-grant="class:wizard"]')
    .uncheck();
  await apply();
  check(
    !(await saved()).actors.livia.spells.some((row) => row.id === fixture.firstId),
    "Removed grant stayed in spell list",
  );
  await page.reload();
  await button("Rivedi scelte").click();
  await section("spells").click();
  await page
    .locator('[data-builder-spell="' + fixture.catalogId + '"][data-grant="class:wizard"]')
    .check();
  await apply();
  await page.reload();
  const actor = (await saved()).actors.livia,
    first = actor.spells.find((row) => row.id === fixture.firstId),
    second = actor.spells.find((row) => row.id === fixture.secondId);
  check(
    first?.used === 3 &&
      first.max === 4 &&
      first.homebrewRef.revisionId === fixture.nextRef.revisionId,
    "Actual reselect regenerated identity or replenished uses",
  );
  check(second?.used === 2 && second.max === 3, "Reselect changed the other grant");
  passed.push(
    "with a domain-generated two-grant fixture, actual builder removal, reload and reselect preserve updated instance identity and3 spent uses",
    "the other granting source keeps its original revision, maximum3 and2 spent uses",
  );
  errors.push(...(await page.evaluate(() => window.__libraryErrors || [])));
  check(!errors.length, errors.join("; "));
  return { passed, errors };
}
