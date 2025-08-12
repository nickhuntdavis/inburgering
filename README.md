# KNM Dutch Flashcards

Practice app for KNM (Kennis van de Nederlandse Maatschappij) with a modern, simple flashcard UI and a structured content source.

Live site: https://genuine-syrniki-f86aeb.netlify.app/

## Quick start

- Open the live site and start reviewing. Progress is saved locally in the browser (localStorage + IndexedDB).
- Choose a category from the dropdown. The progress bar and the top stats reflect either the selected category or overall (when set to All).

## Controls

- Flip: Space or F
- Hard: 2 (reinsert card +8 positions)
- Know it: 3 or K
- Next: N or →
- Shuffle: S
- Reset Known: R
- Speak term: P

## Tech stack

- Static app: `index.html`, `style.css`, `app.js`
- Content: Baserow (table) via a Netlify Function
- Hosting: Netlify static hosting + serverless function at `/.netlify/functions/cards`

## Data source (Baserow)

The client never exposes secrets. The browser fetches content from a serverless proxy that holds the Baserow token.

- Netlify env vars
  - `BASEROW_TABLE_ID` = your table id (e.g. `640052`)
  - `BASEROW_TOKEN` = Baserow database token (read-only)
  - `BASEROW_API` = `https://api.baserow.io` (optional override)
- Function: `netlify/functions/cards.mjs` paginates Baserow and returns `{ results: [...] }`

### Load order (client)

1) `/.netlify/functions/cards` (production)
2) `http://localhost:8788/cards` (local dev proxy)
3) Public Baserow view (if enabled)
4) Local `descriptions/descriptions.json` fallback
5) Legacy text file fallback

## Content schema (what the app expects)

Each row/card supports the following fields. The app normalizes common Baserow shapes (single/multi select objects) into plain strings.

- `slug` or `id` (string): unique id used for progress tracking
- `front` (string): term (front of card)
- `back` (string): back/short explanation
- `description` (string): context shown on the back
- `category` (string)
- `subcategory` (string)
- `pos` (string[] | string): coerced to array of strings
- `tags` (string[] | string): coerced to array of strings
- `priority` (number)

See `DECISIONS.md` for details on normalization and fallbacks.

## Local development

Option A: Netlify Dev (recommended — runs the function locally)

```bash
# from repo root
npm i -g netlify-cli
netlify login
netlify dev
# open http://localhost:8888
```

Option B: Static server + local proxy (fallback)

```powershell
# static server
npx http-server . -p 8080 -c-1

# proxy (requires BASEROW_TOKEN/TABLE_ID)
$env:BASEROW_TABLE_ID="640052"
$env:BASEROW_TOKEN="YOUR_TOKEN"
node baserow-proxy.mjs
# open http://localhost:8080
```

## Deploy (Netlify)

1) Connect the GitHub repo in Netlify (Import an existing project)
2) Build settings:
   - Build command: (empty)
   - Publish directory: `.`
   - Functions directory: `netlify/functions` (auto from `netlify.toml`)
3) Add env vars: `BASEROW_TABLE_ID`, `BASEROW_TOKEN`, (optional) `BASEROW_API`
4) Deploy → Verify `/.netlify/functions/cards` returns JSON

## Repository layout

```
/                    # static app
├─ index.html
├─ style.css
├─ app.js
├─ descriptions/     # local data fallback
├─ netlify/
│  └─ functions/
│     └─ cards.mjs   # serverless proxy to Baserow
├─ baserow-proxy.mjs # optional local proxy for dev
├─ README.md
└─ DECISIONS.md
```

## Contributing / content updates

- Content edits happen in Baserow; redeploy not required.
- App changes: push to `main`; Netlify auto-deploys.

## License

MIT (or add your preferred license).

