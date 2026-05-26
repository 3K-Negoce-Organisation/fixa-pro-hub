# Secrets agents / CI — fixa-pro-hub (3K-Négoce)

**Ne jamais committer** de tokens, mots de passe ou clés dans Git.

## Fichiers locaux (workspace parent)

| Fichier | Usage |
|---------|--------|
| `../scripts/supabase-refs.env` | `SUPABASE_ACCESS_TOKEN_3K`, refs projets, mots de passe DB |
| `../scripts/load-3k-env.sh` | Charge les `.env` 3K |

```bash
set -a && source ../scripts/load-3k-env.sh && set +a
export SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN_3K"
```

## Projets Supabase 3K (ne pas utiliser les anciens refs Luceka)

| Env | Project ref |
|-----|-------------|
| Staging | `lhrwjnieojuempxjbgql` |
| Production | `lqsbsinycyewdvdtbruy` |

## GitHub Actions (dépôt fixa-pro-hub)

Configurer dans **Settings → Secrets and variables → Actions** :

| Secret | Obligatoire | Description |
|--------|-------------|-------------|
| `SUPABASE_ACCESS_TOKEN` | Oui | PAT [Supabase Account → Access tokens](https://supabase.com/dashboard/account/tokens) avec accès org 3K |
| `SUPABASE_REF_STAGING` | Non | Repli : `lhrwjnieojuempxjbgql` dans le workflow |
| `SUPABASE_REF_PRODUCTION` | Non | Repli : `lqsbsinycyewdvdtbruy` |

Workflows concernés : **Run SQL migration** ([`.github/workflows/run-sql-migration.yml`](../.github/workflows/run-sql-migration.yml)).

## Depuis un Mac / agent Cursor

- Même PAT que ci-dessus dans `supabase-refs.env`
- SQL manuel : `./scripts/run-sql-migration.sh staging|production`
- Voir aussi [`DATA_CLEANUP_PRICES_CARTS.md`](DATA_CLEANUP_PRICES_CARTS.md)

Contexte stack complet : [`AI-WORKSPACE-CONTEXT.md`](../AI-WORKSPACE-CONTEXT.md). Admin : [`admin-hub-central/docs/AGENT_SECRETS_FROM_IMAC.md`](../../admin-hub-central/docs/AGENT_SECRETS_FROM_IMAC.md).
