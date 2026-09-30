// B22 — Preferences, accessibility and units: the pure model (no DOM, no registry).
//
// Every preference is a registry setting with a declared scope, copied from Foundry's
// Client / User / World settings (FVT-188, SVC-163): "device" (this browser), "personal"
// (my account, per identity) and "campaign" (the whole group, only the DM changes it, the
// player reads it locked with its reason, like Fantasy Grounds GM options, R20-201).
//
// Patterns (docs/interview/CAPABILITY_CENSUS.md card B22; market-census rows):
// - Theme light / dark / system, interface scale and global font size: Foundry V13
//   (FVT-189, SVC-159, SVC-160); Roll20 colour mode, dark by default (SVC-158, R20-196).
// - Text size for reading with a live preview: Baldur's Gate 3 (CRP-181, SVC-170).
// - Interface scale: Fantasy Grounds /scaleui (R20-202).
// - Reduced motion that also follows the OS setting: Owlbear Rodeo 2.1 (SVC-167);
//   "disable visual motion effects": Alchemy (SVC-166, VTL-212); photosensitive mode:
//   Foundry (SVC-161).
// - Colour-blind modes: BG3 protanopia / deuteranopia / tritanopia (CRP-180); colour is
//   never the only signal: Owlbear Ranges themes, Battle Board status words (VTL-243);
//   player-side token borders: Foundry modules (SVC-171).
// - Dyslexia-friendly typeface and high contrast: Roll20 (SVC-165, R20-196).
// - Units chosen per user, EN feet and pounds / IT metres and kilograms: BG3 "weight and
//   distances follow the chosen unit system" (CRP-184); the Italian SRD 5.2.1 converts
//   5 feet to 1.5 metres and 1 pound to 0.5 kg throughout (same rule as srd-sample.mjs).
// - Sheet-only mode for weak devices: Foundry "Disable Game Canvas" (FVT-190, SVC-164).
// - Keep the screen awake while a sheet is open: D&D Beyond app (DDB-069).
// - Per-category volume (dice, interface): Foundry sound categories (SVC-124, TV-145).
// - The DM helps configure a player's preferences: Monk's Player Settings (FVT-192,
//   module) and AboveVTT campaign-suggested settings (VTL-224); here the DM proposes and
//   the player accepts or declines, and the DM never reads the player's current values.
// - Name background on the map: BG3 text background (CRP-181, SV-22); panels over the map
//   fade while not in use: Foundry V13 UI fade opacity (FVT-189, SVC-159).

export const PREFERENCES_SLICE = "preferences";
export const PREFERENCES_VERSION = 1;
export const NOTE_MAX = 280;
export const PROPOSALS_MAX = 30;
// The Italian SRD rules: 5 ft = 1.5 m, so 1 ft = 0.3 m; 1 lb = 0.5 kg.
export const METERS_PER_FOOT = 0.3;
export const KG_PER_POUND = 0.5;

const L = (it, en) => Object.freeze({ it, en });
const option = (value, it, en = it) => Object.freeze({ value, label: L(it, en) });
const percent = (values, fallback, suffixIt, suffixEn) =>
  values.map((n) =>
    option(
      n,
      n === fallback ? `${n}% ${suffixIt}` : `${n}%`,
      n === fallback ? `${n}% ${suffixEn}` : `${n}%`,
    ),
  );
const freezeSection = (section) =>
  Object.freeze({
    ...section,
    fields: Object.freeze(
      section.fields.map((field) =>
        Object.freeze({
          ...field,
          ...(field.options ? { options: Object.freeze(field.options) } : {}),
        }),
      ),
    ),
  });

export const TEXT_SIZES = Object.freeze([100, 112, 125, 150]);
export const UI_SCALES = Object.freeze([90, 100, 110, 125]);
export const PANEL_OPACITIES = Object.freeze([60, 75, 90, 100]);
export const VISION_MODES = Object.freeze(["standard", "protanopia", "deuteranopia", "tritanopia"]);

