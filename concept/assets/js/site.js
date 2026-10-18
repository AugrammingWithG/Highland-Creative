/* Highland Creative concept: behaviour. Plain JS, works from file://. */
(function () {
  "use strict";
  var HC = window.HC || {};
  var root = document.documentElement;
  var IMG = "../assets/hc/";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* Year */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* Mobile menu */
  var menuBtn = $(".menu-btn"), nav = $(".sections");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); menuBtn.focus(); }
    });
  }

  /* Live studio status ("Gates open") */
  function gateStatus() {
    var h = HC.hours || { days: [1, 2, 3, 4, 5], open: 9, close: 17, label: "Mon–Fri, 9am–5pm" };
    var now = new Date();
    var parts;
    try {
      parts = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", weekday: "short", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(now);
    } catch (e) { parts = null; }
    var map = {};
    if (parts) parts.forEach(function (p) { map[p.type] = p.value; });
    var dayIdx = parts ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(map.weekday) : now.getDay();
    var hour = parts ? parseInt(map.hour, 10) % 24 + parseInt(map.minute, 10) / 60 : now.getHours();
    var open = h.days.indexOf(dayIdx) > -1 && hour >= h.open && hour < h.close;
    var text = open ? "Studio open · till " + (h.close > 12 ? h.close - 12 : h.close) + "pm" : "Studio closed · opens " + nextOpen(dayIdx, hour, h);
    $$("[data-status]").forEach(function (el) {
      el.setAttribute("data-open", String(open));
      var t = $(".txt", el); if (t) t.textContent = text + " · sample hours";
    });
  }
  function nextOpen(day, hour, h) {
    if (h.days.indexOf(day) > -1 && hour < h.open) return "today " + h.open + "am";
    for (var i = 1; i < 8; i++) {
      var d = (day + i) % 7;
      if (h.days.indexOf(d) > -1) return (i === 1 ? "tomorrow" : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d]) + " " + h.open + "am";
    }
    return "soon";
  }
  gateStatus();
  setInterval(gateStatus, 60000);

  /* Entry forms (front-end only) */
  var CLASS_PARAM = new URLSearchParams(location.search).get("class");
  $$("form[data-entry]").forEach(function (form) {
    var sel = $("select[name=class]", form);
    if (sel && CLASS_PARAM) { $$("option", sel).forEach(function (o) { if (o.value === CLASS_PARAM) sel.value = CLASS_PARAM; }); }
    var noEl = $("[data-entry-no]", form);
    var entryNo = String(412 + Math.floor((Date.now() / 86400000) % 300)).padStart(4, "0");
    if (noEl) noEl.textContent = "No. " + entryNo;

    function check(field) {
      var input = $("input, select, textarea", field);
      if (!input) return true;
      var v = (input.value || "").trim();
      var ok = true;
      if (input.required && !v) ok = false;
      if (ok && v && input.type === "email") ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
      if (ok && v && input.dataset.contact) ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || v.replace(/[^\d]/g, "").length >= 8;
      field.classList.toggle("invalid", !ok);
      input.setAttribute("aria-invalid", String(!ok));
      return ok;
    }
    $$(".field", form).forEach(function (f) {
      var input = $("input, select, textarea", f);
      if (input) input.addEventListener("blur", function () { if (f.classList.contains("invalid") || input.value) check(f); });
      if (input) input.addEventListener("input", function () { if (f.classList.contains("invalid")) check(f); });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fields = $$(".field", form), firstBad = null;
      fields.forEach(function (f) { if (!check(f) && !firstBad) firstBad = f; });
      if (firstBad) { var inp = $("input, select, textarea", firstBad); if (inp) inp.focus(); return; }
      var btn = $("button[type=submit]", form);
      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = "Lodging entry…"; }
      setTimeout(function () {
        var nameInput = $("input[name=name], input[name=first]", form);
        var who = nameInput && nameInput.value.trim() ? nameInput.value.trim().split(/\s+/)[0] : "";
        var nameSlot = $("[data-thanks-name]", form);
        if (nameSlot) nameSlot.textContent = who ? ", " + who : "";
        var stampNo = $("[data-stamp-no]", form);
        if (stampNo) stampNo.textContent = "No. " + entryNo;
        var clsSlot = $("[data-thanks-class]", form);
        if (clsSlot && sel) clsSlot.textContent = sel.options[sel.selectedIndex].text.replace(/^\d+\s·\s/, "");
        form.classList.add("done");
        var done = $(".form-done", form);
        if (done) { done.setAttribute("tabindex", "-1"); done.focus(); }
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
      }, 650);
    });
    var again = $("[data-again]", form);
    if (again) again.addEventListener("click", function () { form.reset(); form.classList.remove("done"); var f = $("input, select", form); if (f) f.focus(); });
  });

  /* Judges' comments */
  var stage = $("[data-judges]");
  if (stage && HC.judges) {
    var tabs = $(".judge-tabs", stage.parentNode);
    var quote = $(".judge-quote", stage);
    HC.judges.forEach(function (j, i) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "tab"); b.id = "judge-tab-" + i;
      b.setAttribute("aria-controls", "judge-panel"); b.textContent = j.name;
      b.addEventListener("click", function () { showJudge(i, true); });
      b.addEventListener("keydown", function (e) {
        var n = HC.judges.length;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); showJudge((i + 1) % n, true, true); }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); showJudge((i - 1 + n) % n, true, true); }
      });
      tabs.appendChild(b);
    });
    function showJudge(i, animate, focus) {
      var j = HC.judges[i];
      $$("button", tabs).forEach(function (b, k) { b.setAttribute("aria-selected", String(k === i)); b.tabIndex = k === i ? 0 : -1; if (k === i && focus) b.focus(); });
      quote.setAttribute("aria-labelledby", "judge-tab-" + i);
      quote.innerHTML = "<blockquote><p>" + esc(j.quote) + "</p></blockquote><figcaption><b>" + esc(j.name) + "</b><span>" + esc(j.role) + "</span></figcaption>";
      if (animate) { quote.classList.remove("swap"); void quote.offsetWidth; quote.classList.add("swap"); }
    }
    showJudge(0, false);
    var jIdx = 0, jPaused = false, jTimer = null, jWrap = stage.parentNode;
    var tick = function () {
      clearTimeout(jTimer);
      $$("button", tabs).forEach(function (b) { b.classList.remove("tick"); });
      var cur = $('button[aria-selected="true"]', tabs); if (!cur || reduceMotion) return;
      void cur.offsetWidth; cur.classList.add("tick");
      jTimer = setTimeout(function () { if (jPaused) return; jIdx = (HC.judges.indexOf(HC.judges.filter(function (j, k) { return $$("button", tabs)[k] === cur; })[0]) + 1) % HC.judges.length; showJudge(jIdx, true); tick(); }, 7000);
    };
    tabs.addEventListener("click", function () { setTimeout(tick, 0); });
    jWrap.addEventListener("pointerenter", function () { jPaused = true; tabs.classList.add("paused"); });
    jWrap.addEventListener("pointerleave", function () { jPaused = false; tabs.classList.remove("paused"); tick(); });
    jWrap.addEventListener("focusin", function () { jPaused = true; tabs.classList.add("paused"); });
    jWrap.addEventListener("focusout", function () { jPaused = false; tabs.classList.remove("paused"); });
    tick();
  }

  /* Floating phrases from the clients' own words */
  var field = $("[data-quote-field]");
  if (field) {
    var PH = ["nothing is a problem", "above and beyond", "the entire package", "fast loading", "a strong marketing tool", "an honest approach", "helped us sell product", "the personal touch", "compliments and leads every day", "always responsive", "a business friendship", "very reasonable"];
    var spots = [[4, 12], [10, 70], [2, 42], [18, 88], [70, 8], [80, 34], [74, 62], [66, 88], [36, 4], [52, 94], [26, 30], [60, 22]];
    field.innerHTML = PH.map(function (p, i) {
      var depth = (i % 3), s = spots[i];
      return '<span class="qf d' + depth + '" style="left:' + s[0] + "%;top:" + s[1] + "%;--qd:" + (i * -1.7).toFixed(1) + 's">“' + esc(p) + "”</span>";
    }).join("");
    window.addEventListener("pointermove", function (e) {
      field.style.setProperty("--px", ((e.clientX / innerWidth) - .5).toFixed(3)); field.style.setProperty("--py", ((e.clientY / innerHeight) - .5).toFixed(3));
    }, { passive: true });
  }

  /* Care plan calculator ($360 + GST per site per year: their published price) */
  var calc = $("[data-calc]");
  if (calc) {
    var out = $("output", calc), total = $("[data-total]", calc), n = 1;
    function render() {
      out.textContent = n;
      var ex = 360 * n, inc = ex * 1.1;
      total.innerHTML = "$" + ex.toLocaleString("en-AU") + " + GST<small>" + n + (n === 1 ? " website" : " websites") + " · $" + inc.toLocaleString("en-AU", { maximumFractionDigits: 0 }) + " a year incl. GST</small>";
    }
    $$("button", calc).forEach(function (b) {
      b.addEventListener("click", function () { n = Math.max(1, Math.min(20, n + parseInt(b.dataset.step, 10))); render(); });
    });
    render();
  }

  /* Entries on the home page: two endless strips of cut-out work (websites one way, brands the other) */
  $$("[data-marquee]").forEach(function (m) {
    if (!HC.entries) return;
    var brand = m.getAttribute("data-marquee") === "brand";
    var items = HC.entries.filter(function (e) { return brand ? e.cls === "brand" : e.cls !== "brand"; });
    var row = function (dup) {
      return items.map(function (e) {
        return '<a class="mq-item' + (brand ? " is-logo" : "") + (/^(bees-in-bowties|walton-earthmoving|wall-to-wollondilly)$/.test(e.slug) ? " badge" : "") + '" href="work.html#' + e.slug + '"' + (dup ? ' tabindex="-1" aria-hidden="true"' : "") + '><img src="' + IMG + HC.cut(e) + '" alt="' + (dup ? "" : esc(e.title)) + '" loading="lazy" draggable="false"><span>' + esc(e.title) + "</span></a>";
      }).join("");
    };
    m.innerHTML = '<div class="mq-track">' + row(false) + row(true) + "</div>";
  });

  /* Classes: the sticky showcase follows the list */
  var show = $("[data-class-show]");
  if (show && "IntersectionObserver" in window) {
    var CS = [
      { img: "cut/inconsult-multi-devices.webp", cap: "Website design & development" },
      { img: "cut/farm-writers-multi-devices.webp", cap: "Wild Apricot membership sites" },
      { img: "cut/beesinbowties-1.webp", cap: "Print & advertisement design", logo: true },
      { img: "cut/highlands-design-co.webp", cap: "Branding & identity", logo: true },
      { img: "cut/mmc-multi-devices.webp", cap: "SEO & web marketing" },
      { quote: "Words that do their job.", cap: "Copywriting" },
      { img: "cut/shahgps-multi-devices.webp", cap: "Website Care Plan · $360 + GST a year" }
    ];
    var media = $("[data-cs-media]", show), num = $("[data-cs-num]", show), capEl = $("[data-cs-cap]", show), csCur = -1;
    media.innerHTML = CS.map(function (c, i) {
      return c.quote ? '<p class="cs-quote" data-i="' + i + '">' + esc(c.quote) + "</p>" : '<img src="' + IMG + c.img + '" alt="" data-i="' + i + '"' + (c.logo ? ' class="cs-logo"' : "") + ">";
    }).join("");
    var setClass = function (i) {
      if (i === csCur) return; csCur = i;
      $$("[data-i]", media).forEach(function (el) { el.classList.toggle("on", +el.getAttribute("data-i") === i); });
      num.classList.remove("flip"); void num.offsetWidth; num.textContent = i + 1; num.classList.add("flip");
      capEl.textContent = CS[i].cap;
    };
    var rows = $$(".schedule .class-list > li");
    var cio = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) setClass(rows.indexOf(en.target)); }); }, { rootMargin: "-45% 0px -45% 0px" });
    rows.forEach(function (r, i) { cio.observe(r); r.addEventListener("pointerenter", function () { setClass(i); }); });
    setClass(0);
  }

  /* Pavilion on the home page: first entries */
  var featured = $("[data-featured]");
  if (featured && HC.entries) {
    var picks = ["parramatta-district-regional-law-society", "farm-writers-association-of-nsw", "knox-farms", "botanical-art-society-logo", "jnw-strategic-consulting", "mittagong-medical-centre", "red-olive-restaurant", "maserati-club-of-australia"];
    featured.innerHTML = picks.map(function (slug, i) {
      var e = HC.entries.filter(function (x) { return x.slug === slug; })[0];
      if (!e) return "";
      var c = HC.classes[e.cls];
      return '<li class="entry-card"><span class="mini-tag" aria-hidden="true">Class ' + c.no + "</span>" +
        '<a href="work.html#' + e.slug + '"><div class="shot"><img src="' + IMG + e.img + '" alt="' + esc(e.title) + ' — ' + esc(c.label.toLowerCase()) + ' by Highland Creative"' + (e.contain ? ' class="contain"' : "") + ' loading="' + (i < 3 ? "eager" : "lazy") + '" width="1000" height="750"></div>' +
        "<h3>" + esc(e.title) + '</h3><p class="meta">' + esc(c.label) + "</p></a></li>";
    }).join("");
  }

  /* Work page: filters, search, viewer */
  var grid = $("[data-work]");
  if (grid && HC.entries) {
    var state = { cls: "all", q: "" };
    var list = HC.entries;
    grid.innerHTML = list.map(function (e, i) {
      var c = HC.classes[e.cls];
      return '<li class="entry-card" data-cls="' + e.cls + '" data-i="' + i + '"><span class="mini-tag" aria-hidden="true">No. ' + String(i + 1).padStart(3, "0") + "</span>" +
        '<button type="button" aria-haspopup="dialog"><div class="shot"><img src="' + IMG + (HC.cut ? HC.cut(e) : e.img) + '" alt=""' + (e.contain ? ' class="contain cut-logo"' : ' class="cut"') + ' loading="lazy"></div>' +
        "<h3>" + esc(e.title) + '</h3><p class="meta">Class ' + c.no + " · " + esc(c.label) + "</p></button></li>";
    }).join("");
    var counts = { all: list.length };
    list.forEach(function (e) { counts[e.cls] = (counts[e.cls] || 0) + 1; });
    $$("[data-filter]").forEach(function (b) {
      var cnt = $(".count", b); if (cnt) cnt.textContent = counts[b.dataset.filter] || 0;
      b.addEventListener("click", function () {
        state.cls = b.dataset.filter;
        $$("[data-filter]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        apply();
      });
    });
    var q = $("[data-search]");
    if (q) q.addEventListener("input", function () { state.q = q.value.trim().toLowerCase(); apply(); });
    var line = $("[data-results]"), empty = $(".empty");
    function apply() {
      var shown = 0;
      $$(".entry-card", grid).forEach(function (li) {
        var e = list[li.dataset.i];
        var ok = (state.cls === "all" || e.cls === state.cls) && (!state.q || (e.title + " " + e.brief + " " + HC.classes[e.cls].label).toLowerCase().indexOf(state.q) > -1);
        li.hidden = !ok; if (ok) shown++;
      });
      if (line) line.textContent = shown + (shown === 1 ? " entry" : " entries") + " on show";
      if (empty) empty.classList.toggle("show", shown === 0);
    }
    var reset = $("[data-reset]");
    if (reset) reset.addEventListener("click", function () { state = { cls: "all", q: "" }; if (q) q.value = ""; $$("[data-filter]").forEach(function (x) { x.setAttribute("aria-pressed", String(x.dataset.filter === "all")); }); apply(); });
    apply();

    var dlg = $("dialog.viewer"), cur = 0, opener = null;
    function visible() { return $$(".entry-card", grid).filter(function (li) { return !li.hidden; }).map(function (li) { return +li.dataset.i; }); }
    function fill(i) {
      cur = i; var e = list[i], c = HC.classes[e.cls];
      var img = $(".viewer-img img", dlg);
      img.src = IMG + e.img; img.alt = e.title + " — " + c.label.toLowerCase() + " by Highland Creative";
      $("[data-v-title]", dlg).textContent = e.title;
      $("[data-v-class]", dlg).textContent = "Entry No. " + String(i + 1).padStart(3, "0") + " · Class " + c.no + " · " + c.label;
      $("[data-v-brief]", dlg).textContent = e.brief;
      var live = $("[data-v-live]", dlg);
      if (e.url) { live.hidden = false; live.href = e.url; } else { live.hidden = true; }
      $("[data-v-enter]", dlg).href = "contact.html?class=" + (e.cls === "member" ? "wild-apricot" : e.cls === "brand" ? "branding" : "website");
      if (history.replaceState) history.replaceState(null, "", "#" + e.slug);
    }
    function step(d) { var v = visible(); var k = v.indexOf(cur); if (k < 0) return; fill(v[(k + d + v.length) % v.length]); }
    function open(i) { fill(i); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
    grid.addEventListener("click", function (ev) { var b = ev.target.closest("button"); if (!b) return; opener = b; open(+b.closest(".entry-card").dataset.i); });
    $("[data-v-prev]", dlg).addEventListener("click", function () { step(-1); });
    $("[data-v-next]", dlg).addEventListener("click", function () { step(1); });
    $("[data-v-close]", dlg).addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (ev) { if (ev.target === dlg) dlg.close(); });
    dlg.addEventListener("keydown", function (ev) { if (ev.key === "ArrowRight") step(1); if (ev.key === "ArrowLeft") step(-1); });
    dlg.addEventListener("close", function () { if (history.replaceState) history.replaceState(null, "", location.pathname + location.search); if (opener) opener.focus(); });
    document.addEventListener("hc:open-entry", function (ev) {
      list.forEach(function (e, i) { if (e.slug === ev.detail) { opener = null; open(i); } });
    });
    if (location.hash) {
      var slug = location.hash.slice(1);
      list.forEach(function (e, i) { if (e.slug === slug) { opener = $('.entry-card[data-i="' + i + '"] button', grid); setTimeout(function () { open(i); }, 150); } });
    }
  }
})();
