from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_client_role
from app.models import Appointment, AppointmentStatus, Review, User, SystemActionLog, SystemConfig
from app.schemas import ReviewCreateIn, ReviewOut

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("/pending", response_model=list[int])
def pending_reviews(user: User = Depends(require_client_role), db: Session = Depends(get_db)):
    # Находим завершенные записи клиента
    appts = db.query(Appointment).filter(
        Appointment.client_user_id == user.id,
        Appointment.status == AppointmentStatus.completed
    ).all()

    # Фильтруем те, на которые уже есть отзывы
    reviewed_ids = [r.appointment_id for r in db.query(Review).filter(Review.client_id == user.id).all()]
    pending = [a.id for a in appts if a.id not in reviewed_ids]
    return pending


@router.post("", response_model=ReviewOut)
def create_review(
    data: ReviewCreateIn,
    user: User = Depends(require_client_role),
    db: Session = Depends(get_db)
):
    # Проверяем существование завершенной записи
    appt = db.query(Appointment).filter(
        Appointment.id == data.appointment_id,
        Appointment.client_user_id == user.id,
        Appointment.status == AppointmentStatus.completed
    ).first()
    if appt is None:
        raise HTTPException(400, "Запись не найдена или не завершена")

    # Проверяем, не оставлен ли отзыв ранее
    existing = db.query(Review).filter(Review.appointment_id == data.appointment_id).first()
    if existing is not None:
        raise HTTPException(400, "Отзыв на эту запись уже оставлен")

    # Создаем отзыв
    review = Review(
        appointment_id=appt.id,
        client_id=user.id,
        master_id=appt.user_id,
        rating=data.rating,
        comment=data.comment.strip() if data.comment else None
    )
    db.add(review)
    db.flush()

    # Загружаем настройки лимитов модератора
    config_warnings_limit = db.query(SystemConfig).filter(SystemConfig.key == "warnings_limit").first()
    config_low_rating_threshold = db.query(SystemConfig).filter(SystemConfig.key == "low_rating_threshold").first()

    warnings_limit = int(config_warnings_limit.value) if config_warnings_limit else 3
    low_rating_threshold = int(config_low_rating_threshold.value) if config_low_rating_threshold else 2

    # Проверяем оценку на предмет нарушения качества услуг
    if data.rating <= low_rating_threshold:
        master = db.query(User).filter(User.id == appt.user_id).first()
        if master:
            master.warning_count += 1
            
            log_details = f"Авто-предупреждение за низкую оценку ({data.rating} звёзд) для записи #{appt.id}."
            if data.comment:
                log_details += f" Комментарий: {data.comment}"
                
            warning_log = SystemActionLog(
                user_id=master.id,
                action="warning",
                details=log_details
            )
            db.add(warning_log)
            
            # Проверяем превышение лимита предупреждений для авто-бана
            if master.warning_count >= warnings_limit:
                master.is_banned = True
                master.ban_reason = f"Автоматическая блокировка за систематические плохие отзывы (превышен лимит предупреждений: {warnings_limit})."
                
                ban_log = SystemActionLog(
                    user_id=master.id,
                    action="ban",
                    details=f"Автоматическая блокировка за превышение лимита предупреждений ({master.warning_count}/{warnings_limit})."
                )
                db.add(ban_log)

    db.commit()
    db.refresh(review)
    return review
