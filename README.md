# NEXNS Frontend — Final Product

Bilingual frontend simulation: Create Project → Curve → Graduation → Migration → Operating Participate → Position Lots → Stake/Unstake → Contribution → Daily Settlement → Rewards → Claim. Mock data, exact economics, Zustand and browser persistence only. Step 5 completes Portfolio, Creator Studio, Protocol transparency, platform ecosystem and demo readiness. No further development phase starts automatically.

## Run and checks

Node 22+ and pnpm 11. `pnpm install`, then `pnpm dev`; open http://localhost:3000. Required checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm format:check`.

The hidden `/simulation-console` is absent from navigation. Development enables it; production requires `NEXT_PUBLIC_NEXUS_DEMO_CONTROLS=true` at build time. Keep that flag set for the demo server. `/design-system` is unavailable.

Browser checks: `node scripts/step5-browser-check.mjs` for final product routes, Studio, Protocol, metadata and focused accessibility; `node scripts/final-polish-check.mjs` for final contrast, keyboard table scrolling and console layouts; `node scripts/step4-browser-check.mjs` for Operating; `node scripts/step3-browser-check.mjs` for creation/Curve/migration. These use Playwright with installed Microsoft Edge. Set `NEXUS_PLAYWRIGHT_MODULE` to an installed Playwright module if using the bundled runtime, and optionally `NEXUS_BASE_URL` for another port. Results/screenshots go to ignored `test-results/`. Step 1/2 baseline scripts are retained.

## Final product correction

Normal pages use NEXNS branding and project terminology, with complete Simplified Chinese and English interfaces. `src/i18n/locale.tsx` owns the React locale context and `nexns-locale` local preference; `messages.ts` owns copy. Localization is performed while React renders, including accessible names, errors and persisted event summaries. User project names, contract addresses, token symbols and custom descriptions remain project content. Known catalog descriptions have English translations. Internal pool enums and saved financial amounts retain their original representation.

The primary navigation is 发行 / 运行 / 资产, or Launch / Live / Portfolio, at `/markets`, `/launch`, `/live`, `/portfolio`. `/` redirects to Launch. `/markets` remains a secondary compatibility route. Desktop uses a compact header; mobile (including 768px) uses exactly three fixed bottom destinations. The logo menu contains `/nexns`, `/protocol`, Create Project and Creator Studio (owned project, or Portfolio projects when none). `/network` redirects to `/markets`, `/explore` to Launch or Live according to its stage while preserving sort/search parameters, `/my-nexus` to `/portfolio`, and `/p-ecosystem` to `/nexns`. Canonical project deep links are unchanged. All sections use the same global search and existing search service, with Ctrl/Cmd+K access. Markets combines the existing active lifecycle catalogs; Launch contains only CURVE_OPEN; Live only OPERATING. The three public market pages use compact linked rows, with stage-specific columns. Launch and Live use five aligned desktop columns and four compact mobile cells, with price/change paired on mobile. Large project cards remain available to secondary components. Each lifecycle list pins the canonical platform asset first in its active lifecycle pool, without an ordinary rank. Ordinary projects retain their sorting below it. Intermediate migration states leave both primary pools and remain searchable. Legacy platform metadata is normalized during hydration without replacing balances, books or history. Displayed legacy project IDs remain searchable through their presentation alias.

Every financial confirmation uses the shared `FinancialIdentity` alongside its input and expected result. Participate also shows this identity beside the form. Claim emphasizes You receive. Treasury and contribution remain result-only.

At 390px the project identity fits a compact header. Curve holdings and Buy/Sell precede the chart, progress and lower project details. Operating begins with personal position, stake/coverage and claimable, then core action buttons and a single horizontal tab strip. Portfolio shows compact personal metrics and project-specific claimable rewards early. Details retain the studio link and the project sharing action remains available.

