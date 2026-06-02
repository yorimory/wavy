from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserRole
from app.schemas import LoginIn, RegisterIn, TokenOut
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == str(data.email)).first():
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")
    user = User(
        email=str(data.email).lower(),
        password_hash=hash_password(data.password),
        full_name=data.full_name or "",
        role=data.role if data.role in (UserRole.private_person, UserRole.client) else UserRole.private_person,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Если зарегистрировался клиент, связываем с его аккаунтом все существующие записи
    if user.role == UserRole.client:
        from app.models import Client, Appointment
        clients = db.query(Client).filter(Client.email == user.email).all()
        if clients:
            client_ids = [c.id for c in clients]
            db.query(Appointment).filter(Appointment.client_id.in_(client_ids)).update(
                {Appointment.client_user_id: user.id}, synchronize_session=False
            )
            db.commit()

    return TokenOut(access_token=create_access_token(user.email))


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == str(data.email).lower()).first()
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный логин или пароль")
    return TokenOut(access_token=create_access_token(user.email))
