-- Staging : copie des 2 commandes officielles depuis la prod Vis-à-bois (juin 2026)
-- VIS-202606-F4UDEO, VIS-202606-OOVA6L — seules avec customer_invoice_number en prod

INSERT INTO public.orders (
  id,
  user_id,
  order_number,
  status,
  total_ht,
  total_ttc,
  shipping_address,
  shipping_city,
  shipping_postal_code,
  shipping_name,
  user_email,
  customer_invoice_number,
  customer_invoice_issued_at,
  site_id,
  is_archived,
  created_at,
  updated_at
) VALUES
  (
    '7b2eff71-bc8f-4026-b1da-e905067ad3e5',
    NULL,
    'VIS-202606-OOVA6L',
    'manual_intervention',
    46.67,
    56.00,
    '17 Boulevard de l''Ouest',
    'Dijon',
    '21000',
    'matthieu KABORE',
    'kaborematthieu@gmail.com',
    'FACTURE-VIS-202606-OOVA6L-001',
    '2026-06-08 16:01:32.432+00',
    NULL,
    false,
    '2026-06-02 18:06:21.099635+00',
    '2026-06-22 17:51:28.17142+00'
  ),
  (
    '8b0c5762-c111-44a5-833f-65afca4a6c62',
    NULL,
    'VIS-202606-F4UDEO',
    'delivered',
    35.00,
    42.00,
    '22 Avenue Victor Hugo',
    'Dijon',
    '21000',
    'MOREAU ROSELINE',
    'roselm145@gmail.com',
    'FC-2026-00002',
    '2026-06-16 19:16:56.833+00',
    NULL,
    false,
    '2026-06-12 17:07:32.193805+00',
    '2026-06-17 16:18:18.217156+00'
  )
ON CONFLICT (order_number) DO UPDATE SET
  status = EXCLUDED.status,
  total_ht = EXCLUDED.total_ht,
  total_ttc = EXCLUDED.total_ttc,
  shipping_address = EXCLUDED.shipping_address,
  shipping_city = EXCLUDED.shipping_city,
  shipping_postal_code = EXCLUDED.shipping_postal_code,
  shipping_name = EXCLUDED.shipping_name,
  user_email = EXCLUDED.user_email,
  customer_invoice_number = EXCLUDED.customer_invoice_number,
  customer_invoice_issued_at = EXCLUDED.customer_invoice_issued_at,
  updated_at = EXCLUDED.updated_at;

INSERT INTO public.order_items (
  id,
  order_id,
  product_id,
  product_title,
  product_image,
  variant_title,
  quantity,
  unit_price_ht,
  unit_price_ttc
) VALUES
  (
    'f8162f3c-aec3-4ea6-aadc-e2c7ed547d35',
    '8b0c5762-c111-44a5-833f-65afca4a6c62',
    'e099215e-4930-4ef0-83a8-032ad0056eee',
    'Vis bois VBF 3,0 x 13 galva rés.',
    'https://lqsbsinycyewdvdtbruy.supabase.co/storage/v1/object/public/product-images/8e90f441-f6a0-42a0-936f-241c5ecaa693/b9187ae6-e942-4894-8206-22018afaaa9f-vis-vbf.jpg',
    'Default',
    2,
    12.50,
    15.00
  ),
  (
    'beb7e6c7-dca3-4d82-9a8d-1adcea1ba4ff',
    '7b2eff71-bc8f-4026-b1da-e905067ad3e5',
    '496de3f6-79ca-46c6-936b-6b12015bb9c8',
    'Vis terrasse QS 5,0 x 60 inox A4 TX25',
    'https://lqsbsinycyewdvdtbruy.supabase.co/storage/v1/object/public/product-images/8e90f441-f6a0-42a0-936f-241c5ecaa693/505c1e50-f253-4aa7-a54f-4e8a0929b51f-vis-terrasse.jpeg',
    'Unité',
    1,
    36.67,
    44.00
  )
ON CONFLICT (id) DO UPDATE SET
  order_id = EXCLUDED.order_id,
  product_id = EXCLUDED.product_id,
  product_title = EXCLUDED.product_title,
  product_image = EXCLUDED.product_image,
  variant_title = EXCLUDED.variant_title,
  quantity = EXCLUDED.quantity,
  unit_price_ht = EXCLUDED.unit_price_ht,
  unit_price_ttc = EXCLUDED.unit_price_ttc;
