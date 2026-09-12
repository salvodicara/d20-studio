# d20 Studio

A new home for the design and development of a D&D table companion. **d20 Studio is a working
name.** The final name, positioning and brand will be chosen after the product experience is clear.

This repository currently contains the project direction, research plan and documentation checks.
It does not contain a playable application yet.

- [Current task and next session](docs/NEXT.md)
- [Product decisions](docs/DECISIONS.md)
- [Delivery sequence](docs/ROADMAP.md)
- [How AI work is checked](docs/WORKFLOW.md)
- [Research brief](docs/RESEARCH_BRIEF.md)
- [Evidence and historical sources](evidence/SOURCES.md)

The project can be developed with Codex/GPT alone. A Claude subscription is not a prerequisite.
The owner is now defining the whole product through a long Grill-me interview and conceptual
Markdown pages. Mockups and prototypes wait for explicit approval of the complete contract (D-012).
Research and installed skills are retained. Agents handle evidence and routine technical work.

## Contributing and checks

Agents start at [AGENTS.md](AGENTS.md). Interview documents and owner conversations are in Italian; other documentation may be English; the eventual product supports English and Italian.

Use Node 24.16.0, then `npm ci` and `npm run check`. These commands currently check document and
configuration formatting only. Application checks will be added with the behavior they verify.
GitHub Actions uses standard public Ubuntu runners, without paid AI calls or artifact uploads.

The previous d20 Folio production app remains separate. No old repository history, player data,
private content pack, credentials or product artwork is imported into this initial repository.
Public visibility is not a decision on the final code/content license; establish redistribution
rights before importing or releasing third-party material.
