from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User, Message
from app.schemas import MessageCreateIn, MessageOut, ContactOut

router = APIRouter(prefix="/messages", tags=["messages"])


@router.post("", response_model=MessageOut)
def send_message(
    data: MessageCreateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if data.receiver_id == user.id:
        raise HTTPException(400, "Нельзя отправить сообщение самому себе")

    # Проверяем, существует ли получатель
    receiver = db.query(User).filter(User.id == data.receiver_id).first()
    if not receiver:
        raise HTTPException(404, "Получатель не найден")

    # Предотвращаем отправку сообщений забаненным пользователям
    if receiver.is_banned:
        raise HTTPException(400, "Нельзя отправить сообщение заблокированному пользователю")

    msg = Message(
        sender_id=user.id,
        receiver_id=data.receiver_id,
        body=data.body.strip(),
        is_read=False
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


@router.get("/chat/{other_user_id}", response_model=list[MessageOut])
def get_chat_history(
    other_user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Находим всю историю сообщений между пользователями
    messages = db.query(Message).filter(
        ((Message.sender_id == user.id) & (Message.receiver_id == other_user_id)) |
        ((Message.sender_id == other_user_id) & (Message.receiver_id == user.id))
    ).order_by(Message.created_at.asc()).all()

    # Помечаем сообщения как прочитанные, если они отправлены собеседником текущему пользователю
    unread = [m for m in messages if m.sender_id == other_user_id and not m.is_read]
    if unread:
        for m in unread:
            m.is_read = True
        db.commit()

    return messages


@router.get("/contacts", response_model=list[ContactOut])
def get_contacts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Находим всех, с кем переписывался текущий пользователь
    sent_partners = db.query(Message.receiver_id).filter(Message.sender_id == user.id).distinct().all()
    recv_partners = db.query(Message.sender_id).filter(Message.receiver_id == user.id).distinct().all()
    partner_ids = set([p[0] for p in sent_partners] + [p[0] for p in recv_partners])

    contacts_list = []
    for pid in partner_ids:
        partner = db.query(User).filter(User.id == pid).first()
        if not partner:
            continue

        # Находим последнее сообщение
        last_msg = db.query(Message).filter(
            ((Message.sender_id == user.id) & (Message.receiver_id == pid)) |
            ((Message.sender_id == pid) & (Message.receiver_id == user.id))
        ).order_by(Message.id.desc()).first()

        unread_count = db.query(Message).filter(
            Message.sender_id == pid,
            Message.receiver_id == user.id,
            Message.is_read == False
        ).count()

        contacts_list.append({
            "partner": partner,
            "unread_count": unread_count,
            "last_msg_id": last_msg.id if last_msg else 0
        })

    # Сортируем контакты по активности (id последнего сообщения по убыванию)
    contacts_list.sort(key=lambda x: x["last_msg_id"], reverse=True)

    result = []
    for c in contacts_list:
        p = c["partner"]
        result.append(ContactOut(
            id=p.id,
            full_name=p.full_name,
            email=p.email,
            role=p.role,
            unread_count=c["unread_count"]
        ))

    return result
