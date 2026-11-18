/* ==========================================================================
   DOTTED NAME — the header's "Nick Capelle", drawn dot by dot from Nick's
   dotted alphabet (traced from his PNG: 187 dots, in that image's pixels).

   Interaction, after tack-tile.com's wordmark: how scattered the name is
   depends on how far the cursor is from it. On the name it's perfectly
   readable; moving away dissolves it. It holds while the cursor rests, then
   reassembles after 10 seconds without movement; the next move scatters it again.
   Each dot's offset is its own seeded wave across the cursor's position, so
   dots reshuffle as the mouse moves (and the same way on every page), and it
   adds a share of pull toward the cursor, so the cloud leans that way.

   The name's accessible text stays on the link (aria-label); without JS the
   plain text shows. Touch screens and reduced motion: solid, no scatter.
   Colour comes from .logo's --hue-color (the shared cycle). Loaded by every page.
   ========================================================================== */
(function () {
  "use strict";

  var logo = document.querySelector(".site-header .logo");
  if (!logo) return;

  var W = 1414, H = 256, R = 11.71;   // the traced word's size and dot radius, in image pixels
  var DOTS = [
    12,35, 13,58, 13,105, 13,152, 13,82, 13,128, 13,175, 13,198, 13,12,
    23,29, 38,46, 51,66, 64,86, 76,105, 89,125, 101,145, 114,164, 127,183,
    145,175, 145,58, 145,82, 145,105, 145,152, 145,12, 145,35, 145,128,
    145,198, 199,105, 199,152, 199,27, 199,82, 199,128, 199,175, 199,198,
    240,139, 243,116, 245,162, 253,95, 256,182, 270,80, 272,198, 293,74,
    295,204, 316,75, 317,201, 336,85, 338,192, 348,105, 348,171, 391,58,
    391,152, 391,12, 391,35, 391,82, 391,105, 391,175, 391,198, 391,128,
    413,131, 429,115, 442,141, 445,100, 454,161, 461,83, 468,180, 478,68,
    480,200, 563,96, 563,119, 566,141, 568,74, 575,162, 578,53, 589,180,
    593,35, 607,194, 612,24, 629,201, 634,18, 653,201, 658,18, 674,197,
    680,26, 693,185, 698,40, 707,167, 710,59, 712,145, 751,171, 759,193,
    759,101, 760,150, 769,80, 781,139, 783,202, 790,72, 803,134, 806,199,
    814,71, 825,128, 827,187, 835,79, 847,145, 847,168, 847,122, 847,98,
    849,191, 868,202, 899,197, 899,104, 899,128, 899,221, 899,81, 899,151,
    899,244, 899,174, 917,187, 919,89, 935,202, 936,75, 958,203, 959,74,
    976,199, 981,80, 994,184, 997,97, 1003,164, 1004,119, 1006,142,
    1041,134, 1044,156, 1044,111, 1051,178, 1056,91, 1064,134, 1067,195,
    1076,77, 1088,203, 1088,134, 1099,72, 1110,134, 1110,202, 1122,77,
    1131,193, 1133,134, 1140,92, 1147,176, 1149,113, 1155,134, 1195,35,
    1195,128, 1195,198, 1195,12, 1195,58, 1195,105, 1195,151, 1195,175,
    1195,82, 1247,35, 1247,128, 1247,198, 1247,58, 1247,12, 1247,105,
    1247,151, 1247,175, 1247,82, 1289,134, 1291,157, 1292,111, 1299,178,
    1304,91, 1312,135, 1315,195, 1324,77, 1335,204, 1335,135, 1347,72,
    1358,202, 1358,134, 1369,77, 1379,193, 1380,135, 1387,92, 1394,176,
    1397,113, 1403,134
  ];

  var SPREAD_X = 12, SPREAD_Y = 7;     // CSS px of random scatter at full strength
  var LEAN = 12;                       // CSS px the cloud also stretches toward the cursor
  var IDLE_MS = 10000;                 // cursor still this long: the name reassembles
  var WAVE = 170;                      // CSS px of cursor travel per radian: lower reshuffles faster
  var EASE = 0.82;                     // share of the gap left after a 60fps frame
  var RETURN_MS = 2000;                // drifting back into the name: slow start, soft landing

  var NS = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "logo-dots");
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.setAttribute("aria-hidden", "true");
  var dots = [];
  for (var i = 0; i < DOTS.length; i += 2) {
    var c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", DOTS[i]);
    c.setAttribute("cy", DOTS[i + 1]);
    c.setAttribute("r", R);
    svg.appendChild(c);
    dots.push({ el: c, x: DOTS[i], y: DOTS[i + 1] });
  }
  logo.setAttribute("aria-label", logo.textContent.trim());
  logo.textContent = "";
  logo.appendChild(svg);

  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Small seeded generator: every page scatters the same way.
  var seed = 182;
  function random() {
    seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function freq() { return (random() < 0.5 ? -1 : 1) * (0.5 + random() * 0.9); }

  // Each dot's own wave across the cursor's position, so dots reshuffle as the
  // mouse moves and rest when it rests, plus its own share of the lean.
  dots.forEach(function (d) {
    d.fxx = freq(); d.fxy = freq(); d.px = random() * 6.283;
    d.fyx = freq(); d.fyy = freq(); d.py = random() * 6.283;
    d.pull = 0.1 + random() * 0.9;
  });

  var box, scale;
  function layout() {
    box = svg.getBoundingClientRect();
    scale = W / box.width;
  }

  // Everything eases together: scatter amount, direction, cursor position.
  var cur = { amount: 0, ux: 0, uy: 0, x: 0, y: 0 };
  var goal = { amount: 0, ux: 0, uy: 0, x: 0, y: 0 };
  var KEYS = ["amount", "ux", "uy", "x", "y"];
  var running = false, last = 0, returning = null;

  function render() {
    var minX = (6 - box.left) * scale, minY = (6 - box.top) * scale;   // stay in the window
    dots.forEach(function (d) {
      var wx = Math.cos(cur.x * d.fxx + cur.y * d.fxy + d.px);
      var wy = Math.sin(cur.x * d.fyx + cur.y * d.fyy + d.py);
      var ox = (wx * SPREAD_X + cur.ux * LEAN * d.pull) * cur.amount * scale;
      var oy = (wy * SPREAD_Y + cur.uy * LEAN * d.pull) * cur.amount * scale;
      d.el.setAttribute("cx", Math.max(minX, d.x + ox).toFixed(1));
      d.el.setAttribute("cy", Math.max(minY, d.y + oy).toFixed(1));
    });
  }
  function frame(now) {
    var dt = Math.min((now - last) / (1000 / 60), 3); last = now;
    var k = Math.pow(EASE, dt), settled = true;
    KEYS.forEach(function (key) {
      if (key === "amount" && returning) return;
      cur[key] = goal[key] + (cur[key] - goal[key]) * k;
      if (Math.abs(cur[key] - goal[key]) < 0.001) cur[key] = goal[key];
      else settled = false;
    });
    if (returning) {
      var p = Math.min((now - returning.start) / RETURN_MS, 1);
      p = p < 0 ? 0 : p;
      cur.amount = returning.from * (1 - p * p * (3 - 2 * p));   // ease-in-out
      if (p < 1) settled = false; else returning = null;
    }
    render();
    if (settled) running = false; else requestAnimationFrame(frame);
  }
  function wake() {
    if (!running) {
      running = true; last = performance.now();
      requestAnimationFrame(frame);
    }
  }

  // Cursor resting too long, or gone: settle back into the name.
  var idle;
  function settle() {
    goal.amount = 0;
    returning = { from: cur.amount, start: performance.now() };
    wake();
  }

  // Amount: 0 on the name, 1 at about two-thirds of the window's diagonal.
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    var r = logo.getBoundingClientRect();
    var dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
    var dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
    var reach = Math.hypot(window.innerWidth, window.innerHeight) * 0.66;
    goal.amount = Math.min(1, Math.hypot(dx, dy) / reach);
    var cx = e.clientX - (r.left + r.width / 2), cy = e.clientY - (r.top + r.height / 2);
    var len = Math.hypot(cx, cy) || 1;
    goal.ux = cx / len; goal.uy = cy / len;
    goal.x = e.clientX / WAVE; goal.y = e.clientY / WAVE;
    returning = null;
    wake();
    clearTimeout(idle);
    idle = setTimeout(settle, IDLE_MS);
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", function () { clearTimeout(idle); settle(); });

  layout();
  window.addEventListener("resize", function () { layout(); render(); });
})();
