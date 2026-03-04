# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

vis-a-bois is a B2B e-commerce React SPA (Vite + TypeScript + Tailwind + shadcn/ui) for a French professional construction/fastening hardware supplier. The backend is entirely cloud-hosted Supabase (Postgres, Auth, Edge Functions, Storage). Payments use Stripe (test mode keys in `.env`).

### Dev commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` (port 8080) |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Preview prod build | `npm run preview` |

### Key caveats

- **Authentication required**: All pages are behind an AuthGuard; the app redirects to `/auth` immediately. You need valid Supabase credentials to access any authenticated routes (product catalog, cart, checkout, admin, etc.).
- **Signups disabled**: New user registration is disabled at the Supabase project level ("Signups not allowed for this instance"). Additionally, the app has a hardcoded email allowlist in `src/pages/AuthPage.tsx`. A pre-existing test account is required.
- **No local Supabase**: There is no Docker/docker-compose or local Supabase CLI setup. The dev environment connects to a remote hosted Supabase project (credentials in `.env`).
- **No automated tests**: The project has no test framework or test files configured.
- **Lint exits non-zero**: ESLint reports pre-existing `@typescript-eslint/no-explicit-any` errors and `react-hooks/exhaustive-deps` warnings throughout the codebase. This is expected.
- **Supabase Edge Functions**: 11 Deno-based edge functions live in `supabase/functions/`; they run on the remote Supabase instance, not locally.
- **Path alias**: `@/` maps to `./src/` (configured in `tsconfig.json` and `vite.config.ts`).
