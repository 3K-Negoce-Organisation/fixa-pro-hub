# Configuration Multi-Environnements *** à verifier ****

## Vue d'ensemble

| Environnement | Branche Git | Supabase | Hébergement | URL |
|---------------|-------------|----------|-------------|-----|
| **Development** | `develop` | Lovable Cloud | Lovable | lovable.dev preview |
| **Staging** | `staging` | Projet séparé | Railway | staging.vis-a-bois.com |
| **Production** | `main` | Projet séparé | Railway | www.vis-a-bois.com |

---

## Configuration GitHub

### Branches requises

```bash
# Créer les branches depuis main
git checkout main
git checkout -b develop
git push origin develop

git checkout main
git checkout -b staging
git push origin staging
```

### Secrets GitHub Actions

Configurer dans **Settings → Secrets and variables → Actions** :

#### Secrets globaux
| Secret | Description |
|--------|-------------|
| `RAILWAY_TOKEN` | Token API Railway (depuis Railway Dashboard → Account → Tokens) |

#### Environnement `staging`
| Secret | Description |
|--------|-------------|
| `RAILWAY_SERVICE_ID` | ID du service Railway staging |
| `VITE_SUPABASE_URL` | URL Supabase staging |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé publique Supabase staging |
| `VITE_SUPABASE_PROJECT_ID` | ID projet Supabase staging |

#### Environnement `production`
| Secret | Description |
|--------|-------------|
| `RAILWAY_SERVICE_ID` | ID du service Railway production |
| `VITE_SUPABASE_URL` | URL Supabase production |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé publique Supabase production |
| `VITE_SUPABASE_PROJECT_ID` | ID projet Supabase production |

---

## Configuration Supabase

### Créer les projets

1. **Staging** : `vis-a-bois-staging`
2. **Production** : `vis-a-bois-prod`

### Appliquer les migrations

```bash
# Se connecter au projet staging
supabase link --project-ref <staging-project-id>
supabase db push

# Se connecter au projet production
supabase link --project-ref <prod-project-id>
supabase db push
```

### Secrets Edge Functions

Configurer dans chaque projet Supabase (Dashboard → Settings → Edge Functions → Secrets) :

| Secret | Description |
|--------|-------------|
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (utiliser clé test pour staging) |
| `STRIPE_WEBHOOK_SECRET` | Secret webhook Stripe |
| `N8N_WEBHOOK_URL` | URL webhook n8n |
| `RESEND_API_KEY` | Clé API Resend |
| `ORDER_UPDATE_API_KEY` | Clé API mise à jour commandes |

---

## Configuration Railway

### Créer les services

1. Créer un projet Railway
2. Ajouter 2 services : `vis-a-bois-staging` et `vis-a-bois-prod`
3. Configurer les variables d'environnement dans chaque service

### Variables d'environnement Railway

| Variable | Staging | Production |
|----------|---------|------------|
| `NODE_ENV` | `staging` | `production` |
| `VITE_SUPABASE_URL` | URL staging | URL prod |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé staging | Clé prod |

---

## Workflow de développement

```
┌─────────────┐     PR      ┌─────────────┐     PR      ┌─────────────┐
│   develop   │ ──────────► │   staging   │ ──────────► │    main     │
│  (Lovable)  │             │  (Railway)  │             │  (Railway)  │
└─────────────┘             └─────────────┘             └─────────────┘
       │                           │                           │
       ▼                           ▼                           ▼
┌─────────────┐             ┌─────────────┐             ┌─────────────┐
│  Supabase   │             │  Supabase   │             │  Supabase   │
│    DEV      │             │   STAGING   │             │    PROD     │
└─────────────┘             └─────────────┘             └─────────────┘
```

### Processus

1. **Développement** : Travailler sur Lovable (branche `develop`)
2. **Test** : Créer une PR `develop` → `staging`, merge déclenche le déploiement staging
3. **Production** : Après validation, créer une PR `staging` → `main`, merge déclenche le déploiement prod

---

## Checklist de mise en place

- [ ] Créer les branches Git (`develop`, `staging`)
- [ ] Créer le projet Supabase staging
- [ ] Créer le projet Supabase production
- [ ] Appliquer les migrations sur staging
- [ ] Appliquer les migrations sur production
- [ ] Configurer les secrets Supabase sur staging
- [ ] Configurer les secrets Supabase sur production
- [ ] Créer les services Railway
- [ ] Configurer les variables Railway
- [ ] Ajouter les secrets GitHub Actions
- [ ] Configurer les environnements GitHub (staging, production)
- [ ] Tester le workflow avec une PR vers staging
