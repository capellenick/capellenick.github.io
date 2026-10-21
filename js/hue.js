/* ==========================================================================
   HUE CLOCK — the colour cycle shared by the cursor dot, the header logo +
   nav links and the nav dot (one full trip round the colour wheel every 12s).

   • Header: sets --cursor-hue (a registered, inheriting custom property — see
     style.css) on .site-header 20x a second. (A CSS @keyframes animation of
     the property restyled and repainted every frame — 120/s on a ProMotion
     display — for a colour that only moves 30°/s.)
   • Cursor: the dot is the real system cursor, so the OS draws it and it
     never lags, whatever the browser's frame rate. 10x a second this draws a
     fresh 11px dot in the current hue (as a 2x SVG, crisp on Retina) and puts
     it in --dot-cursor on <body>, which style.css uses for `cursor`. Only on
     pages where site.js set body.has-cursor (not play/, whose controls use
     functional cursors).

   Loaded by every page, including play/ (which doesn't load site.js).
   Reduced motion: does nothing — plain text colour, normal arrow.
   ========================================================================== */
(function () {
  "use strict";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var PERIOD = 12000;   // ms per full cycle
  var start = performance.now();
  var root = document.documentElement;
  var header = document.querySelector(".site-header");
  var body = document.body;
  var ticks = 0;

  // OKLCH -> sRGB hex, reducing chroma until the colour fits in sRGB (same
  // idea as the browser's own gamut mapping), so the dot matches the header.
  function oklchHex(L, C, h) {
    function rgb(c) {
      var a = c * Math.cos(h * Math.PI / 180), b = c * Math.sin(h * Math.PI / 180);
      var l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
      var m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
      var s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
      return [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
      ];
    }
    function inGamut(v) { return v.every(function (x) { return x >= -0.0001 && x <= 1.0001; }); }
    var lin = rgb(C);
    if (!inGamut(lin)) {
      var lo = 0, hi = C;
      for (var i = 0; i < 16; i++) { var mid = (lo + hi) / 2; if (inGamut(rgb(mid))) lo = mid; else hi = mid; }
      lin = rgb(lo);
    }
    return "#" + lin.map(function (x) {
      x = Math.min(1, Math.max(0, x));
      x = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
      return ("0" + Math.round(x * 255).toString(16)).slice(-2);
    }).join("");
  }

  // Lightness per theme, chosen so every hue clears WCAG 3:1 against the
  // page: light theme min 3.3:1 at L 0.60, dark theme min 6.4:1 at L 0.72.
  function setCursor(hue) {
    var L = root.getAttribute("data-theme") === "dark" ? 0.72 : 0.60;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">' +
              '<circle cx="12" cy="12" r="11" fill="' + oklchHex(L, 0.17, hue) + '"/></svg>';
    var url = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
    // 24px image at 2x = a 12px box with an 11px dot; hotspot at its centre.
    body.style.setProperty("--dot-cursor", "-webkit-image-set(" + url + " 2x) 6 6, auto");
  }

  function tick() {
    var hue = ((performance.now() - start) / PERIOD) * 360 % 360;
    if (header) header.style.setProperty("--cursor-hue", hue.toFixed(1));
    if (ticks++ % 2 === 0 && body.classList.contains("has-cursor")) setCursor(Math.round(hue));
  }
  tick();
  setInterval(tick, 50);
})();
