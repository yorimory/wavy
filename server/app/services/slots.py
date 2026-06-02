from __future__ import annotations

from datetime import date, datetime, time, timedelta

from sqlalchemy.orm import Session

from app.models import Appointment, AppointmentStatus, Service, WorkingHours

SLOT_STEP_MINUTES = 30
ACTIVE_STATUSES = (
    AppointmentStatus.draft,
    AppointmentStatus.pending,
    AppointmentStatus.confirmed,
    AppointmentStatus.completed,
)


def _combine(day: date, t: time) -> datetime:
    return datetime.combine(day, t)


def _overlaps(start: datetime, end: datetime, other_start: datetime, other_end: datetime) -> bool:
    return start < other_end and end > other_start


def get_working_window(db: Session, provider_id: int, day: date) -> tuple[datetime, datetime] | None:
    weekday = (day.weekday())  # 0=Mon
    
    # Проверяем, настраивал ли вообще провайдер рабочее время
    total_wh_count = db.query(WorkingHours).filter(WorkingHours.user_id == provider_id).count()
    if total_wh_count == 0:
        # Дефолтный график для новых мастеров: Пн-Пт с 09:00 до 18:00, Сб-Вс — выходные
        if weekday < 5:
            from datetime import time
            return _combine(day, time(9, 0)), _combine(day, time(18, 0))
        return None

    wh = (
        db.query(WorkingHours)
        .filter(WorkingHours.user_id == provider_id, WorkingHours.weekday == weekday)
        .first()
    )
    if wh is None:
        # Если график настроен, но на этот день недели записи нет — значит выходной
        return None
    return _combine(day, wh.start_time), _combine(day, wh.end_time)


def compute_slots_for_day(
    db: Session,
    provider_id: int,
    service: Service,
    day: date,
) -> list[tuple[datetime, datetime]]:
    window = get_working_window(db, provider_id, day)
    if window is None:
        return []

    day_start, day_end = window
    duration = timedelta(minutes=service.duration_minutes)
    step = duration

    day_from = datetime.combine(day, time.min)
    day_to = datetime.combine(day, time.max)
    busy = (
        db.query(Appointment)
        .filter(
            Appointment.user_id == provider_id,
            Appointment.starts_at >= day_from,
            Appointment.starts_at <= day_to,
            Appointment.status.in_(ACTIVE_STATUSES),
        )
        .all()
    )

    slots: list[tuple[datetime, datetime]] = []
    cursor = day_start
    while cursor + duration <= day_end:
        slot_end = cursor + duration
        if not any(_overlaps(cursor, slot_end, a.starts_at, a.ends_at) for a in busy):
            slots.append((cursor, slot_end))
        cursor += step
    return slots


def compute_slots_range(
    db: Session,
    provider_id: int,
    service: Service,
    from_day: date,
    days: int = 14,
) -> dict[date, list[tuple[datetime, datetime]]]:
    result: dict[date, list[tuple[datetime, datetime]]] = {}
    for i in range(days):
        d = from_day + timedelta(days=i)
        day_slots = compute_slots_for_day(db, provider_id, service, d)
        if day_slots:
            result[d] = day_slots
    return result
