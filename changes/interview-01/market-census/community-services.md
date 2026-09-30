# Market census — community and services cluster

Access date: **2026-09-23**. Author: market-census subagent (interview-01). This file covers the services
and cross-cutting capabilities around play. It includes session scheduling and availability,
looking-for-group (LFG) and recruiting, and table-safety tools. It also covers Discord integrations,
notifications, accounts, roles and invites, age controls, and data export, backup and GDPR. Further
areas are content licensing and marketplaces, AI assistants and session transcription, and
audio. The last group is accessibility, offline and low-bandwidth use, and localization. It extends
[REFERENCE_COVERAGE](../../../docs/interview/REFERENCE_COVERAGE.md), especially GAP-14 and
GAP-16 to GAP-19. It does not replace the family-level audits in
[reference-audits/](../../../docs/interview/reference-audits/). When a capability is already in
those audits (for example DB-09, DB-23, DB-24 and DB-25 in `beyond.md`, or Foundry #2, #27 and #28),
the row points to the audit instead of repeating it.

## Scope, sources and access limits

- **What a row records:** one user-facing capability and its UX pattern. The pattern says where the
  command lives, how it is operated, what feedback it gives, how it is corrected, and who may use it.
  A row is a precedent, not a decision. Adoption follows the owner decisions in
  [DECISIONS](../../../docs/interview/DECISIONS.md), and the scope states of
  [FEATURES](../../../docs/interview/FEATURES.md) still apply. F-017 (calls) stays excluded.
  F-030 (internal music) stays out of scope. F-063 (public LFG) stays an unresolved exception
  (Q161).
- **How sources were read:**
  - Roll20 Help Center and D&D Beyond Support are Zendesk sites. Their pages returned 403 to the
    summariser, so article bodies were read through the public Zendesk Help Center API. Dates are
    given as `edited` (last content edit). The API's `updated_at` changes with metadata, so it is
    not used.
  - Kanka docs were read from the published Markdown sources.
  - The Owlbear Rodeo docs, World Anvil and the Discord support pages returned 403. For these, rows
    cite the official page URL with **search-result excerpts** and are marked "(excerpt)". The
    Owlbear blog was fetched directly.
  - Reddit was not accessed. Community signals come from forum-thread titles and snippets and are
    labelled "community".
- **What was not done:** no accounts were created, no product was installed or run, no purchase or
  subscription was made, and no human playtest took place. Store pages and AI-tool marketing pages
  contain the vendor's own claims. They are labelled "store page" or "marketing". Features that are
  announced but not shipped are never counted as available.
- **Evidence kinds:**
  - *official docs*: vendor help center or knowledge base.
  - *release notes*: vendor changelog or blog release post.
  - *store page*: package or extension listing written by its author.
  - *marketing*: vendor landing page.
  - *secondary*: press or an independent review.
  - *community*: forum or Reddit opinion, used only as a demand or risk signal.
- **Coverage column:**
  - `PARTIAL — F-xxx` means the family exists in FEATURES but this sub-capability or pattern is not
    yet specified.
  - `NEW` means no family or anchor covers it. The nearest F-code or GAP is given when useful.
  - `Out of scope` means an owner or delegated decision currently excludes it. The row is kept as a
    precedent.
  - `Context` means the row is not a capability to adopt. It informs a decision.
- **Rules text:** none is reproduced. Quotes are avoided. Product names are used only to cite
  sources.

## Census table

### Home — discovery, recruiting entry points

| ID | Product (core / official / third-party) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SVC-001 | D&D Beyond (core site) | Looking for Group hub | Top-level LFG destination with three routes: professional-DM games through StartPlaying, local events and stores through Event Finder, and the official D&D Discord. There is no in-app listing of home groups. A FAQ says the format (in person, online or hybrid) depends on the event. | https://dndbeyond-support.wizards.com/hc/en-us/articles/51836977304212 (2026-07-30); /51836742477844 (2026-07-30) | official docs | PARTIAL — F-063 (Q161 open), audit DB-25 | Home |
| SVC-002 | D&D Beyond × StartPlaying (partnership) | Paid first session with a professional DM | "Start for $0.99" button in the StartPlaying section of LFG. Players book alone or in a group of up to 6. Play uses the DDB sheet and Maps. Conduct reports go through StartPlaying's code of conduct. | https://dndbeyond-support.wizards.com/hc/en-us/articles/51836859285780 (2026-07-28) | official docs | NEW — outside F-063 bounds (paid DM excluded) | Home |
| SVC-003 | Roll20 (core) | Join-a-Game entry points | "Join A Game" appears on the home page, in the Games menu and on My Games. All three open the LFG search, with listings at the bottom. | https://help.roll20.net/hc/en-us/articles/360037774473 (edited 2025-11-17) | official docs | PARTIAL — F-063 | Home |
| SVC-004 | Roll20 (core) | LFG search filters | The "Find Games to Join" box opens Advanced Search Options: system, language, keyword, day and approximate start time. Results show in the viewer's time zone. Toggles: "welcomes new players" and "Mature Content (18+)". Mature listings are hidden unless that box is checked, even the user's own. | same as SVC-003 | official docs | PARTIAL — F-063 | Home |
| SVC-005 | Roll20 (core) | Pick Up Games (drop-in) | The GM opts in with a checkbox on the listing. The game shows in the right column of Join a Game from 2 h before start until 30 min after, or until it is full. The list auto-refreshes every 60 s. Join Game then Launch Game joins at once. A previously removed user cannot rejoin this way. | same as SVC-003 | official docs | NEW — F-063 variant | Home |
| SVC-006 | Roll20 (core) | Player Directory (players seeking a group) | A player lists themselves from their profile: an "Actively seeks group for" multi-select, with an opt-out. GMs filter by game, read the bio, and invite by private message. | https://help.roll20.net/hc/en-us/articles/360039178994 (edited 2023-09-04) | official docs | NEW — F-063 names player-seeks-DM as a separate, unapproved branch | Home |
| SVC-007 | Roll20 (core) | LFG ranking signals, shown to GMs | Ranking improves with an image and description, a single system tag, a next session less than 3 months away, a smaller group and discussion activity. A listing can take up to 2 h to appear. | same as SVC-003 | official docs | NEW — F-063 | Home |
| SVC-008 | Kanka (core) | Public campaign directory with an "open to applications" filter | The Public campaigns page filters by locale, system, premium and open status. A campaign is listed only with at least 5 entries visible to the public role, recomputed nightly at 01:00 UTC. | https://docs.kanka.io/en/latest/features/campaigns/public-campaigns.html (docs 1.0 "latest", undated) | official docs | PARTIAL — F-063 (R157) | Home |
| SVC-009 | Warhorn (core) | Seat-limited sign-up with a FIFO waitlist | Each game has a maximum number of slots. "Sign Up To Play" becomes "Join Player Waitlist" when the game is full. The waitlist is first-in-first-out, and staff cannot reorder it. Open tables show separate Play and GM buttons. | https://warhorn.net/ ; https://doughahn.github.io/unofficial-opf-guides/warhorn/warhorn/ (excerpts, undated) | official site (excerpt) + community guide | NEW — F-011/F-063 | Home |
| SVC-010 | Alchemy (core) | Public games with spectators and content warnings before joining | The GM adds content warnings. Prospective players and spectators see them before joining or viewing. A "mature" tag shows on game cards. | https://help.alchemyrpg.com/en/articles/9821436-safety-tools (2024-09-04) | official docs | NEW — F-032/F-063 | Home |
| SVC-011 | r/lfg and community LFG boards | Bracket-tag post conventions | Titles carry tags such as system, online or in person, LFP or LFG, and one-shot; posters are advised to state time zone, days and times. | https://www.postpone.app/analysis/subreddit/lfg (2026, third-party); Roll20 forum thread "What makes a great LFG thread" (search excerpts) | community | NEW — informs F-063 fields | Home |
| SVC-012 | Roll20 (core) | Achievements (profile badges) | Badges on the profile for actions such as posting an LFG listing, running a game for six months or completing the tutorial. | https://help.roll20.net/hc/en-us/articles/360042175933 (edited 2025-10-27) | official docs | Context — no gamification in intent; recorded for completeness | Home |

### Characters — portability, joining with a character, external sheets

| ID | Product (core / official / third-party) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SVC-013 | D&D Beyond (core) | Join-a-Campaign landing with four character choices | The invite link opens "Join a Campaign" with four choices: create a character, create from a premade, claim a character the DM made available, or pick an existing one ("Join with this character"). To add a second character, the player opens the link again. If a chat app breaks the link, it should be pasted into a browser. | https://dndbeyond-support.wizards.com/hc/en-us/articles/14025808350612 (2025-08-27) | official docs | PARTIAL — F-006/F-008, J17 | Characters |
| SVC-014 | D&D Beyond (core) | Leave a campaign from the character list | My Characters lets the player view, edit, copy or delete a character, or choose "Leave Campaign" per character. The list can be searched by name, level, class, species or campaign, and sorted by created, name, level or modified. | https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193953556 (2025-09-17; the article says it is not yet updated) | official docs | PARTIAL — F-006 exit path | Characters |
| SVC-015 | D&D Beyond Maps (core) | Player hides their own sheet from other players; the DM always sees it | A per-player visibility control in Maps. | https://dndbeyond-support.wizards.com/hc/en-us/articles/48753192328852 (2026-04-29) | official docs | PARTIAL — F-007/F-008 | Characters |
| SVC-016 | Roll20 Characters (core; formerly Character Vault) | Account-level character library used across games | Tools → Roll20 Characters. Characters can be created without a game, then moved into and out of games. Sheets include a roll log and compendium for in-person play. The copy is not synced live with the in-game copy and needs a manual save. | https://help.roll20.net/hc/en-us/articles/360037258594 (edited 2024-02-16) | official docs | PARTIAL — F-008/F-028 | Characters |
| SVC-017 | Roll20 (core) | GM setting: allow importing characters from Roll20 Characters | A Game Settings toggle. The import has paid-tier limits: a free creator's game accepts 3 exports. The game's current access level is shown under the toggle. | https://help.roll20.net/hc/en-us/articles/29620477106711 (edited 2026-09-05) | official docs | NEW (commercial limit not adopted) — F-006/F-008 | Characters |
| SVC-018 | Roll20 (core) | GM setting: players create their own characters | Game Settings "Player Character Creation". Permissions are assigned automatically. The GM still owns the character and can edit, move or delete it. | same as SVC-017 | official docs | PARTIAL — F-006/F-008 | Characters |
| SVC-019 | Roll20 (mobile web) | Play from a phone: a linked sheet rolls to the game chat, with no map | On roll20.net/characters, the player links the sheet to an active game. Rolls post to the game chat. The phone shows no maps or tokens. The page gives Add-to-Home-Screen steps. The native app has been delisted. | https://help.roll20.net/hc/en-us/articles/4411213438231 (edited 2026-03-24) | official docs | PARTIAL — F-016/F-026 | Characters |
| SVC-020 | Avrae (official DDB-owned Discord bot) | Import a character into Discord and refresh it | `!import <sheet URL>` imports a sheet, `!update` refreshes it from the source, `!sheet` displays it, and `!char list` lists characters per Discord account. | https://avrae.io/commands (accessed 2026-09-23) | official docs | NEW (GAP-17) | Characters |
| SVC-021 | Beyond20 (third-party browser extension) | Roll from a web sheet into a VTT or Discord | Adds roll buttons to the DDB sheet sidebars. Rolls go to open Roll20 or Foundry tabs, or to one chosen Discord channel, but not both at once. | https://github.com/kakaroto/Beyond20 ; https://beyond20.here-for-more.info/discord.html | store/project page | NEW (GAP-17) | Characters |
| SVC-022 | Saga20 (third-party) | Player claims their own character page | Players own and edit a character page with its sheet and session history. | https://saga20.com/ (© 2026) | marketing | PARTIAL — F-008/F-029 | Characters |
| SVC-023 | Quest Portal (Pro tier) | AI "Generate Characters" | The user asks the assistant for a complete sheet in a chosen template. | https://www.questportal.com/features (accessed 2026-09-23) | marketing | NEW (GAP-18) | Characters |

### Campaign — identity, invites, roles, membership

| ID | Product (core / official / third-party) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SVC-024 | Roll20 (core) | Game Details page as the campaign hub and first landing page after an invite | Shows the Launch button, the next session date, the description, the private forum and content links. New players land here after accepting an invite. | https://help.roll20.net/hc/en-us/articles/29620064514071 (edited 2025-10-28) | official docs | PARTIAL — F-006 | Campaign |
| SVC-025 | Roll20 (core) | Campaign profile | Game icon: drag an image or click "Choose a File" (it goes to the art library), and hover for "Change Image". Name edits inline with Save. "Playing" system picker: only the first 2 alphabetically show in LFG. Description supports Markdown. | same as SVC-024 | official docs | PARTIAL — F-006 | Campaign |
| SVC-026 | Roll20 (core) | Single Creator role; perks and purchases tied to the Creator | Exactly one Creator per game. Subscription perks and add-ons come from the Creator's account. The Creator is highlighted in the player list. | https://help.roll20.net/hc/en-us/articles/29620515876375 (edited 2026-07-28) | official docs | PARTIAL — F-006 (last responsible person) | Campaign |
| SVC-027 | Roll20 (core) | Email invite with a role | The "Invite Players" dialog takes an email address and an "Invite as" choice (Player or GM), then Send Invite. A Pending Invitations list shows invites until accepted. | same as SVC-026 | official docs | PARTIAL — F-006 | Campaign |
| SVC-028 | Roll20 (core) | Reusable player join link that changes on kick | The join link in the same dialog has unlimited uses. It changes whenever a player is kicked. | same as SVC-026; https://help.roll20.net/hc/en-us/articles/360037771693 (edited 2023-09-04) | official docs | PARTIAL — F-006 (revocation) | Campaign |
| SVC-029 | Roll20 (core) | Single-use co-GM invite link | "Generate GM Link" makes a link that works once and expires after 48 h. Active links are listed and can be cancelled. The dialog warns to share it only with a trusted person. | same as SVC-026 | official docs | NEW — F-006 (co-DM invite) | Campaign |
| SVC-030 | Roll20 (core) | Promote or demote a co-GM, with a defined power list | The Creator hovers a player's avatar and picks Promote to GM or Demote to Player. The page reloads and the player gets a GM tag. A co-GM can use layers, pages, handouts and their permissions, the jukebox, GM whispers and macros. A co-GM cannot use rollback or the Transmogrifier, and has only limited access to the Game Details settings. | same as SVC-026; https://help.roll20.net/hc/en-us/articles/32139162477719 (edited 2025-05-20) | official docs | PARTIAL — F-006 powers matrix | Campaign |
| SVC-031 | Roll20 (core) | Kick from game; player leaves game | The GM hovers an avatar and picks "Kick from Game": the player loses access and the join link changes. The player's Settings menu shows only "Leave Game", which removes the game from their list. | https://help.roll20.net/hc/en-us/articles/360037771693 ; SVC-024 source | official docs | PARTIAL — F-006 | Campaign |
| SVC-032 | Roll20 (core) | Public access to the game (Plus/Pro) | Game Settings toggle. Visitors can read journal entries shared with all players and the chat archive, and can post in the game forum. Off by default. | same as SVC-017 | official docs | NEW — F-007 | Campaign |
| SVC-033 | D&D Beyond (core) | Invite by copying a link; separate invite and map links | Campaign page: "Copy Link" under the name. In Maps, the "i" menu offers "Invite Link" (new members) or "Map Link" (existing members jump to the current map). | https://dndbeyond-support.wizards.com/hc/en-us/articles/14025808350612 ; /46385404580756 (edited 2026-02-17) | official docs | PARTIAL — F-006/F-016 | Campaign |
| SVC-034 | D&D Beyond (core) | Only one DM, no co-DM (a gap) | Only one DM hosts a campaign. Feature requests on the forums date from 2020 to 2024. The reported workaround (sharing the account) breaks the terms of service. | https://www.dndbeyond.com/forums/d-d-beyond-general/general-discussion/200798-multi-dm-campaigns-or-co-dms (and similar threads) | community | NEW demand signal — F-006 co-DM | Campaign |
| SVC-035 | Owlbear Rodeo 2 (core) | Join by link, then request access for the creator to approve | Players open the room link, pick a name and request access. The creator approves or denies. Accepted players can return even when the creator is not present. There is no password. | https://blog.owlbear.rodeo/owlbear-rodeo-dev-log-7/ (2022-05-26) | release notes (dev log) | PARTIAL — F-006 (approval gate) | Campaign |
| SVC-036 | Owlbear Rodeo 2 (core) | Creator assigns GM or Player; GM handover | Only the room creator sets roles. The creator can remove their own GM role to hand a session to someone else. | https://docs.owlbear.rodeo/docs/rooms/ (excerpt; direct fetch 403); SVC-035 source | official docs (excerpt) | PARTIAL — F-006 | Campaign |
| SVC-037 | Owlbear Rodeo 2 (core) | Player manager: online/offline roster and kick | Lists every player who has joined, with online or offline state. A kick removes the player, who must request access again. | same as SVC-035 | release notes | PARTIAL — F-006 | Campaign |
| SVC-038 | Kanka (core) | Invite links with expiry, use limit and role; admin role not allowed | Settings → Members → Invites → "Invite people" sets expiry, number of uses and role. A copy-to-clipboard icon sits beside each link. | https://docs.kanka.io/en/latest/features/campaigns/members.html (docs 1.0 latest) | official docs | PARTIAL — F-006 | Campaign |
| SVC-039 | Kanka (core) | Remove a member with an in-app notice; their content is kept | The "…" menu → remove. The member receives a notification. Content they created is not deleted. | same as SVC-038 | official docs | PARTIAL — F-006/F-007 | Campaign |
| SVC-040 | Kanka (core) | "View campaign as member" to test permissions | Settings → Members → "View campaign as member", or an entry's permissions → "View as". Edits made while viewing are logged as done by the admin. Content marked "self" stays hidden. "Back to my user" appears on every page. | https://docs.kanka.io/en/latest/guides/testing-permissions.html | official docs | NEW — F-006/F-007 (private/public separation) | Campaign |
| SVC-041 | Kanka (core) | Applications to join | Campaign dashboard "Apply" button with a message, which can be edited or cancelled. Admins approve or reject in Settings → Applications, with a reply that reaches the applicant as a notification. | https://docs.kanka.io/en/latest/features/campaigns/applications.html | official docs | PARTIAL — F-063 (R157) | Campaign |
| SVC-042 | Kanka (core) | Read-only public role, with a warning when a public campaign would show nothing | Sharing tab → visibility set to public. If the public role has no permissions, a warning offers "Fix this issue". | same as SVC-008 | official docs | NEW — F-007/F-014 | Campaign |
| SVC-043 | Kanka (core) | Last-login sharing is opt-in, off by default | Profile setting. When on, other members of shared campaigns can see the user's last login. | https://docs.kanka.io/en/latest/account/profile.html | official docs | NEW — privacy default | Services/Settings |
| SVC-044 | Foundry (core) | Role ladder: Player, Trusted, Assistant GM, Gamemaster; per-user access keys | Already audited as Foundry #2 (Users, core 13.350). Assistant GM is the co-DM precedent. World settings require Assistant GM or the "Configure Settings" permission. | https://foundryvtt.com/article/users/ ; https://foundryvtt.com/article/settings/ (13.351, 2026-01-26) | official docs | PARTIAL — F-006, audit foundry #2 | Campaign |
| SVC-045 | Foundry (core) | Invitation Links dialog with local and internet addresses | Game Settings → Invitation Links shows a LAN address and a public address for self-hosted worlds. | https://foundryvtt.com/article/hosting/ (excerpt) | official docs (excerpt) | PARTIAL — F-006/F-016 | Campaign |
| SVC-046 | Archivist AI (third-party) | Owner, Admin and Player roles; journal visibility Private, Role-based or Full party | The Owner cannot be removed. Admins have the same powers. Players edit only their assigned character page. Journals are private by default. | https://www.myarchivist.ai/documentation (accessed 2026-09-23) | official docs | PARTIAL — F-006/F-007 | Campaign |

### Campaign — scheduling, attendance, reminders

| ID | Product (core / official / third-party) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SVC-047 | Roll20 (core) | "Next Game Will Be" field with automatic time-zone conversion | On Game Details, the Creator sets the date and time. Each viewer sees their local time. The docs warn about the 12-hour picker (12:00 AM means midnight). | same as SVC-024 | official docs | PARTIAL — F-011 | Campaign |
| SVC-048 | StartPlaying (core) | Recurring cadence at creation | Frequency: weekly, bi-weekly, monthly or custom. The GM also picks a day of the week and a time on :00 or :30, plus minimum and maximum players. | https://intercom.help/startplaying/en/articles/8718974 (2026-07-17) | official docs | PARTIAL — F-011 (recurrence open) | Campaign |
| SVC-049 | StartPlaying (core) | Batch-schedule up to 10 sessions | From the adventure schedule, weekly or bi-weekly batches. Not available for monthly or custom cadence. | https://intercom.help/startplaying/en/articles/8908689 (excerpt) | official docs (excerpt) | NEW — F-011 | Campaign |
| SVC-050 | StartPlaying (core) | Campaign members are enrolled in every new session automatically | Campaign type adds members to each scheduled session. A one-shot needs booking per session. | same as SVC-048 (excerpt) | official docs | PARTIAL — F-011 | Campaign |
| SVC-051 | StartPlaying (core) | Booking cut-off, instant booking, notify followers | Optional fields: Cut-Off Time (hours of notice), "Instantly Bookable", "Notify Followers". | same as SVC-048 | official docs | NEW — F-011/F-063 | Campaign |
| SVC-052 | StartPlaying (core) | Player skips a session or leaves the campaign, with a 24 h cutoff | My Games → campaign card → "Change Attendance" → pick a session to skip. "Leave Campaign" opens a form. Both are blocked within 24 h of the start; the player must then contact the GM. The state shows as "Skipping". Un-skipping is allowed until 24 h before. | https://intercom.help/startplaying/en/articles/8700377 (2026-03-24) | official docs | PARTIAL — F-011 (absences) | Campaign |
| SVC-053 | StartPlaying (core) | GM reschedule vs cancel | Reschedule: Schedule tab → ⋯ → Edit Session → Reschedule. Existing skips carry over, so players must un-skip. Cancel: Manage → Delete. Players get an email on cancellation. Charges run 1 h after the start time. | https://intercom.help/startplaying/en/articles/8719110 (2026-07-13) + search excerpt | official docs | PARTIAL — F-011 | Campaign |
| SVC-054 | StartPlaying (core) | GM marks a player as skipping | A help article of this title exists. Only the title was seen, not the body. | https://intercom.help/startplaying/en/articles/8987348 (title only) | official docs (title only) | NEW — F-011 (uncertain detail) | Campaign |
| SVC-055 | Discord (core) | Scheduled Events with "Interested" | Server Events tab → Create Event. Location: voice channel, stage or external/free text. Members who mark "Interested" are notified when the host starts the event. Requires the Manage Events permission. | https://support.discord.com/hc/en-us/articles/4409494125719 (excerpt) | official docs (excerpt) | NEW — F-011 (GAP-17) | Campaign |
| SVC-056 | Discord (core) | Native recurring events | Daily, weekly or monthly recurrence (2024 update). An edit applies to all future occurrences; one occurrence cannot be edited alone. The guide says "Interested" members get a reminder about 10 min before; the official article only confirms the notice at start. | https://peakbot.pro/blog/how-to-set-up-discord-events-2026 (third-party guide) | secondary | NEW — F-011 | Campaign |
| SVC-057 | Sesh (third-party Discord bot) | Event creation from natural language | `/create` with a free-text time ("8pm Friday"), duration, channel and mentions. `/ai` builds an event or poll from prose and asks for confirmation first. | https://sesh.fyi/manual/ (accessed 2026-09-23) | official docs | NEW — F-011 | Campaign |
| SVC-058 | Sesh | RSVP states, attendance cap and waitlist | Attending, Maybe or Not attending (custom options on premium). An attendance limit creates an automatic waitlist, and a waitlisted user gets a DM when a spot opens. RSVP can assign a Discord role. "Close RSVPs early" is premium. | same as SVC-057 | official docs | NEW — F-011 | Campaign |
| SVC-059 | Sesh | Availability "Time Finder" and polls | An availability poll on the web or in Discord. Premium adds anonymous voting, hidden results and role limits. Plain polls allow up to 15 options, single or multiple vote, and a "➕" button to suggest an option. A result converts into an event. | same as SVC-057 | official docs | PARTIAL — F-011 (availability poll confirmed, R073) | Campaign |
| SVC-060 | Sesh | Personal and server time zones; recurrence keeps local time across DST | `/settings` sets a personal time zone, with a server default. Discord timestamps show each viewer's local time. Recurring events keep their local time across daylight-saving changes. | same as SVC-057 | official docs | PARTIAL — F-011 (time zones open) | Campaign |
| SVC-061 | Sesh | Event thread, native-event mirror, audit log | An auto-created thread per event that attendees join. A mirror to Discord's native events. Server logs record creates, edits, RSVPs and deletes. | same as SVC-057 | official docs | NEW — F-011/F-029 | Campaign |
| SVC-062 | when2meet (third-party) | Drag-to-paint availability grid with a heatmap | The organiser sets a date range and hours. Each participant drags across slots, with autosave and no submit. The cell darkens as more people are free. Hovering a cell lists who is available. A time-zone dropdown is provided. | https://www.usecarly.com/blog/how-to-use-when2meet/ ; https://savvycal.com/articles/when2meet/ (2026 guides) | secondary | PARTIAL — F-011 (overlap view confirmed, R073) | Campaign |
| SVC-063 | Rallly (open-source) | Date poll with Yes / If need be / No; voting without an account; finalize and notify | Availability table; each participant sees their own time zone. The Pro tier adds email on each response and a finalize-and-notify-everyone step. The UI offers 10+ languages. | https://rallly.co/ (accessed 2026-09-23); https://github.com/lukevella/rallly | official site | PARTIAL — F-011 | Campaign |
| SVC-064 | Sesh | Opt-in reminders | Reminder DMs need the RSVP confirmation DM to be turned on. Up to 5 channel notifications per event, before or at the start, with placeholders and role mentions. `/remind` sets personal reminders. | same as SVC-057 | official docs | NEW — F-011 (reminders open) | Services/Settings |
| SVC-065 | Sesh | Calendar feeds | `/link` gives an iCal subscription URL. Google Calendar sync is outbound on the free tier and two-way on premium. A public calendar URL and a server calendar view are available. | same as SVC-057 | official docs | NEW — F-011 (external calendar not authorised) | Services/Settings |
| SVC-066 | World Anvil (core) | Session scheduling in the campaign manager | Listed among the campaign manager's features. RSVP or availability details could not be verified (403). | https://www.worldanvil.com/learn/rpg/campaign-manager (excerpt) | official docs (excerpt) | PARTIAL — F-011 | Campaign |

### Campaign — LFG listing (GM side), agreements and session zero

| ID | Product (core / official / third-party) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SVC-067 | Roll20 (core) | Listing prerequisites and a status box that names what is missing | A listing needs a system and a next game date on Game Details. Looking for Players ▾ → Manage Listing → Create. The Listing Status box names any missing information. Disable and Enable buttons. The listing turns off automatically when full. | same as SVC-003 | official docs | PARTIAL — F-063 | Campaign |
| SVC-068 | Roll20 (core) | Public listing discussion with one-click invite | Each listing has a public "Listing Discussion". A button next to a poster's name invites them. This is separate from the private game forum. | same as SVC-003 | official docs | PARTIAL — F-063 | Campaign |
| SVC-069 | Roll20 (core) | LFG content rules | Listings must be PG-13, and 18+ games must be marked. No listing more than 3 months ahead. No public payment links or off-site community links; these may be shared privately. | https://help.roll20.net/hc/en-us/articles/360037770873 (edited 2023-09-04) | official docs | NEW — F-063 moderation | Campaign |
| SVC-070 | StartPlaying (core) | Game template approval requires at least one safety tool | Template checklist: X-Card, Lines & Veils, Stars & Wishes, with the TTRPG Safety Toolkit named for more. Approval is blocked without one. | https://intercom.help/startplaying/en/articles/8719199-safety-tools (2026-04-29) | official docs | PARTIAL — F-032/F-063 | Campaign |
| SVC-071 | StartPlaying (core) | Content warnings required on every listing | Entered in the Safety Tools section of the template. Players see them under "Additional Details" on the listing. | https://startplaying.games/blog/posts/how-to-content-warnings (excerpt) | official blog (excerpt) | PARTIAL — F-032/F-063 | Campaign |
| SVC-072 | StartPlaying (core) | Free session zero | The GM can set up a free Session Zero; its content is up to each GM. | https://intercom.help/startplaying/en/articles/9038997 ; /8983043 (excerpts) | official docs (excerpt) | PARTIAL — F-032 | Campaign |
| SVC-073 | Alchemy (core) | Personal Safety tab with anonymised Lines & Veils | Profile (bottom-left avatar) → Safety tab. The player picks from preset topics or types a custom one. The table sees the combined list without names. Each player edits their own entries; the GM controls content warnings and the mature tag. | same as SVC-010 | official docs | PARTIAL — F-032 (agreements); anonymity NEW | Campaign |
| SVC-074 | D&D 2024 Dungeon Master's Guide (official rules book) | Game Expectations sheet with hard and soft limits; a physical "X" signal | Filled in at session zero. During play, a crossed-arms style gesture signals a crossed line. | https://www.wargamer.com/dnd/safety-tools-dms-guide (2024-10-15) | secondary | PARTIAL — F-032 | Campaign |
| SVC-075 | TTRPG Safety Toolkit (Shaw & Bryant-Monk; community standard) | Reference set of tools for before, during and after play | Quick Reference v2.5 with printable cards (X-N-O, Script Change). Translations include Italian. The authors recommend linking to it rather than copying it. | https://ttrpgsafetytoolkit.com/ (accessed 2026-09-23) | publisher page | PARTIAL — F-032 | Campaign |
| SVC-076 | StartPlaying (core) | Stars & Wishes after the session | Players say what they enjoyed and what they hope for next. | same as SVC-070 | official docs | NEW — F-029/F-032 | Campaign |

### Campaign — data safety: copy, rollback, delete, export, archive

| ID | Product (core / official / third-party) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SVC-077 | Roll20 (core) | Copy a game, choosing what to copy | Settings → Copy Game: rename, set tags, and tick players and settings (with macros), pages, decks and tables, chat log, journal, jukebox and forum. The sheet choice resets to None and must be picked again. An optional engine upgrade is irreversible. | same as SVC-024 | official docs | PARTIAL — F-061/F-038 | Campaign |
| SVC-078 | Roll20 (Pro) | Daily rollback, kept 7 days | Settings → Roll Back Game → pick a date → Rollback. Restores the whole game, with no partial restore. Creator only. It can be undone only by rolling back to another date. The docs advise copying the game first. Snapshots are taken for every account, but restoring needs Pro. | https://help.roll20.net/hc/en-us/articles/32139162477719 (edited 2025-05-20) | official docs | PARTIAL — F-061 | Campaign |
| SVC-079 | Roll20 (core) | Delete game with confirmation; support can restore within 6 months | "Delete Game" asks for confirmation. Data is purged after 6 months. Restoration is requested through a support form. | same as SVC-024; https://help.roll20.net/hc/en-us/articles/30962952601495 (edited 2025-03-27) | official docs | PARTIAL — F-061 | Campaign |
| SVC-080 | Roll20 (core) | Cold storage and "Restore Game" | Inactive games are moved to cold storage. "Restore Game" on Game Details brings one back in seconds. The page lists what stays blocked until then (entering, copying, rollback, scripts and more). | https://help.roll20.net/hc/en-us/articles/18507934860439 (edited 2025-03-18) | official docs | NEW — F-061 (archived state) | Campaign |
| SVC-081 | Roll20 (core) | Chat archive with whisper privacy; permanent "Clear Chat Archive" | Content → Chat Archive opens a new window with a "Hide Whispers" button. Players see only their own whispers, and GM rolls stay with the GM. Clearing the archive is permanent. | same as SVC-024 | official docs | PARTIAL — F-029 | Campaign |
| SVC-082 | Roll20 (subscriber) | External Journal outside the tabletop | Characters and handouts can be viewed outside the VTT, following their permissions. Only the Bio & Info tab is shown. | same as SVC-024 | official docs | PARTIAL — F-007/F-026 | Campaign |
| SVC-083 | Roll20 (core) | Private campaign forum | Everyone in the game can post threads. GMs can Sink, Sticky and Delete. Game Details shows the 10 latest posts, with "View All Posts". | same as SVC-024 | official docs | NEW — F-006 (asynchronous discussion) | Campaign |
| SVC-084 | Kanka (core) | Campaign export as re-importable JSON or readable Markdown | Settings → Export. Allowed once a day and runs in the background. Admins only. Admins are notified when it is ready. The ZIP stays downloadable for 120 min. | https://docs.kanka.io/en/latest/features/campaigns/export.html | official docs | PARTIAL — F-027/F-061 | Campaign |
| SVC-085 | Archivist AI (third-party) | Export to Obsidian, Markdown or HTML; publish and unpublish | Export a whole campaign or one session, with an option to turn wikilinks into plain text. A published campaign shows only chosen types; transcripts, audio and GM notes stay private. Unpublish revokes public access. | same as SVC-046 | official docs | PARTIAL — F-027/F-029 | Campaign |

### Campaign — recaps, transcription and AI assistance (GAP-18)

| ID | Product (core / official / third-party) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SVC-086 | Archivist AI | Record from Discord voice with session commands | `/start` creates a session; `/pause`, `/resume` and `/end` control it. `/end` opens Session Review. Recording resumes after a bot restart. | same as SVC-046 | official docs | PARTIAL — F-029 (GAP-18) | Table |
| SVC-087 | Archivist AI | Upload audio, transcripts, notes or play-by-post | Audio as one mixed file (5 min to 6 h, under 2 GB) or multitrack, in MP3, WAV, M4A and more. Text files, a Google Docs share link, or Discord play-by-post given as first and last message URLs. | same as SVC-046 | official docs | PARTIAL — F-029/F-028 | Campaign |
| SVC-088 | Archivist AI | Session Review editor before sharing | Summary, beats and entities are edited inline. Beats have 3 levels (Major, Minor, Steps), indented with Tab and Shift+Tab. The summary can be re-run with a custom prompt. | same as SVC-046 | official docs | PARTIAL — F-029 | Campaign |
| SVC-089 | Archivist AI | Entity extraction depth and compendium clean-up | Essential, Balanced or Exhaustive per entity type, applied only to future sessions. Entities can be merged, split or reclassified. Duplicate-name clean-up is included. | same as SVC-046 | official docs | NEW — F-014/F-029 | Campaign |
| SVC-090 | Archivist AI | "Ask Archivist" questions, scoped by visibility | `/ask` in Discord or on the web. Answers come from transcripts, entities and lore that the asker is allowed to see. It never edits entries on its own. | same as SVC-046 | official docs | NEW (GAP-18) | Campaign |
| SVC-091 | Archivist AI | Handout and recap generator | Choose sections and themes, then export as Markdown or PDF, or email all players. | same as SVC-046 | official docs | PARTIAL — F-029 | Campaign |
| SVC-092 | Archivist AI | Cast analysis (talk share, sentiment) | Charts per session or across up to 10 sessions. | same as SVC-046 | official docs | Context — privacy-sensitive; not recommended | Campaign |
| SVC-093 | Saga20 (third-party) | Recap that separates in-character from out-of-character talk; voice auto-match | Upload a recording. After the first session, voices are recognised automatically. Output formats: narrative or quick reference, with a detail preference. Fully editable. Transcription in 25 languages, including Italian. | https://saga20.com/ ; https://saga20.com/dnd-session-summarizer/ (© 2026) | marketing | PARTIAL — F-029 (GAP-18) | Campaign |
| SVC-094 | Saga20 | Wiki that updates itself, campaign graph, Discord publishing, share toggle | Entity pages update after each session, with @mentions and a relationship graph. A formatted recap can post to Discord. One toggle makes a public view that needs no login. | same as SVC-093 | marketing | PARTIAL — F-014/F-029 | Campaign |
| SVC-095 | LoreKeeper.ai (third-party) | Transcription plus GM-only entities the GM can reveal | Record or upload audio; summaries are generated. GM-only entities can be revealed during a session. Search covers transcripts. | https://lorekeeper.ai/ (© 2026) | marketing | PARTIAL — F-007/F-029 | Campaign |
| SVC-096 | Craig (third-party Discord recorder) | Recording with visible consent signals | While recording, the bot renames itself with a RECORDING tag and refuses to record if it cannot. It plays a voice announcement. One track per speaker, up to 6 h, kept for 7 days. | https://craig.chat/ ; https://docs.craig.chat/ (excerpts) | official site (excerpt) | NEW — consent pattern for F-029 | Table |
| SVC-097 | Quest Portal (Pro tier) | GM assistant, questions over uploaded PDFs, rules lookup from linked books, AI notes | `/assistant` in the app. PDF upload builds a reference library to ask questions of. "Library Link" connects purchased books for rules lookups. | same as SVC-023 | marketing | PARTIAL — GAP-18 | Preparation |
| SVC-098 | LoreKeeper.ai | Generators for NPCs, locations, encounter tables and images | Generate from inside a campaign entity. | same as SVC-095 | marketing | NEW — GAP-18 | Preparation |
| SVC-099 | Foundry modules: Loremaster, FoundryAI, Phil's AI Assistant, RPGX AI Assistant (third-party) | AI inside the VTT: narration and NPCs, reading journals and actors, recaps | Loremaster uses Claude and can roll or apply damage. FoundryAI goes through OpenRouter. Phil's builds prompts from world data to paste into an external chatbot, with no API key. RPGX runs against a local Ollama model. | https://foundryvtt.com/packages/loremaster ; /foundry-ai ; /phils-ai-assistant ; /rpgx-ai-assistant | store page | NEW — GAP-18 (bring-your-own model precedent) | Preparation |
| SVC-100 | Friends & Fables (third-party) | AI game master "Franz" | Text play on the web or Discord, up to 6 players, live or asynchronous. Tracks HP and spells. Text-to-speech voices. World and quest builders. | https://fables.gg/ (accessed 2026-09-23) | marketing | Context — replaces the human DM, outside product intent | Table |

### Preparation — defaults and content packages

| ID | Product (core / official / third-party) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SVC-101 | Roll20 (core) | Campaign-wide defaults for new pages and tokens | Game Settings → Page Defaults and Token Defaults: bars, auras, tint, nameplate, what players may see and edit per field, light and sight. "Save Defaults" saves only this section. An open game tab must be refreshed to pick up changes. | same as SVC-017 | official docs | PARTIAL — F-013/F-005 | Preparation |
| SVC-102 | Syrinscape (third-party) | Soundsets per published adventure | Ready-made campaign folders group moods by adventure, with search by location or creature. Custom moods can be mixed. | https://syrinscape.com/faq/ (accessed 2026-09-23) | official site | Out of scope — F-030 (external) | Preparation |

### Table — session state, presence, in-session safety

| ID | Product (core / official / third-party) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SVC-103 | D&D Beyond Maps (core) | Start, Pause and End session, with a different message for players in each state | A red "Start Session" button sits bottom right. Before the start, players see a waiting message. Pause and End both hide the map, each with its own message. Resume is in the sub-menu. An inactivity popup stops the session ending on its own. | https://dndbeyond-support.wizards.com/hc/en-us/articles/46385384993428 (edited 2026-02-17) | official docs | PARTIAL — F-016 | Table |
| SVC-104 | D&D Beyond Maps (core) | Connected Players menu | The "i" menu lists who has Maps open and with which character. Clicking a name opens that sheet. DM and players both see it. | https://dndbeyond-support.wizards.com/hc/en-us/articles/46385405994900 (edited 2026-02-17) | official docs | PARTIAL — F-016/F-053 | Table |
| SVC-105 | D&D Beyond Maps (core) | DM switches for what players can do | Game Info → Settings: interact with monster tokens, draw, use the pointer, ping. | https://dndbeyond-support.wizards.com/hc/en-us/articles/46385423678356 (edited 2026-02-17) | official docs | PARTIAL — F-051/F-052/F-006 | Table |
| SVC-106 | D&D Beyond Maps (core) | Session capacity | Up to 13 people per session, including the DM. Any registered user can join a DM-hosted session. | https://dndbeyond-support.wizards.com/hc/en-us/articles/46363705015188 (edited 2026-02-16) | official docs | NEW — F-016 capacity | Table |
| SVC-107 | D&D Beyond (core) | Game Log that merges rolls from every source | The speech-bubble icon bottom right. Rolls from the web sheet, the app, Avrae in Discord, the encounter builder and the combat tracker. A roll expands for detail. | https://dndbeyond-support.wizards.com/hc/en-us/articles/46385444116372 (edited 2026-02-17) | official docs | PARTIAL — F-002 | Table |
| SVC-108 | Alchemy (core) | Here/Away status with a custom message; spectators visible | Party panel toggle. Spectators appear when a game is public. | https://help.alchemyrpg.com/en/articles/9821384-player-orientation (2024-09-04) | official docs | NEW — F-016 presence | Table |
| SVC-109 | Owlbear Rodeo 2 (core) | Room-wide player permissions per tool or layer; "Owner Only" characters | The Player Permissions dialog sets create, update and delete per layer, for all scenes in the room. "Owner Only" limits players to the characters they own. | https://docs.owlbear.rodeo/docs/permissions/ (excerpt); SVC-035 source | official docs (excerpt) | PARTIAL — F-006/F-005 | Table |
| SVC-110 | Alchemy (core) | Anonymous X-Card from the in-game gear menu | Gear under the player bar → X-Card. The sender gets a confirmation. The alert flashes in the middle of the DM's screen and everyone is told without a name. | same as SVC-010; https://x.com/AlchemyRpg/status/1666529347694649344 (2023) | official docs | NEW (GAP-16) | Table |
| SVC-111 | Foundry module "Safety and Communication" (Zenfyre, v1.0.0, Foundry V13 and V14) | X/N/O cards with anonymity options; hand-raise queue; presence signals | A dockable toolbar with per-client placement and size. X, N and O cards can be sent anonymously. The hand-raise queue has "Cut in Line", "Next in Line" and "Back of the Line". AFK and Open Door presence. A safety reference drawer the GM can edit. Optional sounds, with a priority sound for X. | https://foundryvtt.com/packages/safety-and-communication (updated about 3 months before access) | store page | NEW (GAP-16) | Table |
| SVC-112 | Foundry modules "X-Card" and "Safety Tools" (third-party) | Click a card to pause and change content; Script Change | Safety Tools: X-Card and Script Change cards, each can be hidden, shown as icon or text. | https://github.com/Sk1mble/XCard ; https://github.com/wlonk/foundryvtt-safety-tools | store/project page | NEW (GAP-16) | Table |
| SVC-113 | Owlbear extension "Rumble!" (third-party) | Safety cards with graded anonymity | Raise Hand shows the sender's name; Appreciation goes privately to the GM; Warning shows to everyone without a name; Stop is fully anonymous. | https://extensions.owlbear.rodeo/rumble (accessed 2026-09-23) | store page | NEW (GAP-16) | Table |
| SVC-114 | D&D Beyond Maps (core) | Report Image and User Feedback | The "i" menu → ⋮ → "Report Image" opens the support portal for an inappropriate map or token image. "User Feedback" opens the beta feedback portal. | https://dndbeyond-support.wizards.com/hc/en-us/articles/46385504274196 (edited 2026-02-17) | official docs | NEW (GAP-16) | Table |
| SVC-115 | Roll20 Table on Tablet (core; currently under maintenance) | Touch mapping for a desktop-style table | Long press on a token opens the context menu. Tap and hold on empty space pings. Two-finger drag pans. Users are told to hide the keyboard. Safari plays one sound at a time. Phones are not supported. | https://help.roll20.net/hc/en-us/articles/360037774593 (edited 2023-02-14) | official docs | PARTIAL — F-016 touch | Table |

### Table — Discord bridges (GAP-17)

| ID | Product (core / official / third-party) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SVC-116 | Avrae (official, DDB-owned) | Link a DDB campaign to a Discord channel | `!campaign <campaign URL>`. Rolls from DDB sheets and the app then appear in the channel in real time. Links can be listed and removed. | https://avrae.readthedocs.io/en/latest/ddb.html (excerpt); DDB forum threads | official docs (excerpt) | NEW (GAP-17) | Table |
| SVC-117 | Avrae | Initiative tracker in a Discord channel | `!i begin`. `!i madd <monster>` takes `-n` for a count and `-group` for shared initiative; monster stats are hidden by default. Also `!i next`, `!i hp`, `!i effect` with `-dur` for duration, `!i remove`, and `!i end` with a summary. The summary message is auto-pinned. | https://avrae.readthedocs.io/en/latest/cheatsheets/dm_combat.html | official docs | NEW (GAP-17) — compare F-001 | Table |
| SVC-118 | Avrae | Targeted player actions and resource tracking | `!attack` and `!cast` with `-t target` and `adv`. `!c` for checks and `!s` for saves. `!game hp`, `spellslot`, `longrest`, `shortrest` and `deathsave`. `!cc` for custom counters. | https://avrae.io/commands | official docs | NEW (GAP-17) | Table |
| SVC-119 | Avrae | User-built commands, variables and homebrew | `!alias` and `!snippet`. Variables at character, user, server and global scope (`!cvar`, `!uvar`, `!svar`, `!gvar`). Homebrew collections `!tome`, `!pack` and `!bestiary`. `!servsettings`. A web dashboard. | https://avrae.io/commands | official docs | PARTIAL — F-064 (GAP-01) | Table |
| SVC-120 | Roll20 (official) | Roll20 as a Discord Activity | In a voice channel, the rocket icon → Roll20. The first launch asks to log in or sign up, which links the two accounts. All players must be in the same voice channel. Desktop and web only. Deleting games and managing scripts stay on roll20.net. To unlink, reset the password or ask support. | https://help.roll20.net/hc/en-us/articles/25838862126359 (edited 2025-10-28) | official docs | NEW (GAP-17) | Table |
| SVC-121 | Foundry modules: Foundry to Discord, DiscordConnect, Discord Integration, Discord SHOUT!, Foundry Discord Notifier (third-party) | Discord webhook relays | Chat and rolls are mirrored, with edits and deletions synced. `@FoundryUserName` pings the matching Discord account. A "world is open" notice. `/dnote` posts a timestamped note. New journal entries can be announced. | https://foundryvtt.com/packages/foundrytodiscord ; /DiscordConnect ; /foundry-discordshout ; /foundry-discord-notifier | store page | NEW (GAP-17) | Table |
| SVC-122 | Owlbear extension "Rumble!" | Chat with whispers, dice presets, Discord webhook | `/w` for whispers, arrow keys to recall message history, preset buttons (`/preset add`), secret rolls, and a Discord webhook that forwards rolls. | same as SVC-113 | store page | NEW (GAP-17) | Table |

### Table — audio (external precedent; F-030 out of scope)

| ID | Product (core / official / third-party) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SVC-123 | Roll20 Jukebox (core) | GM audio library with licensed catalogues | Jukebox → Manage Audio, with Playlists and Tracks tabs. Sources: My Audio (MP3, OGG or FLAC uploads up to 20 MB that count toward storage), Tabletop Audio (CC BY-NC-ND), BattleBards and Incompetech. Tracks can be previewed, tagged and added to playlists. | https://help.roll20.net/hc/en-us/articles/360039178714 (edited 2025-09-10) | official docs | Out of scope — F-030 | Table |
| SVC-124 | Foundry (core) | Per-user volume sliders by sound category | Three client-side sliders: Playlists, Ambient and Interface. Playlist modes: sequential, shuffle, simultaneous, or soundboard only. Fade in milliseconds. | https://foundryvtt.com/article/playlists/ | official docs | Out of scope — F-030. The principle that each person controls their own volume and interface sounds are a separate category still applies to dice and UI sounds | Services/Settings |
| SVC-125 | Syrinscape (third-party) | "Share Audio" link for remote players; VTT triggers; offline apps | The GM runs the web player. Players open a link and listen in the browser with no account. Integrations with Foundry and Fantasy Grounds. The Fantasy and Sci-Fi apps work offline after download. | same as SVC-102 | official site | Out of scope — F-030 (external) | Table |
| SVC-126 | Kenku FM (by the Owlbear Rodeo team) | Stream audio into Discord voice | A desktop app. Browser tabs (YouTube, Spotify, Tabletop Audio, Syrinscape), local playlists and a soundboard are mixed and sent to Discord through the user's own bot token. | https://github.com/owlbear-rodeo/kenku-fm ; https://www.kenku.fm/ | project page | Out of scope — F-030 (the bot path the owner's group already uses) | Table |
| SVC-127 | Alchemy (core) | Player-side music and sound levels | Adjusted in the join and settings flow. | same as SVC-108 | official docs | Out of scope — F-030 | Table |

