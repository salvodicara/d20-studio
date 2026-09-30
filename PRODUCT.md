# Product

<!-- impeccable:product-schema 1 -->

Product truth for the impeccable skill, compiled on 2026-09-30 from owner decisions already recorded
in this repository, without a new interview [I-249]. It is a summary, not a new authority: owner
decisions stay in `docs/DECISIONS.md` and `docs/interview/DECISIONS.md`. It contains no visual
decisions. Sources: D-xxx = `docs/DECISIONS.md`; I-xxx = `docs/interview/DECISIONS.md`; Qxxx =
`docs/interview/OPEN.md`; `#n` = row n of `docs/interview/FEATURE_MAP.md`; task.md and
phase-c-plan / asset-inventory = `changes/visual-01/` and its `prep/`.

## Platform

web

## Users

- **DM and players of D&D groups, both as primary users.** Players are central, not only people the
  DM invites [I-002]. A DM the owner does not know can start alone and invite their own players
  [I-001]. Co-DMs share preparation, running the game and DM-only content [I-037]. Invited spectators
  watch without controlling play [I-135].
- **Reference group: the owner's own table.** They play remotely: Discord for voice, each person
  on their own laptop [I-101, I-129]. The group's DM runs the map in Owlbear Rodeo [I-153, I-231].
  They level by DM milestones, without XP [I-123], and start each session by reading the previous
  recap [I-117]. d20 Folio, their current app, stays unchanged until its replacement ships [D-009].
- **Individual use.** A player can build and use a sheet with no campaign in the app while the
  table stays on paper, Discord or Owlbear [I-052, APP_BLUEPRINT "Uso parziale"].
- **Phone.** A player running a whole session from a smartphone is a goal, subject to feasibility.
  It adds to the laptop case and never replaces it [I-129]. An in-person table with an optional
  shared screen is supported, but this group does not play that way [I-101].
- **Not verified:** that the group plays in the evening, in a dim room, with physical dice next to
  a laptop or phone. That sentence appears only in the provisional `design/blueprint/DESIGN.md` §1.
  The demo session time (Thursday 20:30) is sample data [I-239]. No owner decision records when the
  group plays or which dice it uses. The product must support both dice kinds [I-032].
- **The owner** is non-technical and works in Italian. They reason by examples, and in Phase C they
  choose from screenshots, not by using the app [D-007, I-248].

## Product Purpose

- A complete D&D companion for the whole table: characters, campaigns, DM preparation, a map-based
  Table, and a rules and content Library. The owner's goals, in their own words: "il tool supremo per
  d&d, anche bello visivamente" [I-193] and "il prodotto supremo" [I-005]. For D&D Beyond users:
  "un'alternativa gratuita che fa molte più cose" [I-004].
- It replaces d20 Folio. The group keeps playing there until release, and existing players' data
  is preserved [D-009, DECISIONS "Retained baseline"].
- **Functional contract.** The whole-app blueprint in `design/blueprint/`, frozen as tag
  `blueprint-functional-v1`, is the contract [D-013, D-014, I-245]. It has 119 feature rows
  covering 528 capabilities: 521 proven, 1 partial, 6 excluded [FEATURE_MAP, BLUEPRINT_STATUS].
- **Success.** Phase C succeeds when the owner explicitly approves the look while functions,
  routes and tests stay identical [ROADMAP C, I-243]. The product itself succeeds as the sum of
  the leaders' capabilities: beautiful, easy and intuitive enough to need no guides [I-236].

## Positioning

- **One app instead of four.** It is the sum of the market leaders in one app [I-236]:
  - D&D Beyond's sheet and library;
  - a VTT map with Owlbear and Foundry tools;
  - Kanka and World Anvil's campaign and world;
  - BG3's turn-based combat, hotbar and dice presentation [I-003, I-231].
- **Nothing invented.** Every function and navigation structure copies an established leader
  pattern, with its source recorded. An adaptation is declared, never disguised [I-005, I-209,
  I-231, I-237].