// Settings sections in the order they appear inside each scope group of Preferences.
export const SECTIONS = Object.freeze(
  [
    {
      id: "preferences-look",
      scope: "device",
      order: 5,
      label: L("Aspetto", "Appearance"),
      fields: [
        {
          id: "theme",
          type: "choice",
          default: "dark",
          label: L("Tema", "Theme"),
          options: [
            option("system", "Come il sistema", "Match the system"),
            option("dark", "Scuro", "Dark"),
            option("light", "Chiaro", "Light"),
          ],
        },
        {
          id: "text-size",
          type: "choice",
          default: 100,
          label: L("Dimensione del testo", "Text size"),
          options: percent(TEXT_SIZES, 100, "(predefinita)", "(default)"),
        },
        {
          id: "ui-scale",
          type: "choice",
          default: 100,
          label: L("Scala dell’interfaccia", "Interface scale"),
          options: percent(UI_SCALES, 100, "(predefinita)", "(default)"),
        },
        {
          id: "panel-opacity",
          type: "choice",
          default: 100,
          label: L(
            "Opacità dei pannelli sulla mappa quando non li usi",
            "Opacity of the panels over the map when not in use",
          ),
          options: percent(PANEL_OPACITIES, 100, "(nessuna dissolvenza)", "(no fade)"),
        },
      ],
    },
    {
      id: "preferences-device",
      scope: "device",
      order: 6,
      label: L("Tavolo e schermo", "Table and screen"),
      fields: [
        {
          id: "sheet-only",
          type: "boolean",
          default: false,
          label: L(
            "Modalità solo scheda: al Tavolo elenco e azioni, senza mappa",
            "Sheet-only mode: the Table shows list and actions, no map",
          ),
        },
        {
          id: "keep-awake",
          type: "boolean",
          default: false,
          label: L(
            "Tieni lo schermo acceso con una scheda o il Tavolo aperti",
            "Keep the screen on while a sheet or the Table is open",
          ),
        },
      ],
    },
    {
      id: "preferences-sound",
      scope: "device",
      order: 7,
      label: L("Suoni", "Sounds"),
      fields: [
        {
          id: "dice-volume",
          type: "number",
          default: 50,
          min: 0,
          max: 100,
          label: L("Volume dei dadi digitali", "Digital dice volume"),
        },
        {
          id: "ui-volume",
          type: "number",
          default: 0,
          min: 0,
          max: 100,
          label: L("Volume dell’interfaccia", "Interface volume"),
        },
      ],
    },
    {
      id: "preferences-access",
      scope: "personal",
      order: 5,
      label: L("Lettura e colori", "Reading and colour"),
      fields: [
        {
          id: "font",
          type: "choice",
          default: "standard",
          label: L("Carattere", "Typeface"),
          options: [
            option("standard", "Standard"),
            option("legible", "Alta leggibilità (dislessia)", "High legibility (dyslexia)"),
          ],
        },
        {
          id: "contrast",
          type: "choice",
          default: "standard",
          label: L("Contrasto", "Contrast"),
          options: [option("standard", "Standard"), option("high", "Elevato", "High")],
        },
        {
          id: "color-vision",
          type: "choice",
          default: "standard",
          label: L("Colori adatti a", "Colours suited to"),
          options: [
            option("standard", "Visione standard", "Standard vision"),
            option("protanopia", "Protanopia (rosso)", "Protanopia (red)"),
            option("deuteranopia", "Deuteranopia (verde)", "Deuteranopia (green)"),
            option("tritanopia", "Tritanopia (blu)", "Tritanopia (blue)"),
          ],
        },
        {
          id: "map-words",
          type: "boolean",
          default: false,
          label: L(
            "Parole sulla mappa oltre a colore e forma (Ostile, Alleato)",
            "Words on the map besides colour and shape (Hostile, Ally)",
          ),
        },
        {
          id: "name-backdrop",
          type: "choice",
          default: "outline",
          label: L("Sfondo dei nomi sulla mappa", "Name background on the map"),
          options: [option("outline", "Contorno", "Outline"), option("solid", "Pieno", "Solid")],
        },
        // BG3 "Tooltip delay" (SV-22): how long a pointer or the keyboard rests on a
        // control before its explanation appears; by touch a long press shows it.
        // The browser's own tooltips stay the default (their delay is the system's); a
        // chosen delay switches to the app's tooltips. By touch a long press always works.
        {
          id: "tooltip-delay",
          type: "choice",
          default: -1,
          label: L("Ritardo dei suggerimenti (tooltip)", "Tooltip delay"),
          options: [
            option(-1, "Come il browser (predefinito)", "Like the browser (default)"),
            option(0, "Subito", "Immediately"),
            option(250, "Breve (0,25 s)", "Short (0.25 s)"),
            option(500, "Normale (0,5 s)", "Normal (0.5 s)"),
            option(1000, "Lungo (1 s)", "Long (1 s)"),
          ],
        },
      ],
    },
    {
      id: "preferences-motion",
      scope: "personal",
      order: 6,
      label: L("Movimento ed effetti", "Motion and effects"),
      fields: [
        {
          id: "reduced-motion",
          type: "choice",
          default: "system",
          label: L("Movimento ridotto", "Reduced motion"),
          options: [
            option("system", "Come il sistema", "Follow the system"),
            option("reduced", "Sempre attivo", "Always on"),
          ],
        },
        {
          id: "photosensitive",
          type: "boolean",
          default: false,
          label: L(
            "Modalità fotosensibile: niente lampi né animazioni",
            "Photosensitive mode: no flashes or animations",
          ),
        },
      ],
    },
    {
      id: "preferences-units",
      scope: "personal",
      order: 7,
      label: L("Unità di misura", "Units"),
      fields: [
        {
          id: "units",
          type: "choice",
          default: "table",
          label: L("Distanze e pesi", "Distances and weights"),
          options: [
            option("table", "Come il tavolo", "Same as the table"),
            option("metric", "Metri e chilogrammi", "Metres and kilograms"),
            option("imperial", "Piedi e libbre", "Feet and pounds"),
          ],
        },
      ],
    },
    {
      id: "preferences-table",
      scope: "campaign",
      order: 5,
      label: L("Unità del tavolo", "Table units"),
      fields: [
        {
          id: "units",
          type: "choice",
          default: "language",
          label: L("Unità per il gruppo", "Units for the group"),
          options: [
            option(
              "language",
              "Secondo la lingua di ciascuno (IT metri e kg, EN piedi e libbre)",
              "By each person’s language (IT metres and kg, EN feet and pounds)",
            ),
            option("metric", "Metri e chilogrammi per tutti", "Metres and kilograms for everyone"),
            option("imperial", "Piedi e libbre per tutti", "Feet and pounds for everyone"),
          ],
        },
      ],
    },
  ].map(freezeSection),
);

