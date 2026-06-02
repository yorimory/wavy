-- Миграция для существующей БД: роли пользователей и связь записей с клиентом-аккаунтом
-- Выполните вручную, если init.sql уже применялся ранее:

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role ENUM('private_person', 'client') NOT NULL DEFAULT 'private_person' AFTER avatar_url;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS client_user_id BIGINT UNSIGNED NULL AFTER client_id,
  ADD KEY IF NOT EXISTS idx_appt_client_user (client_user_id);

-- MySQL < 8.0.12 не поддерживает IF NOT EXISTS для ADD COLUMN — используйте без IF NOT EXISTS при ошибке.
