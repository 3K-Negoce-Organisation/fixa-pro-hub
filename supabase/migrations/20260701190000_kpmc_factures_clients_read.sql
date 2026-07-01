-- KPMC — lecture factures clients pour le menu Factures clients (non-admin avec page_access)

CREATE OR REPLACE FUNCTION kpmc.user_can_access_page(p_page_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = kpmc, public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM kpmc.page_access pa
      WHERE pa.user_id = auth.uid()
        AND pa.page_key = p_page_key
        AND pa.allowed = true
    );
$$;

REVOKE ALL ON FUNCTION kpmc.user_can_access_page(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kpmc.user_can_access_page(text) TO authenticated;

DROP POLICY IF EXISTS "KPMC factures_clients read factures_clients" ON kpmc.factures_clients;
CREATE POLICY "KPMC factures_clients read factures_clients"
  ON kpmc.factures_clients
  FOR SELECT
  TO authenticated
  USING (kpmc.user_can_access_page('factures_clients'));

DROP POLICY IF EXISTS "KPMC factures_clients read factures_clients_lignes" ON kpmc.factures_clients_lignes;
CREATE POLICY "KPMC factures_clients read factures_clients_lignes"
  ON kpmc.factures_clients_lignes
  FOR SELECT
  TO authenticated
  USING (kpmc.user_can_access_page('factures_clients'));
