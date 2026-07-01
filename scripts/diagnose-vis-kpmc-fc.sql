-- kpmc.factures_clients (staging) + orders VIS-202606
SELECT id, numero_facture, commande_ref, client_nom, total_ttc, statut, created_at
FROM kpmc.factures_clients
WHERE numero_facture ILIKE '%F4UDEO%'
   OR numero_facture ILIKE '%OOVA6L%'
   OR commande_ref ILIKE '%F4UDEO%'
   OR commande_ref ILIKE '%OOVA6L%'
ORDER BY created_at;

SELECT count(*)::int AS fc_total FROM kpmc.factures_clients;

SELECT numero_facture, commande_ref, statut
FROM kpmc.factures_clients
WHERE numero_facture ILIKE 'VIS-202606-%' OR commande_ref ILIKE 'VIS-202606-%'
ORDER BY numero_facture;
