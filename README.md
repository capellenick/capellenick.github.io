# Nick Capelle — Portfolio

Plain HTML / CSS / JS. No build step, no dependencies, no framework.
Every page is a real `.html` file you can open and edit.

---

## Preview it locally

Any of these work. The site needs to be served over `http://` (not opened as a
`file://`) so the Adobe Fonts stylesheet loads.

```bash
# from inside this folder
python3 serve.py          # no-cache server; plain refresh shows latest
python3 serve.py --lan    # also reachable from a phone on the same Wi-Fi
```

By default only this computer can open it, so it's fine to leave running on
shared Wi-Fi. `--lan` opens the whole folder (.git included) to the network —
use it briefly, then stop it.

Then open <http://localhost:4599>. (Node users: `npx serve` also works.)

**If a change doesn't seem to show up:** browsers cache `css/style.css` and
`js/site.js` aggressively. Every page loads them with a `?v=N` query string
specifically so this doesn't bite you — after any CSS or JS edit, bump that
`N` up by one in **every** HTML file (find-and-replace, e.g. `v=12` →
`v=13`, across the project) and the new version is guaranteed to load. A
plain refresh without bumping it can still show the old file; a hard
refresh (⌘⇧R) forces a fresh load either way.

---

## Files

```
index.html          Home — 2x4.org-style hero + 2-col work grid (no filters)
about.html          About — one screen: photo stage + four numbered story columns
playground.html     Playground — grid of experiments (Phase-2 mind-map goes here)
rally.html          Rally product case study (custom long-scroll page, its own
                    css/rally.css + js/rally.js): personal origin story, research,
                    scope narrowing, "My process" row (sketchbook spreads aligned +
                    colour-matched, whiteboard, site map, Figma drafts; click to
                    enlarge in a lightbox), "How Rally works" (3D phone, steps change
                    one whole step at a time, click a step to jump to it), design
                    decisions row (cut-out UI on blurred court photos), business
                    model + five forces, verdict. Links to the live prototype at
                    capellenick.github.io/rally (deployed from ~/Sites/rally with
                    its deploy.sh). The phone in the hero and "How Rally works" is
                    always the 3D one, js/rally-3d.js (three.js from jsDelivr via
                    an importmap, loaded right away). Until it draws, and if
                    WebGL fails, each spot shows a still render of the same model
                    in the same pose (assets/projects/rally/phone3d-*.webp; re-
                    render from rally.html?still, see the top of rally-3d.js).
                    Model: MajdyModels' iPhone 16 Pro Max, CC BY 4.0, recoloured
                    to black titanium (assets/projects/rally/iphone/, credited at
                    the bottom of rally.html)
project-1..6.html   Case studies — split-screen: copy left, images right.
                    1 GD50 posters · 2 True Root · 3 Blackbox · 4 Type Guide ·
                    5 Mantodea Institute · 6 Merlefest '25 (next links loop 1→6→1)
css/style.css       All styles. Design tokens are at the very top.
js/site.js          Theme toggle, mobile nav, cursor, reveals, the footer sky
                    (gradient/clouds/stars/birds/plane/sun-moon), the frog
                    easter egg, and the Boone weather fetch
js/hue.js           12s colour cycle for the header text + the native dot cursor
js/nav-dot.js       Dot under the current nav link; swoops between PLAY/ABOUT
js/footer-modes.js  Footer pills (Cotton-style): Sky / Ripples / Chladni /
                    shuffle; remembered across pages. Ripples + Chladni are
                    "games"; each tells it whether footer text goes dark/white
js/chladni.js       Chladni footer game: play/'s cymatics plate + sand, no
                    sound — clicks feed the plate the partials a key would
                    play (knobs fixed: defaults, ring fully up)
js/logo-dots.js     The header name as dots (traced from Nick's dotted alphabet);
                    they scatter with the cursor's distance from the name
js/scatter.js       Scatter footer game: glossary words in the dotted alphabet
                    (traced a-z in the file), scattering with the cursor;
                    on desktop, typing replaces the word live
js/about.js         About photo stage: cursor x picks which photo shows (hard cut,
                    each at its own fixed spot); phones get a swipe strip
js/warp.js          Homepage only: WebGL scroll-warp on the project images
                    (raggededge.com's bottom-edge flare) + smoothed wheel
                    scrolling so it stays steady; desktop only
assets/projects/    Real project images, one folder per project (web JPEGs,
                    2000px max). Copy came from the old capellenick.com site.
assets/             Favicon + remaining placeholder SVGs (About, Playground).
partials/           Canonical header + footer markup (see "No build step" below)
```

