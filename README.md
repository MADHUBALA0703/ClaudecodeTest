# IT PMO Kanban

A demo Kanban board for the IT Project Management Office of a **fictitious bank**, built as a training tool. The whole app is one file, `index.html`, written in plain HTML, CSS and JavaScript. It has no build step, no dependencies and no server.

**Live demo:** https://madhubala0703.github.io/ClaudecodeTest/

## Features

- Four columns: **Backlog**, **In Progress**, **Blocked** and **Done**.
- Drag and drop cards between columns. The **Move ▸** menu on each card does the same thing from the keyboard.
- Add tasks through a validated form: title, project, category, priority, assignee, due date and status.
- Filter by project, assignee and priority. The header counts always cover every task.
- Overdue cards are highlighted. The sample due dates are relative to today, so some cards are always overdue.
- Deleting a card asks for inline confirmation (**Delete? Yes / No**).
- Optional email notice for each new task, sent through [FormSubmit](https://formsubmit.co).
- Responsive layout and keyboard accessible.

## Run it locally

- Double-click `index.html` to open it in any modern browser, or
- serve the folder to test the email notice (FormSubmit rejects `file://` pages):

  ```bash
  python3 -m http.server 8000
  # open http://localhost:8000
  ```

## Configuration

The email notice is sent to the address in `FORMSUBMIT_ENDPOINT`, near the top of the script in `index.html`:

```js
const FORMSUBMIT_ENDPOINT = "https://formsubmit.co/ajax/YOUR_EMAIL@example.com";
```

FormSubmit needs a one-time activation. The first submission sends a confirmation link to that address, and nothing is delivered until you click it. If the email fails, the card is still added and a warning is shown.

> Any address you put here becomes public on GitHub and on the live site.

## Notes

- **Nothing is saved, on purpose.** Tasks live only in memory, and refreshing the page resets the board to the sample data.
- The only network request is the optional FormSubmit call.

## Deployment

Every push to `main` deploys `index.html` to GitHub Pages through the workflow in [`.github/workflows/pages.yml`](.github/workflows/pages.yml). Only the site file is published, not repo files such as `CLAUDE.md` or `.claude/`.

## Disclaimer

This is a training demo. The bank, projects, people and tasks are all fictitious, and it is not linked to any real financial institution.
