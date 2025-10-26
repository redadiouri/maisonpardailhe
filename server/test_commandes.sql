-- test_commandes.sql
-- Fichier de commandes de test pour la table `commandes`.
-- Utilisation : mysql -u USER -p DATABASE < test_commandes.sql

INSERT INTO commandes (nom_complet, telephone, produit, date_retrait, creneau, precisions, statut, raison_refus) VALUES
('Jean Dupont', '0612345678', 'Pain au levain', '2025-11-01', '09:00-10:00', 'Allergie: pas de sésame', 'en_attente', NULL),
('Alice Martin', '0600000001', 'Baguette', '2025-11-02', '10:00-11:00', 'Sans sel', 'en_attente', NULL),
('Bruno Petit', '0600000002', 'Tarte aux pommes', '2025-11-03', '14:00-15:00', 'Sans sucre ajouté', 'en_attente', NULL),
('Claire Leroy', '0600000003', 'Croissant', '2025-11-04', '08:00-09:00', '', 'en_cours', NULL),
('David Roux', '0600000004', 'Éclair au chocolat', '2025-11-05', '12:00-13:00', 'Livraison impossible', 'refusée', 'Adresse incomplète'),
('Elodie Bernard', '0600000005', 'Pain complet', '2025-11-06', '11:00-12:00', 'Coupé en tranches', 'terminée', NULL),
('François Noel', '0600000006', 'Focaccia', '2025-11-07', '16:00-17:00', 'Avec olives', 'en_attente', NULL),
('Gabrielle Faure', '0600000007', 'Brioche', '2025-11-08', '09:00-10:00', '', 'en_attente', NULL),
('Hugo Marchand', '0600000008', 'Pain aux graines', '2025-11-09', '10:00-11:00', 'Emballer séparément', 'en_cours', NULL),
('Isabelle Durant', '0600000009', 'Chocolatine', '2025-11-10', '07:30-08:30', 'Pour 2 personnes', 'en_attente', NULL),
('Julien Caron', '0600000010', 'Quiche lorraine', '2025-11-11', '12:00-13:00', 'Réchauffer à 180°C', 'terminée', NULL),
('Karine Petit', '0600000011', 'Pain sans gluten', '2025-11-12', '15:00-16:00', 'Allergie: gluten', 'en_attente', NULL),
('Laurent Renaud', '0600000012', 'Tarte citron', '2025-11-13', '14:00-15:00', '', 'refusée', 'Produit non disponible'),
('Mathilde Roche', '0600000013', 'Scone', '2025-11-14', '09:00-10:00', '2x nature, 1x raisin', 'en_attente', NULL),
('Nicolas Gauthier', '0600000014', 'Baguette tradition', '2025-11-15', '11:00-12:00', '', 'terminée', NULL),
('Océane Lambert', '0600000015', 'Cake aux fruits', '2025-11-16', '10:00-11:00', 'Sans alcool', 'en_attente', NULL),
('Pierre Moulin', '0600000016', 'Pain de mie', '2025-11-17', '08:00-09:00', 'Tranches épaisses', 'en_cours', NULL),
('Quitterie Noel', '0600000017', 'Brioche feuilletée', '2025-11-18', '16:00-17:00', '', 'en_attente', NULL),
('Roland Simon', '0600000018', 'Tartelettes', '2025-11-19', '13:00-14:00', 'Assortiment', 'en_attente', NULL),
('Sophie Vallée', '0600000019', 'Mille-feuille', '2025-11-20', '12:00-13:00', 'À consommer le jour même', 'en_attente', NULL);

-- Fin du fichier test_commandes.sql
