# Nick Capelle Portfolio — orientation for Claude

Plain HTML/CSS/JS portfolio site. No build step, no framework, no
dependencies. Full file map, editing instructions, and the "what's next"
backlog live in **README.md** — read that first, this file is just the
fast-orientation supplement.

## Quick facts
- Git repo, clean history, detailed commit messages — `git log` is a
  reliable record of *why* things are the way they are, not just *what*.
- Owner: Nick Capelle (capelledesign@gmail.com), based in Boone, NC.
  Intended domain: capellenick.com (not yet deployed).
- Local preview: `python3 serve.py` from this folder (a no-cache
  http.server, so a plain refresh always shows the latest files), or the
  `portfolio` entry in `.claude/launch.json`. **Not running by default** at
  the start of a session — start it before trying to view anything.

## Conventions to preserve
- **No build step.** Every page is a complete, real `.html` file — no
  templating, no includes at request time.
- **Cache-busting.** `css/style.css` and `js/site.js` load as `?v=N` on
  every page (including `play/index.html`, which loads `../css/style.css`). Bump `N` by one, in **every** HTML file, after any CSS/JS
  edit, or browsers will happily keep serving the old one.
- **Header/footer are duplicated**, not shared, across every page — the
  tradeoff of no build step. `partials/header.html` and
  `partials/footer.html` are the canonical source: edit there first, then
  propagate to index.html, about.html, playground.html, project-1..6.html,
  and play/index.html (the synth / Play page: same header, but its links use
  `../`, PLAY carries aria-current, and it has its own small inline copy of
  the theme-switch JS because it doesn't load site.js; in light mode only the
  page around the synth goes light — the device stays dark) (project pages use a slimmer `.project-foot`, not the
  full footer). A short Python find/replace script propagating the exact
  block to all full-footer pages at once is the fastest way — see recent
  `git log` messages for the pattern used repeatedly.
- **Fonts:** Neue Haas Grotesk Display Pro 55 Roman (nav, in sentence
  case; `--font-label`) and 65 Medium (home hero/bio line, `--font-hero`) + Balto
  (everything else), all from the Adobe Fonts/Typekit kit linked in every
  `<head>`.

## Working in the Claude Browser pane (if using it)
- The preview server is a background process tied to the session — start
  it fresh each session before checking anything visually.
- The pane doesn't render while hidden/backgrounded, so a screenshot taken
  right after a background action can come back blank or stale. Front the
  tab first, and when in doubt, verify via computed styles / DOM state
  (`javascript_exec`) rather than trusting a screenshot alone.
- Verify a change actually landed by checking the loaded `?v=` number, not
  just by eyeballing the page — aggressive static-asset caching has bitten
  this project more than once.

## Where "what's next" lives
`README.md` → **Later (Phase 2)**. Keep it current as things ship or new
ideas come up — it's the project's real backlog, not anything in a chat
transcript.
