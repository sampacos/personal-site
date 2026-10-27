# Plan: Bread Calculator & Bake Log

Source of truth for the calculator model: sheet 1 ("Dough Builder") of
`APC - Bread 👍🏻.xlsx` (copy in repo root). All other sheets are ignored.

Status: implemented (all sections below are built and tested; see "Implementation
status" at the bottom for outstanding setup steps and deviations).

## 1. Calculator model (port of "Dough Builder")

The spreadsheet has four input groups and three build tables plus derived metrics.
Blue cells are user inputs; everything else is derived. Ported as a pure, typed
module `src/lib/bread.ts` — no React, no DOM, unit-tested against the
spreadsheet's own computed values.

### Inputs

**Batch**
| Cell | Field | Default | Unit |
|------|-------|---------|------|
| B15 | Unit weight | 355.0 | g |
| B16 | Quantity of units | 4 | ea |
| B17 | Waste factor | 2.0 | % |

**Maintenance starter**
| Cell | Field | Default | Unit |
|------|-------|---------|------|
| B20 | Starter hydration | 80.0 | % |
| B21 | Multiplicative factor | 1.0 | (ratio) |

**Dough starter**
| Cell | Field | Default | Unit |
|------|-------|---------|------|
| B27 | Sugar | 0.0 | % |
| B28 | Starter hydration | 75.0 | % |
| B29 | Multiplicative factor | 2.0 | (ratio) |
| B30 | Pre-fermented flour | 13.5 | % |

**Total dough ingredient values** (as % of total flour; flour itself is locked
to the maintenance starter's flour %, i.e. `B35 = F20 = 100`)
| Cell | Field | Default | Unit |
|------|-------|---------|------|
| B36 | Water | 80.0 | % |
| B37 | Milk | 0.0 | % |
| B38 | Heavy cream | 0.0 | % |
| B39 | Egg | 0.0 | % |
| B40 | Egg yolk | 0.0 | % |
| B41 | Butter | 0.0 | % |
| B42 | Sugar | 0.0 | % |
| B43 | Honey | 0.0 | % |
| B44 | Salt | 2.0 | % |

### Derived values (exact spreadsheet formulas to port)

**Batch size** — `F15 = B15 * B16 * ((B17 + B35) / B35)` (total dough, g; 1448.4 for defaults).

**Maintenance Starter Build** (% table F20:F23, gram table L20:L23 scaled by
`L29 / F23`, i.e. the dough starter's total grams over its total %):
- Flour `F20 = 100`
- Water `F21 = B20` (starter hydration)
- Starter `F22 = (F20 / B21) + ((F20 / B21) * (F21 / F20))`
- Total `F23 = SUM(F20:F22)` (360)
- Grams: `L20 = (L29 / F23) * F20` etc.; Total `L23 = SUM` (64.46)

**Dough Starter Build** (% table F27:F31, gram table L27:L31 scaled by
`L36 / F31`, i.e. the final dough's starter grams over the dough starter's total %):
- Flour `F27 = 100`
- Water `F28 = ((F27 + (F27 / B29)) * (B28 / F27)) - ((F21 / (F20 + F21)) * F29)`
- Starter `F29 = (F27 / B29) + ((F27 / B29) * (F21 / F27))`
- Sugar `F30 = (B27 / F27) * ((F27 / B29) + F27)`
- Total `F31 = SUM(F27:F30)` (262.5)
- Grams: `L27 = (L36 / F31) * F27` etc.; Total `L31 = SUM` (188.01)

**Final Dough** (% table F34:F46, gram table L35:L46 scaled by `F15 / F46` = batch size / total %):
- Flour `F35 = F27` (100)
- Starter `F36 = ((B30 / (F35 - B30)) * F35) * (F31 / (F27 + (F29 * (F20 / (F20 + F21)))))`
- Water `F37 = ((B36 / F35) * (F35 + (B30 / (F35 - B30) * F35))) - (((F28 + ((F21 / (F21 + F20)) * F29)) / F31) * F36)`
- Milk `F38 = (B37 / F35) * ((B30 / (F35 - B30) * F35) + F35)`
- Heavy cream `F39`, Egg `F40`, Egg yolk `F41`, Butter `F42`, Salt `F45` — same pattern as Milk
- Sugar `F43 = ((B42 / F35) * (F35 + (B30 / (F35 - B30) * 100))) - ((F30 / F31) * F36)`
- Honey `F44 = (B43 / F35) * ((B30 / (F35 - B30) * F35) + F35)`
- Total `F46 = SUM(F34:F45)` (210.40)
- Grams: `L35 = (F15 / F46) * F35` etc.; Total `L46 = SUM` (1448.4)

**Universal metrics** (dough starter, rows 27–29; final dough, rows 35–37):
- Su (universal sugar): starter `I27 = (F30 / F31) * 100`; final `I35 = (B42 / B45) * 100`
- Hu (universal water): starter `I28 = (((F27 * 0.13) + F28 + ((F27 / B29) * 0.13) + ((F27 / B29) * (F28 / F27))) / F31) * 100`;
  final `I36 = (((B35 * 0.13) + B36 + (B37 * 0.87) + (B38 * 0.54) + (B39 * 0.74) + (B40 * 0.48) + (B41 * 0.14) + (B43 * 0.2)) / B45) * 100`
  (implicit water content: flour 13%, milk 87%, cream 54%, egg 74%, yolk 48%, butter 14%, honey 20%)
- Cu (universal concentration): `I29 = (I27 / I28) * 100`; `I37 = (I35 / I36) * 100`
- Ideal ranges displayed: Hu 28 – 35, Cu 30 – 40 (dough starter); Hu 28 – 35, Cu 25 – 50 (final dough)

**Estimated fermentation times** (at 28–30 °C, given as "X to Y h"):
- Maintenance starter: `B21 * 2.33` to `B21 * 2.666`
- Dough starter: `B29 * 2.33` to `B29 * 2.66`
- Bulk: `(((100 - B30) / B30) * 3) * 0.353` to `(((100 - B30) / B30) * 4) * 0.353`
- Proof: `(((100 - B30) / B30) * 3) - P35` to `(((100 - B30) / B30) * 4) - P37`

The "How to use" notes (rows 1–12) explaining Multiplicative Factor, Waste
Factor, Pre-Fermented Flour, Su/Hu/Cu are ported as UI help text / tooltips.

### Data model

```ts
interface CalculatorState {
  batch: { unitWeight: number; quantityOfUnits: number; wasteFactor: number };
  maintenanceStarter: { starterHydration: number; multiplicativeFactor: number };
  doughStarter: { sugar: number; starterHydration: number; multiplicativeFactor: number; preFermentedFlour: number };
  dough: { water: number; milk: number; heavyCream: number; egg: number; eggYolk: number; butter: number; sugar: number; honey: number; salt: number };
}

interface Bake {
  id: string;
  date: string;            // ISO date, primary sort key (newest first)
  description?: string;    // optional, shown in the bakes table
  notes?: string;          // free text
  photos: string[];        // photo references (uploaded, see §2b)
  formula: CalculatorState; // full snapshot of calculator inputs
  createdAt: string;
}
```

Computed values are re-derived from `formula` via `src/lib/bread.ts` at render
time — only inputs are persisted.

## 2. Storage

New "Bakes" tab in the existing Google Sheet (same spreadsheet as blog/recommendations),
accessed via `src/lib/sheets.ts`-style helpers (`src/lib/bakes.ts`):
`getBakes()`, `getBakeById()`, `addBake()`, `updateBake()`, `deleteBake()`. Follow
the existing patterns: row serialization/deserialization, server-side cache with
bypass, admin-gated writes.

### Photo upload flow (decided: upload flow; storage: Vercel Blob)

- `POST /api/bakes/upload` (admin-only, multipart/form-data) accepts image files,
  validates type/size, and stores them in the Vercel Blob store under the
  `bakes/` prefix.
- The API returns the blob's public URL which is saved on the bake's `photos`
  array. Legacy entries may hold bare Drive file IDs — `bakePhotoSrc()` renders
  both.
- Why Blob and not Drive: service accounts cannot upload to a personal My Drive
  (no storage quota), and Shared Drives/OAuth delegation require Workspace.
  Vercel Blob is the native fit for an Astro-on-Vercel site; images are served
  from Vercel's CDN.

## 3. Pages & UI

- `/bread/calculator` — React island (`client:load`), live-updating calculator
  with all four input groups and the three build tables (% and grams), Su/Hu/Cu
  with ideal ranges, fermentation time estimates, and batch size. Keyboard
  accessible, labelled inputs, visible focus rings.
- Admin-only extras on the same page (rendered only when session is admin):
  - "Save formula" action → prompts for bake date + optional description → `POST /api/bakes`.
  - Bakes table at the bottom: date-indexed (newest first), description column
    to the right, each row links to the detail page.
- `/bread/bakes/[id]` — bake detail page (public): date, description, full
  formula (all inputs + computed breakdown), notes, photos. Included in sitemap.
- `/bread/bakes` — public index page listing all bakes (newest first), mirroring
  the `/blog` index pattern; linked from the bread section nav.
- API routes: `GET /api/bakes` (public, read-only), `POST /api/bakes`
  (admin-only), `POST /api/bakes/upload` (admin-only), following `api/blog/*`
  patterns, admin check enforced server-side via `src/lib/auth.ts`.

### Security requirements

- Every mutating endpoint (`POST /api/bakes`, `POST /api/bakes/upload`)
  verifies the admin session server-side before touching Drive or the Sheet.
  Unauthenticated requests get 401; authenticated non-admins get 403. No
  client-trusted state.
- The upload endpoint is the ONLY path to the blob store. It must validate
  file type (images only) and enforce a size limit; reject anything else before
  the upload call.
- Blob privacy model: uploads reach the store only through the admin-gated API.
  Blob URLs are public but unguessable (random suffix) and there is no folder
  listing or drive-wide crawling surface — a strictly stronger guarantee than
  a shared Drive folder.
- The Google Sheet itself stays private; public reads go exclusively through
  our read-only API, which returns bake data only (never credentials or the
  sheet ID).
- The spreadsheet's existing data remains untouched: bakes helpers read/write
  only the "Bakes" tab.

## 4. Tests (mandatory per repo standards)

- Vitest unit tests for `src/lib/bread.ts`: assert exact equality with the
  spreadsheet's computed values (defaults documented above) plus edge cases.
- Vitest tests for bakes serialization round-trip in `src/lib/bakes.ts`.
- Playwright e2e: calculator interactions, admin save flow, bakes table, detail page.

## 5. Decisions (all resolved)

- Photos: **upload flow, stored in Vercel Blob** — admin uploads files via an
  admin-only API route (`POST /api/bakes/upload`); returned blob URLs are saved
  on the bake (see §2). Legacy Drive file IDs still render via `bakePhotoSrc()`.
- Bake detail page visibility: **public** — treats the bake log like the blog;
  admin-only concerns are limited to authoring (save formula, upload photos).
- Standalone `/bread/bakes` index page: **yes, public** — natural entry point,
  mirrors `/blog`, crawlers get a listing.

### Detail-page visibility — factors for the decision

- Content sensitivity: bakes are a personal log (notes, fermentation observations, photos).
  Public means anyone browsing the site can read every bake.
- Photo privacy gap: uploads land in Drive and get link-accessible URLs
  regardless of page visibility. An admin-only page does NOT make the photos
  private unless we also proxy image delivery through an authenticated route
  (adds an API route + auth check per image request; meaningful extra work).
  So the real choice is: "public page, public photos" vs "admin page + photo
  proxy" — a half-private option doesn't exist without the proxy.
- Consistency: blog posts and recommendations on this site are public; bakes
  would be the first admin-only content if kept private.
- Effort: identical either way for the page itself; the only delta is the photo
  proxy route if admin-only + private photos are both wanted.
- SEO/sitemap: public pages get sitemapped and discoverable; admin-only pages
  should be excluded from the sitemap and return 404/redirect for non-admins.

### `/bread/bakes` index — factors for the decision

- If detail pages are public: a public index is the natural entry point
  (mirrors the existing `/blog` index pattern, gives crawlers/users a listing,
  and links from the bread section). Recommended in that case.
- If detail pages are admin-only: the admin table on the calculator page already
  serves as the index; a separate admin-only index page would be duplicative and
  add a route to maintain for little value.
- Cost either way is small — same list component and sheet read reused.

## 6. Implementation status

Built and verified (all unit tests, e2e across desktop-chrome / mobile-chrome /
mobile-safari, `astro check`, biome, and production build pass):

- `src/lib/bread.ts` — full port of "Dough Builder"; 22 Vitest tests assert
  equality with the spreadsheet's own computed values.
- `src/lib/bakes.ts` — Bakes tab storage, validation, photo upload via Vercel
  Blob, seed fallback; 10 Vitest tests.
- API routes: `GET/POST /api/bakes`, `POST /api/bakes/upload`,
  `POST /api/bakes/update`, `POST /api/bakes/delete` (all admin-gated,
  server-verified).
- `BreadCalculator.tsx` island on `/bread/calculator` with live computation,
  help text, admin save form (date, description, notes, photo uploads).
- Admin bakes table at the bottom of the calculator page (server-rendered).
- Public `/bread/bakes` index and `/bread/bakes/[id]` detail pages.

Outstanding setup steps (owner actions, not code):

1. Set `BLOB_READ_WRITE_TOKEN` in the local `.env` and in Vercel (create the
   Blob store in the Vercel dashboard, or link one to the project). The old
   `BAKE_PHOTOS_FOLDER_ID` / Drive-folder setup is no longer needed.
2. No Google Drive scope changes are required; the service account only needs
   its existing Sheets scope.

Known deviations from the plan:

- The sitemap integration only emits prerendered (static) pages, so the
  server-rendered `/bread/bakes` pages are not in `sitemap-index.xml`. Adding
  them would require a custom sitemap endpoint; deferred.
- Bakes are editable by admins: description, notes, and photos can be changed
  and the whole bake deleted (`POST /api/bakes/update`, `POST /api/bakes/delete`,
  "Manage this bake" section on the detail page). Date, formula, id, and
  createdAt are immutable.
