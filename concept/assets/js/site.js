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
        '<button type="button" aria-haspopup="dialog"><div class="shot"><img src="' + IMG + e.img + '" alt=""' + (e.contain ? ' class="contain"' : "") + ' loading="lazy" width="1000" height="750"></div>' +
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
