from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.models import Appointment

from app.config import settings
from app.database import get_db
from app.deps import require_private_person
from app.models import Client, ClientHistory, ClientTag, SubscriptionTier, User
from app.schemas import ClientCreateIn, ClientOut, ClientUpdateIn, HistoryCreateIn, HistoryOut

router = APIRouter(prefix="/clients", tags=["clients"])


def _tags_for(client: Client) -> list[str]:
    return [t.tag for t in client.tags]


def _to_out(c: Client) -> ClientOut:
    return ClientOut(
        id=c.id,
        full_name=c.full_name,
        phone=c.phone,
        email=c.email,
        notes=c.notes,
        last_visit_at=c.last_visit_at,
        tags=_tags_for(c),
        created_at=c.created_at,
    )


def _replace_tags(db: Session, client: Client, tags: list[str] | None):
    if tags is None:
        return
    client.tags.clear()
    for raw in tags:
        t = raw.strip()
        if not t:
            continue
        client.tags.append(ClientTag(tag=t[:64]))


@router.get("", response_model=list[ClientOut])
def list_clients(
    q: str | None = None,
    tag: str | None = None,
    booked_only: bool = Query(default=True),
    user: User = Depends(require_private_person),
    db: Session = Depends(get_db),
):
    query = db.query(Client).filter(Client.user_id == user.id)
    if booked_only:
        query = query.join(Appointment, Appointment.client_id == Client.id).filter(
            Appointment.user_id == user.id
        ).distinct()
    if tag:
        query = query.join(ClientTag, ClientTag.client_id == Client.id).filter(ClientTag.tag == tag)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (Client.full_name.like(like))
            | (Client.phone.like(like))
            | (Client.email.like(like))
            | (Client.notes.like(like))
        )
    if tag or q:
        query = query.distinct()
    items = query.order_by(Client.updated_at.desc()).all()
    return [_to_out(c) for c in items]


@router.post("", response_model=ClientOut)
def create_client(data: ClientCreateIn, user: User = Depends(require_private_person), db: Session = Depends(get_db)):
    count = db.query(Client).filter(Client.user_id == user.id).count()
    if user.subscription_tier == SubscriptionTier.free and count >= settings.free_tier_max_clients:
        raise HTTPException(
            status_code=403,
            detail=f"Лимит тарифа Free: не более {settings.free_tier_max_clients} клиентов. Оформите Premium.",
        )
    c = Client(
        user_id=user.id,
        full_name=data.full_name,
        phone=data.phone,
        email=str(data.email).lower() if data.email else None,
        notes=data.notes,
    )
    db.add(c)
    db.flush()
    _replace_tags(db, c, data.tags)
    db.add(
        ClientHistory(
            client_id=c.id,
            event_type="created",
            body="Карточка клиента создана",
        )
    )
    db.commit()
    db.refresh(c)
    return _to_out(c)


@router.get("/{client_id}", response_model=ClientOut)
def get_client(client_id: int, user: User = Depends(require_private_person), db: Session = Depends(get_db)):
    c = db.query(Client).filter(Client.id == client_id, Client.user_id == user.id).first()
    if c is None:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    return _to_out(c)


@router.patch("/{client_id}", response_model=ClientOut)
def update_client(
    client_id: int,
    data: ClientUpdateIn,
    user: User = Depends(require_private_person),
    db: Session = Depends(get_db),
):
    c = db.query(Client).filter(Client.id == client_id, Client.user_id == user.id).first()
    if c is None:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    if data.full_name is not None:
        c.full_name = data.full_name
    if data.phone is not None:
        c.phone = data.phone
    if data.email is not None:
        c.email = str(data.email).lower()
    if data.notes is not None:
        c.notes = data.notes
    if data.last_visit_at is not None:
        c.last_visit_at = data.last_visit_at
    _replace_tags(db, c, data.tags)
    db.add(ClientHistory(client_id=c.id, event_type="updated", body="Данные карточки обновлены"))
    db.commit()
    db.refresh(c)
    return _to_out(c)


@router.delete("/{client_id}", status_code=204)
def delete_client(client_id: int, user: User = Depends(require_private_person), db: Session = Depends(get_db)):
    c = db.query(Client).filter(Client.id == client_id, Client.user_id == user.id).first()
    if c is None:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    db.delete(c)
    db.commit()
    return None


@router.get("/{client_id}/history", response_model=list[HistoryOut])
def history(client_id: int, user: User = Depends(require_private_person), db: Session = Depends(get_db)):
    c = db.query(Client).filter(Client.id == client_id, Client.user_id == user.id).first()
    if c is None:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    rows = (
        db.query(ClientHistory)
        .filter(ClientHistory.client_id == client_id)
        .order_by(ClientHistory.created_at.desc())
        .limit(200)
        .all()
    )
    return rows


@router.post("/{client_id}/history", response_model=HistoryOut)
def add_history(
    client_id: int,
    data: HistoryCreateIn,
    user: User = Depends(require_private_person),
    db: Session = Depends(get_db),
):
    c = db.query(Client).filter(Client.id == client_id, Client.user_id == user.id).first()
    if c is None:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    h = ClientHistory(client_id=c.id, event_type=data.event_type, body=data.body, meta_json=data.meta_json)
    db.add(h)
    db.commit()
    db.refresh(h)
    return h
