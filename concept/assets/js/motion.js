/* Highland Creative concept: DOM motion. Page-turn transitions, 3D heading reveals,
   flip-up panels, pointer tilt with glare, a physical swinging entry tag, magnetic buttons. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = matchMedia("(pointer: fine)").matches;
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  doc.classList.add("motion");

  /* ---------- page turn: a plum card-stock cover folds down, the camera flies on ---------- */
  var curtain = document.querySelector(".curtain");
  var arriving = false;
  try { arriving = sessionStorage.getItem("hc-turn") === "1"; sessionStorage.removeItem("hc-turn"); } catch (e) {}
  if (curtain) {
    if (arriving && !reduce) {
      curtain.classList.add("shut");
      requestAnimationFrame(function () { requestAnimationFrame(function () { curtain.classList.remove("shut"); curtain.classList.add("lift"); }); });
      setTimeout(function () { curtain.classList.remove("lift"); }, 1300);
    }
    window.addEventListener("pageshow", function (e) { if (e.persisted) curtain.classList.remove("shut", "drop"); });
  }
  function go(href) {
    if (reduce || !curtain) { location.href = href; return; }
    try { sessionStorage.setItem("hc-turn", "1"); if (window.HCstation) sessionStorage.setItem("hc-station", window.HCstation()); } catch (e) {}
    curtain.classList.add("drop");
    setTimeout(function () { location.href = href; }, 620);
  }
  window.HCgo = go;
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var href = a.getAttribute("href");
    if (!href || a.target === "_blank" || /^(#|mailto:|tel:|https?:)/.test(href) || !/\.html(\?|#|$)/.test(href)) return;
    var url = new URL(href, location.href);
    if (url.pathname === location.pathname) return;
    e.preventDefault(); go(url.href);
  });

  /* ---------- headings rise word by word, hinged in 3D ---------- */
  $$("main h1, main h2, .gate h2").forEach(function (h) {
    if (h.closest(".tag") || h.dataset.split) return;
    h.dataset.split = "1";
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var o = document.createElement("span"); o.className = "wm";
            var w = document.createElement("span"); w.className = "w"; w.style.setProperty("--i", i++); w.textContent = part;
            o.appendChild(w); frag.appendChild(o);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.matches("svg, img")) walk(n);
      });
    })(h);
    h.classList.add("split", "rv-h");
  });

  /* ---------- panels and lists flip up into place ---------- */
  var groups = [".class-list > li", ".conditions > li", ".prop-list > li", ".team > *", ".ticks > li", ".gap-list > li", ".try-list > li", ".wins-grid > li", ".feature-table tbody tr", ".qa details", ".rules li", ".contents li", ".judge-tabs", ".entries > li"];
  groups.forEach(function (sel) { $$(sel).forEach(function (el, k) { el.classList.add("rv"); el.style.setProperty("--d", Math.min(k, 8)); }); });
  $$(".panel, .care-card, .details-card, .svc, .judge-stage, .sheet, .rules, .compare-grid > *, .membership-art, .story > *, .filters, .manifesto-pull, .cover-copy").forEach(function (el) { el.classList.add("rv", "rv-card"); });
  function whenLoaded(fn) {
    if (!doc.classList.contains("loading") || doc.classList.contains("world-loaded")) { fn(); return; }
    var mo = new MutationObserver(function () { if (doc.classList.contains("world-loaded")) { mo.disconnect(); setTimeout(fn, 250); } });
    mo.observe(doc, { attributes: true, attributeFilter: ["class"] });
  }
  if ("IntersectionObserver" in window && !reduce) whenLoaded(function () {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
    $$(".rv, .rv-h").forEach(function (el) { io.observe(el); });
  }); else { $$(".rv, .rv-h").forEach(function (el) { el.classList.add("in"); }); }

  /* ---------- tilt: cards lean toward the pointer, with a moving glare ---------- */
  var tilts = $$("[data-tilt], .entry-card, .member, .win .tag, .details-card, .care-card, .membership-art .screen, .shot-frame .browser, .sheet");
  if (fine && !reduce) {
    tilts.forEach(function (el) {
      el.classList.add("tilt");
      var rx = 0, ry = 0, tx = 0, ty = 0, raf = 0, max = el.classList.contains("sheet") ? 3 : 9;
      function step() {
        rx += (tx - rx) * .14; ry += (ty - ry) * .14;
        el.style.setProperty("--rx", rx.toFixed(2) + "deg"); el.style.setProperty("--ry", ry.toFixed(2) + "deg");
        raf = Math.abs(tx - rx) + Math.abs(ty - ry) > .02 ? requestAnimationFrame(step) : 0;
      }
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        ty = (px - .5) * max * 2; tx = -(py - .5) * max * 2;
        el.style.setProperty("--gx", (px * 100).toFixed(1) + "%"); el.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
        el.classList.add("lit"); if (!raf) raf = requestAnimationFrame(step);
      });
      el.addEventListener("pointerleave", function () { tx = 0; ty = 0; el.classList.remove("lit"); if (!raf) raf = requestAnimationFrame(step); });
    });
  }

  /* ---------- the entry tag hangs on a real spring: touch it, fling it, it swings back ---------- */
  $$(".tag-hang").forEach(function (hang, idx) {
    if (reduce) return;
    var rest = parseFloat(getComputedStyle(hang).getPropertyValue("--rest")) || (idx % 2 ? -1.4 : 2.2);
    var a = rest - (idx === 0 ? 11 : 6), v = 0, yaw = 0, yv = 0, grab = null, alive = true;
    var lastX = null, lastT = 0, calm = false;
    function tick() {
      if (grab) {
        var r = hang.getBoundingClientRect(), px = r.left + r.width / 2, py = r.top;
        var target = clamp(Math.atan2(-(grab.x - px), Math.max(40, grab.y - py)) * 57.3, -38, 38);
        v = (target - a) * .35; a += v;
      } else {
        if (calm) { v += -(a - rest) * .12 - v * .32; } else { v += -(a - rest) * .028 - v * .045; }
        a += v;
      }
      yv += -yaw * (calm ? .1 : .03) - yv * (calm ? .3 : .06); yaw += yv;
      hang.style.transform = "rotate(" + a.toFixed(3) + "deg) rotateY(" + (yaw + v * 1.6).toFixed(2) + "deg)";
      if (alive) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    // hovering, typing or tabbing into the form settles the tag and holds it still
    hang.addEventListener("pointerenter", function () { calm = true; });
    hang.addEventListener("pointerleave", function () { if (!hang.contains(document.activeElement)) calm = false; });
    hang.addEventListener("focusin", function () { calm = true; });
    hang.addEventListener("focusout", function () { setTimeout(function () { if (!hang.contains(document.activeElement) && !hang.matches(":hover")) calm = false; }, 0); });
    hang.addEventListener("pointermove", function (e) { if (grab) { grab.x = e.clientX; grab.y = e.clientY; } });
    var handle = hang.querySelector(".tag-grip") || hang.querySelector(".tag-head") || hang;
    handle.addEventListener("pointerdown", function (e) {
      grab = { x: e.clientX, y: e.clientY }; handle.setPointerCapture(e.pointerId); hang.classList.add("grabbed");
    });
    handle.addEventListener("pointermove", function (e) { if (grab) { grab.x = e.clientX; grab.y = e.clientY; } });
    function release() { if (!grab) return; grab = null; hang.classList.remove("grabbed"); calm = false; yv += v * 4; setTimeout(function () { if (hang.matches(":hover")) calm = true; }, 1400); }
    handle.addEventListener("pointerup", release); handle.addEventListener("pointercancel", release);
    // a lodged entry thumps the tag
    hang.addEventListener("submit", function () { v -= 1.6; yv += 6; }, true);
  });

  /* ---------- magnetic buttons ---------- */
  if (fine && !reduce) {
    $$(".btn, .ribbons a, .seasons button").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty("--mx", ((e.clientX - r.left - r.width / 2) * .22).toFixed(1) + "px");
        b.style.setProperty("--my", ((e.clientY - r.top - r.height / 2) * .3).toFixed(1) + "px");
      });
      b.addEventListener("pointerleave", function () { b.style.setProperty("--mx", "0px"); b.style.setProperty("--my", "0px"); });
    });
  }

  /* ---------- gallery strip: drag to scroll; opening an entry zooms its image to full screen ---------- */
  $$(".strip").forEach(function (st) {
    var down = false, sx = 0, sl = 0, moved = 0;
    st.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") return; down = true; sx = e.clientX; sl = st.scrollLeft; moved = 0; });
    window.addEventListener("pointermove", function (e) { if (!down) return; var dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx)); if (moved > 4) st.classList.add("dragging"); st.scrollLeft = sl - dx; });
    window.addEventListener("pointerup", function () { if (!down) return; down = false; setTimeout(function () { st.classList.remove("dragging"); }, 0); });
    st.addEventListener("click", function (e) {
      if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; return; }
      var a = e.target.closest && e.target.closest(".entry-card a"); if (!a || reduce) return;
      var img = a.querySelector("img"); if (!img) return;
      e.preventDefault(); e.stopPropagation();
      var r = img.getBoundingClientRect(), z = img.cloneNode();
      z.className = "zoomer" + (img.classList.contains("contain") ? " contain" : ""); z.removeAttribute("loading");
      z.style.left = r.left + "px"; z.style.top = r.top + "px"; z.style.width = r.width + "px"; z.style.height = r.height + "px";
      document.body.appendChild(z);
      requestAnimationFrame(function () { requestAnimationFrame(function () { z.classList.add("go"); }); });
      setTimeout(function () { location.href = a.href; }, 700);
    }, true);
    st.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") st.scrollBy({ left: st.clientWidth * .6, behavior: "smooth" }); if (e.key === "ArrowLeft") st.scrollBy({ left: -st.clientWidth * .6, behavior: "smooth" }); });
  });
  window.addEventListener("pageshow", function () { $$(".zoomer").forEach(function (z) { z.remove(); }); });

  /* ---------- scroll progress thread along the page edge ---------- */
  var thread = document.querySelector(".thread i");
  if (thread) {
    var onScroll = function () { var h = document.documentElement.scrollHeight - innerHeight; thread.style.transform = "scaleY(" + (h > 0 ? scrollY / h : 0) + ")"; };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }
})();
