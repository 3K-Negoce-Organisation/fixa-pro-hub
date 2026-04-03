#!/usr/bin/env bash
# Avec un token Railway **workspace** (ou compte), affiche l’UUID du workspace et les projets visibles.
# La requête `me { workspaces }` ne marche pas avec un workspace token ; on utilise `projects` puis `project.workspaceId`.
#
# Usage :
#   export RAILWAY_TOKEN_3K='...'
#   ./scripts/migration-3k/resolve-railway-workspace-3k.sh
#
# Sortie proposée pour le shell :
#   export RAILWAY_WORKSPACE_ID_3K='...'
set -euo pipefail
TOKEN="${RAILWAY_TOKEN_3K:-${RAILWAY_TOKEN:-}}"
[[ -n "$TOKEN" ]] || { echo "Définir RAILWAY_TOKEN_3K ou RAILWAY_TOKEN" >&2; exit 1; }

END="https://backboard.railway.com/graphql/v2"

resp="$(curl -sS -X POST "$END" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"query { projects { edges { node { id name } } } }"}')"

if [[ -z "$(echo "$resp" | jq -r '.data.projects.edges[0].node.id // empty')" ]]; then
  echo "Aucun projet visible avec ce token (réponse) :" >&2
  echo "$resp" | jq . >&2
  exit 1
fi

echo "Projets visibles :" >&2
echo "$resp" | jq -r '.data.projects.edges[] | "  - \(.node.name)  (\(.node.id))"' >&2

# Préférer « Negoce » dans le nom (évite les projets de test type luceka-3k-api qui matchent aussi « 3k »).
proj_id="$(echo "$resp" | jq -r '
  [.data.projects.edges[].node] as $all
  | ($all | map(select(.name | test("Negoce|negoce"; "i"))) | .[0])
  | if . == null then $all[0] else . end
  | .id
')"
proj_name="$(echo "$resp" | jq -r --arg id "$proj_id" '.data.projects.edges[].node | select(.id == $id) | .name')"

ws_resp="$(curl -sS -X POST "$END" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -nc --arg id "$proj_id" '{query: "query ($id: String!) { project(id: $id) { id name workspaceId } }", variables: {id: $id}}')")"

ws_id="$(echo "$ws_resp" | jq -r '.data.project.workspaceId // empty')"
ws_name="$(curl -sS -X POST "$END" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -nc --arg id "$ws_id" '{query: "query ($id: String!) { workspace(workspaceId: $id) { id name } }", variables: {id: $id}}')" | jq -r '.data.workspace.name // empty')"

echo "Projet de référence : $proj_name  ($proj_id)"
echo "Workspace : ${ws_name:-?}  ($ws_id)"
echo ""
echo "export RAILWAY_WORKSPACE_ID_3K='$ws_id'"
echo "# Optionnel si tu réutilises ce projet existant :"
echo "export RAILWAY_PROJECT_ID_3K='$proj_id'"
