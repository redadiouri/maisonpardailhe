-- reset_database.sql
-- WARNING: This file DROPS existing tables and recreates them with initial seed data.
-- Run only if you want to reset the database.

START TRANSACTION;

-- Drop existing tables (order independent here because no foreign keys)
DROP TABLE IF EXISTS commandes;
DROP TABLE IF EXISTS menus;
DROP TABLE IF EXISTS admins;

-- Admins table
CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Menus table (contains stock and additional metadata)
CREATE TABLE menus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  price_cents INT NOT NULL DEFAULT 0,
  is_quote TINYINT(1) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  reference VARCHAR(100),
  image_url VARCHAR(1024),
  available TINYINT(1) NOT NULL DEFAULT 1,
  visible_on_menu TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Commandes table
CREATE TABLE commandes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom_complet VARCHAR(255) NOT NULL,
  telephone VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL DEFAULT '',
  produit VARCHAR(255) NOT NULL,
  date_retrait DATE NOT NULL,
  creneau VARCHAR(50) NOT NULL,
  location VARCHAR(50) NOT NULL DEFAULT 'roquettes',
  precisions TEXT,
  statut ENUM('en_attente', 'en_cours', 'refusée', 'terminée') NOT NULL DEFAULT 'en_attente',
  raison_refus TEXT,
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed menus (regroupe les informations auparavant présentes dans stock)
INSERT INTO menus (name, slug, description, price_cents, is_quote, stock, visible_on_menu, reference, image_url, available) VALUES
('Pâté en croûte Maison', 'pate-en-croute-maison', 'Pâté en croûte traditionnel, recette familiale.', 1500, 0, 20, 1, 'PATE-CROUTE', '', 1),
('Jambon blanc médaillé', 'jambon-blanc-medaille', 'Jambon blanc affiné, découpe traditionnelle.', 1200, 0, 50, 1, 'JAMBON', '', 1),
('Saucisse de Toulouse', 'saucisse-de-toulouse', 'Saucisse artisanale de Toulouse, à griller.', 800, 0, 40, 1, 'SAUCISSE', '', 1),
('Terrine aux cèpes', 'terrine-aux-cepes', 'Terrine onctueuse aux cèpes.', 1400, 0, 30, 1, 'TERRINE', '', 1),
('Rillettes de canard', 'rillettes-de-canard', 'Rillettes fines de canard maison.', 900, 0, 50, 1, 'RILLETTES', '', 1),
('Coppa affinée', 'coppa-affinee', 'Coppa affinée à l''ancienne.', 1600, 0, 40, 1, 'COPPA', '', 1),
('Poulet fermier Label Rouge', 'poulet-fermier-label-rouge', 'Poulet fermier rôti ou prêt à trancher.', 2200, 0, 20, 1, 'POULET', '', 1),
('Travers caramélisés', 'travers-caramelises', 'Travers de porc caramélisés maison.', 1300, 0, 30, 1, 'TRAVERS', '', 1),
('Porcelet de fête', 'porcelet-de-fete', 'Pièce sur commande — prix sur devis.', 0, 1, 5, 1, 'PORCELET', '', 1),
('Pickles de légumes', 'pickles-de-legumes', 'Pickles maison pour accompagner.', 400, 0, 60, 1, 'PICKLES', '', 1),
('Gelée de piment d''Espelette', 'gelee-piment-espelette', 'Gelée relevée au piment d''Espelette.', 300, 0, 60, 1, 'GELEE-PIMENT', '', 1),
('Moutarde noire maison', 'moutarde-noire-maison', 'Moutarde noire préparée maison.', 250, 0, 80, 1, 'MOUTARDE', '', 1);

COMMIT;

-- Insert default admin (username: admin, password: admin)
INSERT INTO admins (username, password_hash) VALUES ('admin', '$2b$10$HPtTCWYOAfNCtvkVbMcqBema6dmykw86Gs6WSpnvhrwEj0FFXDnfC');
