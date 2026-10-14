---
description: Security-scan the project, then push it to GitHub, update the README and repo "About", and deploy GitHub Pages via a GitHub Action
argument-hint: <owner/repo or repo URL> [branch=main] [--private] [--description "..."] [--topics a,b,c]
---

# Publish this project to GitHub

Target repository details from the user: `$ARGUMENTS`

You are publishing this project to the internet. Work through the steps below **in order**.
**Step 1 is a hard gate: nothing leaves this machine until it passes.**

## 0. Gather inputs

Parse `$ARGUMENTS` for:

- **Repository**: `owner/repo`, `https://github.com/owner/repo(.git)` or `git@github.com:owner/repo.git`. Normalise it to `OWNER` and `REPO`.
- **Branch**: default `main` unless given.
- **Visibility** (only used if the repo has to be created): public unless `--private` is given.
- **Description** and **topics** for the repo "About" box (optional).

If the repository is missing or ambiguous, ask the user before doing anything else. Do not guess an owner.

Then check what you have to work with:

- `git rev-parse --is-inside-work-tree`, `git status --short`, `git remote -v`, current branch.
- Whether `gh` is installed and authenticated (`gh auth status`). If it is, use `gh` for every GitHub API call below. If it is not, use the GitHub MCP tools if they are available; otherwise tell the user which manual steps remain (see step 7) and continue with what plain `git` can do.
- Whether the repo exists: `gh repo view OWNER/REPO --json name,visibility,description,homepageUrl,repositoryTopics,defaultBranchRef`.

## 1. Security scan (blocking gate)

Scan **everything that would be pushed**: the working tree's tracked and untracked-but-not-ignored files (`git ls-files -co --exclude-standard`) **and** the full git history (`git log -p --all`), since history is published too.

Run all of these and collect findings with `file:line`:

1. **Secret scanner, if installed** (prefer in this order; skip silently if absent):
   - `gitleaks detect --source . --redact --no-banner` (scans history) and `gitleaks dir . --redact` if supported
   - `trufflehog git file://. --only-verified=false --no-update`
   - `detect-secrets scan --all-files`
2. **Pattern grep fallback** (always run, over files and `git log -p --all`). Look for at least:
   - Private keys: `-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY`
   - Cloud/API tokens: `AKIA[0-9A-Z]{16}`, `ASIA[0-9A-Z]{16}`, `ghp_|gho_|ghu_|ghs_|ghr_|github_pat_`, `xox[baprs]-`, `sk-[A-Za-z0-9_-]{20,}`, `sk-ant-`, `AIza[0-9A-Za-z_-]{35}`, `glpat-`, `npm_[A-Za-z0-9]{36}`
   - Generic assignments: `(api[_-]?key|secret|token|passwd|password|client[_-]?secret|auth)\s*[:=]\s*['"][^'"]{8,}`
   - Connection strings with credentials: `[a-z]+://[^/\s:@]+:[^/\s@]+@`
   - JWTs: `eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.`
3. **Sensitive files** present or ever committed: `.env*` (except `.env.example`), `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa*`, `*.kdbx`, `credentials*`, `*.sqlite`/`*.db`, `.npmrc`/`.pypirc` with tokens, `*.log`, OS/editor junk (`.DS_Store`, `Thumbs.db`), and any file over 5 MB.
4. **Personal data / internal info**: real-looking email addresses, phone numbers, internal hostnames or IPs (`10.`, `172.16–31.`, `192.168.`), absolute local paths with usernames (`/Users/<name>`, `C:\Users\<name>`).
   - Placeholders such as `YOUR_EMAIL@example.com` and `noreply@anthropic.com` in commit trailers are fine.
   - **Project-specific:** check `FORMSUBMIT_ENDPOINT` in `index.html`. A real recipient address there will be public on GitHub and on the Pages site (and can be spammed). Flag it and ask the user whether to publish it or swap in the placeholder.
5. **Project rules from `CLAUDE.md`** (if present), e.g. for this repo: no network calls other than FormSubmit (`fetch(`, `XMLHttpRequest`, `navigator.sendBeacon`, `<script src=`, `<link href=http`, `@import url(` pointing anywhere else), no external CDN/fonts/images, no `localStorage`/`sessionStorage`/`indexedDB`/`document.cookie`, no real bank logos or trademarks. Report violations.
6. **Code hygiene for a public web page**: `eval(`, `new Function(`, `innerHTML` built from user input without the project's `escapeHtml()`, `target="_blank"` without `rel="noopener"`.

Then report a table: **severity (BLOCKER / WARNING / INFO), file:line, finding, suggested fix**. Redact secret values (show at most the first 4 characters).

Gate rules:

- **Any BLOCKER (a credential, private key, or secret in history) → STOP.** Do not push, do not create the repo, do not call any GitHub API that uploads content. Explain how to fix it (remove the file, rotate the credential, and for history use `git filter-repo` or BFG), and wait for the user. Never rewrite history yourself without explicit approval.
- **WARNINGs** (e.g. a real email, a CLAUDE.md rule violation) → list them and ask the user to confirm or fix before continuing.
- **Nothing found** → say "Security scan passed" with what was scanned and which tools ran, then continue.
- Add or update `.gitignore` for anything sensitive you found that should never be committed (`.env`, `*.pem`, `.DS_Store`, etc.).

## 2. README.md (create or update)

