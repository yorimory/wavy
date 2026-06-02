from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_client_role
from app.models import Appointment, AppointmentStatus, Service, User, UserRole
from app.models import Client
from app.schemas import AppointmentOut, CatalogServiceOut, ClientBookingIn, DaySlotsOut, ProviderOut, ServiceOut, SlotOut
from app.services.slots import compute_slots_for_day, compute_slots_range

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/providers", response_model=list[ProviderOut])
def list_providers(q: str | None = None, db: Session = Depends(get_db)):
    subq = (
        db.query(Service.user_id, func.count(Service.id).label("cnt"))
        .filter(Service.is_active.is_(True))
        .group_by(Service.user_id)
        .subquery()
    )
    query = (
        db.query(User, subq.c.cnt)
        .join(subq, User.id == subq.c.user_id)
        .filter(User.role == UserRole.private_person)
    )
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(User.full_name.like(like))
    rows = query.order_by(User.full_name.asc()).limit(100).all()
    return [
        ProviderOut(id=u.id, full_name=u.full_name or u.email, services_count=int(cnt or 0))
        for u, cnt in rows
    ]


@router.get("/providers/{provider_id}/services", response_model=list[ServiceOut])
def provider_services(provider_id: int, db: Session = Depends(get_db)):
    provider = (
        db.query(User)
        .filter(User.id == provider_id, User.role == UserRole.private_person)
        .first()
    )
    if provider is None:
        raise HTTPException(404, "Специалист не найден")
    return (
        db.query(Service)
        .filter(Service.user_id == provider_id, Service.is_active.is_(True))
        .order_by(Service.title.asc())
        .all()
    )


@router.get("/services", response_model=list[CatalogServiceOut])
def search_services(q: str | None = None, db: Session = Depends(get_db)):
    query = (
        db.query(Service, User)
        .join(User, Service.user_id == User.id)
        .filter(Service.is_active.is_(True), User.role == UserRole.private_person)
    )
    if q:
        like = f"%{q.strip()}%"
        query = query.filter((Service.title.like(like)) | (Service.description.like(like)) | (User.full_name.like(like)))
    rows = query.order_by(Service.title.asc()).limit(100).all()
    return [
        CatalogServiceOut(
            id=s.id,
            title=s.title,
            description=s.description,
            duration_minutes=s.duration_minutes,
            price=s.price,
            provider_id=u.id,
            provider_name=u.full_name or u.email,
            image_url=s.image_url,
            category=s.category,
        )
        for s, u in rows
    ]


@router.get("/providers/{provider_id}/slots", response_model=list[DaySlotsOut])
def provider_slots(
    provider_id: int,
    service_id: int = Query(...),
    from_date: date | None = None,
    days: int = Query(default=14, ge=1, le=30),
    db: Session = Depends(get_db),
):
    provider = (
        db.query(User)
        .filter(User.id == provider_id, User.role == UserRole.private_person)
        .first()
    )
    if provider is None:
        raise HTTPException(404, "Специалист не найден")
    service = (
        db.query(Service)
        .filter(Service.id == service_id, Service.user_id == provider_id, Service.is_active.is_(True))
        .first()
    )
    if service is None:
        raise HTTPException(404, "Услуга не найдена")

    start = from_date or date.today()
    raw = compute_slots_range(db, provider_id, service, start, days)
    return [
        DaySlotsOut(
            date=d,
            slots=[SlotOut(starts_at=a, ends_at=b) for a, b in slots],
        )
        for d, slots in sorted(raw.items())
    ]


@router.post("/book", response_model=AppointmentOut)
def book_appointment(
    data: ClientBookingIn,
    client_user: User = Depends(require_client_role),
    db: Session = Depends(get_db),
):
    provider = (
        db.query(User)
        .filter(User.id == data.provider_id, User.role == UserRole.private_person)
        .first()
    )
    if provider is None:
        raise HTTPException(404, "Специалист не найден")
    service = (
        db.query(Service)
        .filter(
            Service.id == data.service_id,
            Service.user_id == data.provider_id,
            Service.is_active.is_(True),
        )
        .first()
    )
    if service is None:
        raise HTTPException(404, "Услуга не найдена")

    day = data.starts_at.date()
    valid = compute_slots_for_day(db, provider.id, service, day)
    ends_at = data.starts_at + timedelta(minutes=service.duration_minutes)
    # Убираем timezone перед записью (SQLite хранит naive datetimes)
    def _naive(dt: datetime) -> datetime:
        if dt.tzinfo is not None:
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    starts_naive = _naive(data.starts_at)
    ends_naive = _naive(ends_at)
    ok = False
    for s, e in valid:
        if abs((s - starts_naive).total_seconds()) < 60 and abs((e - ends_naive).total_seconds()) < 60:
            ok = True
            break
    if not ok:
        raise HTTPException(400, "Выбранное время недоступно")

    crm_client = (
        db.query(Client)
        .filter(Client.user_id == provider.id, Client.email == client_user.email.lower())
        .first()
    )
    if crm_client is None:
        crm_client = Client(
            user_id=provider.id,
            full_name=client_user.full_name or client_user.email,
            email=client_user.email.lower(),
        )
        db.add(crm_client)
        db.flush()

    appt = Appointment(
        user_id=provider.id,
        client_id=crm_client.id,
        client_user_id=client_user.id,
        service_id=service.id,
        title=service.title,
        starts_at=starts_naive,
        ends_at=ends_naive,
        status=AppointmentStatus.confirmed,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return AppointmentOut(
        id=appt.id,
        client_id=appt.client_id,
        client_user_id=appt.client_user_id,
        service_id=appt.service_id,
        provider_id=provider.id,
        provider_name=provider.full_name or provider.email,
        service_title=service.title,
        title=appt.title,
        starts_at=appt.starts_at,
        ends_at=appt.ends_at,
        status=appt.status,
        bot_confirmation_status=appt.bot_confirmation_status,
        notes=appt.notes,
    )