### Library — licensing, marketplace, updates, provenance

| ID | Product (core / official / third-party) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SVC-128 | Wizards of the Coast (SRD 5.2.1) | CC-BY-4.0 licence with a required attribution sentence; localized SRD editions | The SRD page and PDFs give the exact attribution sentence to reproduce. French, Italian, German and Spanish editions each have their own attribution sentence. The Italian PDF is IT_SRD_CC_v5.2.1. | https://www.dndbeyond.com/srd ; https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf | official docs | PARTIAL — CLAUDE.md source rules; F-033 (attribution surface NEW) | Library |
| SVC-129 | D&D Beyond (core) | Localized 2024 core books are not sold on DDB | A FAQ says the French, Italian, German and Spanish books exist only in physical local markets. | https://dndbeyond-support.wizards.com/hc/en-us/articles/46247021698452 (edited 2026-02-12) | official docs | Context — EN/IT content is a gap in the market | Library |
| SVC-130 | D&D Beyond (core) | Campaign content sharing | Already audited as DB-09 (enable or disable sharing, content management). | https://dndbeyond-support.wizards.com/hc/en-us/articles/7747210355604 (2025-09-17) | official docs | PARTIAL — audit DB-09 | Library |
| SVC-131 | Roll20 Marketplace (core) | Add-ons applied into an existing game; adding again overwrites (a way to revert) | Game Settings → Game Addons dropdown → "Add to Game". The page lists add-ons per game. Removal is done by hand inside the game. | same as SVC-024 | official docs | PARTIAL — F-038/F-061 | Library |
| SVC-132 | Roll20 Marketplace (core) | Patch notification with notes, queued update, targeted overwrite | A notice on Game Details links the patch notes. Update puts the game in a queue, and the update can be cancelled while still queued. Progress notices follow. Only elements the patch changed are overwritten. The docs advise duplicating edited entries first and avoiding updates mid-combat. | same as SVC-024 | official docs | NEW — F-038 (published content update vs local edits) | Library |
| SVC-133 | Roll20 Marketplace (core) | Refund request | Marketplace → My Marketplace Items → ⋯ → Request Refund. Allowed within 15 days and if the art pack has not been downloaded. | https://help.roll20.net/hc/en-us/articles/28499459934359 (edited 2024-12-17) | official docs | Context — no commerce adopted | Library |
| SVC-134 | Foundry (core) | Premium content keys and Patreon linking | Website profile → Premium Content → enter a key. An "Unlocked Premium Content" list. In the Setup installer, a Premium Content filter; a "Not Owned" label appears when not activated. The module must then be enabled per world. | https://foundryvtt.com/article/premium-content/ | official docs | Context — commerce; the install-then-enable-per-world pattern informs F-038 | Library |
| SVC-135 | Owlbear Rodeo 2 (core) | Extensions installed on the profile, switched on per room | Profile → "Add Extension" and paste the install link. Then a per-room switch in the room's extension menu. | https://docs.owlbear.rodeo/extensions/tutorial-hello-world/install-your-extension/ (excerpt); https://extensions.owlbear.rodeo/guide | official docs (excerpt) | NEW — GAP-17 (governing third-party add-ons) | Library |
| SVC-136 | Dungeon Masters Guild (official community marketplace) | Required AI "creation method" label | Publishers must set the AI filter on rulebooks and adventures. Standalone AI art packs are rejected. Mostly AI-written content is not accepted. Mislabelled titles are removed, and repeat offenders can lose publishing rights. | https://help.dmsguild.com/hc/en-us/articles/36102697820567-Managing-AI-Generated-Content | official docs | NEW — F-009/F-033 provenance for a homebrew catalogue | Library |
| SVC-137 | Roll20 (core) | AI policy for community sheets and scripts | Covers community and publisher sheets and the Mod Library. Compliant contributions need no disclosure per item. The Marketplace has a separate policy. | https://help.roll20.net/hc/en-us/articles/43164327041943 (edited 2026-09-01) | official docs | NEW — provenance | Library |
| SVC-138 | Roll20 (core) | Asset ownership statement and acknowledgements | Art, tokens and sounds from the Art Library, Marketplace or Jukebox remain the providers' property. An Acknowledgments page lists the providers. | https://help.roll20.net/hc/en-us/articles/360037770793 (edited 2026-09-20) | official docs | PARTIAL — licensing hygiene (F-065) | Library |