Normal UI omits development explanations. `/simulation-console` is the only route with internal presentation terminology and has a separate visual treatment. No protocol economics or integration capabilities were added in this correction.

Information architecture validation: `scripts/ia-browser-check.mjs` checks new routes, legacy redirects, three desktop/mobile destinations, active state, all five search identity fields from all four sections, language persistence, lifecycle pinning and overflow at 1440/768/390.

Additional validation: `scripts/product-correction-browser.mjs` checks both locales across desktop/tablet/mobile routes and sections, forbidden copy, platform lifecycle pinning/search and measured mobile hierarchy. `scripts/correction-english-flow.mjs` exercises the full lifecycle and Operating actions in English. `src/tests/product-correction.test.tsx` covers locale persistence, navigation, six financial dialogs, final product modules and platform ranking/search.

## Market experience (Rebuild Step 2)

`src/data/market.ts` derives small `MarketRow` responses from existing project state. Its `MarketDataService.list(section, sort)` boundary is replaceable with a production backend; the page only subscribes to a refresh revision and does not read financial books. Markets defaults to 24H volume, with change/stage/newest alternatives. Launch displays Token/Price/Change/Progress/Users; Live displays Token/Price/Change/Staked/Users. Both offer Watchlist/Hot/New/All tabs and ascending/descending numeric header sorting. Watchlist uses a separate local UI key (`nexns-watchlist-v1`) with canonical chain/contract identities; it survives migration. Hot combines existing users with progress or monetary stake. New Live uses migration completion, while New Launch uses creation time. Curve change remains unavailable until an existing full reference-period history can support it. The platform asset stays first independently of sort, and migration stages stay searchable outside the lists.

All public rows are native links to canonical chain/contract routes, with keyboard focus and Enter navigation. Prices use dollars with sensible precision; amounts use K/M/B suffixes, missing metrics use N/A, and signed changes never depend on color alone. The market service adds no prices or protocol calculations. Desktop rows are aligned without individual cards/shadows; tablet/mobile use compact identity, price/change and stage-specific secondary values, with no sideways table scrolling. Global search remains the single search interface. Loading skeleton rows, empty states and retry are service-driven.

`node scripts/market-browser-check.mjs` checks both languages, all sorts, density, keyboard links, stage pinning and 1440/768/390 screenshots. `src/tests/market.test.tsx` validates read models, canonical identity, non-mutating sorting, formatting and loading/error/empty/retry states. Protocol action engines remain unchanged.

## Architecture

- `src/domain/economics/amount.ts`: normalized 18-decimal integer amount parsing and exact serialization.
- `curve.ts`: frozen Curve formulas, quotes, graduation, deterministic chart and rolling volume.
- `operating.ts`: valid price selection, coverage/tier, next-tier requirements, deterministic tree contribution, cumulative claim distribution and display-only progression.
- `operating-quote.ts`: user action previews/validation, separate from React.
- `settlement.ts`: pure hourly snapshot integration, per-lot participation candidates, time-weighted network candidates, FIFO network capacity allocation, daily issuance constraint and final reward/capacity writes.
- `operating-models.ts`: exact Position Lots, members, project-local referral trees, hourly snapshots, settlements and claim records.
- `src/simulation/operating-actions.ts`: transactional Participate, Stake/Unstake, Claim, settlement, clock and demo scenarios. Writes the shared store and public outcome events.
- `src/simulation/store.ts`: project registry, Curve/Operating ledgers, balances, persistence and shared revision.
- `validate-operating.ts`: saved-ledger checks for balances, capacity, issuance, referral trees and hourly snapshots.
- `src/data/service.ts`: current-store Network, Explore, full-universe Search and project lookup.
- `src/components`: final lifecycle shell, Operating tabs, action reviews, holdings, histories, Portfolio synchronization and isolated console.

Financial calculations use BigInt; Number conversion is confined to display/chart summaries. Protocol execution formulas do not appear in primary UI. Future blockchain adapters replace data/execution rather than the product layout.

