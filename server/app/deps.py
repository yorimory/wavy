from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import SubscriptionTier, User, UserRole
from app.security import decode_token

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Не авторизован")
    sub = decode_token(creds.credentials)
    if sub is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный токен")
    user = db.query(User).filter(User.email == sub).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь не найден")
    return user


def require_private_person(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.private_person:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступно только для частного лица",
        )
    return user


def require_client_role(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.client:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступно только для клиента",
        )
    return user


def require_premium(user: User = Depends(require_private_person)) -> User:
    if user.subscription_tier != SubscriptionTier.premium:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Доступно только в тарифе Premium (9.99 BYN/мес)",
        )
    return user


def is_premium(user: User) -> bool:
    return user.subscription_tier == SubscriptionTier.premium
