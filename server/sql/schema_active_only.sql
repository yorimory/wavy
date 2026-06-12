-- WAVY CRM — MySQL 8.0 Active Schema Only
-- Содержит DDL только для реально используемых в приложении таблиц (12 шт.)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS system_action_logs;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS working_hours;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS client_history;
DROP TABLE IF EXISTS client_tags;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS system_configs;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Таблица конфигураций системы
CREATE TABLE system_configs (
  `key` VARCHAR(64) NOT NULL,
  `value` VARCHAR(256) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Таблица пользователей
CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(64) NULL,
  address VARCHAR(512) NULL,
  avatar_url VARCHAR(512) NULL,
  role ENUM('private_person', 'client', 'moderator') NOT NULL DEFAULT 'private_person',
  subscription_tier ENUM('free', 'premium') NOT NULL DEFAULT 'free',
  subscription_expires_at DATETIME NULL,
  moderation_enabled TINYINT(1) NOT NULL DEFAULT 1,
  moderation_strictness ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  settings_json JSON NULL,
  expo_push_token VARCHAR(512) NULL,
  is_banned TINYINT(1) NOT NULL DEFAULT 0,
  warning_count SMALLINT NOT NULL DEFAULT 0,
  ban_reason VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Карточки клиентов (CRM)
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
  CONSTRAINT fk_clients_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Теги клиентов
CREATE TABLE client_tags (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  tag VARCHAR(64) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_client_tag (client_id, tag),
  CONSTRAINT fk_client_tags_client FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Логи изменений по клиентам (CRM timeline)
CREATE TABLE client_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  body TEXT NULL,
  meta_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_history_client FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Услуги мастеров
CREATE TABLE services (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  price DECIMAL(10,2) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  image_url MEDIUMTEXT NULL,
  category VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_services_user (user_id, is_active),
  CONSTRAINT fk_services_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Записи на сеансы
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
  KEY idx_appt_client_user (client_user_id),
  KEY idx_appt_service (service_id),
  CONSTRAINT fk_appt_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_appt_client FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE SET NULL,
  CONSTRAINT fk_appt_client_user FOREIGN KEY (client_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_appt_service FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Рабочие часы мастеров
CREATE TABLE working_hours (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  weekday SMALLINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wh_user_day (user_id, weekday),
  CONSTRAINT fk_wh_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Отзывы и оценки
CREATE TABLE reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  appointment_id BIGINT UNSIGNED NOT NULL,
  client_id BIGINT UNSIGNED NOT NULL,
  master_id BIGINT UNSIGNED NOT NULL,
  rating SMALLINT NOT NULL,
  comment TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reviews_appointment (appointment_id),
  CONSTRAINT fk_reviews_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_client FOREIGN KEY (client_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_master FOREIGN KEY (master_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Лог действий системы модерации
CREATE TABLE system_action_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(64) NOT NULL,
  details TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  CONSTRAINT fk_action_logs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Обращения в техподдержку
CREATE TABLE support_tickets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  reply TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_support_tickets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Сообщения чата
CREATE TABLE messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sender_id BIGINT UNSIGNED NOT NULL,
  receiver_id BIGINT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