## Identity, routes and discovery

Canonical identity is normalized `chainId:tokenContract`; names and symbols may repeat. Generated addresses and IDs are collision checked. Search priority is contract → project ID → symbol → name → creator wallet, with optional chain scope. Search covers all projects; Explore has only Curve Top 100 and Operating Top 100.

`/` redirects to `/launch`. Product routes: `/network`, `/explore`, `/my-nexus`, `/p-ecosystem`, `/protocol`, `/create`, `/economy/[chainId]/[contract]`. Creator Studio has ten public analytics modules and creator-only Logo/link editing. One economy route switches experiences by lifecycle. Unknown/malformed identities return 404.

Initial fixtures: 35 economies, 16 Curve, 17 Operating, 2 migration. A separate canonical NEXUS platform-token fixture uses NEXUS/USDT only. Original canonical addresses remain unchanged. Public fixture market/participation aggregates represent background demo data; Operating settlement executes only against the explicitly modeled project members/lots. It does not reconstruct all historical participants or historical minted supply behind earlier fixture summaries. Fresh migrated projects start with no background participation.

## Curve and migration

Genesis 1,000,000 X; Curve inventory 800,000 X; migration inventory 200,000 X; net target 100,000 USDT; both trade fees 1%. Rational thirds preserve the frozen Curve constants. Reference points: zero sold / 0.03125 price; 400,000 sold / 20,000 reserve / 0.08 price; 800,000 sold / 100,000 reserve / 0.5 price.

Token outputs round down; required reserve and fees round up to the smallest normalized unit. Final buy accepts only the required payment, charges fee on that amount, and retains unused input in the wallet. Graduation requires both reserve and inventory conditions and closes Buy/Sell. Sell returns inventory without burning or creating a Position/referral contribution. Existing participant counts keep seeded history plus distinct demo buyers; new projects count distinct successful buyers. Volume uses accepted gross buys/pre-fee sell outputs and expires after 24 hours.

Migration controls are console-only. Failure returns to Ready with no final pools. Ideal no-loss completion shows two pools worth 100,000 USDT equivalent each, total liquidity/POL 200,000. Canonical platform-token identity uses only NEXUS/USDT; repeated NEXUS symbol does not trigger that exception. No DEX/router/procurement/Treasury execution is simulated.

## Participation and referral

Each participation deducts exact USDT and creates one immutable, independent lot. Principal is committed and not redeemable. Lifetime gross reference-value capacity is 2.5× principal, not guaranteed return. Used/remaining capacity, settled token rewards, dates and completion remain visible historically.

First valid Operating participation binds one project-specific sponsor. A referral URL uses `?ref=` with the encoded canonical-project/wallet code. Without a code the creator root is used. The root creator may participate with no parent. Self-referral, unknown/cross-project sponsors, cycles and replacement are rejected. Curve buying binds nothing. Sponsor state remains read-only after binding.

## Stake, prices and contribution

Coverage uses active principal and the valid stake price. Boundaries: below 5% = 0 theoretical rate/multiplier; 5%, 15%, 30%, 50% start rates 0.2%, 0.4%, 0.6%, 0.8% and multipliers 1–4. Next-tier token requirements round up. Zero active principal or unavailable valid price displays N/A.

Normal fixture prices have matching direct/indirect observations. Protected fixtures provide an explicit synthetic 10% difference: stake uses the smaller price and reward uses the larger. These are demo observations, not a production Oracle. Invalid/discovery prices prohibit new participation/stake and do not accrue new rewards. Unstake and historical reward rights remain available; estimated Claim valuation becomes N/A without a valid reference.

Contribution follows the frozen effective-stake and diversified-branch rules. Own coverage changes effective contribution to ancestors. Personal diversified contribution depends on descendants/branch composition. Only users with active capacity enter reward weighting; inactive ancestors do not break descendant propagation. Primary UI shows contribution, weight, effective network, direct connections, branches, sponsor and finalized network rewards, with a plain-language help panel.

