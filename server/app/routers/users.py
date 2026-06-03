from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
import os
import uuid
import shutil

from app.config import settings
from app.database import get_db
from app.deps import get_current_user, require_private_person
from app.models import SubscriptionTier, User, WorkingHours
from app.schemas import PushTokenIn, UserOut, UserPatchIn, WorkingHourIn, WorkingHourOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def patch_me(data: UserPatchIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.phone is not None:
        user.phone = data.phone
    if data.address is not None:
        user.address = data.address
    if data.avatar_url is not None:
        user.avatar_url = data.avatar_url
    if data.moderation_enabled is not None:
        user.moderation_enabled = data.moderation_enabled
    if data.moderation_strictness is not None:
        user.moderation_strictness = data.moderation_strictness
    if data.settings_json is not None:
        user.settings_json = data.settings_json
    db.commit()
    db.refresh(user)
    return user


@router.post("/me/avatar", response_model=UserOut)
def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    os.makedirs("static/avatars", exist_ok=True)
    ext = os.path.splitext(file.filename)[1] or ".png"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join("static/avatars", filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    user.avatar_url = f"/static/avatars/{filename}"
    db.commit()
    db.refresh(user)
    return user


@router.post("/me/push-token", response_model=UserOut)
def push_token(data: PushTokenIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.expo_push_token = data.expo_push_token
    db.commit()
    db.refresh(user)
    return user


@router.get("/me/working-hours", response_model=list[WorkingHourOut])
def get_wh(user: User = Depends(require_private_person), db: Session = Depends(get_db)):
    rows = db.query(WorkingHours).filter(WorkingHours.user_id == user.id).order_by(WorkingHours.weekday).all()
    return rows


@router.put("/me/working-hours", response_model=list[WorkingHourOut])
def put_wh(items: list[WorkingHourIn], user: User = Depends(require_private_person), db: Session = Depends(get_db)):
    db.query(WorkingHours).filter(WorkingHours.user_id == user.id).delete()
    for it in items:
        db.add(
            WorkingHours(
                user_id=user.id,
                weekday=it.weekday,
                start_time=it.start_time,
                end_time=it.end_time,
            )
        )
    db.commit()
    return db.query(WorkingHours).filter(WorkingHours.user_id == user.id).order_by(WorkingHours.weekday).all()


@router.post("/me/dev-set-tier", response_model=UserOut)
def dev_set_tier(tier: SubscriptionTier, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Только для разработки: переключение тарифа без платёжного шлюза BYN."""
    if not settings.dev_mode:
        raise HTTPException(404, "Not found")
    user.subscription_tier = tier
    db.commit()
    db.refresh(user)
    return user
