# Pop Collect card catalog

A shared database of collectible cards, built up from what users track in
Pop Collect and priced from eBay sold listings. Once it has enough cards,
adding a card becomes "search, pick, done": the user types a few words, picks
the match, and gets the right name, set, number and an image filled in.

Status: design only. Nothing below is implemented yet; it is meant for the
Python backend (the `card_watch` API the dashboard calls).

## How data gets in

```
 Shopify sync / manual add            eBay sold comps (daily job)
            │                                   │
            ▼                                   ▼
   1. normalize listing  ──►  2. match to catalog card  ◄── price observations
            │                       │         │
            │              matched  │         │ no match
            ▼                       ▼         ▼
   inventory_catalog_links   link + count   new card (status = pending)
                                              │
                                   3. review queue → verified
```

1. **Normalize.** Every card a user tracks, whether synced from Shopify or
   added by hand, is parsed into structured fields: category, year, set or
   product line, card number, player or character, variant/parallel, and
   grading (grader, grade, cert number). The category matcher in
   `app.js` (`normalizeCategory`) is the starting point and should move
   server-side.
2. **Match.** Look the card up by its identity key (below). A confident
   match links the user's item to the catalog card and bumps its
   `seen_count`. No match creates a `pending` catalog card from the parsed
   fields.
3. **Verify.** A pending card becomes `verified` once enough independent
   stores list the same card (for example 3), or after a human approves it
   in a review queue. Only verified cards appear in search for other users.
4. **Price.** The existing sold-comps job runs per catalog card rather than
   per user item. One eBay lookup then serves every user who owns that
   card, which also cuts API usage.

## Card identity

Two items are the same catalog card when these match:

| Field | Example |
|---|---|
| category | `basketball` |
| year | `2018` |
| set / product | `Panini Prizm` |
| card number | `280` |
| subject | `Luka Dončić` |
| variant / parallel | `Silver Prizm`, `1st Edition`, `Alt Art` |

Grading is **not** part of the identity. A PSA 10 and a raw copy are the
same catalog card with different prices, so prices are stored per
`(card, grader, grade)`.

The identity key is these fields lower-cased, accent-stripped and joined.
Matching tries the exact key first, then the card number within the same
set and year, then fuzzy name matching; anything below a confidence
threshold goes to the review queue instead of auto-linking.

## Images

In order of preference:

1. **Official sources** where they exist: Pokémon TCG API, Scryfall
   (Magic), YGOPRODeck (Yu-Gi-Oh!). The dashboard already uses these for
   its demo cards.
2. **User photos**, from the Shopify product image or an upload, only where
   the user agreed to share them (see Consent). Pick the best one per card
   (sharpest, front-facing, no watermark) and keep the others as
   alternates.
3. **Monogram slab** fallback, as today.

eBay listing photos belong to the sellers and should not be copied into the
catalog.

## Schema (Postgres / Supabase)

```sql
create table catalog_cards (
  id            uuid primary key default gen_random_uuid(),
  identity_key  text unique not null,
  category      text not null,
  year          int,
  set_name      text,
  card_number   text,
  subject       text not null,   -- player or character
  variant       text,
  status        text not null default 'pending'  -- pending | verified | rejected
                check (status in ('pending', 'verified', 'rejected')),
  seen_count    int not null default 1,          -- distinct stores tracking it
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on catalog_cards using gin (to_tsvector('simple',
  coalesce(subject,'') || ' ' || coalesce(set_name,'') || ' ' || coalesce(card_number,'')));

create table catalog_aliases (          -- other ways stores title the same card
  card_id  uuid references catalog_cards on delete cascade,
  alias    text not null,
  primary key (card_id, alias)
);

create table catalog_images (
  id          uuid primary key default gen_random_uuid(),
  card_id     uuid references catalog_cards on delete cascade,
  url         text not null,
  source      text not null,            -- official | user
  contributed_by uuid references auth.users on delete set null,
  is_primary  boolean not null default false
);

create table catalog_prices (           -- one row per eBay sold observation
  card_id    uuid references catalog_cards on delete cascade,
  grader     text,                      -- null = raw
  grade      text,
  price_usd  numeric(12,2) not null,
  sold_at    date not null,
  source     text not null default 'ebay'
);
create index on catalog_prices (card_id, grader, grade, sold_at desc);

create table inventory_catalog_links (  -- a user's item → catalog card
  user_id     uuid references auth.users on delete cascade,
  item_id     text not null,            -- Shopify variant id or manual id
  card_id     uuid references catalog_cards on delete set null,
  confidence  real not null,
  primary key (user_id, item_id)
);
```

`on delete cascade` on `auth.users` means deleting an account (the new
**Delete account** setting) removes the user's links. Catalog cards and
prices stay, since they no longer point at anyone.

## API for the dashboard

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/catalog/search?q=luka prizm&category=basketball` | Search-as-you-type for the Add card flow; verified cards only; returns name, set, number, image, latest median |
| `GET` | `/catalog/cards/{id}` | Card detail with price history per grade |
| `DELETE` | `/account` | Needed now: deletes the auth user with the service-role key; the dashboard already calls it |

Contributions don't need their own endpoint: the backend runs normalize and
match whenever it syncs or saves a user's inventory.

## Consent and privacy

- Add a clause to the terms and the sign-up screen saying that card details
  (not prices paid, not store identity) are used to improve the shared
  catalog, plus a settings toggle for sharing photos.
- Never expose a user's cost, retail price, quantity or store in the
  catalog. Only card attributes, contributed images and eBay sold prices
  are shared.
- Check the eBay API license terms on storing and redisplaying sold-price
  data before keeping a long price history.

## Suggested order

1. `DELETE /account` (the dashboard already calls it).
2. Tables plus the normalize and match step on inventory sync, writing
   pending cards. No user-facing change yet; the catalog fills in the
   background.
3. Move the sold-comps job to run per catalog card.
4. Seed verified cards and images from the official TCG sources.
5. `/catalog/search` and an **Add card** flow in the dashboard with
   search, pick and an image.
