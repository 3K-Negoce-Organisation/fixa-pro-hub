#!/usr/bin/env bash
# Crée les services Railway (storefront GitHub, admin GitHub, n8n Docker, Postgres Docker)
# dans CHAQUE environnement du projet 3k-Negoce (develop / staging / production).
#
# Prérequis : token workspace ou compte avec accès au projet.
#   export RAILWAY_TOKEN_3K='...'
#   export RAILWAY_PROJECT_ID_3K='7e8dc729-5d6f-4558-acc4-1c683169493d'   # optionnel si resolve ci-dessous
#
# Usage :
#   ./scripts/migration-3k/create-railway-services-3k.sh [--dry-run] [--only production|staging|develop]
#
# Connexion GitHub : le compte Railway doit avoir accès aux dépôts org (3K-Negoce-Organisation).
# Branches : par défaut main pour les trois envs ; surcharger avec
#   RAILWAY_GIT_BRANCH_DEVELOP, RAILWAY_GIT_BRANCH_STAGING, RAILWAY_GIT_BRANCH_PRODUCTION
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
END="${RAILWAY_GRAPHQL_ENDPOINT:-https://backboard.railway.com/graphql/v2}"

TOKEN="${RAILWAY_TOKEN_3K:-${RAILWAY_TOKEN:-}}"
DRY_RUN=false
ONLY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --only)
      ONLY="${2:?}"
      shift 2
      ;;
    *)
      echo "Argument inconnu: $1" >&2
      exit 1
      ;;
  esac
done

[[ -n "$TOKEN" ]] || { echo "Définir RAILWAY_TOKEN_3K" >&2; exit 1; }

command -v jq >/dev/null || { echo "jq requis" >&2; exit 1; }

PROJECT_ID="${RAILWAY_PROJECT_ID_3K:-}"
if [[ -z "$PROJECT_ID" ]]; then
  echo "Résolution du projet (RAILWAY_PROJECT_ID_3K non défini)…" >&2
  PROJECT_ID="$("$SCRIPT_DIR/resolve-railway-workspace-3k.sh" 2>/dev/null | sed -n "s/^export RAILWAY_PROJECT_ID_3K='\(.*\)'$/\1/p" | head -1)"
fi
[[ -n "$PROJECT_ID" ]] || { echo "Définir RAILWAY_PROJECT_ID_3K ou lancer resolve-railway-workspace-3k.sh" >&2; exit 1; }

STORE_REPO="${RAILWAY_GITHUB_REPO_STORE:-3K-Negoce-Organisation/fixa-pro-hub}"
ADMIN_REPO="${RAILWAY_GITHUB_REPO_ADMIN:-3K-Negoce-Organisation/admin-hub-central}"
BR_DEVELOP="${RAILWAY_GIT_BRANCH_DEVELOP:-main}"
BR_STAGING="${RAILWAY_GIT_BRANCH_STAGING:-main}"
BR_PRODUCTION="${RAILWAY_GIT_BRANCH_PRODUCTION:-main}"

gql() {
  local payload="$1"
  curl -sS -X POST "$END" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

env_id_for() {
  local key="$1"
  local resp="$2"
  case "$key" in
    production)
      echo "$resp" | jq -r '.data.environments.edges[].node | select((.name|ascii_downcase) == "production") | .id' | head -1
      ;;
    staging)
      echo "$resp" | jq -r '.data.environments.edges[].node | select((.name|ascii_downcase) == "staging") | .id' | head -1
      ;;
    develop)
      echo "$resp" | jq -r '.data.environments.edges[].node | select((.name|ascii_downcase) == "develop" or (.name|ascii_downcase) == "development") | .id' | head -1
      ;;
    *)
      echo ""
      ;;
  esac
}

branch_for() {
  case "$1" in
    production) echo "$BR_PRODUCTION" ;;
    staging) echo "$BR_STAGING" ;;
    develop) echo "$BR_DEVELOP" ;;
    *) echo "main" ;;
  esac
}

echo "=== Projet $PROJECT_ID — liste des environnements ==="
ENV_JSON="$(gql "$(jq -nc --arg pid "$PROJECT_ID" '{query: "query ($pid: String!) { environments(projectId: $pid, first: 50) { edges { node { id name } } } }", variables: {pid: $pid}}')")"
if echo "$ENV_JSON" | jq -e '.errors' >/dev/null 2>&1; then
  echo "$ENV_JSON" | jq . >&2
  exit 1
fi
echo "$ENV_JSON" | jq -r '.data.environments.edges[] | "  \(.node.name)  \(.node.id)"'

existing_services() {
  gql "$(jq -nc --arg pid "$PROJECT_ID" '{query: "query ($id: String!) { project(id: $id) { services(first: 200) { edges { node { id name } } } } }", variables: {id: $pid}}')" \
    | jq -r '.data.project.services.edges[].node.name' | sort -u
}

EX_NAMES="$(existing_services || true)"
echo ""
echo "=== Services existants (noms, projet entier) ==="
if [[ -z "$EX_NAMES" ]]; then
  echo "  (aucun)"
