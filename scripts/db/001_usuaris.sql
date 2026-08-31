-- Fase 0 del gameplan de publicació a Play (Issue #16, F52).
--
-- Identitat pròpia de Dictats. Fins ara els comptes vivien a
-- `BrandWaiUserProfile` —la taula de clients de FeedScale/Trawlingweb— amb les
-- contrasenyes en text pla. Amb aquesta taula, Dictats es desacobla d'aquell
-- món i les contrasenyes passen a bcrypt.
--
-- Base: `cronosai` a db1.bwai.cc, la mateixa que aicamper_app.
-- Prefix `dictats_`: la convenció existeix precisament per compartir base.
--
--   mysql -h db1.bwai.cc -u <usuari> -p cronosai < scripts/db/001_usuaris.sql

CREATE TABLE IF NOT EXISTS dictats_usuarios (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,   -- bcrypt, mai més text pla
  nombre        VARCHAR(255) NULL,
  google_id     VARCHAR(64)  NULL,       -- claim "sub" de l'id_token
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuarios_email  (email),
  UNIQUE KEY uq_usuarios_google (google_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Taula de sessions d'`express-mysql-session`. Es crea sola si l'usuari de la
-- base té permís de CREATE, però es deixa escrita per si no en té: així el
-- desplegament no depèn d'un privilegi que potser no hi és.
--
-- Amb això les sessions deixen de morir a cada reinici i desapareix l'avís de
-- MemoryStore que surt als logs a cada arrencada.
CREATE TABLE IF NOT EXISTS dictats_sessions (
  session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
  expires    INT(11) UNSIGNED NOT NULL,
  data       MEDIUMTEXT COLLATE utf8mb4_bin,
  PRIMARY KEY (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
