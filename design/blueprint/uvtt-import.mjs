// B47 — Universal VTT import (.uvtt, .dd2vtt, .df2vtt). Pure: text in, a scene record, its
// lights and a report out; nothing touches the state here.
//
// Pattern: Roll20 "UVTT Support" (R20-089): the file is uploaded from the page menu; the
// image becomes the map, walls/doors become lighting objects, everything stays editable
// afterwards and only the image counts against storage. Fantasy Grounds reads the same family
// (R20-124), Owlbear's Smoke & Spectre builds map, walls, doors and lights from it (VTL-071),
// Dungeondraft writes it for every VTT (CMP-147). Walls land in the increment 4 wall model
// (spatial.mjs), edited by the Preparation scene editor; lights land in the B35 lights, edited
// by the Table's Lights tool.
//
// The format (Arkenforge/Dungeondraft "Universal VTT"): `resolution.map_size` in cells,
// `resolution.pixels_per_grid`, optional `map_origin` (cells), `line_of_sight` and
// `objects_line_of_sight` (polylines of {x, y} in cells), `portals` (doors: `bounds` = two
// points, `closed`), `lights` (`position` in cells, `range` in cells, `color` as ARGB hex),
// `image` (base64 PNG, WebP or JPEG).
import { validateSceneGeometry } from "./spatial.mjs";

export const UVTT_EXTENSIONS = Object.freeze([".uvtt", ".dd2vtt", ".df2vtt"]);
// The same image limit as the scene editor's own upload in this local demonstration.
export const UVTT_MAX_IMAGE_BYTES = 1024 * 1024;
export const UVTT_MAX_WALLS = 3000;
export const UVTT_MAX_LIGHTS = 40;
const SCENE_MIN = 300;
const SCENE_MAX = 4000;

const fail = (code, it, en) => {
  throw Object.assign(new Error(en), { code, it, en });
};
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const finite = (n) => typeof n === "number" && Number.isFinite(n);
const isPoint = (p) => isObject(p) && finite(p.x) && finite(p.y);
const round = (n) => Math.round(n * 100) / 100;

/** Image type from the first decoded bytes (PNG, JPEG, WebP), or null. */
export function sniffImage(base64) {
  let head = "";
  try {
    head = atob(String(base64).slice(0, 24));
  } catch {
    return null;
  }
  const bytes = [...head].map((c) => c.charCodeAt(0));
  if (bytes[0] === 0x89 && head.slice(1, 4) === "PNG") return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (head.slice(0, 4) === "RIFF" && head.slice(8, 12) === "WEBP") return "image/webp";
  return null;
}
const base64Bytes = (value) => {
  const text = String(value).replace(/=+$/, "");
  return Math.floor((text.length * 3) / 4);
};

/**
 * Reads a Universal VTT file. `input` is the file text (or an already parsed object);
 * `fileName` checks the extension. Throws an Error with `code`, `it` and `en` for a file that
 * cannot be imported; returns the normalized content otherwise.
 */
