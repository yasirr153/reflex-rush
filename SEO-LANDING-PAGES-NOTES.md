# SEO landing pages upgrade

## Replace
- `index.html`
- `src/main.ts`
- `src/style.css`
- `public/sitemap.xml`

## Add
- `public/robots.txt`
- `public/quick-reflex/index.html`
- `public/colour-rush/index.html`
- `public/fake-out/index.html`
- `public/speed-survival/index.html`
- `public/memory-flash/index.html`

## What changed
- Added five crawlable, search-focused game guide pages with unique titles, descriptions, canonical URLs and FAQ structured data.
- Added internal links between the game pages and the homepage.
- Added a sitemap entry for all six indexable URLs and a robots.txt file.
- Added `?mode=` startup handling so each SEO page can launch the existing game without duplicating game logic.
- Existing gameplay, GA4 and AdSense integration are preserved.

## Important
These pages are SEO/guide pages; the actual games still run from the existing app. No backend or dependency changes are required.
