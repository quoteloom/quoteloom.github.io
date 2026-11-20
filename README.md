# quoteloom.github.io

Static landing site for Quoteloom (GitHub Pages, user site). No build step, no tracking.

Before launch: replace the placeholder `__GUMROAD_URL__` (in `index.html`) with the live Gumroad product URL:
`sed -i 's#__GUMROAD_URL__#https://REAL-GUMROAD-LINK#g' index.html`

Tests: `node tests/calc.test.js` (mini calculator math).
