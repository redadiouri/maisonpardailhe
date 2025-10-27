-- Migration: add location column to commandes
-- Run this in your MySQL client connected to the project's database.

START TRANSACTION;

-- Add column with default so existing rows get a value
ALTER TABLE commandes
  ADD COLUMN location VARCHAR(50) NOT NULL DEFAULT 'roquettes' AFTER creneau;

-- Optional: ensure any legacy NULL/empty values are set
UPDATE commandes SET location = 'roquettes' WHERE location IS NULL OR location = '';

COMMIT;

-- Notes:
-- 1) This migration adds a NOT NULL column with a default. MySQL will populate existing rows with the default value.
-- 2) If you use migrations tooling, adapt this file to your tooling (e.g., knex, sequelize). Otherwise run with the mysql client or admin tool.
