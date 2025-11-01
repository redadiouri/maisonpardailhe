-- Migration: Add total_cents column to commandes table
-- Run this on existing databases to add the new column without resetting data

ALTER TABLE commandes 
ADD COLUMN total_cents INT NOT NULL DEFAULT 0 
AFTER raison_refus;

-- Optional: Update existing records to calculate total from produit JSON
-- This requires manual intervention or a Node.js script to parse produit and recalculate
-- For now, existing orders will have total_cents = 0 until updated
