-- ============================================================
--  SHIESTY PREMIUM VAPE STORE — Schéma MySQL Complet
--  Version : 1.0 | Encodage : UTF-8
-- ============================================================

CREATE DATABASE IF NOT EXISTS shiesty_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE shiesty_db;

-- ============================================================
--  1. CLIENTS
-- ============================================================
CREATE TABLE clients (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prenom        VARCHAR(80)  NOT NULL,
  nom           VARCHAR(80)  NOT NULL,
  email         VARCHAR(180) NOT NULL UNIQUE,
  mot_de_passe  VARCHAR(255) NOT NULL,          -- bcrypt hash
  telephone     VARCHAR(20),
  date_naissance DATE        NOT NULL,           -- vérification +18
  est_majeur    BOOLEAN      GENERATED ALWAYS AS (TIMESTAMPDIFF(YEAR, date_naissance, CURDATE()) >= 18) STORED,
  est_actif     BOOLEAN      NOT NULL DEFAULT TRUE,
  cree_le       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modifie_le    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_email (email)
) ENGINE=InnoDB;

-- ============================================================
--  2. ADRESSES DE LIVRAISON
-- ============================================================
CREATE TABLE adresses (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_id   INT UNSIGNED NOT NULL,
  libelle     VARCHAR(60)  NOT NULL DEFAULT 'Domicile',  -- ex: Travail, Domicile
  rue         VARCHAR(200) NOT NULL,
  ville       VARCHAR(100) NOT NULL,
  code_postal VARCHAR(20),
  pays        VARCHAR(80)  NOT NULL DEFAULT 'Sénégal',
  est_defaut  BOOLEAN      NOT NULL DEFAULT FALSE,

  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  INDEX idx_client (client_id)
) ENGINE=InnoDB;

-- ============================================================
--  3. CATÉGORIES DE PRODUITS
-- ============================================================
CREATE TABLE categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom         VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  cree_le     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Données initiales
INSERT INTO categories (nom, slug, description) VALUES
  ('Puffs & Jetables',  'puffs',       'Cigarettes électroniques jetables prêtes à l\'emploi'),
  ('Kits & Box Mods',   'kits',        'Kits complets et box mods rechargeables'),
  ('E-Liquides',        'e-liquides',  'E-liquides, sels de nicotine et bases'),
  ('Accessoires',       'accessoires', 'Résistances, batteries, chargeurs et pièces détachées');

-- ============================================================
--  4. PRODUITS
-- ============================================================
CREATE TABLE produits (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  categorie_id  INT UNSIGNED NOT NULL,
  nom           VARCHAR(200) NOT NULL,
  slug          VARCHAR(200) NOT NULL UNIQUE,
  description   TEXT,
  emoji         VARCHAR(10)  DEFAULT '📦',       -- icône affichée sur le site
  prix          DECIMAL(10,2) NOT NULL,
  prix_barre    DECIMAL(10,2),                   -- prix barré si promotion
  stock         INT          NOT NULL DEFAULT 0,
  badge         ENUM('NEW','BEST','SALE','') DEFAULT '',
  est_actif     BOOLEAN      NOT NULL DEFAULT TRUE,
  cree_le       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modifie_le    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (categorie_id) REFERENCES categories(id),
  INDEX idx_categorie (categorie_id),
  INDEX idx_actif (est_actif)
) ENGINE=InnoDB;

-- Données initiales (produits visibles sur le site)
INSERT INTO produits (categorie_id, nom, slug, description, emoji, prix, prix_barre, stock, badge) VALUES
  (1, 'Hyperjoy - Blueberry Ice', 'hyperjoy-blueberry-ice',
      'Kit complet 40W, 8000 bouffées, batterie 1800mAh', '🍇', 12000.00, NULL, 50, 'NEW'),
  (1, 'Cool Bar 9k', 'cool-bar-9k',
      'Peach Ice - Cool Mint, 9000 bouffées', '🌬️', 9000.00, NULL, 80, 'BEST'),
  (3, 'E-Liquid Mango Ice', 'e-liquid-mango-ice',
      '50ml, 0mg/3mg/6mg, base 70/30, fruité & frais', '🥭', 5000.00, 8000.00, 120, 'SALE'),
  (2, 'ArcMod 200W', 'arcmod-200w',
      'Box mod haute puissance, écran OLED, dual 18650', '⚡', 10000.00, NULL, 30, 'NEW'),
  (4, 'Kit Résistances RBA', 'kit-resistances-rba',
      'Pack 10 résistances mesh 0.15Ω — 0.8Ω, toutes marques', '🔧', 10000.00, NULL, 200, ''),
  (3, 'Sels de Nicotine Berry', 'sels-nicotine-berry',
      'Sel de nicotine fruits rouges, 20mg, 30ml', '🍓', 6000.00, NULL, 90, '');