export function parseUVTT(input, { fileName = "", maxImageBytes = UVTT_MAX_IMAGE_BYTES } = {}) {
  const name = String(fileName || "");
  if (name && !UVTT_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext)))
    fail(
      "extension",
      `«${name}» non è un file Universal VTT: scegli un file .uvtt, .dd2vtt o .df2vtt.`,
      `“${name}” is not a Universal VTT file: choose a .uvtt, .dd2vtt or .df2vtt file.`,
    );
  let data = input;
  if (typeof input === "string") {
    try {
      data = JSON.parse(input);
    } catch {
      fail(
        "not-json",
        "Il file non si legge come Universal VTT (non è JSON valido). Nessuna scena è stata creata.",
        "The file cannot be read as Universal VTT (it is not valid JSON). No scene was created.",
      );
    }
  }
  if (!isObject(data))
    fail(
      "not-object",
      "Il file non contiene una mappa Universal VTT.",
      "The file does not contain a Universal VTT map.",
    );
  const res = data.resolution;
  const size = res?.map_size;
  const ppg = res?.pixels_per_grid;
  if (
    !isObject(res) ||
    !isPoint(size) ||
    size.x <= 0 ||
    size.y <= 0 ||
    size.x > 400 ||
    size.y > 400 ||
    !finite(ppg) ||
    ppg < 10 ||
    ppg > 1024
  )
    fail(
      "resolution",
      "Mancano le dimensioni della mappa (resolution: map_size e pixels_per_grid). Nessuna scena è stata creata.",
      "The map size is missing (resolution: map_size and pixels_per_grid). No scene was created.",
    );
  const origin = isPoint(res.map_origin) ? res.map_origin : { x: 0, y: 0 };
  let image = typeof data.image === "string" ? data.image.trim() : "";
  const prefixed = /^data:image\/(png|jpeg|webp);base64,/.exec(image);
  if (prefixed) image = image.slice(prefixed[0].length);
  if (!image || !/^[A-Za-z0-9+/=\s]+$/.test(image))
    fail(
      "image",
      "Manca l’immagine della mappa nel file. Nessuna scena è stata creata.",
      "The map image is missing from the file. No scene was created.",
    );
  image = image.replace(/\s+/g, "");
  const mime = sniffImage(image);
  if (!mime)
    fail(
      "image-type",
      "L’immagine del file non è PNG, JPG o WebP.",
      "The file’s image is not PNG, JPG or WebP.",
    );
  const bytes = base64Bytes(image);
  if (bytes > maxImageBytes)
    fail(
      "image-size",
      `L’immagine pesa ${(bytes / 1048576).toFixed(1)} MB: in questa dimostrazione locale il limite è 1 MB. Esporta la mappa con una risoluzione minore.`,
      `The image weighs ${(bytes / 1048576).toFixed(1)} MB: the limit in this local demonstration is 1 MB. Export the map at a lower resolution.`,
    );
  const list = (key) => {
    const value = data[key];
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value))
      fail(
        "shape",
        `Il campo «${key}» del file non è un elenco.`,
        `The file’s “${key}” field is not a list.`,
      );
    return value;
  };
  const polylines = (key) =>
    list(key).map((row) => {
      if (!Array.isArray(row) || !row.every(isPoint))
        fail(
          "shape",
          `Un muro del campo «${key}» ha punti non validi.`,
          `A wall in the “${key}” field has invalid points.`,
        );
      return row.map((p) => ({ x: p.x - origin.x, y: p.y - origin.y }));
    });
  const walls = polylines("line_of_sight");
  const objectWalls = polylines("objects_line_of_sight");
  const portals = list("portals").map((portal) => {
    if (!isObject(portal) || !Array.isArray(portal.bounds) || portal.bounds.length < 2)
      fail(
        "shape",
        "Una porta del file non ha due estremi.",
        "A door in the file has no two ends.",
      );
    const [a, b] = portal.bounds;
    if (!isPoint(a) || !isPoint(b))
      fail(
        "shape",
        "Una porta del file non ha due estremi.",
        "A door in the file has no two ends.",
      );
    return {
      a: { x: a.x - origin.x, y: a.y - origin.y },
      b: { x: b.x - origin.x, y: b.y - origin.y },
      closed: portal.closed !== false,
    };
  });
  const lights = list("lights").map((light) => {
    if (!isObject(light) || !isPoint(light.position) || !finite(light.range) || light.range <= 0)
      fail("shape", "Una luce del file non è valida.", "A light in the file is invalid.");
    const argb = String(light.color ?? "").replace(/^#/, "");
    const hex = /^[0-9a-f]{8}$/i.test(argb)
      ? argb.slice(2)
      : /^[0-9a-f]{6}$/i.test(argb)
        ? argb
        : "";
    return {
      x: light.position.x - origin.x,
      y: light.position.y - origin.y,
      range: light.range,
      color: hex ? "#" + hex.toLowerCase() : null,
    };
  });
  return {
    fileName: name,
    format: finite(data.format) ? data.format : null,
    cells: { x: size.x, y: size.y },
    pixelsPerGrid: ppg,
    image: `data:${mime};base64,${image}`,
    imageBytes: bytes,
    walls,
    objectWalls,
    portals,
    lights,
  };
}

/**
 * The scene record, lights and report built from a parsed file. The scene uses the
 * increment 4 wall model; lights are B35 light inputs (metres). Throws for a map that does
 * not fit the scene limits. `revision` identifies this import in every wall's source; `lang`
 * ("it" or "en") is the DM's language for the generated description and light names.
 */