## Simulated clock and settlement

Each project starts at the first UTC day boundary on or after its launch and the current day. The Near Capacity preset represents a mature historical snapshot and advances this demo date by 313 days. Actions replace the current hourly snapshot; advancing the console clock preserves previous hours. `Settle Day` closes the remaining day using its last known state and starts the next day. This is an explicit accelerated demo clock, not a production job or wall-clock oracle. A stake/unstake at hour 12 cannot alter hours 0–11.

Settlement calculates each lot independently, then allocates network value to remaining capacity by created time and Lot ID FIFO. Identical lot/kind/price requests are grouped before final quantity rounding. Candidate capacity truncation precedes the common daily issuance reduction. Unallocated/reduced rewards are not redistributed or carried as debt. Daily cap is based on unminted supply at day start; lifetime issuance includes genesis and is not reduced by burns. Actual finalized value consumes capacity, and completed lots leave active principal at the next daily boundary.

Finalized gross rewards immediately become claimable. On the following simulated day a per-second display shows yesterday's reward progress; that animation changes no entitlement or claimability. A zero-candidate day finalizes zero explicitly. A wholly invalid-price day reports unavailable reward settlement. Repeat finalization of the same day is rejected.

## Claim and assets

Claim previews gross quantity, net receipt, estimated value and status. Partial/full Claim updates wallet tokens, claimable, lifetime claimed, public activity, burn result and history. Capacity does not change at Claim. The four frozen allocations are internal; primary UI does not expose the distribution.

Allocations use differences of cumulative gross-claim totals, preventing fee avoidance by splitting. Fractional normalized-unit rounding stays in internal escrow dust until cumulative allocation resolves it; every payout delta remains nonnegative and conserved. Simulated failure rolls back the entire financial action. No real platform conversion is executed.

Assets, Overview, positions, stakes, rewards, contribution and activity in Portfolio read the same ledger and update without reload. Different project tokens remain separate; quantities are not summed into a misleading asset valuation.

## Persistence and demo controls

The existing `nexus-simulation-v3` save is backward compatible with Steps 3–4. Old saves receive the canonical platform-token fixture without replacing user finances. Optional Curve creator revenue fields fall back to retained successful fee events; subsequent trades preserve that recorded baseline. It now includes Operating books, immutable sponsor relationships, lots, stake, hourly snapshots, clock, issuance, reward/claim history and demo failure flags. Saved projects/balances/Curve/lifecycle/public events remain intact; activities retain the latest 1,000. Corrupt saves are discarded. localStorage is browser-local and syncs other tabs. A routing cookie contains only created identity keys, never financial state. Reset restores the seed dataset. Browser storage restrictions may leave in-memory state only.

Console: seven Curve/migration presets; seven Operating presets (Low Coverage, Mid Coverage, Full Coverage, Multi-Lot, Contribution Active, Near Capacity, Claimable); add USDT/X; seed a tree/add active branch; advance six hours; settle day; fail next action; migration start/fail/complete; Reset with confirmation. Presets replace selected-project demo user financial/history state. Near Capacity includes seeded historical claimed rights; Claimable is generated by the settlement engine. Funding represents demo balances, not a normal-user mint button.

## Recommended Step 4 review

1. Console: select an economy, choose Operating, add USDT and project tokens.
2. Same canonical project URL: Participate 2,400 USDT; inspect the new lot and 6,000 USDT capacity.
3. Stake 2,400 X at a 0.5 USDT valid price; coverage becomes 50%, theoretical daily rate 0.8%.
4. Console: seed a referral tree; Contribution shows diversified network activity.
5. Console: Settle Day. Rewards/lot capacity/Portfolio update automatically.
6. Claim 10 X; review 8.5 X net receipt. Inspect history and wallet change.
7. Test Unstake, failure, partial/full Claim, Near Capacity completion and reload recovery.
8. Keep `/my-nexus` open in another tab to inspect live synchronization.

