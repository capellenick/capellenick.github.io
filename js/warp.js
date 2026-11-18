/* ==========================================================================
   SCROLL WARP — homepage project images bend as they scroll in from the
   bottom of the window, after raggededge.com.

   Their effect (read from their bundle): one full-screen pass over the
   imagery that pulls each pixel's sample point toward the centre of the
   window, by an amount that rises steeply in the bottom few percent:
       uv.x += (uv.x * 2 - 1) * -0.05 * pow(distance-from-top, 34)
   so an image flares out (up to ~11% wider at the very bottom edge) as it
   enters, then settles flat as it rises. It's fixed to the window, not to
   scroll speed — the motion comes from the images passing through it.

   Here each card gets its own small WebGL canvas, laid over .card-media and
   a little wider than it (the flare spills sideways). Being in the page
   rather than a fixed overlay, it scrolls natively with no lag; the shader
   only needs to know where on screen it currently is. The rounded corners
   (--radius-img) and the hover zoom (1.05 over 0.3s, ease-out) are redone
   in the shader, since the real <img> underneath is hidden.

   Wheel/trackpad scrolling on the page is smoothed too (see "Smooth scroll"
   below) — that's what keeps the bend steady instead of shimmering.

   Desktop only (fine pointer), like theirs. Touch, reduced motion, or no
   WebGL: nothing happens and the plain images stay. Loaded by index.html.
   ========================================================================== */
