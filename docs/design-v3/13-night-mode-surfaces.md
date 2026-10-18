# Night mode shared transaction surfaces

Fixed the shared financial identity block for portal-rendered transaction dialogs: semantic surface, foreground, muted labels and dividers. Also themed the Portfolio claim form outer container, transaction result highlight, pending/success/failure messages, cap notice, legacy market columns, table bases and skip link. Removed the participation principal redemption notice from the final confirmation as requested.

Validation: successful production build and 59 targeted transaction/claim tests. Browser acceptance: 106 checks on the main pages plus Curve/Operating transaction dialogs, English desktop and Chinese mobile, and a light-theme confirmation regression. Tested Buy, Sell, Participate, Stake, Unstake, Claim and Portfolio claim confirmation; checked actual background/foreground colors, no unintended white containers, no notice, responsive overflow and no page errors. Reviewed Chinese mobile participation and claim screenshots.