export const SCOPE_LABELS = Object.freeze({
  device: L("Questo dispositivo", "This device"),
  personal: L("Il mio account", "My account"),
  campaign: L("Questa campagna", "This campaign"),
});

export const key = (sectionId, fieldId) => `${sectionId}.${fieldId}`;
export const KEYS = Object.freeze({
  theme: key("preferences-look", "theme"),
  textSize: key("preferences-look", "text-size"),
  uiScale: key("preferences-look", "ui-scale"),
  panelOpacity: key("preferences-look", "panel-opacity"),
  sheetOnly: key("preferences-device", "sheet-only"),
  keepAwake: key("preferences-device", "keep-awake"),
  diceVolume: key("preferences-sound", "dice-volume"),
  uiVolume: key("preferences-sound", "ui-volume"),
  font: key("preferences-access", "font"),
  contrast: key("preferences-access", "contrast"),
  vision: key("preferences-access", "color-vision"),
  mapWords: key("preferences-access", "map-words"),
  nameBackdrop: key("preferences-access", "name-backdrop"),
  tooltipDelay: key("preferences-access", "tooltip-delay"),
  motion: key("preferences-motion", "reduced-motion"),
  photosensitive: key("preferences-motion", "photosensitive"),
  units: key("preferences-units", "units"),
  tableUnits: key("preferences-table", "units"),
});

