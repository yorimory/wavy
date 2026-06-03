"""Идемпотентные миграции для БД, созданной до появления ролей и услуг."""

from __future__ import annotations

import logging

from sqlalchemy import text

import app.models
from app.database import Base, engine

logger = logging.getLogger(__name__)


def _column_exists(conn, table: str, column: str) -> bool:
    n = conn.execute(
        text(
            """
            SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :col
            """
        ),
        {"table": table, "col": column},
    ).scalar()
    return bool(n)


def _table_exists(conn, table: str) -> bool:
    n = conn.execute(
        text(
            """
            SELECT COUNT(*) FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table
            """
        ),
        {"table": table},
    ).scalar()
    return bool(n)


def _index_exists(conn, table: str, index: str) -> bool:
    n = conn.execute(
        text(
            """
            SELECT COUNT(*) FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND INDEX_NAME = :idx
            """
        ),
        {"table": table, "idx": index},
    ).scalar()
    return bool(n)


def _fk_exists(conn, table: str, constraint: str) -> bool:
    n = conn.execute(
        text(
            """
            SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = :table
              AND CONSTRAINT_NAME = :name
              AND CONSTRAINT_TYPE = 'FOREIGN KEY'
            """
        ),
        {"table": table, "name": constraint},
    ).scalar()
    return bool(n)


def run_schema_migrations() -> None:
    """Применить недостающие колонки/таблицы (безопасно повторять)."""
    logger.info("Creating tables from metadata if they do not exist")
    Base.metadata.create_all(bind=engine)
    
    with engine.begin() as conn:
        if not _column_exists(conn, "users", "phone"):
            logger.info("Migration: add users.phone")
            conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(64) NULL AFTER full_name"))

        if not _column_exists(conn, "users", "address"):
            logger.info("Migration: add users.address")
            conn.execute(text("ALTER TABLE users ADD COLUMN address VARCHAR(512) NULL AFTER phone"))

        if not _column_exists(conn, "users", "role"):
            logger.info("Migration: add users.role")
            conn.execute(
                text(
                    """
                    ALTER TABLE users
                    ADD COLUMN role ENUM('private_person', 'client') NOT NULL
                    DEFAULT 'private_person' AFTER avatar_url
                    """
                )
            )

        if _table_exists(conn, "appointments") and not _column_exists(conn, "appointments", "client_user_id"):
            logger.info("Migration: add appointments.client_user_id")
            conn.execute(
                text(
                    """
                    ALTER TABLE appointments
                    ADD COLUMN client_user_id BIGINT UNSIGNED NULL AFTER client_id
                    """
                )
            )

        if _table_exists(conn, "appointments") and not _index_exists(conn, "appointments", "idx_appt_client_user"):
            conn.execute(text("ALTER TABLE appointments ADD KEY idx_appt_client_user (client_user_id)"))

        if not _table_exists(conn, "services"):
            logger.info("Migration: create services table")
            conn.execute(
                text(
                    """
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
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    """
                )
            )
        else:
            if not _column_exists(conn, "services", "image_url"):
                logger.info("Migration: add services.image_url")
                conn.execute(text("ALTER TABLE services ADD COLUMN image_url VARCHAR(1024) NULL AFTER is_active"))
            if not _column_exists(conn, "services", "category"):
                logger.info("Migration: add services.category")
                conn.execute(text("ALTER TABLE services ADD COLUMN category VARCHAR(255) NULL AFTER image_url"))

        if _table_exists(conn, "appointments") and not _column_exists(conn, "appointments", "service_id"):
            logger.info("Migration: add appointments.service_id")
            conn.execute(
                text(
                    """
                    ALTER TABLE appointments
                    ADD COLUMN service_id BIGINT UNSIGNED NULL AFTER client_user_id
                    """
                )
            )

        if _table_exists(conn, "appointments") and not _index_exists(conn, "appointments", "idx_appt_service"):
            conn.execute(text("ALTER TABLE appointments ADD KEY idx_appt_service (service_id)"))

        if (
            _table_exists(conn, "appointments")
            and _table_exists(conn, "services")
            and not _fk_exists(conn, "appointments", "fk_appt_service")
        ):
            conn.execute(
                text(
                    """
                    ALTER TABLE appointments
                    ADD CONSTRAINT fk_appt_service
                    FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE SET NULL
                    """
                )
            )

        if (
            _table_exists(conn, "appointments")
            and _column_exists(conn, "appointments", "client_user_id")
            and not _fk_exists(conn, "appointments", "fk_appt_client_user")
        ):
            try:
                conn.execute(
                    text(
                        """
                        ALTER TABLE appointments
                        ADD CONSTRAINT fk_appt_client_user
                        FOREIGN KEY (client_user_id) REFERENCES users (id) ON DELETE SET NULL
                        """
                    )
                )
            except Exception as exc:
                logger.warning("fk_appt_client_user skipped: %s", exc)

        # Update image_url to MEDIUMTEXT to support Base64 images
        if _table_exists(conn, "services"):
            try:
                conn.execute(text("ALTER TABLE services MODIFY COLUMN image_url MEDIUMTEXT NULL"))
                logger.info("Migration: updated services.image_url to MEDIUMTEXT")
            except Exception as exc:
                logger.warning("Could not modify image_url to MEDIUMTEXT (possibly SQLite): %s", exc)

        # 1. Update users.role to include 'moderator'
        if _column_exists(conn, "users", "role"):
            try:
                conn.execute(
                    text(
                        """
                        ALTER TABLE users MODIFY COLUMN role 
                        ENUM('private_person', 'client', 'moderator') NOT NULL DEFAULT 'private_person'
                        """
                    )
                )
                logger.info("Migration: updated users.role to include moderator")
            except Exception as exc:
                logger.warning("Could not modify users.role (possibly SQLite): %s", exc)

        # 2. Add users.is_banned, users.warning_count, users.ban_reason
        if not _column_exists(conn, "users", "is_banned"):
            logger.info("Migration: add users.is_banned")
            conn.execute(text("ALTER TABLE users ADD COLUMN is_banned TINYINT(1) NOT NULL DEFAULT 0 AFTER expo_push_token"))

        if not _column_exists(conn, "users", "warning_count"):
            logger.info("Migration: add users.warning_count")
            conn.execute(text("ALTER TABLE users ADD COLUMN warning_count SMALLINT NOT NULL DEFAULT 0 AFTER is_banned"))

        if not _column_exists(conn, "users", "ban_reason"):
            logger.info("Migration: add users.ban_reason")
            conn.execute(text("ALTER TABLE users ADD COLUMN ban_reason VARCHAR(512) NULL AFTER warning_count"))

        # 3. Seed default system configurations
        if _table_exists(conn, "system_configs"):
            try:
                # Check if warnings_limit exists
                res = conn.execute(
                    text("SELECT COUNT(*) FROM system_configs WHERE `key` = 'warnings_limit'")
                ).scalar()
                if not res:
                    conn.execute(
                        text("INSERT INTO system_configs (`key`, `value`) VALUES ('warnings_limit', '3')")
                    )
                    logger.info("Migration: seeded config warnings_limit = 3")

                res2 = conn.execute(
                    text("SELECT COUNT(*) FROM system_configs WHERE `key` = 'low_rating_threshold'")
                ).scalar()
                if not res2:
                    conn.execute(
                        text("INSERT INTO system_configs (`key`, `value`) VALUES ('low_rating_threshold', '2')")
                    )
                    logger.info("Migration: seeded config low_rating_threshold = 2")
            except Exception as exc:
                logger.warning("Could not seed system_configs: %s", exc)

    logger.info("Schema migrations complete")
