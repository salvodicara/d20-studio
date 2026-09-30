// Synthetic vector art for B15 (handouts, reveals, map-less scenes). Drawn for this
// prototype: no official, licensed or third-party images. Each entry is referenced by id
// from materials and scenes; the image itself never enters the shared state.

export const ART_SOURCE = Object.freeze({
  kind: "authored-demo",
  revision: "blueprint-b15-art-1",
  note: "Synthetic vector illustrations drawn for the d20 Studio prototype.",
});

const svg = (body, bg = "#1b2229") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="${bg}"/>${body}</svg>`;

const teeth = (x0, x1, y, size, down) => {
  let path = "";
  for (let x = x0; x < x1; x += size)
    path += `M${x} ${y}L${x + size / 2} ${down ? y + size * 1.3 : y - size * 1.3}L${x + size} ${y}Z`;
  return path;
};

const RAW = [
  {
    id: "art-letter",
    title: { it: "Lettera sigillata", en: "Sealed letter" },
    tags: ["lettera", "sigillo", "letter", "seal", "varro", "cera", "wax"],
    body: svg(
      `<defs><radialGradient id="l" cx="50%" cy="45%" r="65%"><stop offset="0" stop-color="#5b4128"/><stop offset="1" stop-color="#1b140e"/></radialGradient></defs><rect width="800" height="500" fill="url(#l)"/><g transform="rotate(-6 400 250)"><rect x="190" y="118" width="420" height="272" rx="6" fill="#e9d7af" stroke="#b39163" stroke-width="4"/><path d="M190 118 400 282 610 118" fill="none" stroke="#b39163" stroke-width="4"/><path d="M190 390 352 256M610 390 448 256" stroke="#cfb68a" stroke-width="3"/><circle cx="400" cy="278" r="44" fill="#8b1d1d"/><circle cx="400" cy="278" r="31" fill="none" stroke="#c9493f" stroke-width="4"/><path d="M382 262 400 296 418 262" fill="none" stroke="#f2b8a6" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></g>`,
      "#2b2118",
    ),
  },
  {
    id: "art-mimic",
    title: { it: "Un forziere con i denti", en: "A chest with teeth" },
    tags: ["mimic", "mimo", "forziere", "chest", "cripta", "crypt", "trappola"],
    body: svg(
      `<defs><radialGradient id="m" cx="50%" cy="55%" r="60%"><stop offset="0" stop-color="#34302a"/><stop offset="1" stop-color="#0d0f11"/></radialGradient></defs><rect width="800" height="500" fill="url(#m)"/><ellipse cx="400" cy="428" rx="270" ry="40" fill="#08090a"/><rect x="220" y="250" width="360" height="172" rx="14" fill="#6b4424" stroke="#2a190c" stroke-width="6"/><rect x="220" y="300" width="360" height="16" fill="#3c4146"/><rect x="220" y="372" width="360" height="16" fill="#3c4146"/><path d="M228 250 244 196Q400 138 556 196L572 250Z" fill="#2b0707"/><path d="${teeth(236, 566, 250, 22, false)}" fill="#efe6cf"/><path d="M226 204Q400 96 574 204L556 196Q400 138 244 196Z" fill="#7a4d29" stroke="#2a190c" stroke-width="6"/><path d="${teeth(250, 552, 199, 20, true)}" fill="#efe6cf"/><path d="M420 250q70 44 26 118q-12 22-34 6q24-40-8-96z" fill="#b3324a"/><circle cx="520" cy="178" r="11" fill="#f1d060"/><circle cx="520" cy="178" r="4" fill="#1a1406"/>`,
    ),
  },
  {
    id: "art-tavern",
    title: { it: "Taverna del Gufo Stanco", en: "The Weary Owl tavern" },
    tags: ["taverna", "tavern", "locanda", "inn", "gufo", "owl", "focolare", "hearth"],
    body: svg(
      `<rect width="800" height="330" fill="#3a2517"/><rect y="330" width="800" height="170" fill="#24170e"/><path d="M0 60H800M0 140H800M0 220H800" stroke="#2b1a10" stroke-width="10"/><rect x="300" y="150" width="200" height="180" fill="#1a0f09" stroke="#6d5a47" stroke-width="12"/><path d="M340 330q20-90 60-120q40 30 60 120z" fill="#e0822f"/><path d="M370 330q12-50 30-70q18 20 30 70z" fill="#f6d06a"/><rect x="560" y="90" width="150" height="110" fill="#f0c56a" opacity=".8" stroke="#5a412c" stroke-width="10"/><path d="M635 90V200M560 145H710" stroke="#5a412c" stroke-width="8"/><rect x="70" y="360" width="200" height="22" fill="#6b4424"/><rect x="95" y="382" width="16" height="70" fill="#4d3019"/><rect x="230" y="382" width="16" height="70" fill="#4d3019"/><rect x="540" y="370" width="200" height="22" fill="#6b4424"/><rect x="565" y="392" width="16" height="70" fill="#4d3019"/><rect x="700" y="392" width="16" height="70" fill="#4d3019"/><path d="M150 0v70M650 0v40" stroke="#1d140c" stroke-width="4"/><circle cx="150" cy="84" r="16" fill="#f6d06a"/><circle cx="150" cy="84" r="40" fill="#f6d06a" opacity=".15"/><circle cx="130" cy="350" r="12" fill="#c6a05a"/><circle cx="620" cy="360" r="12" fill="#c6a05a"/>`,
      "#3a2517",
    ),
  },
  {
    id: "art-crypt",
    title: { it: "Scala della cripta", en: "Crypt stairway" },
    tags: ["cripta", "crypt", "scala", "stairs", "sarcofago", "tomba", "osservatorio"],
    body: svg(
      `<defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3134"/><stop offset="1" stop-color="#07090a"/></linearGradient></defs><rect width="800" height="500" fill="url(#c)"/><path d="M160 500V190Q400 20 640 190V500" fill="#0b0d0e" stroke="#5b6568" stroke-width="16"/><path d="M250 500V240Q400 130 550 240V500" fill="#050606" stroke="#3f474a" stroke-width="10"/><path d="M230 470H570M260 430H540M288 392H512M312 356H488M334 322H466" stroke="#4e585b" stroke-width="12"/><rect x="100" y="250" width="14" height="60" fill="#d9cfb6"/><path d="M107 250q-8-18 0-30q8 12 0 30z" fill="#f3c55d"/><circle cx="107" cy="236" r="26" fill="#f3c55d" opacity=".15"/><rect x="686" y="250" width="14" height="60" fill="#d9cfb6"/><path d="M693 250q-8-18 0-30q8 12 0 30z" fill="#f3c55d"/><circle cx="693" cy="236" r="26" fill="#f3c55d" opacity=".15"/>`,
    ),
  },
  {
    id: "art-wagon",
    title: { it: "Il carro rovesciato", en: "The overturned wagon" },
    tags: ["carro", "wagon", "strada", "road", "mercante", "merchant", "tracce"],
    body: svg(
      `<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a4a6b"/><stop offset=".55" stop-color="#d98a5a"/><stop offset=".56" stop-color="#3d4a33"/><stop offset="1" stop-color="#232b1d"/></linearGradient></defs><rect width="800" height="500" fill="url(#w)"/><path d="M300 500Q400 330 460 280L520 280Q470 360 520 500Z" fill="#6d5c42"/><g transform="rotate(-24 380 360)"><rect x="250" y="300" width="260" height="90" fill="#6b4424" stroke="#2a190c" stroke-width="6"/><path d="M250 330H510M250 360H510" stroke="#4d3019" stroke-width="5"/></g><circle cx="520" cy="300" r="52" fill="none" stroke="#2a190c" stroke-width="10"/><path d="M520 248V352M468 300H572M483 263 557 337M557 263 483 337" stroke="#2a190c" stroke-width="5"/><rect x="170" y="400" width="54" height="44" fill="#8a6a3f" stroke="#2a190c" stroke-width="4"/><rect x="600" y="410" width="44" height="36" fill="#8a6a3f" stroke="#2a190c" stroke-width="4"/><path d="M640 470l18-10 18 10M680 480l18-10 18 10M720 470l18-10 18 10" stroke="#1a1f15" stroke-width="5" fill="none"/>`,
    ),
  },
  {
    id: "art-notice",
    title: { it: "Avviso della gilda delle lanterne", en: "Lantern guild notice" },
    tags: ["avviso", "notice", "gilda", "guild", "lanterne", "lanterns", "oben"],
    body: svg(
      `<rect width="800" height="500" fill="#4a3322"/><path d="M0 0H800V500H0Z" fill="none" stroke="#2c1d12" stroke-width="40"/><path d="M0 120H800M0 250H800M0 380H800" stroke="#3b2819" stroke-width="6"/><rect x="250" y="70" width="300" height="360" fill="#efdfb8" stroke="#b39163" stroke-width="4" transform="rotate(3 400 250)"/><circle cx="400" cy="92" r="9" fill="#555"/><path d="M300 150H500M300 190H500M300 230H470M300 270H500M300 310H440" stroke="#8c7250" stroke-width="7" stroke-linecap="round"/><path d="M400 340l-18 24h36z M400 364v28" fill="#c7902f" stroke="#8c6420" stroke-width="3"/>`,
      "#4a3322",
    ),
  },
  {
    id: "art-goblin",
    title: { it: "Occhi nel buio", en: "Eyes in the dark" },
    tags: ["goblin", "sentinella", "esploratore", "sentry", "scout", "creatura"],
    body: svg(
      `<defs><radialGradient id="g" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#2b3a2a"/><stop offset="1" stop-color="#0b100b"/></radialGradient></defs><rect width="800" height="500" fill="url(#g)"/><path d="M300 500Q300 330 400 300Q500 330 500 500Z" fill="#101710"/><path d="M330 250Q400 170 470 250Q480 320 400 340Q320 320 330 250Z" fill="#1d2a1b"/><path d="M335 245 230 200 330 275ZM465 245 570 200 470 275Z" fill="#1d2a1b"/><circle cx="375" cy="262" r="9" fill="#f2c94c"/><circle cx="425" cy="262" r="9" fill="#f2c94c"/><path d="M560 120V470" stroke="#3a2a19" stroke-width="10"/><path d="M548 128l12-60 12 60z" fill="#9aa3a6"/>`,
    ),
  },
];

const dataURI = (markup) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup);

export const ART = Object.freeze(
  RAW.map((entry) =>
    Object.freeze({
      id: entry.id,
      title: Object.freeze({ ...entry.title }),
      tags: Object.freeze([...entry.tags]),
      image: dataURI(entry.body),
      source: ART_SOURCE,
    }),
  ),
);

export const builtInArt = (id) => ART.find((entry) => entry.id === id) ?? null;
