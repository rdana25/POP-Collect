# Cardline — Margin & Market Monitor

**Option 2** — a from-scratch redesign of the Shopify x eBay card margin & price
alert app prototype, on the `option-2` branch. It ignores the earlier
`Option-1` UI entirely and proposes its own SaaS dashboard direction.

## Run locally

From this directory:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Design direction

The app monitors a Shopify store's trading-card SKUs against live eBay
sold-listing prices, so the interface treats every card like a ticker: a SKU
becomes a `$SYMBOL`, each tile carries a sparkline of recent sold prices, and
figures are set in a monospace type for scannability — while the rest of the
UI stays a plain, bright SaaS canvas (dark control rail on the left, light
data surface on the right) so the "trading terminal" idea reads as one
accent, not the whole look.

- **Typography** — Space Grotesk (display), Inter (UI text), JetBrains Mono
  (prices, SKUs, timestamps).
- **Signature component** — a cost–retail–market **range gauge** on every
  card: a single horizontal scale with two ticks (cost, retail) and a dot
  (live market median), colored green when the market has moved into
  opportunity territory (above retail) and red when it has fallen into risk
  territory (at or below cost). This is a direct, literal rendering of the
  brief's own threshold logic, not a generic chart.
- **Grid and list views** for the card collection, toggled from one toolbar,
  with shared search, category, status, and sort controls.
- **Alerts** page mirrors the brief's two trigger types — Price Increase
  Opportunity and Margin Loss Warning — as reviewable cards with a suggested
  action.
- **Sync & integrations** and **Plan & billing** pages mock the
  Shopify/eBay connections, alert destinations, sync log, and the three
  pricing tiers from the spec (Starter $19, Pro $49, Enterprise $99).

## What this prototype proves

- A full SaaS shell: sidebar nav, store switcher, plan/quota widget, topbar
  search, notifications, and a manual "Sync now" action with simulated
  live price drift.
- Grid/list inventory views with search, category/status filtering, sorting,
  and an empty state.
- Per-card and bulk "sync" interactions that update prices, alerts, and the
  activity/sync log in place.
- Fully responsive down to mobile, with visible keyboard focus and
  `prefers-reduced-motion` respected.

No Shopify or eBay requests are made by this prototype, and it contains no
credentials — all card, billing, and sync-log data is mock data defined in
`app.js`.

## Production build next

1. Create a Shopify Partner app and development store, then use OAuth and the
   Admin GraphQL API to sync variants and `inventoryItem.unitCost`.
2. Register an eBay developer application and use Marketplace Insights for
   sold-sales data.
3. Add PostgreSQL, Redis/BullMQ workers, Slack/Discord/email delivery, and
   tenant-scoped authorization.
4. Implement Shopify recurring and usage subscriptions via
   `appSubscriptionCreate`; approval occurs at Shopify's confirmation URL.
