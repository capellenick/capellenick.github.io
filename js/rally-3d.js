/* ==========================================================================
   RALLY 3D PHONE (rally.html only).

   The only phone in the hero and in "How Rally works" is a real 3D iPhone
   (black titanium). Each spot is a [data-phone3d] box ("hero" or "show")
   that sets the phone's size in the layout; this file puts a WebGL canvas
   over it and draws the model there, with the Rally screens painted onto
   its display through a canvas.

   - "show": js/rally.js does the scroll math and fires "rally:show" with
     { t: turn 0-1, ops: per-screen opacities, f: feed scroll 0-1 }. The
     phone turns in from three-quarter, then steps through the screens.
   - "hero": a three-quarter view that sways gently and turns to face you
     as you scroll past it. Holds still with reduced motion on.

   Until the model is ready, each box shows a still render of this same
   model in the same pose (assets/projects/rally/phone3d-*.webp), so the
   swap can't be seen. If WebGL or the CDN fail, the stills stay (the
   showcase one face-on). There is no flat phone.

   Model: "iPhone 16 Pro Max" by MajdyModels, CC-BY-4.0 (credited on the
   page and in assets/projects/rally/iphone/LICENSE.txt), recoloured and
   slimmed for the web.

   To re-render the stills (after changing a pose, the overhang in
   rally.css or the screens): open rally.html?still (no hero sway), scroll
   to the top, set --w to 440px on both boxes and fire a resize, then save
   each canvas (preserveDrawingBuffer is on) with toBlob("image/webp", 0.88):
   the hero as it is, the showcase after a "rally:show" with t 0
   (phone3d-show) and with t 1 (phone3d-show-face), ops [1,0,0,0,0], f 0.
   ========================================================================== */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const base = "assets/projects/rally/";
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const still = /[?&]still\b/.test(location.search);
const boxes = Array.prototype.slice.call(document.querySelectorAll("[data-phone3d]"));
const d2r = THREE.MathUtils.degToRad;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// The showcase's still is the three-quarter start pose; with no 3D at all,
// face-on reads better, since the phone will never turn.
function fail() {
  boxes.forEach((box) => {
    const face = box.getAttribute("data-still-face");
    const pic = box.querySelector("picture");
    const img = box.querySelector(".rl-p3d__still");
    if (!face || !img) return;
    if (pic) pic.querySelectorAll("source").forEach((s) => s.remove());
    img.src = face;
  });
}

let hasGL = false;
try {
  const c = document.createElement("canvas");
  hasGL = !!(c.getContext("webgl2") || c.getContext("webgl"));
} catch (e) {}
if (boxes.length && hasGL) start();
else fail();


