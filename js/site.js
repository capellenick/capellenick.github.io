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
     8. Footer live clock + time-of-day sky (gradient, clouds, stars,
        birds/plane, sun/moon)
     9. Footer frog easter egg — click the sky, a frog falls
    10. Boone, NC weather next to the local-time clock (the only network call)
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
  // Flat color through the day and through the night (top === bottom, so
  // the gradient collapses to a solid fill) — an actual top-to-bottom
  // gradient only forms during the sunrise (5-7) and sunset (17-19)
  // windows, where top and bottom diverge into real sunrise/sunset colors.
  var SKY_KEYFRAMES = [
    { h: 0,  top: [9, 11, 26],    bottom: [9, 11, 26],     mode: "dark",  icon: "moon" },
    { h: 5,  top: [9, 11, 26],    bottom: [9, 11, 26],     mode: "dark",  icon: "moon" },
    { h: 6,  top: [72, 92, 152],  bottom: [255, 178, 120], mode: "light", icon: "sun"  },
    { h: 7,  top: [92, 168, 227], bottom: [92, 168, 227],  mode: "light", icon: "sun"  },
    { h: 17, top: [92, 168, 227], bottom: [92, 168, 227],  mode: "light", icon: "sun"  },
    { h: 18, top: [68, 86, 148],  bottom: [255, 142, 96],  mode: "light", icon: "sun"  },
    { h: 19, top: [9, 11, 26],    bottom: [9, 11, 26],     mode: "dark",  icon: "moon" },
    { h: 24, top: [9, 11, 26],    bottom: [9, 11, 26],     mode: "dark",  icon: "moon" }
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
      // Stars hidden during peak daylight (7am-6pm); visible dusk through dawn.
      // Birds/plane are the inverse: daytime only.
      var isDaylight = h >= 7 && h < 18;
      skyBand.setAttribute("data-stars", isDaylight ? "hidden" : "visible");
      skyBand.setAttribute("data-daytime", isDaylight ? "day" : "night");
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


  /* ---- 9. FOOTER FROG EASTER EGG ------------------------------------------
     Click anywhere in the sky band that isn't a real link (Email/LinkedIn/
     Instagram still work normally) and a small pixel tree frog appears at
     the click point and free-falls off the bottom of the screen under
     gravity, tumbling a little, then removes itself. Skipped entirely for
     reduced-motion visitors — clicking does nothing rather than force
     motion on someone who asked not to see it.
     --------------------------------------------------------------------- */
  if (skyBand && !reduceMotion) {
    // A climbing/reaching pose (splayed hand up top-left, round head with
    // red eyes upper-right, diagonal body, bent trailing leg) instead of
    // the old symmetric squat frog.
    var FROG_SVG =
      '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">' +
      '<g fill="#4caf6b">' +
      '<rect x="3" y="0" width="1" height="1"/>' +
      '<rect x="1" y="1" width="1" height="1"/><rect x="5" y="1" width="1" height="1"/>' +
      '<rect x="0" y="2" width="1" height="1"/><rect x="6" y="2" width="1" height="1"/>' +
      '<rect x="7" y="3" width="1" height="1"/>' +
      '<rect x="3" y="4" width="1" height="1"/><rect x="8" y="4" width="1" height="1"/>' +
      '<rect x="4" y="5" width="1" height="1"/><rect x="9" y="5" width="2" height="1"/>' +
      '<rect x="5" y="6" width="1" height="1"/><rect x="8" y="6" width="1" height="1"/><rect x="11" y="6" width="1" height="1"/>' +
      '<rect x="6" y="7" width="3" height="1"/><rect x="11" y="7" width="1" height="1"/>' +
      '<rect x="7" y="8" width="5" height="1"/>' +
      '<rect x="8" y="9" width="3" height="1"/>' +
      '<rect x="7" y="10" width="3" height="1"/>' +
      '<rect x="6" y="11" width="3" height="1"/>' +
      '<rect x="5" y="12" width="3" height="1"/>' +
      '<rect x="5" y="13" width="2" height="1"/>' +
      '<rect x="4" y="14" width="2" height="1"/>' +
      '<rect x="3" y="15" width="1" height="1"/><rect x="5" y="15" width="1" height="1"/>' +
      '</g>' +
      '<g fill="#e63946">' +
      '<rect x="9" y="6" width="2" height="1"/><rect x="9" y="7" width="2" height="1"/>' +
      '</g>' +
      '</svg>';

    skyBand.addEventListener("click", function (e) {
      if (e.target.closest("a")) return; // real links keep working

      var startX = e.clientX - 19, startY = e.clientY - 19;
      var frog = document.createElement("div");
      frog.className = "frog";
      frog.innerHTML = FROG_SVG;
      frog.style.left = startX + "px";
      frog.style.top = startY + "px";
      document.body.appendChild(frog);

      var vy = 0;
      var vx = (Math.random() - 0.5) * 3;
      var rot = 0;
      var spin = (Math.random() - 0.5) * 16;
      var dx = 0, dy = 0;
      var gravity = 0.3;   /* lower = slower, more floaty fall */

      (function fall() {
        vy += gravity;
        dx += vx;
        dy += vy;
        rot += spin;
        frog.style.transform = "translate(" + dx + "px," + dy + "px) rotate(" + rot + "deg)";
        if (startY + dy < window.innerHeight + 80) {
          requestAnimationFrame(fall);
        } else {
          frog.remove();
        }
      })();
    });
  }


  /* ---- 10. BOONE, NC WEATHER ----------------------------------------------
     The one part of this site that talks to the network. Fetches current
     conditions for Boone, NC (fixed location, not the visitor's — see the
     conversation this was built from) from Open-Meteo: free, no API key,
     no sign-up, and its rate limits (generous, ~10k calls/day) are a
     non-issue for one lightweight poll per open tab every 10 minutes.
     Shown next to the local-time clock. Fails quietly — on a network error
     or if the API is ever down, the weather text just stays blank rather
     than breaking anything else on the page.
     --------------------------------------------------------------------- */
  var weatherEl = document.getElementById("footer-weather");
  if (weatherEl) {
    var WEATHER_CODES = {
      0: "Clear", 1: "Mostly Clear", 2: "Partly Cloudy", 3: "Overcast",
      45: "Foggy", 48: "Foggy",
      51: "Drizzle", 53: "Drizzle", 55: "Drizzle", 56: "Freezing Drizzle", 57: "Freezing Drizzle",
      61: "Light Rain", 63: "Rain", 65: "Heavy Rain", 66: "Freezing Rain", 67: "Freezing Rain",
      71: "Light Snow", 73: "Snow", 75: "Heavy Snow", 77: "Snow",
      80: "Rain Showers", 81: "Rain Showers", 82: "Heavy Showers",
      85: "Snow Showers", 86: "Snow Showers",
      95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm"
    };
    var WEATHER_URL =
      "https://api.open-meteo.com/v1/forecast?latitude=36.2168&longitude=-81.6746" +
      "&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FNew_York";

    var fetchWeather = function () {
      fetch(WEATHER_URL)
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
          if (!data || !data.current) return;
          var temp = Math.round(data.current.temperature_2m);
          var label = WEATHER_CODES[data.current.weather_code] || "";
          weatherEl.textContent = " · " + temp + "°F" + (label ? ", " + label : "");
        })
        .catch(function () { /* offline, blocked, or the API's down — stay blank */ });
    };

    fetchWeather();
    setInterval(fetchWeather, 10 * 60 * 1000);
  }
})();
