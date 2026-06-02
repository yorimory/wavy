from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user, require_private_person
from app.models import Appointment, AppointmentStatus, Client, Service, User, UserRole
from app.schemas import AppointmentCreateIn, AppointmentOut, AppointmentUpdateIn

router = APIRouter(prefix="/appointments", tags=["appointments"])


def _to_out(a: Appointment, db: Session | None = None) -> AppointmentOut:
    provider_name = None
    service_title = None
    if a.user:
        provider_name = a.user.full_name or a.user.email
    elif db is not None:
        u = db.query(User).filter(User.id == a.user_id).first()
        if u:
            provider_name = u.full_name or u.email
    if a.service:
        service_title = a.service.title
    return AppointmentOut(
        id=a.id,
        client_id=a.client_id,
        client_user_id=a.client_user_id,
        service_id=a.service_id,
        provider_id=a.user_id,
        provider_name=provider_name,
        service_title=service_title,
        title=a.title,
        starts_at=a.starts_at,
        ends_at=a.ends_at,
        status=a.status,
        bot_confirmation_status=a.bot_confirmation_status,
        notes=a.notes,
    )


def _touch_client_last_visit(db: Session, client_id: int | None, when: datetime):
    if client_id is None:
        return
    c = db.query(Client).filter(Client.id == client_id).first()
    if c and (c.last_visit_at is None or when > c.last_visit_at):
        c.last_visit_at = when


def _resolve_client_user_id(db: Session, client_id: int | None) -> int | None:
    if not client_id:
        return None
    c = db.query(Client).filter(Client.id == client_id).first()
    if c is None or not c.email:
        return None
    linked = (
        db.query(User)
        .filter(User.email == c.email.lower(), User.role == UserRole.client)
        .first()
    )
    return linked.id if linked else None


# ── Список записей провайдера ────────────────────────────────────────────────
def _naive(dt: datetime) -> datetime:
    """Убираем timezone-info перед записью в БД (SQLite хранит naive datetimes)."""
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt

@router.get("", response_model=list[AppointmentOut])
def list_appts(
    from_ts: datetime | None = None,
    to_ts: datetime | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Провайдер видит свои записи. Клиент — через /client."""
    if user.role == UserRole.client:
        q = (
            db.query(Appointment)
            .options(joinedload(Appointment.user), joinedload(Appointment.service))
            .filter(Appointment.client_user_id == user.id)
        )
    else:
        q = (
            db.query(Appointment)
            .options(joinedload(Appointment.service))
            .filter(Appointment.user_id == user.id)
        )
    if from_ts is not None:
        q = q.filter(Appointment.starts_at >= from_ts)
    if to_ts is not None:
        q = q.filter(Appointment.starts_at <= to_ts)
    items = q.order_by(Appointment.starts_at.asc()).limit(500).all()
    return [_to_out(a, db) for a in items]


# ── Список записей клиента ───────────────────────────────────────────────────
@router.get("/client", response_model=list[AppointmentOut])
def list_client_appts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Только для роли client: все записи где client_user_id == user.id."""
    if user.role != UserRole.client:
        raise HTTPException(403, "Недоступно")
    items = (
        db.query(Appointment)
        .options(joinedload(Appointment.user), joinedload(Appointment.service))
        .filter(Appointment.client_user_id == user.id)
        .order_by(Appointment.starts_at.asc())
        .limit(500)
        .all()
    )
    return [_to_out(a, db) for a in items]


# ── Создание записи провайдером ──────────────────────────────────────────────
@router.post("", response_model=AppointmentOut)
def create_appt(
    data: AppointmentCreateIn,
    user: User = Depends(require_private_person),
    db: Session = Depends(get_db),
):
    if data.client_id:
        c = db.query(Client).filter(Client.id == data.client_id, Client.user_id == user.id).first()
        if c is None:
            raise HTTPException(400, "Клиент не найден")
    if data.service_id:
        s = db.query(Service).filter(Service.id == data.service_id, Service.user_id == user.id).first()
        if s is None:
            raise HTTPException(400, "Услуга не найдена")
    client_user_id = _resolve_client_user_id(db, data.client_id)
    title = data.title
    ends_at = data.ends_at
    if data.service_id and (not data.title or data.title == "Запись"):
        svc = db.query(Service).filter(Service.id == data.service_id).first()
        if svc:
            title = svc.title
            if ends_at <= data.starts_at:
                ends_at = data.starts_at + timedelta(minutes=svc.duration_minutes)
    starts_at_naive = _naive(data.starts_at)
    ends_at_naive = _naive(ends_at)
    a = Appointment(
        user_id=user.id,
        client_id=data.client_id,
        client_user_id=client_user_id,
        service_id=data.service_id,
        title=title,
        starts_at=starts_at_naive,
        ends_at=ends_at_naive,
        # Автоматически подтверждаем — клиент сразу видит запись
        status=AppointmentStatus.confirmed,
        notes=data.notes,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return _to_out(a, db)


# ── Редактирование записи провайдером ───────────────────────────────────────
@router.patch("/{appt_id}", response_model=AppointmentOut)
def update_appt(
    appt_id: int,
    data: AppointmentUpdateIn,
    user: User = Depends(require_private_person),
    db: Session = Depends(get_db),
):
    a = db.query(Appointment).filter(Appointment.id == appt_id, Appointment.user_id == user.id).first()
    if a is None:
        raise HTTPException(404, "Запись не найдена")
    if data.client_id is not None:
        if data.client_id:
            c = db.query(Client).filter(Client.id == data.client_id, Client.user_id == user.id).first()
            if c is None:
                raise HTTPException(400, "Клиент не найден")
        a.client_id = data.client_id
        a.client_user_id = _resolve_client_user_id(db, data.client_id)
    if data.service_id is not None:
        if data.service_id:
            s = db.query(Service).filter(Service.id == data.service_id, Service.user_id == user.id).first()
            if s is None:
                raise HTTPException(400, "Услуга не найдена")
        a.service_id = data.service_id
    if data.title is not None:
        a.title = data.title
    if data.starts_at is not None:
        a.starts_at = _naive(data.starts_at)
    if data.ends_at is not None:
        a.ends_at = _naive(data.ends_at)
    if data.notes is not None:
        a.notes = data.notes
    if data.bot_confirmation_status is not None:
        a.bot_confirmation_status = data.bot_confirmation_status
    if data.status is not None:
        a.status = data.status
        if data.status == AppointmentStatus.completed and a.client_id:
            end = data.ends_at or a.ends_at
            _touch_client_last_visit(db, a.client_id, end)
    db.commit()
    db.refresh(a)
    return _to_out(a, db)


# ── Удаление записи ─────────────────────────────────────────────────────────
@router.delete("/{appt_id}", status_code=204)
def delete_appt(
    appt_id: int,
    user: User = Depends(require_private_person),
    db: Session = Depends(get_db),
):
    a = db.query(Appointment).filter(Appointment.id == appt_id, Appointment.user_id == user.id).first()
    if a is None:
        raise HTTPException(404, "Запись не найдена")
    db.delete(a)
    db.commit()
    return None
