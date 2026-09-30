// B47 — the Universal VTT sample file offered by the import dialog ("Use the sample file"):
// "La cripta sotto la torre", 20 × 13 cells of 50 px, in the shape Dungeondraft writes
// (.dd2vtt, format 0.3: resolution, line_of_sight polylines in cells, portals, lights and
// the image in base64). Synthetic: the image is drawn for the blueprint and the walls follow
// the drawn ones. The journey also saves it to a .dd2vtt file to import it through the file
// input, like a file exported by Dungeondraft (CMP-147) and read by Roll20 (R20-089).
import { UVTT_CRYPT_IMAGE } from "./scene-assets-images.mjs";

const line = (...points) => points.map(([x, y]) => ({ x, y }));

export const UVTT_SAMPLE_NAME = "cripta-sotto-la-torre.dd2vtt";

export const UVTT_SAMPLE = Object.freeze({
  format: 0.3,
  resolution: {
    map_origin: { x: 0, y: 0 },
    map_size: { x: 20, y: 13 },
    pixels_per_grid: 50,
  },
  line_of_sight: [
    line([1, 1], [7, 1], [7, 3]),
    line([7, 5], [7, 6], [4, 6]),
    line([3, 6], [1, 6], [1, 1]),
    line([3, 6], [3, 7]),
    line([4, 6], [4, 7]),
    line([7, 3], [12, 3], [12, 1], [19, 1], [19, 9], [16, 9]),
    line([7, 5], [12, 5], [12, 9]),
    line([1, 7], [3, 7]),
    line([4, 7], [7, 7], [7, 12], [1, 12], [1, 7]),
    line([12, 9], [12, 12], [16, 12], [16, 9]),
    line([12, 9], [13, 9]),
    line([14, 9], [16, 9]),
  ],
  objects_line_of_sight: [],
  portals: [
    {
      position: { x: 3.5, y: 6.5 },
      bounds: line([3, 6.5], [4, 6.5]),
      rotation: 0,
      closed: true,
      freestanding: false,
    },
    {
      position: { x: 13.5, y: 9 },
      bounds: line([13, 9], [14, 9]),
      rotation: 0,
      closed: false,
      freestanding: false,
    },
  ],
  environment: { baked_lighting: true, ambient_light: "ff1a1a24" },
  lights: [
    { position: { x: 13, y: 2 }, range: 4, intensity: 1, color: "ffeb9c4a", shadows: true },
    { position: { x: 18, y: 2 }, range: 4, intensity: 1, color: "ffeb9c4a", shadows: true },
    { position: { x: 2, y: 2 }, range: 4, intensity: 1, color: "fff2b25c", shadows: true },
  ],
  image: UVTT_CRYPT_IMAGE.split(",")[1],
});

/** The sample as the text of a .dd2vtt file. */
export const uvttSampleText = () => JSON.stringify(UVTT_SAMPLE);
