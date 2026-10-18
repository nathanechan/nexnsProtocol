# Professional charts and presentation runtime

TradingView Lightweight Charts 5.0.9 renders candlesticks, crosshair OHLC, draggable/zoomable time scales, 1m/5m/15m/1h intervals and reset. Curve OHLC aggregates actual simulation trades. Operating OHLC samples the same deterministic reference-price adapter used by market prices; it is simulated market data, not external exchange data. Operating charts retain the separate staking trend. TradingView attribution/logo and LICENSE/NOTICE are retained.

The browser presentation prepares up to three untouched Operating books (platform first), granting fixture token inventory, seeded positions/stakes and settled rewards. Existing non-pristine books and personal positions are preserved. Preparation is idempotent. Rewards remain exact integer amounts in the existing shared books.

One presentation day takes 60 seconds of active time. A one-second timer updates a distinct estimated pending amount; the existing daily settlement engine runs at the accelerated day boundary. Only settled gross is claimable, and the existing claim split, history and wallet credit logic is reused. No offline catch-up is performed after a long suspension; repeated timestamps do not settle twice. New participation books also acquire the clock. No keeper or settlement buttons are exposed.

This clock is a presentation adapter, not a change to real protocol day duration, rates, caps or issuance formulas. Future production adapters must replace it with real timestamps and finalized settlement results.

Validation: 261 tests, production build/type/lint, formatting. Runtime tests cover untouched-book initialization, financial validation, idempotence, pending accrual, automatic settlement, repeat timestamp, claim wallet credit, persistence and no offline catch-up.

End-to-end browser acceptance passed: claim, stake, participate, per-second estimate, automatic settlement, repeat claim and reload persistence. Professional chart intervals, zoom, desktop/mobile light/dark themes and staking view also passed. Shared reference prices use deterministic smoothed multiscale noise to avoid fixed alternating-minute candle patterns.
