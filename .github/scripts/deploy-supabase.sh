#!/usr/bin/env bash
# Déploiement Supabase production — migrations + Edge Functions (delta).
# Aucune donnée personnelle dans les logs. Pas de clé service_role sur la VM.
set -euo pipefail

PROJECT_REF="${PROJECT_REF:-lqsbsinycyewdvdtbruy}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

require_token() {
  if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
    echo "Secret SUPABASE_ACCESS_TOKEN manquant." >&2
    exit 1
  fi
}

changed_files() {
  local before="${GITHUB_EVENT_BEFORE:-}"
  local after="${GITHUB_SHA:-HEAD}"
  if [[ -z "$before" || "$before" =~ ^0+$ ]]; then
    if git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
      before="$(git rev-parse HEAD~1)"
    else
      before="$(git hash-object -t tree /dev/null)"
    fi
  fi
  git diff --name-only "$before" "$after" -- supabase/ || true
}

detect() {
  local files migrations=() functions=() shared=0
  mapfile -t files < <(changed_files)

  if [[ "${FORCE_ALL_FUNCTIONS:-false}" == "true" ]]; then
    shared=1
  fi

  local f base
  for f in "${files[@]:-}"; do
    [[ -z "$f" ]] && continue
    if [[ "$f" == supabase/migrations/*.sql ]]; then
      migrations+=("$f")
    elif [[ "$f" == supabase/functions/_shared/* ]]; then
      shared=1
    elif [[ "$f" == supabase/functions/*/index.ts || "$f" == supabase/functions/*/* ]]; then
      base="${f#supabase/functions/}"
      base="${base%%/*}"
      if [[ -n "$base" && "$base" != "_shared" && -d "supabase/functions/$base" ]]; then
        functions+=("$base")
      fi
    fi
  done

  if [[ "$shared" -eq 1 ]]; then
    functions=()
    for d in supabase/functions/*/; do
      base="$(basename "$d")"
      [[ "$base" == "_shared" ]] && continue
      [[ -f "supabase/functions/$base/index.ts" ]] || continue
      functions+=("$base")
    done
  fi

  local mig_out fn_out
  if [[ ${#migrations[@]} -gt 0 ]]; then
    mig_out="$(printf '%s\n' "${migrations[@]}" | sort -u | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
  else
    mig_out=""
  fi
  if [[ ${#functions[@]} -gt 0 ]]; then
    fn_out="$(printf '%s\n' "${functions[@]}" | sort -u | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
  else
    fn_out=""
  fi

  echo "migrations=$mig_out" >> "$GITHUB_OUTPUT"
  echo "functions=$fn_out" >> "$GITHUB_OUTPUT"
  echo "Detected migrations: ${mig_out:-none}"
  echo "Detected functions: ${fn_out:-none}"
}

apply_migrations() {
  require_token
  local list="${MIGRATIONS:-}"
  if [[ -f /tmp/deploy-migrations.txt ]]; then
    list="$(tr '\n' ' ' </tmp/deploy-migrations.txt)"
  fi
  if [[ -z "${list// /}" ]]; then
    echo "Aucune migration à appliquer."
    return 0
  fi

  local file
  # shellcheck disable=SC2086
  for file in $list; do
    if [[ ! -f "$file" ]]; then
      echo "Fichier introuvable: $file" >&2
      exit 1
    fi
    echo "Applying $(basename "$file")…"
    PROJECT_REF="$PROJECT_REF" SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" \
      SQL_FILE="$file" python3 - <<'PY'
import json, os, sys, urllib.error, urllib.request
path = os.environ["SQL_FILE"]
ref = os.environ["PROJECT_REF"]
token = os.environ["SUPABASE_ACCESS_TOKEN"]
sql = open(path, encoding="utf-8").read()
req = urllib.request.Request(
    f"https://api.supabase.com/v1/projects/{ref}/database/query",
    data=json.dumps({"query": sql}).encode(),
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    },
    method="POST",
)
try:
    with urllib.request.urlopen(req) as res:
        print(f"OK HTTP {res.status} — {os.path.basename(path)}")
except urllib.error.HTTPError as e:
    print(e.read().decode()[:3000], file=sys.stderr)
    sys.exit(1)
PY
  done
  echo "✓ Migrations appliquées"
}

# Fonctions présentes aussi dans le dépôt KPMC, qui les déploie sur le MÊME projet.
# Les déployer d'ici écraserait la version KPMC (le dernier déploiement gagne).
KPMC_OWNED_FUNCTIONS=(admin-persist-customer-invoices download-customer-invoice simulate-order-webhook)

is_kpmc_owned() {
  local candidate="$1" owned
  for owned in "${KPMC_OWNED_FUNCTIONS[@]}"; do
    [[ "$candidate" == "$owned" ]] && return 0
  done
  return 1
}

deploy_functions() {
  require_token
  local list="${FUNCTIONS:-}"
  if [[ -f /tmp/deploy-functions.txt ]]; then
    list="$(tr '\n' ' ' </tmp/deploy-functions.txt)"
  fi
  if [[ "${FORCE_ALL_FUNCTIONS:-false}" == "true" ]]; then
    list=""
    local d base
    for d in supabase/functions/*/; do
      base="$(basename "$d")"
      [[ "$base" == "_shared" ]] && continue
      [[ -f "supabase/functions/$base/index.ts" ]] || continue
      list+="$base "
    done
  fi
  if [[ -z "${list// /}" ]]; then
    echo "Aucune Edge Function à déployer."
    return 0
  fi

  # Pas de `supabase link` (évite project_admin_read). --project-ref + --use-api.
  local name
  # shellcheck disable=SC2086
  for name in $list; do
    if is_kpmc_owned "$name"; then
      echo "Skip $name — fonction déployée par le dépôt KPMC (même projet Supabase)."
      continue
    fi
    echo "Deploy $name…"
    # verify_jwt plateforme incompatible avec sb_secret_ / sb_publishable_ seuls :
    # auth faite dans le handler (voir _shared/supabaseApiKeys.ts).
    supabase functions deploy "$name" --no-verify-jwt --project-ref "$PROJECT_REF" --use-api
  done
  echo "✓ Edge Functions déployées"
}

cmd="${1:-}"
case "$cmd" in
  detect) detect ;;
  apply-migrations)
    if [[ -n "${MIGRATIONS:-}" ]]; then
      echo "$MIGRATIONS" | tr ' ' '\n' | grep -v '^$' >/tmp/deploy-migrations.txt || true
    fi
    apply_migrations
    ;;
  deploy-functions)
    if [[ -n "${FUNCTIONS:-}" ]]; then
      echo "$FUNCTIONS" | tr ' ' '\n' | grep -v '^$' >/tmp/deploy-functions.txt || true
    fi
    deploy_functions
    ;;
  *)
    echo "Usage: $0 detect|apply-migrations|deploy-functions" >&2
    exit 2
    ;;
esac
