/* ==========================================================================
   COLOUR CYCLE — shared by the cursor dot, the header logo + nav links, the
   nav dot and the homepage's rotating word. 3s per colour.

   Palette: the most vibrant colours in the site's own project images —
   for each hue, the most saturated colour that covers real area (not stray
   specks), measured from every image on project-1..6 — in colour-wheel
   order so each blends into a neighbour:
       raspberry → coral → amber → yellow → lime → teal → blue → cobalt
       → orchid → pink → (raspberry)
   Each colour holds briefly, then blends to the next in OKLCH, the short way
   round the wheel and at full colourfulness — so no muddy midpoints.

   Legibility: each moment's colour keeps its hue and chroma but has its
   lightness nudged, only as far as needed, to clear WCAG contrast against
   the page: 3:1 for the cursor (a graphic) and, in light theme, for the
   text too — it's all large text (header, rotating word, Scatter), where AA
   asks 3:1. Dark theme text keeps 4.5:1. Aimed a touch higher, since
   rounding to hex can shave it.
   Light theme darkens the bright ones most (yellow, amber, lime); dark
   theme lightens the deep ones (raspberry, cobalt, teal).

   • Text: sets --cycle-text on .site-header, .hero-rotator and .scatter-stage, 20x a second
     (style.css paints them with it).
   • Cursor: the dot is the real system cursor (and, over anything marked
     data-cross-cursor, a matching magnifying glass), so the OS draws it and it
     never lags. 10x a second this draws a fresh 11px dot (a 2x SVG, crisp on
     Retina) and puts it in --dot-cursor on <body>, which style.css uses for
     `cursor`. Only where site.js set body.has-cursor (not play/).

   Loaded by every page, including play/ (which doesn't load site.js). The
   cycle runs continuously across pages (see `start`).
   Reduced motion: does nothing — plain text colour, normal arrow.
   ========================================================================== */
