/* ==========================================================================
   RALLY CASE STUDY (rally.html only).

   1. Count-up stats — numbers tick up the first time they come into view.
   2. Converge — as you scroll the pinned "How the data changed" block, the
      sports and features that got cut strike out one by one; tennis and
      pickleball light up lime.
   3. Showcase — after the MacBook Pro PROLED page: the phone turns from a
      three-quarter view to face you (scroll-linked, so it reverses), then
      stays pinned and steps through browse -> request -> you're on -> chat
      -> played as you scroll, one whole step at a time, with that step lit
      on the left.
   4. Gallery — prev/next paddles and pill dots for the sideways tiles.

   The 3D phone (js/rally-3d.js) listens for "rally:show" and draws from
   the same numbers; the flat phone stays as the fallback.

   Reduced motion: no turn and no count-up; the steps still change with
   scroll (they're content, not decoration), just without the motion.
   ========================================================================== */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };

  // How far through a tall section the viewport is: 0 when its top reaches
  // the top of the window, 1 when its bottom reaches the bottom.
  function progress(el) {
    var r = el.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    return total > 0 ? clamp(-r.top / total, 0, 1) : 0;
  }

  /* ---- 1. Count-up -------------------------------------------------------- */
  var counters = document.querySelectorAll("[data-count]");
  if (!reduce && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        var el = e.target, to = parseFloat(el.getAttribute("data-count")), t0 = null;
        el.textContent = "0";
        (function step(t) {
          if (t0 === null) t0 = t;
          var k = clamp((t - t0) / 1200, 0, 1);
          el.textContent = String(Math.round(to * ease(k)));
          if (k < 1) requestAnimationFrame(step);
        })(performance.now());
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  /* ---- 2. Converge -------------------------------------------------------- */
  var narrow = document.querySelector("[data-narrow]");
  var cuts = narrow ? narrow.querySelectorAll("[data-cut]") : [];
  var keeps = narrow ? narrow.querySelectorAll("[data-keep]") : [];
  function updateNarrow() {
    if (!narrow) return;
    // Strike-outs happen across the middle of the pin, so the first and last
    // bits of scroll just hold the before / after states.
    var p = clamp((progress(narrow) - 0.12) / 0.7, 0, 1);
    var n = Math.round(p * cuts.length);
    for (var i = 0; i < cuts.length; i++) cuts[i].classList.toggle("is-cut", i < n);
    var done = n >= cuts.length;
    for (var j = 0; j < keeps.length; j++) keeps[j].classList.toggle("is-kept", done);
    narrow.classList.toggle("is-done", done);
  }

  /* ---- 3. Showcase --------------------------------------------------------
     Step 01 is scroll-linked: the phone holds its three-quarter pose for
     the first bit of scroll, then turns to face you as the feed starts
     scrolling inside it, and the feed moves exactly with your scroll.
     Steps 02-05 are equal bands after that; you're always on exactly one,
     and their screens swap with a short timed crossfade. */
  var show = document.querySelector("[data-show]");
  var device = show && show.querySelector("[data-show-device]");
  var screen = show && show.querySelector(".phone__screen");
  var shots = show ? show.querySelectorAll("[data-shot]") : [];
  var steps = show ? show.querySelectorAll("[data-step]") : [];
  var feedImg = show && show.querySelector(".rl-feedscroll__img");
  var HOLD = 0.05;           // phone holds still at the start of the pin
  var TURN = 0.18;           // ...then turns to face you over this much
  var FEED_END = 0.36;       // step 01 (the scrolling feed) ends here
  var N = steps.length;
  var shown = 0;             // smoothed progress for the turn
  var step = -1;             // the step on screen
  var ops = [1, 0, 0, 0, 0]; // drawn opacity per screen (stacked: later over earlier)
  var lastT = 0;

  function stepFromProgress(p) {
    if (p < FEED_END) return 0;
    return clamp(1 + Math.floor((p - FEED_END) / (1 - FEED_END) * (N - 1)), 1, N - 1);
  }
  function setStep(i) {
    if (i === step) return;
    step = i;
    for (var s = 0; s < steps.length; s++) steps[s].classList.toggle("is-active", s === i);
  }

  // Advance the timed crossfades. True while moving.
  function tick(now) {
    var dt = lastT ? Math.min(64, now - lastT) : 16;
    lastT = now;
    var moving = false;
    var rate = reduce ? 1 : dt / 260;             // about a quarter-second crossfade
    for (var k = 1; k < N; k++) {
      var goal = k <= step ? 1 : 0;
      if (ops[k] !== goal) {
        ops[k] = goal > ops[k] ? Math.min(goal, ops[k] + rate) : Math.max(goal, ops[k] - rate);
        moving = true;
      }
    }
    return moving;
  }

  function drawShow(p) {
    // Hold, then turn in from a three-quarter view (and a touch smaller)
    // to face-on, starting the moment the feed starts to scroll.
    // Ease in and out (not ease-out), so the turn starts gently from rest
    // instead of jumping into motion.
    var u = clamp((p - HOLD) / TURN, 0, 1);
    var t = reduce ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * u);
    device.style.setProperty("--ry", (-58 * (1 - t)).toFixed(2) + "deg");
    device.style.setProperty("--rx", (16 * (1 - t)).toFixed(2) + "deg");
    device.style.setProperty("--rz", (-8 * (1 - t)).toFixed(2) + "deg");
    device.style.setProperty("--s", (0.8 + 0.2 * t).toFixed(3));
    device.style.setProperty("--glare", (100 - 100 * t).toFixed(1) + "%");

    var eased = [1];
    for (var k = 1; k < shots.length; k++) {
      var o = ops[k]; o = o * o * (3 - 2 * o);
      eased.push(o);
      shots[k].style.opacity = o.toFixed(3);
    }
    // The feed moves with the scroll across step 01 (a short rest at the end).
    var f = clamp((p - HOLD) / (FEED_END - HOLD - 0.03), 0, 1);   // linear: 1:1 with the scroll
    if (feedImg && screen) {
      var max = feedImg.getBoundingClientRect().height - screen.getBoundingClientRect().height;
      feedImg.style.transform = "translate3d(0," + (-Math.max(0, max) * f).toFixed(2) + "px,0)";
    }
    // The 3D phone (js/rally-3d.js) draws from the same numbers.
    document.dispatchEvent(new CustomEvent("rally:show", { detail: { t: t, ops: eased, f: f } }));
  }

  /* ---- Click a step to jump to it ---------------------------------------
     A dimmed step scrolls the page to that step's spot (step 01 lands just
     after the turn, with the feed starting; the others in the middle of
     their band), so the phone and text follow exactly as if you'd scrolled. */
  function stepTarget(k) {
    var p = k === 0 ? HOLD + TURN : FEED_END + (k - 0.5) * (1 - FEED_END) / (N - 1);
    var top = show.getBoundingClientRect().top + window.scrollY;
    return Math.round(top + p * (show.offsetHeight - window.innerHeight));
  }
  for (var si = 0; si < steps.length; si++) {
    (function (k, li) {
      li.setAttribute("role", "button");
      li.tabIndex = 0;
      li.setAttribute("aria-label", "Go to step " + (k + 1) + ": " + (li.querySelector("h3") || li).textContent.trim());
      var go = function () { if (k !== step) window.scrollTo({ top: stepTarget(k), behavior: reduce ? "auto" : "smooth" }); };
      li.addEventListener("click", go);
      li.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    })(+steps[si].getAttribute("data-step"), steps[si]);
  }

  /* ---- Scroll loop -------------------------------------------------------
     The turn eases toward the real scroll position (a little inertia, smooth
     on a notchy wheel); the step comes straight from the scroll position. */
  var running = false;
  function frame(now) {
    updateNarrow();
    if (show) {
      var target = progress(show);
      shown += (target - shown) * (reduce ? 1 : 0.1);
      if (Math.abs(target - shown) < 0.0004) shown = target;
      setStep(stepFromProgress(target));
      var moving = tick(now);
      drawShow(shown);
      if (shown !== target || moving) { requestAnimationFrame(frame); return; }
    }
    lastT = 0;
    running = false;
  }
  function onScroll() {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  if (show) {
    shown = progress(show);
    setStep(stepFromProgress(shown));
    for (var k0 = 1; k0 < N; k0++) ops[k0] = k0 <= step ? 1 : 0;
    drawShow(shown);
    onScroll();
    // The 3D phone loads later; give it the current state once it's up.
    document.addEventListener("rally:3d-ready", function () { drawShow(shown); });
  }
  updateNarrow();

  /* ---- 4. Sideways rows (Design decisions, Mapping it out) --------------
     Prev/next paddles and pill dots; each row finds its own controls in
     its section. */
  document.querySelectorAll("[data-gallery]").forEach(function (track) {
    var section = track.closest("section");
    var tiles = [];
    var dots = section.querySelector("[data-gallery-dots]");
    var prev = section.querySelector("[data-gallery-prev]");
    var next = section.querySelector("[data-gallery-next]");
    // Only tiles that are showing count (skim mode hides some).
    var collect = function () {
      tiles = Array.prototype.filter.call(track.children, function (t) { return t.offsetParent !== null; });
      while (dots.children.length > tiles.length) dots.removeChild(dots.lastChild);
      while (dots.children.length < tiles.length) dots.appendChild(document.createElement("span"));
    };
    collect();

    var stepW = function () {
      return tiles.length > 1 ? tiles[1].getBoundingClientRect().left - tiles[0].getBoundingClientRect().left : track.clientWidth;
    };
    var index = function () { return Math.round(track.scrollLeft / stepW()); };
    var syncGallery = function () {
      var maxScroll = track.scrollWidth - track.clientWidth - 2;
      // At the end several tiles fit at once, so light the last dot there.
      var i = track.scrollLeft >= maxScroll ? tiles.length - 1 : index();
      for (var k = 0; k < dots.children.length; k++) dots.children[k].classList.toggle("is-on", k === i);
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= maxScroll;
    };
    prev.addEventListener("click", function () { track.scrollBy({ left: -stepW(), behavior: reduce ? "auto" : "smooth" }); });
    next.addEventListener("click", function () { track.scrollBy({ left: stepW(), behavior: reduce ? "auto" : "smooth" }); });
    track.addEventListener("scroll", function () { requestAnimationFrame(syncGallery); }, { passive: true });
    window.addEventListener("resize", syncGallery);
    document.addEventListener("rally:skim", function () { collect(); track.scrollLeft = 0; syncGallery(); });
    syncGallery();
  });


  /* ---- 5. Lightbox (My process photos) -----------------------------------
     Click (or Enter/Space on) a process photo to see it as big as the window
     allows, with its caption. Arrows / arrow keys / swipe step through the
     set; Esc, the close button or a click on the backdrop closes it. */
  var lbItems = document.querySelectorAll("[data-lightbox]");
  if (lbItems.length) {
    var chev = function (pts) { return '<svg viewBox="0 0 16 24" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'; };
    var lb = document.createElement("div");
    lb.className = "rl-lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Enlarged image");
    lb.innerHTML =
      '<button type="button" class="rl-lightbox__prev" aria-label="Previous image">' + chev("11,5 4,12 11,19") + '</button>' +
      '<figure><img alt="" /><figcaption></figcaption></figure>' +
      '<button type="button" class="rl-lightbox__next" aria-label="Next image">' + chev("5,5 12,12 5,19") + '</button>' +
      '<button type="button" class="rl-lightbox__close" aria-label="Close"><svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 3l12 12M15 3L3 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector("img"), lbCap = lb.querySelector("figcaption");
    var lbPrev = lb.querySelector(".rl-lightbox__prev"), lbNext = lb.querySelector(".rl-lightbox__next");
    var lbClose = lb.querySelector(".rl-lightbox__close");
    var lbAt = 0, lbReturn = null, lbList = [];

    var lbShow = function (i) {
      lbAt = clamp(i, 0, lbList.length - 1);
      var src = lbList[lbAt].querySelector("img");
      var cap = lbList[lbAt].parentElement.querySelector("p");
      lbImg.src = src.currentSrc || src.src;
      lbImg.alt = src.alt;
      lbCap.innerHTML = cap ? cap.innerHTML : "";
      lbPrev.disabled = lbAt === 0;
      lbNext.disabled = lbAt === lbList.length - 1;
    };
    var lbOpen = function (el) {
      lbReturn = document.activeElement;
      // Only photos that are showing (skim mode hides some of the row).
      lbList = Array.prototype.filter.call(lbItems, function (x) { return x.offsetParent !== null; });
      lbShow(lbList.indexOf(el));
      document.documentElement.classList.add("rl-lightbox-open");
      lb.classList.add("is-open");
      lbClose.focus({ preventScroll: true });
    };
    var lbHide = function () {
      lb.classList.remove("is-open");
      document.documentElement.classList.remove("rl-lightbox-open");
      if (lbReturn) lbReturn.focus({ preventScroll: true });
    };
    lbItems.forEach(function (el, i) {
      el.addEventListener("click", function () { lbOpen(el); });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); lbOpen(el); }
      });
    });
    lbPrev.addEventListener("click", function (e) { e.stopPropagation(); lbShow(lbAt - 1); });
    lbNext.addEventListener("click", function (e) { e.stopPropagation(); lbShow(lbAt + 1); });
    lbClose.addEventListener("click", lbHide);
    // Anywhere black closes it: the backdrop, the caption area, and the
    // dark parts of the photo itself (the background around a sketchbook).
    // Only the lit parts of the photo and the buttons keep it open.
    var shade = {};                                   // src -> small canvas copy for reading pixels
    var isDark = function (e) {
      var r = lbImg.getBoundingClientRect(), nw = lbImg.naturalWidth, nh = lbImg.naturalHeight;
      if (!nw) return false;
      var k = Math.min(r.width / nw, r.height / nh);  // object-fit: contain
      var x = (e.clientX - r.left - (r.width - nw * k) / 2) / k, y = (e.clientY - r.top - (r.height - nh * k) / 2) / k;
      if (x < 0 || y < 0 || x >= nw || y >= nh) return true;   // letterbox = black
      var c = shade[lbImg.src];
      if (!c) {
        c = document.createElement("canvas");
        c.width = 300; c.height = Math.round(300 * nh / nw);
        c.getContext("2d", { willReadFrequently: true }).drawImage(lbImg, 0, 0, c.width, c.height);
        shade[lbImg.src] = c;
      }
      var p = c.getContext("2d").getImageData(Math.floor(x * c.width / nw), Math.floor(y * c.height / nh), 1, 1).data;
      return p[0] * 0.3 + p[1] * 0.59 + p[2] * 0.11 < 40;
    };
    lb.addEventListener("click", function (e) {
      if (e.target.closest("button")) return;
      if (e.target === lbImg && !isDark(e)) return;
      lbHide();
    });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") lbHide();
      else if (e.key === "ArrowRight") lbShow(lbAt + 1);
      else if (e.key === "ArrowLeft") lbShow(lbAt - 1);
      else if (e.key === "Tab") {                     // keep focus inside
        var f = [lbPrev, lbNext, lbClose].filter(function (b) { return !b.disabled && getComputedStyle(b).display !== "none"; });
        var at = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(at + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
      }
    });
    var lx = null, ly = 0;
    lb.addEventListener("touchstart", function (e) { lx = e.touches[0].clientX; ly = e.touches[0].clientY; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (lx === null || e.touches.length) return;
      var dx = e.changedTouches[0].clientX - lx, dy = e.changedTouches[0].clientY - ly;
      lx = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) lbShow(lbAt + (dx < 0 ? 1 : -1));
    });
  }

  /* ---- 6. Skim mode ------------------------------------------------------
     "Short on time?" switch: html.rl-skim hides the in-between detail (see
     rally.css). Keeps your place (the switch stays put on screen while the
     page reflows around it), remembers the choice, and tells the rows and
     pinned sections to re-measure. */
  var skimBtn = document.querySelector("[data-skim-toggle]");
  if (skimBtn) {
    var html = document.documentElement;
    var applySkim = function (on) {
      html.classList.toggle("rl-skim", on);
      skimBtn.setAttribute("aria-checked", on ? "true" : "false");
      document.dispatchEvent(new Event("rally:skim"));
      onScroll();
    };
    var saved = null;
    try { saved = localStorage.getItem("rally-skim"); } catch (e) {}
    if (saved === "1") applySkim(true);
    skimBtn.addEventListener("click", function () {
      var on = !html.classList.contains("rl-skim");
      try { localStorage.setItem("rally-skim", on ? "1" : "0"); } catch (e) {}
      var before = skimBtn.getBoundingClientRect().top;
      var flip = function () {
        applySkim(on);
        window.scrollBy({ top: skimBtn.getBoundingClientRect().top - before, behavior: "instant" });
      };
      if (reduce) { flip(); return; }
      html.classList.add("rl-skim-switching");
      setTimeout(function () {
        flip();
        requestAnimationFrame(function () { html.classList.remove("rl-skim-switching"); });
      }, 150);
    });
  }
})();
