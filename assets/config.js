/* Quoteloom site config: the ONLY place to set Gumroad product links.
   One entry per product (matches data-buy="..." on the buttons).
   Leave a value empty ("") to show the disabled "Coming soon" button for that product. */
window.QUOTELOOM_CONFIG = {
  products: {
    "pressure-washing": "https://quoteloom.gumroad.com/l/pressure-washing-calculator",
    "house-cleaning": "https://quoteloom.gumroad.com/l/house-cleaning-calculator",
    "lawn-care": "https://quoteloom.gumroad.com/l/lawn-care-calculator",
    "rental-analyzer": "https://quoteloom.gumroad.com/l/rental-property-analyzer",
    "airbnb-profit": "https://quoteloom.gumroad.com/l/airbnb-profit-calculator",
    "trucking-cost-per-mile": "https://quoteloom.gumroad.com/l/trucking-cost-per-mile-calculator",
    "home-services-bundle": "https://quoteloom.gumroad.com/l/home-services-calculator-bundle",
    "property-investor-bundle": "https://quoteloom.gumroad.com/l/property-investor-calculator-bundle",
    // Quote Maker Pro membership page, e.g. "https://quoteloom.gumroad.com/l/quote-maker-pro". Empty = "coming soon".
    "quote-maker-pro": "https://quoteloom.gumroad.com/l/quote-maker-pro"
  },
  // Quote Maker Pro license check. Set gumroadProductId to the product ID shown on the Gumroad product's
  // edit page (Content/License key section, "product_id"). Empty = Pro cannot be activated yet.
  quoteTool: {
    gumroadProductId: "j0iWd3ejgCbjhp76VXw4Ig=="
  }
};
