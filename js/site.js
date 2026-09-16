/* ============================================================================
   NICK CAPELLE — PORTFOLIO
   One small script, no dependencies. Jobs:
     1. Theme toggle (light / dark, remembered)
     2. Mobile nav toggle
     3. Circle cursor with hover-state + labels
     4. Scroll-reveal
     5. Header hairline once scrolled
     6. Footer year
     7. Interactive ASCII garden (dormant unless a .garden element exists)
     8. Footer live clock + time-of-day sky gradient with pixel sun/moon
   The no-flash theme is set by a tiny inline script in each page's <head>;
   this file only wires the button.
   ========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


  /* ---- 1. THEME TOGGLE --------------------------------------------------- */
  var themeBtn = document.querySelector(".theme-toggle");

  function currentTheme() {
    return root.getAttribute("data-theme")
      || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
  function syncThemeButton() {
    if (!themeBtn) return;
    var dark = currentTheme() === "dark";
    themeBtn.setAttribute("aria-checked", String(dark));
    themeBtn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  }
  if (themeBtn) {
    syncThemeButton();
    themeBtn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      syncThemeButton();
    });
  }


  /* ---- 2. MOBILE NAV --------------------------------------------------- */
  var navToggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-header .nav");

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.focus();
      }
    });
  }


  /* ---- 3. CIRCLE CURSOR --------------------------------------------------
     Skipped entirely on touch / coarse pointers and reduced-motion.
     Add data-cursor="Some text" to any element to show a label on hover.
     --------------------------------------------------------------------- */
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (finePointer && !reduceMotion) {
    var cursor = document.createElement("div");
    cursor.className = "cursor";
    cursor.innerHTML = '<span class="cursor__label"></span>';
    var label = cursor.firstChild;
    document.body.appendChild(cursor);
    document.body.classList.add("has-cursor");

    var x = -100, y = -100, cx = -100, cy = -100;

    window.addEventListener("mousemove", function (e) {
      x = e.clientX; y = e.clientY;
      cursor.classList.remove("is-hidden");
    }, { passive: true });

    document.addEventListener("mouseleave", function () {
      cursor.classList.add("is-hidden");
    });

    // Smooth trailing follow. FOLLOW closer to 1 = tighter/snappier (less
    // trailing lag), closer to 0 = looser/dreamier (more trailing lag).
    var FOLLOW = 0.55;
    (function loop() {
      cx += (x - cx) * FOLLOW;
      cy += (y - cy) * FOLLOW;
      cursor.style.setProperty("--mx", cx.toFixed(1));
      cursor.style.setProperty("--my", cy.toFixed(1));
      requestAnimationFrame(loop);
    })();

    var hoverSel = 'a, button, [role="button"], input, textarea, select, summary, .plant';

    document.addEventListener("mouseover", function (e) {
      var hit = e.target.closest(hoverSel);
      if (!hit) return;
      var text = hit.getAttribute("data-cursor");
      if (text) {
        cursor.classList.add("is-label");
        cursor.classList.remove("is-hover");
        label.textContent = text;
      } else {
        cursor.classList.add("is-hover");
      }
    });
    document.addEventListener("mouseout", function (e) {
      if (!e.target.closest(hoverSel)) return;
      var to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest(hoverSel) : null;
      if (!to) {
        cursor.classList.remove("is-hover", "is-label");
        label.textContent = "";
      }
    });
  }


  /* ---- 4. SCROLL-REVEAL --------------------------------------------------- */
  var revealables = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && revealables.length && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add("is-visible"); });
  }


  /* ---- 5. HEADER HAIRLINE --------------------------------------------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-stuck", window.scrollY > 6);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }


  /* ---- 6. FOOTER YEAR ----------------------------------------------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());


  /* ---- 7. INTERACTIVE GARDEN -------------------------------------------
     Each .garden gets a set of plants. "Watering" (hover / click / Enter)
     advances the plant one growth stage. Plants lean toward the pointer.
     --------------------------------------------------------------------- */
  var garden = document.querySelector(".garden");
  if (garden) {
    // Growth stages, smallest to tallest. Monospace, bottom-aligned.
    var STAGES = [
      ".\n|\n\u203e",
      " \\|/ \n  |  \n  |  \n\u203e\u203e\u203e\u203e\u203e",
      " \\\\|// \n  \\|/  \n   |   \n   |   \n\u203e\u203e\u203e\u203e\u203e\u203e\u203e",
      " \\ | / \n \\\\|// \n \u2014\u2014+\u2014\u2014 \n   |   \n   |   \n   |   \n\u203e\u203e\u203e\u203e\u203e\u203e\u203e\u203e\u203e",
      "  \\\u00b7|\u00b7/  \n \\ \\|/ / \n \u2014\u2014\u2014+\u2014\u2014\u2014 \n  / \\|/ \\  \n    \\|/    \n     |     \n     |     \n\u203e\u203e\u203e\u203e\u203e\u203e\u203e\u203e\u203e\u203e\u203e"
    ];
    var COUNT = 7;
    var plants = [];

    for (var i = 0; i < COUNT; i++) {
      var p = document.createElement("button");
      p.type = "button";
      p.className = "plant";
      p.setAttribute("data-cursor", "water");
      p.setAttribute("aria-label", "Water plant " + (i + 1));
      p.dataset.stage = "0";
      // start at varied heights so the row looks planted, not uniform
      var start = i % 3 === 0 ? 1 : 0;
      p.dataset.stage = String(start);
      p.textContent = STAGES[start];
      garden.appendChild(p);
      plants.push(p);
    }

    function water(plant) {
      var s = Math.min(STAGES.length - 1, (parseInt(plant.dataset.stage, 10) || 0) + 1);
      if (String(s) === plant.dataset.stage) return;
      plant.dataset.stage = String(s);
      plant.textContent = STAGES[s];
      if (!reduceMotion) {
        plant.animate(
          [{ transform: "translateY(4px) scaleY(0.92)" }, { transform: "translateY(0) scaleY(1)" }],
          { duration: 420, easing: "cubic-bezier(0.22,1,0.36,1)" }
        );
      }
    }

    garden.addEventListener("click", function (e) {
      var plant = e.target.closest(".plant");
      if (plant) water(plant);
    });
    garden.addEventListener("mouseover", function (e) {
      var plant = e.target.closest(".plant");
      if (plant) water(plant);
    });

    // Lean toward the pointer
    if (!reduceMotion) {
      window.addEventListener("mousemove", function (e) {
        var rect = garden.getBoundingClientRect();
        if (e.clientY < rect.top - 160 || e.clientY > rect.bottom + 160) return;
        plants.forEach(function (plant) {
          var pr = plant.getBoundingClientRect();
          var dx = e.clientX - (pr.left + pr.width / 2);
          var lean = Math.max(-12, Math.min(12, dx / 22));
          plant.style.transform = "rotate(" + lean.toFixed(2) + "deg)";
        });
      }, { passive: true });
    }
  }


  /* ---- 8. FOOTER LIVE CLOCK + SKY BAND ------------------------------------
     Shows the visitor's own local time, ticking every second, and drives
     the footer's sky gradient + pixel-art sun/moon from that same clock.
     Colors are continuously interpolated between hand-picked keyframes
     (not snapped between buckets) so the sky actually evolves through the
     day rather than jumping. Purely decorative, purely local — no network
     calls, no location access, just the visitor's own system clock.
     --------------------------------------------------------------------- */
  var clockEl = document.getElementById("local-time");
  var skyBand = document.querySelector(".sky-band");
  var skyIcon = document.getElementById("sky-icon");

  // Each keyframe: hour of day, sky colors (top/bottom of the band),
  // whether footer text should be light or dark, and which icon is up.
  var SKY_KEYFRAMES = [
    { h: 0,    top: [5, 6, 15],    bottom: [19, 23, 53],   mode: "dark",  icon: "moon" },
    { h: 4,    top: [7, 10, 26],   bottom: [26, 31, 69],   mode: "dark",  icon: "moon" },
    { h: 5.5,  top: [22, 25, 58],  bottom: [58, 53, 100],  mode: "dark",  icon: "moon" },
    { h: 6.5,  top: [70, 88, 150], bottom: [255, 179, 122],mode: "light", icon: "sun"  },
    { h: 9,    top: [111, 177, 224], bottom: [255, 225, 173], mode: "light", icon: "sun" },
    { h: 12,   top: [79, 163, 224],  bottom: [203, 233, 251], mode: "light", icon: "sun" },
    { h: 15,   top: [90, 168, 221],  bottom: [255, 224, 176], mode: "light", icon: "sun" },
    { h: 17.5, top: [74, 118, 176],  bottom: [255, 159, 107], mode: "light", icon: "sun" },
    { h: 19,   top: [44, 37, 85],    bottom: [122, 74, 120],  mode: "dark",  icon: "moon" },
    { h: 21,   top: [18, 20, 44],    bottom: [38, 42, 82],    mode: "dark",  icon: "moon" },
    { h: 24,   top: [5, 6, 15],      bottom: [19, 23, 53],    mode: "dark",  icon: "moon" }
  ];

  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpRGB(c1, c2, t) {
    return "rgb(" + Math.round(lerp(c1[0], c2[0], t)) + "," +
                     Math.round(lerp(c1[1], c2[1], t)) + "," +
                     Math.round(lerp(c1[2], c2[2], t)) + ")";
  }

  function updateSky() {
    var now = new Date();
    var h = now.getHours() + now.getMinutes() / 60;

    var frames = SKY_KEYFRAMES;
    var a = frames[0], b = frames[frames.length - 1];
    for (var i = 0; i < frames.length - 1; i++) {
      if (h >= frames[i].h && h <= frames[i + 1].h) {
        a = frames[i]; b = frames[i + 1];
        break;
      }
    }
    var t = (h - a.h) / (b.h - a.h);

    if (skyBand) {
      skyBand.style.setProperty("--sky-1", lerpRGB(a.top, b.top, t));
      skyBand.style.setProperty("--sky-2", lerpRGB(a.bottom, b.bottom, t));
      skyBand.setAttribute("data-sky-mode", t < 0.5 ? a.mode : b.mode);
    }

    if (skyIcon) {
      var icon = t < 0.5 ? a.icon : b.icon;
      // Position the icon along its own half of the day: sunrise->sunset
      // for the sun, sunset->sunrise (next day) for the moon.
      var span = icon === "sun" ? [6.5, 19] : [19, 30.5]; // 30.5 = 6.5 + 24
      var hh = h < span[0] ? h + 24 : h;
      var progress = (hh - span[0]) / (span[1] - span[0]);
      progress = Math.max(0, Math.min(1, progress));
      skyIcon.style.setProperty("--sky-icon-pos", (8 + progress * 84) + "%");
      skyIcon.querySelectorAll(".sky-icon__sun, .sky-icon__moon").forEach(function (el) {
        el.style.opacity = el.classList.contains("sky-icon__" + icon) ? "1" : "0";
      });
    }
  }

  if (clockEl || skyBand) {
    var tick = function () {
      if (clockEl) {
        clockEl.textContent = new Date().toLocaleTimeString([], {
          hour: "2-digit", minute: "2-digit", second: "2-digit"
        });
      }
      updateSky();
    };
    tick();
    setInterval(tick, 1000);
  }
})();