## Scope

No real wallet/signatures/contracts/blockchain/indexer/PancakeSwap; no production Oracle, settlement service or jobs; no creator revenue withdrawal execution; no Treasury/buyback/LP/gas execution controls. No backend formulas, sharding, Keeper, allocation or Oracle controls in normal product UI. The protocol parameters/formulas are unchanged; exact rounding, fixture backgrounds and accelerated clock are documented simulation conventions. The final frontend is ready for review; no new phase starts automatically.

## Final personal and creator experience

Portfolio includes Overview, Projects, Positions, Stakes, Rewards, Network and Activity. Curve holdings and previously traded projects remain discoverable alongside Operating positions. Completed lots are retained and filterable. USDT reference values aggregate only where meaningful; claimable, earned and claimed token quantities remain project-separated. Execution links open the existing project Stake/Rewards service and confirmation flow; Portfolio has no separate execution engine.

Creator Studio has Dashboard, Participants, Growth, Network, Liquidity, Treasury, Token, Revenue, Analytics and Lifecycle. Every module reads the selected canonical economy. Public analytics can be inspected without impersonating a creator. Only the current creator wallet can change Logo and website/community links; the service rejects extra fields and unsafe links. Name, symbol, fees, supply, beneficiaries, referral rules and pools are fixed. Uploaded PNG/JPEG/WebP logos are limited to 250 KB.

Creator revenue is shown separately in USDT and project tokens. Curve fees accumulate on successful trades; Operating creator accrual follows actual completed user claims. Historical revenue rows show earned amounts, not protocol distribution controls. Creator withdrawal is unavailable because this simulation has no creator withdrawal engine.

Charts use recorded daily outcomes with full text/table alternatives. Missing earlier volume, market history, pool addresses and circulating supply display N/A or an explicit empty state. Growth uses recorded wallets, added position capital and stake net changes; no project health score or invented rankings. Background fixture aggregates do not generate fictional wallet rows. Treasury public result snapshots preserve the latest 100 recorded outcomes per project. History is limited to records retained in the browser save; older saves may lack structured amounts for charts.

Protocol has Overview, Network State, Supply, Contracts, Settlement, Price Status, POL, Burn and Public Events. Supply is project-specific; burning reduces current supply but never restores issuance capacity. The paginated registry displays chain + Token Contract + Registry ID. Public burn events derive from completed claims; public POL events derive from completed migrations. No ABI, execution queue, sharding, budget or administrative controls appear.

## Full demo walkthrough — 5–10 minutes

Use this sequence in one browser; keep Portfolio open in a second tab to demonstrate synchronization.

