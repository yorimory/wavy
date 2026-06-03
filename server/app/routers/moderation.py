from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app.deps import require_moderator
from app.models import User, UserRole, SystemActionLog, SystemConfig, SupportTicket, Service
from app.schemas import (
    UserOut,
    SystemActionLogOut,
    SystemConfigOut,
    SystemConfigUpdateIn,
    SupportTicketOut,
    SupportTicketReplyIn
)

router = APIRouter(prefix="/moderation", tags=["moderation"])


# ── Сводка пользователей ──────────────────────────────────────────────────
@router.get("/users", response_model=list[UserOut])
def list_users(user: User = Depends(require_moderator), db: Session = Depends(get_db)):
    return db.query(User).order_by(User.id.desc()).all()


@router.post("/users/{user_id}/role", response_model=UserOut)
def change_user_role(
    user_id: int,
    data: dict,  # {"role": "moderator"}
    user: User = Depends(require_moderator),
    db: Session = Depends(get_db)
):
    target = db.query(User).filter(User.id == user_id).first()
    if target is None:
        raise HTTPException(404, "Пользователь не найден")
    new_role = data.get("role")
    if new_role not in ["private_person", "client", "moderator"]:
        raise HTTPException(400, "Некорректная роль")
    target.role = new_role
    db.commit()
    db.refresh(target)
    return target


# ── Выдача ручных предупреждений и банов ──────────────────────────────
@router.post("/users/{user_id}/warning", response_model=UserOut)
def warn_user_manually(
    user_id: int,
    data: dict,  # {"reason": "Текст причины"}
    user: User = Depends(require_moderator),
    db: Session = Depends(get_db)
):
    target = db.query(User).filter(User.id == user_id).first()
    if target is None:
        raise HTTPException(404, "Пользователь не найден")
    reason = data.get("reason", "Нарушение правил площадки").strip()
    
    target.warning_count += 1
    
    log = SystemActionLog(
        user_id=target.id,
        action="manual_warning",
        details=f"Предупреждение от модератора #{user.id}. Причина: {reason}"
    )
    db.add(log)

    # Проверяем авто-бан
    config_warnings_limit = db.query(SystemConfig).filter(SystemConfig.key == "warnings_limit").first()
    warnings_limit = int(config_warnings_limit.value) if config_warnings_limit else 3
    
    if target.warning_count >= warnings_limit:
        target.is_banned = True
        target.ban_reason = f"Автоматическая блокировка: лимит предупреждений превышен ({target.warning_count}/{warnings_limit})."
        
        ban_log = SystemActionLog(
            user_id=target.id,
            action="ban",
            details=f"Автоматическая блокировка за превышение лимита предупреждений ({target.warning_count}/{warnings_limit})."
        )
        db.add(ban_log)
        
    db.commit()
    db.refresh(target)
    return target


@router.post("/users/{user_id}/ban", response_model=UserOut)
def ban_user_manually(
    user_id: int,
    data: dict,  # {"reason": "Текст причины"}
    user: User = Depends(require_moderator),
    db: Session = Depends(get_db)
):
    target = db.query(User).filter(User.id == user_id).first()
    if target is None:
        raise HTTPException(404, "Пользователь не найден")
    reason = data.get("reason", "Нарушение правил платформы").strip()
    
    target.is_banned = True
    target.ban_reason = f"Заблокирован модератором. Причина: {reason}"
    
    log = SystemActionLog(
        user_id=target.id,
        action="manual_ban",
        details=f"Ручная блокировка модератором #{user.id}. Причина: {reason}"
    )
    db.add(log)
    db.commit()
    db.refresh(target)
    return target


@router.post("/users/{user_id}/unban", response_model=UserOut)
def unban_user_manually(
    user_id: int,
    user: User = Depends(require_moderator),
    db: Session = Depends(get_db)
):
    target = db.query(User).filter(User.id == user_id).first()
    if target is None:
        raise HTTPException(404, "Пользователь не найден")
    
    target.is_banned = False
    target.ban_reason = None
    target.warning_count = 0  # Сбрасываем варны при ручном разбане
    
    log = SystemActionLog(
        user_id=target.id,
        action="rollback",
        details=f"Разблокирован модератором #{user.id}."
    )
    db.add(log)
    db.commit()
    db.refresh(target)
    return target


