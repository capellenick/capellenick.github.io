/* ==========================================================================
   NAV DOT — the cursor-sized dot that marks the current page in the header
   nav (replaces the old underline).

   Each nav click is a full page load, so the "move" happens on arrival: every
   page records its own key in sessionStorage, and the next page reads it. If
   you came from another nav page (PLAY <-> ABOUT, by link or back/forward),
   the dot starts under that link and swoops along a "U" to the current one.
   From anywhere else (home, a project) it simply appears.

   Loaded by every page — including play/, which doesn't load site.js.
   Colour/size live in style.css (.nav-dot). No dot when the nav is collapsed
   into the mobile menu; no arc for reduced motion.
   ========================================================================== */
(function () {
  "use strict";

  var nav = document.querySelector(".nav");
  if (!nav) return;

  var STORE = "navDotFrom";
  var SIZE = 11;          // px — same as the cursor dot
  var GAP = 6;            // px from the text baseline down to the dot's top
  var DIP = 8;            // px — how far the "U" sags below the resting line
  var DURATION = 450;     // ms
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // "/play/" -> "play", "/about.html" -> "about", "/" or "/index.html" -> "home"
  function keyFor(pathname) {
    var p = pathname.replace(/index\.html$/, "").replace(/\.html$/, "").replace(/\/+$/, "");
    return p.split("/").pop() || "home";
  }
  function linkFor(key) {
    var links = nav.querySelectorAll("a");
    for (var i = 0; i < links.length; i++) {
      if (links[i].hidden) continue;   // archived links (PLAY) get no dot
      if (keyFor(new URL(links[i].href).pathname) === key) return links[i];
    }
    return null;
  }

  var dot = document.createElement("span");
  dot.className = "nav-dot";
  dot.setAttribute("aria-hidden", "true");
  nav.appendChild(dot);

  // Dot's top-left (relative to .nav) when it sits under link `a`.
  function restingPoint(a) {
    var probe = document.createElement("span");
    probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
    a.appendChild(probe);
    var navBox = nav.getBoundingClientRect();
    var baseline = probe.getBoundingClientRect().top - navBox.top;
    probe.remove();
    var box = a.getBoundingClientRect();
    return {
      x: box.left - navBox.left + box.width / 2 - SIZE / 2,
      y: baseline + GAP
    };
  }
  function place(pt) {
    dot.style.transform = "translate(" + pt.x + "px," + pt.y + "px)";
  }

  // Mostly ease-out cubic with a little ease-in-out cubic mixed in: the dot
  // snaps off the old link (first quarter of the move in ~13% of the time,
  // vs ~40% for plain in-out) and still lands softly.
  function ease(t) {
    var inOut = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    var out = 1 - Math.pow(1 - t, 3);
    return 0.25 * inOut + 0.75 * out;
  }

  function arc(from, to) {
    var frames = [];
    var STEPS = 30;
    for (var i = 0; i <= STEPS; i++) {
      var e = ease(i / STEPS);
      frames.push({
        transform: "translate(" + (from.x + (to.x - from.x) * e) + "px," +
                   (from.y + (to.y - from.y) * e + DIP * Math.sin(Math.PI * e)) + "px)"
      });
    }
    return dot.animate(frames, { duration: DURATION, easing: "linear", fill: "forwards" });
  }

  var current = nav.querySelector('a[aria-current="page"]');

  // Only the arc (a script animation) — never any CSS animation on the dot.
  function arcs() {
    return dot.getAnimations().filter(function (a) {
      return !(window.CSSAnimation && a instanceof CSSAnimation);
    });
  }


  function run() {
    var here = keyFor(location.pathname);
    var from = null;
    try {
      from = sessionStorage.getItem(STORE);
      sessionStorage.setItem(STORE, here);
    } catch (e) {}

    if (!current) { dot.classList.remove("is-on"); return; }

    var ready = (document.fonts && document.fonts.ready) || Promise.resolve();
    ready.then(function () {
      var end = restingPoint(current);
      var prev = from && from !== here ? linkFor(from) : null;
      arcs().forEach(function (a) { a.cancel(); });
      if (prev && prev !== current && !reduceMotion) {
        var anim = arc(restingPoint(prev), end);
        dot.classList.add("is-on");
        anim.onfinish = function () { place(end); anim.cancel(); };
      } else {
        place(end);
        dot.classList.add("is-on");
      }
    });
  }

  // Normal load: run now (the script is deferred, so the DOM is ready) rather
  // than waiting for every image. Back/forward-cache restores don't re-run
  // scripts, but do fire pageshow with `persisted`, so those arc too.
  run();
  window.addEventListener("pageshow", function (e) { if (e.persisted) run(); });
  window.addEventListener("resize", function () {
    if (current && !arcs().length) place(restingPoint(current));
  });
})();
