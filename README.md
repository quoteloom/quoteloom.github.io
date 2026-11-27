# quoteloom.github.io

Static landing site for Quoteloom (GitHub Pages, user site). No build step, no tracking.

Buy buttons show a disabled "Coming soon" state until a product link is set in `assets/config.js` (`gumroadUrl`), the single config spot.

Tests: `node tests/calc.test.js` (mini calculator math); run every `tests/*.test.js` with `for t in tests/*.test.js; do node $t; done`.

Quote Maker (`/quote-maker/`): client-side PDF quotes. Math in `assets/quote-maker/quote-core.js` (tests: `tests/quote.test.js`), PDF layout in `assets/quote-maker/pdf.js`, UI in `assets/quote-maker/app.js`, jsPDF 4.2.1 bundled at `assets/vendor/jspdf.umd.min.js` (MIT). Pro is unlocked by a Gumroad license key: set `quoteTool.gumroadProductId` and `products["quote-maker-pro"]` in `assets/config.js`.
