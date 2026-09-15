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
     8. Footer live clock
     9. Home page filter tabs (Featured / Role / Year / Type / All)
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
    themeBtn.setAttribute("aria-pressed", String(dark));
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

    // Smooth trailing follow
    (function loop() {
      cx += (x - cx) * 0.2;
      cy += (y - cy) * 0.2;
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


  /* ---- 8. FOOTER LIVE CLOCK ----------------------------------------------
     Shows the visitor's own local time (not a fixed timezone), ticking
     every second. Purely decorative — nouvelleidee.work-style footer detail.
     --------------------------------------------------------------------- */
  var clockEl = document.getElementById("local-time");
  if (clockEl) {
    var tick = function () {
      clockEl.textContent = new Date().toLocaleTimeString([], {
        hour: "2-digit", minute: "2-digit", second: "2-digit"
      });
    };
    tick();
    setInterval(tick, 1000);
  }


  /* ---- 9. HOME PAGE FILTER TABS -------------------------------------------
     Featured / All filter directly. Role, Year and Type open a flyout of the
     values present on the cards below (read from data-value on each menu
     button); picking one filters .work-card elements by the matching
     data-role / data-year / data-type attribute.
     --------------------------------------------------------------------- */
  var filterBar = document.querySelector(".work-filters");
  if (filterBar) {
    var cards = document.querySelectorAll(".work-card");
    var directTabs = filterBar.querySelectorAll(".filter-tab[data-filter]");
    var groups = filterBar.querySelectorAll(".filter-group");

    function closeMenus() {
      groups.forEach(function (g) {
        g.querySelector(".filter-menu").hidden = true;
        g.querySelector(".filter-tab").setAttribute("aria-expanded", "false");
      });
    }

    function clearActive() {
      filterBar.querySelectorAll(".filter-tab").forEach(function (t) {
        t.classList.remove("is-active");
      });
      groups.forEach(function (g) {
        var tab = g.querySelector(".filter-tab");
        tab.textContent = tab.dataset.label;
        g.querySelectorAll(".filter-menu button").forEach(function (b) {
          b.classList.remove("is-active");
        });
      });
    }

    function applyFilter(kind, value) {
      cards.forEach(function (card) {
        var show =
          kind === "all" ? true :
          kind === "featured" ? card.dataset.featured === "true" :
          card.dataset[kind] === value;
        card.hidden = !show;
      });
    }

    directTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        clearActive();
        tab.classList.add("is-active");
        closeMenus();
        applyFilter(tab.dataset.filter, null);
      });
    });

    groups.forEach(function (group) {
      var tab = group.querySelector(".filter-tab");
      var menu = group.querySelector(".filter-menu");

      tab.addEventListener("click", function (e) {
        e.stopPropagation();
        var willOpen = menu.hidden;
        closeMenus();
        menu.hidden = !willOpen;
        tab.setAttribute("aria-expanded", String(willOpen));
      });

      menu.querySelectorAll("button").forEach(function (item) {
        item.addEventListener("click", function () {
          clearActive();
          tab.classList.add("is-active");
          tab.textContent = item.textContent;
          item.classList.add("is-active");
          closeMenus();
          applyFilter(group.dataset.group, item.dataset.value);
        });
      });
    });

    document.addEventListener("click", function (e) {
      if (!filterBar.contains(e.target)) closeMenus();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenus();
    });

    // Apply whichever tab starts marked .is-active in the HTML (Featured, by default)
    var initialTab = filterBar.querySelector(".filter-tab.is-active[data-filter]");
    if (initialTab) applyFilter(initialTab.dataset.filter, null);
  }
})();
