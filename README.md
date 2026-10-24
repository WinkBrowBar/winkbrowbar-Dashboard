# Ledger — Attribution Dashboard (v2, redesigned)

A proper multi-page dashboard: Overview, Campaigns, Customers, and an
admin-only Team page for managing who has access.



umbreen@winkbrowbar.com
winkbrowbar@123
## Design
- Rebuilt with **Tailwind CSS** (see `tailwind.config.js` for the brand
  color/font tokens carried over from the original design)
- Dark ink sidebar + warm bone content area
- Fraunces (serif) for headline numbers, Inter for UI text, IBM Plex Mono
  for data labels
- Signature element: **The Ledger** — a horizontal bar where each segment's
  *width* is literally the revenue share for that platform, not a decorative
  chart

## What's new in this pass
- **Custom date-range filter** (not just 7/30/90D pills) on Overview,
  Campaigns, and optionally Customers — pick any start/end date
- **Campaign drill-down** — click any row on the Campaigns page to see
  exactly which customers converted through that ad, their revenue, and
  the utm_source/medium that brought them in ("which ads are good, and
  who did they bring in")
- **Customers page**: search by name/email/phone, paginated (20/page),
  optional first-purchase date filter
- **Team page**: clear placeholders on the email ("teammate@winkbrowbar.com")
  and password ("At least 8 characters") fields when creating a user

## Run it

```bash
npm install
npm run dev
```

## Build for deployment

```bash
npm run build
```

Outputs a `dist/` folder of static files - host anywhere.

## Pages
- **Overview** — the Ledger, hero revenue number, key stats, top campaigns
- **Campaigns** — full campaign breakdown, ranked by revenue
- **Customers** — every customer with revenue, ranked by lifetime value
- **Team** (admin only) — create/deactivate dashboard users, assign roles

## Requires the backend role system already deployed
Same as before: `JWT_SECRET` set, at least one admin user created via
`POST /api/auth/users`. Nothing new needed on the backend for this redesign -
same API endpoints as before, plus it now also calls the existing
`/api/auth/users` endpoints for the Team page.
