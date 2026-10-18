/* Highland Creative concept: one cinematic 3D scene behind every page.
   The tree on the hill at dusk, lit by a real sunset sky photograph (Poly Haven, CC0), with scanned
   grass and bark, wind-blown pasture, a weatherboard studio and fireflies. A custom post pass adds
   bloom, edge depth-of-field, film grain and a vignette. The home hero is sharp and turns through the
   seasons on scroll; everywhere else the same scene drifts slowly, softly blurred, behind the words. */
(function () {
  "use strict";
  var T = window.THREE;
  var doc = document.documentElement;
  var canvas = document.getElementById("world");

  function noGL() {
    doc.classList.add("no-webgl", "world-loaded");
    var names = ["spring", "summer", "autumn", "winter"], m = new Date().getMonth();
    var cur = m >= 8 && m <= 10 ? 0 : (m === 11 || m <= 1) ? 1 : (m >= 2 && m <= 4) ? 2 : 3;
    function set(n) {
      doc.setAttribute("data-season", n);
      [].forEach.call(document.querySelectorAll("button[data-season]"), function (b) { b.setAttribute("aria-pressed", String(b.dataset.season === n)); });
      [].forEach.call(document.querySelectorAll("[data-season-name]"), function (el) { el.textContent = n.charAt(0).toUpperCase() + n.slice(1) + " in the Highlands"; });
    }
    [].forEach.call(document.querySelectorAll("button[data-season]"), function (b) { b.addEventListener("click", function () { set(b.dataset.season); }); });
    set(names[cur]);
  }
  if (!T || !canvas) { noGL(); return; }

  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var snapCam = /[?&]snap\b/.test(location.search);
  var mobile = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
  var renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: false, powerPreference: "high-performance" });
    if (!renderer.getContext()) throw new Error("no gl");
  } catch (e) { noGL(); return; }
  doc.classList.add("webgl");
  if (T.ColorManagement) T.ColorManagement.legacyMode = false;
  renderer.outputEncoding = T.LinearEncoding;      // the post pass does tone mapping and gamma itself
  renderer.toneMapping = T.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  var isGL2 = renderer.capabilities.isWebGL2;

  var ASSETS = (canvas.getAttribute("data-base") || "../assets/hc/").replace(/assets\/hc\/$/, "") + "concept/assets/world/";
  if ((canvas.getAttribute("data-base") || "").indexOf("../") === 0) ASSETS = "assets/world/";
  var PAGE = document.body.getAttribute("data-world") || "home";
  var DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.25);
  var renderScale = 1;
  var maxAniso = renderer.capabilities.getMaxAnisotropy ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;

  /* ---------- helpers ---------- */
  var seed = 1985;
  function rand() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function pick(a) { return a[Math.floor(rand() * a.length)]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function col(h) { return new T.Color(h); }
  function V(x, y, z) { return new T.Vector3(x, y, z); }
  var up = V(0, 1, 0);
  var P = new Uint8Array(512);
  (function () { var p = []; for (var i = 0; i < 256; i++) p.push(i); for (i = 255; i > 0; i--) { var j = Math.floor(rand() * (i + 1)), t = p[i]; p[i] = p[j]; p[j] = t; } for (i = 0; i < 512; i++) P[i] = p[i & 255]; })();
  function vn(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; xi &= 255; yi &= 255;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = P[P[xi] + yi] / 255, b = P[P[xi + 1] + yi] / 255, c = P[P[xi] + yi + 1] / 255, d = P[P[xi + 1] + yi + 1] / 255;
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  }
  function fbm(x, y, o) { var s = 0, a = .5; for (var i = 0; i < (o || 4); i++) { s += a * vn(x, y); x *= 2.03; y *= 2.03; a *= .5; } return s; }
  function canvasTex(w, h, draw) {
    var c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = maxAniso; return t;
  }

  /* ---------- loading: the page reveals once the sky has arrived and two frames have drawn ---------- */
  var pending = 0, framesDrawn = 0, revealed = false;
  function reveal() { if (revealed) return; revealed = true; doc.classList.add("world-loaded"); }
  setTimeout(reveal, 7000);
  var loader = new T.TextureLoader();
  function loadTex(url, srgb, repeat, done) {
    pending++;
    return loader.load(ASSETS + url, function (t) { if (done) done(t); pending--; }, undefined, function () { pending--; });
  }
  function prepTex(t, srgb, repeat) {
    if (srgb) t.encoding = T.sRGBEncoding; t.anisotropy = maxAniso;
    if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    t.needsUpdate = true; return t;
  }

  /* ---------- scene and the real sky ---------- */
  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(38, 1, 0.1, 2000);
  var clock = new T.Clock();
  // the photo's sun sits at u ≈ .62 on the horizon; aim every framing at it so the tree is backlit
  var SUN_AZ = (0.62 - 0.5) * Math.PI * 2;
  var sunDir = V(Math.cos(SUN_AZ), .2, Math.sin(SUN_AZ)).normalize();
  var VIEW_AZ = SUN_AZ - 0.32;                      // look slightly left of the sun so it glows beside the tree
  function rot(v) { // local frame: camera looks down -z; rotate so -z faces VIEW_AZ
    var a = VIEW_AZ + Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
    return V(v.x * c - v.z * s, v.y, v.x * s + v.z * c);
  }
  var pmrem = new T.PMREMGenerator(renderer);
  loadTex(mobile ? "sky-dusk-2k.jpg" : "sky-dusk-4k.jpg", true, null, function (t) {
    prepTex(t, true); t.mapping = T.EquirectangularReflectionMapping;
    scene.background = t;
    scene.environment = pmrem.fromEquirectangular(t).texture;
  });
  scene.background = col("#6f5a72");
  scene.fog = new T.FogExp2(0x9c7f86, mobile ? .0075 : .0068);

  var hemi = new T.HemisphereLight(0xb9a6c9, 0x2a2320, .55);
  var sun = new T.DirectionalLight(0xffb27a, 1.7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 512 : 1024, mobile ? 512 : 1024);
  var shc = sun.shadow.camera; shc.left = -34; shc.right = 34; shc.top = 34; shc.bottom = -34; shc.near = 1; shc.far = 240;
  sun.shadow.bias = -.0008; sun.shadow.normalBias = .05;
  scene.add(hemi, sun, sun.target);

  /* ---------- terrain with scanned grass ---------- */
  function baseH(x, z) {
    var knoll = 9.5 * Math.exp(-(x * x + z * z) / 560);
    var roll = 2.4 * Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.05) + 1.4 * Math.sin(x * 0.09 + z * 0.06 + 2.0) + 0.6 * Math.sin(x * 0.21 - z * 0.17);
    return knoll + roll - 2 + (fbm(x * .03 + 7, z * .03 + 3, 3) - .5) * 2.2;
  }
  function hgt(x, z) { return baseH(x, z); }
  var tSeg = mobile ? 90 : 140;
  var terrainGeo = new T.PlaneGeometry(1000, 1000, tSeg, tSeg); terrainGeo.rotateX(-Math.PI / 2);
  var tp = terrainGeo.attributes.position, tc = new Float32Array(tp.count * 3), cTmp = new T.Color();
  var gDark = col("#4a5a35"), gMid = col("#6e7a4a"), gDry = col("#8d8458");
  for (var i = 0; i < tp.count; i++) {
    var x = tp.getX(i), z = tp.getZ(i); tp.setY(i, hgt(x, z));
    var n1 = fbm(x * .02, z * .02, 4);
    cTmp.copy(gDark).lerp(gMid, smooth(.3, .7, n1)).lerp(gDry, smooth(.62, .82, n1) * .5);
    tc[i * 3] = cTmp.r; tc[i * 3 + 1] = cTmp.g; tc[i * 3 + 2] = cTmp.b;
  }
  terrainGeo.setAttribute("color", new T.BufferAttribute(tc, 3));
  terrainGeo.computeVertexNormals();
  var terrainMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, envMapIntensity: .55 });
  loadTex("grass_diff.jpg", true, null, function (t) { terrainMat.map = prepTex(t, true, [90, 90]); terrainMat.needsUpdate = true; });
  if (!mobile) loadTex("grass_nor.jpg", false, null, function (t) { terrainMat.normalMap = prepTex(t, false, [90, 90]); terrainMat.normalScale.set(.8, .8); terrainMat.needsUpdate = true; });
  var terrain = new T.Mesh(terrainGeo, terrainMat); terrain.receiveShadow = true; scene.add(terrain);

  /* ---------- geometry helpers ---------- */
  function taperTube(curve, r0, r1, seg, rad) {
    var fr = curve.computeFrenetFrames(seg, false), len = curve.getLength(), pos = [], nor = [], uv = [], idx = [];
    for (var i = 0; i <= seg; i++) {
      var t = i / seg, p = curve.getPointAt(t), r = lerp(r0, r1, Math.pow(t, .85)), N = fr.normals[i], B = fr.binormals[i];
      for (var j = 0; j <= rad; j++) {
        var v = j / rad * Math.PI * 2, s = Math.sin(v), c = -Math.cos(v), nx = c * N.x + s * B.x, ny = c * N.y + s * B.y, nz = c * N.z + s * B.z;
        nor.push(nx, ny, nz); pos.push(p.x + r * nx, p.y + r * ny, p.z + r * nz); uv.push(j / rad * Math.max(1, r * 4), t * len * .35);
      }
    }
    for (i = 0; i < seg; i++) for (j = 0; j < rad; j++) { var a = i * (rad + 1) + j, b = (i + 1) * (rad + 1) + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    var g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    return g;
  }
  function merge(geos) {
    var pos = [], nor = [], uv = [], idx = [], off = 0;
    geos.forEach(function (g) {
      var p = g.attributes.position.array, n = g.attributes.normal.array, u = g.attributes.uv.array, ix = g.index.array;
      for (var i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
      for (i = 0; i < u.length; i++) uv.push(u[i]); for (i = 0; i < ix.length; i++) idx.push(ix[i] + off);
      off += p.length / 3;
    });
    var g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    return g;
  }
  var U = { uTime: { value: 0 }, uWind: { value: new T.Vector2() }, uSeason: { value: 0 }, uDrop: { value: 0 }, uFrost: { value: 0 } };
  var m4 = new T.Matrix4(), q4 = new T.Quaternion(), e3 = new T.Euler(), s3 = V(1, 1, 1), p3 = V(0, 0, 0);

  /* ---------- the tree: scanned bark, branching limbs, seasonal leaves ---------- */
  var TREE = V(0, hgt(0, 0) - .4, 0);
  var tree = new T.Group(); tree.position.copy(TREE); scene.add(tree);
  var barkMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .95, envMapIntensity: .4 });
  loadTex("bark_diff.jpg", true, null, function (t) { barkMat.map = prepTex(t, true, [1, 1]); barkMat.needsUpdate = true; });
  if (!mobile) loadTex("bark_nor.jpg", false, null, function (t) { barkMat.normalMap = prepTex(t, false, [1, 1]); barkMat.needsUpdate = true; });
  var limbs = [], twigPts = [];
  function branch(start, dir, len, r0, depth) {
    var pts = [start.clone()], p = start.clone(), d = dir.clone();
    for (var k = 0; k < 3; k++) { d.add(V((rand() - .5) * .5, (rand() - .3) * .32 + (depth === 0 ? -.05 : .08), (rand() - .5) * .5)).normalize(); p = p.clone().addScaledVector(d, len / 3); pts.push(p); }
    var curve = new T.CatmullRomCurve3(pts), r1 = Math.max(.025, r0 * (depth ? .42 : .25));
    limbs.push(taperTube(curve, r0, r1, depth ? 10 : 5, depth > 1 ? 9 : depth ? 6 : 4));
    if (depth === 0) { for (var q = 0; q < 4; q++) twigPts.push(curve.getPoint(.35 + q * .2)); return; }
    for (var c = 0; c < 3; c++) {
      var t = Math.min(.98, .42 + c / 3 * .55 + rand() * .06), cp = curve.getPoint(t), tan = curve.getTangent(t);
      var ang = rand() * Math.PI * 2, out = V(Math.cos(ang), .35 + rand() * .45, Math.sin(ang));
      branch(cp, tan.clone().multiplyScalar(.6).add(out).normalize(), len * (.52 + rand() * .12), lerp(r0, r1, t) * .72, depth - 1);
    }
  }
  var trunk = new T.CatmullRomCurve3([V(0, -1.2, 0), V(.35, 2.4, .1), V(-.1, 5, 0), V(.35, 7.6, .1), V(1.1, 10.2, .25), V(1.9, 12.4, .3)]);
  limbs.push(taperTube(trunk, .95, .3, 40, 14));
  [0, 1.3, 2.6, 3.9, 5.2].forEach(function (a) { limbs.push(taperTube(new T.CatmullRomCurve3([V(Math.cos(a) * .3, .6, Math.sin(a) * .3), V(Math.cos(a) * .9, -.2, Math.sin(a) * .9), V(Math.cos(a) * 1.7, -.9, Math.sin(a) * 1.7)]), .38, .08, 6, 6)); });
  [[.44, 0], [.52, 2.2], [.6, 4.1], [.67, 1.1], [.74, 3.2], [.8, 5.3], [.87, .4], [.93, 2.7], [1, 4.6]].forEach(function (b) {
    var p = trunk.getPointAt(b[0]), a = b[1], d = V(Math.cos(a) * .95, .32 + rand() * .3, Math.sin(a) * .95).normalize();
    branch(p, d, 8.4 - b[0] * 3.4, lerp(.95, .3, b[0]) * .62, 2);
  });
  var wood = new T.Mesh(merge(limbs), barkMat); wood.castShadow = true; wood.receiveShadow = true; tree.add(wood);

  var leafTex = canvasTex(128, 128, function (g, w, h) {
    g.clearRect(0, 0, w, h); g.translate(w / 2, h);
    g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(0, -4); g.bezierCurveTo(46, -34, 40, -98, 0, -124); g.bezierCurveTo(-40, -98, -46, -34, 0, -4); g.fill();
    g.strokeStyle = "rgba(0,0,0,.28)"; g.lineWidth = 2.4; g.beginPath(); g.moveTo(0, -4); g.lineTo(0, -118); g.stroke();
    g.lineWidth = 1.1; for (var i = 1; i < 6; i++) { var y = -14 - i * 18; g.beginPath(); g.moveTo(0, y); g.lineTo(22 - i * 2, y - 14); g.moveTo(0, y); g.lineTo(-22 + i * 2, y - 14); g.stroke(); }
  });
  var PAL = {
    spring: ["#86a83c", "#9dbb4a", "#77a032", "#a9c55a", "#6f962e"],
    summer: ["#3f6a23", "#4c7a2a", "#365e1e", "#58862f", "#2f541a"],
    autumn: ["#c8762a", "#d99b2e", "#b2501f", "#e3b23c", "#9c3b1b", "#c9622a"],
    winter: ["#7a5a36", "#6a4a2c", "#8a6a40"]
  };
  var LN = mobile ? 2200 : 5200;
  var leafGeo = new T.PlaneGeometry(.98, 1.28); leafGeo.translate(0, .64, 0);
  var aSeed = new Float32Array(LN), aKeep = new Float32Array(LN), aC = [0, 1, 2, 3].map(function () { return new Float32Array(LN * 3); });
  var seasonsKeys = ["spring", "summer", "autumn", "winter"], leafPos = [];
  var leafMat = new T.MeshLambertMaterial({ map: leafTex, alphaTest: .45, side: T.DoubleSide });
  var leaves = new T.InstancedMesh(leafGeo, leafMat, LN);
  for (i = 0; i < LN; i++) {
    var tw = twigPts[Math.floor(rand() * twigPts.length)], rr = Math.pow(rand(), .55) * 1.55;
    p3.set(tw.x + (rand() - .5) * 2 * rr, tw.y + (rand() - .35) * 1.6 * rr, tw.z + (rand() - .5) * 2 * rr);
    e3.set(rand() * Math.PI, rand() * Math.PI * 2, rand() * Math.PI); q4.setFromEuler(e3);
    var sc0 = .7 + rand() * .55; s3.set(sc0, sc0, sc0); m4.compose(p3, q4, s3); leaves.setMatrixAt(i, m4); leafPos.push(p3.clone());
    aSeed[i] = rand(); aKeep[i] = rand();
    for (var s = 0; s < 4; s++) { var lc = col(pick(PAL[seasonsKeys[s]])); aC[s][i * 3] = lc.r; aC[s][i * 3 + 1] = lc.g; aC[s][i * 3 + 2] = lc.b; }
  }
  s3.set(1, 1, 1);
  leafGeo.setAttribute("aSeed", new T.InstancedBufferAttribute(aSeed, 1));
  leafGeo.setAttribute("aKeep", new T.InstancedBufferAttribute(aKeep, 1));
  for (s = 0; s < 4; s++) leafGeo.setAttribute("aC" + s, new T.InstancedBufferAttribute(aC[s], 3));
  leafMat.onBeforeCompile = function (sh) {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uSeason = U.uSeason; sh.uniforms.uDrop = U.uDrop; sh.uniforms.uWind = U.uWind;
    sh.vertexShader = "uniform float uTime,uSeason,uDrop; uniform vec2 uWind; attribute float aSeed,aKeep; attribute vec3 aC0,aC1,aC2,aC3; varying vec3 vLeaf;\n" + sh.vertexShader.replace("#include <project_vertex>", [
      "float sz = mod(uSeason,4.);",
      "vLeaf = sz<1. ? mix(aC0,aC1,sz) : sz<2. ? mix(aC1,aC2,sz-1.) : sz<3. ? mix(aC2,aC3,sz-2.) : mix(aC3,aC0,sz-3.);",
      "transformed *= smoothstep(uDrop-.03, uDrop+.03, aKeep);",
      "vec4 mvPosition = vec4( transformed, 1.0 );",
      "#ifdef USE_INSTANCING", "mvPosition = instanceMatrix * mvPosition;", "#endif",
      "float hf = clamp(mvPosition.y/16.,0.,1.);",
      "mvPosition.x += (sin(uTime*1.6+aSeed*6.28+mvPosition.y*.5)*.06 + uWind.x*1.1)*hf;",
      "mvPosition.z += (cos(uTime*1.3+aSeed*4.)*.05 + uWind.y*1.1)*hf;",
      "mvPosition = modelViewMatrix * mvPosition; gl_Position = projectionMatrix * mvPosition;"].join("\n"));
    sh.fragmentShader = "varying vec3 vLeaf;\n" + sh.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\n diffuseColor.rgb *= vLeaf; ");
  };
  leaves.frustumCulled = false; tree.add(leaves);

  /* ---------- pasture grass in the wind ---------- */
  var bladeGeo = new T.PlaneGeometry(.09, .7, 1, 4); bladeGeo.translate(0, .35, 0);
  (function () {
    var p = bladeGeo.attributes.position, c = new Float32Array(p.count * 3), lo = col("#2c3a1c"), hi = col("#9a9a56"), tmp = new T.Color();
    for (var i = 0; i < p.count; i++) { var y = p.getY(i) / .7; p.setX(i, p.getX(i) * (1 - y * .9)); tmp.copy(lo).lerp(hi, y); c[i * 3] = tmp.r; c[i * 3 + 1] = tmp.g; c[i * 3 + 2] = tmp.b; }
    bladeGeo.setAttribute("color", new T.BufferAttribute(c, 3)); bladeGeo.computeVertexNormals();
  })();
  var grassMat = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });
  grassMat.onBeforeCompile = function (sh) {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uWind = U.uWind; sh.uniforms.uFrost = U.uFrost;
    sh.vertexShader = "uniform float uTime,uFrost; uniform vec2 uWind; varying float vTip;\n" + sh.vertexShader.replace("#include <project_vertex>", [
      "vTip = transformed.y/.7;", "vec4 mvPosition = vec4( transformed, 1.0 ); vec3 ip = vec3(0.);",
      "#ifdef USE_INSTANCING", "mvPosition = instanceMatrix * mvPosition; ip = instanceMatrix[3].xyz;", "#endif",
      "float bend = vTip*vTip; float gst = sin(uTime*1.7 + ip.x*.35 + ip.z*.22)*.5+.5;",
      "mvPosition.x += (uWind.x*7. + .16*gst + sin(uTime*3.1+ip.z)*.04)*bend; mvPosition.z += (uWind.y*5. + .06*gst)*bend;",
      "mvPosition = modelViewMatrix * mvPosition; gl_Position = projectionMatrix * mvPosition;"].join("\n"));
    sh.fragmentShader = "uniform float uFrost; varying float vTip;\n" + sh.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.9,.93,.96), uFrost*smoothstep(.2,1.,vTip)*.8); ");
  };
  var grass = new T.InstancedMesh(bladeGeo, grassMat, mobile ? 3200 : 8500), gPlaced = 0, gTries = 0;
  while (gPlaced < grass.count && gTries < grass.count * 4) {
    gTries++;
    var ga = rand() * Math.PI * 2, gr = Math.sqrt(rand()) * 34, gx = Math.cos(ga) * gr, gz = Math.sin(ga) * gr;
    if (Math.hypot(gx, gz) < 1.6) continue;
    var gs = .6 + rand() * .9; e3.set((rand() - .5) * .3, rand() * Math.PI, (rand() - .5) * .3); q4.setFromEuler(e3); s3.set(gs, gs * (.8 + rand() * .7), gs);
    p3.set(gx, hgt(gx, gz) - .02, gz); m4.compose(p3, q4, s3); grass.setMatrixAt(gPlaced++, m4);
  }
  s3.set(1, 1, 1); grass.count = gPlaced; grass.userData.full = gPlaced; grass.receiveShadow = true; grass.frustumCulled = false; scene.add(grass);

  /* ---------- the countryside: painted tree cards on the far hills ---------- */
  (function () {
    function treeCard(kind) {
      return canvasTex(512, 512, function (g, w, h) {
        g.clearRect(0, 0, w, h); g.fillStyle = "#2e2620"; g.fillRect(w / 2 - 9, h * .6, 18, h * .4);
        var cx = w / 2, cy = kind === 1 ? h * .38 : h * .42, rx = kind === 1 ? w * .2 : kind === 2 ? w * .44 : w * .34, ry = kind === 1 ? h * .36 : kind === 2 ? h * .26 : h * .32;
        var greens = ["#2d3a22", "#384528", "#25301c", "#45522f"];
        for (var i = 0; i < 5200; i++) {
          var a = rand() * Math.PI * 2, r = Math.sqrt(rand()), x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r + (rand() - .5) * 6;
          var c = new T.Color(pick(greens)); c.offsetHSL(0, 0, (clamp(.5 - (x - cx) / rx * .25 - (y - cy) / ry * .35 + (rand() - .5) * .3, 0, 1) - .5) * .14);
          g.fillStyle = "#" + c.getHexString(); g.globalAlpha = .55 + rand() * .4; g.beginPath(); g.ellipse(x, y, 4 + rand() * 9, 3 + rand() * 7, rand() * 3, 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 1;
      });
    }
    var N = mobile ? 90 : 200, cross = (function () {
      var g1 = new T.PlaneGeometry(1, 1); g1.translate(0, .5, 0); var g2 = g1.clone(); g2.rotateY(Math.PI / 2);
      var pos = [], uv = [], nor = [], idx = [], off = 0;
      [g1, g2].forEach(function (g) { var p = g.attributes.position.array, u = g.attributes.uv.array, ix = g.index.array; for (var i = 0; i < p.length; i += 3) { pos.push(p[i], p[i + 1], p[i + 2]); nor.push(0, .92, .38); } for (i = 0; i < u.length; i++) uv.push(u[i]); for (i = 0; i < ix.length; i++) idx.push(ix[i] + off); off += p.length / 3; });
      var g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
    })();
    var meshes = [0, 1, 2].map(function (k) {
      var mat = new T.MeshLambertMaterial({ map: treeCard(k), alphaTest: .4, side: T.DoubleSide });
      mat.onBeforeCompile = function (sh) { sh.fragmentShader = sh.fragmentShader.replace("#include <normal_fragment_begin>", "vec3 normal = normalize( vNormal ); vec3 geometryNormal = normal;"); };
      var mm = new T.InstancedMesh(cross, mat, N); mm.count = 0; mm.frustumCulled = false; scene.add(mm); return mm;
    });
    var tries = 0, total = 0;
    while (total < N * 3 && tries < N * 30) {
      tries++;
      var a = rand() * Math.PI * 2, r = 60 + rand() * 360, fx = Math.cos(a) * r, fz = Math.sin(a) * r;
      if (fbm(fx * .015 + 3, fz * .015, 3) < .46) continue;
      var kind = Math.floor(rand() * 3), mm = meshes[kind]; if (mm.count >= N) continue;
      var ht = 7 + rand() * 9, wd = ht * (kind === 1 ? .55 : kind === 2 ? 1.1 : .85);
      e3.set(0, rand() * Math.PI, 0); q4.setFromEuler(e3); m4.compose(V(fx, hgt(fx, fz) - .4, fz), q4, V(wd, ht, wd)); mm.setMatrixAt(mm.count++, m4); total++;
    }
  })();

  /* ---------- the studio: weatherboard cottage, windows glowing at dusk ---------- */
  var CL = rot(V(-10, 0, -4)), cottage = new T.Group();
  cottage.position.set(TREE.x + CL.x, hgt(TREE.x + CL.x, TREE.z + CL.z) - .3, TREE.z + CL.z); cottage.rotation.y = -(VIEW_AZ + Math.PI / 2) + .5; scene.add(cottage);
  var boardTex = canvasTex(256, 256, function (g, w) { for (var bi = 0; bi < 16; bi++) { g.fillStyle = bi % 2 ? "#ece6d6" : "#e4ddcb"; g.fillRect(0, bi * 16, w, 16); g.fillStyle = "rgba(60,50,30,.25)"; g.fillRect(0, bi * 16 + 14, w, 2); } });
  boardTex.wrapS = boardTex.wrapT = T.RepeatWrapping; boardTex.repeat.set(2, 1.4);
  var walls = new T.Mesh(new T.BoxGeometry(5, 3.2, 3.8), new T.MeshStandardMaterial({ map: boardTex, roughness: .85 })); walls.position.y = 1.6; walls.castShadow = walls.receiveShadow = true; cottage.add(walls);
  var roofC = new T.Mesh(new T.ConeGeometry(3.9, 2.4, 4), new T.MeshStandardMaterial({ color: 0x4a1438, metalness: .45, roughness: .45 })); roofC.position.y = 4.4; roofC.rotation.y = Math.PI / 4; roofC.scale.set(1.05, 1, .8); roofC.castShadow = true; cottage.add(roofC);
  var chimney = new T.Mesh(new T.BoxGeometry(.6, 1.6, .6), new T.MeshStandardMaterial({ color: 0x7a4232, roughness: .95 })); chimney.position.set(1.4, 4.6, -.6); cottage.add(chimney);
  var winMat = new T.MeshBasicMaterial({ color: new T.Color(3.2, 2.1, .9) });            // HDR glow for the bloom pass
  [-1.2, 1.2].forEach(function (wx) { var w = new T.Mesh(new T.PlaneGeometry(1, 1.1), winMat); w.position.set(wx, 1.9, 1.91); cottage.add(w); });
  var door = new T.Mesh(new T.PlaneGeometry(.9, 1.8), new T.MeshStandardMaterial({ color: 0x3e4a16, roughness: .6 })); door.position.set(0, .9, 1.91); cottage.add(door);

  /* ---------- falling leaves, snow, fireflies, birds ---------- */
  var FN = reduce ? 0 : (mobile ? 60 : 140), SN = reduce ? 0 : (mobile ? 600 : 1200);
  var falling = new T.InstancedMesh(leafGeo.clone(), new T.MeshLambertMaterial({ map: leafTex, alphaTest: .45, side: T.DoubleSide }), Math.max(FN, 1)); falling.frustumCulled = false; scene.add(falling);
  falling.instanceColor = new T.InstancedBufferAttribute(new Float32Array(Math.max(FN, 1) * 3).fill(1), 3);
  var fState = [];
  for (i = 0; i < Math.max(FN, 1); i++) { fState.push({ alive: false, p: V(0, 0, 0), v: V(0, 0, 0), r: V(0, 0, 0), rv: V(0, 0, 0), c: new T.Color() }); m4.makeScale(0, 0, 0); falling.setMatrixAt(i, m4); }
  var softDot = canvasTex(32, 32, function (g) { var gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.5, "rgba(255,255,255,.7)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
  var snowPos = new Float32Array(Math.max(SN, 1) * 3), snowVel = new Float32Array(Math.max(SN, 1));
  for (i = 0; i < SN; i++) { snowPos[i * 3] = (rand() - .5) * 70; snowPos[i * 3 + 1] = rand() * 34; snowPos[i * 3 + 2] = (rand() - .5) * 70; snowVel[i] = 1 + rand() * 1.4; }
  var snowGeo = new T.BufferGeometry(); snowGeo.setAttribute("position", new T.BufferAttribute(snowPos, 3));
  var snowMat = new T.PointsMaterial({ size: mobile ? .7 : .55, map: softDot, transparent: true, depthWrite: false, opacity: 0, fog: false });
  var snow = new T.Points(snowGeo, snowMat); snow.frustumCulled = false; scene.add(snow);
  var spawnAcc = 0;
  function spawnLeaf(sv) {
    for (var i = 0; i < FN; i++) {
      var st = fState[i]; if (st.alive) continue;
      var lp = leafPos[Math.floor(rand() * leafPos.length)];
      st.p.set(TREE.x + lp.x, TREE.y + lp.y, TREE.z + lp.z); st.v.set((rand() - .3) * .9, -(.7 + rand() * .6), (rand() - .5) * .5);
      st.r.set(rand() * 6, rand() * 6, rand() * 6); st.rv.set((rand() - .5) * 5, (rand() - .5) * 4, (rand() - .5) * 5);
      st.c.set(pick(PAL[sv < 1 ? "spring" : sv < 2 ? "summer" : "autumn"])); falling.setColorAt(i, st.c); st.alive = true; return;
    }
  }
  var ffN = mobile ? 30 : 60, ffPos = new Float32Array(ffN * 3), ffBase = [];
  for (var ff = 0; ff < ffN; ff++) { var fa = rand() * 6.28, fr2 = 3 + rand() * 14; ffBase.push([Math.cos(fa) * fr2, .8 + rand() * 6, Math.sin(fa) * fr2, rand() * 6.28]); }
  var ffGeo = new T.BufferGeometry(); ffGeo.setAttribute("position", new T.BufferAttribute(ffPos, 3));
  var ffMat = new T.PointsMaterial({ color: new T.Color(4, 3, 1.1), size: mobile ? .28 : .22, map: softDot, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false });
  var fireflies = new T.Points(ffGeo, ffMat); fireflies.position.copy(TREE); fireflies.frustumCulled = false; scene.add(fireflies);
  var birds = [], birdMat = new T.MeshBasicMaterial({ color: 0x1b1418, side: T.DoubleSide });
  for (var bd = 0; bd < (mobile ? 5 : 9); bd++) {
    var bg = new T.BufferGeometry(); bg.setAttribute("position", new T.BufferAttribute(new Float32Array([0, 0, .18, -.8, 0, 0, 0, 0, -.18, 0, 0, .18, .8, 0, 0, 0, 0, -.18]), 3));
    var bm = new T.Mesh(bg, birdMat); bm.userData = { r: 24 + rand() * 30, a: rand() * 6.28, sp: .08 + rand() * .06, y: 34 + rand() * 14, ph: rand() * 6 }; birds.push(bm); scene.add(bm);
  }

  /* ---------- post: bloom, edge depth of field, softness, grain, vignette, ACES ---------- */
  var rtType = isGL2 || renderer.extensions.has("OES_texture_half_float") ? T.HalfFloatType : T.UnsignedByteType;
  function makeRT(w, h, ms) { var r = new T.WebGLRenderTarget(w, h, { type: rtType, depthBuffer: !!ms }); if (ms && isGL2 && !mobile) r.samples = 4; return r; }
  var rtScene = makeRT(2, 2, true), rtA = makeRT(2, 2), rtB = makeRT(2, 2);
  var quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), quadScene = new T.Scene(), quad = new T.Mesh(new T.PlaneGeometry(2, 2)); quadScene.add(quad);
  var VS = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.,1.); }";
  var downMat = new T.ShaderMaterial({ uniforms: { tSrc: { value: null }, uTexel: { value: new T.Vector2() } }, vertexShader: VS, depthTest: false, depthWrite: false,
    fragmentShader: "uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv; void main(){ vec3 c = texture2D(tSrc,vUv+uTexel*vec2(-1.,-1.)).rgb+texture2D(tSrc,vUv+uTexel*vec2(1.,-1.)).rgb+texture2D(tSrc,vUv+uTexel*vec2(-1.,1.)).rgb+texture2D(tSrc,vUv+uTexel*vec2(1.,1.)).rgb; gl_FragColor = vec4(c*.25,1.); }" });
  var blurMat = new T.ShaderMaterial({ uniforms: { tSrc: { value: null }, uDir: { value: new T.Vector2() } }, vertexShader: VS, depthTest: false, depthWrite: false,
    fragmentShader: "uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv; void main(){ vec3 c = texture2D(tSrc,vUv).rgb*.2270; c += (texture2D(tSrc,vUv+uDir*1.3846).rgb+texture2D(tSrc,vUv-uDir*1.3846).rgb)*.3162; c += (texture2D(tSrc,vUv+uDir*3.2308).rgb+texture2D(tSrc,vUv-uDir*3.2308).rgb)*.0703; gl_FragColor = vec4(c,1.); }" });
  var compU = { tScene: { value: null }, tBlur: { value: null }, uSoft: { value: 0 }, uDof: { value: .55 }, uBloom: { value: .9 }, uThr: { value: .75 }, uExposure: { value: 1.05 }, uTime: { value: 0 }, uRes: { value: new T.Vector2(1, 1) }, uGrain: { value: .045 }, uVig: { value: .55 } };
  var compMat = new T.ShaderMaterial({ uniforms: compU, vertexShader: VS, depthTest: false, depthWrite: false, fragmentShader: [
    "uniform sampler2D tScene,tBlur; uniform float uSoft,uDof,uBloom,uThr,uExposure,uTime,uGrain,uVig; uniform vec2 uRes; varying vec2 vUv;",
    "vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }",
    "void main(){",
    " vec3 s = texture2D(tScene,vUv).rgb; vec3 b = texture2D(tBlur,vUv).rgb;",
    " float edge = smoothstep(.35,1.,abs(vUv.y-.46)*2.);",
    " vec3 c = mix(s, b, clamp(uSoft + edge*uDof, 0., 1.));",
    " c += max(b - uThr, 0.) * uBloom;",
    " c = aces(c * uExposure * .62);",
    " c = pow(c, vec3(1./2.2));",
    " vec2 q = vUv - .5; c *= mix(1., smoothstep(.95, .25, length(q*vec2(1.15,1.))), uVig);",
    " float g = fract(sin(dot(vUv*uRes + fract(uTime)*97.13, vec2(12.9898,78.233)))*43758.5453);",
    " c += (g - .5) * uGrain;",
    " gl_FragColor = vec4(c, 1.);",
    "}"].join("\n") });
  function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); }

  /* ---------- camera: a sharp hero framing at the top, a slow soft drift everywhere else ---------- */
  var hero = document.querySelector("[data-hero]"), eve = document.querySelector('[data-station="eve"]');
  var duskEls = [].slice.call(document.querySelectorAll('[data-station="dusk"]'));
  var HERO = mobile ? { pos: rot(V(3, 7, 54)), look: rot(V(0, 11, 0)) } : { pos: rot(V(4, 8.5, 50)), look: rot(V(-9.5, 9.5, 0)) };
  var EVE = { pos: rot(V(-20, 26, 96)), look: rot(V(6, 7, -10)) };
  var tgtPos = V(0, 0, 0), tgtLook = V(0, 0, 0), curPos = V(0, 0, 0), curLook = V(0, 0, 0), tmpV = V(0, 0, 0);
  var sharpNow = 0, softTarget = 1;
  function inView(el) { var r = el.getBoundingClientRect(); return clamp(Math.min(r.bottom, innerHeight) - Math.max(r.top, 0), 0, innerHeight) / innerHeight; }
  function frameFor(t) {
    var sharp = 0, base = null;
    if (hero) { var r = hero.getBoundingClientRect(); sharp = clamp((r.bottom - innerHeight * .45) / (innerHeight * .55), 0, 1); base = HERO; }
    else if (eve) { var r2 = eve.getBoundingClientRect(); sharp = clamp((r2.bottom - innerHeight * .35) / (innerHeight * .5), 0, 1); base = EVE; }
    var duskV = 0; duskEls.forEach(function (el) { duskV = Math.max(duskV, inView(el)); });
    // drift: a slow circle around the hill, nudged by scroll
    var a = VIEW_AZ + Math.PI + Math.sin(t * .02) * .35 + scrollY * .00012, R = mobile ? 66 : 60;
    var dPos = V(TREE.x + Math.cos(a) * R, TREE.y + 13 + Math.sin(t * .05) * 1.5, TREE.z + Math.sin(a) * R), dLook = V(TREE.x, TREE.y + 8, TREE.z);
    if (base) { tgtPos.copy(dPos).lerp(V(TREE.x, TREE.y, TREE.z).add(base.pos), sharp); tgtLook.copy(dLook).lerp(V(TREE.x, TREE.y, TREE.z).add(base.look), sharp); }
    else { tgtPos.copy(dPos); tgtLook.copy(dLook); }
    sharpNow = sharp;
    softTarget = clamp(1 - Math.max(sharp, duskV * .55), 0, 1);
  }

  /* ---------- seasons (home hero) ---------- */
  var SEASON_NAMES = ["Spring", "Summer", "Autumn", "Winter"];
  function realSeason() { var mo = new Date().getMonth(); return mo >= 8 && mo <= 10 ? 0 : (mo === 11 || mo <= 1) ? 1 : (mo >= 2 && mo <= 4) ? 2 : 3; }
  var season0 = realSeason(), season = season0, seasonShown = -1;
  var seasonBtns = [].slice.call(document.querySelectorAll("button[data-season]")), seasonFill = document.querySelector("[data-season-fill]");
  function heroProgress() { if (!hero) return 0; var r = hero.getBoundingClientRect(), span = r.height - innerHeight; return span > 0 ? clamp(-r.top / span, 0, 1) : 0; }
  seasonBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      var idx = SEASON_NAMES.map(function (n) { return n.toLowerCase(); }).indexOf(b.dataset.season), rel = ((idx - season0) + 4) % 4;
      if (!hero) return;
      var top = hero.getBoundingClientRect().top + scrollY, span = hero.offsetHeight - innerHeight;
      window.scrollTo({ top: top + span * (rel / 3) * .999, behavior: reduce ? "auto" : "smooth" });
    });
  });
  function updateSeasonUI(sv) {
    var idx = ((Math.round(sv) % 4) + 4) % 4;
    if (seasonFill) seasonFill.style.transform = "scaleX(" + clamp((sv - season0) / 3, 0, 1) + ")";
    if (idx === seasonShown) return; seasonShown = idx;
    var name = SEASON_NAMES[idx];
    doc.setAttribute("data-season", name.toLowerCase());
    [].forEach.call(document.querySelectorAll("[data-season-name]"), function (el) { el.textContent = name + " in the Highlands"; });
    seasonBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.season === name.toLowerCase())); });
    var SUB = ["September – November · Tulip Time in Bowral", "December – February · long golden evenings", "March – May · the Highlands turn to gold", "June – August · frost on the pasture"];
    var sw = document.querySelector("[data-season-word]"), ss = document.querySelector("[data-season-sub]");
    if (sw) { sw.textContent = name; ss.textContent = SUB[idx]; var box = sw.parentNode; box.classList.remove("swap"); void box.offsetWidth; box.classList.add("swap"); }
  }

  /* ---------- pointer: gusts and orbit drag on the hero ---------- */
  var pointer = new T.Vector2(), lastPX = null, lastPY = null, gust = new T.Vector2();
  var dragging = false, dragX = 0, orbitYaw = 0, yawV = 0;
  function isEmpty(el) { return !el || !el.closest || !el.closest("a,button,input,select,textarea,label,form,.site-head,.concept-bar,dialog,.hero-copy,.strip,.entry-card,.member,.win,.pitch-head"); }
  window.addEventListener("pointermove", function (e) {
    pointer.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    if (lastPX !== null && !reduce) { gust.x += clamp((e.clientX - lastPX) * .0006, -.035, .035); gust.y += clamp((e.clientY - lastPY) * .0003, -.02, .02); }
    lastPX = e.clientX; lastPY = e.clientY;
    if (dragging) { yawV = (e.clientX - dragX) * .004; dragX = e.clientX; }
    document.body.classList.toggle("world-grab", sharpNow > .5 && isEmpty(document.elementFromPoint(e.clientX, e.clientY)));
  }, { passive: true });
  window.addEventListener("pointerdown", function (e) { if (sharpNow > .5 && isEmpty(e.target)) { dragging = true; dragX = e.clientX; document.body.classList.add("world-dragging"); } });
  function endDrag() { dragging = false; document.body.classList.remove("world-dragging"); }
  window.addEventListener("pointerup", endDrag); window.addEventListener("pointercancel", endDrag);

  /* ---------- resize ---------- */
  var W = 0, H = 0;
  function resize() {
    var w = innerWidth, hh = innerHeight;
    if (Math.abs(w - W) < 1 && Math.abs(hh - H) < 140 && W) return;
    W = w; H = hh; renderer.setPixelRatio(DPR); renderer.setSize(w, hh, false);
    camera.aspect = w / hh; camera.fov = w < 700 ? 48 : 38; camera.updateProjectionMatrix();
    var bw = Math.floor(w * DPR * renderScale), bh = Math.floor(hh * DPR * renderScale);
    rtScene.setSize(bw, bh); rtA.setSize(Math.max(2, bw >> 2), Math.max(2, bh >> 2)); rtB.setSize(Math.max(2, bw >> 2), Math.max(2, bh >> 2));
    compU.uRes.value.set(bw, bh);
  }
  window.addEventListener("resize", resize); resize();

  /* ---------- arrival: the camera settles in from above ---------- */
  frameFor(0);
  curPos.copy(tgtPos).add(reduce ? V(0, 0, 0) : V(0, 10, 0).add(rot(V(0, 0, 26)))); curLook.copy(tgtLook);
  var arrive = reduce ? 0 : 1;
  window.HCstation = function () { return "drift"; };

  /* ---------- adaptive quality: weak machines step down early ---------- */
  var perfFrames = 0, perfTime = 0, perfLevel = 0;
  function degrade() {
    perfLevel++;
    if (perfLevel === 1) { sun.castShadow = false; renderer.shadowMap.enabled = false; grass.count = Math.floor(grass.userData.full * .5); renderScale = .8; }
    if (perfLevel === 2) { grass.count = Math.floor(grass.userData.full * .15); leaves.count = Math.floor(LN * .65); renderScale = .62; compU.uGrain.value = .03; }
    W = 0; resize(); doc.setAttribute("data-world-quality", String(2 - perfLevel));
  }

  /* ---------- loop ---------- */
  var running = true, last = 0, softNow = 1, lastVeil = -1;
  document.addEventListener("visibilitychange", function () { running = !document.hidden; if (running) requestAnimationFrame(frame); });
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    var rawDt = (now - last) / 1000 || .016, dt = Math.min(.05, rawDt); last = now;
    if (perfLevel < 2 && rawDt < 1 && revealed) { perfFrames++; perfTime += rawDt; if (perfFrames >= 45) { if (perfFrames / perfTime < 40) degrade(); perfFrames = 0; perfTime = 0; } }
    var t = reduce ? 0 : clock.getElapsedTime();
    U.uTime.value = t; compU.uTime.value = t;

    // seasons: the hero turns the year; past it the year rolls back into spring
    var hp = heroProgress();
    season = hero ? season0 + hp * 3 : season0;
    if (hero && hp >= 1) { var hr = hero.getBoundingClientRect(), after = innerHeight - hr.bottom, rest = document.documentElement.scrollHeight - (hr.bottom + scrollY); season = season0 + 3 + smooth(0, .22, after / Math.max(1, rest)); }
    U.uSeason.value = season;
    var sv = ((season % 4) + 4) % 4;
    U.uDrop.value = sv < 2 ? 0 : sv < 2.7 ? (sv - 2) / .7 * .45 : sv < 3 ? .45 + (sv - 2.7) / .3 * .53 : sv < 3.6 ? .98 : Math.max(0, .98 - (sv - 3.6) * 2.45);
    var frost = sv > 2.8 && sv < 3.75 ? smooth(2.8, 3.05, sv) * (1 - smooth(3.55, 3.75, sv)) : 0;
    U.uFrost.value = frost;
    terrainMat.color.setRGB(1 + frost * .55, 1 + frost * .6, 1 + frost * .75);
    updateSeasonUI(season);

    gust.multiplyScalar(.95);
    U.uWind.value.set(Math.sin(t * .3) * .035 + gust.x, Math.cos(t * .23) * .02 + gust.y);

    // camera
    frameFor(t);
    yawV *= .92; orbitYaw += yawV; if (!dragging) orbitYaw *= (sharpNow > .5 ? .995 : .96);
    tmpV.copy(tgtPos).sub(tgtLook).applyAxisAngle(up, reduce ? 0 : orbitYaw * sharpNow); tgtPos.copy(tgtLook).add(tmpV);
    tgtLook.x += pointer.x * .9 * sharpNow; tgtLook.y += pointer.y * .5 * sharpNow;
    var kf = reduce || snapCam ? 1 : 1 - Math.exp(-dt * (arrive > 0 ? 1.0 : 2.6));
    if (arrive > 0) arrive = Math.max(0, arrive - dt * .4);
    curPos.lerp(tgtPos, kf); curLook.lerp(tgtLook, kf);
    camera.position.copy(curPos); camera.lookAt(curLook);
    softNow = lerp(softNow, softTarget, reduce || snapCam ? 1 : 1 - Math.exp(-dt * 3));
    compU.uSoft.value = softNow;
    if (Math.abs(softNow - lastVeil) > .01) { lastVeil = softNow; doc.style.setProperty("--veil", softNow.toFixed(3)); }
    sun.position.copy(curLook).addScaledVector(sunDir, 120); sun.target.position.copy(curLook); sun.target.updateMatrixWorld();

    // life
    ffMat.opacity = .75 + .25 * Math.sin(t * 3);
    for (var qq = 0; qq < ffN; qq++) { var fb = ffBase[qq]; ffPos[qq * 3] = fb[0] + Math.sin(t * .5 + fb[3]) * 1.6; ffPos[qq * 3 + 1] = fb[1] + Math.sin(t * .9 + fb[3] * 2) * .9; ffPos[qq * 3 + 2] = fb[2] + Math.cos(t * .4 + fb[3]) * 1.6; }
    ffGeo.attributes.position.needsUpdate = true;
    for (var b = 0; b < birds.length; b++) {
      var bdd = birds[b], u = bdd.userData; u.a += u.sp * dt;
      bdd.position.set(TREE.x + Math.cos(u.a) * u.r, u.y + Math.sin(t * .8 + u.ph) * 1.5, TREE.z + Math.sin(u.a) * u.r); bdd.rotation.y = -u.a;
      var flp = Math.sin(t * 9 + u.ph) * .5, bpos = bdd.geometry.attributes.position; bpos.setY(1, flp); bpos.setY(4, flp); bpos.needsUpdate = true;
    }
    if (FN) {
      var rate = sv < 1.8 ? .8 : sv < 2.8 ? 22 : sv < 3.2 ? 6 : 0;
      spawnAcc += rate * dt; while (spawnAcc > 1) { spawnAcc--; spawnLeaf(sv); }
      for (var p = 0; p < FN; p++) {
        var fs = fState[p]; if (!fs.alive) continue;
        fs.p.x += (fs.v.x + U.uWind.value.x * 14 + Math.sin(t * 1.7 + p) * .5) * dt; fs.p.y += fs.v.y * dt; fs.p.z += (fs.v.z + Math.cos(t * 1.3 + p) * .4) * dt;
        fs.r.x += fs.rv.x * dt; fs.r.y += fs.rv.y * dt; fs.r.z += fs.rv.z * dt;
        if (fs.p.y < hgt(fs.p.x, fs.p.z) + .05) { fs.alive = false; m4.makeScale(0, 0, 0); falling.setMatrixAt(p, m4); continue; }
        e3.set(fs.r.x, fs.r.y, fs.r.z); q4.setFromEuler(e3); s3.set(.9, .9, .9); m4.compose(fs.p, q4, s3); falling.setMatrixAt(p, m4);
      }
      s3.set(1, 1, 1); falling.instanceMatrix.needsUpdate = true; falling.instanceColor.needsUpdate = true;
    }
    if (SN) {
      snowMat.opacity = Math.min(1, frost * 1.2);
      if (frost > .01) {
        snow.position.copy(curPos).lerp(curLook, .32); snow.position.y -= 14;
        for (var q = 0; q < SN; q++) { snowPos[q * 3 + 1] -= snowVel[q] * dt * 2.2; snowPos[q * 3] += (U.uWind.value.x * 20 + Math.sin(t + q) * .3) * dt; if (snowPos[q * 3 + 1] < 0) snowPos[q * 3 + 1] += 34; }
        snowGeo.attributes.position.needsUpdate = true;
      }
    }

    // render: scene → downsample → blur ×2 → composite
    renderer.setRenderTarget(rtScene); renderer.render(scene, camera);
    downMat.uniforms.tSrc.value = rtScene.texture; downMat.uniforms.uTexel.value.set(1 / rtScene.width, 1 / rtScene.height); pass(downMat, rtA);
    var iters = softNow > .5 ? 3 : 2;
    for (var it = 0; it < iters; it++) {
      blurMat.uniforms.tSrc.value = rtA.texture; blurMat.uniforms.uDir.value.set(1 / rtA.width, 0); pass(blurMat, rtB);
      blurMat.uniforms.tSrc.value = rtB.texture; blurMat.uniforms.uDir.value.set(0, 1 / rtB.height); pass(blurMat, rtA);
    }
    compU.tScene.value = rtScene.texture; compU.tBlur.value = rtA.texture; compU.uDof.value = .5 * (1 - softNow);
    pass(compMat, null);

    if (!revealed && pending <= 0 && ++framesDrawn > 2) reveal();
  }
  if (window.ResizeObserver) new ResizeObserver(function () { /* layout changes need no world work */ }).observe(document.body);
  requestAnimationFrame(frame);
  doc.classList.add("world-ready");
})();