else
  echo "$EX_NAMES" | sed 's/^/  /'
fi

create_empty_service() {
  local env_id="$1" name="$2"
  gql "$(jq -nc \
    --arg pid "$PROJECT_ID" \
    --arg eid "$env_id" \
    --arg n "$name" \
    '{query: "mutation ($in: ServiceCreateInput!) { serviceCreate(input: $in) { id name } }", variables: {in: {projectId: $pid, environmentId: $eid, name: $n}}}')"
}

connect_repo() {
  local sid="$1" repo="$2" branch="$3"
  gql "$(jq -nc \
    --arg id "$sid" \
    --arg r "$repo" \
    --arg b "$branch" \
    '{query: "mutation ($id: String!, $in: ServiceConnectInput!) { serviceConnect(id: $id, input: $in) { id name } }", variables: {id: $id, in: {repo: $r, branch: $b}}}')"
}

create_docker_service() {
  local env_id="$1" name="$2" image="$3"
  gql "$(jq -nc \
    --arg pid "$PROJECT_ID" \
    --arg eid "$env_id" \
    --arg n "$name" \
    --arg img "$image" \
    '{query: "mutation ($in: ServiceCreateInput!) { serviceCreate(input: $in) { id name } }", variables: {in: {projectId: $pid, environmentId: $eid, name: $n, source: {image: $img}}}}')"
}

ensure_github_pair() {
  local env_key="$1" env_id="$2" suffix="$3" repo="$4" display="$5"
  local branch sname resp sid
  branch="$(branch_for "$env_key")"
  sname="${display}-${suffix}"
  if echo "$EX_NAMES" | grep -qx "$sname"; then
    echo "Skip (existe) : $sname"
    return 0
  fi
  if $DRY_RUN; then
    echo "DRY-RUN: serviceCreate+connect $sname repo=$repo branch=$branch env=$env_key"
    return 0
  fi
  echo "Création $sname (GitHub $repo @ $branch)…"
  resp="$(create_empty_service "$env_id" "$sname")"
  if echo "$resp" | jq -e '.errors' >/dev/null 2>&1; then
    echo "$resp" | jq . >&2
    exit 1
  fi
  sid="$(echo "$resp" | jq -r '.data.serviceCreate.id')"
  resp2="$(connect_repo "$sid" "$repo" "$branch")"
  if echo "$resp2" | jq -e '.errors' >/dev/null 2>&1; then
    echo "$resp2" | jq . >&2
    exit 1
  fi
  echo "  OK $sname → $sid"
  EX_NAMES=$(printf '%s\n%s\n' "$EX_NAMES" "$sname" | sort -u)
}

ensure_docker() {
  local env_key="$1" env_id="$2" suffix="$3" image="$4" display="$5"
  local sname resp
  sname="${display}-${suffix}"
  if echo "$EX_NAMES" | grep -qx "$sname"; then
    echo "Skip (existe) : $sname"
    return 0
  fi
  if $DRY_RUN; then
    echo "DRY-RUN: serviceCreate $sname image=$image env=$env_key"
    return 0
  fi
  echo "Création $sname ($image)…"
  resp="$(create_docker_service "$env_id" "$sname" "$image")"
  if echo "$resp" | jq -e '.errors' >/dev/null 2>&1; then
    echo "$resp" | jq . >&2
    exit 1
  fi
  echo "  OK $sname → $(echo "$resp" | jq -r '.data.serviceCreate.id')"
  EX_NAMES=$(printf '%s\n%s\n' "$EX_NAMES" "$sname" | sort -u)
}

if [[ -n "$ONLY" && "$ONLY" != "production" && "$ONLY" != "staging" && "$ONLY" != "develop" ]]; then
  echo "--only doit être production, staging ou develop" >&2
  exit 1
fi

for KEY in production staging develop; do
  [[ -z "$ONLY" || "$ONLY" == "$KEY" ]] || continue
  EID="$(env_id_for "$KEY" "$ENV_JSON")"
  if [[ -z "$EID" ]]; then
    echo "Avertissement : environnement « $KEY » introuvable (nom exact production / staging / develop|development). Skip." >&2
    continue
  fi
  SUF="$KEY"
  echo ""
  echo "========== Environnement $KEY ($EID) =========="
  ensure_github_pair "$KEY" "$EID" "$SUF" "$STORE_REPO" "vis-a-bois"
  ensure_github_pair "$KEY" "$EID" "$SUF" "$ADMIN_REPO" "admin-hub"
  ensure_docker "$KEY" "$EID" "$SUF" "docker.io/n8nio/n8n:latest" "n8n"
  ensure_docker "$KEY" "$EID" "$SUF" "docker.io/postgres:16-alpine" "postgres"
done

echo ""
echo "Terminé. Prochaines étapes :"
echo "  - Variables par service / env (VITE, DATABASE_URL, etc.) : RAILWAY_DUMP_MAPPING_3K.txt + generate-railway-vite-env-3k.sh"
echo "  - Lier Postgres à n8n (réseau privé Railway ou DATABASE_URL public selon ta config)."
echo "  - Vérifier les déploiements dans le dashboard."
