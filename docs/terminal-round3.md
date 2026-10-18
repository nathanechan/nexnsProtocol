# Round 3 — Terminal hierarchy and action feedback

Implemented stronger symbol/price hierarchy, animated live prices without remounting the animation on each tick, change badges, a more prominent progress track, and a blue action panel accent. Both themes share the same component structure. Existing mobile action-first layout remains in place; personal assets remain collapsed.

Buy and Participate now offer 25/100/250 USDT shortcuts. Sell, Stake, Unstake and Claim offer 25/50/75% of the relevant available balance; existing MAX remains. Buttons are disabled when insufficient, zero or processing. Percentages use bigint units and round down. All selected values still pass through the original quote and confirmation flow. No execution, referral, reward, lifecycle or financial rules change.

Pending/success/error results use a shared accessible feedback component with Lucide icons. Empty feedback takes no space. Selecting a shortcut or MAX clears the previous result. Keyboard focus, disabled styles and reduced-motion treatment are included. Existing professional chart remains unchanged.

Code validation: production build (including lint/types) and formatting passed. Full regression returned 270 passing tests and one Studio locale test timeout; the isolated retry passed all 28 tests in that file with no code changes. Four new shortcut/result tests cover exact units, dust, insufficient balances and processing states.

Browser verification completed after the user authorized continuation. Mobile action-first layout, light/dark themes, Buy, Claim, Stake and Unstake review/execution feedback were exercised through the normal simulation UI. Final screenshots use the `accepted-` prefix in `docs/market-round1/review/`. Feedback precision and locale switching were corrected and rechecked. See `docs/final-visual-acceptance.md`. No remote push or hosted deployment was requested.
