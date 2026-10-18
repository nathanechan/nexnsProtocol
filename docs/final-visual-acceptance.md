# Local visual acceptance — 2026-10-18

Scope: finish Round 2 market adoption, verify Round 3 terminal interactions, and review shared mobile surfaces. No Git push, hosted deployment, contract integration or economic rule changes.

## Verified in the browser

- Launch: actual desktop row height 58px, mobile 67px, redundant completion label hidden, selected filter text white. Original fixture avatars use the approved atlas. Focus cards and table share recorded market history.
- Mobile Launch: no document overflow; compact cards and list fit at 390px. Desktop and mobile light/dark surfaces reviewed.
- Curve terminal: action panel starts about 173px from viewport top on a 390px device. Header price renders at 25px on mobile. 25 USDT shortcut, review dialog and simulated Buy completed; result showed 66.255895 TIDE.
- Operating terminal: no-balance Stake/Claim shortcuts correctly disabled on NEXNS. Existing SEA rewards supported a 25% Claim, then Stake and Unstake through the normal review dialogs, with balance and coverage quotes updating.
- Success feedback precision and retained locale were corrected after review. Exact executed balances remain unchanged by display formatting.
- Final follow-up: English mobile metric titles wrap without overlapping; header price size is 25px on mobile and change badges fit their content. Claim result displayed `326.122448 SEA` and switched from English to Chinese without retaining the old-language prefix.
- Portfolio, Create, Protocol, NEXNS and Live mobile routes loaded without horizontal document overflow at 390px.

## Code validation

Full suite: 271 tests passed before the last display-only corrections. Follow-up: 52 tests passed, including the new retained-feedback locale test and Claim/Operating regression coverage. Final production build passed, including lint and TypeScript checks, and the built server was started at localhost:3000. No full suite was unnecessarily repeated after display-only fixes.

Final screenshots are saved beside the earlier prototype screenshots in `docs/market-round1/review/`, prefixed `accepted-`. Local review uses localhost:3000; localhost:3005 is the earlier static prototype, not the running product.