# ── Удаление услуг пользователей ───────────────────────────────────────────
@router.delete("/services/{service_id}", status_code=204)
def delete_service_as_moderator(
    service_id: int,
    user: User = Depends(require_moderator),
    db: Session = Depends(get_db)
):
    svc = db.query(Service).filter(Service.id == service_id).first()
    if svc is None:
        raise HTTPException(404, "Услуга не найдена")
    db.delete(svc)
    db.commit()
    return None


# ── Настройки правил ───────────────────────────────────────────────────────
@router.get("/config", response_model=list[SystemConfigOut])
def get_configs(user: User = Depends(require_moderator), db: Session = Depends(get_db)):
    return db.query(SystemConfig).all()


@router.put("/config/{key}", response_model=SystemConfigOut)
def update_config(
    key: str,
    data: SystemConfigUpdateIn,
    user: User = Depends(require_moderator),
    db: Session = Depends(get_db)
):
    cfg = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    if cfg is None:
        cfg = SystemConfig(key=key, value=data.value)
        db.add(cfg)
    else:
        cfg.value = data.value
    db.commit()
    db.refresh(cfg)
    return cfg


# ── Журнал действий и откат ─────────────────────────────────────────────────
@router.get("/logs", response_model=list[SystemActionLogOut])
def list_logs(user: User = Depends(require_moderator), db: Session = Depends(get_db)):
    return db.query(SystemActionLog).order_by(SystemActionLog.id.desc()).all()


@router.post("/rollback/{log_id}", response_model=SystemActionLogOut)
def rollback_action(
    log_id: int,
    data: dict,  # {"reason": "Извинение"}
    user: User = Depends(require_moderator),
    db: Session = Depends(get_db)
):
    log = db.query(SystemActionLog).filter(SystemActionLog.id == log_id).first()
    if log is None:
        raise HTTPException(404, "Лог не найден")
    if not log.is_active:
        raise HTTPException(400, "Действие уже отменено")
        
    target_user = db.query(User).filter(User.id == log.user_id).first()
    if target_user is None:
        raise HTTPException(404, "Пользователь не найден")
        
    reason = data.get("reason", "Извините, ложное срабатывание автоматической системы.").strip()
    
    if log.action in ["warning", "manual_warning"]:
        target_user.warning_count = max(0, target_user.warning_count - 1)
        log.is_active = False
        
        rollback_log = SystemActionLog(
            user_id=target_user.id,
            action="rollback",
            details=f"Отмена предупреждения модератором #{user.id}. Причина: {reason}",
            is_active=False
        )
        db.add(rollback_log)
        
    elif log.action in ["ban", "manual_ban"]:
        target_user.is_banned = False
        target_user.ban_reason = None
        target_user.warning_count = 0  # Сбрасываем при отмене бана
        log.is_active = False
        
        rollback_log = SystemActionLog(
            user_id=target_user.id,
            action="rollback",
            details=f"Снятие блокировки модератором #{user.id}. Причина: {reason}",
            is_active=False
        )
        db.add(rollback_log)
        
    db.commit()
    db.refresh(log)
    return log


# ── Техподдержка тикеты ────────────────────────────────────────────────────
@router.get("/tickets", response_model=list[SupportTicketOut])
def list_tickets(user: User = Depends(require_moderator), db: Session = Depends(get_db)):
    return db.query(SupportTicket).order_by(SupportTicket.status.desc(), SupportTicket.id.desc()).all()


@router.post("/tickets/{ticket_id}/reply", response_model=SupportTicketOut)
def reply_ticket(
    ticket_id: int,
    data: SupportTicketReplyIn,
    user: User = Depends(require_moderator),
    db: Session = Depends(get_db)
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if ticket is None:
        raise HTTPException(404, "Обращение не найдено")
    
    ticket.reply = data.reply.strip()
    ticket.status = "resolved"
    db.commit()
    db.refresh(ticket)
    return ticket
