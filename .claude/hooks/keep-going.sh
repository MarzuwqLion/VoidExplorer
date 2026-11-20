#!/bin/bash
# Sends Claude Code back to work while PLAN.md has unticked milestones.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -f PLAN.md ] || exit 0
count_file=".claude/keep-going.count"
n=$(cat "$count_file" 2>/dev/null || echo 0)
if grep -qE '^- \[ \] M[0-9]+' PLAN.md && [ "$n" -lt 40 ]; then
  echo $((n + 1)) > "$count_file"
  echo "PLAN.md still has unticked milestones. Do not stop. Re-read PLAN.md, continue from Next up, and keep going until the M11 gate passes." >&2
  exit 2
fi
exit 0