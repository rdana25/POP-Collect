# Card Margin Monitor

An interactive, credential-free dashboard prototype for the Shopify x eBay Card Margin & Price Alert app.

## Run locally

From this directory:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## What this prototype proves

- Action-focused card pricing dashboard and filters
- Price-increase and below-cost alert states
- Portfolio, plan quota, and scheduled-sync UI
- Manual refresh and review interactions in demo mode

## Production build next

1. Create a Shopify Partner app and development store, then use OAuth and the Admin GraphQL API to sync variants and `inventoryItem.unitCost`.
2. Register an eBay developer application and use Marketplace Insights for sold-sales data. The source brief's Browse API reference should be replaced for this use case.
3. Add PostgreSQL, Redis/BullMQ workers, Slack/Discord/email delivery, and tenant-scoped authorization.
4. Implement Shopify recurring and usage subscriptions via `appSubscriptionCreate`; approval occurs at Shopify's confirmation URL.

No Shopify or eBay requests are made by this prototype, and it contains no credentials.
