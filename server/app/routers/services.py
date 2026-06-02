from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_private_person
from app.models import Service, User
from app.schemas import ServiceCreateIn, ServiceOut, ServiceUpdateIn

router = APIRouter(prefix="/services", tags=["services"])


@router.get("", response_model=list[ServiceOut])
def list_services(user: User = Depends(require_private_person), db: Session = Depends(get_db)):
    return (
        db.query(Service)
        .filter(Service.user_id == user.id)
        .order_by(Service.is_active.desc(), Service.title.asc())
        .all()
    )


@router.post("", response_model=ServiceOut)
def create_service(
    data: ServiceCreateIn,
    user: User = Depends(require_private_person),
    db: Session = Depends(get_db),
):
    s = Service(
        user_id=user.id,
        title=data.title.strip(),
        description=data.description,
        duration_minutes=data.duration_minutes,
        price=data.price,
        is_active=data.is_active,
        image_url=data.image_url.strip() if data.image_url else None,
        category=data.category.strip() if data.category else None,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.patch("/{service_id}", response_model=ServiceOut)
def update_service(
    service_id: int,
    data: ServiceUpdateIn,
    user: User = Depends(require_private_person),
    db: Session = Depends(get_db),
):
    s = db.query(Service).filter(Service.id == service_id, Service.user_id == user.id).first()
    if s is None:
        raise HTTPException(404, "Услуга не найдена")
    if data.title is not None:
        s.title = data.title.strip()
    if data.description is not None:
        s.description = data.description
    if data.duration_minutes is not None:
        s.duration_minutes = data.duration_minutes
    if data.price is not None:
        s.price = data.price
    if data.is_active is not None:
        s.is_active = data.is_active
    if data.image_url is not None:
        s.image_url = data.image_url.strip() if data.image_url else None
    if data.category is not None:
        s.category = data.category.strip() if data.category else None
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{service_id}", status_code=204)
def delete_service(
    service_id: int,
    user: User = Depends(require_private_person),
    db: Session = Depends(get_db),
):
    s = db.query(Service).filter(Service.id == service_id, Service.user_id == user.id).first()
    if s is None:
        raise HTTPException(404, "Услуга не найдена")
    db.delete(s)
    db.commit()
    return None
