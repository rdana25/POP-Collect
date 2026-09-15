# Cardline — Margin & market monitor

An interactive, credential-free frontend prototype for the Shopify × eBay card
margin & price alert app. Static HTML/CSS/JS, no build step, no framework.

## Run locally

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Design direction

Light, borderless, frosted. Surfaces are separated by tone and soft shadow
rather than 1px lines; the sidebar, top bar, menus and mobile tab bar are
`backdrop-filter` glass over a faintly tinted canvas. Primary actions are
near-black ink; one cobalt accent handles interaction; green and red are
reserved strictly for market movement.

- **Type** — Geist (UI and figures, tabular numerals). Geist Mono only for
  SKU tickers.
- **Slab thumbnails** — every card is drawn as a graded slab (custom inline
  SVG): label strip with grader, barcode ticks and grade; real card scans in
  the art window where a public source exists (Pokémon TCG API, Scryfall),
  otherwise a category-tinted monogram; foil sheen and a 3D tilt on hover.
- **No pulsing dots.** Status is always a direction glyph (↗ ↘ →). Sync
  progress is a hairline sweep across the top bar; the chart's current value
  is a tag pinned to the end of the line; plan usage is a ring gauge.
- **Price rail** — each card carries a cost → retail band with a market
  marker. Green extends when the market is above retail (opportunity), red
  when it is at or below cost (risk). It is the app's threshold logic, drawn.
- **Hero chart** — the overview opens with portfolio market value over
  7/30/90 days drawn inside the portfolio's margin band: cost basis below,
  listed retail above, a hover crosshair, and the current value pinned to
  the line's end. Daily series are interpolated from each card's weekly sold
  medians and summed; no new data was invented beyond that.
- **Real everything** — official card scans on every card (Pokémon TCG API,
  Scryfall, YGOPRODeck), a designed store mark, a portrait for the account,
  Lucide icons, and Shopify / eBay / Slack / Discord brand marks.

## What the prototype covers

- Overview: hero value + chart, stat row, market ticker, needs-attention
  list, recent activity.
- Inventory: grid and list views; search, category/status filters, sorting;
  inline edit on any card; "Edit all" spreadsheet mode.
- Alerts: price-increase opportunities and margin-loss warnings with
  suggested actions and mark-as-reviewed.
- Sync & integrations: Shopify and eBay connection cards, alert destinations
  (Email / Slack / Discord), sync log.
- Plan & billing: current plan, usage, draggable 9-tier plan slider.
- Account settings: registration, profile, password, display currency.
- Responsive to mobile (bottom tab bar), keyboard focus visible,
  `prefers-reduced-motion` respected. `/` focuses search.

All card, billing and sync data is mock data in `app.js`. No Shopify or eBay
requests are made and there are no credentials. Card images and fonts load
from public CDNs (images.pokemontcg.io, cards.scryfall.io, Google Fonts), so
the demo needs an internet connection to look its best; without one it falls
back to system fonts and monogram slabs. Asset links carry a `?v=` query;
bump it when shipping CSS/JS changes so browsers don't serve stale files.

## Production build next

1. Create a Shopify Partner app and development store, then use OAuth and the
   Admin GraphQL API to sync variants and `inventoryItem.unitCost`.
2. Register an eBay developer application and use Marketplace Insights for
   sold-sales data.
3. Add PostgreSQL, Redis/BullMQ workers, Slack/Discord/email delivery, and
   tenant-scoped authorization.
4. Implement Shopify recurring and usage subscriptions via
   `appSubscriptionCreate`; approval occurs at Shopify's confirmation URL.
