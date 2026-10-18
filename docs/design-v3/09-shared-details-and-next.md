# Shared terminal details refinement

All terminal detail tabs now use a shared padded, bounded content layout with consistent body typography, key/value alignment and responsive wrapping. Removed terminal back links and the redundant Operating search control; global search and Curve search remain available.

Validation: 254 unit tests passed; production build passed; targeted ESLint passed; formatting passed. Browser checks: 464 assertions across Chinese/English, light/dark and 1440/768/390/320 widths, no page errors. Reviewed mobile Transparency and Contribution screenshots.

Next priorities: centralize translation keys and financial terminology before adding Japanese, Korean, Thai and Vietnamese; verify native translations, locale formatting and text expansion. Then improve transaction states/recovery and mobile accessibility/performance. Additional languages are not implemented in this change.
