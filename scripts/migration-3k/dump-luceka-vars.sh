#!/usr/bin/env bash
# Exporte les variables Railway du projet luceka (compte perso) en JSON local.
# Sortie : scripts/migration-3k/.railway-dump/  (gitignored — contient des secrets)
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/.railway-dump"
mkdir -p "$OUT"

# Projet luceka (workspace pimimac's Projects)
dump() {
  local env="$1"
  local svc_id="$2"
  local svc_name="$3"
  local safe
  safe=$(echo "$svc_name" | tr '/.' '__')
  local f="$OUT/${env}__${safe}.json"
  echo "-> $f"
  railway variable list -s "$svc_id" -e "$env" --json >"$f"
}

# develop
dump develop 34f4e4a0-b63c-45ea-849c-9b5dc7667764 admin-hub-central_develop
dump develop 4a22d286-8b16-4d03-a71d-80c5e1f16b7e Postgres
dump develop 68ad7372-b2ee-4af8-ab2a-0e7e8b3ebbbf n8n_production
dump develop ee3e8013-d5b2-497c-9e73-6e84b1d0c10e vis-a-bois.com_develop

# staging
dump staging 6d0642ee-dc87-43ef-ad43-3dd7be4d8dd8 admin-hub-central_staging
dump staging 4a22d286-8b16-4d03-a71d-80c5e1f16b7e Postgres
dump staging 68ad7372-b2ee-4af8-ab2a-0e7e8b3ebbbf n8n_production
dump staging 6467d394-dba2-40a8-91a4-30048dc74941 vis-a-bois.com_staging

# production (nom d'environnement Railway tel qu'affiché dans list --json)
dump "production www.vis-a-bois.com" 3abb9c7c-48a4-45e5-80c6-c89ea709eb61 admin-hub-central_prod
dump "production www.vis-a-bois.com" 4a22d286-8b16-4d03-a71d-80c5e1f16b7e Postgres
dump "production www.vis-a-bois.com" 68ad7372-b2ee-4af8-ab2a-0e7e8b3ebbbf n8n_production
dump "production www.vis-a-bois.com" c97bd321-f867-4236-8317-a4f3c45829e5 vis-a-bois.com_prod

echo "OK. Fichiers dans $OUT (ne jamais committer)."
