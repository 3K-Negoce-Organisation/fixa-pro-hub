# 3K Négoce — AI workspace context

**Purpose:** Single source of truth for assistants working on the 3K Négoce stack. **Read this file before proposing plans or deployment steps.** When the user supplies new external connection references (URLs, project IDs, keys naming—never paste secret values here), **update this document** in the same change.

**Emplacement canonique :** versionné à la **racine de ce dépôt** (`AI-WORKSPACE-CONTEXT.md`). Workspace multi-dépôts local : scripts partagés `../scripts/`, admin `../admin-hub-central/`, docs transverses `../docs/`.

**Last updated:** 2026-05-29 (pictos configurables, `unite_de_vente`, recherche Alsafix, totaux PDF fournisseur)

---

## Mandatory workflow rules

1. **Read this file first** before drafting a multi-step plan that touches infrastructure, env vars, or releases.
2. **Deploy order:** never deploy or promote changes to **production** before they are validated on **staging** (and, where applicable, **develop**). Same for Supabase migrations, Edge Functions, and app hosting.
3. **Hébergement front (Railway, pas Vercel) :** chaque **push** sur **`staging`** ou **`main`** déclenche un **rebuild Railway** — vitrine **`vis-a-bois-<env>`**, admin **`admin-hub-<env>`** (workspace `3k-negoce_workspace`). Les Edge Functions et migrations Postgres **ne** suivent **pas** le push Git : les déployer **manuellement** via Supabase CLI.
4. **Secrets:** do not commit API keys, tokens, or connection strings into repos or into this file. Store only **non-secret** identifiers (e.g. Supabase project ref, public URLs, Railway service *names*, Stripe *mode*).
5. **Updates:** when the user corrects or extends any reference, edit the relevant section below and bump **Last updated**.
6. **Changelog (obligatoire) :** à chaque **push** sur la branche **`staging`** et à chaque **push** sur **`main`** (ou merge équivalent vers production) pour **`fixa-pro-hub`** et/ou **`admin-hub-central`**, ajouter **une ligne datée** dans le tableau **[Changelog](#changelog)** ci-dessous (résumé factuel : dépôt, branche, migrations Supabase, `db push`, Edge deploy, Railway rebuild, copie Storage, etc.). Même principe après une opération infra manuelle significative (ex. `copy-staging-storage-to-prod`) si elle n’est pas déjà couverte par un commit le même jour. Garder les dates au format **AAAA-MM-JJ** et les entrées **concises**.
7. **Exécuter la CLI Supabase après validation :** lorsqu’un **plan est approuvé** par l’utilisateur ou qu’il **demande des corrections** qui touchent Postgres (migrations) ou les Edge Functions, l’assistant doit **enchaîner les commandes** (`supabase link`, `db push`, `functions deploy`, etc.) depuis **la racine de ce dépôt** en s’appuyant sur **`../scripts/supabase-refs.env`** (workspace parent, chargé via `../scripts/load-3k-env.sh` ou `source` explicite — voir encadré *À retenir pour la CLI Supabase*), pas seulement les décrire. Si `db push` échoue (mot de passe `postgres` refusé), mettre à jour `**SUPABASE_DB_PASSWORD_STAGING*`* / `**_PRODUCTION**` et les `SUPABASE_DB_URL_*` après copie depuis le dashboard Supabase (**Settings → Database**), puis relancer ; **alternatives sans mot de passe Postgres :** `**supabase db query --linked -f supabase/migrations/<fichier>.sql`** (projet déjà `link` + `SUPABASE_ACCESS_TOKEN`), ou exécuter le SQL dans le **SQL Editor** du projet cible. **Fichiers `.env` sourcés par bash :** si un mot de passe ou une URL contient `**;`**, entourer la valeur de **guillemets simples** (`'...'`) pour que `source` ne coupe pas la ligne.

---

## Repositories (this workspace)


| Folder               | Role                                                                                         | GitHub remote                                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `fixa-pro-hub/` (ce dépôt) | Storefront (Vite/React) + in-app admin routes; Stripe checkout; many Supabase Edge Functions | `[https://github.com/3K-Negoce-Organisation/fixa-pro-hub.git](https://github.com/3K-Negoce-Organisation/fixa-pro-hub.git)`           |
| `admin-hub-central/` | Back-office (commandes, produits, catégories, fournisseur, utilisateurs, charte)             | `[https://github.com/3K-Negoce-Organisation/admin-hub-central.git](https://github.com/3K-Negoce-Organisation/admin-hub-central.git)` |


**Site public vis-a-bois.com :** le code source du site vitrine / storefront déployé sous ce domaine (services Railway du type `vis-a-bois-<env>`) correspond **uniquement** au dépôt `**https://github.com/3K-Negoce-Organisation/fixa-pro-hub.git`** (racine de **ce dépôt**). Ce n’est **pas** `admin-hub-central` ni un autre dépôt — pour les changements front, Stripe côté boutique, ou Edge Functions attachées à ce site, travailler ici.

**Accès public boutique :** colonne `**public.sites.storefront_public`** (booléen, défaut `**false**`). Si `true`, le storefront autorise l’accès sans compte (navigation + paiement invité) et propose l’inscription avec validation par email (Supabase). Toggle dans l’admin embarqué fixa : **Paramètres fournisseur** → section « Boutique en ligne ». Même migration dans **fixa-pro-hub** et **admin-hub-central**. Edge Functions : `lookup-order-by-email` (suivi invité), garde sur `create-payment-intent` et `create-stripe-checkout` pour les appels anonymes ; secret optionnel `**STOREFRONT_SITE_SLUG`** (défaut `vis-a-bois`). Après merge : appliquer la migration + déployer les fonctions sur chaque projet Supabase concerné.

**Travail IA / assistants (admin) :** pour tout ce qui concerne **admin-hub-central**, le dépôt cible est `**https://github.com/3K-Negoce-Organisation/admin-hub-central.git`** — éditer le dossier local `admin-hub-central/` et ne pas confondre avec fixa-pro-hub sauf besoin explicite.

**Périmètre (GitHub + Railway) :** tout ce qui est décrit ici concerne uniquement l’organisation `**3K-Negoce-Organisation`** sur GitHub et le **workspace Railway `3k-negoce_workspace`** (projet `7e8dc729-5d6f-4558-acc4-1c683169493d`). Ce n’est **pas** le workspace personnel « pimimac » ni les dépôts/projets **luceka** — ne pas les mélanger pour les CLI, tokens ou liens dashboard.

**Note:** The admin repo is sometimes called *admin-central-hub* or **admin-pro-hub** in conversation; in this workspace the folder name is **`admin-hub-central`**. Doc admin dédiée : **`admin-hub-central/AI-WORKSPACE-CONTEXT.md`** (routes, pages) ; **infra / Supabase / déploiement** = ce fichier.

**Note:** There is no `admin-pro-hub` directory here; the admin app is `**admin-hub-central`**. Both are separate git repos; they share the **same logical Postgres schema** (aligned `supabase/migrations/` history).

**Workspace root:** `[../docs/PRESENTATION-SCHEMA.md](../docs/PRESENTATION-SCHEMA.md)` — Mermaid diagrams for presentations; it links back to this file for operational detail (not a deployable app).

**Flux commande (panier → Stripe → webhook → Resend fournisseur + ingest Gmail → livraison) :** `[../docs/ORDER_FLOW.md](../docs/ORDER_FLOW.md)` — inclut vérification production (`lqsbsinycyewdvdtbruy`), secrets `ORDER_UPDATE_API_KEY` / `VAB_API_KEY`, et liens vers le code.

**Commande payée — totaux, PDF, emails client (fixa-pro-hub, 2026-05-23) :** voir section **[Commande payée — frais de port, PDF et emails](#commande-payée--frais-de-port-pdf-et-emails)** ci-dessous.

**Simulation panier / PDF fournisseur (admin-hub-central, 2026-05-23) :** page **`/simulation-commande`** — voir **[Simulation commande (admin)](#simulation-commande-admin)** et **[PDF fournisseur — calculs Qté / Tarif UV](#pdf-fournisseur--calculs-qté--tarif-uv)**.

**Diagrammes acteurs (Mermaid, présentation) :** `[../docs/ORDER_WORKFLOW_ACTORS.md](../docs/ORDER_WORKFLOW_ACTORS.md)` — vue d’ensemble, séquence commande payée → fournisseur → client, chemins admin vs n8n.

**CI / GitHub Actions:** not in use for these repos (no workflows to rely on; any schema-sync docs in-repo are legacy reference only).

### Inventaire prérequis — CLI, déploiement, inspection (à maintenir)

**Légende des statuts** (aucune valeur secrète dans ce fichier ; les jetons vivent sous **`scripts/*.env`** gitignorés ou le dashboard) :

| Statut | Signification |
|--------|----------------|
| **Présent** | Identifiant, URL, nom de variable ou consigne **explicite** dans ce document (non secret). |
| **Partiel** | Partie documentée ici ; complément obligatoire dans **fichiers locaux gitignorés**, **dashboard** (Stripe / Supabase / Railway / Resend), ou section **TBD** ci-dessous. |
| **Absent** | Non couvert par ce MD ; à documenter ou à configurer côté infra / local. |

**Mise à jour :** après chaque rotation de PAT, création de webhook, ou ajout de variable Railway, ajuster la colonne **Statut** (et la section *Remaining details* si besoin).

| Domaine | Élément | Statut |
|---------|---------|--------|
| **Poste** | CLI `supabase`, `railway`, `stripe`, `npx resend-cli@latest`, `jq`, `curl`, Node | Partiel (outils cités en dispersion ; pas de checklist unique ailleurs) |
| **GitHub** | Organisation `3K-Negoce-Organisation`, URLs des dépôts fixa / admin | Présent |
| **GitHub** | PAT (`repo`, éventuellement `admin:org`) | Partiel (emplacement `scripts/github-3k.env` documenté ; **valeur** jamais dans le MD) |
| **Supabase** | Refs + URLs API develop / staging / production | Présent |
| **Supabase** | PAT compte (`SUPABASE_ACCESS_TOKEN_3K` → `export SUPABASE_ACCESS_TOKEN`) | Partiel (fichier `scripts/supabase-refs.env` documenté ; validité token = machine locale) |
| **Supabase** | Mots de passe rôle `postgres` / `SUPABASE_DB_URL_*` pour `db push` | Partiel (noms de variables documentés ; valeurs uniquement fichiers locaux gitignorés) |
| **Supabase** | Service role pour scripts Storage / sync | Partiel (idem) |
| **Supabase Edge** | Noms des secrets (`STRIPE_*`, `RESEND_API_KEY`, `N8N_WEBHOOK_URL`, `VAB_API_KEY`, `ORDER_UPDATE_API_KEY`, `STOREFRONT_SITE_SLUG`, `SUPABASE_DB_URL` admin…) | Présent |
| **Supabase Edge** | Valeurs des secrets (clés, `whsec_`, URLs n8n finales) | Partiel (jamais dans le MD ; dashboard projet ou `supabase secrets list` avec PAT valide) |
| **Supabase Edge** | Parité secrets **staging** (`lhrwj…`) vs **prod** pour tests bout en bout | Partiel (vérif 2026-05 : staging ne listait que les secrets plateforme ; ajouter `STRIPE_*`, `RESEND_API_KEY`, `N8N_WEBHOOK_URL`, … si besoin) |
| **Supabase** | URL attendue webhook Stripe → `…/functions/v1/stripe-webhook` par ref | Présent |
| **Stripe** | Compte live 3K (`acct_1THNP0CLf4nTxgku`), préfixe `51THNP0…`, doc snapshot | Présent (voir `STRIPE_SUPABASE_CLI_REFERENCE.md`) |
| **Stripe** | Session CLI `stripe login` + endpoints webhooks **enregistrés** (test/live) alignés sur chaque ref | Partiel (consignes oui ; état Stripe Dashboard non versionné ; snapshot CLI avait liste vide) |
| **Resend** | Domaine d’envoi **`mail.vis-a-bois.com`** (vérifié Resend, région **eu-west-1**) + stratégie `from` / `supplier_settings` | Présent (détail DNS ci-dessous section *Resend*) |
| **Resend** | `RESEND_API_KEY` pour CLI `doctor` / `domains list` | Partiel (secret uniquement local ou option `verify-3k-tools.env`) |
| **Railway** | Workspace `3k-negoce_workspace`, project ID `7e8dc729-5d6f-4558-acc4-1c683169493d` | Présent |
| **Railway** | Schéma de nommage services `vis-a-bois-<env>`, `admin-hub-<env>` | Présent |
| **Railway** | Token API (`RAILWAY_TOKEN_3K` + `RAILWAY_API_TOKEN` via `load-3k-env.sh`) | Partiel (compte **No workspace** pour `whoami` ; voir *Railway CLI 4.x* ci-dessous) |
| **Railway** | **IDs** services / envs + export `VITE_*` (script `sync-cli-env-3k.sh`) | Partiel (IDs dans `scripts/railway-services-3k.env` **généré** ; snapshot d’IDs **en dur** dans le script — à revoir si services recréés) |
| **Railway** | URLs publiques finales par env (storefront + admin) | Absent (hors périmètre du script sync ; **TBD** dashboard / domaines custom) |
| **n8n** | Rôle (`N8N_WEBHOOK_URL`, rappel workflows + `VAB_API_KEY`) | Présent |
| **n8n** | Services Railway par env | Présent (noms : `n8n-develop`, `n8n-staging`, `n8n-production` — IDs dans `railway-services-3k.env` généré) |
| **Auth Supabase** | Redirect URLs / Site URL par projet | Partiel (voir `AUTH_REDIRECTS_3K.txt` dans fixa ; exemples Railway, pas les secrets) |
| **Scripts repo** | `verify-migration-3k-state.sh`, `verify-3k-tools.sh`, `compare-supabase-3env.sh`, `deploy-functions-3k.sh`, **`sync-cli-env-3k.sh`** / `./scripts/3k.sh sync-cli-env` | Présent (chemins dans ce fichier / RUNBOOK) |

**Synthèse « ce qui manque encore » côté doc ou infra :** URLs publiques Railway par env ; **variables `VITE_STRIPE_*_LIVE` / `_TEST` sur les builds Railway** (fixa + admin) ; **secrets Edge sur staging Supabase** alignés avec prod pour tests bout en bout ; domaines Resend **vérifiés** et `from` figés ; confirmation **dashboard Stripe** des webhooks + `whsec` par projet ; **`scripts/railway-3k.env`** + **`sync-cli-env`** pour rafraîchir les `.env` locaux ; **PAT Supabase valide** dans `scripts/supabase-refs.env` (sinon `401` sur `secrets list`).

### Où mettre les tokens (local, **ne jamais committer**)

Tout le périmètre **CLI Supabase / Railway / GitHub** pour **fixa-pro-hub** et **admin-hub-central** est **centralisé** sous **`../scripts/`** à la racine du workspace (même niveau que ce dépôt et `admin-hub-central/`). Les fichiers `*.env` y sont **gitignorés** ; les modèles versionnés portent le suffixe `.env.example`.

`scripts/load-3k-env.sh` charge dans l’ordre : `scripts/supabase-refs.env`, `railway-3k.env`, **`railway-services-3k.env`** (si présent — généré par `sync-cli-env`), `github-3k.env`, `verify-3k-tools.env`, puis `fixa-pro-hub.env` / `admin-hub-central.env` si présents — avec **repli** sur `scripts/.generated/` puis sur `scripts/migration-3k/.generated/` pour les clones qui n’ont pas encore migré les fichiers.


| Outil        | Fichier conseillé                                                    | Contenu typique                                                                                                                                                                                                                                                                                                           |
| ------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Supabase** | `scripts/supabase-refs.env`                                          | `SUPABASE_ACCESS_TOKEN_3K`, `SUPABASE_REF_DEVELOP` / `_STAGING` / `_PRODUCTION`, `SUPABASE_DB_URL_`*, mots de passe DB, `SUPABASE_SERVICE_ROLE_KEY_`* (déjà le fichier utilisé par les scripts `compare-supabase-3env`, `sync-prod-to-staging`, etc.).                                                                    |
| **Railway**  | `scripts/railway-3k.env`                                          | `RAILWAY_TOKEN_3K` (jeton **compte** « No workspace » recommandé), `RAILWAY_WORKSPACE_ID_3K`, `RAILWAY_PROJECT_ID_3K` — modèle `[railway-3k.env.example](scripts/migration-3k/railway-3k.env.example)`. Après `source scripts/load-3k-env.sh`, la CLI 4.x utilise **`RAILWAY_API_TOKEN`** (voir section *Railway CLI 4.x*). |
| **Railway**  | `scripts/railway-services-3k.env` (**généré**, gitignoré)        | IDs d’environnements + IDs des services `vis-a-bois-*`, `admin-hub-*`, `n8n-*` — produit par **`scripts/sync-cli-env-3k.sh`** ; sourcé automatiquement par `load-3k-env.sh` si le fichier existe. |
| **GitHub**   | `scripts/github-3k.env` **ou** les mêmes variables dans ton shell | `GH_TOKEN` ou `GITHUB_TOKEN` (PAT org **3K-Negoce-Organisation**, scopes `repo` selon scripts). Alternative sans fichier : `gh auth login` (stockage dans le trousseau).                                                                                                                                                  |


Chargement rapide dans un shell (depuis la racine du workspace) :

```bash
set -a
source scripts/load-3k-env.sh
set +a
# ou équivalent :
# source scripts/supabase-refs.env
# source scripts/railway-3k.env   # si créé
# source scripts/github-3k.env  # si créé
```

**Point d’entrée agent / humain :** `./scripts/3k.sh` — `verify-tools`, `verify-migration-state`, `deploy-edge-staging-prod`, `deploy-edge-all`, **`sync-cli-env`** (voir ci-dessous).

### Synchronisation CLI → `scripts/*.env` (`sync-cli-env-3k.sh`)

Script **`[scripts/sync-cli-env-3k.sh](scripts/sync-cli-env-3k.sh)`** (appelable via **`./scripts/3k.sh sync-cli-env`** ou **`./scripts/3k.sh sync-cli-env production`**) :

1. **`source scripts/load-3k-env.sh`** (Supabase + Railway).
2. **Supabase CLI** : pour l’environnement cible (`develop` \| `staging` \| `production`), récupère les clés **publishable** (ou anon) et construit les **`VITE_SUPABASE_*`** canoniques depuis le ref `SUPABASE_REF_*` de `scripts/supabase-refs.env`.
3. **Railway CLI** : crée un lien stable sous **`scripts/.generated/railway-cwd`** (`railway link -w … -p … -e <envId>`), puis **`railway variable list --json`** sur les services **`vis-a-bois-{develop|staging|production}`** et **`admin-hub-{develop|staging|production}`** ; fusionne toutes les variables **`VITE_*`** Railway avec le bloc Supabase (**les `VITE_SUPABASE_*` issus de Supabase priment** sur les valeurs Railway).
4. **Écrit** (fichiers **gitignorés**) : **`scripts/fixa-pro-hub.env`**, **`scripts/admin-hub-central.env`**, **`scripts/railway-services-3k.env`** (IDs d’env + IDs de services, non secrets), et relance **`scripts/migration-3k/generate-railway-vite-env-3k.sh`** → **`scripts/.generated/railway-vite-env.txt`** (bloc Vite pour les **trois** refs Supabase).

**Limites :** les **UUID de services** Railway sont **snapshotées dans le script** (projet `7e8dc729-…`, relevés 2026-05) ; si un service est **recréé** sur Railway, mettre à jour le script. Les **URLs publiques** des déploiements (`*.up.railway.app` / domaines) ne sont **pas** dérivées automatiquement ici.

### Railway CLI 4.x — `RAILWAY_API_TOKEN` vs `RAILWAY_TOKEN`

`scripts/load-3k-env.sh` exporte **`RAILWAY_API_TOKEN`** depuis **`RAILWAY_TOKEN_3K`** et **retire `RAILWAY_TOKEN`** : si les deux pointent vers le même jeton **compte**, `railway whoami` renvoie **Unauthorized** (bug de priorité côté CLI). **`load-3k-env.sh`** est sourçable depuis **bash** ou **zsh** (`BASH_SOURCE` / `${(%):-%x}`).

**admin-hub-central :** le fichier `**.env`** à la racine du repo admin est **gitignoré** ; sert surtout au **dev Vite** (`VITE_SUPABASE_URL`, clé anon, etc.), pas aux secrets « infra 3K » partagés — garde les tokens sensibles (service role, PAT complet) plutôt dans **`scripts/supabase-refs.env`** pour un seul endroit à sauvegarder.

**fixa-pro-hub :** `*.local` est ignoré par Vite ; tu peux utiliser `**.env.local`** uniquement pour les variables **front** locales si besoin, distinctes des fichiers ci-dessus.

**À retenir pour la CLI Supabase (assistants / automation) :**

1. `**SUPABASE_ACCESS_TOKEN_3K`** ne va **jamais** dans un `.md` versionné. Il peut vivre dans **`../scripts/supabase-refs.env`** (recommandé ; chargé par `load-3k-env.sh`) **et/ou** dans **`.env`** (gitignoré, racine de ce dépôt). Le `.env` local contient souvent **uniquement** les `VITE_SUPABASE_*` pour le front : c’est normal ; le token peut rester seulement dans `supabase-refs.env`.
2. La CLI lit `**SUPABASE_ACCESS_TOKEN`**, pas `SUPABASE_ACCESS_TOKEN_3K` : après `source` du fichier, faire `**export SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN_3K"**` avant `supabase link`, `db push`, `functions deploy`.
3. `**supabase functions deploy**` utilise l’API (token suffisant).
4. `**supabase db push**` ouvre une connexion **Postgres** : il faut le **mot de passe rôle `postgres`** du projet cible, p.ex. `**SUPABASE_DB_PASSWORD_STAGING**` ou `**SUPABASE_DB_PASSWORD_PRODUCTION**` dans le même fichier `supabase-refs.env`. **Si `-p '…'` échoue malgré le bon mot de passe** (SASL / pooler) : mettre à jour le **CLI Supabase** (`npx supabase@latest` ou équivalent), puis préférer `**export SUPABASE_DB_PASSWORD='…'**` **sans** flag `-p`, ou `**--db-url**` vers `**db.<ref>.supabase.co:5432**` avec mot de passe **encodé pourcent** dans l’URI. Si le mot de passe a été **régénéré** dans le dashboard (**Database → Database password**), **mettre à jour** le fichier local et les `SUPABASE_DB_URL_*`. **Sans mot de passe Postgres**, avec `**link**` + `**SUPABASE_ACCESS_TOKEN**` : `**supabase db query --linked -f …**` (API Management).
5. **Projets canoniques 3K :** staging `**lhrwjnieojuempxjbgql`**, production `**lqsbsinycyewdvdtbruy**` — ne pas utiliser les anciens refs Luceka (`aueuxlqtueoqjxsdemeu`, `giguuzfnjkkqdeteujwc`).

**Diagnostic CLI (machine locale, `scripts/supabase-refs.env` ou repli legacy) — 2026-05 :**

- Après `source …/supabase-refs.env` et `export SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN_3K"`, si **`supabase secrets list --project-ref lhrwjnieojuempxjbgql`** renvoie **`401 Unauthorized`** : le PAT dans le fichier est **révoqué, expiré ou invalide** — régénérer un token sur [Dashboard Supabase → Account → Access tokens](https://supabase.com/dashboard/account/tokens) avec accès à l’org qui héberge les projets 3K, puis mettre à jour **`SUPABASE_ACCESS_TOKEN_3K`** dans `supabase-refs.env` (ne pas versionner).
- Si la réponse est **`403`** avec message *privileges* : le token est valide mais le **compte n’a pas les droits** sur ce projet (invitation org / rôle insuffisant).
- Si `**supabase projects list**` ne montre **pas** les refs `wyoxdf…` / `lhrwj…` / `lqsbs…`, la session CLI est sur un **autre** compte Supabase que celui de l’org 3K — utiliser `supabase login` ou le bon PAT.
- **`railway-3k.env`** : souvent **absent** tant qu’il n’est pas créé depuis `railway-3k.env.example` ; sans jeton valide, `**railway whoami**` échoue — **`source scripts/load-3k-env.sh`** puis `whoami` (utilise **`RAILWAY_API_TOKEN`**). Jeton **compte** avec scope **No workspace** sur [railway.com/account/tokens](https://railway.com/account/tokens).
- **Stripe CLI** : installable via Homebrew `brew install stripe/stripe-cli/stripe` ; `stripe login` pour les audits webhooks / compte.
- **Resend CLI** (officiel) : `**npx resend-cli@latest**` — `resend login` ou variable `RESEND_API_KEY` ; `resend doctor`, `resend domains list`. Les clés **`RESEND_API_KEY`** des Edge Functions vivent dans les **secrets Supabase** du projet, pas en général dans `supabase-refs.env` ni dans les `.env` Vite locaux (`VITE_*` seulement) — pour valider Resend sans dashboard, exporter une clé API Resend puis lancer `doctor` / `domains list`.
- **Script tout-en-un :** `[scripts/migration-3k/verify-3k-tools.sh](scripts/migration-3k/verify-3k-tools.sh)` — depuis la racine workspace : `../scripts/3k.sh verify-tools --guide` (où mettre quelles clés), puis sans option ou `--supabase` / `--railway` / `--resend` / `--n8n`. Fichier optionnel : copier `verify-3k-tools.env.example` → `../scripts/verify-3k-tools.env` pour tester Resend + URL n8n depuis la machine.

Exemple minimal depuis `**fixa-pro-hub**` (sans afficher les secrets) :

```bash
set -a && source ../scripts/load-3k-env.sh && set +a
# ou depuis la racine workspace :
# set -a && source scripts/load-3k-env.sh && set +a
export SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-$SUPABASE_ACCESS_TOKEN_3K}"
supabase link --project-ref lhrwjnieojuempxjbgql   # ou lqsbsinycyewdvdtbruy
supabase db push --linked --include-all --yes -p "$SUPABASE_DB_PASSWORD_STAGING"
supabase functions deploy <noms-des-fonctions> --no-verify-jwt --project-ref lhrwjnieojuempxjbgql
```

**Secours sans `db push` (ex. mot de passe DB inconnu) :** `**supabase db query --linked -f …`** (voir point 4 ci-dessus), ou ouvrir le **SQL Editor** du projet Supabase cible et exécuter le contenu du fichier de migration concerné (ex. `storefront_public` : `supabase/migrations/20260412120000_sites_storefront_public.sql`). Puis, si besoin, **recharger le cache schéma** (Dashboard → *Reload schema* ou migration dédiée).

---

## Supabase — environments (canonical project refs)


| Environment                                                  | Project ref            | API base URL                               |
| ------------------------------------------------------------ | ---------------------- | ------------------------------------------ |
| **Develop**                                                  | `wyoxdfshaonlaoqnohzm` | `https://wyoxdfshaonlaoqnohzm.supabase.co` |
| **Staging** (branche DB Supabase `**staging`**, parent prod) | `lhrwjnieojuempxjbgql` | `https://lhrwjnieojuempxjbgql.supabase.co` |
| **Production**                                               | `lqsbsinycyewdvdtbruy` | `https://lqsbsinycyewdvdtbruy.supabase.co` |

### Branches Git et périmètre des migrations (3 avril 2026)

Les branches Git **`develop`** et **`staging`** ont été **créées à partir de `main` le 3 avril 2026**. Les bases Supabase utilisées avec ces branches partent donc du **socle schématique de `main` à cette date**. Les fichiers sous `supabase/migrations/` dont le préfixe d’horodatage est **strictement antérieur à `20260403…`** restent dans le dépôt comme **historique** (remontée depuis `main` et les itérations antérieures). **En principe**, il **n’est pas nécessaire de rejouer manuellement** ces migrations sur develop / staging / production si les projets Supabase ont **déjà été alignés** sur ce socle au moment du fork — les évolutions courantes passent par les migrations **à partir du 3 avril 2026** (`20260403…` et suivantes).

### État des lieux — fichiers `supabase/migrations/` et projets Supabase

Les dépôts **`fixa-pro-hub`** et **`admin-hub-central`** portent le **même ensemble** de **42** fichiers SQL (noms identiques, schéma logique partagé).

| Période (préfixe du fichier) | Quantité | Lecture opérationnelle |
| ----------------------------- | -------- | ------------------------ |
| **Strictement avant `20260403…`** | **34** | Historique dans Git ; ne pas rejouer systématiquement sur les envs déjà alignés sur le fork du **3 avril 2026**. |
| **`20260403…` et après**        | **8**  | Delta post-fork : à appliquer / suivre sur les projets Supabase cibles (voir tableau). |

**Migrations à partir du 3 avril 2026 (ordre chronologique) :**

| Fichier | Thème court |
| ------- | ----------- |
| `20260403120000_sites_description.sql` | `sites.description` |
| `20260403120100_align_legacy_optional_columns.sql` | Colonnes optionnelles legacy |
| `20260403120200_custom_themes_icon_created_by.sql` | Thèmes / icônes |
| `20260403120300_orders_site_id_is_archived.sql` | `orders` : `site_id`, `is_archived` |
| `20260409160000_core_team_admin_roles.sql` | Rôles admin *core team* |
| `20260410170000_products_site_id.sql` | `products.site_id` |
| `20260410200000_align_prod_optional_columns.sql` | Alignement colonnes prod ↔ staging |
| `20260412120000_sites_storefront_public.sql` | `sites.storefront_public` (vitrine publique) |

**Projets Supabase (refs canoniques 3K) :**

| Environnement | Ref projet | Rôle |
| ------------- | ---------- | ---- |
| **Develop** | `wyoxdfshaonlaoqnohzm` | Dev / previews |
| **Staging** | `lhrwjnieojuempxjbgql` | Branche DB *staging* (parent prod) |
| **Production** | `lqsbsinycyewdvdtbruy` | Prod 3K |

**État connu côté déploiements (à revalider sur le dashboard ou avec [compare-supabase-3env.sh](scripts/migration-3k/compare-supabase-3env.sh)) :**

- **Staging (2026-04-09)** : `**supabase db push --linked --include-all --yes**` exécuté avec succès sur **`lhrwjnieojuempxjbgql`** depuis `fixa-pro-hub` : les **8** migrations post-fork ont été **enregistrées** ; les **NOTICE** PostgreSQL du type *already exists, skipping* indiquent que le schéma était **déjà aligné** avec le SQL des fichiers (idempotent). Vérifier au besoin **`supabase_migrations.schema_migrations`** sur le projet staging.
- **Production** : les **8** migrations du tableau ont été **appliquées** via `supabase db query --linked -f …` lors d’une passe de préparation ; un **`db push`** peut encore échouer selon machine (mot de passe, pooler, IPv6) — mêmes contournements que le point « À retenir » (CLI à jour, `SUPABASE_DB_PASSWORD`, `--db-url` direct). Après un `db push` réussi, vérifier **`schema_migrations`** sur prod.

**Alignement schéma staging ↔ production (rapport `supabase-3env-diff-report.md` sous `scripts/.generated/` ou `scripts/migration-3k/.generated/`, généré 2026-04-10) :** pas de table manquante d’un côté ; **12** colonnes dans **`site_themes`** diffèrent seulement par le type catalogue Postgres (**`text`** côté staging vs **`varchar`** côté prod) — impact applicatif en pratique négligeable, mais le script `compare-supabase-3env` les signale. **Edge Functions :** les empreintes **`ezbr_sha256`** **staging ≠ production** pour la plupart des fonctions au moment du rapport — ce n’est **pas** un alignement bundle à bundle ; pour rapprocher prod de staging, redéployer les fonctions dans l’ordre documenté (fixa puis admin pour `update-order-status` / n8n).

---

**Ne plus utiliser (anciens comptes / org Luceka, avant migration 3K-Négoce) :**

- `**aueuxlqtueoqjxsdemeu`** — n’était **pas** la prod 3K ; ancien projet lié au périmètre Luceka. **La production 3K est `lqsbsinycyewdvdtbruy`.**
- `**giguuzfnjkkqdeteujwc`** — ancien staging Luceka, **pas** le staging 3K. **Le staging 3K est `lhrwjnieojuempxjbgql`.**

Ne pas y lier la CLI (`supabase link`), ni y déployer les Edge Functions, ni y laisser des `VITE_SUPABASE_*` / secrets d’app 3K. Références historiques dans certains scripts (`LEGACY_SUPABASE_REFS.txt`, sync, dumps) : uniquement pour **migration / réécriture d’URLs**, pas comme cible de déploiement.

**CLI :** pour le travail courant 3K, authentifier la CLI : `supabase login` (navigateur) **ou** `export SUPABASE_ACCESS_TOKEN=<PAT>` (token personnel [compte Supabase](https://supabase.com/dashboard/account/tokens), avec accès à l’organisation qui héberge les projets 3K). Ensuite, depuis `fixa-pro-hub` : `supabase link --project-ref lhrwjnieojuempxjbgql` (staging) ou `lqsbsinycyewdvdtbruy` (production) selon l’opération, puis `supabase db push …` / `supabase functions deploy …` avec le même `--project-ref` si tu ne relies pas le dossier entre deux commandes.

**Staging et Supabase :** la branche de base `**staging`** est exposée avec le ref projet `**lhrwjnieojuempxjbgql`** (voir `[SUPABASE_BRANCHING_3K.txt](scripts/migration-3k/SUPABASE_BRANCHING_3K.txt)`). `**admin-hub-staging**`, `**vis-a-bois-staging**`, les `VITE_SUPABASE_*` Railway, et `**SUPABASE_REF_STAGING**` / `**SUPABASE_DB_URL_STAGING**` dans `scripts/supabase-refs.env` doivent tous cibler `**lhrwjnieojuempxjbgql**`. Le ref `**gcyxfuxywratoyjnxurf**` correspondait à un ancien projet / une confusion documentaire : **ne plus l’utiliser** (variables d’env, URLs, clés JWT).

**Secrets (DB passwords, `SUPABASE_ACCESS_TOKEN_3K`, service role):** keep only in **local gitignored** files — see `scripts/supabase-refs.env` (never commit). Use variables `SUPABASE_DB_PASSWORD_DEVELOP`, `SUPABASE_DB_PASSWORD_STAGING`, `SUPABASE_DB_PASSWORD_PRODUCTION` (fallback: single `SUPABASE_DB_PASSWORD` if all match).

**Checked-in CLI `project_id` (legacy / local; may not match deploy targets):**

- `supabase/config.toml` → `dvifxaygfrhhzmnmyiyp` (old export).
- `admin-hub-central/supabase/config.toml` → `ojtrsrdcaugyzvtqtupf` (old export).

Treat **Railway service env / local `.env`** as authoritative for which Supabase project a running app uses; use `supabase link --project-ref <ref>` per target when pushing DB or functions.

**Schema / Edge Function drift (3 envs):** from `fixa-pro-hub`, run `[scripts/migration-3k/compare-supabase-3env.sh](scripts/migration-3k/compare-supabase-3env.sh)` (requires `psql`, `node`, Supabase CLI, and `scripts/supabase-refs.env` sourced via `load-3k-env.sh` or legacy `.generated`). Produces JSON snapshots and `scripts/.generated/supabase-3env-diff-report.md` (workspace central) ou `scripts/migration-3k/.generated/supabase-3env-diff-report.md` (clone fixa seul).

**Copie production → staging (données + Auth + Storage) :** `[scripts/migration-3k/sync-prod-to-staging.sh](scripts/migration-3k/sync-prod-to-staging.sh)` — crée les utilisateurs Auth sur staging (map UUID), `TRUNCATE` + recopie des tables `public`, réécrit les URLs `*.supabase.co`, copie les buckets `product-images`, `order-documents`, `site-logos`. Inventaire colonnes : `[PROD_TO_STAGING_INVENTORY.md](scripts/migration-3k/PROD_TO_STAGING_INVENTORY.md)`. **Écrase tout le schéma `public` staging** ; exiger `--i-understand-overwrite-staging` pour la phase DB. Clés service role ou `SUPABASE_ACCESS_TOKEN_3K` + CLI. Voir [MIGRATION_STATUS_3K.txt](scripts/migration-3k/MIGRATION_STATUS_3K.txt) (risques PII / emails / Stripe). **Cible staging :** ref `**lhrwjnieojuempxjbgql`** dans `supabase-refs.env` (aligné Railway **fixa-pro-hub** et **admin-hub**).

**Copie staging → production (Storage uniquement) :** quand la **prod** a des buckets **vides** mais le **staging** contient déjà les fichiers (scénario : données SQL migrées vers prod sans objets Storage, alors que staging avait été alimenté depuis l’ancienne base). Script : [`copy-staging-storage-to-prod.mjs`](scripts/migration-3k/copy-staging-storage-to-prod.mjs) (ou [`copy-staging-storage-to-prod.sh`](scripts/migration-3k/copy-staging-storage-to-prod.sh)). Prérequis : `SUPABASE_SERVICE_ROLE_KEY_STAGING` + `_PRODUCTION` dans `supabase-refs.env`, ou `SUPABASE_ACCESS_TOKEN_3K` + CLI `supabase` pour récupérer les clés `service_role`.

```bash
cd fixa-pro-hub/scripts/migration-3k && npm install
node copy-staging-storage-to-prod.mjs --dry-run
node copy-staging-storage-to-prod.mjs --i-understand-copy-staging-to-prod
```

Buckets copiés avec **même chemin relatif** : `product-images`, `order-documents`, `site-logos`. **Ensuite** sur la prod : `**supabase link --project-ref lqsbsinycyewdvdtbruy**` puis `**supabase db query --linked -f scripts/migration-3k/sql/rewrite-prod-urls-staging-host-to-production.sql**` pour remplacer le host **`lhrwjnieojuempxjbgql`** par **`lqsbsinycyewdvdtbruy`** dans les colonnes URL (si la base prod pointe encore vers staging). Les scripts [`fix-production-storage-url-hosts.sql`](scripts/migration-3k/sql/fix-production-storage-url-hosts.sql) / [`rewrite-supabase-storage-hosts.mjs --target=production`](scripts/migration-3k/rewrite-supabase-storage-hosts.mjs) restent utiles pour d’**autres** refs historiques. **Limite :** seuls les fichiers **présents sur staging** sont copiés ; si la prod a plus de lignes produits / URLs que d’objets sur staging, les chemins sans blob restent en 404 (ré-upload ou import depuis une autre source).

**Images / Storage en prod cassées après migration (URLs ancien ref) :** si les vignettes produits ou catégories pointent vers un **autre** projet Supabase (`dvifxaygfrhhzmnmyiyp`, Luceka, staging, etc.), le navigateur charge un host où l’objet n’existe pas → icône cassée. **Correctif appliqué côté repo :** SQL one-off [`fix-production-storage-url-hosts.sql`](scripts/migration-3k/sql/fix-production-storage-url-hosts.sql) (exécuter avec `**supabase db query --linked -f …**` sur **`lqsbsinycyewdvdtbruy`** après `link`) ; ou Node [`rewrite-supabase-storage-hosts.mjs --target=production`](scripts/migration-3k/rewrite-supabase-storage-hosts.mjs) si Postgres direct est joignable. Les `UPDATE` ignorent les colonnes absentes (ex. `orders.items` selon schéma).

**Host prod correct mais réponse `not_found` / 404 :** l’URL `https://lqsbsinycyewdvdtbruy.supabase.co/storage/v1/object/public/product-images/…` est **syntaxiquement correcte**. Un chemin du type `{uuid-utilisateur}/{uuid}-{fichier}` correspond à l’Edge **`upload-product-image`** (admin) ; un fichier **seulement à la racine** du bucket vient souvent de l’upload **fixa** (`{timestamp}-{random}.ext`). Si l’API Storage renvoie **404**, le **blob n’existe pas** à ce chemin dans le bucket prod (migration **données SQL** sans copie des **objets** Storage — voir commentaire « Storage : non inclus » dans [`dump-restore-data-3k.sh`](scripts/migration-3k/dump-restore-data-3k.sh)). Il faut **recopier** les fichiers depuis l’ancien projet (même chemin relatif) ou **ré-uploader** depuis l’admin ; vérifier dans le **dashboard Supabase → Storage → product-images** (recherche par nom de fichier, ex. `TX2515`).

**Lovable :** déprécié ; le code admin n’utilise plus de preview Lovable ni de fallback hardcodé — uniquement les variables `VITE_`* sur le build / Railway.

---

## Railway


| Item                                | Value                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Workspace (nom CLI / dashboard)** | `3k-negoce_workspace`                                                                             |
| **Project ID**                      | `7e8dc729-5d6f-4558-acc4-1c683169493d`                                                            |
| **Environments**                    | `develop`, `staging`, `production`                                                                |
| **Service naming**                  | **Storefront:** `vis-a-bois-<ENV>` — **Admin:** `admin-hub-<ENV>` (replace `<ENV>` with `develop` |
| **Déploiement front**               | **Push Git `staging` / `main`** → rebuild Railway automatique du service lié à la branche. **Pas de Vercel.** Pas de workflow GitHub Actions pour le front. |


**Dépannage — toast « Failed to fetch » sur la connexion :** le bundle Vite embarque `VITE_SUPABASE_URL` au **build**. Si Railway staging a encore l’ancien ref `**gcyxfuxywratoyjnxurf`**, le navigateur ne peut souvent plus résoudre le host → erreur réseau. **Si l’URL est déjà `lhrwjnieojuempxjbgql`** mais la connexion échoue encore, vérifier que `**VITE_SUPABASE_PUBLISHABLE_KEY**` est la **publishable key du même projet** (sinon Auth répond **401 Invalid API key**, souvent masqué en « failed to fetch ») — voir section *Dépannage* dans `[fixa-pro-hub/ENVIRONMENTS.md](ENVIRONMENTS.md)` (test `curl` sur `/auth/v1/token`). Corriger les variables Railway puis **rebuild**. Le `vite build` du repo **échoue** si `VITE_SUPABASE_URL` contient un ref explicitement déprécié (`vite.config.ts`).

**CLI — bascule vers 3K :** script `[fixa-pro-hub/scripts/migration-3k/railway-use-3k-workspace.sh](scripts/migration-3k/railway-use-3k-workspace.sh)` : vérifie que le jeton voit le workspace `3k-negoce_workspace`, puis exécute `railway link` sur **fixa-pro-hub** (staging par défaut). Optionnel : `export RAILWAY_TOKEN_3K='…'` si le login courant ne liste que « pimimac ».

Si `railway link` ou `railway project list` ne montrent que « pimimac », il faut un **accès Railway** au workspace **3K-Négoce** (invitation équipe), puis `railway logout && railway login` dans un **terminal interactif**, ou un PAT avec ce workspace. Le nom `-w` doit **coller exactement** au dashboard (réf. équipe : `3k-negoce_workspace`).

```bash
cd fixa-pro-hub
./scripts/migration-3k/railway-use-3k-workspace.sh
# ou manuellement :
railway link -w 3k-negoce_workspace -p 7e8dc729-5d6f-4558-acc4-1c683169493d -e staging
railway variable list -s vis-a-bois-staging -e staging -k
```

Si la CLI répond *Workspace … not found*, vérifier l’orthographe dans le dashboard ou l’accès du compte à ce workspace.

**Public URLs:** *TBD — user* (confirm domains per env when known).

**n8n:** une instance par environnement Railway : services **`n8n-develop`**, **`n8n-staging`**, **`n8n-production`** (IDs dans **`scripts/railway-services-3k.env`** après `sync-cli-env`). Joignables via **Railway** (CLI ou dashboard) dans le projet `7e8dc729-5d6f-4558-acc4-1c683169493d`.

Scripts in `scripts/migration-3k/` still reference `RAILWAY_TOKEN_3K`, `RAILWAY_PROJECT_ID_3K`, etc.; align `RAILWAY_PROJECT_ID_3K` with the project ID above when using those scripts.

---

## Front-end (Vite) — variables

### Switch Stripe test / live (storefront **fixa-pro-hub**)

Le storefront lit **`sites.stripe_mode`** (test \| live) et charge **Stripe.js** avec :

- **`VITE_STRIPE_PUBLISHABLE_KEY_LIVE`** (ou repli **`VITE_STRIPE_PUBLISHABLE_KEY`**) pour le mode **live** ;
- **`VITE_STRIPE_PUBLISHABLE_KEY_TEST`** (ou repli vers la clé live / unique) pour le mode **test**.

Voir **`[fixa-pro-hub/src/components/checkout/StripePaymentForm.tsx](src/components/checkout/StripePaymentForm.tsx)`**.

### fixa-pro-hub (Railway `vis-a-bois-<env>`)

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- **`VITE_STRIPE_PUBLISHABLE_KEY_LIVE`** et **`VITE_STRIPE_PUBLISHABLE_KEY_TEST`** (recommandé depuis le switch Stripe) + repli `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_SITE_ENVIRONMENT_NAME`
- Optionnel e-com : `VITE_SHOPIFY_*` si utilisé

### admin-hub-central (Railway `admin-hub-<env>`)

- `VITE_SUPABASE_URL`, **`VITE_SUPABASE_ANON_KEY`** ou **`VITE_SUPABASE_PUBLISHABLE_KEY`**, `VITE_SITE_ENVIRONMENT_NAME`
- **Stripe côté build admin :** le code runtime n’embarque pas encore Stripe Elements comme la vitrine ; le **[README admin](admin-hub-central/README.md)** et la boîte de dialogue « Variables d’environnement » dans **`AdminSidebar`** documentent toutefois **`VITE_STRIPE_PUBLISHABLE_KEY_LIVE`** / **`_TEST`** pour **alignement** avec la vitrine et diagnostics. **Recommandation :** définir sur Railway les **mêmes** paires `pk_live` / `pk_test` que sur le service **`vis-a-bois-*`** de l’environnement correspondant.

### Écart constaté (vérification CLI **2026-05**, env **staging**)

| Service Railway              | `VITE_STRIPE_PUBLISHABLE_KEY_LIVE` / `_TEST` | `VITE_STRIPE_PUBLISHABLE_KEY` (repli) | Autres `VITE_*` notables   |
| ---------------------------- | -------------------------------------------- | ------------------------------------- | -------------------------- |
| **`vis-a-bois-staging`**     | **Manquants** (seul repli présent selon dump) | présent (`pk_test…`)                | Shopify, Supabase OK       |
| **`admin-hub-staging`**      | **Manquants**                                | absent                                | Supabase OK                |

**Action :** sur **chaque** env Railway concerné, ajouter **`VITE_STRIPE_PUBLISHABLE_KEY_LIVE`** et **`VITE_STRIPE_PUBLISHABLE_KEY_TEST`** (garder la variable unique en secours si besoin), puis **rebuild** les services.

### Supabase Edge — staging vs production (secrets, **switch Stripe**)

- **Production (`lqsbsinycyewdvdtbruy`)** : secrets métier présents (ex. `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `N8N_WEBHOOK_URL`, `RESEND_API_KEY`, `VAB_API_KEY`, …) — vérifier avec `supabase secrets list`.
- **Staging (`lhrwjnieojuempxjbgql`)** : une vérification **2026-05** via `supabase secrets list` ne montre **que** les secrets **plateforme** auto-injectés (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, …) — **pas** les secrets métier (`STRIPE_*`, `RESEND_API_KEY`, `N8N_WEBHOOK_URL`, …). Tant qu’ils manquent, les Edge **fixa** (paiement, webhook, emails) ne peuvent pas se comporter comme en prod sur staging.
- **Code fixa (`stripe-webhook`, `create-payment-intent`, …)** : prévoit des noms **séparés** test/live (`STRIPE_SECRET_KEY_LIVE`, `STRIPE_SECRET_KEY_TEST`, `STRIPE_WEBHOOK_SECRET_LIVE`, …) avec repli vers `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`. Sur **prod**, migrer progressivement depuis les noms **historiques** vers les paires **\_LIVE / \_TEST** pour coller au routage livemode Stripe.

**Travail ciblé staging :** même ref Supabase **`lhrwjnieojuempxjbgql`**, branches git / services Railway **`admin-hub-staging`** / **`vis-a-bois-staging`** — aligner **secrets Supabase staging** + **variables `VITE_*` Railway** avant de valider des parcours bout en bout.

---

## Mise en production — checklist (base, Edge, front, admin)

**Projet Supabase production :** `**lqsbsinycyewdvdtbruy**` — ne pas confondre avec staging (`lhrwjnieojuempxjbgql`).

### 1. Prérequis

- Staging validé (boutique, auth, paiement test, admin, n8n si utilisé).
- Sauvegardes / fenêtre de maintenance si opération sensible.

### 2. Postgres (migrations)

- Depuis `**fixa-pro-hub**` : `**export SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN_3K"**, puis **`supabase link --project-ref lqsbsinycyewdvdtbruy`**, puis soit **`supabase db push --linked …`** (mot de passe rôle` postgres`), soit **`supabase db query --linked -f supabase/migrations/****.sql`** pour chaque migration pas encore appliquée.
- Les dépôts **fixa-pro-hub** et **admin-hub-central** partagent la même historique de fichiers sous `supabase/migrations/` : **une seule application par migration sur le projet prod** suffit.
- **2026-04-09 :** sur prod, la colonne `**sites.storefront_public`** a été appliquée (`20260412120000_sites_storefront_public.sql`) ; `**products.site_id**` et les colonnes « align » type `**orders.shipping_country**` étaient déjà présentes — ne pas réappliquer aveuglément sans vérifier `information_schema`.

### 3. Secrets Edge (dashboard projet `**lqsbsinycyewdvdtbruy**`)

- **Stripe live** : secrets `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` (historique) **ou** paires **`STRIPE_SECRET_KEY_LIVE` / `STRIPE_SECRET_KEY_TEST`** et **`STRIPE_WEBHOOK_SECRET_LIVE`** / `_TEST` (recommandé pour le routage livemode dans `stripe-webhook`) ; endpoint dédié prod : `…/functions/v1/stripe-webhook`.
- **n8n / commandes** : sur la fonction `**update-order-status`** déployée depuis **admin-hub-central**, le code lit `**VAB_API_KEY`** (header `x-api-key` ou body `api_key`). **Configurer `VAB_API_KEY` en production** avec la même valeur que les workflows n8n — la variante **fixa-pro-hub** de `update-order-status` utilise `**ORDER_UPDATE_API_KEY`** et un contrat différent : **ne pas la déployer par-dessus** la version admin si n8n repose sur le format admin.
- `N8N_WEBHOOK_URL`, `RESEND_API_KEY`, `ORDER_UPDATE_API_KEY` (si une autre intégration l’utilise encore), `SUPABASE_DB_URL` pour `**manage-categories`** (repo admin), `**STOREFRONT_SITE_SLUG**` (défaut `vis-a-bois`) pour `lookup-order-by-email` / paiement invité.

### 4. Edge Functions — déploiement

- **fixa-pro-hub** (`supabase/functions/`) : déployer avec `**--use-api`** ; sans JWT pour `create-payment-intent`, `create-stripe-checkout`, `lookup-order-by-email`, `stripe-webhook`, `send-contact-email`, `update-order-status` **uniquement si** tu utilises la variante fixa (voir conflit ci-dessous).
- **admin-hub-central** : `admin-update-order`, `upload-product-image`, `manage-categories`, `update-all-stock`, `get-users-emails`, `**update-order-status`** — en prod, `**update-order-status` et `admin-update-order` doivent correspondre à la version du repo qui fait foi pour n8n** (en pratique **admin-hub-central** pour `update-order-status`).

**Conflit de noms :** `**update-order-status`** et `**admin-update-order**` existent dans **fixa-pro-hub** et **admin-hub-central**. Un même projet Supabase ne peut avoir **qu’une** version par nom : le **dernier `supabase functions deploy` écrase** l’autre. **Ordre recommandé pour la prod 3K :** déployer d’abord les fonctions **fixa** (Stripe, webhook, lookup, GDPR, etc.), puis déployer `**update-order-status`** et `**admin-update-order**` depuis **admin-hub-central** pour rester aligné n8n (`VAB_API_KEY`, `message_id`, `mail_type`).

### 5. Front storefront (Railway `**vis-a-bois-production`** ou équivalent)

- Branche git `**main**` (ou branche de release) à jour après merge depuis `**staging**`.
- Variables **build** : `VITE_SUPABASE_URL=https://lqsbsinycyewdvdtbruy.supabase.co`, `VITE_SUPABASE_PROJECT_ID=lqsbsinycyewdvdtbruy`, `VITE_SUPABASE_PUBLISHABLE_KEY` = clé **publishable** prod, **`VITE_STRIPE_PUBLISHABLE_KEY_LIVE`** et **`VITE_STRIPE_PUBLISHABLE_KEY_TEST`** (recommandé ; repli `**VITE_STRIPE_PUBLISHABLE_KEY**` = live si une seule clé), `VITE_SITE_ENVIRONMENT_NAME=production` (ou libellé voulu).
- **Nouveau build** après toute modification des `VITE_*` (pas seulement restart).

### 6. Admin (Railway `**admin-hub-production`** ou équivalent)

- Même merge `**staging` → `main**` sur `**admin-hub-central**`.
- `VITE_SUPABASE_URL` / clé anon **publishable** pointant vers `**lqsbsinycyewdvdtbruy**`, plus **`VITE_STRIPE_PUBLISHABLE_KEY_LIVE`** / **`_TEST`** alignés sur la vitrine prod (voir section *Front-end*).

### 7. Après déploiement

- Connexion prod, commande test **carte live** ou montant minimal, webhook Stripe (logs Supabase + Stripe Dashboard).
- Parcours admin (commande, stock, catégories si concerné).
- **Re-link CLI local** vers **staging** après intervention prod : `**supabase link --project-ref lhrwjnieojuempxjbgql`** depuis chaque repo concerné.

---

## Supabase Edge Functions — secrets (by name)

Set in **each** Supabase project as needed for deployed functions.

### Shared (hosted functions often auto-inject)

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### fixa-pro-hub

- `STRIPE_SECRET_KEY_LIVE` / `STRIPE_SECRET_KEY_TEST` (recommandé ; repli `STRIPE_SECRET_KEY`) et **`STRIPE_WEBHOOK_SECRET_LIVE`** / `_TEST` (repli `STRIPE_WEBHOOK_SECRET`) — voir impl. **`stripe-webhook`** / **`create-payment-intent`**
- `RESEND_API_KEY` — domaine d’envoi **`mail.vis-a-bois.com`** **vérifié** chez Resend (2026-05) ; vérifier séparément que les **`from`** utilisés par les Edge (ex. `contact@vis-a-bois.com` pour `send-contact-email`) sont bien des identités / domaines **autorisés** dans Resend.
- `N8N_WEBHOOK_URL` — **per environment** (points at that env’s n8n webhook) ; **`simulate-order-webhook`** en mode **`preview_only`** ne l’exige pas (PDF / email test admin sans repost n8n)
- `ORDER_UPDATE_API_KEY` — see below
- **`preview-supplier-order-pdf`** : JWT utilisateur + rôle admin (`verify-admin.ts`) — pas de secret dédié

### admin-hub-central

- `RESEND_API_KEY`
- `VAB_API_KEY` — see below
- `SUPABASE_DB_URL` (`manage-categories`)

---

## `ORDER_UPDATE_API_KEY` and `VAB_API_KEY` (same secret value)

The **same shared secret** should be configured in each place, but the **environment variable name differs by repo**:


| Repo                | Edge Function         | Env var name           | How the caller authenticates                             |
| ------------------- | --------------------- | ---------------------- | -------------------------------------------------------- |
| `fixa-pro-hub`      | `update-order-status` | `ORDER_UPDATE_API_KEY` | JSON body field `api_key` must match                     |
| `admin-hub-central` | `update-order-status` | `VAB_API_KEY`          | HTTP header `x-api-key` **or** JSON body field `api_key` |


**Who calls it (from this codebase):**

- **n8n** — `admin-hub-central/docs/n8n_workflow_updated.json` builds HTTP bodies with `"api_key": "{{ $env.VAB_API_KEY }}"` and posts order/document/tracking payloads (`source: "n8n"`, statuses such as `confirmed`, `delivery_note_received`, `invoice_received`, `in_delivery`). Those workflows target whichever Supabase **function URL** is configured for that environment (must match the project where the corresponding secret is set).
- **Not** called from the React admin/store apps for normal UX: those use `admin-update-order` and `simulate-order-webhook` via `supabase.functions.invoke`, not the shared `api_key` on `update-order-status`.

**Operational note:** Si les deux dépôts déploient `update-order-status` sur le **même** projet Supabase, **une seule** version du code est active. Pour **3K production**, la version **admin-hub-central** (secret `**VAB_API_KEY`**, champs `message_id` / `mail_type`) est celle attendue par les workflows n8n documentés. La variante **fixa-pro-hub** (`ORDER_UPDATE_API_KEY`, autre contrat) **ne doit pas** être déployée en dernier si n8n pointe vers l’URL de cette fonction. Si jamais les projets Supabase étaient **distincts** par environnement, chaque projet aurait son secret sous le nom attendu par le code déployé là-bas.

---

## External tools — summary

### Stripe

- **Test** and **live** used appropriately by environment.
- **Different webhooks** per environment (each Supabase project: endpoint `https://<project-ref>.supabase.co/functions/v1/stripe-webhook` with its own signing secret in `STRIPE_WEBHOOK_SECRET`).
- Snapshot détaillé (CLI `supabase` + `stripe`, digests secrets, compte `acct_*`) : `[fixa-pro-hub/scripts/migration-3k/STRIPE_SUPABASE_CLI_REFERENCE.md](scripts/migration-3k/STRIPE_SUPABASE_CLI_REFERENCE.md)` — régénérer avec les commandes en tête de ce fichier.
- **Compte Stripe live (doc CLI snapshot 2026-04-10) :** aligné sur **3K-Négoce** — `acct_1THNP0CLf4nTxgku`, préfixe clés `51THNP0CLf4nTxgku`, email métier documenté `admin@3k-negoce.com` ; aligner **`VITE_STRIPE_PUBLISHABLE_KEY_LIVE`** / **`_TEST`** (et repli `**VITE_STRIPE_PUBLISHABLE_KEY**`) sur le **même** compte Stripe que les secrets `STRIPE_*` Supabase.

### n8n

- **Per environment**; discover instances via **Railway** (CLI or dashboard) within project `7e8dc729-5d6f-4558-acc4-1c683169493d`.
- Supabase Edge Functions use `N8N_WEBHOOK_URL` to **call out** to n8n where implemented (e.g. fulfillment); n8n **calls back** into `update-order-status` with `api_key` as above.
- **Commande payée → fournisseur (workflow Webhook minimal) :** le nœud Gmail envoie vers **`$('Webhook').item.json.body.supplier.email`** (= champ admin **Email principal (contact)** / `supplier_settings.email`). L’expéditeur est le **compte Gmail OAuth** configuré dans n8n ; une **réponse** du fournisseur va en principe vers ce compte, **pas** automatiquement vers `contact@luceka.com` sauf si c’est la même adresse / alias ou si **Reply-To / Cc** est ajouté dans le workflow.
- **Pas de « forward » du mail fournisseur au client :** le client reçoit un **nouvel** email via Resend lors des changements de statut (`send-order-status`), pas une copie brute du message Alsafix. Le flux ARC/BL/facture passe par n8n → HTTP **`update-order-status`** (version admin).
- **Confirmation commande payée (client) :** depuis **2026-05-23**, **`stripe-webhook`** et **`simulate-order-webhook`** envoient aussi un **email HTML Resend** via `supabase/functions/_shared/send-order-confirmation-email.ts` (tableau articles + ligne livraison + totaux HT/TTC). **`from`** = `supplier_settings.customer_service_email` (repli `supplier_settings.email`) ; **`to`** = email client ; **`bcc`** = `supplier_settings.status_email`. Ce flux est **distinct** du mail n8n/Gmail vers le fournisseur (`supplier.email`) — l’ancien symptôme « email client sur une seule ligne » venait de l’absence de cet HTML Resend à la confirmation (n8n seul ou texte brut).

### Resend

#### Domaine d’envoi vérifié — `mail.vis-a-bois.com` (dashboard Resend, 2026-05)

- **Statut :** **Verified** — message dashboard : *« Domain verified: Your domain is ready to send emails. »*
- **Région Resend :** **Ireland** (`eu-west-1`).
- **Réception :** option **Enable Receiving** désactivée (domaine utilisé pour l’**envoi** transactionnel uniquement).
- **Chronologie (UTC affichée Resend) :** domaine ajouté **2026-05-13 ~15:17** ; **DNS verified** **2026-05-14 ~10:00** ; **Domain verified** **2026-05-14 ~10:05**.
- **Enregistrements DNS (onglet Records, tous *Verified*) :**
  - **DKIM (vérification domaine) :** type **TXT**, nom **`resend._domainkey.mail`**, valeur publique `p=MIGfMA0GCSqG…` (clé DKIM Resend — ne pas recopier la clé complète ici ; source de vérité = dashboard Resend / export DNS).
  - **Envoi (SPF + MX) :** **Enable Sending** activé — **MX** hôte **`send.mail`** → cible type **`feedback-smtp.…amazonses.com`**, priorité **10** ; **TXT** hôte **`send.mail`**, contenu **`v=spf1 include:…amazonses.com ~all`** (infrastructure d’envoi Resend / SES).

Les adresses **`from`** des Edge (ex. sous-domaines de **`vis-a-bois.com`** ou **`mail.vis-a-bois.com`**) doivent rester **alignées** sur les domaines / identités autorisés dans Resend et sur **`supplier_settings`** (admin).

- **Emails « statut commande » au client :** Edge partagé `**admin-hub-central/supabase/functions/_shared/send-order-email.ts**` — API `https://api.resend.com/emails`, secret **`RESEND_API_KEY`** sur le projet Supabase où sont déployées **`admin-update-order`** et **`update-order-status`** (version admin). **`from`** = `supplier_settings.customer_service_email` ; **`to`** = `orders.user_email` ; **`bcc`** = `supplier_settings.status_email`. Le domaine de cette adresse **`from`** doit être **vérifié** dans Resend (ex. utiliser une adresse sous **`mail.vis-a-bois.com`** ou un domaine équivalent validé).
- **Email « confirmation commande payée » (client, fixa) :** **`supabase/functions/_shared/send-order-confirmation-email.ts`** — appelé depuis **`stripe-webhook`** (paiement Stripe) et **`simulate-order-webhook`** (renvoi admin). Même secret **`RESEND_API_KEY`** sur le projet Supabase **fixa** (`lqsbsinycyewdvdtbruy` en prod). HTML multi-lignes (articles, frais de livraison, totaux, adresse).
- **Contact vitrine :** `**send-contact-email**` (fixa) utilise un **`from` fixe** `Vis-à-Bois <contact@vis-a-bois.com>` — vérifier que ce domaine / identité est bien autorisé dans Resend (distinct de `mail.vis-a-bois.com` si besoin d’un second domaine vérifié).
- **CLI :** `npx resend-cli@latest whoami | doctor | domains list` après authentification (voir *Diagnostic CLI* ci-dessus).

### GitHub

- Repos: `3K-Negoce-Organisation/fixa-pro-hub`, `3K-Negoce-Organisation/admin-hub-central`.
- **No CI/workflows** in use.

---

## Commande payée — frais de port, PDF et emails

**Contexte incident prod (2026-05-23) :** commande **`VIS-202605-QGGC41`** — ligne produit **12,13 € HT**, **Total HT affiché 22,13 €**. Le total en base était **correct** : **`orders.total_ht`** et **`orders.total_ttc`** incluent **produits + frais de port** ; l’écart **10,00 € HT** (= **12 € TTC** de port) n’était **pas affiché** dans le PDF, le suivi commande ni l’email client.

### Règles frais de port (boutique)

| Paramètre | Valeur | Fichier |
|-----------|--------|---------|
| Seuil livraison offerte (produits TTC) | **150 €** | `src/lib/shipping.ts` |
| Frais de port si sous le seuil | **12 € TTC** (= **10 € HT** à TVA 20 %) | idem |
| Calcul checkout / Stripe | `orderGrandTotals(productsHT)` | `shipping.ts`, `CartPage.tsx`, Edge `create-payment-intent` / `create-stripe-checkout` |

**Important :** ne pas confondre « total produits seuls » et « total commande » — comparer toujours la somme des lignes **plus** la ligne livraison au **`total_ht`** en base.

### Détail affiché (état actuel — 2026-05-23)

| Canal | Comportement |
|-------|----------------|
| **Panier / paiement** | Sous-total produits + frais de livraison + total TTC (encart « Paiement sécurisé ») |
| **Suivi commande** | Liste « Mes commandes » et récap : **montant principal en TTC** (ex. 26,55 €) ; détail sous-total produits HT + frais de port HT + Total HT + **Total TTC** — `OrderTrackingPage.tsx`, `splitOrderTotalsFromItems` dans `shipping.ts` |
| **Mon compte** | Montant commande affiché en **TTC** (mobile) |
| **PDF bon de commande** | Voir **[Structure PDF](#structure-pdf-bon-de-commande)** ci-dessous |
| **Email client (confirmation)** | HTML Resend : articles + livraison ; **Total TTC en gras**, Total HT en second — `_shared/send-order-confirmation-email.ts` |
| **Payload n8n** | `totals.products_ht`, `totals.shipping_ht`, `ht`, `ttc` ; items avec `code_alsafix` si renseigné |

### Structure PDF bon de commande

Génération centralisée : **`supabase/functions/_shared/generate-order-pdf.ts`** (appelée par **`stripe-webhook`** et **`simulate-order-webhook`**).

| Zone | Contenu |
|------|---------|
| **En-tête** | Date, n° commande, **`N° clt …`** (sans libellé `clt NOM CLIENT`) |
| **Tableau (bleu)** | Colonnes : Code, Désignation, Qté, **Tarif UV.**, Prix total HT net — **produits uniquement** (pas de ligne « Frais de livraison ») ; largeur pleine, alignée avec la barre verte |
| **Logo** | Chargé via `_shared/site-logo.ts` (bucket `site-logos`, magic bytes PNG/JPEG, WebP converti) — position **gauche**, au-dessus de la date |
| **Téléphone client** | Sous l’adresse de livraison (`Tél. …`) — `_shared/order-customer-phone.ts` (profil → Stripe `billing_details` selon `stripe_mode` dans `orders.notes`) |
| **Colonne Code** | **`products.code_alsafix`** uniquement (référence Alsafix) — **jamais** l’UUID produit en repli ; cellule **vide** si le code n’est pas renseigné en admin |
| **Synthèse sous le tableau** | Total HT / TVA (20 %) / **TOTAL TTC** sur le **seul montant produits** (hors frais de port boutique) |
| **Pied** | Adresse de livraison, mention « Livraison direct sans BL chiffré » |

**Exemple chiffré (commande type) :** produit **12,13 € HT** → Total HT 12,13 € + TVA 2,43 € → **TOTAL TTC 14,56 €** sur le PDF fournisseur. Les **frais de port** (ex. 10 € HT / 12 € TTC) restent côté boutique (panier, suivi client, email Resend) — **absents** du PDF n8n/Alsafix.

**PDF fournisseur vs client :** le PDF joint au webhook **n8n** (`pdf_file` dans `stripe-webhook` / `simulate-order-webhook`) est destiné au **fournisseur** ; l’**email client** Resend (`send-order-confirmation-email.ts`) continue d’afficher produits + frais de port + total commande payée.

### Code Alsafix (`code_alsafix`)

| Élément | Détail |
|---------|--------|
| **Champ admin** | **Paramètres produit** → « Code ALSAFIX » — `AdminProductsPage.tsx`, colonne `products.code_alsafix` |
| **Enrichissement PDF** | `_shared/alsafix-code.ts` : `enrichItemsWithAlsafixCodes()` relit `products.code_alsafix` par `product_id` avant génération ; `alsafixCodeOnly()` filtre les UUID |
| **Repli interdit** | Ne pas utiliser `product_id` / UUID dans la colonne Code du PDF — si absent en base, la cellule reste vide |
| **Correction rétroactive** | Renseigner le code en admin puis **Renvoyer** la commande (`simulate-order-webhook`) |

### PDF fournisseur — calculs Qté / Tarif UV

Logique centralisée : **`supabase/functions/_shared/order-supplier-quantity.ts`** (utilisée par **`generate-order-pdf.ts`**, **`preview-supplier-order-pdf`**, **`stripe-webhook`**, **`simulate-order-webhook`**).

Données prix / conditionnement : **`products.purchase_price_ht`**, **`products.box_quantity`**, **`products.unite_de_vente`** (enrichissement **`alsafix-code.ts`** par `product_id` ou `code_alsafix`). Défaut **`unite_de_vente = 100`** (lot Alsafix standard) ; **`1`** pour kits **`KIT*`** et accessoires **`TOOL*`.

| Type produit | Détection | Qté (colonne PDF) | Tarif UV. | Prix total HT net |
|--------------|-----------|-------------------|-----------|-------------------|
| **Kit** | `code_alsafix` commence par **`KIT`** | Qté panier | `(purchase_price_ht / box_quantity) × unite_de_vente` (souvent `unite_de_vente = 1`) | Qté panier × `purchase_price_ht` |
| **Accessoire** | `code_alsafix` commence par **`TOOL`** | Qté panier | idem kit (`unite_de_vente = 1`) | idem |
| **Boîte** | `variant_id` **sans** `-unit` et `box_quantity > 1` | Qté panier × `box_quantity` | `(purchase_price_ht / box_quantity) × unite_de_vente` | Qté panier × `purchase_price_ht` |
| **Achat unitaire** | `variant_id` se termine par **`-unit`** | Qté panier | idem boîte | Qté × prix unitaire (PA/boîte si multi) |
| **Autre** (`box_quantity` = 1, non kit/tool) | défaut | Qté panier | `purchase_price_ht × unite_de_vente` | Qté × `purchase_price_ht` |

**Pièges documentés :**

- Ne **pas** utiliser `variant_title === "Unité"` pour le PDF fournisseur — seul le suffixe **`variant_id` … `-unit`** compte (`isSupplierUnitPurchase`).
- Un kit avec `box_quantity` renseigné en base **ne doit pas** déclencher la formule boîte : **`isSupplierKit`** prime.
- **Tarif UV :** un seul arrondi monétaire **en fin de formule** (pas sur le prix unitaire intermédiaire) — ex. VBF30013 : `(5,50 / 1000) × 100 = 0,55 €`.
- Si `purchase_price_ht`, `box_quantity` ou `unite_de_vente` est faux en base, le calcul est cohérent mais le PDF affichera des montants incorrects — corriger **`products`** en admin.

### Pictos caractéristiques (fiche produit)

| Élément | Détail |
|---------|--------|
| **Affichage** | Sous l’image principale — `ProductDetailPage.tsx` |
| **Composant** | `src/components/products/CharacteristicPicto.tsx` |
| **Config** | `src/lib/picto-display.ts` — lit `product_characteristic_icons` (par `site_id`) |
| **Admin** | `/categories` dans **admin-hub-central** — upload + éditeur (taille, texte inside/outside, offsets) ; doc détaillée dans [`../admin-hub-central/AI-WORKSPACE-CONTEXT.md`](../admin-hub-central/AI-WORKSPACE-CONTEXT.md) § *Pictos caractéristiques* |
| **Migration** | `20260529120000_picto_display_layout.sql` |

### Recherche catalogue

`src/lib/products.ts` — `fetchProducts()` filtre sur **`title`**, **`code_alsafix`**, **`designation_fr`**, **`handle`** (`.or()` PostgREST). Route vitrine : `/produits?q=…`.

### Simulation commande (admin)

| Élément | Détail |
|---------|--------|
| **Dépôt** | `admin-hub-central` — route **`/simulation-commande`**, menu « Simulation commande » |
| **Edge Function** | **`preview-supplier-order-pdf`** (déployée depuis **fixa-pro-hub**) — auth admin (`verify-admin.ts`) |
| **Comportement** | Catalogue : **filtre catégorie** (`categories` du site) + recherche texte (code, titre, catégorie) ; panier sans choix boîte/unité — conditionnement via **`products.box_quantity`** (`simulationVariantForProduct` dans `supplierPdf.ts` : `variant_id` = `product_id`, pas de suffixe `-unit`) ; champs client/livraison ; **Calculer** / **Générer PDF** |
| **Exclusions** | Pas de Stripe, pas d’email Resend, pas de webhook n8n, pas d’insertion `orders` |
| **UI détail** | Tableau calculs : colonnes BDD **`purchase_price_ht`**, **`box_quantity`**, **`unite_de_vente`** (encadré vert) ; badge **(kit)** / **(accessoire)** si préfixe **`KIT`** / **`TOOL`** |
| **Fichiers admin** | `src/pages/SimulationCommande.tsx`, `src/utils/supplierPdf.ts`, route `App.tsx`, menu `AdminSidebar.tsx` |
| **Config Edge** | `supabase/config.toml` — entrée `[functions.preview-supplier-order-pdf]` (JWT admin) |

**Déploiement :** après modification de `_shared/order-supplier-quantity.ts` ou `generate-order-pdf.ts`, redéployer sur **staging + prod** : `preview-supplier-order-pdf`, `simulate-order-webhook`, `stripe-webhook` (voir `./scripts/3k.sh deploy-edge-staging-prod` ou commandes dans *À retenir CLI*).

### Modules partagés Edge (fixa)

| Fichier | Rôle |
|---------|------|
| `supabase/functions/_shared/order-totals.ts` | `sumItemsHT`, `splitOrderTotals(items, totalHT)` → `{ productsHT, shippingHT }` |
| `supabase/functions/_shared/send-order-confirmation-email.ts` | Envoi Resend HTML à la confirmation |
| `supabase/functions/_shared/generate-order-pdf.ts` | Génération PDF (tableau, **Total HT / TVA / TOTAL TTC fournisseur**, logo, téléphone) |
| `supabase/functions/_shared/alsafix-code.ts` | `alsafixCodeOnly`, `enrichItemsWithAlsafixCodes` (+ `purchase_price_ht`, `box_quantity`, **`unite_de_vente`**) |
| `supabase/functions/_shared/order-supplier-quantity.ts` | `resolveUniteDeVente`, `isSupplierKit`, `isSupplierAccessory`, `supplierTarifUv`, `supplierElementQuantity`, `supplierPurchaseLineTotal` |
| `supabase/functions/_shared/order-customer-phone.ts` | Téléphone client pour le pied de page PDF |
| `supabase/functions/_shared/site-logo.ts` | Logo site dans le PDF |
| `supabase/functions/preview-supplier-order-pdf/index.ts` | Simulation admin (panier → PDF + breakdown JSON) |

### Régénérer PDF / email pour une commande existante

Depuis **admin-hub-central** → **Commandes** → action **Renvoyer** : appelle **`simulate-order-webhook`** sur le projet Supabase fixa — régénère le PDF dans le bucket **`order-documents`**, met à jour `orders.documents`, renvoie l’email HTML client et reposte vers n8n. **À utiliser** pour corriger une commande déjà payée (ex. **`VIS-202605-QGGC41`**) sans repasser par Stripe.

### Déploiement (2026-05-23)

| Cible | Action |
|-------|--------|
| **Supabase prod** `lqsbsinycyewdvdtbruy` | `supabase functions deploy stripe-webhook` et `simulate-order-webhook` (incl. `_shared/*`) |
| **Git fixa-pro-hub** | Voir changelog 2026-05-23 (`3cdb075` → `75aae7a` sur **`staging`** / **`main`**) |
| **Railway prod** | Rebuild storefront depuis **`main`** (suivi commande / mon compte — affichage TTC) |

**Prérequis email :** `supplier_settings.customer_service_email` (ou `email`) renseigné en admin ; domaine **`from`** vérifié dans Resend ; secret **`RESEND_API_KEY`** présent sur le projet Supabase fixa prod.

---

## Pages légales & RGPD (storefront **fixa-pro-hub**, branche **`origin/staging`** vérifiée 2026-05)

- **Mentions légales** (`MentionsLegalesPage.tsx`) : éditeur, hébergeur, propriété intellectuelle, responsabilité — **pas** de détail RGPD (données, durées, droits). Ajouter un **lien** vers `/politique-confidentialite` si l’objectif est de renvoyer l’utilisateur.
- **CGV** (`CGVPage.tsx`) : §11 protection des données — résumé + droits partiels + renvoi vers la politique ; **ne couvre pas** seules tout le détail (durées, lieu de stockage, destinataires exhaustifs).
- **Politique de confidentialité** (`PolitiqueConfidentialitePage.tsx`) : couvre **données collectées**, **finalités**, **durées**, **destinataires**, **transferts hors UE**, **droits** + CNIL + sécurité — **point sensible :** le §2 « responsable du traitement » cite encore **Luceka** / `contact@vis-a-bois.fr` alors que mentions + CGV citent **3K-Négoce** — **à harmoniser** pour cohérence juridique.
- **Stockage explicite type « Supabase / UE »** : absent de la politique en libellé direct ; renforcer si besoin audit CNIL.

---

## Remaining details to capture later

- **Alignement `VITE_STRIPE_*` Railway** (fixa + admin) avec le **switch Stripe** (`pk_live` / `pk_test` séparés) ; compléter les **secrets Edge staging** sur `lhrwjnieojuempxjbgql` pour reproduire la prod.

---

## Changelog


| Date       | Change                                                                                                                                                                                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-29 | **Pictos fiche produit :** affichage configurable (taille, texte inside/outside, offsets) depuis `product_characteristic_icons` ; `CharacteristicPicto.tsx`, `picto-display.ts`. **Recherche :** code Alsafix + désignation + handle (`products.ts`). **PDF fournisseur :** totaux HT/TVA/TTC rétablis sous le tableau ; **`unite_de_vente`** dans enrichissement + breakdown simulation. **Migration** `20260529120000_picto_display_layout.sql`, `20260526120000_products_unite_de_vente.sql`. **Git** fixa **staging** → **main**. **Edge** staging + prod : `preview-supplier-order-pdf`, `stripe-webhook`, `simulate-order-webhook`. **Railway** rebuild vitrine au push. Voir aussi admin changelog 2026-05-29 (éditeur pictos). |
| 2026-05-26 | **fixa-pro-hub — FAQ :** boutique ouverte au public (inscription en ligne) ; frais de livraison alignés sur le panier (seuil 150 € TTC / 12 € TTC forfait). **Paiement :** métadonnées Stripe panier volumineux (chunk), resync panier au checkout. **Git** **staging** → **main**. **Edge** deploy paiement staging + prod. **Railway** rebuild. |
| 2026-05-26 | **fixa-pro-hub — alignement panier / simulation :** `normalizeCartLinePricing`, hydratation systématique des prix catalogue, `clientLineTotalTtc` (même règle que admin) ; Edge `checkout-totals` redeploy staging + prod. **Git** **staging** → **main**. |
| 2026-05-26 | **fixa-pro-hub — panier TTC :** totaux panier/checkout basés sur **`products.price_ttc`** (`cartPricing.ts`, `CartContext`, `shipping.orderGrandTotals`) ; Edge `create-payment-intent`, `create-stripe-checkout`, `stripe-webhook` + `_shared/checkout-totals.ts`. **Git** **staging** → **main**. **Edge** deploy staging + prod (3 fonctions paiement). |
| 2026-05-26 | **admin-hub-central — simulation :** total panier client sur **`price_ttc`** (`SimulationCommande`, `supplierPdf.simulationCartTotals`). **Git** **staging** → **main**. |
| 2026-05-23 | **admin-hub-central — prix produits :** `roundMoney` import/formulaire ; migration `20260523150000_round_product_prices_clear_user_carts.sql` (arrondi BDD + `TRUNCATE user_carts`) exécutée staging + prod. |
| 2026-05-23 | **admin-hub-central — simulation :** filtre **catégorie** sur le catalogue (`categories` + `category_id`) ; retrait sélecteur boîte/unité — conditionnement auto **`box_quantity`** ; docs `AI-WORKSPACE-CONTEXT.md` admin. **Git** admin `239eeac`, `6c85186`, `e5dc8a4` (**main**). |
| 2026-05-23 | **fixa-pro-hub — kits PDF :** détection **`KIT`** (sans tiret, ex. `KIT08822`) → Tarif UV = `purchase_price_ht` ; docs + changelog. **Git** fixa `ff5e6d1`/`ee376de` (**main**). **Edge** redeploy `preview-supplier-order-pdf`, `simulate-order-webhook`, `stripe-webhook` staging + prod. |
| 2026-05-23 | **fixa-pro-hub + admin-hub-central — simulation commande :** page admin `/simulation-commande` ; Edge **`preview-supplier-order-pdf`** (panier → calculs + PDF sans paiement/mail/n8n). **Calculs PDF kits :** `code_alsafix` préfixe **`KIT`** → Tarif UV = `purchase_price_ht` (pas ×100). Modules `_shared/order-supplier-quantity.ts`, téléphone/logo PDF. **Git** fixa `6fa6540`/`b959ffd`, admin `3353ca2`/`632a547`. **Edge** deploy staging + prod : `preview-supplier-order-pdf`, `simulate-order-webhook`, `stripe-webhook`. |
| 2026-05-23 | **fixa-pro-hub — conditionnement boîte (client) :** affichage « Boîte de N vis » dans panier (drawer + page), suivi commande et email confirmation Resend ; `boxQuantity` sur `CartItem` + enrichissement `products.box_quantity` (Edge `_shared/box-quantity.ts`). **Git** staging → merge **main**. **Edge** deploy `stripe-webhook` + `simulate-order-webhook` staging puis prod. |
| 2026-05-23 | **fixa-pro-hub — PDF fournisseur :** retrait ligne et totaux **frais de port** du bon de commande n8n/Alsafix (`generate-order-pdf.ts` — montants produits seuls) ; email client et suivi boutique inchangés. |
| 2026-05-23 | **fixa-pro-hub — PDF commande :** module `_shared/generate-order-pdf.ts` + `_shared/alsafix-code.ts` ; colonne **Code = `code_alsafix` uniquement** (pas d’UUID) ; tableau pleine largeur aligné sur barre **TOTAL TTC** ; lignes **Total HT / TVA 20 % / TOTAL TTC** ; enrichissement Alsafix via `product_id`. **Git** `432b122` → merge `main` `75aae7a`. **Edge prod** deploy. |
| 2026-05-23 | **fixa-pro-hub — totaux commande :** montant **principal en TTC** (suivi, mon compte, PDF barre verte, email confirmation) ; détail **TVA** sous le tableau PDF. **Git** `3bf6c8c` / `5c8009b` → merge `main` `df710c8` / `d7b65d7`. |
| 2026-05-23 | **Docs :** `AI-WORKSPACE-CONTEXT.md` versionné à la **racine du dépôt fixa-pro-hub** (source de vérité assistants) ; section commande payée / frais de port / PDF / email ; changelog 2026-05-23. |
| 2026-05-23 | **fixa-pro-hub — commande payée :** frais de port **détaillés** (PDF ligne livraison, suivi commande sous-total + port, email HTML Resend à la confirmation) ; retrait **`clt NOM`** du PDF ; modules `_shared/order-totals.ts` + `send-order-confirmation-email.ts` ; payload n8n `products_ht` / `shipping_ht`. **Incident prod** `VIS-202605-QGGC41` documenté (total 22,13 € = 12,13 + 10 HT port). **Git** : `3cdb075` staging → merge `main` `0057b94`. **Edge prod** `lqsbsinycyewdvdtbruy` : deploy `stripe-webhook` + `simulate-order-webhook`. |
| 2026-05-14 | **Resend :** domaine d’envoi **`mail.vis-a-bois.com`** **vérifié** (DKIM `resend._domainkey.mail`, SPF/MX `send.mail`, région `eu-west-1`, réception désactivée). Détail consigné dans *External tools → Resend* ; inventaire prérequis Resend passé en **Présent** pour le domaine. |
| 2026-05-13 | **Sync CLI → `.env` :** script **`scripts/sync-cli-env-3k.sh`** + commande **`./scripts/3k.sh sync-cli-env`** ; écrit `scripts/fixa-pro-hub.env`, `scripts/admin-hub-central.env`, `scripts/railway-services-3k.env`, `scripts/.generated/railway-vite-env.txt` ; lien Railway stable sous **`scripts/.generated/railway-cwd`**. **`load-3k-env.sh`** : `RAILWAY_API_TOKEN`, zsh, source optionnelle **`railway-services-3k.env`**. **Railway CLI 4.x** documenté. **Audit Stripe / staging :** tableau des manques `VITE_STRIPE_*` Railway (admin + vitrine) ; **staging Supabase** sans secrets métier listés au moment de la vérif ; doc Edge **`STRIPE_*_LIVE` / `_TEST`**. |
| 2026-04-09 | Initial file: repos, Supabase refs, Edge secrets, deployment rules.                                                                                                                                                                                                                          |
| 2026-04-09 | Railway project ID + service naming (`vis-a-bois-<ENV>`, `admin-hub-<ENV>`); Stripe test/live + distinct webhooks; n8n per env + Railway CLI; Resend unverified; GitHub repos + no CI; Lovable deprecated; documented `ORDER_UPDATE_API_KEY` / `VAB_API_KEY` parity and callers (n8n vs UI). |
| 2026-04-09 | Documented workspace `docs/PRESENTATION-SCHEMA.md` (presentation diagrams; links here).                                                                                                                                                                                                      |
| 2026-04-09 | Clarified *admin-central-hub* vs folder name `admin-hub-central`.                                                                                                                                                                                                                            |
| 2026-04-09 | Canonical Supabase refs (develop/staging/production); moved DB URLs, passwords, and access token out of this file into gitignored `supabase-refs.env` + per-env DB password vars.                                                                                                            |
| 2026-04-09 | `compare-supabase-3env.sh` + `compare-supabase-3env.mjs`: snapshot `public` schema + diff Edge Function `ezbr_sha256` across develop/staging/production; report under `.generated/`.                                                                                                         |
| 2026-04-09 | Admin hub : travail ciblé **staging** documenté ; retrait Lovable côté admin ; rôles admin core team via migration `20260409160000_core_team_admin_roles.sql`.                                                                                                                               |
| 2026-04-09 | Script `sync-prod-to-staging` (Auth map, copie `public`, buckets Storage) + `PROD_TO_STAGING_INVENTORY.md`.                                                                                                                                                                                  |
| 2026-04-09 | Correction refs : staging = branche DB ref `**lhrwjnieojuempxjbgql`** partout (fixa-pro-hub, admin-hub, scripts, docs) ; `**gcyxfuxywratoyjnxurf`** retiré (ancien projet / erreur doc).                                                                                                     |
| 2026-04-09 | Checklist **mise en production** (Postgres, secrets, Edge fixa + admin, conflit `update-order-status`, Railway `VITE_*`). Exécution prod : migration `storefront_public`, déploiement de toutes les Edge Functions fixa puis admin sur `lqsbsinycyewdvdtbruy`.                               |
| 2026-04-09 | Railway : workspace canonique `**3k-negoce_workspace`** ; périmètre explicite **3K-Négoce** (pas pimimac / luceka) ; exemple `railway link -w … -p …`.                                                                                                                                       |
| 2026-04-09 | Script `**railway-use-3k-workspace.sh`** : bascule / lien CLI vers projet 3K (vérif workspace + `railway link`).                                                                                                                                                                             |
| 2026-04-09 | `**docs/ORDER_FLOW.md`** : flux bout en bout (fixa, stripe-webhook, n8n, deux implémentations `update-order-status`), vérif CLI prod (`secrets list`, `functions list`, `compare-supabase-3env`).                                                                                            |
| 2026-04-09 | Section **« Où mettre les tokens »** : `.generated/supabase-refs.env`, `.generated/railway-3k.env`, `.generated/github-3k.env` ; admin `.env` = Vite local.                                                                                                                                  |
| 2026-04-12 | **vis-a-bois.com** = dépôt canonique `[fixa-pro-hub.git](https://github.com/3K-Negoce-Organisation/fixa-pro-hub.git)` uniquement (pas admin-hub-central) ; lien complet dans le tableau des repos.                                                                                           |
| 2026-04-12 | `**sites.storefront_public`** : ouverture publique fixa-pro-hub (garde vitrine, invité Stripe, `lookup-order-by-email`, inscription conditionnelle + email de confirmation) ; toggle admin Paramètres fournisseur ; migration alignée admin-hub-central.                                     |
| 2026-04-12 | Supabase : **ne plus utiliser** les projets Luceka `aueuxlqtueoqjxsdemeu` et `giguuzfnjkkqdeteujwc` pour 3K ; **staging = `lhrwjnieojuempxjbgql`**, **production = `lqsbsinycyewdvdtbruy`** ; note CLI `login` + `link` sur l’org 3K-Négoce.                                                 |
| 2026-04-12 | Section **« À retenir pour la CLI Supabase »** : `SUPABASE_ACCESS_TOKEN_3K` dans `supabase-refs.env` ou `.env` ; `export SUPABASE_ACCESS_TOKEN=…` ; `db push` = mot de passe Postgres à jour (`-p` / `SUPABASE_DB_PASSWORD_`*) ; `functions deploy` = token seul ; exemple de commandes.     |
| 2026-04-12 | Règle **#5 (workflow)** : après plan approuvé ou corrections demandées, **exécuter** les commandes Supabase (migrations / fonctions), pas seulement les documenter ; secours SQL Editor si `db push` impossible.                                                                             |
| 2026-04-12 | **Branches `develop` / `staging`** créées depuis **`main` le 3 avril 2026** : migrations **avant `20260403…`** = historique Git (pas de rejouer si bases déjà alignées) ; **8** fichiers **`20260403…` et après** = delta post-fork ; état des lieux (42 fichiers, tableau, refs Supabase, notes prod/staging). |
| 2026-04-09 | **Staging** : `**supabase db push --linked --include-all --yes**` réussi sur `lhrwjnieojuempxjbgql` (NOTICE idempotentes). **CLI** : rappel contournements si `-p` / SASL (`SUPABASE_DB_PASSWORD`, CLI à jour, `--db-url` direct + encodage URI). **Alignement** : note rapport 3 env (`site_themes` text vs varchar staging/prod ; Edge hashes staging ≠ prod). |
| 2026-04-09 | **Production** : réécriture des hosts Storage en base (`fix-production-storage-url-hosts.sql` + script `rewrite-supabase-storage-hosts.mjs --target=production`) ; déploiement Edge **fixa-pro-hub** (sauf `update-order-status`) puis **admin-hub-central** sur `lqsbsinycyewdvdtbruy` pour aligner staging et garder **n8n** sur la variante admin (`VAB_API_KEY`). |
| 2026-04-13 | **Storage prod vide** : script **`copy-staging-storage-to-prod.mjs`** (staging `lhrwjnieojuempxjbgql` → prod `lqsbsinycyewdvdtbruy`) ; SQL **`rewrite-prod-urls-staging-host-to-production.sql`** pour host staging → prod en base. Documenté dans cette page (ordre d’exécution, limite « seulement ce qui existe sur staging »). |
| 2026-04-13 | **Workflow** : nouvelle règle **#5** — mettre à jour le tableau **Changelog** à **chaque push `staging`** et **`main`** sur **fixa-pro-hub** / **admin-hub-central** (et ops infra notables le même jour si besoin). Ancienne règle CLI Supabase renumérotée **#6**. **Last updated** aligné sur cette consigne. |
| 2026-04-13 | **Synthèse journée — correctifs & outils** : (1) **CLI `db push`** — doc `SUPABASE_DB_PASSWORD` / CLI à jour / `--db-url` si SASL-pooler ; (2) **SQL prod** `fix-production-storage-url-hosts.sql` — `UPDATE` conditionnels si colonnes absentes ; (3) **`rewrite-supabase-storage-hosts.mjs`** — mode **`--target=production`**, liste **`DEFAULT_LEGACY_REFS`** + staging comme source ; (4) **Images** — précision *host prod + `not_found`* = objet absent du bucket (chemins admin `upload-product-image` vs fixa racine) ; (5) **Edge prod** `lqsbsinycyewdvdtbruy` — deploy fixa (sans `update-order-status`) puis admin (n8n / `VAB_API_KEY`) ; (6) **Storage** — `copy-staging-storage-to-prod.mjs` + `.sh`, copie effective **18** fichiers vers buckets prod vides ; (7) **`rewrite-prod-urls-staging-host-to-production.sql`** exécuté sur prod ; (8) **`STORAGE_BUCKETS_3K.txt`** + section **Copie staging → prod** ; (9) **`supabase link`** fixa → staging après interventions prod. |
| 2026-04-13 | **Promo v2 (staging)** : plan “promo produit % + articles offerts” implémenté dans **fixa-pro-hub** (admin + storefront + panier/checkout) ; nouvelles colonnes `products` (`promo_discount_percent`, `promo_gift_product_id`, `promo_gift_quantity`, `promo_label`) ajoutées via migration `20260413213000_products_promo_discount_and_gifts.sql` dans **fixa-pro-hub** et **admin-hub-central** ; application staging faite via `supabase db query --linked -f ...` (fallback car `db push --linked` échoue SASL mot de passe `postgres`). |
| 2026-04-29 | **Promo v2 (production)** : même migration `20260413213000_products_promo_discount_and_gifts.sql` appliquée sur **`lqsbsinycyewdvdtbruy`** via `supabase db query --linked -f ...` ; vérification `information_schema` : les 4 colonnes `promo_*` présentes sur `public.products`. **CLI** : `fixa-pro-hub` re-lié à **staging** `lhrwjnieojuempxjbgql` après l’opération prod. **Suite** : déployer le front prod (Railway / pipeline) si le code promo v2 n’était pas encore en prod ; smoke test `/promos`, panier cadeau, checkout Stripe. |
| 2026-05-06 | **Script** : `verify-3k-tools.sh` + `verify-3k-tools.env.example` — vérifs secrets Supabase (staging/prod), Railway, Resend (`doctor`), URL n8n (GET) ; guide `--guide` des fichiers `.env`. Réf. dans *Diagnostic CLI* et `RUNBOOK_3K.txt`. |
| 2026-05-06 | **Docs** : ajout `[docs/ORDER_WORKFLOW_ACTORS.md](docs/ORDER_WORKFLOW_ACTORS.md)` (diagrammes Mermaid acteurs + flux) ; lien depuis `docs/ORDER_FLOW.md`. |
| 2026-05-06 | **CLI / tokens** : section *Diagnostic CLI* — `401` / `403` / mauvais compte sur `supabase secrets list` ; absence fréquente de `railway-3k.env` ; Stripe CLI Homebrew ; **Resend CLI** `npx resend-cli@latest` ; clés Resend surtout côté **secrets Supabase**, pas dans `supabase-refs.env` ni `.env` Vite locaux. |
| 2026-05-06 | **Emails** : précision Resend (`from` = `customer_service_email`, `to` / `bcc`), contact fixe `send-contact-email` ; n8n minimal → `supplier.email` ; pas de forward brut fournisseur → client ; flux statut = email généré Resend. |
| 2026-05-06 | **Stripe** : rappel compte live **3K-Négoce** (`acct_1THNP0CLf4nTxgku`, doc `STRIPE_SUPABASE_CLI_REFERENCE.md`) + alignement `VITE_STRIPE_*` / secrets. |
| 2026-05-06 | **Légal staging** : audit mentions / CGV / politique (RGPD détaillé surtout politique ; incohérence Luceka vs 3K-Négoce dans la politique). |
| 2026-04-29 | **Git fixa-pro-hub** : commit `feat(promo): …` sur **`staging`**, merge **`staging` → `main`**, push **`origin/main`** (`cb01d62`) pour déclencher le build / déploiement Railway production du storefront embarqué. Fichiers locaux non versionnés (scripts migration-3k supplémentaires, `.env`, autres migrations SQL hors commit) restent en working tree uniquement. |
| 2026-05-07 | **Tableau inventaire prérequis** : section *Inventaire prérequis — CLI, déploiement, inspection* avec statuts Présent / Partiel / Absent (sans valeurs secrètes) + synthèse des manques doc/infra. |


