# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A demo IT PMO Kanban board for a fictitious bank, used as a training tool. The whole app is one file, `index.html`, with inline `<style>` and `<script>`. There is no build, package manager, linter or test suite.

## Hard constraints (from the original spec; keep them)

- Vanilla HTML/CSS/JS only. No frameworks, libraries, CDN scripts, web fonts or image files. Icons are Unicode or inline SVG; fonts are the system stack.
- Must run by double-clicking `index.html` (`file://`), with no server.
- No persistence of any kind: no localStorage, sessionStorage, IndexedDB or cookies. A refresh resets the board to the seed data on purpose, and the header note says so.
- No `alert()`, `confirm()` or `!important`. Delete confirmation is an inline "Delete? Yes / No" inside the card.
- Branding is a neutral "IT PMO" text wordmark in corporate blue. Do not add a real bank's logo, trademarks or look of an official system.
- The only network call is FormSubmit (see below). Never send data anywhere else.

## Running and checking

- Open `index.html` in a browser, or serve the folder with `python3 -m http.server` to exercise FormSubmit (it rejects `file://` pages, which the app handles with a warning toast).
- Headless check (cloud sessions have Playwright and Chromium preinstalled): load `file:///.../index.html` with `NODE_PATH=$(npm root -g) node script.js`, use `page.route('https://formsubmit.co/**', r => r.abort())` to avoid real emails, and drive `page.dragAndDrop`, the `select[data-action=move]` controls and `#task-form`.

## Architecture

All behaviour follows one rule: **mutate `state`, then call `renderBoard()`**.

- `state = { tasks, filters, pendingDeleteId, nextId }` is the single source of truth. Card UI state (which card is showing the delete confirm) lives in `state.pendingDeleteId`, not in the DOM.
- `renderBoard()` rebuilds every column from `applyFilters(state.tasks)` via `renderCard()`, then calls `renderSummary()` (header counts are always computed over all tasks, not the filtered set). Nothing outside `renderBoard()` edits card contents directly.
- `addTask()`, `moveTask()` and `deleteTask()` are the only task mutators. Task IDs come from `nextTaskId()` as `UOB-ITPM-####`; seed tasks consume IDs 0001–0008.
- Event handling is delegated: `bindDragAndDrop(board)` and `bindCardControls(board)` attach once to `#board`, so re-rendering never needs rebinding. Card buttons/selects are identified by `data-action` and `data-id`. After a re-render, `focusCardControl()` restores keyboard focus.
- Drag and drop uses the native HTML5 API; the drop target column reads `data-status`. The "Move ▸" select is the keyboard fallback and calls the same `moveTask()`.
- All user strings pass through `escapeHtml()` before going into template literals. Keep that for any new field.
- Dates are local `YYYY-MM-DD` strings compared lexically (`todayIso()`). Seed due dates are offsets from today (`offsetIso`) so some cards are always overdue.
- Reference lists (`STATUSES`, `PROJECTS`, `CATEGORIES`, `PRIORITIES`) drive the columns, form selects, filters and validation. Add a column or option there, not in markup.

## Add Task and FormSubmit

- `handleSubmit()` validates with `validateTask()` (inline errors via `showErrors()`), then adds the card optimistically, and only then calls `notifyNewTask()`. The submit button shows "Sending…" while in flight and the modal closes when the request settles.
- `FORMSUBMIT_ENDPOINT` at the top of the script is the one place to set the recipient email. FormSubmit needs a one-time activation: the first submission emails a confirmation link to that address, and nothing is delivered until it is clicked.
- `notifyNewTask()` throws on a non-OK response or on `success: "false"`. Callers catch it and show "Card added locally — email notification failed"; a FormSubmit failure must never break the board.

## Related copy

A theme-aware copy was published as a private claude.ai artifact (it adds dark-mode tokens and safe-area gutters and drops the document skeleton). It is a separate file; changes to `index.html` do not reach it automatically.