function start() {
  /* ---- The screens: loaded once, painted by every phone ------------- */
  const SW = 804, SH = 1748;                       // capture size (402 x 874 @2x)
  const img = (src) => { const i = new Image(); i.decoding = "async"; i.src = base + src; return i; };
  const feed = img("screen-feed-long.jpg");
  const chrome = img("screen-overlay.png");
  const shots = ["screen-requested.jpg", "screen-confirmed.jpg?v=2", "screen-chat.jpg?v=2", "screen-played.jpg"].map(img);
  const all = [feed, chrome, ...shots];
  const ready = (i) => i.complete && i.naturalWidth > 0;

  /* ---- The model: fetched once, cloned into each phone -------------- */
  const model = new Promise((res, rej) => new GLTFLoader().load(base + "iphone/iphone.gltf", res, undefined, rej));

  const phones = [];
  let made = 0;
  boxes.forEach((box) => {
    const p = makePhone(box);
    if (!p) return;
    phones.push(p);
    model.then((gltf) => { if (p.build(gltf)) made++; else p.drop(); })
      .catch(() => p.drop())
      .finally(() => { if (!made && phones.every((x) => x.settled)) fail(); });
  });
  if (!phones.length) { fail(); return; }
  all.forEach((i) => i.addEventListener("load", () => phones.forEach((p) => p.request())));
  window.addEventListener("resize", () => phones.forEach((p) => p.resize()));

  /* ---- One phone ---------------------------------------------------- */
  function makePhone(box) {
    const kind = box.getAttribute("data-phone3d");

    // The app's screens are composed on `cc`, then placed on `sc` (what the
    // display shows) inside a true-black border, so the bezel reads as
    // thick as a real iPhone's rather than the model's hairline.
    // Border width as a share of the display's width. `sc` is resized to
    // the display's real shape once the model loads (fitDisplay), so its
    // pixels are square on the phone and the border is the same thickness
    // on all four sides. Never draw borders into a canvas whose shape
    // doesn't match the display: the stretch makes top/bottom thicker.
    const BEZEL = 0.0225;
    const cc = document.createElement("canvas");
    cc.width = SW; cc.height = SH;
    const ctx = cc.getContext("2d");
    const sc = document.createElement("canvas");
    sc.width = SW; sc.height = SH;
    const out = sc.getContext("2d");

    let state = { t: kind === "show" && !reduce ? 0 : 1, ops: [1, 0, 0, 0, 0], f: 0 };
    let drawn = "";

    function paintScreen() {
      const key = state.ops.map((o) => o.toFixed(3)).join() + "|" + state.f.toFixed(4) + "|" + all.filter(ready).length;
      if (key === drawn) return false;
      drawn = key;
      ctx.fillStyle = "#141414";
      ctx.fillRect(0, 0, SW, SH);
      // 1. The feed, scrolled, with iOS-style edge fades.
      if (ready(feed)) {
        const h = feed.naturalHeight * (SW / feed.naturalWidth);
        ctx.drawImage(feed, 0, -Math.max(0, h - SH) * state.f, SW, h);
      }
      let gr = ctx.createLinearGradient(0, 0, 0, SH * 0.1);
      gr.addColorStop(0.55, "#141414"); gr.addColorStop(1, "rgba(20,20,20,0)");
      ctx.fillStyle = gr; ctx.fillRect(0, 0, SW, SH * 0.1);
      gr = ctx.createLinearGradient(0, SH * 0.83, 0, SH);
      gr.addColorStop(0, "rgba(26,26,26,0)"); gr.addColorStop(0.62, "#1a1a1a");
      ctx.fillStyle = gr; ctx.fillRect(0, SH * 0.83, SW, SH * 0.17);
      if (ready(chrome)) ctx.drawImage(chrome, 0, 0, SW, SH);
      // 2. Later screens fade in over it, exactly as scrubbed by rally.js.
      for (let k = 0; k < shots.length; k++) {
        const o = state.ops[k + 1] || 0;
        if (o <= 0.001 || !ready(shots[k])) continue;
        ctx.globalAlpha = o;
        ctx.drawImage(shots[k], 0, 0, SW, SH);
      }
      ctx.globalAlpha = 1;

      // 3. The captures' own Dynamic Island (placed where iOS puts it) is
      //    the only island shown; give it the faint front-camera lens.
      const lg = ctx.createRadialGradient(486, 56, 1, 488, 58, 11);
      lg.addColorStop(0, "#1c2236"); lg.addColorStop(0.6, "#080a12"); lg.addColorStop(1, "#000");
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.arc(488, 58, 11, 0, Math.PI * 2); ctx.fill();

      // 4. Into the black border, clipped to the display's rounded corners
      //    (which also trims the capture's own corner artefacts).
      const DW = sc.width, DH = sc.height, b = Math.round(BEZEL * DW);
      const x = b, y = b, w = DW - 2 * b, h = DH - 2 * b;
      out.fillStyle = "#000";
      out.fillRect(0, 0, DW, DH);
      out.save();
      out.beginPath(); out.roundRect(x, y, w, h, w * (112 / SW)); out.clip();
      out.drawImage(cc, x, y, w, h);
      out.restore();
      return true;
    }

    /* Renderer, scene, light */
    const canvas = document.createElement("canvas");
    canvas.className = "rl-p3d__gl";
    canvas.setAttribute("aria-hidden", "true");
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;   // keeps black black, no colour shift
    renderer.toneMappingExposure = 1;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(studio(), 0.02).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
    const pivot = new THREE.Group();     // the pose lives here
    scene.add(pivot);

    const screenTex = new THREE.CanvasTexture(sc);
    screenTex.colorSpace = THREE.SRGBColorSpace;
    screenTex.wrapS = screenTex.wrapT = THREE.ClampToEdgeWrapping;
    screenTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    // Match the display canvas to the display's measured width : height.
    function fitDisplay(aspect) {
      sc.width = SW;
      sc.height = Math.round(SW / aspect);
      screenTex.dispose();                // reallocate at the new size
      drawn = "";                         // force a repaint
      const inner = (1 - 2 * BEZEL) / (1 / aspect - 2 * BEZEL);
      if (Math.abs(inner / (SW / SH) - 1) > 0.03) console.warn("rally-3d: screen captures will stretch " + Math.round((inner / (SW / SH) - 1) * 100) + "% to fit this display");
    }

    let live = false;
    const phone = {
      settled: false,
      request,
      resize,
      drop() { phone.settled = true; renderer.dispose(); },
      build(gltf) {
        phone.settled = true;
        if (!prepare(gltf.scene.clone(true))) return false;
        box.appendChild(canvas);
        live = true;
        resize();
        render(performance.now());
        // Show the canvas once it has drawn, then let the still go.
        requestAnimationFrame(() => {
          box.classList.add("is-3d");
          if (kind === "show") document.dispatchEvent(new Event("rally:3d-ready"));
          if (kind === "hero") heroStart();
        });
        return true;
      },
    };

    function prepare(model) {
      model.updateMatrixWorld(true);
      let screenMesh = null, island = null, lens = null, logo = null;
      model.traverse((o) => {
        if (!o.isMesh) return;
        if (o.name.indexOf("screen") !== -1) screenMesh = o;
        if (o.name.indexOf("len11") === 0) lens = o;
        if (o.name.indexOf("apple") !== -1) logo = o;
        const m = o.material;
        // The island fills a hole in the display. Its glass cover reflects
        // the softbox and turns it grey, so keep only the black part.
        // (three.js strips dots from names: "Cube.016" arrives as "Cube016".)
        if (/^Cube\.?016/.test(o.name) && /glass/.test(o.name)) o.visible = false;
        // The model's island sits too high and glints as it turns. It plugs
        // a hole in the display, so it gets the screen image too: the only
        // island you see is the one in the screenshot, where iOS puts it.
        if (/^Cube\.?016/.test(o.name) && /black/.test(o.name)) island = o;
        if (/^(Circle\.?013|Sphere\.?013)/.test(o.name)) o.visible = false;   // its front-camera ring + lens
        // Gloss black for the bezel, camera rings and trims (it was matte,
        // which reads as grey plastic under studio light). The clones share
        // these materials, so setting them twice is harmless.
        if (m && m.name === "black.002") { m.roughness = 0.18; m.color.set(0x000000); }
        if (m && m.name === "metalframe.002") { m.roughness = 0.3; m.color.set(0x4e4c4a); m.envMapIntensity = 1; }
        if (m && m.name === "glass.002") {
          // Front glass and lens covers: clear, just a glossy reflection.
          o.material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.02, ior: 1.5,
            clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false, side: THREE.DoubleSide,
          });
          o.renderOrder = 2;
        }
      });
      if (!screenMesh || !island || !lens || !logo) return false;

      // Face the display toward the camera with the cameras at the top,
      // whatever axes the file was authored in.
      const box3 = new THREE.Box3().setFromObject(model);
      const centre = box3.getCenter(new THREE.Vector3());
      // Front = from the Apple logo on the back through to the display.
      const screenPos = new THREE.Box3().setFromObject(screenMesh).getCenter(new THREE.Vector3());
      const logoPos = new THREE.Box3().setFromObject(logo).getCenter(new THREE.Vector3());
      const nrm = new THREE.Vector3();
      const ga = screenMesh.geometry.attributes.normal;
      for (let i = 0; i < ga.count; i++) nrm.add(new THREE.Vector3().fromBufferAttribute(ga, i));
      nrm.transformDirection(screenMesh.matrixWorld).normalize();
      if (nrm.dot(screenPos.clone().sub(logoPos)) < 0) nrm.negate();
      const orient = new THREE.Quaternion().setFromUnitVectors(nrm, new THREE.Vector3(0, 0, 1));
      // Up = the display's long side (its local z), pointing at the cameras.
      const up = new THREE.Vector3(0, 0, 1).transformDirection(screenMesh.matrixWorld).applyQuaternion(orient);
      up.z = 0; up.normalize();
      const toLens = lens.getWorldPosition(new THREE.Vector3()).sub(centre).applyQuaternion(orient);
      if (up.dot(toLens) < 0) up.negate();
      const spin = new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(0, 1, 0));
      const holder = new THREE.Group();
      holder.add(model);
      model.position.sub(centre);
      holder.quaternion.copy(spin.multiply(orient));
      holder.updateMatrixWorld(true);
      const size = new THREE.Box3().setFromObject(holder).getSize(new THREE.Vector3());
      holder.scale.setScalar(1 / size.y);           // 1 unit tall
      pivot.add(holder);
      // Measure square-on.
      pivot.rotation.set(0, 0, 0);
      pivot.scale.setScalar(1);
      pivot.updateMatrixWorld(true);

      // The display: fresh UVs projected straight from the front so the
      // capture lands upright and edge to edge, plus an unlit material so
      // the app's colours stay exact.
      const v = new THREE.Vector3();
      const flat = (mesh) => {                     // vertex positions as seen square-on
        const m = new THREE.Matrix4().copy(pivot.matrixWorld).invert().multiply(mesh.matrixWorld);
        const p = mesh.geometry.attributes.position, pts = [];
        for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m); pts.push(v.x, v.y); }
        return pts;
      };
      const sp = flat(screenMesh);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (let i = 0; i < sp.length; i += 2) {
        x0 = Math.min(x0, sp[i]); x1 = Math.max(x1, sp[i]); y0 = Math.min(y0, sp[i + 1]); y1 = Math.max(y1, sp[i + 1]);
      }
      // The display surface runs a little under the black border, so fit
      // the capture to the part you can actually see: shoot rays straight
      // at the front and keep the span where the first thing hit is the
      // display (or the island, which shows the display too).
      const ray = new THREE.Raycaster();
      const solid = [];
      holder.traverse((o) => { if (o.isMesh && o.visible && !(o.material && o.material.transparent)) solid.push(o); });
      const seen = (x, y) => {
        ray.set(new THREE.Vector3(x, y, 5), new THREE.Vector3(0, 0, -1));
        const hit = ray.intersectObjects(solid, false)[0];
        return !!hit && (hit.object === screenMesh || hit.object === island);
      };
      const span = (fn, a, b) => {
        let lo = Infinity, hi = -Infinity;
        for (let k = 0; k <= 400; k++) { const u = a + (b - a) * k / 400; if (fn(u)) { lo = Math.min(lo, u); hi = Math.max(hi, u); } }
        return lo < hi ? [lo, hi] : [a, b];
      };
      const [vy0, vy1] = span((y) => seen(x0 + (x1 - x0) * 0.3, y), y0, y1);   // off-centre, clear of the island
      const [vx0, vx1] = span((x) => seen(x, (vy0 + vy1) / 2), x0, x1);
      fitDisplay((vx1 - vx0) / (vy1 - vy0));
      const mat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false, side: THREE.DoubleSide });
      [screenMesh, island].forEach((mesh) => {
        const pts = flat(mesh), geo = mesh.geometry.clone();
        const uv = new Float32Array(pts.length);
        for (let i = 0; i < pts.length; i += 2) {
          uv[i] = (pts[i] - vx0) / (vx1 - vx0);
          uv[i + 1] = (pts[i + 1] - vy0) / (vy1 - vy0);
        }
        geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
        mesh.geometry = geo;
        mesh.material = mat;
      });
      return true;
    }

    /* Layout: the canvas overhangs the box (see .rl-p3d__gl in rally.css)
       so the turn never clips; the phone is drawn the box's height. */
    function resize() {
      if (!live) return;
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height;
      const frac = box.offsetHeight / r.height || 0.7;   // offsetHeight ignores transforms
      // Distance at which a 1-unit-tall phone fills `frac` of the view.
      camera.position.set(0, 0, (1 / frac) / (2 * Math.tan(d2r(camera.fov / 2))));
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      request();
    }

    /* Draw on demand */
    let queued = false;
    function request() {
      if (queued || !live) return;
      queued = true;
      requestAnimationFrame(render);
    }
    function render(now) {
      queued = false;
      if (kind === "hero") {
        const pose = heroPose(now);
        pivot.rotation.set(d2r(pose.rx), d2r(pose.ry), d2r(pose.rz), "YXZ");
        pivot.scale.setScalar(1);
      } else {
        const t = state.t;
        // Three-quarter start, turning to face you.
        pivot.rotation.set(d2r(12 * (1 - t)), d2r(-52 * (1 - t)), d2r(6 * (1 - t)), "YXZ");
        pivot.scale.setScalar(0.82 + 0.18 * t);
        // Optional fixed pose + camera (used to render stills, e.g. the
        // homepage cover): { rx, ry, rz } in degrees, cam / look as
        // [x, y, z], fov. Pass it as `pose` in a "rally:show" detail.
        const P = state.pose;
        if (P) {
          pivot.rotation.set(d2r(P.rx || 0), d2r(P.ry || 0), d2r(P.rz || 0), "YXZ");
          pivot.scale.setScalar(1);
          if (P.fov) camera.fov = P.fov;
          if (P.cam) camera.position.set(P.cam[0], P.cam[1], P.cam[2]);
          camera.lookAt(...(P.look || [0, 0, 0]));
          camera.updateProjectionMatrix();
        }
      }
      if (paintScreen()) screenTex.needsUpdate = true;
      renderer.render(scene, camera);
    }

    /* Hero: a three-quarter view that turns to face you as the hero
       scrolls away, with a slow sway on top while it's on screen. */
    const hero = kind === "hero" && box.closest(".rl-hero");
    let swayFrom = 0, onScreen = true, swaying = false;
    function heroPose(now) {
      const k = hero ? clamp(window.scrollY / Math.max(1, hero.offsetHeight * 0.8), 0, 1) : 0;
      const t = reduce ? 0 : k;
      const sway = reduce || still ? 0 : Math.sin((now - swayFrom) / 9000 * Math.PI * 2) * (1 - t);
      return {
        rx: 5 * (1 - t),
        ry: -24 * (1 - t) + 6 * sway,
        rz: 2.5 * (1 - t),
      };
    }
    function heroStart() {
      swayFrom = performance.now();   // sway starts at 0, the still's pose
      if (!reduce) window.addEventListener("scroll", request, { passive: true });
      if (reduce || still) return;
      if ("IntersectionObserver" in window) {
        new IntersectionObserver((e) => { onScreen = e[0].isIntersecting; loop(); }).observe(box);
      }
      document.addEventListener("visibilitychange", loop);
      loop();
    }
    function loop() {
      if (swaying || !onScreen || document.hidden) return;
      swaying = true;
      requestAnimationFrame(function tick(now) {
        if (!onScreen || document.hidden) { swaying = false; return; }
        render(now);
        requestAnimationFrame(tick);
      });
    }

    if (kind === "show") {
      document.addEventListener("rally:show", (e) => { state = e.detail; request(); });
    }
    return phone;
  }

  // A product-photo studio: a black room with a few big soft lights. Black
  // glass and titanium mostly reflect the dark room, so they read as deep
  // black, and the softboxes draw the crisp highlight lines along the band
  // and across the glass that make a phone look real.
  function studio() {
    const room = new THREE.Scene();
    room.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16),
      new THREE.MeshBasicMaterial({ color: 0x050506, side: THREE.BackSide })));
    const panel = (w, h, k, pos, look, tint) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(tint || 0xffffff).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(...pos); m.lookAt(...look); room.add(m);
    };
    panel(6, 2.5, 8, [0, 6, 3], [0, 0, 0]);                 // overhead softbox
    panel(1.2, 8, 22, [-6, 0.5, 2.5], [0, 0, 0]);            // tall strip, left
    panel(1, 8, 18, [6, 0.5, 1], [0, 0, 0], 0xe8eeff);    // cooler strip, right/behind
    panel(6, 0.8, 1.2, [0, -5, 4], [0, 0, 0]);              // low bounce
    panel(1.2, 1.2, 2.5, [3, 3, 6], [0, 0, 0]);             // small kicker for a glint on the glass
    return room;
  }
}
