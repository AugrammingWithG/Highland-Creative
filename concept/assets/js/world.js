/* Highland Creative concept: the living 3D world behind every page.
   One persistent WebGL scene: their seasonal tree on the hill, the class ribbon field,
   the sky, the pavilion of real entries, the judges' rosette and the hill at dusk.
   Scroll flies the camera between stations; drag, hover and pointer gusts make it touchable. */
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
  var mobile = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
  var renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: !mobile, powerPreference: "high-performance" });
    if (!renderer.getContext()) throw new Error("no gl");
  } catch (e) { noGL(); return; }
  doc.classList.add("webgl");

  var BASE = canvas.getAttribute("data-base") || "../assets/hc/";
  var PAGE = document.body.getAttribute("data-world") || "home";
  var HC = window.HC || {};
  var DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.4 : 1.75);
  renderer.setPixelRatio(DPR);

  /* ---------- helpers ---------- */
  var seed = 1985;
  function rand() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function pick(a) { return a[Math.floor(rand() * a.length)]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function col(h) { return new T.Color(h); }

  /* ---------- scene ---------- */
  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(42, 1, 0.1, 1200);
  var clock = new T.Clock();

  /* ---------- terrain ---------- */
  var PAV = new T.Vector3(-78, 0, -34), RIB = new T.Vector3(72, 0, -18), ROS = new T.Vector3(34, 0, 52);
  function baseH(x, z) {
    var knoll = 9.5 * Math.exp(-(x * x + z * z) / 560);
    var roll = 2.4 * Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.05) + 1.4 * Math.sin(x * 0.09 + z * 0.06 + 2.0) + 0.6 * Math.sin(x * 0.21 - z * 0.17);
    var far = Math.max(0, -z - 80) * 0.2 * (1 + 0.6 * Math.sin(x * 0.03 + 0.7));
    return knoll + roll + far - 2;
  }
  var plateaus = [[PAV, 16], [RIB, 18]].map(function (p) { return { c: p[0], r: p[1], h: baseH(p[0].x, p[0].z) }; });
  function hgt(x, z) {
    var h = baseH(x, z);
    for (var i = 0; i < plateaus.length; i++) {
      var p = plateaus[i], dx = x - p.c.x, dz = z - p.c.z;
      var w = Math.exp(-(dx * dx + dz * dz) / (p.r * p.r));
      h = h * (1 - w) + p.h * w;
    }
    return h;
  }
  PAV.y = hgt(PAV.x, PAV.z); RIB.y = hgt(RIB.x, RIB.z); ROS.y = hgt(ROS.x, ROS.z);

  var tSeg = mobile ? 110 : 190;
  var terrainGeo = new T.PlaneGeometry(640, 640, tSeg, tSeg);
  terrainGeo.rotateX(-Math.PI / 2);
  var tp = terrainGeo.attributes.position, tc = new Float32Array(tp.count * 3);
  var cDark = col("#24561a"), cMid = col("#4f8f22"), cLight = col("#86b93a"), cTmp = new T.Color();
  for (var i = 0; i < tp.count; i++) {
    var x = tp.getX(i), z = tp.getZ(i), h = hgt(x, z);
    tp.setY(i, h);
    var k = clamp((h + 3) / 15, 0, 1);
    var band = 0.78 + 0.22 * Math.sin(h * 0.9 + x * 0.006);
    cTmp.copy(cDark).lerp(cMid, smooth(0, .55, k)).lerp(cLight, smooth(.45, 1, k) * (0.55 + 0.45 * band));
    tc[i * 3] = cTmp.r; tc[i * 3 + 1] = cTmp.g; tc[i * 3 + 2] = cTmp.b;
  }
  terrainGeo.setAttribute("color", new T.BufferAttribute(tc, 3));
  terrainGeo.computeVertexNormals();
  var terrainMat = new T.MeshLambertMaterial({ vertexColors: true });
  var terrain = new T.Mesh(terrainGeo, terrainMat);
  scene.add(terrain);

  /* ---------- sky ---------- */
  var skyU = {
    uTop: { value: col("#4aa7dc") }, uHor: { value: col("#e9f6fc") },
    uDuskTop: { value: col("#2a0c25") }, uDuskHor: { value: col("#e2876a") }, uDusk: { value: 0 }, uWinter: { value: 0 }
  };
  var sky = new T.Mesh(new T.SphereGeometry(900, 32, 16), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, uniforms: skyU,
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }",
    fragmentShader: "uniform vec3 uTop,uHor,uDuskTop,uDuskHor; uniform float uDusk,uWinter; varying vec3 vP;" +
      "void main(){ float y = clamp(vP.y*1.6+.08,0.,1.); vec3 top = mix(uTop, vec3(.62,.74,.82), uWinter*.6); vec3 day = mix(uHor, top, pow(y,.7));" +
      "vec3 dusk = mix(uDuskHor, uDuskTop, pow(y,.55)); gl_FragColor = vec4(mix(day,dusk,uDusk),1.); }"
  }));
  scene.add(sky);
  scene.fog = new T.Fog(0xe9f6fc, 90, 520);

  var hemi = new T.HemisphereLight(0xeaf6ff, 0x34501a, .72);
  var sun = new T.DirectionalLight(0xfff3d6, 0.62);
  sun.position.set(60, 90, 40);
  scene.add(hemi, sun);

  /* ---------- the tree (their illustration, in 3D) ---------- */
  var TREE = new T.Vector3(0, hgt(0, 0) - 0.3, 0);
  var tree = new T.Group(); tree.position.copy(TREE); scene.add(tree);
  var bark = new T.MeshBasicMaterial({ color: 0x151013 });
  var tips = [];
  var up = new T.Vector3(0, 1, 0);
  function limb(a, b, ra, rb) {
    var len = a.distanceTo(b);
    var m = new T.Mesh(new T.CylinderGeometry(rb, ra, len, 7, 1), bark);
    m.position.copy(a).lerp(b, 0.5);
    m.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
    tree.add(m);
    var j = new T.Mesh(new T.SphereGeometry(rb, 7, 5), bark); j.position.copy(b); tree.add(j);
  }
  function grow(p, d, len, r, depth) {
    p = p.clone(); d = d.clone().normalize();
    for (var s = 0; s < 3; s++) {
      d.add(new T.Vector3((rand() - .5) * .38, (rand() - .25) * .22, (rand() - .5) * .38)).normalize();
      var q = p.clone().addScaledVector(d, len / 3), r1 = r * 0.8;
      limb(p, q, r, r1); p = q; r = r1;
    }
    if (depth === 0) { tips.push(p.clone()); return; }
    if (depth === 1) tips.push(p.clone());
    var n = depth >= 2 ? 3 : 2 + (rand() < .55 ? 1 : 0);
    for (var k = 0; k < n; k++) {
      var ang = (k / n) * Math.PI * 2 + rand() * 1.4, spread = .55 + rand() * .4;
      var nd = d.clone().add(new T.Vector3(Math.cos(ang) * spread, .18 + rand() * .3, Math.sin(ang) * spread));
      grow(p, nd, len * (.6 + rand() * .14), r, depth - 1);
    }
  }
  grow(new T.Vector3(0, -0.5, 0), new T.Vector3(.16, 1, .04), 7.6, .46, 3);

  var PAL = {
    spring: ["#a5c93a", "#c9dc2e", "#6fa526", "#f0d53a", "#88b832", "#e2c933"],
    summer: ["#3e8e1e", "#68ad2b", "#2b6e14", "#a7c935", "#539c22", "#d8cd2f"],
    autumn: ["#f29a14", "#e5590d", "#f6c431", "#d64a19", "#f0b324", "#c9661c"],
    winter: ["#c87a2c", "#a85a24", "#d9a04a", "#b86a2a"]
  };
  var leafN = mobile ? 26 : 34;
  var fCount = tips.length * leafN;
  var fPos = new Float32Array(fCount * 3), fSize = new Float32Array(fCount), fSeed = new Float32Array(fCount), fKeep = new Float32Array(fCount);
  var fC = [new Float32Array(fCount * 3), new Float32Array(fCount * 3), new Float32Array(fCount * 3), new Float32Array(fCount * 3)];
  var seasonsKeys = ["spring", "summer", "autumn", "winter"];
  var fi = 0;
  tips.forEach(function (tpt) {
    for (var n = 0; n < leafN; n++, fi++) {
      var u = rand() * Math.PI * 2, v = Math.acos(2 * rand() - 1), rr = Math.pow(rand(), .6) * 2.3;
      fPos[fi * 3] = tpt.x + Math.sin(v) * Math.cos(u) * rr;
      fPos[fi * 3 + 1] = tpt.y + Math.cos(v) * rr * .8 + .4;
      fPos[fi * 3 + 2] = tpt.z + Math.sin(v) * Math.sin(u) * rr;
      fSize[fi] = .85 + rand() * 1.45;
      fSeed[fi] = rand(); fKeep[fi] = rand();
      for (var s = 0; s < 4; s++) { var c = col(pick(PAL[seasonsKeys[s]])); fC[s][fi * 3] = c.r; fC[s][fi * 3 + 1] = c.g; fC[s][fi * 3 + 2] = c.b; }
    }
  });
  var fGeo = new T.BufferGeometry();
  fGeo.setAttribute("position", new T.BufferAttribute(fPos, 3));
  fGeo.setAttribute("aSize", new T.BufferAttribute(fSize, 1));
  fGeo.setAttribute("aSeed", new T.BufferAttribute(fSeed, 1));
  fGeo.setAttribute("aKeep", new T.BufferAttribute(fKeep, 1));
  for (var s2 = 0; s2 < 4; s2++) fGeo.setAttribute("aC" + s2, new T.BufferAttribute(fC[s2], 3));
  var U = { uTime: { value: 0 }, uSeason: { value: 0 }, uWind: { value: new T.Vector2() }, uScale: { value: 500 }, uDrop: { value: 0 }, uPush: { value: new T.Vector3(0, -99, 0) } };
  var foliageMat = new T.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false,
    vertexShader: [
      "uniform float uTime,uSeason,uScale,uDrop; uniform vec2 uWind; uniform vec3 uPush;",
      "attribute float aSize,aSeed,aKeep; attribute vec3 aC0,aC1,aC2,aC3;",
      "varying vec3 vCol; varying float vSeed;",
      "void main(){",
      " vec3 p = position; float hf = clamp(p.y/11.,0.,1.);",
      " p.x += (sin(uTime*1.3+aSeed*6.28+p.y*.4)*.13 + uWind.x*1.6)*hf;",
      " p.z += (cos(uTime*1.1+aSeed*4.)*.11 + uWind.y*1.6)*hf;",
      " p.y += sin(uTime*1.7+aSeed*9.)*.05;",
      " vec3 d = p - uPush; float pd = length(d); p += normalize(d+vec3(.001)) * smoothstep(3.5,0.,pd) * 1.4;",
      " float s = mod(uSeason,4.);",
      " vec3 c = s<1. ? mix(aC0,aC1,s) : s<2. ? mix(aC1,aC2,s-1.) : s<3. ? mix(aC2,aC3,s-2.) : mix(aC3,aC0,s-3.);",
      " vCol = c; vSeed = aSeed;",
      " float keep = smoothstep(uDrop-.04, uDrop+.04, aKeep);",
      " vec4 mv = modelViewMatrix*vec4(p,1.);",
      " gl_PointSize = aSize*keep*uScale/-mv.z;",
      " gl_Position = projectionMatrix*mv;",
      "}"].join("\n"),
    fragmentShader: [
      "varying vec3 vCol; varying float vSeed;",
      "void main(){ vec2 q = gl_PointCoord*2.-1.; float r = length(q); if(r>1.) discard;",
      " float a = vSeed*6.2831; vec2 rq = mat2(cos(a),-sin(a),sin(a),cos(a))*q;",
      " float leaf = smoothstep(.6,.5,length(rq*vec2(1.,2.3)));",
      " vec3 c = mix(vCol, vCol*.6, leaf*.7) + (1.-r)*.06;",
      " gl_FragColor = vec4(c, .74*smoothstep(1.,.9,r)); }"].join("\n")
  });
  var foliage = new T.Points(fGeo, foliageMat); tree.add(foliage);

  // berries & blossoms (purple and red, as in their artwork)
  var bN = mobile ? 90 : 170, bPos = new Float32Array(bN * 3), bCol = new Float32Array(bN * 3), bSeed = new Float32Array(bN);
  for (var bi = 0; bi < bN; bi++) {
    var src = Math.floor(rand() * fCount);
    bPos[bi * 3] = fPos[src * 3] + (rand() - .5) * .8; bPos[bi * 3 + 1] = fPos[src * 3 + 1] + (rand() - .5) * .8; bPos[bi * 3 + 2] = fPos[src * 3 + 2] + (rand() - .5) * .8;
    var bc = col(pick(["#8b2f8f", "#9d3c9a", "#d9353b", "#7a215c"])); bCol[bi * 3] = bc.r; bCol[bi * 3 + 1] = bc.g; bCol[bi * 3 + 2] = bc.b; bSeed[bi] = rand();
  }
  var bGeo = new T.BufferGeometry();
  bGeo.setAttribute("position", new T.BufferAttribute(bPos, 3)); bGeo.setAttribute("color", new T.BufferAttribute(bCol, 3)); bGeo.setAttribute("aSeed", new T.BufferAttribute(bSeed, 1));
  var bU = { uTime: U.uTime, uScale: U.uScale, uWind: U.uWind, uShow: { value: 1 } };
  var berries = new T.Points(bGeo, new T.ShaderMaterial({
    uniforms: bU, transparent: true, depthWrite: false, vertexColors: true,
    vertexShader: "uniform float uTime,uScale,uShow; uniform vec2 uWind; attribute float aSeed; varying vec3 vC; void main(){ vec3 p=position; float hf=clamp(p.y/11.,0.,1.); p.x+=(sin(uTime*1.3+aSeed*6.28+p.y*.4)*.13+uWind.x*1.6)*hf; p.z+=uWind.y*1.6*hf; vC=color; vec4 mv=modelViewMatrix*vec4(p,1.); gl_PointSize=(.28+aSeed*.22)*uShow*uScale/-mv.z; gl_Position=projectionMatrix*mv; }",
    fragmentShader: "varying vec3 vC; void main(){ vec2 q=gl_PointCoord*2.-1.; float r=length(q); if(r>1.) discard; vec3 c=vC+(1.-length(q-vec2(-.35,.35)))*.25; gl_FragColor=vec4(c,smoothstep(1.,.85,r)); }"
  }));
  tree.add(berries);

  /* ---------- falling leaves, petals and snow ---------- */
  var pN = reduce ? 0 : (mobile ? 130 : 320);
  var pPos = new Float32Array(Math.max(pN, 1) * 3), pCol = new Float32Array(Math.max(pN, 1) * 3), pSz = new Float32Array(Math.max(pN, 1)), pKind = new Float32Array(Math.max(pN, 1)), pSeedA = new Float32Array(Math.max(pN, 1));
  var pVel = [], pAlive = [];
  for (var pi = 0; pi < pN; pi++) { pVel.push(new T.Vector3()); pAlive.push(false); pSz[pi] = 0; pSeedA[pi] = rand(); }
  var pGeo = new T.BufferGeometry();
  pGeo.setAttribute("position", new T.BufferAttribute(pPos, 3)); pGeo.setAttribute("color", new T.BufferAttribute(pCol, 3));
  pGeo.setAttribute("aSize", new T.BufferAttribute(pSz, 1)); pGeo.setAttribute("aKind", new T.BufferAttribute(pKind, 1)); pGeo.setAttribute("aSeed", new T.BufferAttribute(pSeedA, 1));
  var particles = new T.Points(pGeo, new T.ShaderMaterial({
    uniforms: { uTime: U.uTime, uScale: U.uScale }, transparent: true, depthWrite: false, vertexColors: true,
    vertexShader: "uniform float uTime,uScale; attribute float aSize,aKind,aSeed; varying vec3 vC; varying float vK,vR; void main(){ vC=color; vK=aKind; vR=uTime*(1.5+aSeed*2.)+aSeed*6.28; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=aSize*uScale/-mv.z; gl_Position=projectionMatrix*mv; }",
    fragmentShader: "varying vec3 vC; varying float vK,vR; void main(){ vec2 q=gl_PointCoord*2.-1.; if(vK>.5){ float r=length(q); if(r>1.) discard; gl_FragColor=vec4(vC,.9*smoothstep(1.,.3,r)); return; } vec2 rq=mat2(cos(vR),-sin(vR),sin(vR),cos(vR))*q; rq.x*=abs(cos(vR*.7))*.7+.3; float e=length(rq*vec2(1.,2.)); if(e>1.) discard; gl_FragColor=vec4(vC*(.8+.2*(1.-e)),.95); }"
  }));
  particles.frustumCulled = false;
  scene.add(particles);
  var spawnAcc = 0;
  function spawnParticle(season) {
    for (var i = 0; i < pN; i++) {
      if (pAlive[i]) continue;
      var winter = season >= 2.85 && season < 3.6;
      var kind = winter ? 1 : 0, c;
      if (winter) {
        pPos[i * 3] = TREE.x + (rand() - .5) * 70; pPos[i * 3 + 1] = TREE.y + 14 + rand() * 16; pPos[i * 3 + 2] = TREE.z + (rand() - .3) * 60;
        pVel[i].set((rand() - .5) * .3, -(.9 + rand() * .8), 0); c = col("#ffffff"); pSz[i] = .25 + rand() * .3;
      } else {
        var src = Math.floor(rand() * fCount);
        pPos[i * 3] = TREE.x + fPos[src * 3]; pPos[i * 3 + 1] = TREE.y + fPos[src * 3 + 1]; pPos[i * 3 + 2] = TREE.z + fPos[src * 3 + 2];
        pVel[i].set((rand() - .3) * .8, -(1.1 + rand() * .9), (rand() - .5) * .5);
        var sk = season < 1 ? "spring" : season < 2 ? "summer" : "autumn";
        c = season < .9 ? col(pick(["#c86fb4", "#e7a0cf", "#8b2f8f", "#f2d53a"])) : col(pick(PAL[sk]));
        pSz[i] = season < .9 ? .32 + rand() * .2 : .5 + rand() * .45;
      }
      pCol[i * 3] = c.r; pCol[i * 3 + 1] = c.g; pCol[i * 3 + 2] = c.b; pKind[i] = kind; pAlive[i] = true;
      return;
    }
  }

  /* ---------- clouds ---------- */
  function cloudTexture() {
    var c = document.createElement("canvas"); c.width = 256; c.height = 128; var g = c.getContext("2d");
    for (var i = 0; i < 9; i++) {
      var x = 40 + rand() * 176, y = 58 + (rand() - .5) * 34, r = 26 + rand() * 30;
      var gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(255,255,255,.95)"); gr.addColorStop(.6, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    return new T.CanvasTexture(c);
  }
  var clouds = [], cloudTexs = [cloudTexture(), cloudTexture(), cloudTexture()];
  for (var ci = 0; ci < (mobile ? 12 : 22); ci++) {
    var sp = new T.Sprite(new T.SpriteMaterial({ map: cloudTexs[ci % 3], transparent: true, depthWrite: false, opacity: .92, fog: false }));
    var sc = 26 + rand() * 40; sp.scale.set(sc, sc / 2, 1);
    sp.position.set((rand() - .5) * 420, 42 + rand() * 46, -160 + rand() * 260);
    sp.userData.v = .6 + rand() * 1.4; clouds.push(sp); scene.add(sp);
  }

  for (var cj = 0; cj < (mobile ? 5 : 9); cj++) {
    var sp2 = new T.Sprite(new T.SpriteMaterial({ map: cloudTexs[cj % 3], transparent: true, depthWrite: false, opacity: .95, fog: false }));
    var sc2 = 18 + rand() * 22; sp2.scale.set(sc2, sc2 / 2, 1); sp2.position.set(-60 + rand() * 90, 70 + rand() * 40, -70 + rand() * 60);
    sp2.userData.v = .4 + rand() * .8; clouds.push(sp2); scene.add(sp2);
  }
  /* ---------- birds ---------- */
  var birds = [];
  var birdMat = new T.MeshBasicMaterial({ color: 0x241b22, side: T.DoubleSide, fog: false });
  for (var bd = 0; bd < (mobile ? 6 : 11); bd++) {
    var g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(new Float32Array([0, 0, .25, -1.2, 0, 0, 0, 0, -.25, 0, 0, .25, 1.2, 0, 0, 0, 0, -.25]), 3));
    var bm = new T.Mesh(g, birdMat); bm.userData = { r: 20 + rand() * 26, a: rand() * 6.28, sp: .12 + rand() * .1, y: 46 + rand() * 14, ph: rand() * 6 };
    birds.push(bm); scene.add(bm);
  }

  /* ---------- canvas text textures (Bevan / Sofia once fonts are ready) ---------- */
  var textJobs = [];
  function textTexture(w, h, draw) {
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var tex = new T.CanvasTexture(c); tex.anisotropy = 4;
    var job = function () { var g = c.getContext("2d"); g.clearRect(0, 0, w, h); draw(g, w, h); tex.needsUpdate = true; };
    job(); textJobs.push(job); return tex;
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { textJobs.forEach(function (j) { j(); }); });

  /* ---------- the class ribbon field ---------- */
  var ribbonU = { uTime: U.uTime, uWind: U.uWind };
  var ribbonVS = [
    "uniform float uTime; uniform vec2 uWind; uniform float uSeed; varying vec2 vUv; varying float vShade;",
    "void main(){ vUv = uv; vec3 p = position; float f = 1.-uv.y;",
    " float w = sin(uTime*2.3 + f*5.5 + uSeed)*.42*f + (uWind.x*3.)*f*f;",
    " p.z += w; p.x += sin(uTime*1.7 + f*4. + uSeed*2.)*.12*f + uWind.x*2.*f;",
    " vShade = .78 + .22*cos(uTime*2.3 + f*5.5 + uSeed);",
    " gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.); }"].join("\n");
  var ribbonFS = "uniform sampler2D uMap; varying vec2 vUv; varying float vShade; void main(){ if(vUv.y < .13*(1.-abs(vUv.x-.5)*2.)) discard; vec4 t = texture2D(uMap,vUv); float sheen = smoothstep(.0,.5,vUv.x)*smoothstep(1.,.5,vUv.x); gl_FragColor = vec4(t.rgb*vShade + sheen*.06, 1.); }";
  var CLASSES = [["1", "Website design"], ["2", "Wild Apricot"], ["3", "Print & advertising"], ["4", "Branding"], ["5", "SEO & marketing"], ["6", "Copywriting"], ["7", "Care Plan"]];
  var RCOL = ["#7a215c", "#48541a", "#2f6f93"];
  var ribbonField = new T.Group(); ribbonField.position.copy(RIB); scene.add(ribbonField);
  var postMat = new T.MeshLambertMaterial({ color: 0x3a4314 });
  CLASSES.forEach(function (cl, i) {
    var x = (i - 3) * 2.6, z = -Math.abs(i - 3) * 0.9;
    var post = new T.Mesh(new T.CylinderGeometry(.11, .14, 8.4, 8), postMat); post.position.set(x, 4.2, z); ribbonField.add(post);
    var knob = new T.Mesh(new T.SphereGeometry(.26, 12, 8), new T.MeshLambertMaterial({ color: 0xe3c27c })); knob.position.set(x, 8.5, z); ribbonField.add(knob);
    var tex = textTexture(160, 640, function (g, w, h) {
      g.fillStyle = RCOL[i % 3]; g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(w * .12, 0, 6, h); g.fillRect(w * .82, 0, 6, h);
      g.fillStyle = "#e3c27c"; g.font = "400 96px Bevan, Georgia, serif"; g.textAlign = "center"; g.fillText(cl[0], w / 2, 118);
      g.save(); g.translate(w / 2 + 14, 170); g.rotate(Math.PI / 2); g.fillStyle = "#fbfcf7"; g.font = "800 46px 'Sofia Sans Extra Condensed', 'Arial Narrow', sans-serif";
      g.fillText(cl[1].toUpperCase(), 0, 0); g.restore();
    });
    var m = new T.Mesh(new T.PlaneGeometry(1.15, 4.6, 1, 32), new T.ShaderMaterial({
      uniforms: { uTime: ribbonU.uTime, uWind: ribbonU.uWind, uSeed: { value: i * 1.7 }, uMap: { value: tex } },
      vertexShader: ribbonVS, fragmentShader: ribbonFS, side: T.DoubleSide
    }));
    m.position.set(x + .62, 8.1 - 2.3, z + .05);
    ribbonField.add(m);
  });
  // rope of bunting across the posts
  var bunting = [];
  function addBunting(group, from, to, sag, n, colors) {
    var pts = [];
    for (var k = 0; k <= 24; k++) { var t = k / 24; var p = from.clone().lerp(to, t); p.y -= Math.sin(Math.PI * t) * sag; pts.push(p); }
    group.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x2b2227 })));
    var flagGeo = new T.BufferGeometry(); flagGeo.setAttribute("position", new T.BufferAttribute(new Float32Array([-.32, 0, 0, .32, 0, 0, 0, -.7, 0]), 3)); flagGeo.computeVertexNormals();
    for (var f = 1; f < n; f++) {
      var t2 = f / n, p2 = from.clone().lerp(to, t2); p2.y -= Math.sin(Math.PI * t2) * sag;
      var fl = new T.Mesh(flagGeo, new T.MeshBasicMaterial({ color: colors[f % colors.length], side: T.DoubleSide }));
      fl.position.copy(p2); fl.lookAt(p2.x, p2.y, p2.z + 10); fl.userData.ph = f * .7; group.add(fl); bunting.push(fl);
    }
  }
  addBunting(ribbonField, new T.Vector3(-7.8, 8.3, -2.7), new T.Vector3(7.8, 8.3, -2.7), 1.1, 22, [0x7a215c, 0xe3c27c, 0x48541a, 0x2f6f93]);

  /* ---------- the pavilion of entries ---------- */
  var pavilion = new T.Group(); pavilion.position.copy(PAV); scene.add(pavilion);
  var timber = new T.MeshLambertMaterial({ color: 0xb98f56 }), plumMat = new T.MeshLambertMaterial({ color: 0x561642, side: T.DoubleSide }), olive = new T.MeshLambertMaterial({ color: 0x48541a });
  var floor = new T.Mesh(new T.CylinderGeometry(12.5, 12.8, .5, 40), timber); floor.position.y = .1; pavilion.add(floor);
  for (var pp = 0; pp < 8; pp++) {
    var pa = pp / 8 * Math.PI * 2 + Math.PI / 8;
    var post2 = new T.Mesh(new T.CylinderGeometry(.22, .26, 7.2, 8), olive); post2.position.set(Math.cos(pa) * 11.6, 3.9, Math.sin(pa) * 11.6); pavilion.add(post2);
  }
  var roof = new T.Mesh(new T.ConeGeometry(14.2, 4.6, 8, 1, true), plumMat); roof.position.y = 9.8; roof.rotation.y = Math.PI / 8; pavilion.add(roof);
  var roofTrim = new T.Mesh(new T.TorusGeometry(14, .16, 6, 8), new T.MeshLambertMaterial({ color: 0xe3c27c })); roofTrim.rotation.x = Math.PI / 2; roofTrim.rotation.z = Math.PI / 8; roofTrim.position.y = 7.5; pavilion.add(roofTrim);
  var finial = new T.Mesh(new T.SphereGeometry(.45, 12, 8), new T.MeshLambertMaterial({ color: 0xe3c27c })); finial.position.y = 12.3; pavilion.add(finial);
  var flag = new T.Mesh(new T.PlaneGeometry(1.8, 1, 8, 1), new T.ShaderMaterial({ uniforms: { uTime: U.uTime, uWind: U.uWind, uSeed: { value: 3 }, uMap: { value: textTexture(64, 32, function (g) { g.fillStyle = "#e3c27c"; g.fillRect(0, 0, 64, 32); }) } }, vertexShader: ribbonVS.replace("float f = 1.-uv.y;", "float f = uv.x;"), fragmentShader: "uniform sampler2D uMap; varying vec2 vUv; varying float vShade; void main(){ gl_FragColor = vec4(texture2D(uMap,vUv).rgb*vShade,1.); }", side: T.DoubleSide }));
  flag.position.set(.9, 13.1, 0); pavilion.add(flag);
  var flagPole = new T.Mesh(new T.CylinderGeometry(.05, .05, 2.2, 6), bark); flagPole.position.y = 13; pavilion.add(flagPole);

  var carousel = new T.Group(); carousel.position.y = 3.6; pavilion.add(carousel);
  var cards = [];
  var entries = (HC.entries || []).slice();
  var featured = ["parramatta-district-regional-law-society", "farm-writers-association-of-nsw", "knox-farms", "botanical-art-society-logo", "jnw-strategic-consulting", "red-olive-restaurant", "colour-society-of-australia", "maserati-club-of-australia", "mittagong-medical-centre", "bees-in-bowties"];
  var shown = PAGE === "work" ? entries.slice(0, mobile ? 14 : 28) : featured.map(function (s) { return entries.filter(function (e) { return e.slug === s; })[0]; }).filter(Boolean);
  var R = shown.length > 12 ? 9.4 : 8.2;
  var loader = new T.TextureLoader();
  var paperMat = new T.MeshLambertMaterial({ color: 0xfbfcf7 });
  var tagMat = new T.MeshBasicMaterial({ color: 0xe3c27c, side: T.DoubleSide });
  var stringMat = new T.LineBasicMaterial({ color: 0x5a4630 });
  var cls = HC.classes || {};
  shown.forEach(function (e, i) {
    var a = i / shown.length * Math.PI * 2;
    var holder = new T.Group(); holder.position.set(Math.sin(a) * R, 0, Math.cos(a) * R); holder.rotation.y = a; carousel.add(holder);
    var card = new T.Group(); holder.add(card);
    var frame = new T.Mesh(new T.BoxGeometry(3.2, 2.62, .08), paperMat); card.add(frame);
    var placeholder = textTexture(512, 384, function (g, w, h) {
      g.fillStyle = "#f2f2f2"; g.fillRect(0, 0, w, h); g.fillStyle = "#561642"; g.font = "400 34px Bevan, Georgia, serif"; g.textAlign = "center";
      var words = e.title.split(" "), line = "", y = h / 2 - 20, lines = [];
      words.forEach(function (wd) { if ((line + wd).length > 18) { lines.push(line); line = ""; } line += wd + " "; }); lines.push(line);
      lines.forEach(function (l, k) { g.fillText(l.trim(), w / 2, y + k * 40); });
    });
    var imgMat = new T.MeshBasicMaterial({ map: placeholder });
    var img = new T.Mesh(new T.PlaneGeometry(2.96, 2.22), imgMat); img.position.set(0, .12, .05); card.add(img);
    if (location.protocol !== "file:") {
      loader.load(BASE + e.img, function (t) { if (e.contain) { t.repeat.set(.82, .82); t.offset.set(.09, .09); } imgMat.map = t; imgMat.needsUpdate = true; });
    }
    var label = textTexture(512, 64, function (g, w, h) { g.fillStyle = "#fbfcf7"; g.fillRect(0, 0, w, h); g.fillStyle = "#1f1a1e"; g.font = "400 28px Bevan, Georgia, serif"; g.fillText(e.title.length > 30 ? e.title.slice(0, 29) + "…" : e.title, 14, 40); });
    var lab = new T.Mesh(new T.PlaneGeometry(2.96, .37), new T.MeshBasicMaterial({ map: label })); lab.position.set(0, -1.12, .05); card.add(lab);
    var tag = new T.Mesh(new T.PlaneGeometry(.62, .44), tagMat); tag.position.set(1.1, 1.38, .06); tag.rotation.z = .12; card.add(tag);
    var tagTxt = textTexture(128, 96, function (g, w, h) { g.fillStyle = "#e3c27c"; g.fillRect(0, 0, w, h); g.fillStyle = "#34102a"; g.font = "800 30px 'Sofia Sans Extra Condensed', sans-serif"; g.textAlign = "center"; g.fillText("CLASS " + ((cls[e.cls] || {}).no || ""), w / 2, 60); });
    tag.material = new T.MeshBasicMaterial({ map: tagTxt, side: T.DoubleSide });
    var str = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0, 1.31, 0), new T.Vector3(0, 3.6, 0)]), stringMat); card.add(str);
    card.userData = { entry: e, swing: 0, sv: 0, lift: 0, i: i };
    frame.userData.card = card; img.userData.card = card; lab.userData.card = card;
    cards.push(card);
  });
  addBunting(pavilion, new T.Vector3(-11.6, 7.2, 4.4), new T.Vector3(11.6, 7.2, 4.4), .9, 20, [0x7a215c, 0xe3c27c, 0x48541a, 0x2f6f93]);

  /* ---------- the judges' rosette ---------- */
  var rosette = new T.Group(); rosette.position.set(ROS.x, ROS.y + 7.5, ROS.z); scene.add(rosette);
  var rosInner = new T.Group(); rosette.add(rosInner);
  function pleatRing(r0, r1, n, color, z) {
    var geo = new T.PlaneGeometry(r1 - r0, (Math.PI * 2 * r1) / n * 1.15);
    var mat = new T.MeshLambertMaterial({ color: color, side: T.DoubleSide });
    for (var k = 0; k < n; k++) {
      var m = new T.Mesh(geo, mat), a = k / n * Math.PI * 2;
      m.position.set(Math.cos(a) * (r0 + r1) / 2, Math.sin(a) * (r0 + r1) / 2, z);
      m.rotation.z = a; m.rotateX(k % 2 ? .55 : -.55); rosInner.add(m);
    }
  }
  pleatRing(2.4, 3.6, 64, 0x7a215c, 0);
  pleatRing(1.55, 2.5, 48, 0xe3c27c, .12);
  var rosCenter = new T.Mesh(new T.CircleGeometry(1.6, 48), new T.MeshBasicMaterial({ map: textTexture(512, 512, function (g, w, h) {
    g.fillStyle = "#fbfcf7"; g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#7a215c"; g.lineWidth = 10; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 34, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#561642"; g.textAlign = "center"; g.font = "800 92px 'Sofia Sans Extra Condensed', sans-serif"; g.fillText("HIGHLY", w / 2, h / 2 - 6);
    g.font = "800 66px 'Sofia Sans Extra Condensed', sans-serif"; g.fillText("COMMENDED", w / 2, h / 2 + 72);
    g.font = "400 40px Bevan, Georgia, serif"; g.fillStyle = "#7a215c"; g.fillText("★", w / 2, h / 2 - 104);
  }) }));
  rosCenter.position.z = .25; rosInner.add(rosCenter);
  var tailTex = textTexture(64, 256, function (g, w, h) { g.fillStyle = "#7a215c"; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(8, 0, 4, h); });
  [-1, 1].forEach(function (sgn, k) {
    var tail = new T.Mesh(new T.PlaneGeometry(1.3, 6, 1, 24), new T.ShaderMaterial({ uniforms: { uTime: U.uTime, uWind: U.uWind, uSeed: { value: k * 2.1 }, uMap: { value: tailTex } }, vertexShader: ribbonVS, fragmentShader: ribbonFS, side: T.DoubleSide }));
    tail.position.set(sgn * .9, -4.2, -.1); tail.rotation.z = sgn * .2; rosette.add(tail);
  });
  var rosSpin = 0, rosSpinV = 0;

  /* ---------- night: stars and fireflies ---------- */
  var sN = mobile ? 350 : 800, sPos = new Float32Array(sN * 3);
  for (var st = 0; st < sN; st++) { var th = rand() * Math.PI * 2, ph = rand() * 1.2; sPos[st * 3] = Math.cos(th) * Math.cos(ph) * 800; sPos[st * 3 + 1] = Math.sin(ph) * 800 + 30; sPos[st * 3 + 2] = Math.sin(th) * Math.cos(ph) * 800; }
  var starGeo = new T.BufferGeometry(); starGeo.setAttribute("position", new T.BufferAttribute(sPos, 3));
  var starMat = new T.PointsMaterial({ color: 0xfff3dc, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  scene.add(new T.Points(starGeo, starMat));
  var ffN = mobile ? 24 : 50, ffPos = new Float32Array(ffN * 3), ffBase = [];
  for (var ff = 0; ff < ffN; ff++) { var fa = rand() * 6.28, fr = 3 + rand() * 12; ffBase.push([Math.cos(fa) * fr, 1 + rand() * 8, Math.sin(fa) * fr, rand() * 6.28]); }
  var ffGeo = new T.BufferGeometry(); ffGeo.setAttribute("position", new T.BufferAttribute(ffPos, 3));
  var ffMat = new T.PointsMaterial({ color: 0xffd56b, size: mobile ? 5 : 7, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false });
  var fireflies = new T.Points(ffGeo, ffMat); fireflies.position.copy(TREE); fireflies.frustumCulled = false; scene.add(fireflies);

  /* ---------- stations ---------- */
  function V(x, y, z) { return new T.Vector3(x, y, z); }
  var heroLookX = mobile ? 0 : -4;
  var ST = {
    tree: { pos: V(TREE.x + 8, TREE.y + 9, TREE.z + 41), look: V(TREE.x + heroLookX, TREE.y + 8.8, TREE.z), dusk: 0, orbit: true },
    ribbons: { pos: V(RIB.x + (mobile ? 0 : 10), RIB.y + 6.6, RIB.z + 21), look: V(RIB.x + (mobile ? 0 : 9.2), RIB.y + 5, RIB.z), dusk: 0 },
    sky: { pos: V(14, 46, 74), look: V(-24, 92, -50), dusk: 0 },
    pavilion: { pos: V(PAV.x, PAV.y + 4.9, PAV.z + 20), look: V(PAV.x - (mobile ? 0 : 2), PAV.y + 3.9, PAV.z), dusk: .05, carousel: true },
    rosette: { pos: V(ROS.x + (mobile ? 0 : 7.5), ROS.y + 7.2, ROS.z + 17), look: V(ROS.x + (mobile ? 0 : 7.5), ROS.y + 7, ROS.z), dusk: .1, rosette: true },
    meadow: { pos: V(-34, 34, 104), look: V(4, 6, -10), dusk: .15 },
    studio: { pos: V(TREE.x + 13, TREE.y + 9, TREE.z + 15), look: V(TREE.x, TREE.y + 7.5, TREE.z), dusk: .32 },
    dusk: { pos: V(TREE.x - 14, TREE.y + 6, TREE.z + 34), look: V(TREE.x + 2, TREE.y + 8, TREE.z), dusk: 1 }
  };
  if (mobile) { ST.tree.pos = V(TREE.x + 3, TREE.y + 6, TREE.z + 44); ST.tree.look = V(TREE.x, TREE.y + 10, TREE.z); }
  var PAGE_STATION = { home: "tree", services: "ribbons", "wild-apricot": "sky", work: "pavilion", about: "studio", contact: "dusk", pitch: "meadow" };

  /* anchors: each [data-station] section holds its station while it dominates the viewport */
  var anchors = [], hero = document.querySelector("[data-hero]");
  function measure() {
    var vh = innerHeight, y = scrollY, list = [].slice.call(document.querySelectorAll("[data-station]"));
    anchors = list.map(function (el) {
      var r = el.getBoundingClientRect(), top = r.top + y, h = r.height;
      var start = top - vh * .45, end = Math.max(start, top + h - vh * .75);
      return { st: el.getAttribute("data-station"), start: start, end: end };
    }).sort(function (a, b) { return a.start - b.start; });
    if (!anchors.length) anchors = [{ st: PAGE_STATION[PAGE] || "tree", start: 0, end: 1e9 }];
    anchors[0].start = Math.min(anchors[0].start, 0);
  }
  var tgtPos = new T.Vector3(), tgtLook = new T.Vector3(), curPos = new T.Vector3(), curLook = new T.Vector3(), tmpV = new T.Vector3();
  var weights = { carousel: 0, rosette: 0, orbit: 0 }, duskT = 0;
  function sample(y) {
    var a = anchors, i = 0;
    while (i < a.length - 1 && y > a[i].end && y >= a[i + 1].start) i++;
    var A = a[i], S = ST[A.st] || ST.tree;
    if (y <= A.end || i === a.length - 1) {
      var hold = A.end > A.start ? clamp((y - A.start) / (A.end - A.start), 0, 1) : 0;
      tgtPos.copy(S.pos); tgtLook.copy(S.look);
      tgtPos.x += (hold - .5) * 3; tgtPos.y += (hold - .5) * -1.6;
      duskT = S.dusk; weights.carousel = S.carousel ? 1 : 0; weights.rosette = S.rosette ? 1 : 0; weights.orbit = S.orbit ? 1 : 0;
      return A.st;
    }
    var B = a[i + 1], SB = ST[B.st] || ST.tree;
    var t = ease(clamp((y - A.end) / Math.max(1, B.start - A.end), 0, 1));
    tgtPos.copy(S.pos).lerp(SB.pos, t); tgtLook.copy(S.look).lerp(SB.look, t);
    var dist = S.pos.distanceTo(SB.pos); tgtPos.y += Math.sin(Math.PI * t) * Math.min(26, dist * .22);
    duskT = lerp(S.dusk, SB.dusk, t);
    weights.carousel = lerp(S.carousel ? 1 : 0, SB.carousel ? 1 : 0, t); weights.rosette = lerp(S.rosette ? 1 : 0, SB.rosette ? 1 : 0, t); weights.orbit = lerp(S.orbit ? 1 : 0, SB.orbit ? 1 : 0, t);
    return t < .5 ? A.st : B.st;
  }

  /* ---------- seasons (scroll through the hero turns the year) ---------- */
  var SEASON_NAMES = ["Spring", "Summer", "Autumn", "Winter"];
  function realSeason() { var m = new Date().getMonth(); return m >= 8 && m <= 10 ? 0 : (m === 11 || m <= 1) ? 1 : (m >= 2 && m <= 4) ? 2 : 3; }
  var season0 = realSeason(), season = season0, seasonShown = -1;
  var seasonBtns = [].slice.call(document.querySelectorAll("[data-season]")).filter(function (b) { return b.tagName === "BUTTON"; });
  var seasonFill = document.querySelector("[data-season-fill]");
  function heroProgress() {
    if (!hero) return 0;
    var r = hero.getBoundingClientRect(), span = r.height - innerHeight;
    return span > 0 ? clamp(-r.top / span, 0, 1) : 0;
  }
  seasonBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      var idx = SEASON_NAMES.map(function (n) { return n.toLowerCase(); }).indexOf(b.dataset.season);
      var rel = ((idx - season0) + 4) % 4;
      if (!hero) return;
      var top = hero.getBoundingClientRect().top + scrollY, span = hero.offsetHeight - innerHeight;
      window.scrollTo({ top: top + span * (rel / 3) * .999, behavior: reduce ? "auto" : "smooth" });
    });
  });
  function updateSeasonUI(s) {
    var idx = Math.round(s) % 4;
    if (seasonFill) seasonFill.style.transform = "scaleX(" + clamp((s - season0) / 3, 0, 1) + ")";
    if (idx === seasonShown) return; seasonShown = idx;
    var name = SEASON_NAMES[idx];
    doc.setAttribute("data-season", name.toLowerCase());
    [].forEach.call(document.querySelectorAll("[data-season-name]"), function (el) { el.textContent = name + " in the Highlands"; });
    seasonBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.season === name.toLowerCase())); });
  }

  /* ---------- pointer: gusts, orbit drag, carousel spin, hover ---------- */
  var pointer = new T.Vector2(), pNorm = new T.Vector2(), lastPX = null, lastPY = null, gust = new T.Vector2();
  var dragging = false, dragX = 0, dragY = 0, orbitYaw = 0, orbitPitch = 0, yawV = 0, carouselA = 0, carouselV = 0, dragMoved = 0;
  var ray = new T.Raycaster(), hoverCard = null, tip = document.getElementById("world-tip");
  function isEmpty(el) { return !el || !el.closest || !el.closest("a,button,input,select,textarea,label,form,.panel,.cover,.tag,.site-head,.concept-bar,dialog,[data-solid],.entry-card,.member,.win,.details-card,.gate,.pitch-head"); }
  window.addEventListener("pointermove", function (e) {
    pNorm.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    if (lastPX !== null && !reduce) { gust.x += clamp((e.clientX - lastPX) * .0009, -.05, .05); gust.y += clamp((e.clientY - lastPY) * .0005, -.03, .03); }
    lastPX = e.clientX; lastPY = e.clientY;
    if (dragging) {
      var dx = e.clientX - dragX, dy = e.clientY - dragY; dragX = e.clientX; dragY = e.clientY; dragMoved += Math.abs(dx) + Math.abs(dy);
      if (weights.carousel > .5) carouselV = dx * .0042; else { yawV = dx * .0042; orbitPitch = clamp(orbitPitch + dy * .002, -.2, .35); }
    }
    pointer.copy(pNorm);
    var el = document.elementFromPoint(e.clientX, e.clientY);
    canvas.style.cursor = "";
    document.body.classList.toggle("world-grab", isEmpty(el) && (weights.orbit > .5 || weights.carousel > .5 || weights.rosette > .5));
  }, { passive: true });
  window.addEventListener("pointerdown", function (e) {
    if (!isEmpty(e.target)) return;
    dragging = true; dragX = e.clientX; dragY = e.clientY; dragMoved = 0;
    document.body.classList.add("world-dragging");
  });
  window.addEventListener("pointercancel", function () { dragging = false; document.body.classList.remove("world-dragging"); });
  window.addEventListener("pointerup", function (e) {
    if (!dragging) return; dragging = false; document.body.classList.remove("world-dragging");
    if (dragMoved < 6) clickWorld(e);
  });
  function clickWorld(e) {
    ray.setFromCamera(pNorm.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
    if (weights.carousel > .3) {
      var hit = ray.intersectObjects(carousel.children, true)[0];
      if (hit) { var c = hit.object.userData.card || (hit.object.parent && hit.object.parent.userData.entry ? hit.object.parent : null); if (c) { openEntry(c.userData.entry); return; } }
    }
    if (weights.rosette > .3 && ray.intersectObject(rosette, true).length) { rosSpinV += .35; return; }
    // a tap on the empty world sends a gust through the tree
    gust.x += .08; U.uPush.value.copy(TREE).add(new T.Vector3(0, 7, 0));
  }
  function openEntry(e) {
    if (document.querySelector("[data-work]")) { document.dispatchEvent(new CustomEvent("hc:open-entry", { detail: e.slug })); return; }
    var href = "work.html#" + e.slug;
    if (window.HCgo) window.HCgo(href); else location.href = href;
  }

  /* ---------- resize ---------- */
  var W = 0, H = 0;
  function resize() {
    var w = innerWidth, h = innerHeight;
    if (Math.abs(w - W) < 1 && Math.abs(h - H) < 140 && W) return;
    W = w; H = h; renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < 700 ? 52 : 42; camera.updateProjectionMatrix();
    U.uScale.value = (h / (2 * Math.tan(camera.fov * Math.PI / 360))) * DPR;
    measure();
  }
  window.addEventListener("resize", resize);
  window.addEventListener("load", measure);
  resize();

  /* ---------- arrival: fly in from the page we came from ---------- */
  var from = null; try { from = sessionStorage.getItem("hc-station"); } catch (e) {}
  var startY = scrollY; sample(startY);
  if (from && ST[from] && !reduce) { curPos.copy(ST[from].pos); curLook.copy(ST[from].look); }
  else { curPos.copy(tgtPos).add(new T.Vector3(0, reduce ? 0 : 14, reduce ? 0 : 22)); curLook.copy(tgtLook); }
  var arrive = reduce ? 0 : 1;
  window.HCstation = function () { return sample(scrollY); };

  /* ---------- loop ---------- */
  var running = true, last = 0, prevStation = "";
  document.addEventListener("visibilitychange", function () { running = !document.hidden; if (running) requestAnimationFrame(frame); });
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    var dt = Math.min(.05, (now - last) / 1000 || .016); last = now;
    var t = reduce ? 0 : clock.getElapsedTime();
    U.uTime.value = t;

    // seasons
    var hp = heroProgress();
    season = hero ? season0 + hp * 3 : season0;
    if (hero && hp >= 1) {
      var hr = hero.getBoundingClientRect(), after = innerHeight - hr.bottom, rest = document.documentElement.scrollHeight - (hr.bottom + scrollY);
      season = season0 + 3 + smooth(0, .22, after / Math.max(1, rest));
    }
    U.uSeason.value = season;
    var s = ((season % 4) + 4) % 4;
    var drop = s < 2 ? 0 : s < 2.95 ? (s - 2) * .55 : s < 3.6 ? .55 + Math.min(1, (s - 2.95) / .35) * .35 : Math.max(0, .9 - (s - 3.6) * 2.25);
    U.uDrop.value = drop;
    bU.uShow.value = s < 1.6 ? 1 : s < 2.2 ? 1 - (s - 1.6) / .6 : s > 3.7 ? (s - 3.7) / .3 : 0;
    skyU.uWinter.value = s > 2.8 && s < 3.7 ? smooth(2.8, 3.1, s) * (1 - smooth(3.5, 3.7, s)) : 0;
    terrainMat.color.setRGB(1 + (s > 1.8 && s < 3 ? .08 : 0) - skyU.uWinter.value * .05, 1 - skyU.uWinter.value * .02, 1 - (s > 1.8 && s < 3 ? .2 : 0) + skyU.uWinter.value * .18);
    updateSeasonUI(season);

    // wind: breeze + pointer gusts
    gust.multiplyScalar(.94);
    U.uWind.value.set(Math.sin(t * .3) * .05 + gust.x, Math.cos(t * .23) * .03 + gust.y);
    if (!dragging) U.uPush.value.lerp(new T.Vector3(0, -99, 0), .04);

    // camera
    var st = sample(scrollY);
    if (st !== prevStation) { prevStation = st; try { sessionStorage.setItem("hc-station", st); } catch (e) {} }
    yawV *= .92; orbitYaw += yawV; if (weights.orbit < .5 && !dragging) orbitYaw *= .97;
    if (!dragging) orbitPitch *= .97;
    var yaw = orbitYaw * (reduce ? 0 : 1) + (reduce ? 0 : Math.sin(t * .11) * .06 * weights.orbit);
    tmpV.copy(tgtPos).sub(tgtLook); tmpV.applyAxisAngle(up, yaw); tmpV.y += orbitPitch * tmpV.length();
    tgtPos.copy(tgtLook).add(tmpV);
    tgtLook.x += pointer.x * 1.4; tgtLook.y += pointer.y * .8;
    var k = reduce ? 1 : 1 - Math.exp(-dt * (arrive > 0 ? 1.15 : 3.2));
    if (arrive > 0) arrive = Math.max(0, arrive - dt * .45);
    curPos.lerp(tgtPos, k); curLook.lerp(tgtLook, k);
    camera.position.copy(curPos); camera.lookAt(curLook);

    // sky and light by dusk
    var dk = lerp(skyU.uDusk.value, duskT, reduce ? 1 : 1 - Math.exp(-dt * 2.5)); skyU.uDusk.value = dk;
    scene.fog.color.copy(skyU.uHor.value).lerp(skyU.uDuskHor.value, dk);
    hemi.intensity = lerp(.72, .3, dk); sun.intensity = lerp(.62, .2, dk); sun.color.setHSL(.09, .8, lerp(.92, .7, dk));
    starMat.opacity = smooth(.55, 1, dk); ffMat.opacity = smooth(.5, 1, dk) * (.75 + .25 * Math.sin(t * 3));

    // clouds and birds
    for (var c = 0; c < clouds.length; c++) { var cl = clouds[c]; cl.position.x += cl.userData.v * dt * 2; if (cl.position.x > 230) cl.position.x = -230; cl.material.opacity = .92 * (1 - dk * .6); }
    for (var b = 0; b < birds.length; b++) {
      var bdd = birds[b], u = bdd.userData; u.a += u.sp * dt;
      bdd.position.set(Math.cos(u.a) * u.r - 10, u.y + Math.sin(t * .8 + u.ph) * 1.5, Math.sin(u.a) * u.r - 40);
      bdd.rotation.y = -u.a; var fl = Math.sin(t * 9 + u.ph) * .7; bdd.scale.set(1, 1, 1);
      var bp = bdd.geometry.attributes.position; bp.setY(1, fl); bp.setY(4, fl); bp.needsUpdate = true;
      bdd.visible = dk < .8;
    }
    for (var f = 0; f < bunting.length; f++) bunting[f].rotation.x = Math.sin(t * 2.4 + bunting[f].userData.ph) * .35 + U.uWind.value.x * 3;
    flag.rotation.y = Math.sin(t * .7) * .2;

    // falling particles
    if (pN) {
      var rate = s < .9 ? 5 : s < 1.8 ? 1.5 : s < 2.95 ? 26 : s < 3.6 ? 40 : 3;
      spawnAcc += rate * dt; while (spawnAcc > 1) { spawnAcc--; spawnParticle(s); }
      for (var p = 0; p < pN; p++) {
        if (!pAlive[p]) continue;
        var v = pVel[p];
        pPos[p * 3] += (v.x + U.uWind.value.x * 18 + Math.sin(t * 2 + p) * .35) * dt;
        pPos[p * 3 + 1] += v.y * dt;
        pPos[p * 3 + 2] += (v.z + Math.cos(t * 1.6 + p) * .3) * dt;
        if (pPos[p * 3 + 1] < hgt(pPos[p * 3], pPos[p * 3 + 2]) + .1) { pAlive[p] = false; pSz[p] = 0; }
      }
      pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true; pGeo.attributes.aSize.needsUpdate = true; pGeo.attributes.aKind.needsUpdate = true;
    }

    // fireflies
    if (dk > .4) {
      for (var q = 0; q < ffN; q++) { var fb = ffBase[q]; ffPos[q * 3] = fb[0] + Math.sin(t * .5 + fb[3]) * 1.6; ffPos[q * 3 + 1] = fb[1] + Math.sin(t * .9 + fb[3] * 2) * .9; ffPos[q * 3 + 2] = fb[2] + Math.cos(t * .4 + fb[3]) * 1.6; }
      ffGeo.attributes.position.needsUpdate = true;
    }

    // pavilion carousel: drag to spin, idle drift, hover lift
    carouselV *= .94; carouselA += carouselV + (dragging || reduce ? 0 : .0016 * weights.carousel + .0004);
    carousel.rotation.y = carouselA;
    var hovered = null;
    if (weights.carousel > .4 && !dragging) {
      ray.setFromCamera(pointer, camera);
      var h = ray.intersectObjects(carousel.children, true)[0];
      if (h) hovered = h.object.userData.card || null;
    }
    if (hovered !== hoverCard) {
      if (hovered) hovered.userData.sv += .06;
      hoverCard = hovered;
      if (tip) {
        if (hovered) { tip.textContent = hovered.userData.entry.title + " · view entry"; tip.classList.add("on"); } else tip.classList.remove("on");
      }
      document.body.classList.toggle("world-point", !!hovered);
    }
    for (var cI = 0; cI < cards.length; cI++) {
      var cd = cards[cI].userData;
      cd.sv += -cd.swing * .05 - cd.sv * .06; cd.swing += cd.sv;
      cd.lift = lerp(cd.lift, cards[cI] === hoverCard ? 1 : 0, .12);
      cards[cI].rotation.z = cd.swing + (reduce ? 0 : Math.sin(t * 1.1 + cd.i) * .025);
      cards[cI].position.z = cd.lift * .9; cards[cI].scale.setScalar(1 + cd.lift * .08);
    }

    // rosette: sway, tilt toward the pointer, spin when touched
    rosSpinV *= .97; rosSpin += rosSpinV;
    rosInner.rotation.z = rosSpin;
    rosette.rotation.y = (reduce ? 0 : Math.sin(t * .5) * .25) + pointer.x * .35 * weights.rosette;
    rosette.rotation.x = -pointer.y * .2 * weights.rosette;
    rosette.position.y = ROS.y + 7.5 + (reduce ? 0 : Math.sin(t * .9) * .25);

    renderer.render(scene, camera);
  }
  if (tip) window.addEventListener("pointermove", function (e) { tip.style.transform = "translate(" + (e.clientX + 16) + "px," + (e.clientY + 18) + "px)"; }, { passive: true });
  window.addEventListener("scroll", function () { if (!anchors.length) measure(); }, { passive: true });
  new ResizeObserver(function () { measure(); }).observe(document.body);
  requestAnimationFrame(frame);
  doc.classList.add("world-ready");
})();