const FIELD_INDEX = new Map(
  SECTIONS.flatMap((section) =>
    section.fields.map((field) => [key(section.id, field.id), { section, field }]),
  ),
);
export const ALL_KEYS = Object.freeze([...FIELD_INDEX.keys()]);
export const fieldOf = (settingKey) => FIELD_INDEX.get(settingKey) ?? null;
export const defaultOf = (settingKey) => fieldOf(settingKey)?.field.default;
// Preferences a person resets for themselves: this device and their account.
export const OWN_KEYS = Object.freeze(
  ALL_KEYS.filter((settingKey) => fieldOf(settingKey).section.scope !== "campaign"),
);
// What the DM may propose to a player (Monk's Player Settings, FVT-192). Volumes are a
// matter of the room, not of help, so they are left to the player.
export const PROPOSABLE_KEYS = Object.freeze(
  OWN_KEYS.filter((settingKey) => fieldOf(settingKey).field.type !== "number"),
);

export function isValidValue(settingKey, value) {
  const entry = fieldOf(settingKey);
  if (!entry) return false;
  const { field } = entry;
  if (field.type === "boolean") return typeof value === "boolean";
  if (field.type === "number")
    return (
      Number.isFinite(value) &&
      value >= (field.min ?? -Infinity) &&
      value <= (field.max ?? Infinity)
    );
  if (field.type === "choice") return field.options.some((entry) => entry.value === value);
  return typeof value === "string";
}

/** Reads every B22 value through `get(key)` (which already falls back to defaults). */
export function readValues(get) {
  return Object.fromEntries(
    ALL_KEYS.map((settingKey) => {
      let value;
      try {
        value = get(settingKey);
      } catch {
        value = undefined;
      }
      return [settingKey, isValidValue(settingKey, value) ? value : defaultOf(settingKey)];
    }),
  );
}

/**
 * Units precedence: my explicit choice, then the DM's choice for the table, then my
 * language (Italian metres as in the Italian SRD, English feet as in the English SRD).
 */
export function resolveUnits(personal, table, lang) {
  if (personal === "metric" || personal === "imperial")
    return { unit: personal, source: "personal" };
  if (table === "metric" || table === "imperial") return { unit: table, source: "campaign" };
  return { unit: lang === "en" ? "imperial" : "metric", source: "language" };
}

/**
 * Effective presentation from stored values plus the environment: system theme and
 * system reduced-motion request (media queries, supplied by the caller) and language.
 * Photosensitive mode implies reduced motion; an explicit "system" follows the OS.
 */
export function effectivePreferences(
  values,
  { lang = "it", systemLight = false, systemReduced = false } = {},
) {
  const v = { ...readValues((settingKey) => values?.[settingKey]) };
  const themeChoice = v[KEYS.theme];
  const units = resolveUnits(v[KEYS.units], v[KEYS.tableUnits], lang);
  const photosensitive = v[KEYS.photosensitive] === true;
  const motionReduced = v[KEYS.motion] === "reduced" || systemReduced === true || photosensitive;
  return {
    themeChoice,
    theme: themeChoice === "system" ? (systemLight ? "light" : "dark") : themeChoice,
    textScale: v[KEYS.textSize] / 100,
    uiScale: v[KEYS.uiScale] / 100,
    panelOpacity: v[KEYS.panelOpacity] / 100,
    font: v[KEYS.font],
    contrast: v[KEYS.contrast],
    vision: v[KEYS.vision],
    mapWords: v[KEYS.mapWords],
    nameBackdrop: v[KEYS.nameBackdrop],
    motionChoice: v[KEYS.motion],
    motionReduced,
    motionSource:
      v[KEYS.motion] === "reduced"
        ? "personal"
        : photosensitive
          ? "photosensitive"
          : systemReduced
            ? "system"
            : "none",
    photosensitive,
    unit: units.unit,
    unitSource: units.source,
    sheetOnly: v[KEYS.sheetOnly],
    keepAwake: v[KEYS.keepAwake],
    diceVolume: v[KEYS.diceVolume],
    uiVolume: v[KEYS.uiVolume],
  };
}

// ---------------------------------------------------------------- colour palettes

