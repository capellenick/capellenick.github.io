/* ==========================================================================
   FOOTER MODES — a row of pills along the top of the footer switches what
   the footer is, after launch.cotton.design:

   • Sky      the pixel sky (site.js parts 8–9), clouds, sun/moon, frogs.
   • Ripples  a flat colour field with a medium circle in the middle (in
              place of Cotton's wordmark). Each click floods a new colour
              out from the cursor and the circle changes to match.
   • Chladni  the Play page's cymatics panel filling the footer, without the
              sound: each click "plays" a key and the sand finds a new figure
              in a new colour pair (js/chladni.js).
   • Scatter  a large word in the dotted alphabet, scattering with the cursor's
              distance like the header's name. Each click deals a new word
              (js/scatter.js).
   • Shuffle  jumps to a different mode at random.

   Ripples, Chladni and Scatter are "games". Each reports whether dark or white text
   reads better on what it's showing (FooterModes.setInk), and the footer
   text and header follow whichever game is up.

   The choice is remembered across pages (localStorage, best effort).
   Ripple colours come from Ryan Carl's Grid Folds print (see PALETTE), in
   either theme; the footer and header text flip between dark and white to
   suit each field.

   Loaded by every page with the full footer (index, about, playground),
   before the game files.
   ========================================================================== */
(function () {
  "use strict";

  var band = document.querySelector(".sky-band");
  var bar = band && band.querySelector(".footer-modes");
  var stage = band && band.querySelector(".ripple-stage");
  if (!bar || !stage) return;

  var header = document.querySelector(".site-header");
  var circle = stage.querySelector(".ripple-circle");
  var pills = bar.querySelectorAll("[data-mode]");
  // Sky is archived for now: its pill is `hidden` in the markup and it's left
  // out here, so nothing (saved choice, shuffle) can land on it. Its code in
  // site.js still runs. To bring it back, add "sky" first and unhide the pill.
  var MODES = ["ripples", "chladni", "scatter"];
  var inks = {};   // game -> "dark" | "light"
  var STORE = "footerMode";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setMode(mode) {
    band.setAttribute("data-footer-mode", mode);
    pills.forEach(function (p) {
      p.setAttribute("aria-pressed", p.getAttribute("data-mode") === mode ? "true" : "false");
    });
    applyInk();
    try { localStorage.setItem(STORE, mode); } catch (e) {}
  }

  function applyInk() {
    var mode = band.getAttribute("data-footer-mode");
    var game = mode !== "sky";
    band.setAttribute("data-game-ink", inks[mode] || "dark");
    if (header) {
      header.classList.toggle("is-game", game);
      header.classList.toggle("is-game-light", game && inks[mode] === "light");
    }
  }
  // For the games: FooterModes.setInk("chladni", "light").
  window.FooterModes = {
    setInk: function (mode, ink) { inks[mode] = ink; applyInk(); }
  };

  var saved = null;
  try { saved = localStorage.getItem(STORE); } catch (e) {}
  setMode(MODES.indexOf(saved) >= 0 ? saved : MODES[0]);
  // Fades only from here on: the first game appears without rising out of
  // the sky (style.css, .modes-live).
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { band.classList.add("modes-live"); });
  });

  // ↑ circle: on the homepage, glide back to the top instead of reloading.
  var home = bar.querySelector(".mode-home");
  if (home) home.addEventListener("click", function (e) {
    if (new URL(home.href).pathname.replace(/index\.html$/, "") !== location.pathname.replace(/index\.html$/, "")) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });

  bar.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    if (btn.hasAttribute("data-mode")) {
      setMode(btn.getAttribute("data-mode"));
    } else if (btn.classList.contains("mode-shuffle")) {
      var others = MODES.filter(function (m) { return m !== band.getAttribute("data-footer-mode"); });
      setMode(others[Math.floor(Math.random() * others.length)]);
    }
  });

  // ---- Ripples ------------------------------------------------------------
  // Palette from Ryan Carl's "Grid Folds (color)" print
  // (ryancarl.studio/grid-folds): the twelve inks of its 12-square grid plus
  // the paper and the sage fold, sampled from the scan. Each click picks a
  // new field and a circle that stands out against it.
  var PALETTE = [
    "#5f1621", "#0c794f", "#0a2f91",   // maroon, green, cobalt
    "#db831d", "#c74669", "#cc221a",   // orange, pink, red
    "#0c2454", "#a11a15", "#3976c2",   // navy, brick, sky blue
    "#1c2e3e", "#d67741", "#5d1d1c",   // slate, peach, oxblood
    "#dddad2", "#b2bc9d"               // paper, sage
  ];
  var INK = [20, 22, 30];   // the footer's dark text colour

  function luminance(hex) {
    var c = [1, 3, 5].map(function (i) {
      var v = parseInt(hex.substr(i, 2), 16) / 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(a, b) {
    var x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  var current = { bg: "#dddad2", fg: "#cc221a" };   // start like the print: red on paper
  function pair() {
    var bg = pick(PALETTE.filter(function (c) { return c !== current.bg; }));
    // A circle that clearly separates from the field (falls back to the
    // best available if none clears the bar).
    var options = PALETTE.filter(function (c) { return c !== bg && contrast(c, bg) >= 2; });
    var fg = options.length ? pick(options) : PALETTE.slice().sort(function (a, b) {
      return contrast(b, bg) - contrast(a, bg);
    })[0];
    return { bg: bg, fg: fg };
  }
  // Footer + header text: dark or white, whichever reads better on the field.
  function ink(bg) {
    var dark = "#" + INK.map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join("");
    return contrast(bg, dark) >= contrast(bg, "#ffffff") ? "dark" : "light";
  }
  function setField(bg) {
    stage.style.setProperty("--rip-bg", bg);
    window.FooterModes.setInk("ripples", ink(bg));
  }
  setField(current.bg);
  stage.style.setProperty("--rip-fg", current.fg);

  stage.addEventListener("click", function (e) {
    // The circle changes colour straight away (CSS eases it); the field only
    // takes the new colour once the flood has covered it, so quick repeat
    // clicks stack ripples cleanly.
    var p = pair();
    current = p;
    stage.style.setProperty("--rip-fg", p.fg);
    if (reduceMotion) { setField(p.bg); return; }

    var box = stage.getBoundingClientRect();
    var x = e.clientX - box.left, y = e.clientY - box.top;
    // Radius that reaches the farthest corner, so the flood covers it all.
    var r = Math.hypot(Math.max(x, box.width - x), Math.max(y, box.height - y));
    var ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.cssText = "left:" + (x - r) + "px;top:" + (y - r) + "px;width:" + (r * 2) +
                           "px;height:" + (r * 2) + "px;background:" + p.bg;
    stage.insertBefore(ripple, circle);
    ripple.animate(
      [{ transform: "scale(0)" }, { transform: "scale(1)" }],
      { duration: 1800, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
    ).onfinish = function () {
      setField(p.bg);
      ripple.remove();
    };
  });
})();
