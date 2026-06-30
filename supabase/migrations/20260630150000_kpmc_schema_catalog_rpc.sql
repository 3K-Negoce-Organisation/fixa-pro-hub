-- Catalogue schéma (tables + colonnes) pour la page Administration KPMC
SET search_path TO kpmc, public;

CREATE OR REPLACE FUNCTION kpmc.schema_catalog()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = kpmc, public, pg_catalog
AS $$
DECLARE
  result JSONB;
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Droits administrateur requis' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(
    jsonb_agg(entry ORDER BY entry->>'schema', entry->>'table'),
    '[]'::jsonb
  )
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'schema', c.table_schema,
      'table', c.table_name,
      'columns', jsonb_agg(
        jsonb_build_object(
          'name', c.column_name,
          'type', c.data_type,
          'nullable', (c.is_nullable = 'YES'),
          'default', c.column_default
        )
        ORDER BY c.ordinal_position
      )
    ) AS entry
    FROM information_schema.columns c
    INNER JOIN information_schema.tables t
      ON t.table_catalog = c.table_catalog
      AND t.table_schema = c.table_schema
      AND t.table_name = c.table_name
    WHERE c.table_catalog = current_database()
      AND c.table_schema IN ('kpmc', 'public')
      AND t.table_type = 'BASE TABLE'
    GROUP BY c.table_schema, c.table_name
  ) sub;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION kpmc.schema_catalog() IS
  'Liste tables/colonnes des schémas kpmc et public (admins uniquement).';

GRANT EXECUTE ON FUNCTION kpmc.schema_catalog() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