// Standard colours are the core ones (styles.css / combat-ui / path-ui); the other modes
// use the Okabe–Ito colour-universal set for red–green (protan, deutan) and a red / cyan
// pairing for tritan. Tests simulate each vision type (Machado et al. 2009, severity 1)
// and require ally and hostile to stay clearly apart. Shape cues are added separately.
export const PALETTES = Object.freeze({
  standard: Object.freeze({
    allyFill: "#40566a",
    allyStroke: "#c5b78d",
    hostileFill: "#774c42",
    hostileStroke: "#d29d87",
    area: "#e2c17b",
    target: "#eac387",
    pathNormal: "#e2c17b",
    pathDouble: "#ecad72",
    pathTriple: "#d9773f",
    pathBlocked: "#f29b99",
    dangerDark: "#f1a09a",
    positiveDark: "#abd0a3",
    dangerLight: "#a4262c",
    positiveLight: "#2f6b33",
  }),
  protanopia: Object.freeze({
    allyFill: "#1d4f7a",
    allyStroke: "#56b4e9",
    hostileFill: "#7a4a00",
    hostileStroke: "#e69f00",
    area: "#f0e442",
    target: "#56b4e9",
    pathNormal: "#f0e442",
    pathDouble: "#e69f00",
    pathTriple: "#d55e00",
    pathBlocked: "#cc79a7",
    dangerDark: "#e69f00",
    positiveDark: "#56b4e9",
    dangerLight: "#8a4f00",
    positiveLight: "#005a8c",
  }),
  deuteranopia: Object.freeze({
    allyFill: "#1d4f7a",
    allyStroke: "#56b4e9",
    hostileFill: "#7a4a00",
    hostileStroke: "#e69f00",
    area: "#f0e442",
    target: "#56b4e9",
    pathNormal: "#f0e442",
    pathDouble: "#e69f00",
    pathTriple: "#d55e00",
    pathBlocked: "#cc79a7",
    dangerDark: "#e69f00",
    positiveDark: "#56b4e9",
    dangerLight: "#8a4f00",
    positiveLight: "#005a8c",
  }),
  tritanopia: Object.freeze({
    allyFill: "#0f5e63",
    allyStroke: "#5fd3dc",
    hostileFill: "#7d1f2d",
    hostileStroke: "#ff6b81",
    area: "#f4f4f4",
    target: "#5fd3dc",
    pathNormal: "#f4f4f4",
    pathDouble: "#ff9ecb",
    pathTriple: "#ff6b81",
    pathBlocked: "#9aa0a6",
    dangerDark: "#ff6b81",
    positiveDark: "#5fd3dc",
    dangerLight: "#a3122a",
    positiveLight: "#0b6b72",
  }),
});

/** CSS custom properties for a vision mode and theme; the standard mode sets none. */
export function paletteVariables(vision, theme) {
  if (!PALETTES[vision] || vision === "standard") return {};
  const p = PALETTES[vision];
  return {
    "--pref-ally-fill": p.allyFill,
    "--pref-ally-stroke": p.allyStroke,
    "--pref-hostile-fill": p.hostileFill,
    "--pref-hostile-stroke": p.hostileStroke,
    "--pref-area": p.area,
    "--pref-target": p.target,
    "--pref-path-normal": p.pathNormal,
    "--pref-path-double": p.pathDouble,
    "--pref-path-triple": p.pathTriple,
    "--pref-path-blocked": p.pathBlocked,
    "--danger": theme === "light" ? p.dangerLight : p.dangerDark,
    "--positive": theme === "light" ? p.positiveLight : p.positiveDark,
  };
}

// ---------------------------------------------------------------- distances

