/* ==========================================================================
   CHLADNI — footer game. The Play page's cymatics panel (play/index.html),
   stretched to fill the footer, with the sound taken out.

   On the Play page the plate listens to the synth's actual audio: an FFT
   finds the sound's partials and every plate mode rings in response. Here
   nothing is played, so each click works out the partials that key *would*
   have produced and feeds them to the same plate model directly. The knobs
   are fixed where they sat in the reference screenshot:
       warble 18, tone 4000 Hz, echo 0.25, length 1  (all defaults)
       ring 1 (fully up) — ring modulation adds tones 1600 Hz above and below
       each note, so several modes ring at once and the figures overlap.
   Everything downstream — mode response, sand physics, colour hand-over,
   LED drawing — is the Play page's code. The plate stays square (see
   layout): mirrored copies fill a wide footer; a phone shows one square.

   Click anywhere: another key "plays", the colours change to its
   plate/sand pair, and the sand finds the new figure. Pairs are dealt from
   a shuffled deck, so all six show before any repeats.
   Runs only while Chladni is the footer mode and the footer is on screen.
   Reduced motion: no opening figure; the plate waits for a click.
   ========================================================================== */
(function () {
  "use strict";

  var band = document.querySelector(".sky-band");
  var stage = band && band.querySelector(".chladni-stage");
  var cv = stage && stage.querySelector("canvas");
  if (!cv) return;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  var lerp = function (a, b, f) { return a + (b - a) * f; };
  var mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
  var hexRGB = function (h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); };

  /* ---- fixed knob settings (see top) ---- */
  var K = { warble: 18, tone: 4000, echo: 0.25, length: 1, ring: 1 };
  var RING_HZ = 40 * Math.pow(40, K.ring);        // carrier: 40 Hz -> 1.6 kHz
  var RING_DRY = 1 - 0.8 * K.ring, RING_WET = K.ring * 1.1;
  var ECHO_WET = K.echo * 0.7, ECHO_FB = 0.12 + K.echo * 0.6, ECHO_T = 0.34;

  /* ---- the six keys: same sounds' colour pairs as the Play page ---- */
  var THEMES = [
    { key: "sine",   plate: "#3a6eaf", sand: "#40a288" }, // blue / green
    { key: "tri",    plate: "#42a389", sand: "#d88faa" }, // green / pink
    { key: "warble", plate: "#d4645f", sand: "#3b6db0" }, // red / blue
    { key: "chord",  plate: "#e7b35f", sand: "#bf5353" }, // ochre / red
    { key: "sweep",  plate: "#88b1da", sand: "#d55e57" }, // sky / red
    { key: "buzz",   plate: "#6b6aa5", sand: "#ef9f6b" }  // violet / peach
  ];
  var START_THEME = 1;   // green / pink: every page load opens on this pair

  /* ---- plate modes (Play page) ---- */
  var G = 128, MAXN = 14, C = 40, Q = 80;   // field a little finer than the Play page's 96, to suit the denser LED grid
  var cosT = [];
  for (var n = 0; n <= MAXN; n++) {
    cosT[n] = new Float32Array(G);
    for (var i = 0; i < G; i++) cosT[n][i] = Math.cos(n * Math.PI * (i + 0.5) / G);
  }
  var MODES = [];
  for (n = 0; n <= MAXN; n++) for (var m = 0; m <= n; m++) {
    var k2 = n * n + m * m; if (k2 < 2) continue;
    (n === m ? [1] : [1, -1]).forEach(function (s) {
      MODES.push({ n: n, m: m, s: s, f: C * k2 * (s > 0 ? 1.03 : 1), w: 0 });
    });
  }
  var E = new Float32Array(G * G);

  var SCALE = [0, 2, 3, 5, 7, 9, 10];
  var ROOT = pick([45, 48, 50, 52]);
  function nearestMode(f) {
    var b = null, d = Infinity;
    MODES.forEach(function (md) { var x = Math.abs(Math.log(md.f / f)); if (x < d) { d = x; b = md; } });
    return b;
  }
  function note(lo, hi) {
    var d = Math.floor(rand(lo, hi));
    return ROOT + 12 * Math.floor(d / 7) + SCALE[((d % 7) + 7) % 7];
  }
  // random pitch tuned to a resonance whose shape wasn't one of the last few
  var recent = [];
  function fresh(lo, hi) {
    var md;
    for (var t = 0; t < 12; t++) {
      md = nearestMode(mtof(note(lo, hi)));
      if (!recent.some(function (r) { return r.n === md.n && r.m === md.m; })) break;
    }
    recent.push(md); if (recent.length > 5) recent.shift();
    return md.f;
  }

  /* ---- "voices": what each key would play, as partials over time ----
     parts(tt) -> [[freq, amp], ...] before warble / ring / tone. */
  function voice(key) {
    var L = K.length;
    switch (key) {
      case "sine": {
        var f = fresh(5, 26);
        return { len: 2.6 * L, a: 0.04, peak: 0.5, parts: function () { return [[f, 1]]; } };
      }
      case "tri": {
        var ft = fresh(5, 22);   // triangle: odd harmonics at 1/n²
        return { len: 2.6 * L, a: 0.04, peak: 0.5, parts: function () {
          return [[ft, 1], [3 * ft, 1 / 9], [5 * ft, 1 / 25], [7 * ft, 1 / 49]]; } };
      }
      case "warble": {
        var fw = fresh(5, 22), rate = rand(3, 7), depth = rand(40, 120);
        return { len: 2.8 * L, a: 0.06, peak: 0.5, parts: function (tt) {
          return [[fw * Math.pow(2, depth * Math.sin(2 * Math.PI * rate * tt) / 1200), 1]]; } };
      }
      case "chord": {
        var base = Math.floor(rand(4, 14));
        var fc = [0, 2, 4].map(function (s) {
          var d = base + s;
          return nearestMode(mtof(ROOT + 12 * Math.floor(d / 7) + SCALE[d % 7])).f;
        });
        return { len: 2.8 * L, a: 0.08, peak: 0.22, parts: function () {
          return fc.map(function (x) { return [x, 1]; }); } };
      }
      case "sweep": {
        var up = Math.random() < 0.5, f0 = rand(90, 160), f1 = rand(700, 1400);
        var from = up ? f0 : f1, to = up ? f1 : f0, lenS = 3.4 * L;
        return { len: lenS, a: 0.05, peak: 0.4, parts: function (tt) {
          return [[from * Math.pow(to / from, clamp(tt / lenS, 0, 1)), 1]]; } };
      }
      default: {   // buzz: saw + square, low, through a resonant lowpass
        var fb = mtof(note(-7, 1)), cut = rand(900, 2200), list = [];
        for (var h = 1; fb * h < 9000; h++) {
          var r = fb * h / cut, lp = 1 / Math.sqrt((1 - r * r) * (1 - r * r) + (r / 2) * (r / 2));
          list.push([fb * h, ((h % 2 ? 2 : 1) / h) * lp * 0.5]);
        }
        return { len: 2.4 * L, a: 0.03, peak: 0.35, parts: function () { return list; } };
      }
    }
  }

  // The Play page's envelope: ramp to peak, ease to 70%, release after len.
  function env(v, tt) {
    if (tt < 0 || tt > v.len + 1.5) return 0;
    if (tt < v.a) return v.peak * tt / v.a;
    var sus = 0.7 * v.peak + 0.3 * v.peak * Math.exp(-(Math.min(tt, v.len) - v.a) / (v.len * 0.4));
    return tt < v.len ? sus : sus * Math.exp(-(tt - v.len) / 0.25);
  }
  // plus the echo: repeats every 0.34s, each quieter
  function envEcho(v, tt) {
    var e = env(v, tt);
    for (var k = 1; k <= 5; k++) e += ECHO_WET * Math.pow(ECHO_FB, k - 1) * env(v, tt - ECHO_T * k);
    return e;
  }

  var voices = [];
  var bf = [], bp = [];
  var rms = 0;

  // Gather this moment's partials across all sounding voices, the way the
  // Play page's FFT would see them after warble, ring mod and the tone filter.
  function spectrum(now) {
    bf.length = 0; bp.length = 0;
    var t = now / 1000, power = 0;
    var detune = Math.pow(2, (K.warble * Math.sin(2 * Math.PI * 5.2 * t) +
                              K.warble * 0.8 * Math.sin(2 * Math.PI * 0.4 * t)) / 1200);
    for (var vi = voices.length - 1; vi >= 0; vi--) {
      var v = voices[vi], tt = t - v.t0;
      if (tt > v.len + 1.5 + ECHO_T * 5) { voices.splice(vi, 1); continue; }
      var e = envEcho(v, tt);
      if (e < 1e-4) continue;
      v.parts(tt).forEach(function (p) {
        var f = p[0] * detune, a = p[1] * e;
        [[f, RING_DRY * a], [f + RING_HZ, RING_WET * a / 2], [Math.abs(f - RING_HZ), RING_WET * a / 2]]
          .forEach(function (q) {
            if (q[0] < 20) return;
            var amp = q[1] / Math.sqrt(1 + Math.pow(q[0] / K.tone, 4));   // tone: 12 dB/oct lowpass
            bf.push(q[0]); bp.push(amp * amp);
            power += amp * amp / 2;
          });
      });
    }
    // loudness the analyser would read after the input gain and compressor
    var raw = Math.sqrt(power) * 0.8, TH = 0.158;
    return raw > TH ? TH * Math.pow(raw / TH, 0.25) : raw;
  }

  /* ---- plate response (Play page updatePlate, fed directly) ---- */
  function updatePlate(now, dt) {
    rms = lerp(rms, spectrum(now), 1 - Math.pow(0.7, dt));
    var best = 0;
    for (var i = 0; i < bp.length; i++) if (bp[i] > best) best = bp[i];
    var wMax = 0, f = 1 - Math.pow(0.8, dt);
    MODES.forEach(function (md) {
      var w = 0;
      for (var i = 0; i < bf.length; i++) {
        if (bp[i] < best * 3e-5) continue;   // below the FFT's 45 dB window
        var r = bf[i] / md.f; if (r < 0.7 || r > 1.4) continue;
        var d = 1 - r * r; w += bp[i] / (d * d + (r / Q) * (r / Q));
      }
      md.w = lerp(md.w, w, f);   // plates ring up and down, they don't switch instantly
      if (md.w > wMax) wMax = md.w;
    });
    if (wMax < 1e-12) return;

    var act = MODES.filter(function (md) { return md.w > wMax * 0.12; })
                   .sort(function (a, b) { return b.w - a.w; }).slice(0, 6);
    E.fill(0);
    act.forEach(function (md) {
      var w = md.w / wMax, cn = cosT[md.n], cm = cosT[md.m];
      for (var j = 0; j < G; j++) for (var i = 0; i < G; i++) {
        var phi = cn[i] * cm[j] + md.s * cm[i] * cn[j];
        E[j * G + i] += w * phi * phi;
      }
    });
    var eMax = 0;
    for (i = 0; i < E.length; i++) if (E[i] > eMax) eMax = E[i];
    if (eMax > 0) for (i = 0; i < E.length; i++) E[i] /= eMax;
  }

  /* ---- sand + colour (Play page), on one square plate ---- */
  var cols = 0, rows = 0, GRAINS = 0, gx, gy, owner, cnt, votes;
  var theme = START_THEME;
  var RGB = THEMES.map(function (t) { return { plate: hexRGB(t.plate), sand: hexRGB(t.sand) }; });
  var themeAct = new Float32Array(THEMES.length), until = new Float64Array(THEMES.length);
  var plate = RGB[theme].plate.slice();

  function moveSand() {
    var drive = clamp(rms * 9, 0, 1.6);
    if (drive < 0.02) return;
    var TH = 0.18;   // grains only leave the plate when its acceleration beats gravity
    for (var k = 0; k < GRAINS; k++) {
      var i = Math.min(G - 1, gx[k] * G | 0), j = Math.min(G - 1, gy[k] * G | 0), c = j * G + i;
      var acc = Math.sqrt(E[c]) * drive;
      if (acc < TH) continue;
      var hop = (acc - TH) * 0.018;
      var dx = E[j * G + Math.min(G - 1, i + 1)] - E[j * G + Math.max(0, i - 1)];
      var dy = E[Math.min(G - 1, j + 1) * G + i] - E[Math.max(0, j - 1) * G + i];
      var x = gx[k] + (Math.random() * 2 - 1) * hop - dx * hop * 1.6;
      var y = gy[k] + (Math.random() * 2 - 1) * hop - dy * hop * 1.6;
      if (x < 0) x = -x; else if (x > 1) x = 2 - x;
      if (y < 0) y = -y; else if (y > 1) y = 2 - y;
      gx[k] = clamp(x, 0, 0.9999); gy[k] = clamp(y, 0, 0.9999);
      var o = owner[k];
      if (o !== theme && Math.random() < 0.15 * (1 - 0.92 * themeAct[o])) owner[k] = theme;
    }
  }

  function updateColour(now) {
    for (var i = 0; i < THEMES.length; i++) themeAct[i] = lerp(themeAct[i], now < until[i] ? 1 : 0, 0.05);
    var tp = RGB[theme].plate;
    for (var c = 0; c < 3; c++) plate[c] = lerp(plate[c], tp[c], 0.06);
    for (var k = 0; k < GRAINS; k++) {
      var o = owner[k];
      if (o !== theme && Math.random() < 0.002 + (1 - themeAct[o]) * 0.04) owner[k] = theme;
    }
  }

  /* ---- LED drawing ---- */
  var cx = cv.getContext("2d");
  var off = document.createElement("canvas"), ox = off.getContext("2d"), img;
  var mask = document.createElement("canvas");
  var PITCH = 8, MAX_COLS = 240;    // CSS px per LED (grows on very wide screens)

  /* The plate stays square, as on the Play page, so the figures keep its
     symmetry. Landscape: the plate is the footer's height, and copies of it
     run side by side, each one mirrored — a free-edge plate's figure meets its
     own reflection seamlessly at the edge — centred on the middle of the
     footer. Portrait (phones): one whole square, the footer's width,
     centred vertically, with unlit LEDs above and below.
     mapC/mapR: footer LED column/row -> plate LED column/row (-1 = unlit). */
  var P = 0, mapC, mapR, sq;
  var OFF = [36, 36, 39];   // unlit LED

  function fold(u) {          // mirror-repeat any position into the plate's 0..1
    u = ((u % 2) + 2) % 2;
    return u > 1 ? 2 - u : u;
  }

  function layout() {
    var box = stage.getBoundingClientRect();
    if (!box.width || !box.height) return false;
    var c = Math.min(MAX_COLS, Math.round(box.width / PITCH));
    var cell = box.width / c, r = Math.max(1, Math.round(box.height / cell));
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = mask.width = Math.round(box.width * dpr);
    cv.height = mask.height = Math.round(box.height * dpr);
    var mx = mask.getContext("2d"), cw = cv.width / c, ch = cv.height / r;
    mx.fillStyle = "#1a1a1c"; mx.fillRect(0, 0, mask.width, mask.height);   // device-body colour between LEDs
    mx.globalCompositeOperation = "destination-out";
    for (var y = 0; y < r; y++) for (var x = 0; x < c; x++) {
      mx.beginPath(); mx.arc((x + 0.5) * cw, (y + 0.5) * ch, Math.min(cw, ch) * 0.4, 0, Math.PI * 2); mx.fill();
    }
    if (c !== cols || r !== rows) {
      cols = c; rows = r;
      var tiled = cols >= rows;
      P = tiled ? rows : cols;
      mapC = new Int32Array(cols); mapR = new Int32Array(rows);
      var top = Math.floor((rows - P) / 2);
      for (var i = 0; i < cols; i++) {
        mapC[i] = tiled ? Math.min(P - 1, fold((i + 0.5 - cols / 2) / P + 0.5) * P | 0) : i;
      }
      for (var j = 0; j < rows; j++) {
        var pr = tiled ? j : j - top;
        mapR[j] = pr >= 0 && pr < P ? pr : -1;
      }
      // ~3 grains per plate LED, as on the Play page (12000 for 64×64)
      GRAINS = Math.round(P * P * 12000 / 4096);
      gx = new Float32Array(GRAINS); gy = new Float32Array(GRAINS);
      owner = new Uint8Array(GRAINS).fill(theme);
      for (var k = 0; k < GRAINS; k++) { gx[k] = Math.random(); gy[k] = Math.random(); }
      cnt = new Uint16Array(P * P);
      votes = new Uint16Array(P * P * THEMES.length);
      sq = new Uint8ClampedArray(P * P * 3);
      off.width = cols; off.height = rows;
      img = ox.createImageData(cols, rows);
    }
    return true;
  }

  function draw() {
    var T = THEMES.length;
    cnt.fill(0); votes.fill(0);
    for (var k = 0; k < GRAINS; k++) {
      var c = (gy[k] * P | 0) * P + (gx[k] * P | 0);
      cnt[c]++; votes[c * T + owner[k]]++;
    }
    // colour each plate LED once…
    for (var i = 0; i < P * P; i++) {
      var f = clamp((cnt[i] - 2) / 5, 0, 1), best = 0;
      for (var t = 1; t < T; t++) if (votes[i * T + t] > votes[i * T + best]) best = t;
      var sd = RGB[best].sand;
      for (var ch = 0; ch < 3; ch++) sq[i * 3 + ch] = lerp(plate[ch], sd[ch], f);
    }
    // …then lay the (mirrored) plate across the footer's LEDs
    var d = img.data;
    for (var y = 0, j = 0; y < rows; y++) {
      var pr = mapR[y];
      for (var x = 0; x < cols; x++, j += 4) {
        if (pr < 0) { d[j] = OFF[0]; d[j + 1] = OFF[1]; d[j + 2] = OFF[2]; }
        else { var s3 = (pr * P + mapC[x]) * 3; d[j] = sq[s3]; d[j + 1] = sq[s3 + 1]; d[j + 2] = sq[s3 + 2]; }
        d[j + 3] = 255;
      }
    }
    ox.putImageData(img, 0, 0);
    cx.imageSmoothingEnabled = false;
    cx.drawImage(off, 0, 0, cv.width, cv.height);
    cx.drawImage(mask, 0, 0);
  }

  /* ---- footer text colour: whichever reads better on this plate ---- */
  function ink() {
    // LEDs cover about half the panel; the rest is the dark case
    var p = RGB[theme].plate.map(function (v, i) { return 0.5 * v + 0.5 * [26, 26, 28][i]; });
    var lum = function (rgb) {
      return rgb.reduce(function (s, v, i) {
        v /= 255; v = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        return s + [0.2126, 0.7152, 0.0722][i] * v;
      }, 0);
    };
    var L = lum(p), dark = lum([20, 22, 30]);
    var cDark = (L + 0.05) / (dark + 0.05), cLight = 1.05 / (L + 0.05);
    if (window.FooterModes) window.FooterModes.setInk("chladni", cDark > cLight ? "dark" : "light");
  }

  function hit(i) {
    var v = voice(THEMES[i].key);
    v.t0 = performance.now() / 1000;
    voices.push(v);
    theme = i;
    until[i] = performance.now() + 2.8 * K.length * 1000;
    ink();
  }

  // Colour pairs come from a shuffled deck: every pair shows once before any
  // repeats, and a fresh deck never starts with the pair just on screen.
  var deck = [];
  function nextTheme() {
    if (!deck.length) {
      deck = THEMES.map(function (t, i) { return i; }).filter(function (i) { return i !== theme; });
      for (var i = deck.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1)), t = deck[i]; deck[i] = deck[j]; deck[j] = t;
      }
      deck.push(theme);   // the current pair goes last, so it can't come straight back
    }
    return deck.shift();
  }

  stage.addEventListener("pointerdown", function () {
    hit(nextTheme());
    start();
  });

  /* ---- run only while it's the footer mode and on screen ---- */
  var running = false, visible = false, started = false, last = 0;
  function active() { return band.getAttribute("data-footer-mode") === "chladni" && visible; }

  function frame(now) {
    if (!active()) { running = false; return; }
    var dt = Math.min((now - last) / (1000 / 60), 3); last = now;
    updatePlate(now, dt);
    updateColour(now);
    var steps = Math.max(1, Math.round(2 * dt));   // two settling steps per 60fps frame
    for (var s = 0; s < steps; s++) moveSand();
    draw();
    requestAnimationFrame(frame);
  }
  function start() {
    if (running || !active() || !layout()) return;
    if (!started) {
      started = true;
      ink();
      if (!reduceMotion) hit(START_THEME);   // open on a figure
    }
    running = true; last = performance.now();
    requestAnimationFrame(frame);
  }

  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    start();
  }).observe(band);
  new MutationObserver(start).observe(band, { attributes: true, attributeFilter: ["data-footer-mode"] });
  new ResizeObserver(function () { if (cols && layout()) draw(); }).observe(stage);
  ink();
})();
