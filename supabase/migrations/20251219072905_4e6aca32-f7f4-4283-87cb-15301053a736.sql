-- Add 'payée' status to the order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'paid' BEFORE 'confirmed';