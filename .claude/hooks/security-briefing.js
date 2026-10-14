/* Security briefing hook.
   Loaded by index.html. Once a visitor has spent 10 seconds on the page
   (time while the tab is hidden does not count) it opens a native modal
   dialog announcing the company security briefing. Shown once per page load.
   No storage, no network, no alert(). Closing the dialog is the only action. */
(function () {
  "use strict";

  var STAY_MS = 10000;
  var BRIEFING = {
    title: "Company security briefing",
    when: "Next Monday, 10:00 am",
    where: "Town Hall room",
    note: "Attendance is expected. Please keep that slot free in your calendar."
  };

  var remaining = STAY_MS;
  var startedAt = 0;
  var timer = 0;
  var shown = false;

  function injectStyles() {
    var css = [
      ".briefing-dialog { border: 0; border-radius: var(--radius, 8px); padding: 0; width: calc(100% - 32px); max-width: 440px; background: var(--c-surface, #fff); color: var(--c-text, #1b2333); font-family: var(--font, system-ui, sans-serif); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); }",
      ".briefing-dialog::backdrop { background: rgba(10, 20, 40, 0.5); }",
      ".briefing-head { display: flex; align-items: center; gap: 8px; padding: 16px 24px; background: var(--c-brand, #0b3d91); color: #fff; }",
      ".briefing-head h2 { margin: 0; font-size: 18px; }",
      ".briefing-body { padding: 24px; }",
      ".briefing-body dl { margin: 0 0 16px; display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; }",
      ".briefing-body dt { font-weight: 600; color: var(--c-muted, #55607a); }",
      ".briefing-body dd { margin: 0; font-weight: 600; }",
      ".briefing-body p { margin: 0 0 24px; }",
      ".briefing-actions { display: flex; justify-content: flex-end; }",
      ".briefing-close { font: inherit; font-weight: 600; border: 0; border-radius: var(--radius-sm, 4px); padding: 10px 20px; background: var(--c-brand, #0b3d91); color: #fff; cursor: pointer; min-height: 44px; }",
      ".briefing-close:hover { background: var(--c-brand-dark, #072a66); }",
      ".briefing-close:focus-visible { outline: 3px solid var(--c-focus, #0b57d0); outline-offset: 2px; }"
    ].join("\n");
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildDialog() {
    var dialog = document.createElement("dialog");
    dialog.className = "briefing-dialog";
    dialog.setAttribute("aria-labelledby", "briefing-title");
    dialog.setAttribute("aria-describedby", "briefing-desc");

    var head = document.createElement("div");
    head.className = "briefing-head";
    var icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "🛡"; // shield
    var title = document.createElement("h2");
    title.id = "briefing-title";
    title.textContent = BRIEFING.title;
    head.appendChild(icon);
    head.appendChild(title);

    var body = document.createElement("div");
    body.className = "briefing-body";
    body.id = "briefing-desc";
    var list = document.createElement("dl");
    [["When", BRIEFING.when], ["Where", BRIEFING.where]].forEach(function (row) {
      var dt = document.createElement("dt");
      dt.textContent = row[0];
      var dd = document.createElement("dd");
      dd.textContent = row[1];
      list.appendChild(dt);
      list.appendChild(dd);
    });
    var note = document.createElement("p");
    note.textContent = BRIEFING.note;

    var actions = document.createElement("div");
    actions.className = "briefing-actions";
    var close = document.createElement("button");
    close.type = "button";
    close.className = "briefing-close";
    close.textContent = "Got it";
    close.addEventListener("click", function () { dialog.close(); });
    actions.appendChild(close);

    body.appendChild(list);
    body.appendChild(note);
    body.appendChild(actions);
    dialog.appendChild(head);
    dialog.appendChild(body);
    dialog.addEventListener("close", function () { dialog.remove(); });
    return dialog;
  }

  function show() {
    // Do not interrupt someone who is typing in the Add Task form.
    var addTask = document.getElementById("modal");
    if (addTask && !addTask.hidden) { remaining = 1000; start(); return; }
    shown = true;
    injectStyles();
    var dialog = buildDialog();
    document.body.appendChild(dialog);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function start() {
    if (shown || document.hidden) return;
    startedAt = Date.now();
    timer = setTimeout(show, remaining);
  }

  function pause() {
    if (!timer) return;
    clearTimeout(timer);
    timer = 0;
    remaining = Math.max(0, remaining - (Date.now() - startedAt));
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) pause(); else start();
  });
  start();
})();
