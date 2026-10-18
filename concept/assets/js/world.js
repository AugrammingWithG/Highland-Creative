/* Highland Creative concept: the living 3D world behind every page (realistic renderer).
   One persistent WebGL scene of the Southern Highlands: a real deciduous tree on the hill that turns
   through the seasons, pasture grass in the wind, the class ribbon field, a show marquee of real entries,
   the judges' rosette, a weatherboard studio and the hill at dusk. Scroll flies the camera between
   stations; drag, hover and pointer gusts make it touchable. */
(function () {
  "use strict";
  var T = window.THREE;
  var doc = document.documentElement;
  var canvas = document.getElementById("world");

  function noGL() {
    doc.classList.add("no-webgl");
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
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: "high-performance" });
    if (!renderer.getContext()) throw new Error("no gl");
  } catch (e) { noGL(); return; }
  doc.classList.add("webgl");

  if (T.ColorManagement) T.ColorManagement.legacyMode = false;
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = mobile ? T.PCFShadowMap : T.PCFSoftShadowMap;

  var BASE = canvas.getAttribute("data-base") || "../assets/hc/";
  var PAGE = document.body.getAttribute("data-world") || "home";
  var HC = window.HC || {};
  var DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.35 : 1.6);
  renderer.setPixelRatio(DPR);
  var maxAniso = renderer.capabilities.getMaxAnisotropy ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;

  /* ---------- helpers ---------- */
  var seed = 1985;
  function rand() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function pick(a) { return a[Math.floor(rand() * a.length)]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
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
  function canvasTex(w, h, draw, repeat) {
    var c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = maxAniso;
    if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  }
  function speckle(g, w, h, base, spread, n) {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (var i = 0; i < n; i++) { g.fillStyle = spread[Math.floor(rand() * spread.length)]; g.globalAlpha = .08 + rand() * .25; var s = 1 + rand() * 3; g.fillRect(rand() * w, rand() * h, s, s * (1 + rand() * 3)); }
    g.globalAlpha = 1;
  }

  /* ---------- scene ---------- */
  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(40, 1, 0.1, 1600);
  var clock = new T.Clock();

  /* ---------- terrain ---------- */
  var PAV = V(-78, 0, -34), RIB = V(72, 0, -18), ROS = V(34, 0, 52);
  function baseH(x, z) {
    var knoll = 9.5 * Math.exp(-(x * x + z * z) / 560);
    var roll = 2.4 * Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.05) + 1.4 * Math.sin(x * 0.09 + z * 0.06 + 2.0) + 0.6 * Math.sin(x * 0.21 - z * 0.17);
    var far = Math.max(0, -z - 80) * 0.2 * (1 + 0.6 * Math.sin(x * 0.03 + 0.7));
    return knoll + roll + far - 2 + (fbm(x * .03 + 7, z * .03 + 3, 3) - .5) * 2.2;
  }
  var plateaus = [[PAV, 16], [RIB, 18]].map(function (p) { return { c: p[0], r: p[1], h: baseH(p[0].x, p[0].z) }; });
  function hgt(x, z) {
    var h = baseH(x, z);
    for (var i = 0; i < plateaus.length; i++) { var p = plateaus[i], dx = x - p.c.x, dz = z - p.c.z, w = Math.exp(-(dx * dx + dz * dz) / (p.r * p.r)); h = h * (1 - w) + p.h * w; }
    return h;
  }
  PAV.y = hgt(PAV.x, PAV.z); RIB.y = hgt(RIB.x, RIB.z); ROS.y = hgt(ROS.x, ROS.z);

  var tSeg = mobile ? 120 : 220;
  var terrainGeo = new T.PlaneGeometry(900, 900, tSeg, tSeg); terrainGeo.rotateX(-Math.PI / 2);
  var tp = terrainGeo.attributes.position, tc = new Float32Array(tp.count * 3);
  var gDark = col("#2f4519"), gMid = col("#4f6a26"), gLight = col("#6f8433"), gDry = col("#8e8a45"), cTmp = new T.Color();
  for (var i = 0; i < tp.count; i++) {
    var x = tp.getX(i), z = tp.getZ(i), h = hgt(x, z); tp.setY(i, h);
    var n1 = fbm(x * .02, z * .02, 4), n2 = fbm(x * .11 + 30, z * .11, 3), k = clamp((h + 3) / 16, 0, 1);
    cTmp.copy(gDark).lerp(gMid, smooth(.15, .6, k * .6 + n1 * .5)).lerp(gLight, smooth(.55, .85, n2) * .6).lerp(gDry, smooth(.62, .8, n1) * .55);
    tc[i * 3] = cTmp.r; tc[i * 3 + 1] = cTmp.g; tc[i * 3 + 2] = cTmp.b;
  }
  terrainGeo.setAttribute("color", new T.BufferAttribute(tc, 3));
  terrainGeo.computeVertexNormals();
  var grassTex = canvasTex(512, 512, function (g, w, h) { speckle(g, w, h, "#9aa070", ["#5d6b35", "#c1c08a", "#7c8a45", "#4a5a2a", "#b3a865"], 9000); }, [140, 140]);
  var terrainMat = new T.MeshStandardMaterial({ vertexColors: true, map: grassTex, roughness: 1, metalness: 0 });
  var terrain = new T.Mesh(terrainGeo, terrainMat); terrain.receiveShadow = true; scene.add(terrain);

  /* ---------- sky: atmospheric gradient, sun, procedural cumulus ---------- */
  var sunDir = V(.45, .55, .35).normalize();
  var skyU = { uSun: { value: sunDir }, uDusk: { value: 0 }, uTime: { value: 0 }, uWinter: { value: 0 } };
  var sky = new T.Mesh(new T.SphereGeometry(1200, 48, 24), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, toneMapped: false, fog: false, uniforms: skyU,
    vertexShader: "varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }",
    fragmentShader: [
      "uniform vec3 uSun; uniform float uDusk,uTime,uWinter; varying vec3 vD;",
      "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
      "float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}",
      "float fb(vec2 p){float v=0.,a=.5;for(int i=0;i<6;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}",
      "void main(){ vec3 d=normalize(vD); float y=d.y; float sd=max(dot(d,normalize(uSun)),0.);",
      " vec3 zen=mix(mix(vec3(.16,.36,.7),vec3(.42,.52,.62),uWinter*.6),vec3(.05,.04,.12),uDusk);",
      " vec3 hor=mix(mix(vec3(.74,.84,.93),vec3(.83,.86,.88),uWinter*.6),vec3(.96,.56,.36),uDusk);",
      " vec3 c=mix(hor,zen,pow(clamp(y,0.,1.),.42));",
      " c+=mix(vec3(1.,.88,.7),vec3(1.,.55,.3),uDusk)*(pow(sd,6.)*.28+pow(sd,60.)*.35)+vec3(1.,.97,.9)*smoothstep(.9994,.9998,sd)*2.;",
      " if(y>0.){ vec2 uv=d.xz/(y+.08)*.9+vec2(uTime*.004,uTime*.0015);",
      "  float cl=fb(uv*1.6); float cov=mix(.5,.42,uWinter); float m=smoothstep(cov,cov+.26,cl)*smoothstep(0.,.18,y);",
      "  float shade=fb(uv*1.6+vec2(.08,.05)); vec3 lit=mix(vec3(1.,.99,.97),vec3(1.,.72,.55),uDusk); vec3 sh=mix(vec3(.62,.67,.75),vec3(.38,.22,.3),uDusk);",
      "  vec3 cc=mix(lit,sh,smoothstep(.45,.85,shade))*(1.+pow(sd,4.)*.35);",
      "  c=mix(c,cc,m*.94); }",
      " else { c=mix(hor*.92,hor*.7,clamp(-y*6.,0.,1.)); }",
      " gl_FragColor=vec4(c,1.); }"].join("\n")
  }));
  sky.renderOrder = -1; scene.add(sky);
  scene.fog = new T.FogExp2(0xbfd2e2, mobile ? .0062 : .0056);

  var hemi = new T.HemisphereLight(0xcfe3f5, 0x3b4a22, .55);
  var sun = new T.DirectionalLight(0xfff1dc, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  var shc = sun.shadow.camera; shc.left = -38; shc.right = 38; shc.top = 38; shc.bottom = -38; shc.near = 1; shc.far = 260;
  sun.shadow.bias = -.0006; sun.shadow.normalBias = .04;
  scene.add(hemi, sun, sun.target);

  /* ---------- geometry helpers ---------- */
  function taperTube(curve, r0, r1, seg, rad) {
    var fr = curve.computeFrenetFrames(seg, false), len = curve.getLength();
    var pos = [], nor = [], uv = [], idx = [];
    for (var i = 0; i <= seg; i++) {
      var t = i / seg, p = curve.getPointAt(t), r = lerp(r0, r1, Math.pow(t, .85)), N = fr.normals[i], B = fr.binormals[i];
      for (var j = 0; j <= rad; j++) {
        var v = j / rad * Math.PI * 2, s = Math.sin(v), c = -Math.cos(v);
        var nx = c * N.x + s * B.x, ny = c * N.y + s * B.y, nz = c * N.z + s * B.z;
        nor.push(nx, ny, nz); pos.push(p.x + r * nx, p.y + r * ny, p.z + r * nz); uv.push(j / rad * Math.max(1, r * 6), t * len * .5);
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
      for (i = 0; i < u.length; i++) uv.push(u[i]);
      for (i = 0; i < ix.length; i++) idx.push(ix[i] + off);
      off += p.length / 3;
    });
    var g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    return g;
  }

  /* ---------- shared uniforms ---------- */
  var U = { uTime: { value: 0 }, uWind: { value: new T.Vector2() }, uSeason: { value: 0 }, uDrop: { value: 0 }, uFrost: { value: 0 } };
  var m4 = new T.Matrix4(), q4 = new T.Quaternion(), e3 = new T.Euler(), s3 = V(1, 1, 1), p3 = V(0, 0, 0);

  /* ---------- the tree: tapered trunk, branches, twigs, thousands of leaves ---------- */
  var TREE = V(0, hgt(0, 0) - .4, 0);
  var tree = new T.Group(); tree.position.copy(TREE); scene.add(tree);
  var barkTex = canvasTex(256, 512, function (g, w, h) {
    g.fillStyle = "#5b5047"; g.fillRect(0, 0, w, h);
    for (var i = 0; i < 900; i++) { var x = rand() * w; g.strokeStyle = pick(["#3a322c", "#7a6d60", "#4a4038", "#8c8173", "#2e2722"]); g.globalAlpha = .15 + rand() * .35; g.lineWidth = .6 + rand() * 2.4; g.beginPath(); g.moveTo(x, rand() * h); g.lineTo(x + (rand() - .5) * 6, rand() * h); g.stroke(); }
    g.globalAlpha = 1;
  }, [1, 1]);
  var barkMat = new T.MeshStandardMaterial({ map: barkTex, bumpMap: barkTex, bumpScale: .06, roughness: .95, color: 0xb8aa9c });
  var limbs = [], twigPts = [];
  function branch(start, dir, len, r0, depth) {
    var pts = [start.clone()], p = start.clone(), d = dir.clone();
    for (var k = 0; k < 3; k++) {
      d.add(V((rand() - .5) * .5, (rand() - .3) * .32 + (depth === 0 ? -.05 : .08), (rand() - .5) * .5)).normalize();
      p = p.clone().addScaledVector(d, len / 3); pts.push(p);
    }
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
  [0, 1.3, 2.6, 3.9, 5.2].forEach(function (a) {
    limbs.push(taperTube(new T.CatmullRomCurve3([V(Math.cos(a) * .3, .6, Math.sin(a) * .3), V(Math.cos(a) * .9, -.2, Math.sin(a) * .9), V(Math.cos(a) * 1.7, -.9, Math.sin(a) * 1.7)]), .38, .08, 6, 6));
  });
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
  var LN = mobile ? 3400 : 10000;
  var leafGeo = new T.PlaneGeometry(.7, .92); leafGeo.translate(0, .46, 0);
  var aSeed = new Float32Array(LN), aKeep = new Float32Array(LN), aC = [0, 1, 2, 3].map(function () { return new Float32Array(LN * 3); });
  var seasonsKeys = ["spring", "summer", "autumn", "winter"], leafPos = [];
  var leafMat = new T.MeshStandardMaterial({ map: leafTex, alphaTest: .45, side: T.DoubleSide, roughness: .7, metalness: 0 });
  var leaves = new T.InstancedMesh(leafGeo, leafMat, LN);
  for (i = 0; i < LN; i++) {
    var tw = twigPts[Math.floor(rand() * twigPts.length)], rr = Math.pow(rand(), .55) * 1.55;
    p3.set(tw.x + (rand() - .5) * 2 * rr, tw.y + (rand() - .35) * 1.6 * rr, tw.z + (rand() - .5) * 2 * rr);
    e3.set(rand() * Math.PI, rand() * Math.PI * 2, rand() * Math.PI); q4.setFromEuler(e3);
    var sc0 = .7 + rand() * .55; s3.set(sc0, sc0, sc0);
    m4.compose(p3, q4, s3); leaves.setMatrixAt(i, m4); leafPos.push(p3.clone());
    aSeed[i] = rand(); aKeep[i] = rand();
    for (var s = 0; s < 4; s++) { var lc = col(pick(PAL[seasonsKeys[s]])); aC[s][i * 3] = lc.r; aC[s][i * 3 + 1] = lc.g; aC[s][i * 3 + 2] = lc.b; }
  }
  s3.set(1, 1, 1);
  leafGeo.setAttribute("aSeed", new T.InstancedBufferAttribute(aSeed, 1));
  leafGeo.setAttribute("aKeep", new T.InstancedBufferAttribute(aKeep, 1));
  for (s = 0; s < 4; s++) leafGeo.setAttribute("aC" + s, new T.InstancedBufferAttribute(aC[s], 3));
  var LEAF_VS_HEAD = "uniform float uTime,uSeason,uDrop; uniform vec2 uWind; attribute float aSeed,aKeep; attribute vec3 aC0,aC1,aC2,aC3; varying vec3 vLeaf;\n";
  var LEAF_VS_BODY = [
    "float sz = mod(uSeason,4.);",
    "vLeaf = sz<1. ? mix(aC0,aC1,sz) : sz<2. ? mix(aC1,aC2,sz-1.) : sz<3. ? mix(aC2,aC3,sz-2.) : mix(aC3,aC0,sz-3.);",
    "float keep = smoothstep(uDrop-.03, uDrop+.03, aKeep);",
    "transformed *= keep;",
    "vec4 mvPosition = vec4( transformed, 1.0 );",
    "#ifdef USE_INSTANCING", "mvPosition = instanceMatrix * mvPosition;", "#endif",
    "float hf = clamp(mvPosition.y/16.,0.,1.);",
    "mvPosition.x += (sin(uTime*1.6+aSeed*6.28+mvPosition.y*.5)*.06 + uWind.x*1.1)*hf;",
    "mvPosition.z += (cos(uTime*1.3+aSeed*4.)*.05 + uWind.y*1.1)*hf;",
    "mvPosition.y += sin(uTime*2.1+aSeed*9.)*.03*hf;",
    "mvPosition = modelViewMatrix * mvPosition;",
    "gl_Position = projectionMatrix * mvPosition;"].join("\n");
  function leafUniforms(sh) { sh.uniforms.uTime = U.uTime; sh.uniforms.uSeason = U.uSeason; sh.uniforms.uDrop = U.uDrop; sh.uniforms.uWind = U.uWind; }
  leafMat.onBeforeCompile = function (sh) {
    leafUniforms(sh);
    sh.vertexShader = LEAF_VS_HEAD + sh.vertexShader.replace("#include <project_vertex>", LEAF_VS_BODY);
    sh.fragmentShader = "varying vec3 vLeaf;\n" + sh.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\n diffuseColor.rgb *= vLeaf; ");
  };
  leaves.castShadow = !mobile;
  if (!mobile) {
    var leafDepth = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: leafTex, alphaTest: .45 });
    leafDepth.onBeforeCompile = function (sh) {
      leafUniforms(sh);
      sh.vertexShader = LEAF_VS_HEAD + sh.vertexShader.replace("#include <project_vertex>", LEAF_VS_BODY);
      sh.fragmentShader = "varying vec3 vLeaf;\n" + sh.fragmentShader;
    };
    leaves.customDepthMaterial = leafDepth;
  }
  leaves.frustumCulled = false;
  tree.add(leaves);

  /* ---------- pasture grass in the wind ---------- */
  var bladeGeo = new T.PlaneGeometry(.09, .7, 1, 4); bladeGeo.translate(0, .35, 0);
  (function () {
    var p = bladeGeo.attributes.position, c = new Float32Array(p.count * 3), lo = col("#2c401a"), hi = col("#93a24e"), tmp = new T.Color();
    for (var i = 0; i < p.count; i++) { var y = p.getY(i) / .7; p.setX(i, p.getX(i) * (1 - y * .9)); tmp.copy(lo).lerp(hi, y); c[i * 3] = tmp.r; c[i * 3 + 1] = tmp.g; c[i * 3 + 2] = tmp.b; }
    bladeGeo.setAttribute("color", new T.BufferAttribute(c, 3)); bladeGeo.computeVertexNormals();
  })();
  var grassMat = new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: .9 });
  grassMat.onBeforeCompile = function (sh) {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uWind = U.uWind; sh.uniforms.uFrost = U.uFrost;
    sh.vertexShader = "uniform float uTime,uFrost; uniform vec2 uWind; varying float vTip;\n" + sh.vertexShader.replace("#include <project_vertex>", [
      "vTip = transformed.y/.7;",
      "vec4 mvPosition = vec4( transformed, 1.0 );",
      "vec3 ip = vec3(0.);",
      "#ifdef USE_INSTANCING", "mvPosition = instanceMatrix * mvPosition;", "ip = instanceMatrix[3].xyz;", "#endif",
      "float bend = vTip*vTip;",
      "float gst = sin(uTime*1.7 + ip.x*.35 + ip.z*.22)*.5+.5;",
      "mvPosition.x += (uWind.x*7. + .16*gst + sin(uTime*3.1+ip.z)*.04)*bend;",
      "mvPosition.z += (uWind.y*5. + .06*gst)*bend;",
      "mvPosition = modelViewMatrix * mvPosition; gl_Position = projectionMatrix * mvPosition;"].join("\n"));
    sh.fragmentShader = "uniform float uFrost; varying float vTip;\n" + sh.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.9,.93,.96), uFrost*smoothstep(.2,1.,vTip)*.8); ");
  };
  var grassMeshes = [];
  function grassPatch(cx, cz, radius, count, avoid) {
    var gm = new T.InstancedMesh(bladeGeo, grassMat, Math.max(1, count)), placed = 0, tries = 0;
    while (placed < count && tries < count * 4) {
      tries++;
      var a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * radius, gx = cx + Math.cos(a) * r, gz = cz + Math.sin(a) * r;
      if (avoid && Math.hypot(gx - avoid[0], gz - avoid[1]) < avoid[2]) continue;
      var gs = .6 + rand() * .9;
      e3.set((rand() - .5) * .3, rand() * Math.PI, (rand() - .5) * .3); q4.setFromEuler(e3); s3.set(gs, gs * (.8 + rand() * .7), gs);
      p3.set(gx, hgt(gx, gz) - .02, gz); m4.compose(p3, q4, s3); gm.setMatrixAt(placed++, m4);
    }
    s3.set(1, 1, 1);
    gm.count = placed; gm.userData.full = placed; gm.receiveShadow = true; gm.frustumCulled = false; scene.add(gm); grassMeshes.push(gm);
  }
  var gScale = mobile ? .3 : 1;
  grassPatch(0, 4, 40, Math.floor(26000 * gScale), [0, 0, 1.6]);
  grassPatch(RIB.x, RIB.z + 4, 22, Math.floor(7000 * gScale));
  grassPatch(ROS.x, ROS.z, 20, Math.floor(6000 * gScale));
  grassPatch(PAV.x, PAV.z + 12, 26, Math.floor(6000 * gScale), [PAV.x, PAV.z, 13.5]);

  /* ---------- the countryside: painted tree impostors on the far hills ---------- */
  function treeCard(kind) {
    return canvasTex(256, 256, function (g, w, h) {
      g.clearRect(0, 0, w, h);
      g.fillStyle = "#3a2f26"; g.fillRect(w / 2 - 5, h * .62, 10, h * .38);
      var cx = w / 2, cy = kind === 1 ? h * .38 : h * .42, rx = kind === 1 ? w * .2 : kind === 2 ? w * .44 : w * .34, ry = kind === 1 ? h * .36 : kind === 2 ? h * .26 : h * .32;
      var greens = kind === 2 ? ["#3c5a24", "#4b6a2a", "#2f4a1c", "#5a7a34"] : ["#2d4a1f", "#3a5a26", "#24401a", "#4a6a2e"];
      for (var i = 0; i < 1500; i++) {
        var a = rand() * Math.PI * 2, r = Math.sqrt(rand()), x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r + (rand() - .5) * 6;
        var lit = clamp(.5 - (x - cx) / rx * .25 - (y - cy) / ry * .35 + (rand() - .5) * .3, 0, 1);
        var c = new T.Color(pick(greens)); c.offsetHSL(0, 0, (lit - .5) * .16);
        g.fillStyle = "#" + c.getHexString(); g.globalAlpha = .85;
        g.beginPath(); g.ellipse(x, y, 3 + rand() * 5, 2 + rand() * 4, rand() * 3, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
    });
  }
  (function () {
    var N = mobile ? 160 : 420, kinds = [0, 1, 2].map(function (k) { return treeCard(k); });
    var cross = (function () {
      var g1 = new T.PlaneGeometry(1, 1); g1.translate(0, .5, 0);
      var g2 = g1.clone(); g2.rotateY(Math.PI / 2);
      var pos = [], uv = [], nor = [], idx = [], off = 0;
      [g1, g2].forEach(function (g) {
        var p = g.attributes.position.array, u = g.attributes.uv.array, ix = g.index.array;
        for (var i = 0; i < p.length; i += 3) { pos.push(p[i], p[i + 1], p[i + 2]); nor.push(0, .92, .38); }
        for (i = 0; i < u.length; i++) uv.push(u[i]); for (i = 0; i < ix.length; i++) idx.push(ix[i] + off); off += p.length / 3;
      });
      var g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
    })();
    var meshes = kinds.map(function (tex) { var mm = new T.InstancedMesh(cross, new T.MeshStandardMaterial({ map: tex, alphaTest: .5, side: T.DoubleSide, roughness: 1 }), N); mm.count = 0; mm.frustumCulled = false; scene.add(mm); return mm; });
    var keepOut = [[0, 0, 30], [RIB.x, RIB.z, 26], [PAV.x, PAV.z, 26], [ROS.x, ROS.z, 22], [-10, -5, 12]], tries = 0, total = 0;
    while (total < N * 3 && tries < N * 30) {
      tries++;
      var a = rand() * Math.PI * 2, r = 50 + rand() * 360, fx = Math.cos(a) * r, fz = Math.sin(a) * r - 40;
      if (fbm(fx * .015 + 3, fz * .015, 3) < .46) continue;
      if (keepOut.some(function (k) { return Math.hypot(fx - k[0], fz - k[1]) < k[2]; })) continue;
      var kind = Math.floor(rand() * 3), mm = meshes[kind]; if (mm.count >= N) continue;
      var ht = 7 + rand() * 9, wd = ht * (kind === 1 ? .55 : kind === 2 ? 1.1 : .85);
      e3.set(0, rand() * Math.PI, 0); q4.setFromEuler(e3);
      m4.compose(V(fx, hgt(fx, fz) - .4, fz), q4, V(wd, ht, wd)); mm.setMatrixAt(mm.count++, m4); total++;
    }
  })();

  /* ---------- falling leaves (tumbling) and snow ---------- */
  var FN = reduce ? 0 : (mobile ? 90 : 240), SN = reduce ? 0 : (mobile ? 500 : 1400);
  var fallMat = new T.MeshStandardMaterial({ map: leafTex, alphaTest: .45, side: T.DoubleSide, roughness: .75 });
  var falling = new T.InstancedMesh(leafGeo.clone(), fallMat, Math.max(FN, 1)); falling.frustumCulled = false; scene.add(falling);
  falling.instanceColor = new T.InstancedBufferAttribute(new Float32Array(Math.max(FN, 1) * 3).fill(1), 3);
  var fState = [];
  for (i = 0; i < Math.max(FN, 1); i++) { fState.push({ alive: false, p: V(0, 0, 0), v: V(0, 0, 0), r: V(0, 0, 0), rv: V(0, 0, 0), c: new T.Color() }); m4.makeScale(0, 0, 0); falling.setMatrixAt(i, m4); }
  var snowPos = new Float32Array(Math.max(SN, 1) * 3), snowVel = new Float32Array(Math.max(SN, 1));
  for (i = 0; i < SN; i++) { snowPos[i * 3] = (rand() - .5) * 120; snowPos[i * 3 + 1] = rand() * 40; snowPos[i * 3 + 2] = (rand() - .5) * 120; snowVel[i] = 1 + rand() * 1.4; }
  var snowGeo = new T.BufferGeometry(); snowGeo.setAttribute("position", new T.BufferAttribute(snowPos, 3));
  var softDot = canvasTex(32, 32, function (g) { var gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.5, "rgba(255,255,255,.7)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
  var snowMat = new T.PointsMaterial({ size: mobile ? .34 : .28, map: softDot, transparent: true, depthWrite: false, opacity: 0 });
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

  /* ---------- birds ---------- */
  var birds = [], birdMat = new T.MeshBasicMaterial({ color: 0x1d1a1c, side: T.DoubleSide });
  for (var bd = 0; bd < (mobile ? 7 : 13); bd++) {
    var bg = new T.BufferGeometry();
    bg.setAttribute("position", new T.BufferAttribute(new Float32Array([0, 0, .18, -.8, 0, 0, 0, 0, -.18, 0, 0, .18, .8, 0, 0, 0, 0, -.18]), 3));
    var bm = new T.Mesh(bg, birdMat); bm.userData = { r: 20 + rand() * 30, a: rand() * 6.28, sp: .1 + rand() * .08, y: 40 + rand() * 18, ph: rand() * 6 };
    birds.push(bm); scene.add(bm);
  }

  /* ---------- canvas text textures (redrawn when fonts are ready) ---------- */
  var textJobs = [];
  function textTexture(w, h, draw) {
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding; tex.anisotropy = maxAniso;
    var job = function () { var g = c.getContext("2d"); g.clearRect(0, 0, w, h); draw(g, w, h); tex.needsUpdate = true; };
    job(); textJobs.push(job); return tex;
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { textJobs.forEach(function (j) { j(); }); });

  /* ---------- satin cloth (ribbons, rosette tails, flags) with lit waves ---------- */
  function clothMaterial(map, seedV, opts) {
    opts = opts || {};
    var m = new T.MeshStandardMaterial({ map: map, roughness: opts.rough || .38, metalness: .08, side: T.DoubleSide });
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uTime = U.uTime; sh.uniforms.uWind = U.uWind; sh.uniforms.uSeed = { value: seedV };
      var hz = !!opts.horizontal;
      sh.vertexShader = "uniform float uTime,uSeed; uniform vec2 uWind;\n" + sh.vertexShader
        .replace("#include <beginnormal_vertex>", [
          "float fq = " + (hz ? "uv.x" : "1.-uv.y") + ";",
          "float ph = uTime*2.3 + fq*5.5 + uSeed;",
          "float dzd = cos(ph)*5.5*.42*fq + sin(ph)*.42 + uWind.x*6.*fq;",
          "vec3 objectNormal = normalize(vec3(" + (hz ? "-dzd*.35, 0., 1." : "0., -dzd*.35, 1.") + "));",
          "#ifdef USE_TANGENT", "vec3 objectTangent = vec3( tangent.xyz );", "#endif"].join("\n"))
        .replace("#include <begin_vertex>", [
          "vec3 transformed = vec3( position );",
          "transformed.z += sin(ph)*.42*fq + uWind.x*3.*fq*fq;",
          "transformed.x += sin(uTime*1.7 + fq*4. + uSeed*2.)*.1*fq + uWind.x*2.*fq;"].join("\n"));
      if (opts.notch) sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n if(vUv.y < .13*(1.-abs(vUv.x-.5)*2.)) discard;");
    };
    return m;
  }

  /* ---------- the class ribbon field ---------- */
  var CLASSES = [["1", "Website design"], ["2", "Wild Apricot"], ["3", "Print & advertising"], ["4", "Branding"], ["5", "SEO & marketing"], ["6", "Copywriting"], ["7", "Care Plan"]];
  var RCOL = ["#7a215c", "#48541a", "#2f6f93"];
  var woodTex = canvasTex(128, 512, function (g, w, h) {
    g.fillStyle = "#8a6a45"; g.fillRect(0, 0, w, h);
    for (var i = 0; i < 160; i++) { g.strokeStyle = pick(["#6b4f31", "#a07c52", "#5a4129", "#b48d5e"]); g.globalAlpha = .25 + rand() * .4; g.lineWidth = .5 + rand() * 2; var x = rand() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, h * .3, x - 6, h * .6, x + (rand() - .5) * 8, h); g.stroke(); }
    g.globalAlpha = 1;
  }, [1, 1]);
  var timberMat = new T.MeshStandardMaterial({ map: woodTex, bumpMap: woodTex, bumpScale: .03, roughness: .85, color: 0xcfc1ae });
  var postMat = new T.MeshStandardMaterial({ map: woodTex, roughness: .8, color: 0x8a8f6a });
  var brassMat = new T.MeshStandardMaterial({ color: 0xd6b26a, metalness: .85, roughness: .32 });
  var ribbonField = new T.Group(); ribbonField.position.copy(RIB); scene.add(ribbonField);
  CLASSES.forEach(function (cl, i) {
    var rx = (i - 3) * 2.6, rz = -Math.abs(i - 3) * 0.9;
    var post = new T.Mesh(new T.CylinderGeometry(.1, .13, 8.4, 10), postMat); post.position.set(rx, 4.2, rz); post.castShadow = true; ribbonField.add(post);
    var knob = new T.Mesh(new T.SphereGeometry(.22, 16, 12), brassMat); knob.position.set(rx, 8.5, rz); ribbonField.add(knob);
    var tex = textTexture(200, 800, function (g, w, h) {
      g.fillStyle = RCOL[i % 3]; g.fillRect(0, 0, w, h);
      var sh = g.createLinearGradient(0, 0, w, 0); sh.addColorStop(0, "rgba(0,0,0,.18)"); sh.addColorStop(.5, "rgba(255,255,255,.12)"); sh.addColorStop(1, "rgba(0,0,0,.18)"); g.fillStyle = sh; g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(227,194,124,.85)"; g.lineWidth = 5; g.strokeRect(14, -10, w - 28, h + 20);
      g.fillStyle = "#e3c27c"; g.beginPath(); g.arc(w / 2, 108, 62, 0, Math.PI * 2); g.fill();
      g.fillStyle = RCOL[i % 3]; g.font = "400 76px Bevan, Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(cl[0], w / 2, 113);
      g.save(); g.translate(w / 2, 212); g.rotate(Math.PI / 2); g.fillStyle = "#fbfcf7"; g.textAlign = "left"; g.textBaseline = "middle";
      var fz = 58, face = "px 'Sofia Sans Extra Condensed', 'Arial Narrow', sans-serif"; g.font = "800 " + fz + face;
      var twd = g.measureText(cl[1].toUpperCase()).width; if (twd > 450) { fz = Math.floor(fz * 450 / twd); g.font = "800 " + fz + face; }
      g.fillText(cl[1].toUpperCase(), 0, 0); g.restore();
    });
    var m = new T.Mesh(new T.PlaneGeometry(1.15, 4.6, 6, 40), clothMaterial(tex, i * 1.7, { notch: true }));
    m.position.set(rx + .62, 8.1 - 2.3, rz + .05); m.castShadow = true; ribbonField.add(m);
  });
  var bunting = [];
  function addBunting(group, from, to, sag, n, colors) {
    var pts = []; for (var kk = 0; kk <= 24; kk++) { var t = kk / 24, p = from.clone().lerp(to, t); p.y -= Math.sin(Math.PI * t) * sag; pts.push(p); }
    group.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x2b2227 })));
    var flagGeo = new T.BufferGeometry(); flagGeo.setAttribute("position", new T.BufferAttribute(new Float32Array([-.32, 0, 0, .32, 0, 0, 0, -.7, 0]), 3)); flagGeo.computeVertexNormals();
    for (var f = 1; f < n; f++) {
      var t2 = f / n, p2 = from.clone().lerp(to, t2); p2.y -= Math.sin(Math.PI * t2) * sag;
      var fl = new T.Mesh(flagGeo, new T.MeshStandardMaterial({ color: colors[f % colors.length], side: T.DoubleSide, roughness: .8 }));
      fl.position.copy(p2); fl.lookAt(p2.x, p2.y, p2.z + 10); fl.userData.ph = f * .7; fl.castShadow = true; group.add(fl); bunting.push(fl);
    }
  }
  addBunting(ribbonField, V(-7.8, 8.3, -2.7), V(7.8, 8.3, -2.7), 1.1, 22, [0x7a215c, 0xe3c27c, 0x48541a, 0x2f6f93]);

  /* ---------- the show marquee: striped canvas roof, timber floor, hanging entries ---------- */
  var pavilion = new T.Group(); pavilion.position.copy(PAV); scene.add(pavilion);
  var boardsTex = canvasTex(512, 512, function (g, w) {
    for (var i = 0; i < 16; i++) {
      g.fillStyle = pick(["#9b7a52", "#a5845a", "#8f6f48", "#ae8c60"]); g.fillRect(0, i * 32, w, 32); g.fillStyle = "rgba(40,25,10,.45)"; g.fillRect(0, i * 32, w, 2);
      for (var kk = 0; kk < 30; kk++) { g.fillStyle = "rgba(60,40,20," + (rand() * .2).toFixed(2) + ")"; g.fillRect(rand() * w, i * 32 + rand() * 30, 20 + rand() * 60, 1); }
    }
  }, [3, 3]);
  var floor = new T.Mesh(new T.CylinderGeometry(12.5, 12.8, .5, 48), new T.MeshStandardMaterial({ map: boardsTex, roughness: .8 })); floor.position.y = .1; floor.receiveShadow = true; pavilion.add(floor);
  for (var pp = 0; pp < 8; pp++) {
    var pa = pp / 8 * Math.PI * 2 + Math.PI / 8;
    var post2 = new T.Mesh(new T.CylinderGeometry(.2, .24, 7.4, 10), timberMat); post2.position.set(Math.cos(pa) * 11.6, 3.9, Math.sin(pa) * 11.6); post2.castShadow = true; pavilion.add(post2);
  }
  var stripeTex = canvasTex(1024, 256, function (g, w, h) { for (var si = 0; si < 16; si++) { g.fillStyle = si % 2 ? "#f3ece0" : "#7a215c"; g.fillRect(si * w / 16, 0, w / 16 + 1, h); } g.fillStyle = "rgba(0,0,0,.06)"; for (si = 0; si < 300; si++) g.fillRect(rand() * w, rand() * h, 1, 4); });
  var roofMat = new T.MeshStandardMaterial({ map: stripeTex, roughness: .92, side: T.DoubleSide });
  var roof = new T.Mesh(new T.ConeGeometry(14.2, 4.8, 16, 1, true), roofMat); roof.position.y = 10; roof.castShadow = true; pavilion.add(roof);
  var valance = new T.Mesh(new T.CylinderGeometry(14.2, 14.2, 1.1, 32, 1, true), roofMat); valance.position.y = 7.1; pavilion.add(valance);
  var finial = new T.Mesh(new T.SphereGeometry(.42, 16, 12), brassMat); finial.position.y = 12.5; pavilion.add(finial);
  var flagPole = new T.Mesh(new T.CylinderGeometry(.05, .05, 2.4, 8), timberMat); flagPole.position.y = 13.4; pavilion.add(flagPole);
  var flag = new T.Mesh(new T.PlaneGeometry(1.9, 1.05, 12, 4), clothMaterial(canvasTex(64, 32, function (g) { g.fillStyle = "#e3c27c"; g.fillRect(0, 0, 64, 32); }), 3, { horizontal: true }));
  flag.position.set(.95, 14, 0); pavilion.add(flag);
  var lamp = new T.PointLight(0xffd9a0, 1.2, 30, 1.5); lamp.position.set(0, 6.4, 0); pavilion.add(lamp);

  var carousel = new T.Group(); carousel.position.y = 3.6; pavilion.add(carousel);
  var cards = [], entries = (HC.entries || []).slice();
  var featured = ["parramatta-district-regional-law-society", "farm-writers-association-of-nsw", "knox-farms", "botanical-art-society-logo", "jnw-strategic-consulting", "red-olive-restaurant", "colour-society-of-australia", "maserati-club-of-australia"];
  var shown = PAGE === "work" ? entries.slice(0, mobile ? 10 : 16) : featured.map(function (sl) { return entries.filter(function (e) { return e.slug === sl; })[0]; }).filter(Boolean);
  var R = shown.length > 10 ? 10.2 : 8.6;
  var loader = new T.TextureLoader(), cls = HC.classes || {};
  var paperMat = new T.MeshStandardMaterial({ color: 0xf6f3ea, roughness: .9 });
  var stringMat = new T.LineBasicMaterial({ color: 0x4a3a28 });
  shown.forEach(function (e, ci) {
    var a = ci / shown.length * Math.PI * 2;
    var holder = new T.Group(); holder.position.set(Math.sin(a) * R, 0, Math.cos(a) * R); holder.rotation.y = a; carousel.add(holder);
    var card = new T.Group(); holder.add(card);
    var frame = new T.Mesh(new T.BoxGeometry(3.2, 2.62, .07), paperMat); frame.castShadow = true; card.add(frame);
    var placeholder = textTexture(512, 384, function (g, w, h) {
      g.fillStyle = "#efefef"; g.fillRect(0, 0, w, h); g.fillStyle = "#561642"; g.font = "400 34px Bevan, Georgia, serif"; g.textAlign = "center";
      var words = e.title.split(" "), line = "", lines = []; words.forEach(function (wd) { if ((line + wd).length > 18) { lines.push(line); line = ""; } line += wd + " "; }); lines.push(line);
      lines.forEach(function (l, kk) { g.fillText(l.trim(), w / 2, h / 2 - 20 + kk * 40); });
    });
    var imgMat = new T.MeshStandardMaterial({ map: placeholder, roughness: .55 });
    var img = new T.Mesh(new T.PlaneGeometry(2.96, 2.22), imgMat); img.position.set(0, .12, .04); card.add(img);
    if (location.protocol !== "file:") loader.load(BASE + e.img, function (tx) { tx.encoding = T.sRGBEncoding; tx.anisotropy = maxAniso; if (e.contain) { tx.repeat.set(.82, .82); tx.offset.set(.09, .09); } imgMat.map = tx; imgMat.needsUpdate = true; });
    var label = textTexture(512, 64, function (g, w, h) { g.fillStyle = "#f6f3ea"; g.fillRect(0, 0, w, h); g.fillStyle = "#1f1a1e"; g.font = "400 26px Bevan, Georgia, serif"; g.fillText(e.title.length > 32 ? e.title.slice(0, 31) + "…" : e.title, 14, 40); });
    var lab = new T.Mesh(new T.PlaneGeometry(2.96, .37), new T.MeshStandardMaterial({ map: label, roughness: .9 })); lab.position.set(0, -1.12, .04); card.add(lab);
    var tagTxt = textTexture(128, 96, function (g, w) { g.fillStyle = "#e3c27c"; g.fillRect(0, 0, w, 96); g.fillStyle = "#34102a"; g.font = "800 30px 'Sofia Sans Extra Condensed', sans-serif"; g.textAlign = "center"; g.fillText("CLASS " + ((cls[e.cls] || {}).no || ""), w / 2, 60); });
    var tag = new T.Mesh(new T.PlaneGeometry(.62, .44), new T.MeshStandardMaterial({ map: tagTxt, roughness: .9, side: T.DoubleSide })); tag.position.set(1.1, 1.38, .05); tag.rotation.z = .12; card.add(tag);
    card.add(new T.Line(new T.BufferGeometry().setFromPoints([V(0, 1.31, 0), V(0, 3.4, 0)]), stringMat));
    card.userData = { entry: e, swing: 0, sv: 0, lift: 0, i: ci };
    frame.userData.card = card; img.userData.card = card; lab.userData.card = card;
    cards.push(card);
  });
  addBunting(pavilion, V(-11.6, 7.4, 4.4), V(11.6, 7.4, 4.4), .9, 20, [0x7a215c, 0xe3c27c, 0x48541a, 0x2f6f93]);

  /* ---------- the judges' rosette: satin pleats ---------- */
  var rosette = new T.Group(); rosette.position.set(ROS.x, ROS.y + 7.5, ROS.z); scene.add(rosette);
  var rosInner = new T.Group(); rosette.add(rosInner);
  function pleatRing(r0, r1, n, color, zz) {
    var geo = new T.PlaneGeometry(r1 - r0, (Math.PI * 2 * r1) / n * 1.18), mat = new T.MeshStandardMaterial({ color: color, roughness: .3, metalness: .12, side: T.DoubleSide });
    for (var kk = 0; kk < n; kk++) { var mm = new T.Mesh(geo, mat), a = kk / n * Math.PI * 2; mm.position.set(Math.cos(a) * (r0 + r1) / 2, Math.sin(a) * (r0 + r1) / 2, zz); mm.rotation.z = a; mm.rotateX(kk % 2 ? .55 : -.55); mm.castShadow = true; rosInner.add(mm); }
  }
  pleatRing(2.4, 3.6, 72, 0x7a215c, 0);
  pleatRing(1.55, 2.5, 54, 0xd8b56e, .12);
  var rosCenter = new T.Mesh(new T.CircleGeometry(1.6, 64), new T.MeshStandardMaterial({ roughness: .6, metalness: .05, map: textTexture(512, 512, function (g, w, h) {
    var gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, "#fbf8f0"); gr.addColorStop(1, "#e9e2d1"); g.fillStyle = gr; g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#b8963f"; g.lineWidth = 12; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 30, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#561642"; g.textAlign = "center"; g.font = "800 92px 'Sofia Sans Extra Condensed', sans-serif"; g.fillText("HIGHLY", w / 2, h / 2 - 6);
    g.font = "800 66px 'Sofia Sans Extra Condensed', sans-serif"; g.fillText("COMMENDED", w / 2, h / 2 + 72);
  }) }));
  rosCenter.position.z = .25; rosInner.add(rosCenter);
  var tailTex = textTexture(64, 256, function (g, w, h) { g.fillStyle = "#7a215c"; g.fillRect(0, 0, w, h); var gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "rgba(0,0,0,.2)"); gr.addColorStop(.5, "rgba(255,255,255,.14)"); gr.addColorStop(1, "rgba(0,0,0,.2)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  [-1, 1].forEach(function (sgn, kk) {
    var tail = new T.Mesh(new T.PlaneGeometry(1.3, 6, 4, 30), clothMaterial(tailTex, kk * 2.1, { notch: true, rough: .3 }));
    tail.position.set(sgn * .9, -4.2, -.1); tail.rotation.z = sgn * .2; tail.castShadow = true; rosette.add(tail);
  });
  var rosSpin = 0, rosSpinV = 0;

  /* ---------- the studio: weatherboard cottage whose windows light at dusk ---------- */
  var cottage = new T.Group(), CX = TREE.x - 10, CZ = TREE.z - 5; cottage.position.set(CX, hgt(CX, CZ) - .3, CZ); cottage.rotation.y = .5; scene.add(cottage);
  var boardTex = canvasTex(256, 256, function (g, w) { for (var bi = 0; bi < 16; bi++) { g.fillStyle = bi % 2 ? "#ece6d6" : "#e4ddcb"; g.fillRect(0, bi * 16, w, 16); g.fillStyle = "rgba(60,50,30,.25)"; g.fillRect(0, bi * 16 + 14, w, 2); } }, [2, 1.4]);
  var walls = new T.Mesh(new T.BoxGeometry(5, 3.2, 3.8), new T.MeshStandardMaterial({ map: boardTex, roughness: .85 })); walls.position.y = 1.6; walls.castShadow = walls.receiveShadow = true; cottage.add(walls);
  var ironTex = canvasTex(256, 64, function (g, w, h) { for (var ii = 0; ii < 32; ii++) { var gr = g.createLinearGradient(ii * 8, 0, ii * 8 + 8, 0); gr.addColorStop(0, "#5e1a47"); gr.addColorStop(.5, "#8a2f6a"); gr.addColorStop(1, "#5e1a47"); g.fillStyle = gr; g.fillRect(ii * 8, 0, 8, h); } }, [3, 1]);
  var roof2 = new T.Mesh(new T.ConeGeometry(3.9, 2.4, 4), new T.MeshStandardMaterial({ map: ironTex, metalness: .45, roughness: .45 })); roof2.position.y = 4.4; roof2.rotation.y = Math.PI / 4; roof2.scale.set(1.05, 1, .8); roof2.castShadow = true; cottage.add(roof2);
  var chimney = new T.Mesh(new T.BoxGeometry(.6, 1.6, .6), new T.MeshStandardMaterial({ color: 0x8a4a35, roughness: .95 })); chimney.position.set(1.4, 4.6, -.6); chimney.castShadow = true; cottage.add(chimney);
  var winMat = new T.MeshStandardMaterial({ color: 0x2c3036, roughness: .15, metalness: .3, emissive: 0xffc566, emissiveIntensity: 0 });
  [-1.2, 1.2].forEach(function (wx) {
    var w = new T.Mesh(new T.PlaneGeometry(1, 1.1), winMat); w.position.set(wx, 1.9, 1.91); cottage.add(w);
    var fr = new T.Mesh(new T.PlaneGeometry(1.16, 1.26), new T.MeshStandardMaterial({ color: 0xf6f3ea, roughness: .8 })); fr.position.set(wx, 1.9, 1.905); cottage.add(fr);
  });
  var door = new T.Mesh(new T.PlaneGeometry(.9, 1.8), new T.MeshStandardMaterial({ color: 0x48541a, roughness: .6 })); door.position.set(0, .9, 1.91); cottage.add(door);
  var glow = new T.PointLight(0xffc06a, 0, 20, 1.6); glow.position.set(0, 2, 3.2); cottage.add(glow);

  /* ---------- night: stars and fireflies ---------- */
  var sN = mobile ? 400 : 900, sPos = new Float32Array(sN * 3);
  for (var sti = 0; sti < sN; sti++) { var th = rand() * Math.PI * 2, ph = .05 + rand() * 1.2; sPos[sti * 3] = Math.cos(th) * Math.cos(ph) * 1000; sPos[sti * 3 + 1] = Math.sin(ph) * 1000; sPos[sti * 3 + 2] = Math.sin(th) * Math.cos(ph) * 1000; }
  var starGeo = new T.BufferGeometry(); starGeo.setAttribute("position", new T.BufferAttribute(sPos, 3));
  var starMat = new T.PointsMaterial({ color: 0xfff3dc, size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  scene.add(new T.Points(starGeo, starMat));
  var ffN = mobile ? 24 : 50, ffPos = new Float32Array(ffN * 3), ffBase = [];
  for (var ff = 0; ff < ffN; ff++) { var fa = rand() * 6.28, fr2 = 3 + rand() * 12; ffBase.push([Math.cos(fa) * fr2, 1 + rand() * 6, Math.sin(fa) * fr2, rand() * 6.28]); }
  var ffGeo = new T.BufferGeometry(); ffGeo.setAttribute("position", new T.BufferAttribute(ffPos, 3));
  var ffMat = new T.PointsMaterial({ color: 0xffd56b, size: mobile ? 4 : 5, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false, map: softDot });
  var fireflies = new T.Points(ffGeo, ffMat); fireflies.position.copy(TREE); fireflies.frustumCulled = false; scene.add(fireflies);

  /* ---------- stations ---------- */
  var heroLookX = mobile ? 0 : -1;
  var ST = {
    tree: { pos: V(TREE.x + 5, TREE.y + 9, TREE.z + 48), look: V(TREE.x + heroLookX, TREE.y + 9.5, TREE.z), dusk: 0, orbit: true },
    ribbons: { pos: V(RIB.x, RIB.y + 6.4, RIB.z + (mobile ? 22 : 27)), look: V(RIB.x, RIB.y + 5, RIB.z), dusk: 0 },
    sky: { pos: V(14, 40, 74), look: V(-24, 76, -50), dusk: .08 },
    pavilion: { pos: V(PAV.x, PAV.y + (mobile ? 5.6 : 4.6), PAV.z + (mobile ? 19 : 21)), look: V(PAV.x, PAV.y + (mobile ? 5.2 : 3.7), PAV.z), dusk: .05, carousel: true },
    rosette: { pos: V(ROS.x, ROS.y + 7.2, ROS.z + 18), look: V(ROS.x, ROS.y + 7, ROS.z), dusk: .12, rosette: true },
    meadow: { pos: V(-34, 30, 104), look: V(4, 6, -10), dusk: .18 },
    studio: { pos: V(TREE.x + 15, TREE.y + 9, TREE.z + 22), look: V(TREE.x - 2, TREE.y + 8, TREE.z), dusk: .34 },
    dusk: { pos: V(TREE.x + 4, TREE.y + 5, TREE.z + 32), look: V(TREE.x - 5, TREE.y + 6, TREE.z), dusk: 1 }
  };
  if (mobile) { ST.tree.pos = V(TREE.x + 3, TREE.y + 7, TREE.z + 52); ST.tree.look = V(TREE.x, TREE.y + 11, TREE.z); }
  var PAGE_STATION = { home: "tree", services: "ribbons", "wild-apricot": "sky", work: "pavilion", about: "studio", contact: "dusk", pitch: "meadow" };

  var anchors = [], hero = document.querySelector("[data-hero]");
  function measure() {
    var vh = innerHeight, y = scrollY, list = [].slice.call(document.querySelectorAll("[data-station]"));
    anchors = list.map(function (el) {
      var r = el.getBoundingClientRect(), top = r.top + y, hh = r.height, start = top - vh * .45, end = Math.max(start, top + hh - vh * .75);
      var sd = el.getAttribute("data-side");
      return { st: el.getAttribute("data-station"), side: sd === "left" ? 1 : sd === "right" ? -1 : 0, start: start, end: end };
    }).sort(function (a, b) { return a.start - b.start; });
    if (!anchors.length) anchors = [{ st: PAGE_STATION[PAGE] || "tree", side: 0, start: 0, end: 1e9 }];
    anchors[0].start = Math.min(anchors[0].start, 0);
  }
  var tgtPos = V(0, 0, 0), tgtLook = V(0, 0, 0), curPos = V(0, 0, 0), curLook = V(0, 0, 0), tmpV = V(0, 0, 0);
  var weights = { carousel: 0, rosette: 0, orbit: 0 }, duskT = 0, rightV = V(0, 0, 0), sideNow = 0;
  function sideShift(v) {
    if (mobile || !v) return;
    rightV.copy(tgtLook).sub(tgtPos); var dist = rightV.length();
    rightV.cross(up).normalize().multiplyScalar(v * dist * Math.tan(camera.fov * Math.PI / 360) * camera.aspect * .48);
    tgtPos.add(rightV); tgtLook.add(rightV);
  }
  function sample(y) { var st = sample0(y); sideShift(sideNow); return st; }
  function sample0(y) {
    var a = anchors, ai = 0;
    while (ai < a.length - 1 && y > a[ai].end && y >= a[ai + 1].start) ai++;
    var A = a[ai], S = ST[A.st] || ST.tree;
    if (y <= A.end || ai === a.length - 1) {
      var hold = A.end > A.start ? clamp((y - A.start) / (A.end - A.start), 0, 1) : 0;
      tgtPos.copy(S.pos); tgtLook.copy(S.look); tgtPos.x += (hold - .5) * 3; tgtPos.y += (hold - .5) * -1.6;
      sideNow = A.side || 0; duskT = S.dusk; weights.carousel = S.carousel ? 1 : 0; weights.rosette = S.rosette ? 1 : 0; weights.orbit = S.orbit ? 1 : 0;
      return A.st;
    }
    var B = a[ai + 1], SB = ST[B.st] || ST.tree, t = ease(clamp((y - A.end) / Math.max(1, B.start - A.end), 0, 1));
    tgtPos.copy(S.pos).lerp(SB.pos, t); tgtLook.copy(S.look).lerp(SB.look, t);
    tgtPos.y += Math.sin(Math.PI * t) * Math.min(26, S.pos.distanceTo(SB.pos) * .22);
    duskT = lerp(S.dusk, SB.dusk, t); sideNow = lerp(A.side || 0, B.side || 0, t);
    weights.carousel = lerp(S.carousel ? 1 : 0, SB.carousel ? 1 : 0, t); weights.rosette = lerp(S.rosette ? 1 : 0, SB.rosette ? 1 : 0, t); weights.orbit = lerp(S.orbit ? 1 : 0, SB.orbit ? 1 : 0, t);
    return t < .5 ? A.st : B.st;
  }

  /* ---------- seasons ---------- */
  var SEASON_NAMES = ["Spring", "Summer", "Autumn", "Winter"];
  function realSeason() { var mo = new Date().getMonth(); return mo >= 8 && mo <= 10 ? 0 : (mo === 11 || mo <= 1) ? 1 : (mo >= 2 && mo <= 4) ? 2 : 3; }
  var season0 = realSeason(), season = season0, seasonShown = -1;
  var seasonBtns = [].slice.call(document.querySelectorAll("button[data-season]"));
  var seasonFill = document.querySelector("[data-season-fill]");
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
  }

  /* ---------- pointer: gusts, orbit drag, marquee spin, hover ---------- */
  var pointer = new T.Vector2(), pNorm = new T.Vector2(), lastPX = null, lastPY = null, gust = new T.Vector2();
  var dragging = false, dragX = 0, dragY = 0, orbitYaw = 0, orbitPitch = 0, yawV = 0, carouselA = 0, carouselV = 0, dragMoved = 0;
  var finePtr = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var ray = new T.Raycaster(), hoverCard = null, tip = finePtr ? document.getElementById("world-tip") : null;
  function isEmpty(el) { return !el || !el.closest || !el.closest("a,button,input,select,textarea,label,form,.panel,.cover,.tag,.site-head,.concept-bar,dialog,[data-solid],.entry-card,.member,.win,.details-card,.gate,.pitch-head,.svc,.story,.rules,.sheet,.filters,.care-card,.manifesto-pull,.membership-art,.feature-table"); }
  window.addEventListener("pointermove", function (e) {
    pNorm.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    if (lastPX !== null && !reduce) { gust.x += clamp((e.clientX - lastPX) * .0007, -.04, .04); gust.y += clamp((e.clientY - lastPY) * .0004, -.025, .025); }
    lastPX = e.clientX; lastPY = e.clientY;
    if (dragging) {
      var dx = e.clientX - dragX, dy = e.clientY - dragY; dragX = e.clientX; dragY = e.clientY; dragMoved += Math.abs(dx) + Math.abs(dy);
      if (weights.carousel > .5) carouselV = dx * .0042; else { yawV = dx * .0042; orbitPitch = clamp(orbitPitch + dy * .002, -.2, .35); }
    }
    pointer.copy(pNorm);
    document.body.classList.toggle("world-grab", isEmpty(document.elementFromPoint(e.clientX, e.clientY)) && (weights.orbit > .5 || weights.carousel > .5 || weights.rosette > .5));
    if (tip) tip.style.transform = "translate(" + (e.clientX + 16) + "px," + (e.clientY + 18) + "px)";
  }, { passive: true });
  window.addEventListener("pointerdown", function (e) { if (!isEmpty(e.target)) return; dragging = true; dragX = e.clientX; dragY = e.clientY; dragMoved = 0; document.body.classList.add("world-dragging"); });
  window.addEventListener("pointercancel", function () { dragging = false; document.body.classList.remove("world-dragging"); });
  window.addEventListener("pointerup", function (e) { if (!dragging) return; dragging = false; document.body.classList.remove("world-dragging"); if (dragMoved < 6) clickWorld(e); });
  function clickWorld(e) {
    ray.setFromCamera(pNorm.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
    if (weights.carousel > .3) { var hit = ray.intersectObjects(carousel.children, true)[0]; if (hit && hit.object.userData.card) { openEntry(hit.object.userData.card.userData.entry); return; } }
    if (weights.rosette > .3 && ray.intersectObject(rosette, true).length) { rosSpinV += .35; return; }
    gust.x += .07;
  }
  function openEntry(e) {
    if (document.querySelector("[data-work]")) { document.dispatchEvent(new CustomEvent("hc:open-entry", { detail: e.slug })); return; }
    var href = "work.html#" + e.slug; if (window.HCgo) window.HCgo(href); else location.href = href;
  }

  /* ---------- resize ---------- */
  var W = 0, H = 0;
  function resize() {
    var w = innerWidth, hh = innerHeight;
    if (Math.abs(w - W) < 1 && Math.abs(hh - H) < 140 && W) return;
    W = w; H = hh; renderer.setSize(w, hh, false);
    camera.aspect = w / hh; camera.fov = w < 700 ? 50 : 40; camera.updateProjectionMatrix();
    measure();
  }
  window.addEventListener("resize", resize); window.addEventListener("load", measure);
  resize();

  /* ---------- arrival: fly in from the page we came from ---------- */
  var from = null; try { from = sessionStorage.getItem("hc-station"); } catch (e) {}
  sample(scrollY);
  if (from && ST[from] && !reduce) { curPos.copy(ST[from].pos); curLook.copy(ST[from].look); }
  else { curPos.copy(tgtPos).add(V(0, reduce ? 0 : 14, reduce ? 0 : 22)); curLook.copy(tgtLook); }
  var arrive = reduce ? 0 : 1;
  window.HCstation = function () { return sample(scrollY); };

  /* ---------- loop ---------- */
  var perfFrames = 0, perfTime = 0, perfLevel = 0;
  function degrade() {
    perfLevel++;
    if (perfLevel === 1) { sun.castShadow = false; leaves.castShadow = false; grassMeshes.forEach(function (g) { g.count = Math.floor(g.userData.full * .4); }); renderer.setPixelRatio(Math.min(1, DPR)); W = 0; resize(); }
    if (perfLevel === 2) { grassMeshes.forEach(function (g) { g.count = Math.floor(g.userData.full * .12); }); renderer.setPixelRatio(.75); W = 0; resize(); }
    doc.setAttribute("data-world-quality", String(2 - perfLevel));
  }
  var running = true, last = 0, prevStation = "", sunDay = V(.45, .55, .35).normalize(), sunDusk = V(-.75, .07, -.25).normalize();
  var fogDay = new T.Color(.74, .82, .9).convertSRGBToLinear(), fogDusk = new T.Color(.62, .4, .38).convertSRGBToLinear(), fogWinter = new T.Color(.82, .85, .88).convertSRGBToLinear();
  var hemiSky = col("#cfe3f5"), hemiDusk = col("#5a3a5a"), sunCol = col("#fff1dc"), sunColDusk = col("#ff9a5a");
  document.addEventListener("visibilitychange", function () { running = !document.hidden; if (running) requestAnimationFrame(frame); });
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    var rawDt = (now - last) / 1000 || .016, dt = Math.min(.05, rawDt); last = now;
    if (perfLevel < 2 && rawDt < 1) { perfFrames++; perfTime += rawDt; if (perfFrames >= 60) { if (perfFrames / perfTime < 26) degrade(); perfFrames = 0; perfTime = 0; } }
    var t = reduce ? 0 : clock.getElapsedTime();
    U.uTime.value = t; skyU.uTime.value = t;

    // seasons: the hero turns the year; past it, the year rolls back into spring
    var hp = heroProgress();
    season = hero ? season0 + hp * 3 : season0;
    if (hero && hp >= 1) { var hr = hero.getBoundingClientRect(), after = innerHeight - hr.bottom, rest = document.documentElement.scrollHeight - (hr.bottom + scrollY); season = season0 + 3 + smooth(0, .22, after / Math.max(1, rest)); }
    U.uSeason.value = season;
    var sv = ((season % 4) + 4) % 4;
    U.uDrop.value = sv < 2 ? 0 : sv < 2.7 ? (sv - 2) / .7 * .45 : sv < 3 ? .45 + (sv - 2.7) / .3 * .53 : sv < 3.6 ? .98 : Math.max(0, .98 - (sv - 3.6) * 2.45);
    var frost = sv > 2.8 && sv < 3.75 ? smooth(2.8, 3.05, sv) * (1 - smooth(3.55, 3.75, sv)) : 0;
    U.uFrost.value = frost; skyU.uWinter.value = frost;
    var autumn = sv > 1.8 && sv < 3 ? 1 : 0;
    terrainMat.emissive.setRGB(frost * .26, frost * .28, frost * .31);
    terrainMat.color.setRGB(1 + autumn * .1, 1 - autumn * .03, 1 - autumn * .18);
    updateSeasonUI(season);

    // wind
    gust.multiplyScalar(.95);
    U.uWind.value.set(Math.sin(t * .3) * .035 + gust.x, Math.cos(t * .23) * .02 + gust.y);

    // camera
    var st = sample(scrollY);
    if (st !== prevStation) { prevStation = st; try { sessionStorage.setItem("hc-station", st); } catch (e) {} }
    yawV *= .92; orbitYaw += yawV; if (weights.orbit < .5 && !dragging) orbitYaw *= .97;
    if (!dragging) orbitPitch *= .97;
    var yaw = reduce ? 0 : orbitYaw + Math.sin(t * .11) * .06 * weights.orbit;
    tmpV.copy(tgtPos).sub(tgtLook); tmpV.applyAxisAngle(up, yaw); tmpV.y += orbitPitch * tmpV.length();
    tgtPos.copy(tgtLook).add(tmpV);
    tgtLook.x += pointer.x * 1.2; tgtLook.y += pointer.y * .7;
    var kf = reduce || snapCam ? 1 : 1 - Math.exp(-dt * (arrive > 0 ? 1.15 : 3.2));
    if (arrive > 0) arrive = Math.max(0, arrive - dt * .45);
    curPos.lerp(tgtPos, kf); curLook.lerp(tgtLook, kf);
    camera.position.copy(curPos); camera.lookAt(curLook);

    // light: day to dusk; the sun follows the view so shadows stay crisp where we look
    var dk = lerp(skyU.uDusk.value, duskT, reduce ? 1 : 1 - Math.exp(-dt * 2.5)); skyU.uDusk.value = dk;
    sunDir.copy(sunDay).lerp(sunDusk, smooth(.2, 1, dk)).normalize();
    sun.position.copy(curLook).addScaledVector(sunDir, 120); sun.target.position.copy(curLook); sun.target.updateMatrixWorld();
    sun.intensity = lerp(2.4, .55, smooth(0, 1, dk)); sun.color.copy(sunCol).lerp(sunColDusk, smooth(.1, .9, dk));
    hemi.intensity = lerp(.55, .22, dk); hemi.color.copy(hemiSky).lerp(hemiDusk, dk);
    renderer.toneMappingExposure = lerp(1.05, .82, dk);
    scene.fog.color.copy(fogDay).lerp(fogWinter, frost * .7).lerp(fogDusk, dk);
    starMat.opacity = smooth(.6, 1, dk); ffMat.opacity = smooth(.55, 1, dk) * (.7 + .3 * Math.sin(t * 3));
    winMat.emissiveIntensity = smooth(.25, .8, dk) * 2.2; glow.intensity = smooth(.3, .9, dk) * 1.8; lamp.intensity = lerp(.6, 1.6, dk);

    // birds and bunting
    for (var b = 0; b < birds.length; b++) {
      var bdd = birds[b], u = bdd.userData; u.a += u.sp * dt;
      bdd.position.set(Math.cos(u.a) * u.r - 10, u.y + Math.sin(t * .8 + u.ph) * 1.5, Math.sin(u.a) * u.r - 40); bdd.rotation.y = -u.a;
      var flp = Math.sin(t * 9 + u.ph) * .5, bpos = bdd.geometry.attributes.position; bpos.setY(1, flp); bpos.setY(4, flp); bpos.needsUpdate = true; bdd.visible = dk < .8;
    }
    for (var f = 0; f < bunting.length; f++) bunting[f].rotation.x = Math.sin(t * 2.4 + bunting[f].userData.ph) * .3 + U.uWind.value.x * 3;

    // falling leaves tumble; snow drifts around the view
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
      s3.set(1, 1, 1);
      falling.instanceMatrix.needsUpdate = true; falling.instanceColor.needsUpdate = true;
    }
    if (SN) {
      snowMat.opacity = frost * .95;
      if (frost > .01) {
        snow.position.set(curLook.x, curLook.y - 12, curLook.z);
        for (var q = 0; q < SN; q++) { snowPos[q * 3 + 1] -= snowVel[q] * dt * 2.2; snowPos[q * 3] += (U.uWind.value.x * 20 + Math.sin(t + q) * .3) * dt; if (snowPos[q * 3 + 1] < 0) snowPos[q * 3 + 1] += 40; }
        snowGeo.attributes.position.needsUpdate = true;
      }
    }
    if (dk > .4) {
      for (var qq = 0; qq < ffN; qq++) { var fb = ffBase[qq]; ffPos[qq * 3] = fb[0] + Math.sin(t * .5 + fb[3]) * 1.6; ffPos[qq * 3 + 1] = fb[1] + Math.sin(t * .9 + fb[3] * 2) * .9; ffPos[qq * 3 + 2] = fb[2] + Math.cos(t * .4 + fb[3]) * 1.6; }
      ffGeo.attributes.position.needsUpdate = true;
    }

    // marquee carousel
    carouselV *= .94; carouselA += carouselV + (dragging || reduce ? 0 : .0014 * weights.carousel + .0003);
    carousel.rotation.y = carouselA;
    var hovered = null;
    if (weights.carousel > .4 && !dragging && finePtr) { ray.setFromCamera(pointer, camera); var hh = ray.intersectObjects(carousel.children, true)[0]; if (hh && hh.object.userData.card) hovered = hh.object.userData.card; }
    if (hovered !== hoverCard) {
      if (hovered) hovered.userData.sv += .06;
      hoverCard = hovered;
      if (tip) { if (hovered) { tip.textContent = hovered.userData.entry.title + " · view entry"; tip.classList.add("on"); } else tip.classList.remove("on"); }
      document.body.classList.toggle("world-point", !!hovered);
    }
    for (var cI = 0; cI < cards.length; cI++) {
      var cd = cards[cI].userData;
      cd.sv += -cd.swing * .05 - cd.sv * .06; cd.swing += cd.sv; cd.lift = lerp(cd.lift, cards[cI] === hoverCard ? 1 : 0, .12);
      cards[cI].rotation.z = cd.swing + (reduce ? 0 : Math.sin(t * 1.1 + cd.i) * .02); cards[cI].position.z = cd.lift * .9; cards[cI].scale.setScalar(1 + cd.lift * .08);
    }

    // rosette
    rosSpinV *= .97; rosSpin += rosSpinV; rosInner.rotation.z = rosSpin;
    rosette.rotation.y = (reduce ? 0 : Math.sin(t * .5) * .25) + pointer.x * .35 * weights.rosette;
    rosette.rotation.x = -pointer.y * .2 * weights.rosette;
    rosette.position.y = ROS.y + 7.5 + (reduce ? 0 : Math.sin(t * .9) * .25);

    renderer.render(scene, camera);
  }
  window.addEventListener("scroll", function () { if (!anchors.length) measure(); if (tip) tip.classList.remove("on"); }, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(function () { measure(); }).observe(document.body);
  requestAnimationFrame(frame);
  doc.classList.add("world-ready");
})();