const trim = (n, digits) => {
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
};
export function formatNumber(value, lang = "it") {
  return new Intl.NumberFormat(lang === "en" ? "en-GB" : "it-IT", {
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(value);
}
export const metersToFeet = (meters) => trim(meters / METERS_PER_FOOT, 1);
export const feetToMeters = (feet) => trim(feet * METERS_PER_FOOT, 2);

/** A canonical distance in metres shown in the chosen unit and language. */
export function formatDistance(meters, unit = "metric", lang = "it") {
  if (!Number.isFinite(meters)) return "";
  return unit === "imperial"
    ? `${formatNumber(metersToFeet(meters), lang)} ft`
    : `${formatNumber(trim(meters, 2), lang)} m`;
}

const NUMBER = String.raw`\d+(?:[.,]\d+)?`;
const GAP = "[ \\u00a0\\u202f]";
const BEFORE = String.raw`(?<![\p{L}\p{N}.,])`;
const AFTER = String.raw`(?![\p{L}\p{N}²³])`;
const METRE_WORDS = {
  m: "ft",
  metri: "piedi",
  metro: "piede",
  meters: "feet",
  metres: "feet",
  meter: "foot",
  metre: "foot",
};
const FOOT_WORDS = { ft: "m", feet: "meters", foot: "meter", piedi: "metri", piede: "metro" };
const METRES = new RegExp(
  `${BEFORE}(${NUMBER})(?:(/)(${NUMBER}))?${GAP}(m|metri|metro|meters|metres|meter|metre)${AFTER}`,
  "gu",
);
const FEET = new RegExp(
  `${BEFORE}(${NUMBER})(?:(/)(${NUMBER}))?(?:${GAP}(ft|feet|foot|piedi|piede)|(-)(foot|feet))${AFTER}`,
  "gu",
);
const parse = (text) => Number(String(text).replace(",", "."));

/**
 * Rewrites the distances of a rendered text in the chosen unit. Canonical data stays in
 * metres (Italian SRD) or feet (English SRD text); only the presentation changes, and a
 * converted text never matches again, so repeated passes are stable.
 */
export function convertDistanceText(text, unit, lang = "it") {
  if (typeof text !== "string" || !/\d/.test(text)) return text;
  if (unit === "imperial")
    return text.replace(METRES, (match, first, slash, second, word) => {
      const out = METRE_WORDS[word] ?? "ft";
      const a = formatNumber(metersToFeet(parse(first)), lang);
      return slash
        ? `${a}/${formatNumber(metersToFeet(parse(second)), lang)} ${out}`
        : `${a} ${out}`;
    });
  if (unit === "metric")
    return text.replace(FEET, (match, first, slash, second, word, hyphen, hyphenWord) => {
      const out = FOOT_WORDS[word ?? hyphenWord] ?? "m";
      const a = formatNumber(feetToMeters(parse(first)), lang);
      const value = slash ? `${a}/${formatNumber(feetToMeters(parse(second)), lang)}` : a;
      return `${value} ${hyphen ? "m" : out}`;
    });
  return text;
}

// Weights follow the same unit system (BG3, CRP-184) with the Italian SRD rule
// 1 lb = 0.5 kg; canonical inventory data stays in kilograms.
export const kgToPounds = (kg) => trim(kg / KG_PER_POUND, 2);
export const poundsToKg = (pounds) => trim(pounds * KG_PER_POUND, 2);
/** A canonical weight in kilograms shown in the chosen unit and language. */
export function formatWeight(kg, unit = "metric", lang = "it") {
  if (!Number.isFinite(kg)) return "";
  return unit === "imperial"
    ? `${formatNumber(kgToPounds(kg), lang)} lb`
    : `${formatNumber(trim(kg, 2), lang)} kg`;
}
const KG_WORDS = {
  kg: "lb",
  chilogrammi: "libbre",
  chilogrammo: "libbra",
  kilograms: "pounds",
  kilogram: "pound",
};
const POUND_WORDS = {
  lb: "kg",
  lbs: "kg",
  libbre: "chilogrammi",
  libbra: "chilogrammo",
  pounds: "kilograms",
  pound: "kilogram",
};
const KILOGRAMS = new RegExp(
  `${BEFORE}(${NUMBER})${GAP}(kg|chilogrammi|chilogrammo|kilograms|kilogram)${AFTER}`,
  "gu",
);
const POUNDS = new RegExp(
  `${BEFORE}(${NUMBER})${GAP}(lbs|lb|libbre|libbra|pounds|pound)${AFTER}`,
  "gu",
);
/** Rewrites the weights of a rendered text in the chosen unit; stable like distances. */
export function convertWeightText(text, unit, lang = "it") {
  if (typeof text !== "string" || !/\d/.test(text)) return text;
  if (unit === "imperial")
    return text.replace(
      KILOGRAMS,
      (match, value, word) => `${formatNumber(kgToPounds(parse(value)), lang)} ${KG_WORDS[word]}`,
    );
  if (unit === "metric")
    return text.replace(
      POUNDS,
      (match, value, word) =>
        `${formatNumber(poundsToKg(parse(value)), lang)} ${POUND_WORDS[word]}`,
    );
  return text;
}
/** Distances and weights of a rendered text in the chosen unit system. */
export const convertUnitsText = (text, unit, lang = "it") =>
  convertWeightText(convertDistanceText(text, unit, lang), unit, lang);

/**
 * A number and its unit rendered in two sibling nodes, as in `9 <small>m</small>`:
 * returns the converted number and unit, or null when the pair is not a distance or a
 * weight or is already in the chosen unit. Surrounding spaces are the caller's.
 */
export function convertSplitPair(numberText, unitText, unit, lang = "it") {
  const number = String(numberText ?? "").trim();
  const word = String(unitText ?? "").trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(number) || !/^\p{L}+$/u.test(word)) return null;
  const joined = `${number} ${word}`;
  const next = convertUnitsText(joined, unit, lang);
  if (next === joined) return null;
  const match = /^(\S+) (\S+)$/.exec(next);
  return match ? { number: match[1], unit: match[2] } : null;
}

// ---------------------------------------------------------------- describing values

export function describeValue(settingKey, value, lang = "it") {
  const entry = fieldOf(settingKey);
  if (!entry) return String(value);
  const { field } = entry;
  const text = (label) => label?.[lang] || label?.it || "";
  if (field.type === "boolean")
    return value ? (lang === "en" ? "On" : "Attiva") : lang === "en" ? "Off" : "Disattivata";
  if (field.type === "number") return `${value}%`;
  if (field.type === "choice")
    return text(field.options.find((entry) => entry.value === value)?.label) || String(value);
  return String(value);
}
export function describeKey(settingKey, lang = "it") {
  const entry = fieldOf(settingKey);
  return entry ? entry.field.label[lang] || entry.field.label.it : settingKey;
}

/** The changes a reset to defaults would make: [{key, from, to}]. */
export function resetChanges(values, keys = OWN_KEYS) {
  return keys
    .filter((settingKey) => fieldOf(settingKey))
    .map((settingKey) => ({
      key: settingKey,
      from: values?.[settingKey],
      to: defaultOf(settingKey),
    }))
    .filter((change) => JSON.stringify(change.from) !== JSON.stringify(change.to));
}

// ---------------------------------------------------------------- DM proposals

export const seedSlice = () => ({ proposals: [] });

export function normalizeSlice(slice, fromVersion = PREFERENCES_VERSION) {
  if (fromVersion > PREFERENCES_VERSION)
    throw Error(`Preferences data version ${fromVersion} is newer than this app`);
  const proposals = Array.isArray(slice?.proposals) ? slice.proposals : [];
  return {
    proposals: proposals
      .filter(
        (p) =>
          p &&
          typeof p.id === "string" &&
          typeof p.from === "string" &&
          typeof p.to === "string" &&
          p.values &&
          typeof p.values === "object",
      )
      .map((p) => ({
        id: p.id,
        from: p.from,
        to: p.to,
        createdAt: typeof p.createdAt === "string" ? p.createdAt : new Date(0).toISOString(),
        note: typeof p.note === "string" ? p.note.slice(0, NOTE_MAX) : "",
        values: Object.fromEntries(
          Object.entries(p.values).filter(
            ([settingKey, value]) =>
              PROPOSABLE_KEYS.includes(settingKey) && isValidValue(settingKey, value),
          ),
        ),
        status: ["pending", "accepted", "declined", "withdrawn", "reverted"].includes(p.status)
          ? p.status
          : "pending",
        respondedAt: typeof p.respondedAt === "string" ? p.respondedAt : null,
      }))
      .filter((p) => Object.keys(p.values).length),
  };
}

const refuse = (it, en) => Object.assign(Error(en), { it, en });

/**
 * The DM proposes preferences to one player. `players` are the campaign members with the
 * player role (ids). Returns the new proposal.
 */
export function proposeSettings(
  slice,
  { from, fromRole, to, players, values, note = "", now, id },
) {
  if (fromRole !== "dm")
    throw refuse(
      "Solo il DM può proporre preferenze a un giocatore.",
      "Only the DM can propose preferences to a player.",
    );
  if (!players.includes(to))
    throw refuse("Scegli un giocatore della campagna.", "Choose a player of the campaign.");
  const chosen = Object.entries(values ?? {}).filter(([settingKey]) =>
    PROPOSABLE_KEYS.includes(settingKey),
  );
  if (!chosen.length)
    throw refuse(
      "Scegli almeno una preferenza da proporre.",
      "Choose at least one preference to propose.",
    );
  for (const [settingKey, value] of chosen)
    if (!isValidValue(settingKey, value))
      throw refuse(
        "Uno dei valori proposti non è valido.",
        "One of the proposed values is not valid.",
      );
  const text = String(note ?? "").trim();
  if (text.length > NOTE_MAX)
    throw refuse(
      `La nota supera ${NOTE_MAX} caratteri.`,
      `The note is longer than ${NOTE_MAX} characters.`,
    );
  const proposal = {
    id,
    from,
    to,
    createdAt: now,
    note: text,
    values: Object.fromEntries(chosen),
    status: "pending",
    respondedAt: null,
  };
  slice.proposals.push(proposal);
  // Oldest answered proposals leave first; pending ones are never dropped.
  while (slice.proposals.length > PROPOSALS_MAX) {
    const index = slice.proposals.findIndex((p) => p.status !== "pending");
    if (index < 0) break;
    slice.proposals.splice(index, 1);
  }
  return proposal;
}

function findProposal(slice, proposalId) {
  const proposal = slice.proposals.find((p) => p.id === proposalId);
  if (!proposal) throw refuse("La proposta non esiste più.", "The proposal no longer exists.");
  return proposal;
}

/** The recipient accepts or declines a pending proposal. */
export function respondToProposal(slice, proposalId, who, response, now) {
  const proposal = findProposal(slice, proposalId);
  if (proposal.to !== who)
    throw refuse("Questa proposta non è rivolta a te.", "This proposal is not addressed to you.");
  if (proposal.status !== "pending")
    throw refuse("Hai già risposto a questa proposta.", "You already answered this proposal.");
  if (!["accepted", "declined"].includes(response)) throw TypeError("Unknown response");
  proposal.status = response;
  proposal.respondedAt = now;
  return proposal;
}

/** The DM withdraws a proposal nobody answered yet. */
export function withdrawProposal(slice, proposalId, who, now) {
  const proposal = findProposal(slice, proposalId);
  if (proposal.from !== who)
    throw refuse(
      "Puoi ritirare solo le tue proposte.",
      "You can withdraw only your own proposals.",
    );
  if (proposal.status !== "pending")
    throw refuse("Il giocatore ha già risposto.", "The player already answered.");
  proposal.status = "withdrawn";
  proposal.respondedAt = now;
  return proposal;
}

/** The player undoes an accepted proposal (their earlier values come back locally). */
export function revertProposal(slice, proposalId, who, now) {
  const proposal = findProposal(slice, proposalId);
  if (proposal.to !== who || proposal.status !== "accepted")
    throw refuse("Questa proposta non si può annullare.", "This proposal cannot be undone.");
  proposal.status = "reverted";
  proposal.respondedAt = now;
  return proposal;
}

/** Proposals this identity may read: the ones addressed to it and the ones it sent. */
export function proposalsFor(slice, who) {
  return (slice?.proposals ?? []).filter((p) => p.to === who || p.from === who);
}
export const pendingFor = (slice, who) =>
  (slice?.proposals ?? []).filter((p) => p.to === who && p.status === "pending");
