from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from statistics import mean

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Appointment, AppointmentStatus, Client


@dataclass
class RetentionSuggestion:
    client_id: int
    client_name: str
    reason: str
    suggested_action: str
    score: float


def _aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _visit_dates_for_client(db: Session, client_id: int) -> list[datetime]:
    rows = (
        db.execute(
            select(Appointment.starts_at)
            .where(
                Appointment.client_id == client_id,
                Appointment.status.in_([AppointmentStatus.completed, AppointmentStatus.confirmed]),
            )
            .order_by(Appointment.starts_at.asc())
        )
        .scalars()
        .all()
    )
    return [_aware(r) for r in rows if r is not None]


def compute_retention(db: Session, user_id: int, limit: int = 20) -> list[RetentionSuggestion]:
    clients = db.execute(select(Client).where(Client.user_id == user_id)).scalars().all()
    now = datetime.now(timezone.utc)
    out: list[RetentionSuggestion] = []

    for c in clients:
        dates = _visit_dates_for_client(db, c.id)
        if c.last_visit_at:
            last = _aware(c.last_visit_at)
        elif dates:
            last = dates[-1]
        else:
            continue

        if len(dates) >= 2:
            deltas = []
            for i in range(1, len(dates)):
                d = (dates[i] - dates[i - 1]).days
                if d >= 0:
                    deltas.append(d)
            cycle = mean(deltas) if deltas else 30.0
        else:
            cycle = 30.0

        expected_next = last + timedelta(days=float(cycle))
        overdue_days = (now - expected_next).days

        if overdue_days < -2:
            continue

        score = min(100.0, max(0.0, 50.0 + overdue_days * 3.0 + (10.0 if len(dates) >= 3 else 0.0)))
        reason = (
            f"Средний интервал визитов ~{cycle:.0f} дн.; последний визит {last.date()}; "
            f"ожидаемая дата возврата {expected_next.date()}."
        )
        action = "Отправьте персональное напоминание (SMS/Telegram) и предложите удобное окно записи."
        out.append(RetentionSuggestion(c.id, c.full_name, reason, action, score))

    out.sort(key=lambda x: x.score, reverse=True)
    return out[:limit]
