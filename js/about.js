/* ==========================================================================
   ABOUT — photo stage (about.html only).

   The window's width is split into equal slots, one per photo (in markup
   order). As the cursor moves left to right it passes through the slots and
   the stage hard-cuts to that slot's photo — no fade, no motion. Photos are
   in chronological order, and each always appears at the same spot: centred
   over its own slot (kept inside the page gutters), so the sequence reads
   left to right in time. Before the cursor moves, the first photo shows.

   The meta line in the corner shows "03 / 06  Trees — charcoal".

   Desktop (hover + fine pointer) only. On touch / narrow screens style.css
   turns the photos into a swipeable strip and this does nothing.
   ========================================================================== */
(function () {
  "use strict";

  var stage = document.querySelector(".about-stage");
  if (!stage) return;
  var shots = stage.querySelectorAll("[data-shot]");
  var count = stage.querySelector(".about-count");
  var n = shots.length;
  if (!n) return;

  var desktop = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 761px)");
  var current = -1;

  function pad(i) { return (i < 9 ? "0" : "") + (i + 1); }

  function show(i) {
    if (i === current) return;
    if (current >= 0) shots[current].hidden = true;
    shots[i].hidden = false;
    current = i;
    if (count) {
      var cap = shots[i].querySelector("figcaption");
      count.textContent = pad(i) + " / " + pad(n - 1) + "\u2003" + (cap ? cap.textContent : "");
    }
  }

  // Centre each photo over its slot, inside the gutters. Widths come from
  // the laid-out images (hidden ones are still laid out — see style.css).
  function place() {
    if (!desktop.matches) return;
    var W = stage.clientWidth;
    var gutter = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--gutter")) || 32;
    for (var i = 0; i < n; i++) {
      var w = shots[i].getBoundingClientRect().width;
      var x = (i + 0.5) / n * W - w / 2;
      shots[i].style.left = Math.round(Math.max(gutter, Math.min(W - gutter - w, x))) + "px";
    }
  }

  function onMove(e) {
    if (!desktop.matches) return;
    var w = document.documentElement.clientWidth || window.innerWidth;
    var i = Math.floor(Math.max(0, Math.min(0.9999, e.clientX / w)) * n);
    show(i);
  }

  function setup() {
    if (desktop.matches) {
      for (var i = 0; i < n; i++) shots[i].hidden = i !== (current < 0 ? 0 : current);
      if (current < 0) show(0);
    } else {
      // The strip shows them all; CSS overrides [hidden] there, but clear it
      // anyway so the photos are in the accessibility tree.
      for (var j = 0; j < n; j++) shots[j].hidden = false;
    }
  }

  setup();
  place();
  for (var k = 0; k < n; k++) {
    var img = shots[k].querySelector("img");
    if (img && !img.complete) img.addEventListener("load", place);
  }
  window.addEventListener("resize", place);
  window.addEventListener("pointermove", onMove, { passive: true });
  if (desktop.addEventListener) desktop.addEventListener("change", function () { setup(); place(); });
})();