- **One record.** The same character, items and resources appear on the sheet, in the campaign
  and at the Table; nothing is re-entered [#119, APP_BLUEPRINT].
- **Rules.** A 2024 rules engine on SRD 5.2.1, official EN and IT [DECISIONS "Retained baseline",
  #96–97]. It automates as much as possible and shows the breakdown [I-027]. Players act on their
  own, and the DM can always correct [I-006]. Undo is logged, never a reroll [I-229].
- **Dice and privacy.** Physical and digital dice work everywhere, including secret rolls [I-032].
  Each roll has one of four audiences [I-240]. One view rule decides what each identity sees
  [I-244]. Private notes can be "Solo io" (only me) [I-044].
- **Price.** Free. There is no marketplace, purchases or paid sessions [I-004, I-242].

## Operating Context

- **Remote play.** Personal views sit next to Discord. Voice, video and hosted music stay outside the
  app [I-101, I-102, I-118].
- **Session rituals.** Previous-session recap at the start [I-117]; scheduling by shared
  availability or a direct date [I-094]; "Add to calendar" for Google, Outlook, Microsoft 365, Yahoo
  and .ics [I-245, #2]; milestone or XP advancement [I-122, I-123].
- **Offline.** A person's own sheet and notes work offline and sync later; real-time
  collaboration needs a connection [I-114]. Local one-device behaviour is the first experiment
  [DECISIONS "Retained baseline"].
- **The blueprint.** It runs locally at `http://127.0.0.1:8881/` with synthetic data. The demo
  bar outside the app holds "Visita come" (Player/DM), "Ripristina esempio" and the dev-only
  "Direzione" selector for Phase C options; "Attuale" equals the tag [I-249, task.md].
- **Owner review loop.** Progress reaches the owner as screenshots [I-230]. Visual decisions are
  numbered options: a screenshot of the real app with the option applied, beside the copied product
  and an "element → product → source" row. They try the app hands-on only at the end [I-248].

## Capabilities and Constraints

- **Destinations (IT / EN)** [I-237]: header Inizio / Home, Personaggi / Characters, Campagne /
  Campaigns, Biblioteca / Library, with services on the right (search ⌘K, personal notes,
  notifications, preferences, help, connection, account); inside a campaign, Preparazione /
  Preparation (DM) and "Entra al Tavolo" / Enter table.
- **Fixed structures** [I-237]: the sheet has seven categories (Actions, Spells, Inventory,
  Features, Story, Notes, Extras); the campaign has a grouped sidebar; Preparation has folder groups;
  the Table has left tools, a nine-section right sidebar, a bottom action bar, top turn portraits and
  a token menu with submenus. A new command goes where the registry rule puts it, never as a new
  Table title-row button or sidebar tab.
- **Technical.** Buildless local web app: ES modules and CSS, entry `design/blueprint/index.html`.
  No remote asset, CDN or SDK at runtime; vendored local files with a recorded licence are allowed;
  `sw.js` never caches; visible strings go through `ctx.t(it, en)` [I-249, DEVELOPMENT.md].
- **Simulation limits.** The blueprint is a single-device simulation: no backend, security,
  multiplayer or persistence guarantees [D-013, BLUEPRINT_CONTRACT]. In the real product each
  identity receives only its own projection [BLUEPRINT_CONTRACT]. Shown with the label
  "Simulazione" [I-241, I-244]: AI assistant, integrations, public tables, public homebrew catalogue,
  connected dice, compatibility packs, two-step verification, age/consent, shared single device.
- **Excluded by the owner** [I-242]: hosted music, voice/video, 3D view, marketplace, paid sessions,
  AI as DM. **Phase C limits** [I-243, I-249, task.md]: no change to functions, routes, permissions,
  data, accessible names or test hooks; the 2662 Node tests and 189 browser journeys stay green.
- **Undecided** [NEXT, OPEN]: for the real product, age and parental consent per country (SV-28),
  real external-account integrations (GAP-17), a real AI assistant with its cost and privacy (GAP-18),
  public areas and moderation (Q161); player rest without the DM (Q164); a click on a sheet number
  rolls at once, adopted under delegation but unconfirmed (Q168); the public repo's code and content
  licence [README, D-002].

## Brand Commitments

- **Name.** "d20 Studio" is a working name, and `d20-studio` is a temporary repository name.
  - Name, positioning and brand belong to Phase D. There are no domain purchases or announcements
    until then [D-005, ROADMAP D].
  - No logo, crest or favicon is decided. d20 Folio's crest, favicon and app icons are on hold
    until Phase D [asset-inventory §1d].
- **Copy the leaders.** This standing, binding commitment is the owner's own: carte blanche on
  condition that nothing is reinvented [I-236]. They asked to copy the products "a mani basse"
  (wholesale) [I-238]. Every visual choice copies a named product and carries an "element → product
  → source" row [I-238, I-245, I-248].
- **References by surface** [NEXT Phase C prompt, I-231, I-237]:
  - BG3 and Solasta for the Table, action bar, turn portraits and dice;
  - D&D Beyond for the character sheet and the Library;
  - Owlbear Rodeo 2 and Foundry VTT v13 for the map and its tools;
  - Kanka and World Anvil for campaign and world.
- **What "copy" means.** Copy the UI grammar: layout, proportions, element types and behaviours,
  with sampled colour values kept as measured facts [task.md step 2]. Never bring the products'
  pixels, textures, fonts, logos or frame artwork into the repository. Reference captures stay
  outside it, marked reference-only [I-249, asset-inventory §8].
- **Decision method.** The owner decides every visual detail by number from example screenshots,
  and nothing applies app-wide before their choice [I-248]. They dislike the current look [I-245]; it
  and `design/blueprint/DESIGN.md` are provisional and replaceable [I-243].
- **Voice and language.** The UI is Italian by default with English as the alternate
  [BLUEPRINT_CONTRACT]. Communication with the owner is plain Italian with concrete examples
  [D-007]. Whether UI text may name other products is open [Q165].

## Evidence on Hand

- **Demo data** is synthetic: the sample character Livia, the session "Il sigillo della torre"
  on dates relative to the visit, and the demo scene `old-watch` [I-239, BLUEPRINT_STATUS,
  phase-c-plan §3]. The repository holds no real player data [README, AGENTS].
- **Rules content:** SRD 5.2.1 in English and official Italian, with attribution [#96–97].
- **Functional proof:** the capability census, 2662 Node tests, 189 browser journeys, and final
  completeness, privacy and findability reviews [BLUEPRINT_STATUS].
- **Assets** [asset-inventory, phase-c-plan §2–3]:
  - **Safe to commit with provenance:** d20 Folio's owner-generated 12 scene plates (6 day/night
    pairs) and 4 materials; 330 SRD monster portraits; 5 item plates; a CC0/public-domain ornament
    library; fictitious PC portraits and icon sheets (subject check needed).
  - **Safe with attribution:** game-icons.net (CC BY 3.0) and Lucide (ISC). Fonts must be OFL.
  - **On hold:** crest, favicons and social cards (brand pending); retired concept boards.
  - **Private, never in the repo:** the private content pack and real group characters.
  - **Reference-only:** the BG3 study corpus and extracted files, and competitor captures under
    `~/Workspace/Codex/d20-studio-visual-assets/references/`.
  - Masters live outside the repo. `design/blueprint/assets/` does not exist yet.
- **Taste evidence:** the owner's list of five rejected d20 Folio looks, kept outside the repo
  [asset-inventory §4].
- **Absent, do not fabricate:**
  - no human usability test (findability was checked by agents) [I-236, BLUEPRINT_STATUS];
  - no real table feedback, testimonials or production users;
  - no approved visual direction, brand, logo or custom icon family.

## Product Principles

1. **Copy, never invent.** When a leader has an established pattern, use it and cite it. Declare
   every adaptation [I-005, I-231, I-236].
2. **Automate visibly, keep people in control.** Show the calculations. Players act on their own,
   the DM corrects, and every consequence is logged and reversible [I-006, I-027, I-028, I-229].
3. **Everything findable, nothing mandatory.** The full scope stays, organised by hierarchy, search
   and progressive disclosure. Play works with little preparation, and help comes only on request
   [I-058, I-086, I-236, BLUEPRINT_CONTRACT].
4. **One truth, one privacy rule.** Every surface shares the same data, and each identity sees only
   what it may [I-044, I-240, I-244, #119].
5. **Functions first, then looks.** The frozen functional contract binds all visual work. A change
   of function goes back to the owner [D-014, I-243].

## Accessibility & Inclusion

- **Contrast and focus:** WCAG AA contrast, checked against WCAG 2.2 AA [I-238, I-243, I-246]; a
  visible focus ring, currently 3 px [I-238, I-243].
- **Colour:** meaning never relies on colour alone, and colour-blind modes exist [I-243, #110].
- **Target size:** 40 px is the blueprint's current convention for touch targets and dense tool
  columns (DESIGN.md and CSS). It is a working floor, not an owner decision. WCAG 2.2 AA requires
  at least 24 px.
- **Motion:** a reduced-motion setting, a photosensitive mode and the system's reduced-motion
  preference are honoured. The dice animation can be skipped with a click or Esc, or turned off
  [I-232, #110].
- **Personal settings:** text size and UI scale, a dyslexia-friendly font, high contrast, tooltip
  delay and panel opacity [#110, CAPABILITY_CENSUS SV-12–SV-15, SV-22].
- **Keyboard and screen reader:** keyboard works throughout, Esc behaves consistently, and a "?"
  shortcut guide lists the commands. Context menus open by keyboard and by long press. Controls
  are labelled for screen readers [#111, #119, SV-23, SV-24].
- **Language and devices:** complete EN/IT with metres or feet [#109]. Laptop first, phone as a goal
  [I-129]. Phase C keeps accessible names unchanged [I-249].
