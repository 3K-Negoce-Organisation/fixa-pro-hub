# Nettoyage prix produits et paniers serveur (fixa-pro-hub)

## Problème

L’import Excel et `parseFloat` en JavaScript produisent parfois des valeurs comme `57.99999999999999` au lieu de `58` sur `products.purchase_price_ht`, `price_ht`, etc.

## Correctifs applicatifs (vitrine + admin embarqué)

- Utilitaires : [`src/lib/utils.ts`](../src/lib/utils.ts) — `roundMoney`, `roundMoneyOrNull`, `normalizeProductMoneyFields`
- [`src/components/admin/ProductExcelImport.tsx`](../src/components/admin/ProductExcelImport.tsx) : import Excel
- [`src/pages/AdminProductsPage.tsx`](../src/pages/AdminProductsPage.tsx) : formulaire produit
- [`src/contexts/CartContext.tsx`](../src/contexts/CartContext.tsx) : total panier HT
- [`src/lib/shipping.ts`](../src/lib/shipping.ts) : totaux checkout vitrine
- Edge : [`supabase/functions/_shared/money.ts`](../supabase/functions/_shared/money.ts), [`checkout-totals.ts`](../supabase/functions/_shared/checkout-totals.ts), [`order-supplier-quantity.ts`](../supabase/functions/_shared/order-supplier-quantity.ts) (PDF / commande fournisseur = `purchase_price_ht`)

**Périmètre prix client (panier)** : `price_ht` / promo — pas `purchase_price_ht`.

## Migration SQL (données existantes)

Fichier : [`supabase/migrations/20260523150000_round_product_prices_clear_user_carts.sql`](../supabase/migrations/20260523150000_round_product_prices_clear_user_carts.sql)

- Arrondit `purchase_price_ht`, `price_ht`, `price_ttc`, `promo_price_ht` à **2 décimales**
- `TRUNCATE public.user_carts` (paniers persistés côté serveur)
- **Ne modifie pas** `orders` / `order_items` ni le `localStorage` `vis-a-bois-cart`

## Exécution

### Script local

```bash
chmod +x scripts/run-sql-migration.sh
./scripts/run-sql-migration.sh staging
./scripts/run-sql-migration.sh production
```

Prérequis : `SUPABASE_ACCESS_TOKEN` (ou `SUPABASE_ACCESS_TOKEN_3K` via `../scripts/load-3k-env.sh`).

### GitHub Actions

Workflow **Run SQL migration** (`workflow_dispatch`) :

1. Actions → **Run SQL migration** → Run workflow
2. Choisir `staging`, puis relancer pour `production`
3. Fichier par défaut : `20260523150000_round_product_prices_clear_user_carts.sql`

Secret requis : `SUPABASE_ACCESS_TOKEN` (PAT compte Supabase org 3K). Optionnel : `SUPABASE_REF_STAGING`, `SUPABASE_REF_PRODUCTION`.

## Ordre recommandé

1. Merger le code (arrondis à l’import / formulaire / checkout / PDF)
2. Exécuter la migration sur **staging**, vérifier quelques produits
3. Exécuter sur **production**
4. Redéployer les Edge Functions modifiées (`create-payment-intent`, `create-stripe-checkout`, `stripe-webhook`, `simulate-order-webhook`, `preview-supplier-order-pdf` si utilisé)

Admin (même migration) : [`admin-hub-central/docs/DATA_CLEANUP_PRICES_CARTS.md`](../../admin-hub-central/docs/DATA_CLEANUP_PRICES_CARTS.md).
