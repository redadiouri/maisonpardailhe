-- Migration: create stock table
-- Run this in your MySQL client connected to the project's database.

START TRANSACTION;

CREATE TABLE IF NOT EXISTS stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  reference VARCHAR(100),
  quantity INT NOT NULL DEFAULT 0,
  image_url VARCHAR(1024),
  available TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

COMMIT;
