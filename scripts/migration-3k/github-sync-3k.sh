#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ADMIN_ROOT="$(cd "$ROOT/../admin-hub-central" && pwd)"

if [[ -z "${GH_TOKEN_3K:-}" ]]; then
  echo "ERROR: export GH_TOKEN_3K (PAT compte 3K-Negoce, droits repo + création sur org)." >&2
  exit 1
fi

sync_repo() {
  local name="$1"
  local dir="$2"
  local org_repo="https://${GH_TOKEN_3K}@github.com/3K-Negoce-Organisation/${name}.git"
  echo "==> ${name}: push main -> org"
  cd "$dir"
  git remote remove org3k 2>/dev/null || true
  git remote add org3k "$org_repo"
  git push org3k main
}

sync_repo "fixa-pro-hub" "$ROOT"

if [[ ! -d "$ADMIN_ROOT/.git" ]]; then
  echo "ERROR: admin-hub-central absent: $ADMIN_ROOT" >&2
  exit 1
fi

if gh repo view 3K-Negoce-Organisation/admin-hub-central &>/dev/null; then
  sync_repo "admin-hub-central" "$ADMIN_ROOT"
else
  echo "==> Création admin-hub-central sur l'org (besoin droit CreateRepository)..."
  export GH_TOKEN="$GH_TOKEN_3K"
  cd "$ADMIN_ROOT"
  git remote remove org3k 2>/dev/null || true
  gh repo create 3K-Negoce-Organisation/admin-hub-central --private --source=. --remote=org3k --push
fi

echo "OK. Pensez à retirer le remote org3k ou à remplacer l URL par une URL sans token."
