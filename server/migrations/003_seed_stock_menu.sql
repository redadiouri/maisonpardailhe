-- Migration: seed initial stock items from menu
-- Run this file against the project's MySQL database to insert menu products into the stock table.

START TRANSACTION;

INSERT INTO stock (name, reference, quantity, image_url, available) VALUES
('Pâté en croûte Maison', 'PATE-CROUTE', 20, '', 1),
('Jambon blanc médaillé', 'JAMBON', 50, '', 1),
('Saucisse de Toulouse', 'SAUCISSE', 40, '', 1),
('Terrine aux cèpes', 'TERRINE', 30, '', 1),
('Rillettes de canard', 'RILLETTES', 50, '', 1),
('Coppa affinée', 'COPPA', 40, '', 1),
('Poulet fermier Label Rouge', 'POULET', 20, '', 1),
('Travers caramélisés', 'TRAVERS', 30, '', 1),
('Porcelet de fête', 'PORCELET', 5, '', 1),
('Pickles de légumes', 'PICKLES', 60, '', 1),
('Gelée de piment d\'Espelette', 'GELEE-PIMENT', 60, '', 1),
('Moutarde noire maison', 'MOUTARDE', 80, '', 1);

COMMIT;
