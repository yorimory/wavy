-- Миграция: услуги и service_id в записях
CREATE TABLE IF NOT EXISTS services (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  price DECIMAL(10,2) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_services_user (user_id, is_active),
  CONSTRAINT fk_services_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE appointments
  ADD COLUMN service_id BIGINT UNSIGNED NULL AFTER client_user_id,
  ADD KEY idx_appt_service (service_id),
  ADD CONSTRAINT fk_appt_service FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE SET NULL;