Read the existing `README.md`, `CLAUDE.md` and the main source files to understand the project. Then create or improve `README.md`, **preserving any hand-written content the user already has** (edit sections rather than replacing the file wholesale). Include:

- Title and a one-paragraph description of what the project is (for this repo: a demo IT PMO Kanban board for a fictitious bank, used for training; single `index.html`, vanilla HTML/CSS/JS, no build).
- **Live demo** link: `https://OWNER.github.io/REPO/` (lowercase owner).
- Features list.
- How to run locally (double-click `index.html`, or `python3 -m http.server` to test FormSubmit).
- Configuration (e.g. `FORMSUBMIT_ENDPOINT` and the one-time FormSubmit activation).
- Notes/limitations (e.g. no persistence by design; refresh resets the board).
- Deployment section pointing at the Pages workflow.
- A disclaimer if the project is a demo for a fictitious organisation.

Do not put secrets, real personal emails or internal URLs in the README.

## 2a. Screenshot for the README

Capture a fresh screenshot of the running site and embed it in the README, so the image always matches what is being published.

1. Load the app with the **Playwright MCP tools** (project `.mcp.json` registers the `playwright` server): `browser_navigate` to `file://<repo>/index.html` (or the live Pages URL on later runs), `browser_resize` to 1440x900, then `browser_take_screenshot` saving to `docs/screenshot.png`. If the Playwright MCP tools are not available in this session, fall back to a headless Playwright script (`NODE_PATH=$(npm root -g) node script.js`, `page.route('https://formsubmit.co/**', r => r.abort())` so no real email is sent).
2. View the image and check it shows the board correctly (no error toasts, no open modal, no real email addresses visible).
3. Make sure the README has `![<project> screenshot](docs/screenshot.png)` near the top (just before the Features section). Replace the existing image line rather than adding a second one.
4. `docs/screenshot.png` is committed in step 4. It is not copied into `_site`, because the README is rendered by GitHub, not by Pages.

## 3. GitHub Pages workflow (create or update)

Create or update `.github/workflows/pages.yml`. If one already exists, update it in place and keep any custom steps the user added. Use the official Pages actions and **publish only the site files**, not repo internals like `CLAUDE.md`, `.claude/` or `.github/`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [BRANCH]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Assemble site
        run: |
          mkdir -p _site
          cp index.html _site/
          touch _site/.nojekyll
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site
      - id: deployment
        uses: actions/deploy-pages@v4
```

Replace `BRANCH` with the target branch. If the project has more static assets than `index.html`, copy those into `_site` as well (explicit list, never `cp -r .`).

## 4. Commit and push

1. Show the user `git status` and a short summary of the diff you are about to commit.
2. Commit the README, `docs/screenshot.png`, workflow and `.gitignore` changes with a clear message (e.g. `Add README, GitHub Pages workflow and .gitignore`).
3. If the repo does not exist, create it: `gh repo create OWNER/REPO --public|--private --source . --remote origin` (don't use `--push` yet). Confirm with the user before creating a **public** repository.
4. Set the remote: if `origin` is missing add it; if it points elsewhere, ask before changing it (or add a new remote named `github`).
5. Push: `git push -u origin HEAD:BRANCH`. On a network error retry up to 4 times with backoff (2s, 4s, 8s, 16s).
6. **Never force-push** unless the user explicitly asks. If the push is rejected because the remote has commits you don't have, fetch, show the user what differs, and merge (don't rebase shared history) only with their OK.

## 5. Repository "About" (description, website, topics)

Using `gh` (or the MCP equivalent):

```bash
gh repo edit OWNER/REPO \
  --description "<one line, under 350 chars>" \
  --homepage "https://OWNER.github.io/REPO/" \
  --add-topic <topic> --add-topic <topic>
```

- Use the description/topics from `$ARGUMENTS` if given; otherwise draft them from the README (e.g. `kanban`, `vanilla-js`, `html`, `pmo`, `demo`, `github-pages`) and show them to the user.
- Topics must be lowercase, hyphenated, max 50 characters, max 20 topics.
- Keep existing topics; only add.

## 6. Enable and verify GitHub Pages

1. Make sure Pages is set to build from **GitHub Actions**:
   - Check: `gh api repos/OWNER/REPO/pages` (404 means not enabled).
   - Enable: `gh api -X POST repos/OWNER/REPO/pages -f build_type=workflow`
   - Or switch an existing site: `gh api -X PUT repos/OWNER/REPO/pages -f build_type=workflow`
   - Pages on a **private** repo needs a paid plan; if the API refuses, tell the user.
2. Trigger or watch the run: `gh run list --workflow pages.yml --limit 1`, then `gh run watch <id> --exit-status` (or `gh workflow run pages.yml --ref BRANCH` if nothing started).
3. On failure, read the logs (`gh run view <id> --log-failed`), fix the cause, and push again.
4. When it succeeds, fetch the live URL (`curl -sI https://OWNER.github.io/REPO/`) and confirm a 200. It can take a minute or two to appear.

## 7. Report back

Finish with a short summary:

- Security scan result (tools used, findings and how each was resolved).
- Repo URL, branch pushed, and commit SHA.
- What changed in the README and the About box.
- Pages workflow status and the live site URL.
- Any step you could not do (for example no `gh` login) with the exact command or GitHub settings page the user should use to finish it, e.g. **Settings → Pages → Source: GitHub Actions**.