1. **0:00–1:00 — Network / Explore.** Open `/network`, then `/explore`. Compare the two Top 100 stage pools. Search by the complete contract `0x1111111111111111111111111111111111111111` and open NX-0001. Duplicate names/symbols do not replace contract identity.
2. **1:00–2:00 — Curve.** Open `/simulation-console` in another tab, select NX-0001 and choose `全新曲线`. The selected project URL stays `/economy/56/0x1111111111111111111111111111111111111111`. Add demo USDT if necessary. Buy 100 USDT, then sell 100 SEA; inspect preview, wallet change and public activity.
3. **2:00–3:00 — Graduation / Migration.** In the console choose `03 · 即将毕业`. Return to the project and enter 100 USDT Buy; only the required final amount is accepted. The same project switches to Migration Ready. In the console start and complete migration; return to see Operating and established liquidity results.
4. **3:00–5:00 — Operating.** Add demo project tokens in the console. Participate 2,400 USDT to create a 6,000 USDT-capacity lot. Stake 2,400 SEA at the fresh migrated 0.5 USDT price; coverage becomes 50%. In the console establish a referral tree. Open Contribution to see updated contribution/network results.
5. **5:00–6:00 — Reward / Claim.** In the console choose `结算当日`. Rewards immediately show the full claimable entitlement; the presentation progress creates no extra rights. Claim 10 SEA and review 8.5 SEA actual receipt. Check wallet balance, capacity, history and Portfolio in the second tab.
6. **6:00–8:00 — Personal / Creator.** Review Portfolio positions, stakes, reward and activity filters. Open `/studio/NX-0001`: Participants, Network, Revenue, Treasury and Analytics are read-only outcomes. For creator metadata, console `01 · 全新发行` creates an economy owned by the demo wallet; its Studio allows Logo/links only.
7. **8:00–9:00 — Transparency / Ecosystem.** Open `/protocol`: supply, remaining issuance, registry, settlement, price quality and public burn/POL events. Open `/p-ecosystem`: the platform token has only NEXUS/USDT and follows the same issuance rules.
8. **Optional — Edge cases.** Use `07 · 奖励就绪`, `08 · 已完成头寸`, a failure scenario or confirmed reset. One-click presets replace selected-project demo state; Fresh Launch creates a new economy. The completed preset uses a mature historical snapshot and finalizes remaining capacity through the settlement engine.

## Final QA and integration boundary

Run all five checks above, followed by the Step 3, Step 4 and Step 5 browser scripts against the production build with the demo flag enabled. The scripts cover 1440/768/390 widths, cross-tab and reload recovery, key forms, metadata restrictions, stage transitions and ordinary-page absence of backend controls. Step 5 checks headings/landmarks, named buttons, labelled forms, keyboard tabs, focus indication, dialog Escape and reduced motion. Charts include expandable data tables. No full automated WCAG audit package is installed; focused checks are not a certification.

Future integration must replace mock registry/market snapshots, exact browser balances, action adapters, metadata persistence, paired synthetic price observations, hourly settlement runner, creator accrual/withdrawal data and public-event sources. It must also provide real wallets, contracts, explorer identities, authoritative historical supply and market series. The final route structure and user execution UX stay intact. Demo state lives only in browser storage and is not secure custody or a multi-user backend.

## Rebuild Step 3 — Token terminal

Canonical economy routes use a 20/52/28 desktop switcher, market workspace and action panel. Mobile puts identity, personal state and actions before charts. Operating uses Participate/Stake/Claim only. Secondary-market trading is a separate disabled DEX entry until an authoritative pair URL exists. Migration remains read-only.

Create now uses a single Project Name and Description, preserving creator-entered content exactly. Language selection applies only to system UI. Legacy locale metadata remains readable/searchable for compatibility but does not replace original brand content in displays. Catalog hydration preserves custom identities and financial ledgers.

`node scripts/terminal-browser-check.mjs` covers both languages, four lifecycle states and 1440/768/390 layouts. Step 3 ends at review.

## Rebuild Step 4 — Secondary products

Portfolio is a personal asset center with five compact valuation/status results, linked project rows, independent Position Lots, stakes, rewards, network and activity. Wallet token and claimable valuations use available reference prices; stake value uses the existing stake reference. Missing required prices remain N/A, and different token quantities are never added. Completed lots and claim/settlement histories remain visible. Claim and Stake execution stay in the canonical Token Terminal. Created projects also appear in the personal project list.

NEXNS remains a pinned lifecycle asset and has a contextual `/nexns` page with supply, burn, price, liquidity and the same canonical terminal link. The NEXNS terminal links back to its core-asset context; it never has an NEXNS/NEXNS pool.

Protocol has six compact transparency sections: Overview, Contracts, Supply, Settlement, Price Status and Public Events. Supply and burn remain per project. Studio retains ten creator modules, responsive tables and permitted Logo/link editing only. No financial, Treasury, Oracle or mint controls were added. Secondary destinations remain in the Logo menu, with Create a secondary desktop CTA.

