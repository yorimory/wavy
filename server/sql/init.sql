-- WAVY CRM — MySQL 8.0 schema (UTF-8)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS client_history;
DROP TABLE IF EXISTS client_tags;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS working_hours;
DROP TABLE IF EXISTS moderated_content;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  avatar_url VARCHAR(512) NULL,
  role ENUM('private_person', 'client') NOT NULL DEFAULT 'private_person',
  subscription_tier ENUM('free', 'premium') NOT NULL DEFAULT 'free',
  subscription_expires_at DATETIME NULL,
  moderation_enabled TINYINT(1) NOT NULL DEFAULT 1,
  moderation_strictness ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  settings_json JSON NULL,
  expo_push_token VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE clients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NULL,
  email VARCHAR(255) NULL,
  notes TEXT NULL,
  last_visit_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_clients_user (user_id),
  KEY idx_clients_last_visit (user_id, last_visit_at),
  FULLTEXT KEY ft_clients_search (full_name, phone, email, notes),
  CONSTRAINT fk_clients_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE client_tags (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  tag VARCHAR(64) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_client_tag (client_id, tag),
  KEY idx_client_tags_tag (tag),
  CONSTRAINT fk_client_tags_client FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE client_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  body TEXT NULL,
  meta_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_history_client_time (client_id, created_at),
  CONSTRAINT fk_history_client FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE services (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  price DECIMAL(10,2) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  image_url VARCHAR(1024) NULL,
  category VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_services_user (user_id, is_active),
  CONSTRAINT fk_services_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE appointments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  client_id BIGINT UNSIGNED NULL,
  client_user_id BIGINT UNSIGNED NULL,
  service_id BIGINT UNSIGNED NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'Запись',
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  status ENUM('draft', 'pending', 'confirmed', 'cancelled', 'completed') NOT NULL DEFAULT 'pending',
  bot_confirmation_status ENUM('none', 'sent', 'confirmed', 'declined', 'expired') NOT NULL DEFAULT 'none',
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_appt_user_time (user_id, starts_at),
  KEY idx_appt_client (client_id),
  KEY idx_appt_client_user (client_user_id),
  KEY idx_appt_service (service_id),
  CONSTRAINT fk_appt_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_appt_client FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE SET NULL,
  CONSTRAINT fk_appt_client_user FOREIGN KEY (client_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_appt_service FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE working_hours (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  weekday TINYINT NOT NULL COMMENT '0=Monday ... 6=Sunday',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wh_user_day (user_id, weekday),
  CONSTRAINT fk_wh_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE moderated_content (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  source ENUM('review', 'note', 'chat', 'other') NOT NULL DEFAULT 'other',
  original_text TEXT NOT NULL,
  verdict ENUM('clean', 'spam', 'profanity', 'mixed') NOT NULL,
  details_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mod_user (user_id, created_at),
  CONSTRAINT fk_mod_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