---

## The 3 things to do before launch

1. **Add your résumé.** Drop `resume.pdf` into `assets/` — it's linked from the
   About page's "Elsewhere" section and currently 404s.
2. **Replace placeholder text** in `about.html` (search `Placeholder` and the
   `&lt;angle brackets&gt;`). The four project pages are done.
3. **Replace placeholder images** on About (`portrait.svg`) and Playground
   (`ph-*` files). Project images are real as of 2026-10-20.

---

## Editing content

### Home page: hero + work grid
`index.html` is built like [2x4.org](https://2x4.org) — a massive statement
headline straight into a 2-column grid of project cards, nouvelleidee.work
spacing (16px grid gap). There used to be a Featured/Role/Year/Type/All
filter bar between them; it was removed — all cards just show. The
`data-featured` / `data-role` / `data-year` / `data-type` attributes are
still on each `.work-card` (inert leftovers, harmless to keep or strip) in
case you want filtering back later.

- **The headline** is the sentence from Phase 1 — edit it in `.hero-statement`.
  It's plain text at a huge size (Helvetica Bold now, not the site's Balto);
  there's no rotating-word-pairs mechanic.
- **Add a project to the grid:** copy one `<li class="work-card">` block, set
  its four `data-*` attributes, swap the image and caption, and point the link
  at a new `project-N.html`.

### Change a project write-up
Open `project-N.html`. The right-hand column has the case-study sections:
`Overview` · `The Problem` · `The Approach` · `The Outcome` · `Reflection`.
Rename or reorder those `<h2>`s freely.

### Add images to a project
In `project-N.html`, the left column is a stack of `<figure>` blocks. Copy one,
change the `src` and `<figcaption>`. It scrolls independently of the text.

**Use video instead of an image** anywhere:

```html
<figure>
  <video src="assets/my-clip.mp4" autoplay muted loop playsinline></video>
  <figcaption>01 — Prototype walkthrough</figcaption>
</figure>
```

(Muted + `playsinline` is what lets it autoplay on mobile. Keep clips short and
compressed — MP4/H.264 or WebM.)

### Add a 5th project
1. Duplicate `project-4.html` → `project-5.html`. Update the title, meta, copy,
   images, and the "Next project" link at the bottom.
2. In `index.html`, copy one `<li class="work-card">` block (see above) and
   point `href` at `project-5.html`.

### Change the nav, logo, or footer
These are copied into every page (the cost of "no build step"). Edit
`partials/header.html` / `partials/footer.html` **first** as your reference,
then paste the change into each `*.html` file. It's ~8 files; a find-and-replace
in your editor does it in one pass. Also keep the small `<script>` in each
`<head>` identical.

---

## Theme (light / dark)

Colours live in `css/style.css` under `:root` and `:root[data-theme="dark"]`:

```css
--paper: #f2f3f4;   /* light background       */
--ink:   #1b1b1b;   /* light text             */
```

The toggle in the header stores the choice in `localStorage`. First-time
visitors get their OS preference. A tiny inline script in each `<head>` applies
the theme before the page paints, so there's no flash.

---

## Fonts (Adobe Fonts / Typekit)

Loaded from your Web Project: `https://use.typekit.net/wsb8ckc.css`

| Where | Family (CSS name) | Weight in the kit |
|-------|-------------------|-------------------|
| "Nick Capelle" logo only | `freightbigcmp-pro` | 500 |
| Everything else | `balto` | 500 |

Both are wired through `--font-display` and `--font-sans` at the top of the CSS.

The kit currently ships **one weight (500)** of each. If you want:
- a lighter body (Cotton-style ~400) → add **Balto 400** to the Web Project
- real bold → add **Balto 700** and delete the `b, strong { font-weight: 500 }`
  rule in the CSS

They'll pick up automatically once they're in the kit.

> If you ever cancel Creative Cloud, the kit stops serving and the site falls
> back to system fonts. For a one-time license, buy the webfonts direct from the
> foundries.

---

## What the JavaScript does (all optional / progressive)

- **Circle cursor** — follows the mouse, grows over links, shows a label for
  anything with a `data-cursor="…"` attribute. Off on touch devices and when
  the OS "reduce motion" setting is on.
- **Theme toggle** (pill, sun/moon) and **mobile nav toggle**.
- **Header** — sticky, but fully transparent (no background/blur/border) so
  content scrolls directly underneath it, nouvelleidee.work-style.
- **Reveal on scroll** — elements with `data-reveal` fade up as they enter view.
  If JS fails, everything just shows normally (nothing stays hidden).
