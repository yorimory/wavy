from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_premium
from app.models import ModeratedContent, ModeratedVerdict, User
from app.schemas import ModerationCheckIn, ModerationCheckOut, RetentionItemOut
from app.services.moderation import moderate_text
from app.services.retention import compute_retention

router = APIRouter(tags=["intelligence"])


@router.get("/recommendations/retention", response_model=list[RetentionItemOut])
def retention(user: User = Depends(require_premium), db: Session = Depends(get_db)):
    items = compute_retention(db, user.id)
    return [
        RetentionItemOut(
            client_id=i.client_id,
            client_name=i.client_name,
            reason=i.reason,
            suggested_action=i.suggested_action,
            score=i.score,
        )
        for i in items
    ]


@router.post("/moderation/check", response_model=ModerationCheckOut)
def moderation_check(
    data: ModerationCheckIn,
    user: User = Depends(require_premium),
    db: Session = Depends(get_db),
):
    if not user.moderation_enabled:
        return ModerationCheckOut(
            verdict=ModeratedVerdict.clean,
            flags=["moderation_disabled"],
            sanitized_suggestion=None,
        )

    res = moderate_text(data.text, user.moderation_strictness)
    db.add(
        ModeratedContent(
            user_id=user.id,
            source=data.source,
            original_text=data.text,
            verdict=res.verdict,
            details_json={"flags": res.flags},
        )
    )
    db.commit()
    return ModerationCheckOut(verdict=res.verdict, flags=res.flags, sanitized_suggestion=res.sanitized_suggestion)
