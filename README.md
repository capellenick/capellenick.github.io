# Nick Capelle — Portfolio

Plain HTML / CSS / JS. No build step, no dependencies, no framework.
Every page is a real `.html` file you can open and edit.

---

## Preview it locally

Any of these work. The site needs to be served over `http://` (not opened as a
`file://`) so the Adobe Fonts stylesheet loads.

```bash
# from inside this folder
python3 -m http.server 4599
```

Then open <http://localhost:4599>. (Node users: `npx serve` also works.)

---

## Files

```
index.html          Home — 2x4.org-style hero + filter tabs + 2-col work grid
about.html          About — portrait, bio, experience
playground.html     Playground — grid of experiments (Phase-2 mind-map goes here)
project-1..4.html   Case studies — split-screen: images left, copy right
css/style.css       All styles. Design tokens are at the very top.
js/site.js          Theme toggle, mobile nav, cursor, filters, clock, reveals
assets/             Placeholder SVGs + favicon. Replace with real media.
partials/           Canonical header + footer markup (see "No build step" below)
```

---

## The 3 things to do before launch

1. **Add your résumé.** Drop `resume.pdf` into `assets/` — it's linked from the
   About page's "Elsewhere" section and currently 404s.
2. **Replace placeholder text.** Search the project files for `Placeholder` and
   the `&lt;angle brackets&gt;` in `about.html`.
3. **Replace placeholder images.** Everything in `assets/` starting with `ph-`
   and `portrait.svg`. Keep the filenames or update the `src` attributes.

---

## Editing content

### Home page: hero, filter tabs, work grid
`index.html` is built like [2x4.org](https://2x4.org) — a massive statement
headline, a filter-tab bar (`Featured` / `Role` / `Year` / `Type` / `All`), and
a 2-column grid of project cards.

- **The headline** is the sentence from Phase 1 — edit it in `.hero-statement`.
  It's plain text at a huge size; there's no rotating-word-pairs mechanic.
- **Filter tabs are functional.** Each `.work-card` carries
  `data-featured` / `data-role` / `data-year` / `data-type`. Clicking `Role`,
  `Year`, or `Type` opens a flyout listing whatever values are hard-coded into
  that tab's `.filter-menu` in the HTML — add a `<button data-value="…">` there
  if you introduce a new value. `Featured` and `All` filter directly.
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
- **Theme toggle** and **mobile nav toggle**.
- **Work filters** — the Featured / Role / Year / Type / All tabs on the home
  page (see "Home page" above).
- **Footer clock** — `#local-time` ticks the visitor's own local time every
  second.
- **Reveal on scroll** — elements with `data-reveal` fade up as they enter view.
  If JS fails, everything just shows normally (nothing stays hidden).
- **Garden footer (dormant)** — not used on any page right now; the footer was
  rebuilt nouvelleidee.work-style (a huge "Think Different." wordmark over a
  slim utility row). The ASCII-plant code in `site.js` still works — give any
  element `class="garden"` and it activates again. Good candidate for an
  Easter egg on the About page later.

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
- **Scroll-warp imagery** (WebGL) on project heroes.
- **Spinning type wheel** in a page corner.

None of these need a build step — they're extra `<script>` files.
