/* =========================================================
   Security briefing hook
   Shows a dialog once, after the visitor has spent 10 seconds on the page.
   - Counts only time the tab is visible (the clock pauses while it is hidden).
   - Uses a native <dialog>, so focus is trapped, Esc closes it and focus
     returns to where the visitor was. No alert(), no storage, no network.
   - Self-contained: it adds its own styles and markup. Edit the CONFIG below.
   ========================================================= */
(function () {
  "use strict";

  var CONFIG = {
    delayMs: 10000,
    title: "Company security briefing",
    event: "Security briefing",
    weekday: 1,                // 0 = Sunday, 1 = Monday ... the "next" occurrence is shown
    time: "10:00 am",
    place: "Town Hall room",
    retryMs: 2000,             // wait this long if another modal is already open
  };

  var shown = false;
  var remaining = CONFIG.delayMs;
  var startedAt = 0;
  var timer = null;

  // The next occurrence of CONFIG.weekday, always in the future ("next Monday")
  function nextDate() {
    var d = new Date();
    var ahead = (CONFIG.weekday - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + ahead);
    return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  function addStyles() {
    var css = [
      "dialog.sec-briefing{border:0;border-radius:8px;padding:0;max-width:min(440px,calc(100vw - 32px));width:100%;",
      "color:var(--c-text,#1b2333);background:var(--c-surface,#fff);box-shadow:0 10px 30px rgba(0,0,0,.3);font-family:inherit}",
      "dialog.sec-briefing::backdrop{background:rgba(10,20,40,.55)}",
      ".sec-briefing-head{background:var(--c-brand,#0b3d91);color:#fff;padding:16px 24px;display:flex;align-items:center;gap:12px}",
      ".sec-briefing-head svg{width:24px;height:24px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}",
      ".sec-briefing-head h2{margin:0;font-size:18px}",
      ".sec-briefing-body{padding:20px 24px 8px}",
      ".sec-briefing-body p{margin:0 0 12px;line-height:1.5}",
      ".sec-briefing-list{margin:0 0 12px;display:grid;grid-template-columns:auto 1fr;gap:6px 16px}",
      ".sec-briefing-list dt{color:var(--c-muted,#55607a)}",
      ".sec-briefing-list dd{margin:0;font-weight:600}",
      ".sec-briefing-actions{padding:8px 24px 20px;display:flex;justify-content:flex-end}",
      ".sec-briefing-actions button{border:0;border-radius:4px;min-height:44px;padding:8px 24px;cursor:pointer;",
      "background:var(--c-brand,#0b3d91);color:#fff;font:inherit;font-weight:600}",
      ".sec-briefing-actions button:hover{background:var(--c-brand-dark,#072a66)}",
      "dialog.sec-briefing button:focus-visible{outline:3px solid var(--c-focus,#0b57d0);outline-offset:2px}",
    ].join("");
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function build() {
    var dlg = document.createElement("dialog");
    dlg.className = "sec-briefing";
    dlg.setAttribute("aria-labelledby", "sec-briefing-title");
    dlg.setAttribute("aria-describedby", "sec-briefing-text");
    dlg.innerHTML =
      '<div class="sec-briefing-head">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>' +
        '<h2 id="sec-briefing-title"></h2>' +
      "</div>" +
      '<div class="sec-briefing-body">' +
        '<p id="sec-briefing-text"></p>' +
        '<dl class="sec-briefing-list"><dt>When</dt><dd id="sec-briefing-when"></dd><dt>Where</dt><dd id="sec-briefing-where"></dd></dl>' +
      "</div>" +
      '<form method="dialog" class="sec-briefing-actions"><button type="submit">Got it</button></form>';

    // Text goes in with textContent, so nothing here is parsed as HTML
    dlg.querySelector("#sec-briefing-title").textContent = CONFIG.title;
    dlg.querySelector("#sec-briefing-text").textContent =
      "There is a company security briefing next " + new Date(2023, 0, 1 + CONFIG.weekday).toLocaleDateString(undefined, { weekday: "long" }) +
      " at " + CONFIG.time + " in the " + CONFIG.place + ". Please plan to attend.";
    dlg.querySelector("#sec-briefing-when").textContent = nextDate() + ", " + CONFIG.time;
    dlg.querySelector("#sec-briefing-where").textContent = CONFIG.place;
    dlg.addEventListener("close", function () { dlg.remove(); });
    return dlg;
  }

  // A modal counts as open only if neither it nor any parent is hidden
  function anotherModalOpen() {
    var modals = document.querySelectorAll('[aria-modal="true"]');
    for (var i = 0; i < modals.length; i++) {
      if (!modals[i].closest("[hidden]")) return true;
    }
    return false;
  }

  function show() {
    if (shown) return;
    // Do not stack on top of another open modal; try again shortly
    if (anotherModalOpen()) {
      timer = setTimeout(show, CONFIG.retryMs);
      return;
    }
    shown = true;
    var dlg = build();
    document.body.appendChild(dlg);
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
  }

  function start() {
    if (shown || document.hidden) return;
    startedAt = Date.now();
    timer = setTimeout(show, remaining);
  }

  function pause() {
    if (timer === null || shown) return;
    clearTimeout(timer);
    timer = null;
    remaining = Math.max(0, remaining - (Date.now() - startedAt));
  }

  function init() {
    addStyles();
    start();
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) pause(); else start();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
