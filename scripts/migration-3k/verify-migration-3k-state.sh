#!/usr/bin/env bash
# Vérifie l’état Supabase (3 projets vs branching) et optionnellement Railway (token requis).
# Usage : depuis la racine fixa-pro-hub, avec CLI supabase connectée au compte 3K :
#   ./scripts/migration-3k/verify-migration-3k-state.sh
# Railway (optionnel) :
#   export RAILWAY_TOKEN_3K='...'
#   ./scripts/migration-3k/verify-migration-3k-state.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROD_REF="lqsbsinycyewdvdtbruy"

echo "========== Supabase : 3 projets (données / VITE / edge) =========="
echo "Références attendues (SUPABASE_3K_REFS.txt) :"
echo "  develop    xgqwnpibxakvhbzirfxb"
echo "  staging    gcyxfuxywratoyjnxurf"
echo "  production lqsbsinycyewdvdtbruy"
echo ""
echo "========== Supabase : branching sur projet production uniquement =========="
echo "Commande : supabase branches list --project-ref $PROD_REF"
echo ""
if command -v supabase >/dev/null 2>&1; then
  supabase branches list --project-ref "$PROD_REF" -o pretty || echo "(échec : vérifier login / token 3K)" >&2
else
  echo "supabase CLI absent." >&2
fi
echo ""
echo "Rappel : les bases des preview branches (develop/staging sous prod) ≠ les 3 projets ci-dessus."
echo "Voir SUPABASE_BRANCHING_3K.txt pour le choix de modèle."
echo ""

if [[ -n "${RAILWAY_TOKEN_3K:-${RAILWAY_TOKEN:-}}" ]]; then
  echo "========== Railway : projets visibles avec le token =========="
  "$SCRIPT_DIR/resolve-railway-workspace-3k.sh" || true
else
  echo "========== Railway : (skip) export RAILWAY_TOKEN_3K pour lister les projets =========="
  echo "Puis : ./scripts/migration-3k/resolve-railway-workspace-3k.sh"
fi

echo ""
echo "========== Variables VITE pour Railway =========="
GEN="$SCRIPT_DIR/.generated"
if [[ -f "$GEN/railway-vite-env.txt" ]]; then
  echo "Fichier existant : $GEN/railway-vite-env.txt"
  echo "Pour régénérer : ./scripts/migration-3k/generate-railway-vite-env-3k.sh"
else
  echo "Pas encore généré. Lancer : ./scripts/migration-3k/generate-railway-vite-env-3k.sh"
fi
