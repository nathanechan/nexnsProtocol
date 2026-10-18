# Round 1 — Market visual direction

Scope: standalone review prototype for Launch and Live market lists, not a change to the production app. Serve this folder on localhost:3005. Round 2 will connect market events and motion to the existing simulation store after visual approval.

Changes: 16 original generated avatar illustrations, with 15 assigned to fixture symbols; unchanged official NEXNS logo. CSS atlas selects individual tiles without editing the generated source. Compact data rows, distinct project identity, stronger semantic price changes, market-cap/volume context, issuance progress, and three compact stage-specific focus cards. No permanent sidebar or marketing hero.

Interactions: stage navigation, symbol/contract/project-ID filtering, latest/hot/all/watchlist tabs, column sorting, project detail dialog, canonical links to localhost:3000, watchlist persistence, dark/light, Chinese/English, Ctrl/Cmd+K and keyboard filter navigation. No transaction execution in this prototype.

Prototype snapshot values are illustrative layout data; they do not replace the protocol/data layer. Mock-only assets are isolated here. Uploaded creator assets, production project metadata, canonical identity rules and economic formulas are untouched. Production integration must reuse the existing search/simulation execution layer rather than adopt this static fixture logic.

Validation: reviewed desktop dark and mobile light/dark screenshots. Verified search, watch/unwatch and empty state, ascending price sorting, detail dialog, theme/locale switching. Checked 320/390/768/1440 layouts for overflow and single-line column headers. Mobile keeps Token, Price, 24h Change and the stage metric; additional columns remain on desktop.

Asset: assets/token-atlas.png, generated original artwork. The official platform mark is copied unchanged from public/brand/nexns-logo.png. Review screenshots are stored in review/.
