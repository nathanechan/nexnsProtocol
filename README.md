# NEXNS Frontend — Final Product

Bilingual frontend simulation: Create Project → Curve → Graduation → Migration → Operating Participate → Position Lots → Stake/Unstake → Contribution → Daily Settlement → Rewards → Claim. Mock data, exact economics, Zustand and browser persistence only. Step 5 completes Portfolio, Creator Studio, Protocol transparency, platform ecosystem and demo readiness. No further development phase starts automatically.

## Run and checks

Node 22+ and pnpm 11. `pnpm install`, then `pnpm dev`; open http://localhost:3000. Required checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm format:check`.

The hidden `/simulation-console` is absent from navigation. Development enables it; production requires `NEXT_PUBLIC_NEXUS_DEMO_CONTROLS=true` at build time. Keep that flag set for the demo server. `/design-system` is unavailable.

Browser checks: `node scripts/step5-browser-check.mjs` for final product routes, Studio, Protocol, metadata and focused accessibility; `node scripts/final-polish-check.mjs` for final contrast, keyboard table scrolling and console layouts; `node scripts/step4-browser-check.mjs` for Operating; `node scripts/step3-browser-check.mjs` for creation/Curve/migration. These use Playwright with installed Microsoft Edge. Set `NEXUS_PLAYWRIGHT_MODULE` to an installed Playwright module if using the bundled runtime, and optionally `NEXUS_BASE_URL` for another port. Results/screenshots go to ignored `test-results/`. Step 1/2 baseline scripts are retained.

## Final product correction

Normal pages use NEXNS branding and project terminology, with complete Simplified Chinese and English interfaces. `src/i18n/locale.tsx` owns the React locale context and `nexns-locale` local preference; `messages.ts` owns copy. Localization is performed while React renders, including accessible names, errors and persisted event summaries. User project names, contract addresses, token symbols and custom descriptions remain project content. Known catalog descriptions have English translations. Internal pool enums and saved financial amounts retain their original representation.

The primary navigation is 网络 / 探索 / 资产 / NEXNS / 协议, or Network / Explore / Portfolio / NEXNS / Protocol. Existing `/my-nexus` and `/p-ecosystem` URLs remain stable. Explore pins the canonical platform asset first in its active lifecycle pool, without an ordinary rank. Ordinary projects retain their sorting below it. Intermediate migration states leave both primary pools and remain searchable. Legacy platform metadata is normalized during hydration without replacing balances, books or history. Displayed legacy project IDs remain searchable through their presentation alias.

Every financial confirmation uses the shared `FinancialIdentity` alongside its input and expected result. Participate also shows this identity beside the form. Claim emphasizes You receive. Treasury and contribution remain result-only.

At 390px the project identity fits a compact header. Curve price, progress and remaining graduation appear in compact metrics before Buy/Sell; holdings, charts and project info follow. Operating begins with personal position, stake/coverage and claimable, then core action buttons and a single horizontal tab strip. Portfolio shows compact personal metrics and project-specific claimable rewards early. Details retain the studio link and the project sharing action remains available.

Normal UI omits development explanations. `/simulation-console` is the only route with internal presentation terminology and has a separate visual treatment. No protocol economics or integration capabilities were added in this correction.

Additional validation: `scripts/product-correction-browser.mjs` checks both locales across desktop/tablet/mobile routes and sections, forbidden copy, platform lifecycle pinning/search and measured mobile hierarchy. `scripts/correction-english-flow.mjs` exercises the full lifecycle and Operating actions in English. `src/tests/product-correction.test.tsx` covers locale persistence, navigation, six financial dialogs, final product modules and platform ranking/search.

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

`/` redirects to `/network`. Product routes: `/network`, `/explore`, `/my-nexus`, `/p-ecosystem`, `/protocol`, `/create`, `/economy/[chainId]/[contract]`. Creator Studio has ten public analytics modules and creator-only Logo/link editing. One economy route switches experiences by lifecycle. Unknown/malformed identities return 404.

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
