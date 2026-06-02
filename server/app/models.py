from __future__ import annotations

import enum
from datetime import datetime, time
from typing import Any, Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    JSON,
    Numeric,
    SmallInteger,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, enum.Enum):
    private_person = "private_person"
    client = "client"


class SubscriptionTier(str, enum.Enum):
    free = "free"
    premium = "premium"


class ModerationStrictness(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class AppointmentStatus(str, enum.Enum):
    draft = "draft"
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"


class BotConfirmationStatus(str, enum.Enum):
    none = "none"
    sent = "sent"
    confirmed = "confirmed"
    declined = "declined"
    expired = "expired"


class ModeratedVerdict(str, enum.Enum):
    clean = "clean"
    spam = "spam"
    profanity = "profanity"
    mixed = "mixed"


class ModeratedSource(str, enum.Enum):
    review = "review"
    note = "note"
    chat = "chat"
    other = "other"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), default="")
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.private_person)
    subscription_tier: Mapped[SubscriptionTier] = mapped_column(
        Enum(SubscriptionTier), default=SubscriptionTier.free
    )
    subscription_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    moderation_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    moderation_strictness: Mapped[ModerationStrictness] = mapped_column(
        Enum(ModerationStrictness), default=ModerationStrictness.medium
    )
    settings_json: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON)
    expo_push_token: Mapped[Optional[str]] = mapped_column(String(512))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    clients: Mapped[list["Client"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    appointments: Mapped[list["Appointment"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", foreign_keys="Appointment.user_id"
    )
    services: Mapped[list["Service"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(64))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    last_visit_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="clients")
    tags: Mapped[list["ClientTag"]] = relationship(back_populates="client", cascade="all, delete-orphan")
    history: Mapped[list["ClientHistory"]] = relationship(back_populates="client", cascade="all, delete-orphan")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="client")


class ClientTag(Base):
    __tablename__ = "client_tags"
    __table_args__ = (UniqueConstraint("client_id", "tag", name="uq_client_tag"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    tag: Mapped[str] = mapped_column(String(64), nullable=False)

    client: Mapped["Client"] = relationship(back_populates="tags")


class ClientHistory(Base):
    __tablename__ = "client_history"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text)
    meta_json: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    client: Mapped["Client"] = relationship(back_populates="history")


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    duration_minutes: Mapped[int] = mapped_column(SmallInteger, default=60)
    price: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(1024))
    category: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="services")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="service")


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    client_id: Mapped[Optional[int]] = mapped_column(ForeignKey("clients.id", ondelete="SET NULL"))
    client_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    service_id: Mapped[Optional[int]] = mapped_column(ForeignKey("services.id", ondelete="SET NULL"), index=True)
    title: Mapped[str] = mapped_column(String(255), default="Запись")
    starts_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(Enum(AppointmentStatus), default=AppointmentStatus.pending)
    bot_confirmation_status: Mapped[BotConfirmationStatus] = mapped_column(
        Enum(BotConfirmationStatus), default=BotConfirmationStatus.none
    )
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="appointments", foreign_keys=[user_id])
    client: Mapped[Optional[Client]] = relationship(back_populates="appointments")
    service: Mapped[Optional["Service"]] = relationship(back_populates="appointments")


class WorkingHours(Base):
    __tablename__ = "working_hours"
    __table_args__ = (UniqueConstraint("user_id", "weekday", name="uq_wh_user_day"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    weekday: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # 0=Mon ... 6=Sun
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)


class ModeratedContent(Base):
    __tablename__ = "moderated_content"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    source: Mapped[ModeratedSource] = mapped_column(Enum(ModeratedSource), default=ModeratedSource.other)
    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    verdict: Mapped[ModeratedVerdict] = mapped_column(Enum(ModeratedVerdict), nullable=False)
    details_json: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
