from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User, SupportTicket
from app.schemas import SupportTicketCreateIn, SupportTicketOut

router = APIRouter(prefix="/support", tags=["support"])


@router.get("/my-tickets", response_model=list[SupportTicketOut])
def get_my_tickets(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(SupportTicket).filter(SupportTicket.user_id == user.id).order_by(SupportTicket.id.desc()).all()


@router.post("/tickets", response_model=SupportTicketOut)
def create_ticket(
    data: SupportTicketCreateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = SupportTicket(
        user_id=user.id,
        subject=data.subject.strip(),
        message=data.message.strip(),
        status="open"
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket
