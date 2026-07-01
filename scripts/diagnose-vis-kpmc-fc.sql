-- kpmc.factures_clients (staging) + orders VIS-202606
SELECT id, numero_facture, commande_ref, client_nom, total_ttc, statut, created_at
FROM kpmc.factures_clients
WHERE numero_facture ILIKE '%F4UDEO%'
   OR numero_facture ILIKE '%OOVA6L%'
   OR commande_ref ILIKE '%F4UDEO%'
   OR commande_ref ILIKE '%OOVA6L%'
ORDER BY created_at;

SELECT count(*)::int AS fc_total FROM kpmc.factures_clients;

SELECT id, numero_facture, commande_ref, client_nom, date_facture, total_ht, total_ttc, statut
FROM kpmc.factures_clients
ORDER BY date_facture DESC, id DESC;