### Services/Settings — account, privacy, age, moderation, notifications, status

| ID | Product (core / official / third-party) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SVC-139 | D&D Beyond / Wizards with k-ID (official) | Date of birth and country required at login; parent approves features | Every user was logged out on 2026-02-02. Next login asks for date of birth and country or region. For a minor, the parent receives an email → "Review and Consent" → reviews data and features → verifies they are an adult (AgeKey and others) → can change permissions later in Family Connect. DDB states it does not store the date of birth. | https://dndbeyond-support.wizards.com/hc/en-us/articles/44174276696468 (edited 2026-02-09); /46578256601748 (2026-02-23) | official docs | NEW — age policy is an owner decision (privacy and authority) | Services/Settings |
| SVC-140 | Roll20 (core) | Minimum age | Users in the US under 13 and in the EU under 16 cannot use Roll20; minors may use it only with parents or guardians. | same as SVC-138 | official docs | NEW | Services/Settings |
| SVC-141 | StartPlaying (core) | Adults only | No one under 18 may create an account or use the service. | https://intercom.help/startplaying/en/articles/8719202-terms-of-service (excerpt) | official docs (excerpt) | NEW | Services/Settings |
| SVC-142 | Discord (core) | Minimum age 13 (or the local legal age); opt-in Family Center | A teen can share an activity overview with a parent: counts, top contacts and servers, but not message content. There is a dashboard and a weekly email. | https://support.discord.com/hc/en-us/articles/14155043715735 (excerpt) | official docs (excerpt) | Context — applies if Discord is integrated | Services/Settings |
| SVC-143 | D&D Beyond (core) | Account deletion and personal-data deletion by form | A form with an identity check, completed within 30 days, and irreversible. A separate "Delete My Personal Information" request covers every linked account. Contact: the DPO or the local data authority. | https://dndbeyond-support.wizards.com/hc/en-us/articles/7747241271444 (2024-10-29); /13660456407188 (2025-08-26) | official docs | NEW — GDPR flow | Services/Settings |
| SVC-144 | D&D Beyond (core) | Purchased content is lost when the account is deleted | Content can be used only on DDB with an account. | https://dndbeyond-support.wizards.com/hc/en-us/articles/7747225184788 (2025-08-26) | official docs | NEW — warning before deletion (F-027/F-061) | Services/Settings |
| SVC-145 | Roll20 (core) | GDPR requests and access to personal data | A web form or an email with "GDPR Request" in the subject; the target reply time is 10 days. Personal data is visible on the My Account page. | same as SVC-138 | official docs | NEW | Services/Settings |
| SVC-146 | Wizards Account (official) | Account-system migration; social logins must be relinked | On 2026-10-07 the account system is upgraded. Linked social accounts must be relinked under "Connections" on the profile. Purchases are kept. | https://dndbeyond-support.wizards.com/hc/en-us/articles/53379830081684 (2026-09-18) | official docs | Context — linked-accounts pattern | Services/Settings |
| SVC-147 | D&D Beyond (core) | Linking a Discord account is not a login | My Account → link Discord, used only so Avrae can reach owned content. Also covered by audit DB-24. | https://dndbeyond-support.wizards.com/hc/en-us/articles/7741344507668 (2025-09-15) | official docs | PARTIAL — audit DB-24; GAP-17 | Services/Settings |
| SVC-148 | Roll20 (core) | Report a user or message | A "Report" link under the user's name above each message. The user gives a reason and submits it to moderators. Works in forums, private messages, LFG and games. | same as SVC-031 | official docs | NEW (GAP-16) | Services/Settings |
| SVC-149 | Roll20 (core) | Block a user | Profile → Block, undone with Unblock in the same place. The blocked user can no longer send private messages, and their forum posts are hidden, with exceptions for the user's own game forums and LFG posts. | same as SVC-031 | official docs | NEW (GAP-16) | Services/Settings |
| SVC-150 | Roll20 (core) | Code of conduct and moderation ladder | Warning → post removal → suspension from 1 day to 1 year → permanent ban from public areas. Access to one's games and purchases is kept. | https://help.roll20.net/hc/en-us/articles/360037254334 (edited 2024-02-20) | official docs | NEW (GAP-16; only if public areas exist) | Services/Settings |
| SVC-151 | Roll20 (core) | Security page with responsible disclosure | Vulnerabilities go through a web form, with a request for 7 days before public disclosure. The page separates real security issues from rule "cheating". | https://help.roll20.net/hc/en-us/articles/360037770813 (edited 2023-09-04) | official docs | NEW | Services/Settings |
| SVC-152 | D&D Beyond (core) | Status page with incident history | A link at the top right of the Help Center. Each system has a status, and History shows past incidents with notes and a timeline. | https://dndbeyond-support.wizards.com/hc/en-us/articles/46961590561428 (2026-03-06) | official docs | NEW — service health | Services/Settings |
| SVC-153 | Kanka (core) | In-app notifications for membership and data jobs | A notice when a member is removed, when an application is decided (with the admin's message), and to admins when an export is ready. | same as SVC-039, SVC-041 and SVC-084 | official docs | NEW — notifications | Services/Settings |
| SVC-154 | StartPlaying (core) | Email when a session is cancelled; GM messages players | Players receive an email when the GM cancels. The GM can message players one by one or as a group. | https://intercom.help/startplaying/en/articles/8909095 (excerpt) | official docs (excerpt) | NEW — notifications | Services/Settings |
| SVC-155 | Saga20 | Published retention promises | Audio is deleted after processing. Voice samples are kept at most 72 h. Session audio is not used to train models. | same as SVC-093 | marketing (claim) | NEW — privacy pattern (GAP-18) | Services/Settings |

### Services/Settings — language, appearance, accessibility preferences

| ID | Product (core / official / third-party) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SVC-156 | Roll20 (core) | Language preference on the account | Username → My Account → Preferences → Language → Save Changes. It changes site pages and translated sheets, not forum posts or usernames. 19 languages, including Italian. The page says the translations were produced with Google Translate. Volunteers are invited to help. | https://help.roll20.net/hc/en-us/articles/360044893733 (edited 2023-09-05) | official docs | PARTIAL — EN/IT baseline | Services/Settings |
| SVC-157 | Foundry (core) plus community | Language preference and translation modules; Babele translates compendiums at runtime; Italian dnd5e packages | "Language Preference" is a client setting. Babele applies JSON mappings to compendiums in memory without changing the originals. Italian packages include translation-dnd5e-it, dnd5e-it-translation and italian-modules-translation. | same as SVC-044 (settings); https://foundryvtt.com/packages/babele ; https://foundryvtt.com/packages/translation-dnd5e-it | official docs + store page | PARTIAL — EN/IT (UI language separate from content language) | Services/Settings |
| SVC-158 | Roll20 (core) | Colour mode for the site and the tabletop | Site: My Account → Preferences → Color Mode (Light or Dark). Tabletop: gear → "Accessibility" section → light or dark toggle. The docs list known limits (some compendium pages). | https://help.roll20.net/hc/en-us/articles/8405671523479 (edited 2026-07-21) | official docs | PARTIAL — GAP-14 | Services/Settings |
| SVC-159 | Foundry V13 (core) | Theme follows the OS light or dark setting; per-sheet theme override; interface scale and opacity | Client and user settings. | https://foundryvtt.com/releases/13.341 and nearby V13 release notes (excerpt) | release notes (excerpt) | PARTIAL — GAP-14 | Services/Settings |
| SVC-160 | Foundry (core) | Global font size | Client setting. | same as SVC-044 (settings) | official docs | PARTIAL — GAP-14 | Services/Settings |
| SVC-161 | Foundry (core) | Photosensitive mode | A client setting that suppresses flashing or trigger animations. Added in 10.290 (2022-11-14). Also respected by token-ring animations and by modules such as Sequencer. | https://foundryvtt.com/releases/10.290 ; https://github.com/foundryvtt/foundryvtt/issues/11241 | release notes | NEW — GAP-14 | Services/Settings |
| SVC-162 | Foundry (core) | Rebindable controls; "Universal Keybindings" for other keyboard layouts | Settings → Configure Controls. Universal Keybindings is an experimental V13 core setting. | same as SVC-044 (settings); V13 release notes (excerpt) | official docs + release notes | PARTIAL — GAP-14/F-064 | Services/Settings |
| SVC-163 | Foundry (core) | Settings scopes: client, user and world | Client: this browser. User: per world, new in V13. World: needs Assistant GM or "Configure Settings". | same as SVC-044 (settings) | official docs | PARTIAL — NAV-11/GAP-14 (which scope each preference has) | Services/Settings |
| SVC-164 | Foundry (core) | Performance settings for weak devices | Performance Mode, maximum frame rate, turn off pixel-resolution scaling, turn off the canvas entirely, turn off vision and light animation. | same as SVC-044 (settings) | official docs | NEW — F-016 low-spec | Services/Settings |
| SVC-165 | Roll20 (core) | Dyslexia-friendly fonts on the tabletop | New font options including Tahoma and Nunito were announced as dyslexia-friendly (2021). | https://x.com/roll20app/status/1420852024028053506 (2021) | official social post | NEW — GAP-14 | Services/Settings |
| SVC-166 | Alchemy (core) | "Disable visual motion effects" in the in-game gear menu | Next to help, X-Card, safety tab and quit in the same menu. | same as SVC-108 | official docs | PARTIAL — COVERAGE language and accessibility checklist (reduced motion) | Services/Settings |

### Cross-cutting — accessibility, offline, low bandwidth, localization quality

| ID | Product (core / official / third-party) | Capability | UX pattern (where + how) | Source URL (+ version/date) | Evidence kind | Existing coverage | d20 Studio area |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SVC-167 | Owlbear Rodeo 2.1 (core) | Keyboard traversal of scene items; screen-reader exposure; GM-only accessible names | Tab, Enter and the arrow keys find, select and operate tokens and drawings. Right-click menus are reachable without the menu bar. The scene is exposed to screen readers. Accessible names and descriptions are GM-only fields, so they do not spoil secrets. The OS Reduce Motion setting is respected. Grid colour adjusts to map brightness. | https://blog.owlbear.rodeo/owlbear-rodeo-2-1-release-notes/ (2023-11-14) | release notes | NEW — GAP-14 (map accessibility) | Cross-cutting |
| SVC-168 | D&D Beyond Maps (core) | Keyboard/tabindex navigation, headings for screen-reader shortcuts, alt text | Shipped at launch. Audio cues, high contrast and themes are announced as future work and not counted. | https://dndbeyond-support.wizards.com/hc/en-us/articles/46363723034644 (edited 2026-02-16) | official docs | PARTIAL — GAP-14 | Cross-cutting |
| SVC-169 | AccessWorld (American Foundation for the Blind), Aaron Preece | Screen-reader field report on D&D tools | DDB combo boxes ignore arrow keys once open, and spell-slot checkboxes are poorly labelled. Roll20 maps are unusable with a screen reader, but handouts and dice are readable. Discord is fully accessible. Avrae is the preferred dice path. Braille dice are used at the table. | https://afb.org/aw/fall2026/dnd-revisited (Fall 2026) | secondary (independent expert) | NEW — GAP-14 acceptance tests | Cross-cutting |
| SVC-170 | Baldur's Gate 3 (core) | Text and subtitle size, background box, live-preview slider for book text | Accessibility menu. Patch 6 added adjustable size for readable text with a live preview. Controls can be fully remapped. Turn-based mode removes timing pressure. The main gap is map and minimap accessibility for low-vision players. | https://caniplaythat.com/2023/08/31/baldurs-gate-3-accessibility-review/ ; https://caniplaythat.com/2024/02/21/baldurs-gate-patch-6-adds-adjustable-text-and-more-accessibility/ | secondary | PARTIAL — GAP-14 | Cross-cutting |
| SVC-171 | Foundry modules "Border Control" and "Colored Token Borders" (third-party); colour-blind modes in core are still a request | Token borders the player can adjust | Player-side border colour, offset and scale. The GM can colour groups of tokens. Core issue #5509 asks for colour-blind UI modes. | https://foundryvtt.com/packages/Border-Control ; https://foundryvtt.com/packages/rainbowroom ; https://github.com/foundryvtt/foundryvtt/issues/5509 | store page + issue tracker | NEW — GAP-14 (cues that do not rely on colour) | Cross-cutting |
| SVC-172 | D&D Beyond (core) | Lighter dice sets for phones and older computers | A list of 28 3D dice sets optimised for low-end devices. | https://dndbeyond-support.wizards.com/hc/en-us/articles/50149172432020 (2026-06-10) | official docs | NEW — F-002 low-spec | Cross-cutting |
| SVC-173 | Roll20 (core) | Performance guidance: build for the weakest player | The GM should plan for the player with the worst device and connection. Use smaller maps. Fog and grid lag signals too little video memory. Voice-only chat helps. | https://help.roll20.net/hc/en-us/articles/360041544654 (edited 2023-09-05) | official docs | NEW — F-013/F-016 | Cross-cutting |
| SVC-174 | Owlbear Rodeo 2.3 (core) | Large maps on weak networks | A tiled renderer for very large images. Default assets are compressed. A warning appears when importing images over 20 MB. Sending a map no longer freezes the interface while it caches. File size and resolution limits depend on the plan. | https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-notes/ ; https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-week-day-1/ | release notes | NEW — F-013/F-065 | Cross-cutting |
| SVC-175 | D&D Beyond (core) | Offline books only in the mobile app | Web sourcebooks are not available offline. The app keeps purchased books offline. See also audit DB-23. | https://dndbeyond-support.wizards.com/hc/en-us/articles/7747209515028 (2023-05-17) | official docs | PARTIAL — F-026, audit DB-23 | Cross-cutting |
| SVC-176 | Foundry (core) | Offline or LAN play after one online licence check | A self-hosted desktop app. Players on the same network connect directly. No external service is needed after the licence is validated online once. | https://foundryvtt.com/article/hosting/ ; https://foundryvtt.com/article/faq/ (excerpts) | official docs (excerpt) | PARTIAL — F-026 (no offline shared table assumed) | Cross-cutting |
| SVC-177 | Fantasy Grounds Unity (core) | LAN mode kept as a courtesy; cloud mode recommended; downloaded modules usable offline | A LAN option in the campaign launcher. | https://fantasygrounds.com/forums/showthread.php?64467-Offline-LAN-playing (community) | community | Context — F-026 | Cross-cutting |
| SVC-178 | Roll20 Characters (core) | Add to Home Screen as a light installable app | Step-by-step instructions for iOS Share → "Add to Home Screen" and the Android ⋮ menu. | same as SVC-019 | official docs | PARTIAL — F-026 (installable web app) | Cross-cutting |
| SVC-179 | Roll20 (core) | Character-sheet internationalisation through Crowdin | Sheet authors mark strings with `data-i18n` keys. Volunteers translate on Crowdin. A `lang-xx` CSS class allows per-language layout fixes. The sheet appears in the user's account language. | https://help.roll20.net/hc/en-us/articles/360037773493 (edited 2023-09-05) | official docs | PARTIAL — EN/IT (translation pipeline; labels too long in some languages) | Cross-cutting |
| SVC-180 | D&D Beyond (core) | No interface localization yet | Localized character sheets and product pages are "planned" with no timeline. Forum threads keep asking for other languages. | https://www.dndbeyond.com/community-update (excerpt); https://www.dndbeyond.com/forums/d-d-beyond-general/d-d-beyond-feedback/235200-localized-content-and-option-to-change-language | official (excerpt) + community | Context — EN/IT is a differentiator for d20 Studio | Cross-cutting |

## Pattern notes

The 18 patterns most worth copying. Each says which product does it best and why it works. Conflicts
between products are noted where they matter for d20 Studio.

1. **An invite link that carries a role, an expiry and a use limit, and changes when someone is removed.**
   Kanka sets expiry, number of uses and role, and never allows the admin role (SVC-038). Roll20
   changes the player link after a kick and makes the co-GM link single-use for 48 h (SVC-028,
   SVC-029).
   *Why it works:* the lowest-friction path stays a link to paste in the group chat, but a leaked
   link or a removed player cannot come back.
   *Conflict:* Owlbear has no secret link; the creator approves each join request instead (SVC-035).
   DDB offers a single campaign link and documents no reset (SVC-033).
   *Synthesis:* a link plus an optional "approve before joining" switch for campaigns that are
   advertised.

2. **A named co-DM role with a published power list, and destructive actions kept for the owner.**
   Roll20 co-GM (SVC-030) and Foundry Assistant GM (SVC-044) are the precedents. Owlbear adds a GM
   handover for one session (SVC-036). DDB's missing co-DM is a complaint that has recurred since
   2020 (SVC-034).
   *Why it works:* two-DM tables are common, and a list of what the co-DM can and cannot do avoids
   silent over-permission. Roll20 keeps rollback and some settings with the Creator.

3. **"View as member" preview.** Kanka does this best (SVC-040): the admin switches to a player's
   view, their edits are logged, the member's private "self" content stays hidden, and a "Back to my
   user" bar appears on every page.
   *Why it works:* it is the only reliable way for a DM to check that a secret really is hidden.
   It fits d20 Studio's private/public separation directly.

4. **Scheduling in three steps: find overlaps → decide → track attendance.**
   - Overlaps: when2meet's drag-to-paint heatmap (SVC-062), or Rallly's Yes / If need be / No votes
     that need no account (SVC-063).
   - Decide: Rallly's finalize-and-notify step.
   - Attendance: Sesh's RSVP with an attendance cap, waitlist and DM when a seat frees (SVC-058),
     shown in each viewer's time zone (Roll20 SVC-047, Sesh SVC-060).
   *Why it works:* "If need be" catches the answers that decide the date. Showing local time removes
   time-zone mistakes.
   F-011 already confirms the poll and the direct-date path, so these are refinements.

5. **Skip one session vs leave the campaign.** StartPlaying (SVC-052) keeps these as separate actions
   with a visible "Skipping" state. It also exposes a reschedule trap: skips carry over to the new
   time (SVC-053).
   *Recommendation:* after a reschedule, ask everyone again instead of copying attendance.
   *Conflict:* StartPlaying's hard 24 h cutoff exists because players pay. A free home group should
   get a warning ("the session starts in 3 hours, tell the DM") rather than a block.

6. **Reminders the user opts into, and calendar export as a feed.** Sesh sends reminder DMs only to
   people who asked (SVC-064) and gives an iCal feed with optional Google Calendar sync (SVC-065).
   Discord notifies only "Interested" members (SVC-055).
   *Why it works:* nobody receives messages they did not ask for.
   An iCal feed is a cheap, one-way integration and needs no linked account. It still needs owner
   approval under F-011's "no external calendar" bound.

7. **Session state that players can see, plus presence.** DDB's Start / Pause / End each show players
   their own message, with an anti-auto-end popup for the DM (SVC-103). The Connected Players list
   is visible to everyone (SVC-104). Alchemy has Here/Away with a custom message (SVC-108).
   *Why it works:* players know whether the DM is preparing, on a break or finished. The DM can see
   who is missing.

8. **Safety tools in three phases, each on its own surface.**
   - Before play: anonymous Lines & Veils in a personal Safety tab (Alchemy SVC-073), and the DMG
     2024 Game Expectations sheet (SVC-074).
   - During play: a signal button that is always within reach (Alchemy SVC-110, Foundry "Safety and
     Communication" SVC-111, Owlbear "Rumble!" SVC-113).
   - After play: Stars & Wishes (SVC-076).
   *Best during-play UX:* Rumble!'s graded anonymity, where Raise Hand is named but Stop is fully
   anonymous. Alchemy's X-Card flashes on the DM's screen.
   *Conflict:* anonymity vs. accountability. Recommend anonymous by default for Stop/X and named for
   Raise Hand.
   F-032 covers agreements only. The during-play signal is still missing (GAP-16), and it should
   never block play or save anything without the user knowing.

9. **Reporting and blocking only where strangers meet.** Roll20 has report, block, a moderation
   ladder and a code of conduct (SVC-148 to SVC-150). DDB has Report Image (SVC-114).
   *Why it matters:* these become necessary only if F-063 (public LFG) is adopted. A private group
   needs kick, leave and the safety tools, not moderation infrastructure. This ties GAP-16 to the
   Q161 decision.

10. **An LFG listing whose required fields gate publication, with a status box that says why.**
    - Roll20's Listing Status box names what is missing, and the listing turns off by itself when
      full (SVC-067).
    - StartPlaying requires at least one safety tool and content warnings (SVC-070, SVC-071).
    - Kanka's applications carry a message and an approve or reject reply (SVC-041).
    - Warhorn's FIFO waitlist cannot be reordered (SVC-009).
    *Why it works:* incomplete listings never go live, and applicants always get an answer.
    *Conflict:* Roll20's public discussion thread per listing vs Kanka's private application. F-063
    already prefers the private application.

11. **Discord as a bridge, not a replacement.**
    - One-way relays of rolls and events: Foundry webhook modules (SVC-121), Beyond20 (SVC-021),
      Avrae `!campaign` (SVC-116).
    - Two-way view of rolls: DDB's Game Log also shows Avrae rolls (SVC-107).
    - Linking an account for content access is not the same as logging in (SVC-147).
    *Why it works:* the owner's group already lives on Discord. AFB's report (SVC-169) found Discord
    fully accessible and Avrae a workable dice path for a blind player.
    *Conflict:* Roll20's Discord Activity (SVC-120) embeds the whole tabletop but is desktop-only and
    needs linked accounts. That is heavier and costs more, and GAP-17 does not authorise it.

12. **Recovery with a clear scope: copy before a risky step.**
    - Roll20: a daily rollback that restores everything and can only be undone by another rollback,
      with advice to copy the game first (SVC-078). Copy Game lets the user pick components (SVC-077).
      Deleted games can be restored for 6 months (SVC-079).
    - Kanka: a JSON export that can be re-imported, a readable Markdown export, and a notice when the
      export is ready (SVC-084).
    *Why it works:* the user always knows what a restore will overwrite.
    These fill in the open F-061 and F-027 items.

13. **Content updates that respect local edits.** Roll20's patch flow (SVC-132): a notice with patch
    notes, a queue that can be cancelled, overwriting only what the patch changed, and advice to
    duplicate edited entries. Foundry and Owlbear separate installing from enabling per world or room
    (SVC-134, SVC-135).
    *Why it works:* a DM who customised a published adventure does not lose that work.
    This applies directly to F-038 and to homebrew or SRD revisions.

14. **Visible provenance and attribution.**
    - SRD 5.2.1 requires an exact attribution sentence, and there is an Italian version (SVC-128).
    - DMs Guild requires an AI "creation method" label (SVC-136).
    - Roll20 states who owns each asset (SVC-138).
    *Why it works:* it satisfies the licence and helps users trust shared homebrew.
    An About/Legal page with the EN and IT attribution sentences, plus a provenance field on shared
    content, covers both requirements.

15. **AI recaps: review before sharing, answers limited by visibility, consent shown, retention
    stated.**
    - Archivist's Session Review, edited before sharing (SVC-088), and "Ask Archivist", which only
      uses what the asker may see (SVC-090).
    - Craig's RECORDING nickname and voice announcement (SVC-096).
    - Saga20's published retention limits (SVC-155).
    *Conflict:* d20 Studio's rules forbid adding a paid AI API implicitly, and privacy is an owner
    matter (GAP-18).
    *Low-cost precedents:* bring-your-own or local models (Phil's AI Assistant, RPGX with Ollama,
    SVC-099), or exporting notes as Markdown for an external tool (SVC-085). Friends & Fables
    (SVC-100) replaces the DM and is outside intent.

16. **Each preference has a stated scope, and the accessibility basics live in settings.**
    - Foundry separates client, user and world settings (SVC-163) and offers font size, OS-following
      theme, photosensitive mode, rebindable controls and performance mode (SVC-159 to SVC-164).
    - Owlbear respects the OS Reduce Motion setting (SVC-167).
    - Alchemy puts "disable motion" in the in-game gear menu (SVC-166).
    - Foundry keeps separate volume sliders per sound category (SVC-124). This remains useful for
      dice and UI sounds even though music is external.

17. **A map that works with a keyboard and a screen reader, without spoilers.** Owlbear 2.1 is the
    best precedent (SVC-167): Tab, Enter and arrow keys move through tokens, and accessible names are
    GM-only, so a screen reader never reads out a hidden monster's real name. The AFB field report
    (SVC-169) gives concrete acceptance tests: dropdowns must respond to arrow keys, and checkboxes
    must be labelled.
    *Conflict:* DDB's audio cues and high-contrast mode are only announced (SVC-168) and cannot be
    counted as precedent.

18. **Localization as a pipeline, with interface separate from content.** Roll20 has an account
    language setting (SVC-156) and a Crowdin workflow for sheets with per-language CSS (SVC-179).
    Foundry's Babele translates compendium content at runtime without changing the originals
    (SVC-157).
    *Market gap:* DDB has no localization (SVC-129, SVC-180), while the official Italian SRD exists
    (SVC-128). EN/IT with official sources is a real advantage for d20 Studio.
    *Conflict:* Roll20 states that its site translations came from Google Translate and relies on
    volunteers to improve them (SVC-156). Recommend human-reviewed EN/IT strings from the start.

**Open owner-level choices surfaced (not decided here):**
- Age policy and parental consent: DDB with k-ID vs Roll20's 13/16 vs StartPlaying's 18+
  (SVC-139 to SVC-142).
- Public LFG and its moderation load (Q161).
- Any AI processing of voice or notes (GAP-18).
- Calendar or Discord integrations that need linked accounts (GAP-17).
