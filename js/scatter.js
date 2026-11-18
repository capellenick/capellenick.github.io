/* ==========================================================================
   SCATTER — footer game. A word in Nick's dotted alphabet, large and centred,
   behaving like the header's dotted name (js/logo-dots.js): clean with the
   cursor on it, scattering and leaning toward the cursor as it moves away,
   reshuffling as the mouse moves, and reassembling after 10s of stillness.
   Each click deals the next word and the current dots flow into it. On desktop
   you can also just type: your own word (one, no spaces) appears live, with all of the above,
   and Backspace clears it.

   Letters: traced dot by dot from Nick's alphabet PNG, as [width, [x,y,…]] in
   that image's pixels, with y measured from the baseline.
   Words: single-word terms from Monotype's typographic glossary
   (monotype.com/resources/typographic-terms), no hyphens. a-z only: the
   alphabet has no other characters. Dealt from a shuffled deck, so all of
   them show before any repeats.

   Touch: no cursor, so scroll drives the scatter instead (see aimScroll);
   tapping the word itself changes it, and scrolling never does. Reduced motion: words swap instantly, no scatter. Only draws while it's the footer mode and on screen.
   Colour is the shared cycle (--cycle-text, set by hue.js).
   ========================================================================== */
(function () {
  "use strict";

  var band = document.querySelector(".sky-band");
  var stage = band && band.querySelector(".scatter-stage");
  var svg = stage && stage.querySelector("svg");
  if (!svg) return;

  var GLYPHS = {
    a: [117, [0,-25,8,-96,8,-3,9,-46,18,-116,30,-56,31,6,39,-124,52,-62,55,3,62,-125,74,-68,75,-8,84,-117,96,-98,96,-74,96,-28,96,-51,97,-4,117,6]],
    b: [108, [0,-141,0,-48,0,-117,0,-24,0,-164,0,-94,0,-71,0,-1,17,-15,21,-107,32,1,38,-122,53,6,61,-125,76,1,84,-118,94,-13,98,-101,104,-33,106,-79,108,-56]],
    c: [107, [0,-60,2,-84,4,-38,13,-104,15,-17,30,-120,32,-1,52,-126,54,5,76,-124,76,2,96,-114,97,-7,107,-94,107,-28]],
    d: [108, [0,-56,2,-79,4,-33,9,-101,14,-12,24,-118,32,2,47,-125,54,6,69,-122,76,1,86,-107,91,-15,108,-141,108,-117,108,-47,108,-24,108,-71,108,-1,108,-164,108,-94]],
    e: [114, [0,-63,3,-86,3,-41,10,-20,15,-107,23,-63,26,-2,35,-120,46,-63,46,6,58,-126,69,-63,69,5,81,-120,90,-4,92,-63,98,-105,106,-22,108,-85,114,-63]],
    f: [62, [0,-116,23,-140,23,-93,23,-70,23,-163,23,-47,23,-23,23,0,24,-116,39,-179,46,-117,62,-179]],
    g: [104, [0,-79,0,-56,6,-33,6,28,7,-100,20,-15,22,-116,23,44,40,-4,43,-125,46,48,62,-6,67,-124,69,48,84,-109,84,-16,91,40,103,20,104,-74,104,-4,104,-97,104,-50,104,-120,104,-27]],
    h: [94, [0,-116,0,-46,0,-186,0,-140,0,-70,0,-23,0,-93,0,0,0,-163,23,-116,43,-126,66,-126,86,-115,94,-93,94,-70,94,-46,94,-24,94,0]],
    i: [0, [0,-116,0,-70,0,-46,0,-171,0,-93,0,-23,0,0]],
    j: [32, [0,43,24,41,32,-171,32,20,32,-27,32,-120,32,-97,32,-74,32,-50,32,-4]],
    k: [89, [0,-164,0,-140,0,-94,0,-48,0,-1,0,-187,0,-117,0,-24,0,-71,22,-68,38,-84,51,-58,54,-99,63,-38,70,-116,76,-18,87,-131,89,1]],
    l: [0, [0,-116,0,-46,0,-186,0,-140,0,-23,0,-93,0,-70,0,0,0,-163]],
    m: [168, [0,-70,0,-23,0,-116,0,-93,0,-46,0,0,20,-105,33,-121,55,-126,75,-114,84,-93,84,-70,84,-46,84,-24,84,0,100,-112,117,-126,140,-126,160,-114,168,-93,168,-70,168,-46,168,-23,168,0]],
    n: [94, [0,-46,0,-116,0,-93,0,-70,0,-23,0,0,23,-116,43,-126,66,-126,86,-114,94,-70,94,-46,94,-23,94,0,94,-93]],
    o: [115, [0,-57,2,-79,3,-36,9,-99,13,-16,23,-115,30,-1,40,-124,52,5,58,-127,74,3,79,-123,94,-8,98,-111,109,-26,109,-93,114,-48,115,-71]],
    p: [108, [0,-94,0,-71,0,-1,0,-118,0,-48,0,-24,0,22,0,46,19,-11,20,-110,36,3,38,-123,60,5,61,-124,77,0,83,-118,95,-14,98,-101,104,-34,106,-80,108,-57]],
    q: [108, [0,-57,2,-80,3,-34,10,-101,13,-14,25,-118,30,0,47,-125,48,5,70,-124,72,3,88,-110,89,-11,108,-24,108,-118,108,-94,108,-71,108,-48,108,46,108,-1,108,22]],
    r: [43, [0,-71,0,-48,0,-24,0,-1,0,-118,0,-94,22,-111,43,-121]],
    s: [96, [0,-29,6,-91,10,-112,10,-9,19,-73,28,-126,29,2,41,-66,51,-126,51,5,63,-60,73,-119,73,2,85,-53,87,-102,90,-12,96,-33]],
    t: [55, [0,-116,23,-163,23,-140,23,-116,23,-93,23,-70,23,-46,24,-23,32,-2,46,-116,55,0]],
    u: [92, [0,-121,0,-98,0,-74,0,-51,0,-28,9,-7,30,3,53,2,72,-10,92,-70,92,-23,92,0,92,-116,92,-93,92,-46]],
    v: [85, [0,-106,7,-84,15,-62,21,-41,30,-20,42,0,55,-19,62,-41,70,-63,77,-84,85,-106]],
    w: [161, [0,-104,7,-83,14,-62,19,-41,26,-19,37,0,47,-20,54,-42,59,-63,65,-85,71,-106,88,-105,95,-84,102,-63,106,-42,114,-20,123,0,135,-19,141,-41,148,-63,154,-85,161,-106]],
    x: [104, [0,2,9,-122,13,-14,23,-103,25,-31,35,-84,37,-49,51,-66,64,-85,64,-49,76,-103,76,-31,90,-122,90,-14,104,2]],
    y: [103, [0,-121,10,-101,10,47,17,-80,25,-60,32,-39,32,44,41,-18,44,24,52,2,62,-17,71,-37,78,-58,86,-78,94,-100,103,-121]],
    z: [91, [0,-1,5,-124,10,-21,24,-1,24,-37,27,-124,37,-55,48,-1,49,-124,52,-71,64,-89,70,-1,70,-122,78,-108,79,-121,90,-122,91,-1]]
  };
  var WORDS = [
    "aperture", "apex", "arc", "ascender", "antiqua", "antikva", "axis",
    "stress", "baseline", "beak", "bowl", "bracket", "condensed", "counter",
    "crossbar", "cursive", "descender", "eye", "finial", "flag", "gadzook",
    "glyph", "grotesk", "hairline", "halbfett", "hinting", "hook", "italic",
    "joint", "juncture", "kerning", "leading", "linespacing", "ligature",
    "link", "loop", "lobe", "midline", "oblique", "slanted", "overshoot",
    "pica", "point", "pro", "rasterization", "roman", "serif", "spacing",
    "spine", "spur", "spurless", "stem", "swash", "tail", "taper", "terminal",
    "tittle", "tracking", "vertex", "weight"
  ];
  var FIRST = "scatter";              // what's up before the first click

  var R = 11.71;                       // dot radius, image pixels
  var GAP = 42;                        // between letters, image pixels (centre to centre)
  var ASCENT = 187, DESCENT = 48;      // the alphabet's extremes, for steady vertical centring
  var FIT_W = 0.7, FIT_H = 0.365;      // largest share of the footer a word can fill
  // In image pixels so a word scatters in proportion to its size, as the name does.
  var SPREAD_X = 121, SPREAD_Y = 70, LEAN = 121;
  var TAP_PAD = 16;                    // CSS px of forgiveness around the word for a tap
  var WAVE = 170;                      // CSS px of cursor travel per radian: lower reshuffles faster
  var EASE = 0.82;                     // share of the gap left after a 60fps frame
  var MORPH_MS = 800;                  // dots flowing into a new word
  var TYPE_MS = 280;                   // …and into a typed change, quick enough to keep up
  var MAX_TYPED = 28;                  // letters: past this a word gets too small to read
  var IDLE_MS = 10000, RETURN_MS = 2000;   // reassembling, as the name does

  var NS = "http://www.w3.org/2000/svg";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var interactive = finePointer && !reduceMotion;
  var scrollDriven = !finePointer && !reduceMotion;

  function freq() { return (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.9); }
  function newDot() {
    var el = document.createElementNS(NS, "circle");
    svg.appendChild(el);
    return {
      el: el, hx: 0, hy: 0, cx: 0, cy: 0, r: 0, fromX: 0, fromY: 0, fromR: 0, leaving: false,
      fxx: freq(), fxy: freq(), px: Math.random() * 6.283,
      fyx: freq(), fyy: freq(), py: Math.random() * 6.283,
      pull: 0.1 + Math.random() * 0.9
    };
  }

  /* ---- a word's dots, in image pixels with the baseline at y = 0 ---- */
  function wordPoints(word) {
    var pts = [], x = 0;
    word.split("").forEach(function (ch, i) {
      if (i) x += GAP;
      var g = GLYPHS[ch];
      for (var k = 0; k < g[1].length; k += 2) pts.push([x + g[1][k], g[1][k + 1]]);
      x += g[0];
    });
    return { pts: pts, width: x };
  }

  var dots = [], word = FIRST, w = 0, h = 0, scale = 1;
  var rect = { left: 0, top: 0, right: 0, bottom: 0 };   // the word, in stage px

  // Fit the current word and give each dot its home. Spare dots keep going to
  // a random letter's spot and are removed once they've arrived.
  function place() {
    var box = stage.getBoundingClientRect();
    w = box.width; h = box.height;
    if (!w || !h) return false;
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    var wp = wordPoints(word);
    var fullW = wp.width + R * 2, fullH = ASCENT + DESCENT + R * 2;
    scale = Math.min(w * FIT_W / fullW, h * FIT_H / fullH);
    var left = (w - wp.width * scale) / 2;
    var base = h / 2 + (ASCENT - DESCENT) / 2 * scale;
    rect = { left: left, right: left + wp.width * scale, top: base - ASCENT * scale, bottom: base + DESCENT * scale };
    while (dots.length < wp.pts.length) dots.push(newDot());
    dots.forEach(function (d, i) {
      var p = wp.pts[i < wp.pts.length ? i : Math.floor(Math.random() * wp.pts.length)];
      d.leaving = i >= wp.pts.length;
      d.hx = left + p[0] * scale;
      d.hy = base + p[1] * scale;
    });
    return true;
  }

  /* ---- motion ---- */
  var cur = { amount: 0, ux: 0, uy: 0, x: 0, y: 0 };
  var goal = { amount: 0, ux: 0, uy: 0, x: 0, y: 0 };
  var KEYS = ["amount", "ux", "uy", "x", "y"];
  var running = false, last = 0, returning = null, morph = null;
  var visible = false, idle, lastX = null, lastY = null;

  function active() { return band.getAttribute("data-footer-mode") === "scatter" && visible; }
  function easeIO(p) { return p * p * (3 - 2 * p); }

  function render(now) {
    var m = morph ? easeIO(Math.min((now - morph.start) / morph.ms, 1)) : 1;
    var rr = R * scale;
    dots.forEach(function (d) {
      var wx = Math.cos(cur.x * d.fxx + cur.y * d.fxy + d.px);
      var wy = Math.sin(cur.x * d.fyx + cur.y * d.fyy + d.py);
      var x = d.hx + (wx * SPREAD_X + cur.ux * LEAN * d.pull) * cur.amount * scale;
      var y = d.hy + (wy * SPREAD_Y + cur.uy * LEAN * d.pull) * cur.amount * scale;
      d.cx = d.fromX + (x - d.fromX) * m;
      d.cy = d.fromY + (y - d.fromY) * m;
      d.r = d.fromR + (rr - d.fromR) * m;
      d.el.setAttribute("cx", d.cx.toFixed(1));
      d.el.setAttribute("cy", d.cy.toFixed(1));
      d.el.setAttribute("r", d.r.toFixed(2));
    });
    if (morph && m >= 1) {
      morph = null;
      dots = dots.filter(function (d) {
        if (d.leaving) d.el.remove();
        return !d.leaving;
      });
    }
  }
  function frame(now) {
    if (!active()) { running = false; return; }
    var dt = Math.min((now - last) / (1000 / 60), 3); last = now;
    var k = Math.pow(EASE, dt), settled = true;
    KEYS.forEach(function (key) {
      if (key === "amount" && returning) return;
      cur[key] = goal[key] + (cur[key] - goal[key]) * k;
      if (Math.abs(cur[key] - goal[key]) < 0.001) cur[key] = goal[key];
      else settled = false;
    });
    if (returning) {
      var p = Math.max(0, Math.min((now - returning.start) / RETURN_MS, 1));
      cur.amount = returning.from * (1 - easeIO(p));
      if (p < 1) settled = false; else returning = null;
    }
    render(now);
    if (morph) settled = false;
    if (settled) running = false; else requestAnimationFrame(frame);
  }
  function wake() {
    if (!running && active()) {
      running = true; last = performance.now();
      requestAnimationFrame(frame);
    }
  }
  function settle() {
    goal.amount = 0;
    returning = { from: cur.amount, start: performance.now() };
    wake();
  }

  /* ---- cursor: how far from the word sets how scattered it is ---- */
  function aim() {
    if (scrollDriven) { aimScroll(); return; }
    if (lastX === null) return;
    var box = stage.getBoundingClientRect();
    var mx = lastX - box.left, my = lastY - box.top;
    var dx = Math.max(rect.left - mx, 0, mx - rect.right);
    var dy = Math.max(rect.top - my, 0, my - rect.bottom);
    goal.amount = Math.min(1, Math.hypot(dx, dy) / (Math.hypot(w, h) * 0.4));
    var cx = mx - w / 2, cy = my - h / 2, len = Math.hypot(cx, cy) || 1;
    goal.ux = cx / len; goal.uy = cy / len;
    goal.x = lastX / WAVE; goal.y = lastY / WAVE;
    returning = null;
    wake();
  }
  // Touch screens have no cursor, so scroll drives it instead: clean at the very
  // bottom of the page, more scattered the further back up you scroll. Measured
  // from the end of the page, since phones' toolbars change the viewport's height.
  function aimScroll() {
    var fromEnd = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
    goal.amount = Math.max(0, Math.min(1, fromEnd / (h * 0.9)));
    goal.ux = 0; goal.uy = -1;
    goal.x = window.scrollY / WAVE; goal.y = window.scrollY / WAVE * 0.6;
    wake();
  }
  if (interactive) {
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      lastX = e.clientX; lastY = e.clientY;
      aim();
      clearTimeout(idle);
      idle = setTimeout(settle, IDLE_MS);
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", function () { clearTimeout(idle); settle(); });
  }

  /* ---- words ---- */
  var deck = [];
  function nextWord() {
    if (!deck.length) {
      deck = WORDS.filter(function (x) { return x !== word; });
      for (var i = deck.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1)), t = deck[i]; deck[i] = deck[j]; deck[j] = t;
      }
    }
    return deck.shift();
  }

  // Backspace clears the whole word, and its dots simply vanish.
  function clearWord() {
    typing = true;
    word = "";
    morph = null;
    dots.forEach(function (d) { d.el.remove(); });
    dots = [];
  }

  var typing = false;
  function deal() {
    typing = false;
    show(nextWord());
  }

  function show(next, ms) {
    ms = ms || MORPH_MS;
    word = next;
    var now = performance.now();
    var old = dots.slice();
    if (!place()) return;
    if (reduceMotion || !old.length) {
      dots.forEach(function (d) { d.fromX = d.hx; d.fromY = d.hy; d.fromR = R * scale; });
      morph = { start: now - ms, ms: ms };
      render(now);
      return;
    }
    // Brand-new dots set off from wherever an existing dot is right now.
    dots.forEach(function (d) {
      var src = d.r ? d : old[Math.floor(Math.random() * old.length)];
      d.fromX = src.cx; d.fromY = src.cy; d.fromR = src.r;
    });
    morph = { start: now, ms: ms };
    wake();
  }

  if (finePointer) {
    stage.addEventListener("pointerdown", deal);

    /* Desktop: type your own word, live. The first letter starts it fresh; a
       click or Enter goes back to dealing. Only while the game fills most of
       the screen, so keys (space scrolling above all) work normally elsewhere. */
    window.addEventListener("keydown", function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey || !active()) return;
      if (stage.getBoundingClientRect().top > window.innerHeight / 2) return;
      var t = e.target;
      if (t && t.closest && t.closest("input, textarea, select, [contenteditable]")) return;
      var onControl = t && t.closest && t.closest("a, button");
      var next = null;
      if (e.key === "Backspace") {
        e.preventDefault();
        clearWord();
        return;
      } else if (e.key === "Enter") {
        if (onControl) return;             // Enter on a focused link or pill still activates it
        e.preventDefault();
        deal();
        return;
      } else if (e.key === " ") {
        // One word only: a space adds nothing, and while typing it shouldn't scroll.
        if (typing && !onControl) e.preventDefault();
        return;
      } else if (e.key.length === 1 && /[a-z]/i.test(e.key)) {
        var base = typing ? word : "";
        if (base.length >= MAX_TYPED) { e.preventDefault(); return; }
        next = base + e.key.toLowerCase();
      } else {
        return;
      }
      e.preventDefault();
      if (onControl && onControl.closest(".footer-modes")) onControl.blur();   // or space would re-press the pill
      typing = true;
      show(next, TYPE_MS);
    });
  } else {
    // Touch: a finger going down may be the start of a scroll, so wait for
    // "click", which the browser only sends for a tap that didn't move, and
    // only on the word itself (allowing for how far its dots are scattered).
    stage.addEventListener("click", function (e) {
      var box = stage.getBoundingClientRect();
      var x = e.clientX - box.left, y = e.clientY - box.top;
      var padX = TAP_PAD + SPREAD_X * cur.amount * scale, padY = TAP_PAD + SPREAD_Y * cur.amount * scale;
      if (x >= rect.left - padX && x <= rect.right + padX && y >= rect.top - padY && y <= rect.bottom + padY) {
        deal();
      }
    });
  }

  /* ---- footer text follows the theme: this game sits on the page colour ---- */
  function ink() {
    if (!window.FooterModes) return;
    window.FooterModes.setInk("scatter", document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  }
  new MutationObserver(ink).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  ink();

  /* ---- only while it's the footer mode and on screen ---- */
  var placed = false;
  function refresh() {
    if (!active()) return;
    if (!placed) { placed = true; show(word); }
    aim();
    wake();
  }
  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    refresh();
  }).observe(band);
  new MutationObserver(refresh).observe(band, { attributes: true, attributeFilter: ["data-footer-mode"] });
  new ResizeObserver(function () {
    if (!placed || !place()) return;
    dots.forEach(function (d) { d.fromX = d.cx; d.fromY = d.cy; d.fromR = d.r; });
    morph = { start: performance.now(), ms: MORPH_MS };
    wake();
  }).observe(stage);
  window.addEventListener("scroll", function () { if (active() && !returning) aim(); }, { passive: true });
})();
