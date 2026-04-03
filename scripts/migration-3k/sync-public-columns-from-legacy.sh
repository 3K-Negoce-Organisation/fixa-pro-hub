#!/usr/bin/env bash
# Ajoute sur la base CIBLE les colonnes manquantes par rapport à la base LEGACY (même types pg).
# Compatible bash 3.2 (macOS). Usage :
#   ./sync-public-columns-from-legacy.sh <develop|staging|production>
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GEN="$SCRIPT_DIR/.generated"
REFS_ENV="$GEN/supabase-refs.env"
LEGACY_PW_ENV="$GEN/legacy-db.passwords.env"

LABEL="${1:?Usage: $0 develop|staging|production}"

LEGACY_DEVELOP="ojtrsrdcaugyzvtqtupf"
LEGACY_STAGING="giguuzfnjkkqdeteujwc"
LEGACY_PRODUCTION="aueuxlqtueoqjxsdemeu"

# shellcheck source=/dev/null
source "$REFS_ENV"
# shellcheck source=/dev/null
source "$LEGACY_PW_ENV"

case "$LABEL" in
  develop)
    LEGACY_REF="$LEGACY_DEVELOP"
    LEGACY_PW="$LEGACY_DB_PASSWORD_DEVELOP"
    NEW_REF="$SUPABASE_REF_DEVELOP"
    ;;
  staging)
    LEGACY_REF="$LEGACY_STAGING"
    LEGACY_PW="$LEGACY_DB_PASSWORD_STAGING"
    NEW_REF="$SUPABASE_REF_STAGING"
    ;;
  production)
    LEGACY_REF="$LEGACY_PRODUCTION"
    LEGACY_PW="$LEGACY_DB_PASSWORD_PRODUCTION"
    NEW_REF="$SUPABASE_REF_PRODUCTION"
    ;;
  *) echo "develop|staging|production seulement" >&2; exit 1 ;;
esac

LEGACY_HOST="db.${LEGACY_REF}.supabase.co"
NEW_HOST="db.${NEW_REF}.supabase.co"

cols_sql() {
  local host="$1" pw="$2"
  PGPASSWORD="$pw" psql -h "$host" -U postgres -d postgres -tAc "
SELECT c.relname || chr(9) || a.attname || chr(9) || pg_catalog.format_type(a.atttypid, a.atttypmod)
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
WHERE c.relkind = 'r'
ORDER BY c.relname, a.attnum;
"
}

echo "=== Colonnes legacy → $NEW_REF ($LABEL) ==="
TMP_NEW="$(mktemp)"
TMP_LEGACY="$(mktemp)"
TMP_KEY_NEW="$(mktemp)"
TMP_KEY_LEG="$(mktemp)"
TMP_ALT="$(mktemp)"
trap 'rm -f "$TMP_NEW" "$TMP_LEGACY" "$TMP_KEY_NEW" "$TMP_KEY_LEG" "$TMP_ALT"' EXIT

cols_sql "$NEW_HOST" "$SUPABASE_DB_PASSWORD" >"$TMP_NEW"
cols_sql "$LEGACY_HOST" "$LEGACY_PW" >"$TMP_LEGACY"

awk -F'\t' '{print $1 FS $2}' "$TMP_NEW" | sort -u >"$TMP_KEY_NEW"
awk -F'\t' '{print $1 FS $2}' "$TMP_LEGACY" | sort -u >"$TMP_KEY_LEG"

: >"$TMP_ALT"
while IFS=$'\t' read -r tbl col; do
  [[ -z "$tbl" ]] && continue
  typ="$(awk -F'\t' -v t="$tbl" -v c="$col" '$1==t && $2==c {print $3; exit}' "$TMP_LEGACY")"
  [[ -z "$typ" ]] && continue
  echo "ALTER TABLE public.${tbl} ADD COLUMN IF NOT EXISTS ${col} ${typ};" >>"$TMP_ALT"
done < <(comm -23 "$TMP_KEY_LEG" "$TMP_KEY_NEW")

if [[ -s "$TMP_ALT" ]]; then
  wc -l "$TMP_ALT" | awk '{print "ALTER statements:", $1}'
  PGPASSWORD="$SUPABASE_DB_PASSWORD" psql -h "$NEW_HOST" -U postgres -d postgres -v ON_ERROR_STOP=1 -f "$TMP_ALT"
else
  echo "(aucune colonne manquante)"
fi

echo "OK sync colonnes $LABEL"
