-- Table commandes
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
);

-- Table admins
CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL
);