- **Garden footer (dormant)** — not used on any page; superseded by the sky
  band below. The ASCII-plant code in `site.js` still works — give any
  element `class="garden"` and it activates again.

### The footer sky (index/about/playground only — see `partials/footer.html`)
The whole footer is one full-bleed, full-viewport-height "sky band," driven
entirely by the visitor's own clock:

- **Color** is mostly flat (solid day blue, solid night navy) with a real
  top-to-bottom gradient forming only during the sunrise (~5-7am) and sunset
  (~5-7pm) windows. Keyframes + the interpolation logic are in `site.js`
  (`SKY_KEYFRAMES`) — hand-tune colors or the hour boundaries there.
- **Sun/moon** swap and travel left→right across their half of the day (sun
  6:30am→7pm, moon 7pm→6:30am), position updates instantly (no "drag" on
  load).
- **Clouds** — always visible, 5 instances, positioned via inline
  `left`/`top`/`width` on each `<svg class="cloud">` in the footer HTML.
- **Stars** — 10 instances, hidden 7am-6pm ("peak daylight"), visible
  dusk-through-dawn.
- **Birds** (6) + **a plane** (1) — daytime only, the inverse of stars. Birds
  fly at a lower altitude (top ~36-60%) than the plane (top ~8%); each is a
  looping `fly-across` CSS animation with its own duration/delay so they
  don't move in lockstep. Birds are two stacked frames (wingbeat up/down)
  that flip via a stepped `flap` animation for a real 2-frame flap, not a
  fade.
- **Frog easter egg** — click anywhere in the sky that isn't a real link and
  a pixel tree frog (traced from a reference photo — see the git log for
  how) spawns at the click point and free-falls off the bottom of the
  screen under gravity, tumbling a little, then removes itself. Skipped for
  `prefers-reduced-motion`.
- **Boone, NC weather** — the one part of the site that calls the network.
  Fetches current conditions for a fixed location (Boone, NC — not the
  visitor's) from [Open-Meteo](https://open-meteo.com) (free, no API key)
  every 10 minutes, shown as its own line under the local-time clock. Fails
  silently to blank text if the request errors, so it can never break the
  page. To point it at a different city, change the `latitude`/`longitude`
  in `WEATHER_URL` in `site.js`.
- Not built (discussed, not requested yet): the sky's color/clouds don't
  react to the fetched weather condition (e.g. going grey when it's
  overcast) — currently the two systems are independent.

---

## Deploy (free static hosting)

Any of these host plain files for free, with HTTPS and a global CDN.

### Cloudflare Pages (recommended)
1. Push this folder to a GitHub repo, **or** use `npx wrangler pages deploy .`
2. In the Cloudflare dashboard: Pages → Create → connect the repo.
3. Build command: *none*. Output directory: `/` (the repo root).
4. Add your custom domain (`capellenick.com`) under the project's **Custom
   domains** tab; Cloudflare provisions the SSL cert.

### GitHub Pages
1. Push to a repo. Settings → Pages → Deploy from branch → `main` / root.
2. Add a `CNAME` file containing `capellenick.com`, and point your domain's DNS
   at GitHub Pages.

### Domain
Buy `capellenick.com` at **Cloudflare Registrar** (at-cost, ~$10/yr) or Porkbun.
Point its DNS at whichever host above.

---

## Later (Phase 2)

Structure is already in place for:
- **One-button spacebar game** — needs a spot now that the home page is the
  2x4-style hero + grid; the natural home is a dedicated state on the
  `.hero-statement` section (e.g. press Space to swap the sentence for a
  canvas), or its own area on Playground.
- **Pan/zoom mind-map** on the Playground page (replace `.playground-grid`).
- **Scroll-warp on project-page images** — js/warp.js does the homepage
  cards; the same shader could cover the project pages' image column.
- **Spinning type wheel** in a page corner.
- **LED subpixel game** (requested 2026-11-17, after Rally): a footer game
  based on the "Strength in numbers" section of
  apple.com/macbook-pro/proled-xdr-display/ — a field of tiny red/green/blue
  subpixel dots behind the type that lights up around the cursor.
- **Weather-reactive sky** — tie the footer's colors/cloud density to the
  Boone weather fetch that already runs (e.g. more/darker clouds when
  overcast, a rain effect). Offered, not yet requested.
- **Real About/Playground content + résumé** — the four homepage projects are
  real now (GD50, True Root, Blackbox, Type Guide); About and Playground are
  still placeholders (see "The 3 things to do before launch").

None of these need a build step — they're extra `<script>` files.
