-- Exposer le schéma kpmc à l'API PostgREST (requêtes .schema('kpmc') côté KPMC React)
-- Sans cela : erreur 406 / PGRST106 sur migration_* et user_preferences.

-- Droits API (complément Lot 1 — idempotent)
GRANT USAGE ON SCHEMA kpmc TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA kpmc TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA kpmc TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA kpmc
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA kpmc
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;

-- Inclure kpmc dans les schémas visibles par PostgREST (conserver public + storage + graphql_public)
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, storage, kpmc';

NOTIFY pgrst, 'reload config';
