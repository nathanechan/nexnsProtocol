# Round 2 — Approved market direction in the product

Launch and Live now use the approved market identity atlas, compact rows, semantic change badges, a four-event recent activity tape and three stage-specific focus cards. The official NEXNS logo and creator-uploaded image data remain unchanged. Fixture art is selected by chain and contract, including original legacy placeholders; duplicate symbols do not share identity by accident.

All values come from the existing simulation adapter. Focus cards and table rows receive the same projected price on clock-only updates. Curve charts retain recorded quote history; operating charts retain the shared reference price history. No synthetic chart is substituted when history or price is unavailable. Existing operating ecosystem events now expose their existing amount and asset as structured display fields. No reward, financial balance, curve quote, migration or referral rules change.

The tape shows only eligible events for the current stage in the preceding 24 hours, excludes future timestamps, sorts chronologically and renders at most four items. New event IDs get a short entrance transition; reduced-motion users skip it. Price changes reuse the existing animated amount component. Issuance progress transitions smoothly. No new timer is introduced. Existing visibility-aware provider cadence controls updates.

Desktop adds sortable 24h volume. Mobile retains symbol, price/change and stage metric, with horizontally scrollable focus cards. Existing query URLs, canonical links, watchlist persistence, bilingual copy and theme controls remain in use.

Validation: full baseline suite (265 tests) passed; added time-window and clock-only card/table consistency tests also passed. Type checking, lint and production build checked with the workspace dependency runtime. Browser review and screenshots are recorded in `docs/market-round1/review/` with a `round2-` prefix. No deployment or Git push is part of this round.
