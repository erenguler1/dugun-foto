# dugun-foto

Wedding photo collection site. Guests scan a QR at the venue, tap a `+` button, and their photos land in a Google Drive folder owned by the couple.

**Scope is locked. Read this whole file before writing code.**

---

## Project context

- **Type:** One-off static site for a single wedding. NOT a SaaS, NOT multi-event.
- **Lifespan:** Built, deployed, used during one wedding day, archived. Treat it like a one-shot deliverable.
- **Users:** Wedding guests (mobile, varying network quality, no tech literacy assumed). One action: upload a photo.
- **No admin UI.** Photos go straight to Drive. The couple browses Drive directly. No gallery page in this project.

## Stack

Chosen for minimum friction, maximum mobile performance, zero maintenance:

- **Frontend:** Plain HTML + CSS + JS. No framework. No build step. No npm.
- **Backend:** Google Apps Script (web app deployment).
- **Storage:** Google Drive folder (couple's account).
- **Hosting:** Vercel static deploy (or Netlify — either works for static).
- **QR:** Generated externally after deploy.

**Do not** introduce React, Vite, Tailwind, TypeScript, npm packages, or any build tooling. The whole point of this stack is that it has no moving parts.

## Architecture

```
[Guest phone]
     │
     │  scan QR → opens URL
     ▼
[index.html @ Vercel]
     │
     │  POST  body: JSON {filename, mimeType, data (base64)}
     │       Content-Type: text/plain  (intentional — see Gotchas)
     ▼
[Apps Script web app]
     │
     │  Utilities.base64Decode → Utilities.newBlob → folder.createFile
     ▼
[Drive folder]
```

## File structure

```
dugun-foto/
├── index.html              ← single page
├── style.css               ← all styles
├── app.js                  ← upload logic + UI state
├── apps-script/
│   └── Code.gs             ← Apps Script source (kept in repo for reference; deployed manually)
├── CLAUDE.md               ← this file
└── README.md               ← deploy / setup steps
```

Everything in one flat directory. No `src/`, no `components/`. It's three files.

## Configuration

All config lives as top-of-file constants. No env files, no config files.

**`app.js` constants block:**

```js
const APPS_SCRIPT_URL  = "https://script.google.com/macros/s/REPLACE_WITH_DEPLOYMENT_ID/exec";
const WEDDING_DATETIME = "2026-07-11T19:00:00+03:00";
const KINA_MAPS        = "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("Düzköy Öğretmen Evi Trabzon");
const DUGUN_MAPS       = "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("VAV BAHÇE Aşağı Söğütönü 1040. Sokak Tepebaşı Eskişehir");
```

- `WEDDING_DATETIME` — ISO 8601 with the `+03:00` Türkiye offset; drives the live countdown (`Gün : Saat : Dakika : Saniye`).
- `KINA_MAPS` / `DUGUN_MAPS` — Google Maps search URLs for the two "Konum Bilgisi" pills. Built from `encodeURIComponent`-wrapped venue queries, not hardcoded coordinates.

All other display text (couple names, family names, event dates/times/venues, section headings) is hardcoded directly in `index.html` — there are no `COUPLE_NAMES` / `WEDDING_DATE` constants anymore.

**`apps-script/Code.gs` constants:**

```js
const FOLDER_ID = "REPLACE_WITH_DRIVE_FOLDER_ID";
```

Of these, only `FOLDER_ID` is still a `REPLACE_WITH_...` placeholder in this repo. The real Drive folder ID lives only in the Apps Script editor — it is pasted in at deploy time and never committed, because `apps-script/Code.gs` here is reference source, not the deployed artifact. `APPS_SCRIPT_URL`, `COUPLE_NAMES`, and `WEDDING_DATE` are committed with their real production values; the URL is shown as a placeholder above for readability, but per the Faz 3 decision the real endpoint is public (Anyone access) and safe to commit.

## Apps Script behavior

- Single entry point: `doPost(e)`.
- Reads JSON from `e.postData.contents`.
- Decodes base64, builds a `Blob`, writes it to `DriveApp.getFolderById(FOLDER_ID)`.
- Returns JSON `{ success: true, fileId }` on success, `{ success: false, error }` on failure.
- Uses `ContentService.createTextOutput(...).setMimeType(ContentService.MimeType.JSON)` for the response.
- Filenames preserve the original name. If multiple files share a name, Drive auto-suffixes — that's fine.
- No GET endpoint. `doGet` is not implemented (we don't need it).

## Frontend behavior

- Mobile-first. Single scrolling page, no routing. Centered, `max-width: 560px` container.
- The page is a digital wedding invitation built from `reference/wedding-invite.jsx` (a React mockup, translated to vanilla HTML/CSS/JS). Sections, top to bottom:
  1. **GİRİŞ (splash)** — fullscreen, centered: heart image + "Berna & Burak" (script font) + "11.07.2026" + an animated scroll-hint dot at the bottom.
  2. **Hero** — small uppercase "Davetlisiniz" label, then a diagonal stack of names: "Berna" (offset left) → "&" (center) → "Burak" (offset right).
  3. **Families** — 3-column grid: "Nazife & Engin BEKAR" | heart image | "Aysel & Mustafa GÜLER".
  4. **Geri Sayım** — live countdown to `WEDDING_DATETIME`, ticking every second, format `Gün : Saat : Dakika : Saniye`. Each unit zero-padded to 2 digits; uses `tabular-nums` so digits don't shift width. Clamps to `00 : 00 : 00 : 00` once the date passes.
  5. **Events** — KINA and DÜĞÜN cards side by side, each ending in a "Konum Bilgisi" pill that links (`target="_blank"`) to the corresponding Google Maps URL (`KINA_MAPS` / `DUGUN_MAPS`).
  6. **Anılarınızı Paylaşın (upload)** — the photo-collection feature. A round `+` button opens the native file picker (`accept="image/*"`, `multiple`). **Do not** set the `capture` attribute — it forces the camera and hides the gallery option on iOS/Android. On selection: convert each file to base64, POST to `APPS_SCRIPT_URL` one by one, show progress as `n/total`. Success → button fills, "Teşekkürler", auto-reset after ~2.5s. Failure → "N/M fotoğraf yüklenemedi · tekrar dene". Below: a strip of thumbnails of what was uploaded *this session only* (in-memory, no persistence).
- Upload mechanics (`uploadFile`, `readAsBase64`, the sequential loop, the `text/plain` POST) are unchanged from the original `+`-only app — only the surrounding page changed.
- Aesthetic: warm cream (`--bg: #f5f2ec`) on dark ink (`--ink: #2a1f10`). Script font for names/headings, serif for countdown numerals, sans for labels. No emoji-as-decoration.
- **Fonts:** "Marck Script" (Google Fonts) is a **temporary stand-in** for "Billion Miracles" (Mäns Greback's commercial font). When the license is acquired, drop the `.woff2` in, wire it via `@font-face`, and prepend it to `--font-script`. Until then the free Marck Script + `Sacramento`/`Allura` fallbacks carry the script look.

## Gotchas / non-obvious decisions

- **CORS:** Apps Script web apps do not handle CORS preflight cleanly. The fix: POST with `Content-Type: text/plain` (which is a "simple request" and skips preflight). Send `JSON.stringify(payload)` as the body — Apps Script reads it from `e.postData.contents` regardless. **Do not** set `Content-Type: application/json`. **Do not** use FormData. Plain text body, JSON inside.
- **Base64 prefix:** `FileReader.readAsDataURL` returns `data:image/jpeg;base64,xxxx`. Strip the `data:...;base64,` prefix before sending — Apps Script wants raw base64.
- **Apps Script deploy access:** Must be deployed as "Execute as: me" + "Who has access: Anyone". Anything else and anonymous guests can't post.
- **Apps Script URL changes on every new deploy version.** When updating the script, use "Manage deployments" → edit the existing deployment → new version. Otherwise the frontend URL goes stale.
- **Drive quota:** Files are written to the couple's personal Drive (15 GB free tier). Phone photos run 3–5 MB each → ~3000–5000 photos before hitting the cap. Fine for one wedding. No compression in v1.
- **No retries on the client.** If a POST fails, show the error and let the guest tap `+` again. Adding retry logic is out of scope.

## Conventions

- **Indentation:** 2 spaces, everywhere.
- **Strings:** double quotes in JS, double quotes in HTML attrs.
- **No semicolons skipped.** Semicolons everywhere in JS.
- **CSS:** custom properties for colors at `:root`. No CSS frameworks, no preprocessors.
- **JS:** vanilla, modern (`async`/`await`, `const`/`let`, arrow functions). Target evergreen mobile browsers — no transpilation, no polyfills.
- **No console.log left in shipped code.** Use it during dev, remove before tagging a milestone.
- **Comments in English.** UI strings in Turkish.

## Git discipline

This is a portfolio piece. Tag milestones.

- `git init` on first commit
- Commit per phase, message format: `faz N: <one-line summary>`
- Tag at end of each phase: `v0.1-apps-script`, `v0.2-frontend`, `v0.3-wired`, `v1.0-deployed`
- Remote: GitHub, public repo `dugun-foto`

## Phases (sequential, do not parallelize)

### Faz 1 — Apps Script backend
- Write `apps-script/Code.gs` with `doPost` per the spec above.
- Add a `apps-script/README.md` (or section in main README) with manual deploy steps: create Apps Script project → paste code → set `FOLDER_ID` → deploy as web app → copy URL.
- Test manually with `curl` (sample command in README).
- Commit + tag `v0.1-apps-script`.

### Faz 2 — Frontend
- Build `index.html`, `style.css`, `app.js` per the frontend behavior section.
- `APPS_SCRIPT_URL` stays as the placeholder for now.
- Should be openable as `file://` and visually complete (the upload will fail without the URL — that's expected).
- Commit + tag `v0.2-frontend`.

### Faz 3 — Wire
- **Decision:** `APPS_SCRIPT_URL` is committed directly. It is not a secret — the Apps Script web app is deployed with "Anyone" access (anonymous POST is the whole point), and every guest scans the same QR pointing at the same URL. No `.env`, no `app.config.js`, no local override.
- Replace `APPS_SCRIPT_URL` in `app.js` with the real deployment URL.
- Update `COUPLE_NAMES` and `WEDDING_DATE` for the actual event.
- Test end-to-end from a real phone.
- Commit + tag `v0.3-wired`.

### Faz 4 — Deploy
- Push to GitHub.
- Connect Vercel, deploy.
- Test from a real phone over cellular (not just WiFi).
- Commit + tag `v1.0-deployed`.

### Faz 5 — QR
- Take the deployed URL.
- Generate QR (qr-code-generator.com or similar — out of scope for code).
- Print, place at venue. Project done.

## Anti-scope

Things that look helpful but are explicitly out of scope:

- ❌ Image compression / resizing on the client
- ❌ Progress bars per individual file (just `n/total` text is enough)
- ❌ Drag-and-drop (mobile target, doesn't matter)
- ❌ Authentication, rate limiting, abuse prevention
- ❌ Database / Supabase / any metadata storage
- ❌ Gallery view / "see other uploads" page
- ❌ Captions, names, comments on photos
- ❌ Multi-event support
- ❌ Internationalization (Turkish only, hardcoded)
- ❌ Tests
- ❌ TypeScript

If you find yourself reaching for any of the above, stop and re-read this file.