`src/tests/secondary.test.tsx` checks valuation, synchronization surfaces, identity, lifecycle, permissions and result-only boundaries. `node scripts/secondary-browser-check.mjs` checks every secondary module in both languages at 1440/768/390, keyboard navigation, menu/Create routing and Portfolio-to-Claim. Step 4 ends at review; Step 5 does not start automatically.

## Rebuild Step 5 — Final product surface

The desktop header is NEXNS / Launch / Live / Portfolio / Search / Language / Create / Wallet. Mobile has one Search icon, the Logo menu and three bottom destinations. Search entries all open the same global dialog and preserve contract → project ID → symbol → localized name → creator matching, Ctrl/Cmd+K and canonical chain/contract links.

Curve uses one compact market strip, a derived curve chart, recent activity and Buy/Sell. On mobile, progress/remaining precede the action panel; charts follow. Operating has one market strip, one personal-state strip and exactly Participate/Stake/Claim. It exposes a separate disabled “Trade on DEX ↗” entry because no real market URL is available. Healthy lifecycle/price badges are absent from normal terminal headers; exceptions remain visible. Migration results and dates live under Transparency. In-place migration selects Positions and Live without dropping explicit secondary deep links.

Rules and chart explanations use native expandable disclosure. Action previews show relevant outcomes; all six confirmations retain project name, symbol, contract, action, input and expected result. Frozen economics, lifecycle transitions and execution adapters remain unchanged in this step. Stake no longer repeats the primary balance/position/coverage summary. Portfolio orders Claimable, Position, Stake, Token Assets and Active Projects with stronger Claimable hierarchy; claim shortcuts do not repeat balances. NEXNS list badges are removed; its concise dedicated context links to the ordinary terminal.

Final QA includes unit tests, lint, typecheck, formatting, production build, bilingual lifecycle flows and browser checks at 1440/768/390. `scripts/final-surface-browser-check.mjs` additionally checks healthy/exception status visibility, disabled DEX, three actions, progressive disclosure, summary hierarchy, Search keyboard entry, dialog focus trapping/Escape and mobile action order. Existing Studio and Protocol result-only analytics remain available. Browser artifacts are written to ignored `test-results/`.

Remaining integration boundaries: real wallet signing and chain execution; authoritative registry, balances, prices, market history, settlement and event feeds; verified DEX pair URLs. These belong to the existing data/execution adapters. No executable DEX trade or fabricated market history is provided. Step 5 ends here for final product review; no additional feature phase starts automatically.

## Step 5 final detail correction

Create exposes one name, symbol, description, Logo and five public links; no separate Chinese/English fields. Names and descriptions are preserved verbatim through confirmation, creation, locale switching and reload. The store change is metadata-only; economic execution is unchanged.

Terminal and secondary surfaces use fewer borders, compact strips, thin dividers and subdued layers. Important personal values, price and curve progress carry stronger numeric weight. Operation panels reserve a stable workspace and bottom CTA location; stake tier details are collapsed. Mobile action tabs stick within their operation panel, above the existing three-destination bottom navigation. Empty states are short. Hover/focus, panel/value entrances, progress transitions and outcome feedback honor reduced-motion settings.

`node scripts/detail-correction-browser-check.mjs` checks single-field creation and raw metadata persistence, three mobile navigation links, stable Participate/Stake/Claim panel/CTA/scroll positions, sticky tabs, reduced motion and overflow at 1440/768/390. The existing lifecycle, financial confirmation, Portfolio/Studio/Protocol, search and language regressions remain required. This correction ends at review.

### Step 6 — Product copy and information reduction

Ordinary product screens use 仓位, 昨日收益, 累计收益, 覆盖率 and concise asset labels. Healthy lifecycle and price badges are hidden outside the protocol and management views. The logo menu uses Create / Manage; the application footer is removed. Participation acknowledgement appears only in the final confirmation. The terminal no longer repeats update timestamps, claimable rewards in reward details, or presentation-only daily progress. Project branding and execution engines are unchanged.

