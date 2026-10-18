# AGENTS.md

## Cursor Cloud specific instructions

### Isolation — pas de clés de production sur la VM

**Interdit sur la VM Cursor :** `SUPABASE_SERVICE_ROLE_KEY` (prod), `SUPABASE_ACCESS_TOKEN`, toute `sb_secret_…` prod.

- Front / smoke : `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` uniquement.
- Déploiements Supabase (migrations + Edge Functions) = GitHub Actions
  (`Deploy Supabase` sur push `main` si `supabase/**` change) — secret
  `SUPABASE_ACCESS_TOKEN` **uniquement** dans GitHub, jamais sur la VM.
- Écritures d’essai = projet **staging** (`lhrwjnieojuempxjbgql`).
- Rotation / inventaire des clés : voir le dépôt KPMC `docs/ROTATION_CLES_SUPABASE.md`.

### Project overview

vis-a-bois is a B2B e-commerce React SPA (Vite + TypeScript + Tailwind + shadcn/ui) for a French professional construction/fastening hardware supplier. The backend is entirely cloud-hosted Supabase (Postgres, Auth, Edge Functions, Storage). Payments use Stripe (test mode keys in `.env`).

### Dev commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` (port 8080) |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Preview prod build | `npm run preview` |

### Boucle de livraison

1. Préparer le diff (vérifier localement : `npm run lint` / `npm run build` si pertinent).
2. **Un seul push `main`** par tâche quand le déploiement prod est voulu.
3. Déploiement :
   - front → **Railway** natif (`vis-a-bois-production`) ;
   - `supabase/**` → workflow **Deploy Supabase** (delta migrations + Edge Functions).
4. Vérifier le run Actions + smoke site (`www.vis-a-bois.com`).

Ne **pas** déployer via CLI Supabase depuis la VM (pas de PAT / service_role).

### Test login

The environment secrets `TEST_LOGIN_USERNAME` and `TEST_LOGIN_PASSWORD` contain credentials for a pre-existing Supabase account. Use them to log in at `/auth`. After a successful login, the app navigates to the **home page** (`/`), not `/compte`. This account has admin privileges (the "Admin" badge appears in the nav bar).

### Key caveats

- **Accès vitrine** : `StorefrontAccessGuard` — si `sites.storefront_public` est faux pour le slug du site, seuls les utilisateurs connectés voient le catalogue ; sinon navigation et paiement invité possibles. `/compte` et l’admin restent derrière `AuthGuard` / `AdminGuard`.
- **Signups disabled**: New user registration is disabled at the Supabase project level. Additionally, the app has a hardcoded email allowlist in `src/pages/AuthPage.tsx`. You cannot create new accounts; use the provided test credentials.
- **No local Supabase**: There is no Docker/docker-compose or local Supabase CLI setup. The dev environment connects to a remote hosted Supabase project (credentials in `.env`).
- **No automated tests**: The project has no test framework or test files configured.
- **Lint exits non-zero**: ESLint reports pre-existing `@typescript-eslint/no-explicit-any` errors and `react-hooks/exhaustive-deps` warnings throughout the codebase. This is expected.
- **Supabase Edge Functions**: storefront functions in `supabase/functions/` (Stripe, GDPR, feeds, …) ; déployées par **Deploy Supabase** (delta). Auth clés : `_shared/supabaseApiKeys.ts` (JWT legacy + `sb_secret_` / `sb_publishable_`).
- **Prix monétaires**: utiliser `roundMoney` / `roundMoneyOrNull` depuis `src/lib/utils.ts` à l’écriture (admin, import Excel, panier). Edge : `supabase/functions/_shared/money.ts`. Voir [`docs/DATA_CLEANUP_PRICES_CARTS.md`](docs/DATA_CLEANUP_PRICES_CARTS.md).
- **Path alias**: `@/` maps to `./src/` (configured in `tsconfig.json` and `vite.config.ts`).
