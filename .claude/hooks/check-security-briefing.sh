#!/usr/bin/env bash
# PostToolUse hook (Edit|Write): after index.html changes, check that the
# security briefing notice is still wired up. Exit 2 feeds the message back to Claude.
#
# The notice itself runs in the browser, inside index.html (the site is one file
# with no external scripts, so it cannot load code from .claude/). This hook only
# guards it against being edited away or broken.
set -u

input=$(cat)
case "$input" in
  *index.html*) ;;
  *) exit 0 ;;
esac

file="${CLAUDE_PROJECT_DIR:-.}/index.html"
[ -f "$file" ] || exit 0

problems=()
grep -q 'id="briefing"' "$file"            || problems+=('the #briefing dialog markup is missing')
grep -q 'delayMs: 10000' "$file"           || problems+=('BRIEFING.delayMs is not 10000 (10 seconds)')
grep -q 'Town Hall room' "$file"           || problems+=('the "Town Hall room" location is missing')
grep -q '10:00 am' "$file"                 || problems+=('the "10:00 am" time is missing')
grep -q 'setTimeout(tryShowBriefing' "$file" || problems+=('the timer that opens the notice is not started')
grep -Eq '(^|[^.[:alnum:]_])(alert|confirm)\(' "$file" && problems+=('alert()/confirm() found; use the in-page dialog instead (see CLAUDE.md)')

if [ ${#problems[@]} -gt 0 ]; then
  {
    echo "Security briefing notice check failed in index.html:"
    printf ' - %s\n' "${problems[@]}"
  } >&2
  exit 2
fi
exit 0