(function () {
  "use strict";

  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var STRENGTH = 0.05;    // raggededge.com's values
  var DISTANCE = 34;
  var BLEED = 0.06;       // canvas overhang each side, as a fraction of the window width (max flare ~5.6%)
  var ZOOM = 1.05;        // hover, same as --zoom
  var ZOOM_MS = 300;

  var VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  var FRAG = [
    "precision highp float;",
    "uniform sampler2D uTex;",
    "uniform vec2 uRes;",       // canvas size, device px
    "uniform float uDpr;",
    "uniform vec2 uCanvas;",    // canvas top-left on screen, CSS px
    "uniform vec2 uView;",      // window size, CSS px
    "uniform vec4 uMedia;",     // frame left, top (screen), width, height — CSS px
    "uniform vec2 uCover;",     // object-fit: cover scale for x, y
    "uniform vec2 uPos;",       // object-position, 0-1 (0.5 = centred)
    "uniform float uRadius;",
    "uniform float uScale;",
    "void main(){",
    "  vec2 s = uCanvas + vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;",
    "  float f = pow(clamp(s.y / uView.y, 0., 1.), " + DISTANCE.toFixed(1) + ");",
    "  float ux = s.x / uView.x;",
    "  ux += (ux * 2. - 1.) * " + (-STRENGTH).toFixed(3) + " * f;",
    "  s.x = ux * uView.x;",
    "  vec2 m = s - uMedia.xy;",
    "  vec2 h = uMedia.zw * .5;",
    "  vec2 q = abs(m - h) - h + uRadius;",
    "  float d = length(max(q, 0.)) + min(max(q.x, q.y), 0.) - uRadius;",
    "  float alpha = clamp(.5 - d * uDpr, 0., 1.);",
    // Always sample, then cut with alpha. An early return for pixels outside
    // the rounded rect breaks the GPU's mipmap-level estimate on the pixels
    // right at the edge, which then sample a tiny averaged mip and draw a
    // hairline in the image's average colour around every card.
    "  vec2 uv = (m / uMedia.zw - .5) * uCover / uScale + .5 + (uPos - .5) * (1. - uCover);",
    "  vec4 c = texture2D(uTex, uv);",
    "  gl_FragColor = vec4(c.rgb * alpha, alpha);",
    "}"
  ].join("\n");

  function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }

  // A card can carry a light and a dark version (.for-light / .for-dark);
  // use whichever the current theme shows.
  function pickImg(media) {
    var imgs = media.querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++) {
      if (getComputedStyle(imgs[i]).display !== "none") return imgs[i];
    }
    return imgs[0];
  }

  function Card(link) {
    this.link = link;
    this.media = link.querySelector(".card-media");
    this.img = this.media && pickImg(this.media);
    this.zoomFrom = 1; this.zoomTo = 1; this.zoomStart = 0;
    this.last = "";
  }

  Card.prototype.init = function () {
    var self = this, img = this.img;
    var canvas = document.createElement("canvas");
    canvas.className = "card-warp";
    canvas.setAttribute("aria-hidden", "true");
    var opts = { premultipliedAlpha: true, antialias: false, alpha: true };
    var gl = canvas.getContext("webgl2", opts) || canvas.getContext("webgl", opts);
    if (!gl) return false;

    function shader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      return s;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.gl = gl;
    this.upload(img);

    this.u = {};
    ["uRes", "uDpr", "uCanvas", "uView", "uMedia", "uCover", "uPos", "uRadius", "uScale"].forEach(function (n) {
      self.u[n] = gl.getUniformLocation(prog, n);
    });
    this.gl = gl;
    this.canvas = canvas;

    canvas.addEventListener("webglcontextlost", function () {
      self.media.classList.remove("is-warped");
      canvas.remove();
      self.gl = null;
    });
    this.link.addEventListener("mouseenter", function () { self.zoom(ZOOM); });
    this.link.addEventListener("mouseleave", function () { self.zoom(1); });

    this.link.appendChild(canvas);
    this.layout();
    this.draw(true);
    this.media.classList.add("is-warped");
    return true;
  };

  Card.prototype.zoom = function (to) {
    this.zoomFrom = this.scale();
    this.zoomTo = to;
    this.zoomStart = performance.now();
  };
  Card.prototype.scale = function () {
    var t = Math.min((performance.now() - this.zoomStart) / ZOOM_MS, 1);
    return this.zoomFrom + (this.zoomTo - this.zoomFrom) * easeOutQuad(t);
  };

  // Size and place the canvas over the frame, overhanging each side.
  // (Re)load the card's image into its texture.
  Card.prototype.upload = function (img) {
    var gl = this.gl;
    this.img = img;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    if (window.WebGL2RenderingContext && gl instanceof WebGL2RenderingContext) {
      // Mipmaps (WebGL2 allows them on any size) keep the 2000px source
      // from shimmering when it's drawn much smaller.
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  };

  // Theme switched: cards with a light/dark pair swap to the other image.
  Card.prototype.retheme = function () {
    if (!this.gl) return;
    var next = pickImg(this.media);
    if (next === this.img) return;
    var self = this;
    var go = function () { self.upload(next); self.layout(); self.draw(true); };
    if (next.complete && next.naturalWidth) go();
    else { next.loading = "eager"; next.addEventListener("load", go, { once: true }); }
  };

  Card.prototype.layout = function () {
    var w = this.media.offsetWidth, h = this.media.offsetHeight;
    var bleed = Math.ceil(window.innerWidth * BLEED);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var c = this.canvas;
    c.style.left = -bleed + "px";
    c.style.width = (w + bleed * 2) + "px";
    c.style.height = h + "px";
    c.width = Math.round((w + bleed * 2) * dpr);
    c.height = Math.round(h * dpr);
    this.dpr = dpr;
    this.radius = parseFloat(getComputedStyle(this.media).borderTopLeftRadius) || 0;
    var ia = this.img.naturalWidth / this.img.naturalHeight, ma = w / h;
    this.cover = ia > ma ? [ma / ia, 1] : [1, ia / ma];
    // Follow the image's CSS object-position (percentages; "center" = 50%),
    // so a card can be framed off-centre in CSS and the warp matches it.
    this.pos = getComputedStyle(this.img).objectPosition.split(" ").map(function (v) {
      var n = parseFloat(v);
      return isNaN(n) ? 0.5 : n / 100;
    });
    if (this.pos.length < 2) this.pos = [0.5, 0.5];
    this.gl.viewport(0, 0, c.width, c.height);
    this.last = "";
  };

  Card.prototype.draw = function (force) {
    var gl = this.gl;
    if (!gl) return;
    var cr = this.canvas.getBoundingClientRect();
    var mr = this.media.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight;
    var s = this.scale();
    // Skip the GPU entirely while nothing this card depends on has changed.
    var key = cr.left + "," + cr.top + "," + vw + "," + vh + "," + s.toFixed(4);
    if (!force && key === this.last) return;
    this.last = key;

    var u = this.u;
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uDpr, this.canvas.width / cr.width);
    gl.uniform2f(u.uCanvas, cr.left, cr.top);
    gl.uniform2f(u.uView, vw, vh);
    gl.uniform4f(u.uMedia, mr.left, mr.top, mr.width, mr.height);
    gl.uniform2f(u.uCover, this.cover[0], this.cover[1]);
    gl.uniform2f(u.uPos, this.pos[0], this.pos[1]);
    gl.uniform1f(u.uRadius, this.radius);
    gl.uniform1f(u.uScale, s);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  // ---- Smooth scroll (wheel + trackpad), as raggededge.com does with Lenis.
  // The browser normally scrolls on its own fast path, and the warp catches
  // up a frame later, so the bend briefly rides along with the image and
  // shimmers; a mouse wheel also jumps ~100px a notch, straight through the
  // thin warp band. Here wheel input sets a target, each frame eases the page
  // toward it, and the warp is drawn in that same frame — always in step.
  // Keyboard, scrollbar dragging and links still scroll natively.
  var LERP = 0.1;          // share of the remaining distance per 60fps frame (Lenis's default)
  var target = window.scrollY, current = target, gliding = false, lastT = 0;

  function maxScroll() {
    return document.documentElement.scrollHeight - window.innerHeight;
  }
  window.addEventListener("wheel", function (e) {
    if (e.ctrlKey || e.defaultPrevented) return;   // pinch-zoom
    var dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
    if (!dy || Math.abs(e.deltaX) > Math.abs(dy)) return;
    e.preventDefault();
    if (!gliding) { current = target = window.scrollY; lastT = performance.now(); }
    target = Math.max(0, Math.min(maxScroll(), target + dy));
    gliding = true;
    start();
  }, { passive: false });
  // Any scroll we didn't make (keys, scrollbar, anchor) takes over.
  window.addEventListener("scroll", function () {
    if (gliding && Math.abs(window.scrollY - Math.round(current)) > 2) gliding = false;
    if (!gliding) target = current = window.scrollY;
    start();
  }, { passive: true });

  function glide(now) {
    var dt = Math.min(now - lastT, 100) / (1000 / 60);
    lastT = now;
    current += (target - current) * (1 - Math.pow(1 - LERP, dt));
    if (Math.abs(target - current) < 0.5) { current = target; gliding = false; }
    window.scrollTo({ top: current, behavior: "instant" });
    window.dispatchEvent(new Event("glide"));   // site.js tucks the header in step
  }

  var cards = [];
  var visible = new Set();
  var running = false;

  function loop(now) {
    if (gliding) glide(now);
    visible.forEach(function (card) { card.draw(false); });
    if (!visible.size && !gliding) { running = false; return; }
    requestAnimationFrame(loop);
  }
  function start() {
    if (!running && (visible.size || gliding)) { running = true; requestAnimationFrame(loop); }
  }

  // Set a card up once its image is near the viewport and decoded (they're
  // loading="lazy"), and only redraw cards that are on screen.
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var card = e.target._warp;
      if (!e.isIntersecting) { visible.delete(card); return; }
      if (card.gl === undefined) {
        card.gl = null;
        var img = card.img;
        var ready = img.complete && img.naturalWidth ? Promise.resolve() : img.decode();
        ready.then(function () {
          if (!card.init()) return;
          if (card.inView) { visible.add(card); start(); }
        }).catch(function () {});
      }
      if (card.gl) { visible.add(card); start(); }
    });
    entries.forEach(function (e) { e.target._warp.inView = e.isIntersecting; });
  }, { rootMargin: "25% 0px" });

  document.querySelectorAll(".work-card a").forEach(function (link) {
    var card = new Card(link);
    if (!card.img) return;
    card.gl = undefined;
    link._warp = card;
    cards.push(card);
    io.observe(link);
  });

  // Light/dark switch: swap any card that has a version for each theme.
  new MutationObserver(function () {
    cards.forEach(function (card) { card.retheme(); });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  var resizeQueued = false;
  window.addEventListener("resize", function () {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(function () {
      resizeQueued = false;
      cards.forEach(function (card) { if (card.gl) { card.layout(); card.draw(true); } });
    });
  });
})();