export function buildUVTTScene(
  parsed,
  { id, name, metersPerCell = 1.5, revision = "uvtt-" + Date.now().toString(36), lang = "it" } = {},
) {
  const t = (it, en) => (lang === "en" ? en : it);
  const naturalW = parsed.cells.x * parsed.pixelsPerGrid;
  const naturalH = parsed.cells.y * parsed.pixelsPerGrid;
  // Large exports are scaled down to the scene limit; the image is drawn at the scene size.
  const scale = Math.min(1, SCENE_MAX / naturalW, SCENE_MAX / naturalH, 300 / parsed.pixelsPerGrid);
  const width = Math.round(naturalW * scale);
  const height = Math.round(naturalH * scale);
  const gridSize = round(parsed.pixelsPerGrid * scale);
  if (width < SCENE_MIN || height < SCENE_MIN)
    fail(
      "too-small",
      `La mappa misura ${width} × ${height} pixel: servono almeno ${SCENE_MIN} pixel per lato.`,
      `The map measures ${width} × ${height} pixels: at least ${SCENE_MIN} pixels per side are needed.`,
    );
  if (gridSize < 10)
    fail(
      "too-large",
      "La mappa è troppo grande per questa dimostrazione (celle sotto i 10 pixel).",
      "The map is too large for this demonstration (cells under 10 pixels).",
    );
  const px = (p) => ({
    x: round(p.x * parsed.pixelsPerGrid * scale),
    y: round(p.y * parsed.pixelsPerGrid * scale),
  });
  // A point a hair outside the map (rounding in the exporter) is pulled onto the edge; one
  // clearly outside is skipped and counted.
  const inside = (p) => {
    const q = { ...p };
    if (q.x < 0 && q.x > -1.5) q.x = 0;
    if (q.y < 0 && q.y > -1.5) q.y = 0;
    if (q.x > width && q.x < width + 1.5) q.x = width;
    if (q.y > height && q.y < height + 1.5) q.y = height;
    return q.x >= 0 && q.y >= 0 && q.x <= width && q.y <= height ? q : null;
  };
  const source = (title) => ({
    kind: "authored-demo",
    edition: "2024",
    revision,
    title,
  });
  const fileTitle = parsed.fileName || "Universal VTT";
  let skipped = 0;
  const segments = [];
  const addPolylines = (rows, title) => {
    for (const row of rows)
      for (let i = 1; i < row.length; i++) {
        const a = inside(px(row[i - 1]));
        const b = inside(px(row[i]));
        if (!a || !b) {
          skipped++;
          continue;
        }
        if (Math.hypot(a.x - b.x, a.y - b.y) < 0.5) continue;
        segments.push({ a, b, title });
      }
  };
  addPolylines(parsed.walls, `Universal VTT: ${fileTitle}`);
  const objectStart = segments.length;
  addPolylines(parsed.objectWalls, `Universal VTT (oggetto): ${fileTitle}`);
  const objectWalls = segments.length - objectStart;
  if (segments.length + parsed.portals.length > UVTT_MAX_WALLS)
    fail(
      "too-many-walls",
      `Il file ha più di ${UVTT_MAX_WALLS} muri: troppi per questa dimostrazione.`,
      `The file has more than ${UVTT_MAX_WALLS} walls: too many for this demonstration.`,
    );
  const walls = segments.map((segment, i) => ({
    id: `uvtt-wall-${i + 1}`,
    kind: "wall",
    a: segment.a,
    b: segment.b,
    blocksMovement: true,
    blocksSight: true,
    blocksEffect: true,
    secret: false,
    source: source(segment.title),
  }));
  let doors = 0;
  let openDoors = 0;
  parsed.portals.forEach((portal, i) => {
    const a = inside(px(portal.a));
    const b = inside(px(portal.b));
    if (!a || !b || Math.hypot(a.x - b.x, a.y - b.y) < 0.5) {
      skipped++;
      return;
    }
    doors++;
    if (!portal.closed) openDoors++;
    walls.push({
      id: `uvtt-door-${i + 1}`,
      kind: "door",
      a,
      b,
      blocksMovement: true,
      blocksSight: true,
      blocksEffect: true,
      secret: false,
      doorState: portal.closed ? "closed" : "open",
      playerOperable: true,
      interactionRangeMeters: 1.5,
      source: source(`Universal VTT (porta): ${fileTitle}`),
    });
  });
  const lights = [];
  let lightsSkipped = 0;
  parsed.lights.forEach((light, i) => {
    const at = inside(px(light));
    if (!at || lights.length >= UVTT_MAX_LIGHTS) {
      lightsSkipped++;
      return;
    }
    // The file gives one range (the lit radius, in cells). It becomes half bright and half
    // dim light, each capped at the 36 m the lights tool accepts.
    const meters = Math.min(72, light.range * metersPerCell);
    lights.push({
      id: `uvtt-light-${i + 1}`,
      preset: "custom",
      name: t(`Luce ${i + 1} (${fileTitle})`, `Light ${i + 1} (${fileTitle})`),
      x: at.x,
      y: at.y,
      bright: round(meters / 2),
      dim: round(meters / 2),
      ...(light.color ? { color: light.color } : {}),
    });
  });
  const scene = {
    id,
    name: String(name || fileTitle.replace(/\.[^.]+$/, "")).slice(0, 100) || "Universal VTT",
    description: t(
      `Importata da ${fileTitle} (Universal VTT): ${walls.length - doors} muri, ${doors} porte, ${lights.length} luci. Tutto resta modificabile.`,
      `Imported from ${fileTitle} (Universal VTT): ${walls.length - doors} walls, ${doors} doors, ${lights.length} lights. Everything stays editable.`,
    ),
    publicDescription: "",
    gridSize,
    metersPerCell,
    width,
    height,
    gridOffsetX: 0,
    gridOffsetY: 0,
    gridVisible: true,
    gridSnap: false,
    background: parsed.image,
    imageName: fileTitle,
    imageWidth: Math.round(naturalW),
    imageHeight: Math.round(naturalH),
    revealed: false,
    revealedTo: [],
    template: "blank",
    tokens: [],
    walls,
    terrain: [],
  };
  if (validateSceneGeometry(scene).length)
    fail(
      "geometry",
      "I muri del file non formano una geometria valida.",
      "The file’s walls do not form valid geometry.",
    );
  return {
    scene,
    lights,
    report: {
      walls: walls.length - doors,
      objectWalls,
      doors,
      openDoors,
      lights: lights.length,
      lightsSkipped,
      skipped,
      scale: round(scale),
      cells: { ...parsed.cells },
      pixelsPerGrid: parsed.pixelsPerGrid,
      imageBytes: parsed.imageBytes,
    },
  };
}
