# Mobile action-panel corrections — 2026-10-19

- Remove inherited minimum heights, flex stretching and absolute confirmation-button placement from nested action forms. Stake/Unstake now size to their content like Participate/Claim.
- Constrain preview rows with shrinkable grid columns, 12px panel padding and wrapping financial values. Explicit theme text colors prevent dark-mode values inheriting a legacy navy color.
- Match enabled primary actions to the global #2464eb. Disabled actions retain that hue at 42% opacity while remaining disabled.

Browser validation: 390px light Stake layout, 320px dark Claim with input 338.876686, and Curve Buy enabled/disabled states. Claim preview reproduced the 288.045183 receive value using an existing SEA reward balance, without executing a transaction or seeding/resetting user data. All four values stayed within their cells with 13px right inset including border, 12px padding and no horizontal overflow. Both enabled and disabled Buy used rgb(36,100,235), with opacity 1 and .42 respectively. Viewport override was reset after checks.

Only CSS changed. Quote math, balances, action validation and execution are untouched. Screenshots are saved in this directory. No Git push was requested for this correction.
