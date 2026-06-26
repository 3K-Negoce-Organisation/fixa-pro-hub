-- Recharge le cache schéma PostgREST après exposition kpmc (idempotent)
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