(function () {
  "use strict";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var PALETTE = [
    "#ca4566",   // raspberry — Type Guide (its #da2761, toned down ~20% in chroma)
    "#ff5951",   // coral red — True Root
    "#fca441",   // amber     — 50 Years of Graphic Design
    "#edc030",   // yellow    — Type Guide
    "#8ec303",   // lime      — True Root
    "#2f9485",   // teal      — Type Guide
    "#387eba",   // blue      — The Mantodea Institute
    "#405fb0",   // cobalt    — 50 Years of Graphic Design
    "#cb8cc0",   // orchid    — Merlefest '25 Poster
    "#e3749b"    // pink      — Type Guide
  ];
  // Light theme leaves yellow and amber out: on the near-white page they
  // can't stay bright and still read (they go mustard), so the cycle skips
  // them there — coral blends straight into lime. Dark theme keeps all ten.
  var SKIP_LIGHT = ["#fca441", "#edc030"];
  var HOLD = 0.35;      // share of each step spent resting on the colour
  var BG = { light: "#f2f3f4", dark: "#1b1b1b" };   // --paper in each theme

  // One clock for the whole visit, not per page: the first page records
  // when the cycle began (sessionStorage — per tab, cleared when it closes),
  // and every page reads the colour from that, so moving between pages
  // carries on where the cycle was instead of starting over at the first
  // colour. Wall-clock time (Date.now), since performance.now() restarts at
  // zero on each page.
  var STORE = "cycleStart";
  var start = Date.now();
  try {
    var saved = parseInt(sessionStorage.getItem(STORE), 10);
    if (saved > 0 && saved <= start) start = saved;
    else sessionStorage.setItem(STORE, String(start));
  } catch (e) {}
  var root = document.documentElement;
  var header = document.querySelector(".site-header");
  var rotator = document.querySelector(".hero-rotator");   // homepage rotating word
  var scatter = document.querySelector(".scatter-stage");  // footer game
  var body = document.body;

  /* ---- colour maths: sRGB <-> OKLCH, WCAG contrast ---- */
  function toLin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function fromLin(v) { v = Math.min(1, Math.max(0, v)); return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055); }
  function hexLin(h) { return [1, 3, 5].map(function (i) { return toLin(parseInt(h.substr(i, 2), 16)); }); }

  function linToOklch(c) {
    var l = Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]);
    var m = Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]);
    var s = Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]);
    var L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
    var a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
    var b = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
    return [L, Math.sqrt(a * a + b * b), (Math.atan2(b, a) * 180 / Math.PI + 360) % 360];
  }
  function oklchLin(L, C, h) {
    var a = C * Math.cos(h * Math.PI / 180), b = C * Math.sin(h * Math.PI / 180);
    var l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
    var m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
    var s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    ];
  }
  // OKLCH -> linear sRGB, reducing chroma until it fits (like the browser does)
  function inGamut(v) { return v.every(function (x) { return x >= -0.0001 && x <= 1.0001; }); }
  function mapped(L, C, h) {
    var lin = oklchLin(L, C, h);
    if (inGamut(lin)) return lin;
    var lo = 0, hi = C;
    for (var i = 0; i < 14; i++) { var mid = (lo + hi) / 2; if (inGamut(oklchLin(L, mid, h))) lo = mid; else hi = mid; }
    return oklchLin(L, lo, h);
  }
  function lum(lin) { return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]; }
  function contrast(y1, y2) { return (Math.max(y1, y2) + 0.05) / (Math.min(y1, y2) + 0.05); }
  function hex(lin) {
    return "#" + lin.map(function (v) { return ("0" + Math.round(fromLin(v)).toString(16)).slice(-2); }).join("");
  }

  // A page can name its own palette on <body data-cycle="#hex #hex ...">
  // (project pages use their project's colours; one colour holds still).
  // Pages without one use the site palette above.
  var own = (body.getAttribute("data-cycle") || "").match(/#[0-9a-fA-F]{6}/g);
  var STOPS_ALL, STOPS_LIGHT;
  if (own && own.length) {
    STOPS_ALL = STOPS_LIGHT = own.map(function (h) { return linToOklch(hexLin(h)); });
  } else {
    STOPS_ALL = PALETTE.map(function (h) { return linToOklch(hexLin(h)); });
    STOPS_LIGHT = PALETTE.filter(function (h) { return SKIP_LIGHT.indexOf(h) < 0; })
                         .map(function (h) { return linToOklch(hexLin(h)); });
  }
  var BG_Y = { light: lum(hexLin(BG.light)), dark: lum(hexLin(BG.dark)) };

  // The colour at this moment, before any contrast nudge.
  // Each theme runs its own list, 3s per colour.
  function cycleColour(now, theme) {
    var STOPS = theme === "light" ? STOPS_LIGHT : STOPS_ALL;
    var PERIOD = STOPS.length * 3000;   // ms per full cycle
    var p = ((now - start) % PERIOD) / PERIOD * STOPS.length;
    var i = Math.floor(p), f = p - i;
    var a = STOPS[i], b = STOPS[(i + 1) % STOPS.length];
    var dh = ((b[2] - a[2] + 540) % 360) - 180;   // short way round the wheel
    // Rest on the colour, then an eased blend to the next. A big hue jump
    // (light theme's coral -> lime, with amber + yellow left out) would pass
    // through mustard on the way, so that blend is kept quick (~0.45s).
    var hold = Math.abs(dh) > 70 ? 0.85 : HOLD;
    f = f < hold ? 0 : (f - hold) / (1 - hold);
    f = f * f * (3 - 2 * f);
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, (a[2] + dh * f + 360) % 360];
  }

  // Keep hue + chroma; move lightness away from the page just far enough.
  function legible(c, theme, target) {
    var bgY = BG_Y[theme];
    if (contrast(lum(mapped(c[0], c[1], c[2])), bgY) >= target) return mapped(c[0], c[1], c[2]);
    var lo, hi;
    if (theme === "light") { lo = 0; hi = c[0]; }    // darken: find the lightest L that passes
    else { lo = c[0]; hi = 1; }                       // lighten: find the darkest L that passes
    for (var i = 0; i < 16; i++) {
      var mid = (lo + hi) / 2, ok = contrast(lum(mapped(mid, c[1], c[2])), bgY) >= target;
      if (theme === "light") { if (ok) lo = mid; else hi = mid; }
      else { if (ok) hi = mid; else lo = mid; }
    }
    return mapped(theme === "light" ? lo : hi, c[1], c[2]);
  }

  // The dot: exactly as it has always worked. A fresh dot in the current
  // colour on <body> (--dot-cursor) every other tick, nothing else.
  function svgUrl(svg) { return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'; }
  function setCursor(fill) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">' +
              '<circle cx="12" cy="12" r="11" fill="' + fill + '"/></svg>';
    // 24px image at 2x = a 12px box with an 11px dot; hotspot at its centre.
    body.style.setProperty("--dot-cursor", "-webkit-image-set(" + svgUrl(svg) + " 2x) 6 6, auto");
    if (crossEl) setCross(crossEl, fill);
  }

  // The zoom cursor (things you click to enlarge, marked data-cross-cursor): only
  // ever set on the one element under the pointer, and only while it's
  // there. Updating a second cursor value on <body> for the whole page as
  // well as the dot made Chrome on macOS keep dropping back to the system
  // arrow, so the page-wide update stays the dot alone.
  var crossEl = null, lastFill = "";
  function setCross(el, fill) {
    // A magnifying glass with a plus in the lens (Nick's icon): 48px at 2x
    // = 24pt, short handle, hotspot at the centre of the lens.
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">' +
              '<g fill="none" stroke="' + fill + '" stroke-width="4.4">' +
              '<circle cx="20" cy="20" r="14"/>' +
              '<path d="M20 12.4v15.2M12.4 20h15.2"/>' +
              '<path d="M30.2 30.2L38.5 38.5" stroke-linecap="butt"/></g></svg>';
    el.style.setProperty("--cross-cursor", "-webkit-image-set(" + svgUrl(svg) + " 2x) 10 10, zoom-in");
  }
  document.addEventListener("pointerover", function (e) {
    var el = e.target.closest && e.target.closest("[data-cross-cursor]");
    if (el === crossEl) return;
    crossEl = el;
    if (el && lastFill) setCross(el, lastFill);
  });

  var ticks = 0;
  function tick() {
    var now = Date.now();
    var theme = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    var c = cycleColour(now, theme);
    // Everything painted with this is large text (the dotted name, the nav at
    // 25.6px, the headline word, Scatter's word), where WCAG AA asks 3:1, not
    // 4.5:1. Light theme uses that, so the bright colours aren't darkened to
    // olive; dark theme keeps 4.5:1 (it already looked right there).
    var text = hex(legible(c, theme, theme === "light" ? 3.1 : 4.6));
    if (header) header.style.setProperty("--cycle-text", text);
    if (rotator) rotator.style.setProperty("--cycle-text", text);
    if (scatter) scatter.style.setProperty("--cycle-text", text);
    if (ticks % 2 === 0 && body.classList.contains("has-cursor")) {
      lastFill = hex(legible(c, theme, 3.1));
      setCursor(lastFill);
    }
    if (ticks % 2 === 0) setFavicon(hex(mapped(c[0], c[1], c[2])));   // 10x a second
    ticks++;
  }

  // The tab icon (the 17-dot mark) takes the same colour, 10 times a
  // second and only when it changes. The static SVG in each page's <head>
  // stays as the fallback (no JS, reduced motion).
  var favLink = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
  var favPng = document.querySelector('link[rel="icon"][type="image/png"]');
  var lastFav = "";
  var DOTS = [[10,10],[50,10],[90,10],[30,30],[50,30],[70,30],[10,50],[30,50],[50,50],[70,50],[90,50],[30,70],[50,70],[70,70],[10,90],[50,90],[90,90]]
    .map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="8"/>'; }).join("");
  function setFavicon(fill) {
    if (!favLink || fill === lastFav) return;
    lastFav = fill;
    favLink.href = "data:image/svg+xml," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="' + fill + '">' + DOTS + "</g></svg>");
    if (favPng) favPng.remove(), favPng = null;   // so the browser doesn't prefer the static PNG
  }
  tick();
  setInterval(tick, 50);
})();