`node scripts/step6-copy-browser-check.mjs` checks both locales and three viewport widths, including navigation, status visibility, overflow and the participation confirmation boundary.

### Step 7 — Token branding and staking workspace

Token identities share uploaded-image support and geometric fallbacks seeded by chain + contract. Catalog fixtures use fictional short brands; creator names and descriptions remain raw content. The Live list shows only token identity, reference price, monetary staked value and user count. Staking quantities and their trend remain in Operating detail, with no mini charts or volume in Live rows.

Operating terminals use Staking Trend: 24H / 7D / 30D / 90D / All, UTC crosshair readouts, pointer/touch and arrow-key navigation. Deterministic mock baseline snapshots begin after operating migration; persisted successful stake/unstake events reconstruct their quantity changes. These are presentation fixtures, not historical chain observations. Failed actions add no points. Calculations and financial engines are unchanged. Total stake uses a short presentation-only number transition and respects reduced motion.

`node scripts/step7-visual-browser-check.mjs` verifies both locales at 1440/768/390, all ranges, historical selection, stake/unstake deltas, reload and screenshots in `test-results/step7-*.png`.

## Step 8 — Shared live presentation data

`src/simulation/live-market.ts` is the market adapter boundary. It projects persisted, identity-seeded external reference prices and anonymous ecosystem aggregates over the existing simulation store. All UI consumers use the same projection. Financial books, exact balances, coverage calculations, reward settlement and claim entitlement are untouched by clock progression.

One provider clock updates every 30 seconds and catches up on visibility/return. Reference movement uses bounded sinusoidal profiles. Global staking drift applies only to the seeded background stake, not personal balances. Anonymous participating-user increments occur every 3–6 hours. Liquidity comes directly from the existing project protocol summary. Value is exclusively total stake multiplied by reference price. User actions remain the exact existing engines and reconcile the same projected total/chart immediately.

History persists in `nexus-simulation-v3` alongside existing state. Closed chart samples and user events retain their recorded values; the current fifteen-minute head follows live quantity. Time away is caught up with at most 64 points per project per pass. Older chart samples are compacted for browser storage. The market list retains its chosen order during clock ticks; explicit sorting/user-state changes recompute it. Prices and Portfolio market valuations update without settling rewards.

Internal `/simulation-console` includes a one-hour market advance separate from reward-day advance/settlement. Market time never grants user rewards. Future RPC/DEX/API integration replaces the market adapter and execution data source; no wallet signing, actual DEX execution, APIs or backend are added. Seeded history/background activity are frontend fixtures, not on-chain provenance.

Step 8 verification adds state/formula/persistence/lifecycle/date/reduced-motion tests and `scripts/step8-live-browser-check.mjs`, plus the bilingual 1440×900 / 768 / 390 visual suite in `scripts/step8-visual-browser-check.mjs`. Screenshots and logs are stored under ignored `test-results/`.

## Final UI cleanup

Live was refined from a four-column comparison at 1440 / 768 / 430 / 390 widths, in Chinese and English. Staked means USDT-equivalent value, using the existing shared read model; its sort follows monetary value rather than token quantity. Platform rows share the same layout and stay pinned. Operating detail retains its staking quantity chart and existing actions. Portfolio keeps the compact asset summary and canonical inline Claim flow; its default valuation helper sentence is removed. No protocol engine, live adapter, simulation store or dynamic behavior changes are required.

Final market list refinement: `scripts/market-refinement-browser-check.mjs` verifies bilingual discovery, favorites across reload, header sorting, canonical navigation and compact layouts at 1440/768/430/390. Evidence is written to ignored `test-results/market-refinement/`. Economics and simulation persistence are unchanged.
