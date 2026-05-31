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
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/REPLACE_WITH_DEPLOYMENT_ID/exec";
const COUPLE_NAMES    = "Burak & Berna";
const WEDDING_DATE    = "11 Temmuz 2026";
```

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

- Mobile-first. Designed for ~375px width baseline.
- One screen, no routing.
- Header: couple name + date (from constants).
- A single large round `+` button center-screen. Tappable area minimum 200×200px.
- Tapping `+` opens the native file picker with `accept="image/*"` and `multiple`. **Do not** set the `capture` attribute — it forces the camera and hides the gallery option on iOS/Android. Without it, the native picker offers both "Photo Library" and "Take Photo".
- On selection: convert each file to base64, POST to `APPS_SCRIPT_URL` one by one, show progress as `n/total`.
- Success state: green checkmark, "Teşekkürler" message, auto-reset after ~2.5s.
- Failure state: red, retry option.
- Below the button: a strip of thumbnails of what was uploaded *this session only* (in-memory, no persistence).
- Aesthetic: warm, wedding-appropriate. Cream/gold palette. Serif headings. No emoji-as-decoration. Decorative dots/glows are OK if subtle.
- No name field, no captions, no login, no gallery view. The `+` button is the entire app.

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