-- ============================================================
--  5. CODES PROMO
-- ============================================================
CREATE TABLE codes_promo (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(30)  NOT NULL UNIQUE,
  type            ENUM('percent','flat') NOT NULL,
  valeur          DECIMAL(8,2) NOT NULL,             -- % ou montant fixe XOF
  label           VARCHAR(30),                        -- affiché ex: "-10%"
  utilisation_max INT          DEFAULT NULL,          -- NULL = illimité
  utilisation_nb  INT          NOT NULL DEFAULT 0,
  valide_du       DATETIME     DEFAULT NULL,
  valide_au       DATETIME     DEFAULT NULL,
  est_actif       BOOLEAN      NOT NULL DEFAULT TRUE,
  cree_le         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Codes présents dans javascript.js
INSERT INTO codes_promo (code, type, valeur, label, valide_au) VALUES
  ('VAPORA10',   'percent', 10, '-10%',  '2025-12-31 23:59:59'),
  ('BIENVENUE',  'percent', 15, '-15%',  '2025-12-31 23:59:59'),
  ('VAPE20',     'flat',    20, '-20€',  '2025-12-31 23:59:59'),
  ('NEWCLIENT',  'percent', 20, '-20%',  '2025-12-31 23:59:59');

-- ============================================================
--  6. PANIERS (session ou client connecté)
-- ============================================================
CREATE TABLE paniers (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_id   INT UNSIGNED DEFAULT NULL,    -- NULL si visiteur non connecté
  session_id  VARCHAR(128) DEFAULT NULL,    -- identifiant de session navigateur
  cree_le     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modifie_le  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  INDEX idx_client  (client_id),
  INDEX idx_session (session_id)
) ENGINE=InnoDB;

CREATE TABLE panier_lignes (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  panier_id   INT UNSIGNED NOT NULL,
  produit_id  INT UNSIGNED NOT NULL,
  quantite    INT          NOT NULL DEFAULT 1,
  prix_unitaire DECIMAL(10,2) NOT NULL,    -- prix au moment de l'ajout

  FOREIGN KEY (panier_id)  REFERENCES paniers(id)  ON DELETE CASCADE,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE,
  UNIQUE KEY uq_panier_produit (panier_id, produit_id)
) ENGINE=InnoDB;

-- ============================================================
--  7. COMMANDES
-- ============================================================
CREATE TABLE commandes (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_id       INT UNSIGNED NOT NULL,
  adresse_id      INT UNSIGNED DEFAULT NULL,
  code_promo_id   INT UNSIGNED DEFAULT NULL,
  statut          ENUM('en_attente','confirmee','expediee','livree','annulee')
                  NOT NULL DEFAULT 'en_attente',
  sous_total      DECIMAL(10,2) NOT NULL,
  remise          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_ttc       DECIMAL(10,2) NOT NULL,
  note            TEXT,
  cree_le         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modifie_le      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (client_id)     REFERENCES clients(id),
  FOREIGN KEY (adresse_id)    REFERENCES adresses(id) ON DELETE SET NULL,
  FOREIGN KEY (code_promo_id) REFERENCES codes_promo(id) ON DELETE SET NULL,
  INDEX idx_client (client_id),
  INDEX idx_statut (statut)
) ENGINE=InnoDB;

CREATE TABLE commande_lignes (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  commande_id   INT UNSIGNED NOT NULL,
  produit_id    INT UNSIGNED NOT NULL,
  nom_produit   VARCHAR(200) NOT NULL,    -- snapshot au moment de la commande
  quantite      INT          NOT NULL,
  prix_unitaire DECIMAL(10,2) NOT NULL,
  total_ligne   DECIMAL(10,2) GENERATED ALWAYS AS (quantite * prix_unitaire) STORED,

  FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE CASCADE,
  FOREIGN KEY (produit_id)  REFERENCES produits(id)
) ENGINE=InnoDB;

-- ============================================================
--  8. PAIEMENTS
-- ============================================================
CREATE TABLE paiements (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  commande_id     INT UNSIGNED NOT NULL,
  methode         ENUM('carte','paypal','apple_pay','wave') NOT NULL,
  statut          ENUM('en_attente','accepte','refuse','rembourse')
                  NOT NULL DEFAULT 'en_attente',
  montant         DECIMAL(10,2) NOT NULL,
  reference_ext   VARCHAR(255),            -- ID retourné par la passerelle
  reponse_json    JSON,                    -- réponse brute de la passerelle
  paye_le         DATETIME DEFAULT NULL,
  cree_le         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (commande_id) REFERENCES commandes(id),
  INDEX idx_commande (commande_id),
  INDEX idx_statut   (statut)
) ENGINE=InnoDB;

-- ============================================================
--  9. MESSAGES CONTACT
-- ============================================================
CREATE TABLE messages_contact (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom         VARCHAR(120) NOT NULL,
  email       VARCHAR(180) NOT NULL,
  sujet       VARCHAR(200),
  message     TEXT         NOT NULL,
  est_lu      BOOLEAN      NOT NULL DEFAULT FALSE,
  cree_le     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
--  10. VUES UTILES
-- ============================================================

-- Vue : détail complet d'une commande
CREATE VIEW v_commandes_detail AS
SELECT
  c.id            AS commande_id,
  c.statut,
  c.total_ttc,
  c.cree_le,
  cl.prenom,
  cl.nom,
  cl.email,
  cp.code         AS promo_code,
  p.methode       AS methode_paiement,
  p.statut        AS statut_paiement
FROM commandes c
JOIN clients    cl ON cl.id = c.client_id
LEFT JOIN codes_promo cp ON cp.id = c.code_promo_id
LEFT JOIN paiements   p  ON p.commande_id = c.id;

-- Vue : stock & ventes par produit
CREATE VIEW v_produits_stats AS
SELECT
  pr.id,
  pr.nom,
  pr.prix,
  pr.stock,
  COALESCE(SUM(cl.quantite), 0)           AS total_vendus,
  COALESCE(SUM(cl.total_ligne), 0)        AS chiffre_affaires
FROM produits pr
LEFT JOIN commande_lignes cl ON cl.produit_id = pr.id
LEFT JOIN commandes       co ON co.id = cl.commande_id
  AND co.statut NOT IN ('annulee')
GROUP BY pr.id;

-- ============================================================
--  11. PROCÉDURES STOCKÉES
-- ============================================================

DELIMITER $$

-- Valider un code promo et retourner la remise calculée
CREATE PROCEDURE sp_appliquer_promo(
  IN  p_code      VARCHAR(30),
  IN  p_sous_total DECIMAL(10,2),
  OUT p_remise    DECIMAL(10,2),
  OUT p_promo_id  INT UNSIGNED,
  OUT p_message   VARCHAR(200)
)
BEGIN
  DECLARE v_type   VARCHAR(10);
  DECLARE v_valeur DECIMAL(8,2);
  DECLARE v_actif  BOOLEAN;
  DECLARE v_max    INT;
  DECLARE v_nb     INT;
  DECLARE v_valide_au DATETIME;

  SELECT id, type, valeur, est_actif, utilisation_max, utilisation_nb, valide_au
  INTO p_promo_id, v_type, v_valeur, v_actif, v_max, v_nb, v_valide_au
  FROM codes_promo WHERE code = p_code LIMIT 1;

  IF p_promo_id IS NULL THEN
    SET p_remise = 0; SET p_message = 'Code invalide.';
  ELSEIF NOT v_actif THEN
    SET p_remise = 0; SET p_message = 'Code désactivé.';
  ELSEIF v_valide_au IS NOT NULL AND v_valide_au < NOW() THEN
    SET p_remise = 0; SET p_message = 'Code expiré.';
  ELSEIF v_max IS NOT NULL AND v_nb >= v_max THEN
    SET p_remise = 0; SET p_message = 'Quota atteint.';
  ELSE
    IF v_type = 'percent' THEN
      SET p_remise = ROUND(p_sous_total * v_valeur / 100, 2);
    ELSE
      SET p_remise = LEAST(v_valeur, p_sous_total);
    END IF;
    SET p_message = CONCAT('Code appliqué ! Remise : ', p_remise, ' XOF');
    UPDATE codes_promo SET utilisation_nb = utilisation_nb + 1 WHERE id = p_promo_id;
  END IF;
END$$

-- Créer une commande depuis un panier
CREATE PROCEDURE sp_passer_commande(
  IN  p_client_id   INT UNSIGNED,
  IN  p_panier_id   INT UNSIGNED,
  IN  p_adresse_id  INT UNSIGNED,
  IN  p_promo_id    INT UNSIGNED,
  IN  p_remise      DECIMAL(10,2),
  OUT p_commande_id INT UNSIGNED
)
BEGIN
  DECLARE v_sous_total DECIMAL(10,2);

  SELECT SUM(quantite * prix_unitaire) INTO v_sous_total
  FROM panier_lignes WHERE panier_id = p_panier_id;

  INSERT INTO commandes (client_id, adresse_id, code_promo_id, sous_total, remise, total_ttc)
  VALUES (p_client_id, p_adresse_id, p_promo_id, v_sous_total, p_remise,
          GREATEST(0, v_sous_total - p_remise));

  SET p_commande_id = LAST_INSERT_ID();

  INSERT INTO commande_lignes (commande_id, produit_id, nom_produit, quantite, prix_unitaire)
  SELECT p_commande_id, pl.produit_id, pr.nom, pl.quantite, pl.prix_unitaire
  FROM panier_lignes pl
  JOIN produits pr ON pr.id = pl.produit_id
  WHERE pl.panier_id = p_panier_id;

  -- Décrémenter le stock
  UPDATE produits pr
  JOIN panier_lignes pl ON pl.produit_id = pr.id AND pl.panier_id = p_panier_id
  SET pr.stock = pr.stock - pl.quantite;

  -- Vider le panier
  DELETE FROM panier_lignes WHERE panier_id = p_panier_id;
END$$

DELIMITER ;

-- ============================================================
--  FIN DU SCHÉMA
-- ============================================================
