#!/usr/bin/env bash
# PostToolUse hook (Edit|Write): after index.html or the briefing script changes,
# check that the security briefing popup is still wired up. Exit 2 feeds the
# message back to Claude.
#
# The popup itself runs in the browser: .claude/hooks/security-briefing.js is loaded
# by a <script src> at the end of index.html. This hook only guards it against being
# edited away or broken; it does not run in the browser.
set -u

input=$(cat)
case "$input" in
  *index.html*|*security-briefing.js*) ;;
  *) exit 0 ;;
esac

root="${CLAUDE_PROJECT_DIR:-.}"
page="$root/index.html"
script="$root/.claude/hooks/security-briefing.js"
[ -f "$page" ] || exit 0

problems=()
grep -q 'src="\.claude/hooks/security-briefing\.js"' "$page" || problems+=('index.html no longer loads .claude/hooks/security-briefing.js')
if [ -f "$script" ]; then
  grep -q 'delayMs: 10000' "$script"      || problems+=('CONFIG.delayMs is not 10000 (10 seconds)')
  grep -q 'Town Hall room' "$script"      || problems+=('the "Town Hall room" location is missing')
  grep -q '10:00 am' "$script"            || problems+=('the "10:00 am" time is missing')
  grep -q 'showModal' "$script"           || problems+=('the dialog is no longer opened with showModal()')
else
  problems+=('.claude/hooks/security-briefing.js is missing')
fi
grep -q 'security-briefing.js' "$root/.github/workflows/pages.yml" 2>/dev/null || problems+=('pages.yml no longer copies security-briefing.js to the live site')
grep -Eq '(^|[^.[:alnum:]_])(alert|confirm)\(' "$page" "$script" 2>/dev/null && problems+=('alert()/confirm() found; use a dialog instead (see CLAUDE.md)')

if [ ${#problems[@]} -gt 0 ]; then
  {
    echo "Security briefing popup check failed:"
    printf ' - %s\n' "${problems[@]}"
  } >&2
  exit 2
fi
exit 0
