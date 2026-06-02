from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Appointment, BotConfirmationStatus

router = APIRouter(prefix="/integrations/telegram", tags=["integrations"])


class BotConfirmIn(BaseModel):
    appointment_id: int
    secret: str
    status: str  # confirmed | declined


@router.post("/appointment-status")
def bot_confirm(data: BotConfirmIn, db: Session = Depends(get_db)):
    """Заглушка под Telegram-бота: в проде проверяйте secret/HMAC и user_id."""
    a = db.query(Appointment).filter(Appointment.id == data.appointment_id).first()
    if a is None:
        raise HTTPException(404, "Запись не найдена")
    if data.status == "confirmed":
        a.bot_confirmation_status = BotConfirmationStatus.confirmed
    elif data.status == "declined":
        a.bot_confirmation_status = BotConfirmationStatus.declined
    else:
        raise HTTPException(400, "status должен быть confirmed или declined")
    db.commit()
    return {"ok": True, "appointment_id": a.id, "bot_confirmation_status": a.bot_confirmation_status.value}
