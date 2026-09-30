async (rootPage) => {
  // B62: a Table panel is a sub-tab of its sidebar tab (Foundry's document tabs): open that
  // tab (its own, or the one its hidden handle names), then the sub-tab. No-op when open.
  const openTablePanel = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const now = () => page.locator("#table-sidebar-panel").getAttribute("data-table-panel");
    if ((await now()) === id) return;
    if (!(await page.locator(`.table-subtabs [data-table-subtab="${id}"]`).count())) {
      const own = await page.locator(`.table-tabs [data-table-tab="${id}"]`).count();
      const section = own
        ? id
        : await page
            .locator(
              `.table-panel-index [data-table-drawer="${id}"], .table-panel-index [data-table="${id}"]`,
            )
            .first()
            .getAttribute("data-table-section-of");
      const tab = page.locator(`.table-tabs [data-table-tab="${section}"]`);
      if ((await tab.getAttribute("aria-selected")) !== "true") await press(tab);
      await page.waitForFunction(
        (s) => document.querySelector("#table-sidebar-panel")?.dataset.tableSection === s,
        section,
      );
    }
    if ((await now()) !== id)
      await press(page.locator(`.table-subtabs [data-table-subtab="${id}"]`));
    await page.waitForFunction(
      (i) => document.querySelector("#table-sidebar-panel")?.dataset.tablePanel === i,
      id,
    );
  };
  // B22 — Preferences, accessibility and units. Real clicks, keys and taps on the one app:
  // IT desktop 1440 (player and DM), EN phone 390 with touch, reload persistence, preview
  // cancel, reset undo, proposal undo, offline refusal; review fixes (24/09): sheet speed
  // and weights in the chosen unit, sheet-only without map controls, proposal notice →
  // page, lasting undo, panel fade, Table vertical fit at 90–125 %, text 150 % headings,
  // phone at 150 % text + 125 % interface. Synthetic data only; each context starts from
  // empty storage. Sounds and the wake lock are observed by wrapping the browser APIs in
  // the test page (instrumentation only, the app is unchanged).
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B22/";
  const browser = rootPage.context().browser();
  const instrument = () => {
    window.__b22 = { sounds: [], wake: [] };
    const AC = window.AudioContext;
    if (AC) {
      const source = AC.prototype.createBufferSource;
      AC.prototype.createBufferSource = function () {
        window.__b22.sounds.push("dice");
        return source.call(this);
      };
      const oscillator = AC.prototype.createOscillator;
      AC.prototype.createOscillator = function () {
        window.__b22.sounds.push("ui");
        return oscillator.call(this);
      };
    }
    const wake = navigator.wakeLock;
    if (wake?.request) {
      const request = wake.request.bind(wake);
      wake.request = async (type) => {
        const lock = await request(type);
        window.__b22.wake.push("acquired");
        lock.addEventListener("release", () => window.__b22.wake.push("released"));
        return lock;
      };
    }
  };
  const passed = [],
    errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };

  // ------------------------------------------------------------ helpers (per page)
  const helpers = (page, { touch = false } = {}) => {
    const press = (locator) => (touch ? locator.tap() : locator.click());
    const button = (name) => page.getByRole("button", { name, exact: true });
    const dialog = page.locator("#dialog");
    const root = (name) => page.evaluate((n) => document.documentElement.dataset[n] ?? null, name);
    const rootVar = (name) =>
      page.evaluate(
        (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
        name,
      );
    const setting = (key) =>
      page.evaluate((k) => localStorage.getItem("d20-studio-setting:" + k), key);
    const sounds = () => page.evaluate(() => [...window.__b22.sounds]);
    // A phone widens its layout viewport when content overflows: compare with the device
    // width, not only with innerWidth.
    const noOverflow = () =>
      page.evaluate(
        (width) => document.documentElement.scrollWidth <= width && window.innerWidth <= width,
        page.viewportSize().width,
      );
    const shot = async (name) => {
      await page.evaluate(() => document.querySelector("#toast")?.classList.remove("shown"));
      await page.screenshot({ path: dir + name + ".png" });
    };
    const toast = async (pattern) => {
      await page.waitForFunction(
        (source) => new RegExp(source).test(document.querySelector("#toast")?.textContent ?? ""),
        pattern.source,
      );
      return page.locator("#toast").innerText();
    };
    // The header gear; a click during a render is retried until the enriched dialog is open.
    const openPrefs = async () => {
      for (let i = 0; i < 6; i++) {
        if (await page.locator("#dialog[open] form[data-pref-enhanced]").count()) return;
        if (!(await dialog.evaluate((d) => d.open)))
          await press(page.locator('.service-nav [data-service="preferences"]'));
        await page.waitForTimeout(150);
      }
      throw Error("Preferences did not open");
    };
    const save = async (name = "Salva preferenze") => {
      await press(button(name));
      await page.waitForFunction(() => !document.querySelector("#dialog").open);
      await page.waitForTimeout(80);
    };
    // Scoped to the dialog: other areas render comboboxes with the same name on the page.
    const choose = (label, option) =>
      dialog.getByRole("combobox", { name: label, exact: true }).selectOption({ label: option });
    const go = async (hash) => {
      await page.goto(base + hash);
      await page.waitForFunction(() => document.querySelector(".service-nav"));
      await page.waitForTimeout(150);
    };
    const role = async (value) => {
      await page.locator("#demo-role").selectOption(value);
      await page.waitForTimeout(120);
    };
    return {
      press,
      button,
      dialog,
      root,
      rootVar,
      setting,
      sounds,
      noOverflow,
      shot,
      toast,
      openPrefs,
      save,
      choose,
      go,
      role,
    };
  };

  // ------------------------------------------------------------ IT desktop 1440
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "no-preference",
    colorScheme: "dark",
  });
  await context.addInitScript(instrument);
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const h = helpers(page);
  const {
    button,
    dialog,
    root,
    rootVar,
    setting,
    sounds,
    shot,
    toast,
    openPrefs,
    save,
    choose,
    go,
    role,
  } = h;

  await go("");
  await page.getByRole("heading", { name: "La prossima avventura", level: 1 }).waitFor();
  check((await root("prefTheme")) === "dark", "default theme is not the current dark look");

  // 1. Scopes: every section says where it applies; the player reads a locked campaign value.
  await openPrefs();
  const scope = (id) => page.locator(`#pref-section-${id} .pref-scope`).innerText();
  check((await scope("preferences-look")) === "Questo dispositivo", "device scope badge missing");
  check((await scope("preferences-access")) === "Il mio account", "account scope badge missing");
  check((await scope("preferences-table")) === "Questa campagna", "campaign scope badge missing");
  for (const id of [
    "preferences-device",
    "preferences-sound",
    "preferences-motion",
    "preferences-units",
  ])
    check(
      (await page.locator(`#pref-section-${id} .pref-scope`).count()) === 1,
      id + " has no scope",
    );
  const tableUnits = page.getByRole("combobox", { name: "Unità per il gruppo", exact: true });
  check(await tableUnits.isDisabled(), "player can change a campaign preference");
  check(
    /solo il DM la cambia perché vale per tutto il gruppo/.test(
      await page.locator('[data-pref-note="table-units"]').innerText(),
    ),
    "locked campaign value has no reason",
  );
  check(
    (await tableUnits.getAttribute("aria-describedby")) === "pref-note-table-units",
    "reason not linked to the locked control",
  );
  await shot("prefs-scopes-1440");
  passed.push(
    'Scopes: badges "Questo dispositivo / Il mio account / Questa campagna" on every B22 section; player sees "Unità per il gruppo" disabled with the reason linked by aria-describedby',
  );

  // 2. AFB checks: arrows on drop-downs and sliders, every control labelled.
  const theme = page.getByRole("combobox", { name: "Tema", exact: true });
  await theme.focus();
  await page.keyboard.press("ArrowRight");
  check(
    (await theme.locator("option:checked").innerText()) === "Chiaro",
    "ArrowRight did not step the menu",
  );
  check((await root("prefTheme")) === "light", "live preview did not follow the keyboard");
  await page.keyboard.press("ArrowLeft");
  check(
    (await theme.locator("option:checked").innerText()) === "Scuro",
    "ArrowLeft did not step back",
  );
  const dice = page.getByRole("slider", { name: "Volume dei dadi digitali", exact: true });
  await dice.focus();
  await page.keyboard.press("ArrowRight");
  check((await dice.inputValue()) === "55", "slider arrow did not add 5");
  check(
    (await page.locator("#pref-volume-dice").innerText()) === "55%",
    "slider output not updated",
  );
  await page.keyboard.press("ArrowLeft");
  const unlabelled = await page.evaluate(() =>
    [...document.querySelectorAll("#dialog form input:not([type=hidden]), #dialog form select")]
      .filter((el) => !el.labels?.length && !el.getAttribute("aria-label"))
      .map((el) => el.name),
  );
  check(!unlabelled.length, "unlabelled controls: " + unlabelled.join(", "));
  for (const name of [
    "Modalità solo scheda: al Tavolo elenco e azioni, senza mappa",
    "Modalità fotosensibile: niente lampi né animazioni",
    "Parole sulla mappa oltre a colore e forma (Ostile, Alleato)",
  ])
    check(
      (await page.getByRole("checkbox", { name, exact: true }).count()) === 1,
      "checkbox " + name,
    );
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("#dialog").open);
  check((await root("prefTheme")) === "dark", "Escape did not discard the preview");
  check((await setting("preferences-look.theme")) === null, "a preview was saved");
  passed.push(
    "AFB: ArrowRight/ArrowLeft step the Tema menu (live preview light → dark), slider ArrowRight 50 → 55 with 55% output, every input/select of the dialog has a label, named checkboxes; Escape discards the preview, nothing saved",
  );

  // 3. Theme and text size: live preview, save, reload; system theme follows the OS.
  const navSize = () =>
    page.evaluate(() =>
      parseFloat(getComputedStyle(document.querySelector(".nav-link span")).fontSize),
    );
  const before = await navSize();
  await openPrefs();
  await choose("Tema", "Chiaro");
  await choose("Dimensione del testo", "125%");
  check((await root("prefTheme")) === "light", "light preview missing");
  check(
    /Anteprima attiva: non ancora salvata/.test(await page.locator("[data-pref-live]").innerText()),
    "preview status not announced",
  );
  await save();
  check(Math.abs((await navSize()) / before - 1.25) < 0.02, "text did not grow to 125%");
  await page.reload();
  await page.waitForFunction(() => document.querySelector(".service-nav"));
  check((await root("prefTheme")) === "light", "light theme not kept after reload");
  check(Math.abs((await navSize()) / before - 1.25) < 0.02, "125% text not kept after reload");
  check((await rootVar("--bg")) === "#f4efe4", "light tokens not applied");
  await shot("light-text125-home-1440");
  await openPrefs();
  await choose("Tema", "Come il sistema");
  await save();
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForFunction(() => document.documentElement.dataset.prefTheme === "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForFunction(() => document.documentElement.dataset.prefTheme === "dark");
  await openPrefs();
  await choose("Tema", "Chiaro");
  await save();
  passed.push(
    `Theme/text: live preview then Save; nav text ${before}px → ${Math.round(before * 125) / 100}px (125%), light tokens; both kept after reload; "Come il sistema" follows emulated OS light ↔ dark`,
  );

  // 4. Reduced motion: from the system, explicit, photosensitive; dice show the result at once.
  await page.evaluate(() =>
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div id="b22-probe" style="animation: b22-spin 1s infinite; transition: opacity 2s">·</div>',
    ),
  );
  const probe = () =>
    page.evaluate(() => getComputedStyle(document.querySelector("#b22-probe")).animationName);
  check(
    (await probe()) === "b22-spin" && (await root("motion")) === null,
    "motion reduced by default",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => document.documentElement.dataset.motion === "reduced");
  check((await probe()) === "none", "system request did not stop animations");
  const rollDemo = async () => {
    await go("#table");
    // B61: "Prova i dadi" is a tab of the Table's right sidebar. W2b1 integration: with B34
    // built it is the «Aspetto e prova» section of the Dadi tab.
    if (!(await page.locator("[data-dice3d-roll]").count())) {
      // B62: both are sub-tabs of the Chat tab.
      if (
        await page
          .locator('[data-table-drawer="dice-tray"], [data-table-subtab="dice-tray"]')
          .count()
      ) {
        await openTablePanel(page, "dice-tray");
        await page.locator('[data-dtray-section="look"]').click();
      } else await openTablePanel(page, "dice-3d");
    }
    await page.locator('[data-dice3d-add="20"]').click();
    await page.locator("[data-dice3d-roll]").click();
    await page.waitForTimeout(250);
  };
  await rollDemo();
  check(
    (await page.locator('.dice3d-layer[data-reduced="true"]').count()) === 1,
    "animated dice ignored the system request",
  );
  check((await sounds()).includes("dice"), "digital roll made no dice sound at 50%");
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction(() => !document.documentElement.dataset.motion);
  await openPrefs();
  await choose("Movimento ridotto", "Sempre attivo");
  check(
    /Attivo: niente animazioni di dadi, pedine e pagine/.test(
      await page.locator('[data-pref-note="motion"]').innerText(),
    ),
    "motion note not updated",
  );
  await save();
  check((await root("motion")) === "reduced", "explicit reduced motion not applied");
  await rollDemo();
  check(
    (await page.locator('.dice3d-layer[data-reduced="true"]').count()) === 1,
    "animated dice ignored the explicit choice",
  );
  await page.keyboard.press("Escape");
  await openPrefs();
  await choose("Movimento ridotto", "Come il sistema");
  await page
    .getByRole("checkbox", { name: "Modalità fotosensibile: niente lampi né animazioni" })
    .check();
  await save();
  check(
    (await root("motion")) === "reduced" && (await root("prefPhotosensitive")) === "on",
    "photosensitive mode did not stop animations",
  );
  await openPrefs();
  await page
    .getByRole("checkbox", { name: "Modalità fotosensibile: niente lampi né animazioni" })
    .uncheck();
  await save();
  check((await root("motion")) === null, "animations did not come back");
  passed.push(
    'Reduced motion: emulated OS "reduce" with "Come il sistema" → data-motion=reduced, probe animation none, B56 dice layer data-reduced=true; "Sempre attivo" without the OS request → same; photosensitive → reduced + flag; turning off restores',
  );

  // 5. Colour is never the only signal; colour-vision palette and words on the map.
  await go("#table");
  const tokenStyle = (id) =>
    page.evaluate((actor) => {
      const c = document.querySelector(`[data-actor="${actor}"] .token-display > circle`);
      const s = getComputedStyle(c);
      return { fill: s.fill, stroke: s.stroke, dash: s.strokeDasharray };
    }, id);
  check((await tokenStyle("goblin-2")).dash !== "none", "hostile token has no shape cue");
  check((await tokenStyle("livia")).dash === "none", "ally token should keep a solid ring");
  await openPrefs();
  await choose("Colori adatti a", "Deuteranopia (verde)");
  await page
    .getByRole("checkbox", { name: "Parole sulla mappa oltre a colore e forma (Ostile, Alleato)" })
    .check();
  await save();
  // Esploratore has no portrait (its fill is the colour); Sentinella's portrait keeps its
  // image and the ring takes the palette colour.
  check((await tokenStyle("goblin-2")).fill === "rgb(122, 74, 0)", "hostile palette not applied");
  check((await tokenStyle("goblin-1")).stroke === "rgb(230, 159, 0)", "hostile ring not adapted");
  check((await tokenStyle("livia")).fill === "rgb(29, 79, 122)", "ally palette not applied");
  const words = await page.locator(".pref-map-word").allTextContents();
  check(
    words.includes("Ostile") && words.includes("Alleato"),
    "words missing on the map: " + words,
  );
  check((await rootVar("--danger")) === "#8a4f00", "danger colour not adapted to deuteranopia");
  await shot("colour-vision-words-table-1440");
  passed.push(
    `Colour/shape: hostile ring dashed, ally solid; deuteranopia → hostile rgb(122,74,0) (ring rgb(230,159,0) on the portrait token) vs ally rgb(29,79,122), --danger #8a4f00; words on the map: ${[...new Set(words)].join(", ")}`,
  );

  // 6. Units: IT metres, EN feet; forcing metres in EN converts movement, scale and ranges.
  const movement = async () => {
    // B61: the inspector is the sidebar's Creature tab (the dice tab was opened above).
    const creature = page.locator('.table-tabs [data-table-tab="creature"]');
    if ((await creature.getAttribute("aria-selected")) !== "true") await creature.click();
    // Visual pass 2 (30/09/2026): movement is on the hotbar's resource row (BG3), no longer
    // repeated in the Creature tab: its value after the word.
    return (await page.locator(".table-hotbar .resources .movement").innerText())
      .replace(/^\D+/, "")
      .trim();
  };
  const caption = () => page.locator(".map-caption > span").first().innerText();
  // Measurement: the Table's distance list (annotations area) in the same unit.
  const measure = async () => {
    const row = page.locator("[data-annot-distances] .annotations-dist-row").first();
    return (await row.count())
      ? `${await row.locator("strong").innerText()} | ${await row.getAttribute("aria-label")}`
      : "";
  };
  const fireBoltRange = async () => {
    await page.getByRole("button", { name: /^(Dardo di fuoco|Fire Bolt)$/ }).click();
    const text = await page.locator("#combat-detail .combat-facts").innerText();
    await page.locator("[data-combat-cancel]").click();
    return text;
  };
  check(
    (await movement()) === "9 m" && /1,5 m \/ casella/.test(await caption()),
    "IT metres wrong",
  );
  const measureIt = await measure();
  check(
    !measureIt || /^\d+(,\d+)? m \|.* m\./.test(measureIt),
    "IT measure not in metres: " + measureIt,
  );
  const rangeIt = await fireBoltRange();
  check(/36 m/.test(rangeIt), "IT range not in metres: " + rangeIt);
  await openPrefs();
  await page.locator("#dialog [name=lang]").selectOption("en");
  await save();
  await page.waitForFunction(() => document.documentElement.lang === "en");
  check((await movement()) === "30 ft", "EN movement not in feet: " + (await movement()));
  check(/5 ft \/ cell/.test(await caption()), "EN scale not in feet");
  const measureEn = await measure();
  check(
    !measureEn || /^\d+(\.\d+)? ft \|.* ft\./.test(measureEn),
    "EN measure not in feet: " + measureEn,
  );
  const rangeEn = await fireBoltRange();
  check(/120 ft/.test(rangeEn), "EN range not in feet: " + rangeEn);
  await shot("en-feet-table-1440");
  // The sheet shows the same unit as the Table: "9 <small>m</small>" is converted as a
  // pair; the metre input keeps its canonical unit with the equivalent beside it; weights
  // follow the unit system (1 lb = 0.5 kg).
  const sheetMovement = () =>
    page
      .locator(".character-vitals .stat, .stats .stat")
      .filter({ hasText: /^(Movimento|Movement)/ })
      .first()
      .locator("strong")
      .innerText();
  await go("#characters?id=livia&tab=actions");
  const sheetEn = await sheetMovement();
  check(sheetEn.replace(/\s+/g, " ") === "30 ft", "EN sheet movement not in feet: " + sheetEn);
  await button("Correct values").click();
  const speedHint = await page.locator('#dialog input[name="speed"] + .pref-unit-hint').innerText();
  check(speedHint === "= 30 ft", "speed field has no feet equivalent: " + speedHint);
  await page.locator('#dialog input[name="speed"]').fill("12");
  check(
    (await page.locator('#dialog input[name="speed"] + .pref-unit-hint').innerText()) === "= 40 ft",
    "speed hint does not follow the typed value",
  );
  await page.keyboard.press("Escape");
  await go("#characters?id=livia&tab=inventory");
  const inventoryText = await page.locator("#content").innerText();
  // W2b1 integration: B36's deep inventory shows the load as "carried / capacity lb" and each
  // row as "×n · w lb" (D&D Beyond); the check keeps its intent, pounds and never kg.
  check(
    (/10\.5 lb/.test(inventoryText) || /\d+(\.\d+)? \/ \d+ lb/.test(inventoryText)) &&
      (/4 lb \/ unit/.test(inventoryText) || /×1 · 4 lb/.test(inventoryText)) &&
      !/\bkg\b/.test(inventoryText),
    "EN inventory weights not in pounds",
  );
  await go("#table");
  await openPrefs();
  check(
    /Now: feet and pounds \(by language\)/.test(
      await page.locator('[data-pref-note="units"]').innerText(),
    ),
    "units note EN",
  );
  await choose("Distances and weights", "Metres and kilograms");
  check(
    /Now: metres and kilograms \(your choice\)/.test(
      await page.locator('[data-pref-note="units"]').innerText(),
    ),
    "units note preview",
  );
  await save("Save preferences");
  check(
    (await movement()) === "9 m" && /1\.5 m \/ cell/.test(await caption()),
    "forced metres not applied in EN",
  );
  check(/36 m/.test(await fireBoltRange()), "forced metres did not convert the range");
  await go("#characters?id=livia&tab=actions");
  const sheetForced = (await sheetMovement()).replace(/\s+/g, " ");
  check(sheetForced === "9 m", "EN + metres sheet movement: " + sheetForced);
  await go("#table");
  const measureForced = await measure();
  check(
    !measureForced || /^\d+(\.\d+)? m \|/.test(measureForced),
    "forced metres measure: " + measureForced,
  );
  // The DM's table unit applies when my choice is "Same as the table".
  await openPrefs();
  await choose("Distances and weights", "Same as the table");
  await save("Save preferences");
  check((await movement()) === "30 ft", "back to language default failed");
  await role("dm");
  await openPrefs();
  await choose("Units for the group", "Metres and kilograms for everyone");
  await save("Save preferences");
  await role("player");
  await go("#table");
  check((await movement()) === "9 m", "the DM's table unit was not applied to the player");
  await openPrefs();
  check(
    /the DM’s choice for the table/.test(
      await page.locator('[data-pref-note="units"]').innerText(),
    ),
    "units source not explained",
  );
  await page.locator("#dialog [name=lang]").selectOption("it");
  await save("Save preferences");
  await role("dm");
  await openPrefs();
  await choose(
    "Unità per il gruppo",
    "Secondo la lingua di ciascuno (IT metri e kg, EN piedi e libbre)",
  );
  await save();
  await role("player");
  // Italian with "Piedi e libbre": the sheet follows too.
  await openPrefs();
  await choose("Distanze e pesi", "Piedi e libbre");
  await save();
  await go("#characters?id=livia&tab=actions");
  const sheetItFeet = (await sheetMovement()).replace(/\s+/g, " ");
  check(sheetItFeet === "30 ft", "IT + feet sheet movement: " + sheetItFeet);
  await openPrefs();
  await choose("Distanze e pesi", "Come il tavolo");
  await save();
  check((await sheetMovement()).replace(/\s+/g, " ") === "9 m", "IT sheet back to metres");
  await go("#table");
  passed.push(
    `Units: IT "9 m", "1,5 m / casella", Fire Bolt ${rangeIt.replace(/\s+/g, " ")}, measure "${measureIt.split(" | ")[0]}"; EN default "30 ft", "5 ft / cell", ${rangeEn.replace(/\s+/g, " ")}, measure "${measureEn}"; EN sheet "${sheetEn}", Correct values speed "${speedHint}" (typed 12 → "= 40 ft"), inventory 10.5 lb and "4 lb / unit" with no kg; EN + Metres and kilograms → Table "9 m", "1.5 m / cell", 36 m, measure "${measureForced.split(" | ")[0]}", sheet "${sheetForced}"; DM "Metres and kilograms for everyone" → player EN in metres with the source named; IT + "Piedi e libbre" → sheet "${sheetItFeet}"`,
  );

  // 7. Sheet-only Table: list and actions without the map.
  await openPrefs();
  await page
    .getByRole("checkbox", { name: "Modalità solo scheda: al Tavolo elenco e azioni, senza mappa" })
    .check();
  await save();
  await go("#table");
  check(!(await page.locator(".map-container").isVisible()), "the map is still drawn");
  check(await page.locator("[data-pref-sheet-only]").isVisible(), "sheet-only panel missing");
  check(await button("Scheda completa").isVisible(), "sheet actions missing");
  check(
    // Exact: B53's quick bar slot is named "1: Dardo di fuoco · azione della scheda".
    await page.getByRole("button", { name: "Dardo di fuoco", exact: true }).isVisible(),
    "combat actions missing",
  );
  // Map-only controls go with the map (FVT-190); the list gives the same distances.
  for (const name of ["Trova la mia pedina", "Centra Sentinella"])
    check(
      !(await page
        .getByRole("button", { name, exact: true })
        .isVisible()
        .catch(() => false)),
      name + " is still offered without a map",
    );
  check(
    !(await page
      .locator(".annotations-dist-row")
      .first()
      .isVisible()
      .catch(() => false)),
    "the distance ruler rows are still offered without a map",
  );
  check(
    !(await page
      .locator(".home-pop-tip")
      .isVisible()
      .catch(() => false)),
    "the tip about dragging tokens covers the sheet-only panel",
  );
  const sentinelRow = await page
    .locator("[data-pref-sheet-only] li")
    .filter({ hasText: "Sentinella" })
    .innerText();
  check(/Ostile · 12,1 m \(↑ 3 m\)/.test(sentinelRow), "list distance: " + sentinelRow);
  // Page order = visual order: the panel is the inspector's first block and first stop.
  check(
    await page.evaluate(
      () =>
        document.querySelector(".table-inspector").firstElementChild ===
        document.querySelector("[data-pref-sheet-only]").closest(".table-ext-panel"),
    ),
    "sheet-only panel is not first in the inspector",
  );
  await page.locator(".table-topline .toolbar button").last().focus();
  await page.keyboard.press("Tab");
  check(
    (await page.evaluate(() => document.activeElement.textContent.trim())) === "Mostra la mappa",
    "Tab after the Table heading does not reach the sheet-only panel first",
  );
  // The token menu's "Centra sulla mappa" (B12) has no map: it selects the creature, whose
  // list row takes the focus, and a notice says so.
  await page
    .locator("[data-pref-sheet-only]")
    .getByRole("button", { name: "Sentinella", exact: true })
    .click();
  await page.getByRole("button", { name: "Menu di Sentinella" }).click();
  await page.locator('[data-token-menu-item="token-menu-center"]').click();
  const centreNotice = await toast(/nell’elenco è selezionata la creatura Sentinella/);
  check(
    (await page.evaluate(() => document.activeElement?.dataset?.prefSelect)) === "goblin-1",
    "the centred creature's row is not focused",
  );
  await page
    .locator("[data-pref-sheet-only]")
    .getByRole("button", { name: "Livia", exact: true })
    .click();
  await page.getByRole("button", { name: "Dardo di fuoco", exact: true }).click();
  await page.getByRole("button", { name: "Scegli Sentinella" }).waitFor();
  check(
    !(await page.getByRole("button", { name: "Scegli Livia" }).count()),
    "the caster is offered as its own target",
  );
  await shot("sheet-only-target-table-1440");
  await page.getByRole("button", { name: "Scegli Sentinella" }).click();
  // R8 refresh (27/09): the core rule behind the map changed since this journey was written
  // (P5 asked for initiative in a dialog; R1's one attack engine now resolves an attack
  // outside combat: «Azione risolta…»). The check stays the same: choosing from the list
  // reaches the same outcome as the map, whichever it is today.
  const gate = await (
    await page.waitForFunction(() => {
      const toastText = document.querySelector("#toast")?.textContent ?? "";
      const dialogText = document.querySelector("#dialog[open]")?.textContent ?? "";
      if (/iniziativa/i.test(dialogText)) return dialogText.replace(/\s+/g, " ").slice(0, 120);
      return /iniziativa|Azione risolta/i.test(toastText) ? toastText : null;
    })
  ).jsonValue();
  if (await page.locator("#dialog[open]").count()) await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("#dialog")?.open);
  if (await page.locator("[data-combat-cancel]").count())
    await page.locator("[data-combat-cancel]").click();
  await button("Mostra la mappa").click();
  await page.locator(".map-container").waitFor({ state: "visible" });
  check((await setting("preferences-device.sheet-only")) === "false", "show map not saved");
  const focusAfterMap = await page.evaluate(
    () => document.activeElement?.getAttribute("data-actor") ?? document.activeElement?.tagName,
  );
  check(focusAfterMap === "livia", "focus after Mostra la mappa: " + focusAfterMap);
  passed.push(
    `Sheet-only: map hidden with its controls (no "Trova la mia pedina", no "Centra …", no ruler rows, no drag tip); the panel is first in page and Tab order; the token menu's "Centra sulla mappa" selects and focuses the row ("${centreNotice}"); list row "${sentinelRow.replace(/\s+/g, " ")}"; inspector + combat bar remain, "Dardo di fuoco" turns the list into targets (not the caster); choosing Sentinella reaches the same core rule as the map ("${gate}"); "Mostra la mappa" restores it, saves false and focuses Livia's token`,
  );

  // 8. Volumes by category with a test button; digital dice sound follows its volume.
  await openPrefs();
  const diceSlider = page.getByRole("slider", { name: "Volume dei dadi digitali", exact: true });
  await diceSlider.focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
  check((await page.locator("#pref-volume-dice").innerText()) === "80%", "dice volume not 80%");
  const soundsBefore = (await sounds()).length;
  await button("Prova il suono dei dadi").click();
  check(
    /Suono riprodotto al 80%/.test(
      await page.locator('[data-pref-sound-status="dice"]').innerText(),
    ),
    "dice test status",
  );
  check((await sounds()).length > soundsBefore, "dice test made no sound");
  await button("Prova il suono dell’interfaccia").click();
  check(
    /Volume a 0: silenzio/.test(await page.locator('[data-pref-sound-status="ui"]').innerText()),
    "ui at 0 not silent",
  );
  check(!(await sounds()).includes("ui"), "interface sound played at 0");
  const uiSlider = page.getByRole("slider", { name: "Volume dell’interfaccia", exact: true });
  await uiSlider.focus();
  for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowRight");
  await button("Prova il suono dell’interfaccia").click();
  check((await sounds()).includes("ui"), "interface test made no sound at 40%");
  await save();
  check((await setting("preferences-sound.dice-volume")) === "80", "dice volume not saved");
  await openPrefs();
  await page.getByRole("slider", { name: "Volume dei dadi digitali", exact: true }).fill("0");
  await save();
  await page.evaluate(() => (window.__b22.sounds.length = 0));
  await rollDemo();
  check(!(await sounds()).includes("dice"), "dice sound played at volume 0");
  await page.keyboard.press("Escape");
  passed.push(
    "Volumes: dice slider 50 → 80 by keyboard, test button plays and says 80%; interface at 0 is silent, at 40% plays; saved; dice volume 0 → a digital roll makes no sound",
  );

  // 9. The DM proposes preferences; the player is told, accepts, can undo; offline refused.
  await role("dm");
  await openPrefs();
  check(
    (await page
      .getByRole("combobox", { name: "Colori adatti a", exact: true })
      .locator("option:checked")
      .innerText()) === "Visione standard",
    "the DM sees another identity's value",
  );
  await button("Proponi preferenze a un giocatore…").click();
  await dialog.getByRole("heading", { name: "Proponi preferenze a un giocatore" }).waitFor();
  await page
    .locator('#dialog [name="propose:preferences-access.color-vision"]')
    .selectOption({ label: "Tritanopia (blu)" });
  await page
    .locator('#dialog [name="propose:preferences-access.font"]')
    .selectOption({ label: "Alta leggibilità (dislessia)" });
  await page
    .locator('#dialog [name="propose:preferences-motion.reduced-motion"]')
    .selectOption({ label: "Sempre attivo" });
  await page.locator("#dialog [name=note]").fill("Per leggere meglio al tavolo");
  await shot("dm-proposal-dialog-1440");
  await button("Invia proposta").click();
  const sent = await toast(/Proposta inviata a/);
  await role("player");
  check(
    /Notifiche e richieste · \d+ notifich/.test(
      await page.locator('.service-nav [data-service="requests"]').getAttribute("aria-label"),
    ),
    "the player's bell does not count the proposal",
  );
  await page.locator('.service-nav [data-service="requests"]').click();
  const notice = page.locator("#dialog").getByText("Il DM ti propone delle preferenze").first();
  await notice.waitFor();
  const noticeBody = await page
    .locator("#dialog li, #dialog article")
    .filter({ hasText: "Il DM ti propone delle preferenze" })
    .first()
    .innerText();
  check(
    /3 preferenze proposte\. Aprile per accettarle o rifiutarle\./.test(noticeBody),
    "notice wording: " + noticeBody,
  );
  await notice.click();
  await page.waitForFunction(() => location.hash === "#preferences-proposals");
  await page
    .waitForFunction(() => document.activeElement?.matches?.("[data-pref-page-title]"), null, {
      timeout: 3000,
    })
    .catch(() => {});
  const pageFocus = await page.evaluate(() => document.activeElement?.textContent?.trim());
  check(pageFocus === "Proposte di preferenze del DM", "proposals page not focused: " + pageFocus);
  check(
    (await page.locator("#content [data-pref-accept]").count()) === 1 &&
      /Per leggere meglio al tavolo/.test(await page.locator("#content").innerText()),
    "the proposals page does not show the pending proposal",
  );
  await shot("proposals-page-1440");
  // The same proposal is answered below from Preferences, away from the page.
  await go("");
  // Offline: the answer cannot reach the DM, nothing changes.
  await openPrefs();
  await page.locator("#dialog [name=offline]").check();
  await save();
  await openPrefs();
  await button("Accetta e applica").click();
  await page.locator("[data-pref-proposals-error]").waitFor({ state: "visible" });
  check(
    /senza rete/.test(await page.locator("[data-pref-proposals-error]").innerText()),
    "offline refusal not shown",
  );
  check((await root("prefVision")) === "deuteranopia", "offline accept changed a preference");
  await page.locator("#dialog [name=offline]").uncheck();
  await save();
  await openPrefs();
  check(
    /Per leggere meglio al tavolo/.test(await page.locator(".pref-proposals").innerText()),
    "note not shown",
  );
  await shot("player-proposal-1440");
  await button("Accetta e applica").click();
  await dialog.getByRole("heading", { name: "Preferenze del DM applicate" }).waitFor();
  const applied = await page.locator("#dialog .pref-changes").innerText();
  check(
    (await root("prefVision")) === "tritanopia" &&
      (await root("prefFont")) === "legible" &&
      (await root("motion")) === "reduced",
    "accepted values not applied",
  );
  await button("Annulla e torna ai valori precedenti").click();
  await toast(/Valori precedenti ripristinati/);
  check(
    (await root("prefVision")) === "deuteranopia" &&
      (await root("prefFont")) === "standard" &&
      (await root("motion")) === null,
    "undo did not restore the player's values",
  );
  await role("dm");
  await openPrefs();
  check(
    /Accettata, poi annullata dal giocatore/.test(await page.locator(".pref-help").innerText()),
    "DM not told of the undo",
  );
  await button("Proponi preferenze a un giocatore…").click();
  await page
    .locator('#dialog [name="propose:preferences-access.contrast"]')
    .selectOption({ label: "Elevato" });
  await button("Invia proposta").click();
  await toast(/Proposta inviata/);
  await openPrefs();
  await button("Proponi preferenze a un giocatore…").click();
  await page
    .locator('#dialog [name="propose:preferences-device.sheet-only"]')
    .selectOption({ label: "Attiva" });
  await button("Invia proposta").click();
  await toast(/Proposta inviata/);
  await role("player");
  await openPrefs();
  check(
    (await page.locator(".pref-proposals article").count()) === 2,
    "two pending proposals expected",
  );
  await page
    .locator(".pref-proposals article")
    .filter({ hasText: "Modalità solo scheda" })
    .getByRole("button", { name: "Rifiuta" })
    .click();
  await toast(/Proposta rifiutata: nulla è cambiato/);
  check((await root("prefCanvas")) === "on", "declining changed sheet-only mode");
  await button("Accetta e applica").click();
  await dialog.getByRole("heading", { name: "Preferenze del DM applicate" }).waitFor();
  await page.locator("#dialog footer").getByRole("button", { name: "Chiudi", exact: true }).click();
  check((await root("prefContrast")) === "high", "accepted contrast not applied");
  await role("dm");
  await openPrefs();
  const dmList = await page.locator(".pref-help").innerText();
  check(/Rifiutata/.test(dmList) && /Accettata/.test(dmList), "DM statuses wrong: " + dmList);
  check(
    (await page
      .getByRole("combobox", { name: "Contrasto", exact: true })
      .locator("option:checked")
      .innerText()) === "Standard",
    "the DM's own contrast changed",
  );
  await page.keyboard.press("Escape");
  await role("player");
  passed.push(
    `Proposal: DM (who sees only his own "Visione standard") sends tritanopia + legible + reduced motion — "${sent}"; the player's bell counts it; the notice ("${noticeBody.replace(/\s+/g, " ")}") opens the proposals page with its heading focused and Accept/Decline; offline accept refused with nothing changed; accept applied (${applied.replace(/\s+/g, " ")}), then undone to deuteranopia and the DM sees "Accettata, poi annullata dal giocatore"; a second proposal (sheet-only) declined with no change, a third (contrast high) accepted and kept; the DM's own contrast stays Standard`,
  );

  // 10. Reset to defaults: confirmation, cancel, reset, undo; values persist across reload.
  await openPrefs();
  await button("Ripristina predefiniti…").click();
  await dialog.getByRole("heading", { name: "Ripristinare i predefiniti?" }).waitFor();
  const plan = await page.locator("#dialog .pref-changes").innerText();
  check(
    /Tema: Chiaro → Scuro/.test(plan) && /Contrasto: Elevato → Standard/.test(plan),
    "reset plan: " + plan,
  );
  await shot("reset-confirm-1440");
  await page
    .locator("#dialog footer")
    .getByRole("button", { name: "Annulla", exact: true })
    .click();
  check((await root("prefTheme")) === "light", "cancelled reset changed the theme");
  // Final review X-05 (Owlbear SDK: a modal returns to its surface): «Annulla» reopens
  // Preferences by itself.
  await page.locator("#dialog[open] form[data-pref-enhanced]").waitFor();
  await openPrefs();
  await button("Ripristina predefiniti…").click();
  await button("Ripristina").click();
  await dialog.getByRole("heading", { name: "Predefiniti ripristinati" }).waitFor();
  check(
    (await root("prefTheme")) === "dark" &&
      (await root("prefContrast")) === "standard" &&
      (await root("prefVision")) === "standard",
    "reset did not restore defaults",
  );
  // The way back stays after closing: Preferences keeps "Annulla ripristino" in view.
  await page.locator("#dialog footer").getByRole("button", { name: "Chiudi", exact: true }).click();
  await openPrefs();
  check(
    /finché non ricarichi la pagina/.test(await page.locator("[data-pref-undo-block]").innerText()),
    "no lasting undo in Preferences",
  );
  await button("Annulla ripristino").click();
  await toast(/Valori precedenti ripristinati/);
  check(
    (await root("prefTheme")) === "light" && (await root("prefContrast")) === "high",
    "undo reset failed",
  );
  await page.waitForFunction(() => document.querySelector("#dialog form[data-pref-enhanced]"));
  check(
    (await dialog
      .getByRole("combobox", { name: "Tema", exact: true })
      .locator("option:checked")
      .innerText()) === "Chiaro" && !(await page.locator("[data-pref-undo-block]").count()),
    "Preferences not reopened with the restored values",
  );
  await page.keyboard.press("Escape");
  await page.reload();
  await page.waitForFunction(() => document.querySelector(".service-nav"));
  check(
    (await root("prefTheme")) === "light" &&
      (await root("prefContrast")) === "high" &&
      (await root("prefVision")) === "deuteranopia" &&
      (await root("prefMapWords")) === "on",
    "device/account preferences not kept after reload",
  );
  passed.push(
    `Reset: confirmation lists "${plan.split("\n").slice(0, 3).join(" · ")} …"; Annulla keeps everything; Ripristina → dark/standard; after Chiudi, Preferences still offers "Annulla ripristino", which brings them back and reopens Preferences with Tema Chiaro; reload keeps light theme, high contrast, deuteranopia, words`,
  );

  // 11. Keep the screen awake with a sheet open (DDB-069).
  await openPrefs();
  await page
    .getByRole("checkbox", { name: "Tieni lo schermo acceso con una scheda o il Tavolo aperti" })
    .check();
  await save();
  await go("#characters?id=livia&tab=actions");
  await page.waitForFunction(() => window.__b22.wake.includes("acquired"));
  await openPrefs();
  const wakeText = await page.locator('[data-pref-note="wake"]').innerText();
  check(/Attivo ora/.test(wakeText), "wake status not shown: " + wakeText);
  await page.keyboard.press("Escape");
  await page.locator('.app-header [data-nav="home"]').first().click();
  await page.waitForFunction(() => window.__b22.wake.includes("released"));
  passed.push(`Keep awake: wake lock acquired on Livia's sheet ("${wakeText}"), released on Home`);

  // 13. Review fixes on the desktop: panel fade, Table vertical fit and script-placed
  // menus at 90–125 % interface, 150 % text headings.
  await go("#table");
  await openPrefs();
  await choose("Opacità dei pannelli sulla mappa quando non li usi", "75%");
  await save();
  const toolbarOpacity = () =>
    page.evaluate(() => getComputedStyle(document.querySelector(".map-toolbar")).opacity);
  await page.mouse.move(700, 20);
  check(
    (await toolbarOpacity()) === "0.75",
    "map toolbar does not fade: " + (await toolbarOpacity()),
  );
  await page.locator(".map-toolbar").hover();
  check((await toolbarOpacity()) === "1", "map toolbar does not come back on hover");
  await page.mouse.move(700, 20);
  await page.locator('.map-toolbar [data-tool="move"]').focus();
  check((await toolbarOpacity()) === "1", "map toolbar does not come back on focus");
  const fit = {};
  for (const scale of ["90%", "110%", "125%"]) {
    await openPrefs();
    await choose("Scala dell’interfaccia", scale);
    await save();
    await go("#table");
    const f = await page.evaluate(() => ({
      scroll: document.documentElement.scrollHeight,
      inner: innerHeight,
      dock: Math.round(document.querySelector(".action-dock").getBoundingClientRect().bottom),
    }));
    fit[scale] = f;
    check(
      f.scroll <= f.inner && f.dock <= f.inner,
      `Table does not fit at ${scale}: ${JSON.stringify(f)}`,
    );
  }
  // At 125 % the token menu opens beside the token (scripts measure in page pixels).
  await page.evaluate(() => document.querySelectorAll(".home-pop").forEach((el) => el.remove()));
  const token = await page.locator('#battle-map [data-actor="livia"]').boundingBox();
  await page.mouse.click(token.x + token.width / 2, token.y + token.height / 2, {
    button: "right",
  });
  await page.locator(".token-menu").waitFor();
  const menuBox = await page.locator(".token-menu").boundingBox();
  check(
    (Math.abs(menuBox.x - (token.x + token.width + 10)) <= 2 ||
      Math.abs(menuBox.x + menuBox.width - (token.x - 10)) <= 2) &&
      menuBox.y + menuBox.height <= 900,
    `token menu misplaced at 125%: token ${JSON.stringify(token)} menu ${JSON.stringify(menuBox)}`,
  );
  await shot("table-ui125-token-menu-1440");
  await page.keyboard.press("Escape");
  await go("");
  const h1Size = () =>
    page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("h1")).fontSize));
  await openPrefs();
  await choose("Scala dell’interfaccia", "100% (predefinita)");
  await choose("Dimensione del testo", "100% (predefinita)");
  await save();
  const h1At100 = await h1Size();
  await openPrefs();
  await choose("Dimensione del testo", "150%");
  await save();
  const h1At150 = await h1Size();
  check(Math.abs(h1At150 / h1At100 - 1.5) < 0.02, `h1 ${h1At100}px → ${h1At150}px at 150%`);
  passed.push(
    `Review fixes (desktop): panel fade 75% → map toolbar opacity 0.75, 1 on hover and on focus; Table fits 1440×900 at ${Object.entries(
      fit,
    )
      .map(([k, v]) => `${k} (page ${v.scroll}, action bar bottom ${v.dock})`)
      .join(
        ", ",
      )}; at 125% the token menu opens beside Livia's token (menu x ${Math.round(menuBox.x)}, token right ${Math.round(token.x + token.width)}); h1 ${h1At100}px → ${h1At150}px at 150% text`,
  );

  // Final reset through the UI so the next run starts from the defaults.
  await openPrefs();
  await button("Ripristina predefiniti…").click();
  await button("Ripristina").click();
  await page.locator("#dialog footer").getByRole("button", { name: "Chiudi", exact: true }).click();
  await shot("prefs-default-home-1440");

  // 12. ---------------------------------------------------- EN phone 390, touch
  const phoneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "no-preference",
  });
  await phoneContext.addInitScript(instrument);
  const phone = await phoneContext.newPage();
  phone.on("pageerror", (error) => errors.push("phone: " + error.message));
  const m = helpers(phone, { touch: true });
  await m.go("");
  await m.openPrefs();
  await phone.locator("#dialog [name=lang]").selectOption("en");
  await m.choose("Dimensione del testo", "125%");
  check(await m.noOverflow(), "preferences overflow at 390 during preview");
  await m.save();
  await phone.waitForFunction(() => document.documentElement.lang === "en");
  check(await m.noOverflow(), "home overflows at 390 with 125% text");
  await m.openPrefs();
  check(
    (await phone.locator("#pref-section-preferences-access .pref-scope").innerText()) ===
      "My account",
    "EN scope badge",
  );
  const box = await phone.locator("#dialog").boundingBox();
  check(box.x >= 0 && box.x + box.width <= 390, "dialog wider than the phone");
  await phone.screenshot({ path: dir + "phone-en-prefs-390.png" });
  await m.press(phone.getByRole("button", { name: "Cancel", exact: true }));
  await m.go("#table");
  // Visual pass 2 (30/09/2026): the hotbar's resource row (the word stays for assistive
  // technology on a phone, the value is shown).
  const phoneMovement = async () =>
    (await phone.locator(".table-hotbar .resources .movement").innerText())
      .replace(/^\D+/, "")
      .trim();
  check((await phoneMovement()) === "30 ft", "phone EN movement not in feet");
  check(await m.noOverflow(), "Table overflows at 390 with 125% text");
  await m.openPrefs();
  await m.choose("Distances and weights", "Metres and kilograms");
  await m.press(
    phone.getByRole("checkbox", {
      name: "Sheet-only mode: the Table shows list and actions, no map",
    }),
  );
  await m.save("Save preferences");
  check((await phoneMovement()) === "9 m", "phone forced metres not applied");
  check(!(await phone.locator(".map-container").isVisible()), "phone map still drawn");
  check(await m.noOverflow(), "sheet-only Table overflows at 390");
  await phone.screenshot({ path: dir + "phone-en-sheet-only-390.png" });
  await phone.reload();
  await phone.waitForFunction(() => document.querySelector(".service-nav"));
  check(
    (await m.root("prefCanvas")) === "off" && (await m.rootVar("--pref-text-scale")) === "1.25",
    "phone device preferences not kept after reload",
  );
  // The language is a shell choice not kept by the demo; the personal metres choice is.
  await m.go("#table");
  check((await phoneMovement()) === "9 m", "phone personal metres not kept after reload");
  await m.press(phone.getByRole("button", { name: /^(Mostra la mappa|Show the map)$/ }));
  await phone.locator(".map-container").waitFor({ state: "visible" });
  check(await m.noOverflow(), "Table with map overflows at 390");
  passed.push(
    'EN phone 390 (touch): language EN + 125% text with no overflow (home, dialog, Table), badge "My account", Table "30 ft" → Distances and weights: Metres and kilograms "9 m", sheet-only by tap; reload keeps 125%, sheet-only and metres; "Mostra la mappa" by tap',
  );

  // Both sizes at their maximum (150 % text, 125 % interface) on the phone, both roles.
  // The demo does not keep the language across the reload above: read it.
  const phoneEn = (await phone.evaluate(() => document.documentElement.lang)) === "en";
  await m.openPrefs();
  await m.choose(phoneEn ? "Text size" : "Dimensione del testo", "150%");
  await m.choose(phoneEn ? "Interface scale" : "Scala dell’interfaccia", "125%");
  await m.save(phoneEn ? "Save preferences" : "Salva preferenze");
  const phonePages = [
    "",
    "#characters",
    "#characters?id=livia&tab=actions",
    "#characters?id=livia&tab=inventory",
    "#characters?id=livia&tab=spells",
    "#characters?id=livia&tab=features",
    "#characters?id=livia&tab=story",
    "#characters?id=livia&tab=extras",
    "#campaigns",
    "#campaign",
    "#campaign?tab=group",
    "#campaign?tab=sessions",
    "#campaign?tab=journal",
    "#campaign?tab=world",
    "#library",
    "#notes",
    "#table",
    "#preferences-proposals",
  ];
  const overflowing = [];
  for (const who of ["player", "dm"]) {
    await m.go("");
    await m.role(who);
    for (const hash of phonePages) {
      await m.go(hash);
      if (!(await m.noOverflow())) overflowing.push(`${who} ${hash || "#home"}`);
    }
  }
  check(
    !overflowing.length,
    "overflow at 390 with 150% text + 125% interface: " + overflowing.join(", "),
  );
  await m.go("");
  await m.role("player");
  await phone.screenshot({ path: dir + "phone-150-125-home-390.png" });
  passed.push(
    `EN phone 390 with 150% text + 125% interface: no horizontal overflow on ${phonePages.length} pages × player and DM (demo strip and header wrap)`,
  );

  await phoneContext.close();
  await context.close();
  check(!errors.length, "page errors: " + errors.join(" | "));
  return { passed: passed.length, checks: passed, errors };
};
