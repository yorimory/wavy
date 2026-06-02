from datetime import date, datetime, time
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, EmailStr, Field

from app.models import (
    AppointmentStatus,
    BotConfirmationStatus,
    ModeratedSource,
    ModeratedVerdict,
    ModerationStrictness,
    SubscriptionTier,
    UserRole,
)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str = ""
    role: UserRole = UserRole.private_person


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    phone: str | None = None
    address: str | None = None
    avatar_url: str | None
    role: UserRole
    subscription_tier: SubscriptionTier
    subscription_expires_at: datetime | None
    moderation_enabled: bool
    moderation_strictness: ModerationStrictness

    class Config:
        from_attributes = True


class UserPatchIn(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    address: str | None = None
    avatar_url: str | None = None
    moderation_enabled: bool | None = None
    moderation_strictness: ModerationStrictness | None = None
    settings_json: dict[str, Any] | None = None


class PushTokenIn(BaseModel):
    expo_push_token: str


class ClientCreateIn(BaseModel):
    full_name: str
    phone: str | None = None
    email: EmailStr | None = None
    notes: str | None = None
    tags: list[str] = []


class ClientUpdateIn(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    notes: str | None = None
    last_visit_at: datetime | None = None
    tags: list[str] | None = None


class ClientOut(BaseModel):
    id: int
    full_name: str
    phone: str | None
    email: str | None
    notes: str | None
    last_visit_at: datetime | None
    tags: list[str]
    created_at: datetime

    class Config:
        from_attributes = True


class HistoryCreateIn(BaseModel):
    event_type: str
    body: str | None = None
    meta_json: dict[str, Any] | None = None


class HistoryOut(BaseModel):
    id: int
    event_type: str
    body: str | None
    meta_json: dict[str, Any] | None
    created_at: datetime

    class Config:
        from_attributes = True


class ServiceCreateIn(BaseModel):
    title: str
    description: str | None = None
    duration_minutes: int = Field(default=60, ge=15, le=480)
    price: Decimal | None = None
    is_active: bool = True
    image_url: str | None = None
    category: str | None = None


class ServiceUpdateIn(BaseModel):
    title: str | None = None
    description: str | None = None
    duration_minutes: int | None = Field(default=None, ge=15, le=480)
    price: Decimal | None = None
    is_active: bool | None = None
    image_url: str | None = None
    category: str | None = None


class ServiceOut(BaseModel):
    id: int
    user_id: int
    title: str
    description: str | None
    duration_minutes: int
    price: Decimal | None
    is_active: bool
    image_url: str | None = None
    category: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProviderOut(BaseModel):
    id: int
    full_name: str
    services_count: int = 0


class CatalogServiceOut(BaseModel):
    id: int
    title: str
    description: str | None
    duration_minutes: int
    price: Decimal | None
    provider_id: int
    provider_name: str
    image_url: str | None = None
    category: str | None = None


class SlotOut(BaseModel):
    starts_at: datetime
    ends_at: datetime


class DaySlotsOut(BaseModel):
    date: date
    slots: list[SlotOut]


class ClientBookingIn(BaseModel):
    provider_id: int
    service_id: int
    starts_at: datetime


class AppointmentCreateIn(BaseModel):
    client_id: int | None = None
    service_id: int | None = None
    title: str = "Запись"
    starts_at: datetime
    ends_at: datetime
    status: AppointmentStatus = AppointmentStatus.confirmed
    notes: str | None = None


class AppointmentUpdateIn(BaseModel):
    client_id: int | None = None
    service_id: int | None = None
    title: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    status: AppointmentStatus | None = None
    bot_confirmation_status: BotConfirmationStatus | None = None
    notes: str | None = None


class AppointmentOut(BaseModel):
    id: int
    client_id: int | None
    client_user_id: int | None = None
    service_id: int | None = None
    provider_id: int | None = None
    provider_name: str | None = None
    service_title: str | None = None
    title: str
    starts_at: datetime
    ends_at: datetime
    status: AppointmentStatus
    bot_confirmation_status: BotConfirmationStatus
    notes: str | None

    class Config:
        from_attributes = True


class WorkingHourIn(BaseModel):
    weekday: int = Field(ge=0, le=6)
    start_time: time
    end_time: time


class WorkingHourOut(BaseModel):
    id: int
    weekday: int
    start_time: time
    end_time: time

    class Config:
        from_attributes = True


class RetentionItemOut(BaseModel):
    client_id: int
    client_name: str
    reason: str
    suggested_action: str
    score: float


class ModerationCheckIn(BaseModel):
    text: str
    source: ModeratedSource = ModeratedSource.review


class ModerationCheckOut(BaseModel):
    verdict: ModeratedVerdict
    flags: list[str]
    sanitized_suggestion: str | None = None

