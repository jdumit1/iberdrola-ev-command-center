#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Running secret scan on tracked and untracked (non-ignored) files..."

patterns=(
  'AIza[0-9A-Za-z_-]{20,}'
  'sk-[A-Za-z0-9]{20,}'
  'ghp_[A-Za-z0-9]{20,}'
  'xox[baprs]-[A-Za-z0-9-]{10,}'
)

status=0
files=()
while IFS= read -r -d '' file; do
  files+=("$file")
done < <(git ls-files -co --exclude-standard -z)

if [[ ${#files[@]} -eq 0 ]]; then
  echo "No files to scan."
  exit 0
fi

for pattern in "${patterns[@]}"; do
  if printf '%s\0' "${files[@]}" | xargs -0 grep -InE --binary-files=without-match \
    --exclude-dir=node_modules \
    --exclude-dir=dist \
    --exclude-dir=.venv \
    --exclude-dir=.git \
    --exclude='package-lock.json' \
    --exclude='*.pdf' \
    --exclude='*.png' \
    --exclude='*.jpg' \
    --exclude='*.jpeg' \
    --exclude='*.gif' \
    --exclude='*.webp' \
    "$pattern"; then
    echo "Potential secret matched pattern: $pattern"
    status=1
  fi
done

if [[ $status -ne 0 ]]; then
  echo "Secret scan failed. Remove or rotate exposed keys before pushing."
  exit 1
fi

echo "No secret patterns detected."
