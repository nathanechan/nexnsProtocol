# Curve price chart refinement

Removed terminal-local search; the global header search remains. Curve terminals default to a price chart rather than the theoretical issuance curve. Existing issuance curve remains a separate view.

Price history uses timestamped BUY/SELL priceAfter records for the canonical project only. The 1H/6H/24H windows filter actual records, excluding future, invalid and non-positive prices. No artificial candles or volume are generated. Chart provides time/price axes, high/low, observed-window change, tooltip/crosshair and latest observed price reference. Short windows show seconds where needed. Fewer than two recorded trades show an empty state.

Validation: 258 tests passed; production build, type checking and targeted lint passed. Desktop/mobile light/dark browser checks cover live data, ranges, issuance switching and horizontal overflow.
