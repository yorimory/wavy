import asyncio
import logging
from datetime import datetime, timedelta, timezone, time as dtime
import httpx
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import User, UserRole, Appointment, AppointmentStatus

logger = logging.getLogger(__name__)

async def send_expo_push(token: str, title: str, body: str, path: str = "/calendar"):
    url = "https://exp.host/--/api/v2/push/send"
    payload = {
        "to": token,
        "title": title,
        "body": body,
        "sound": "default",
        "data": {"path": path}
    }
    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"Sending push notification to token: {token} for path: {path}")
            r = await client.post(url, json=payload, timeout=8.0)
            r.raise_for_status()
            logger.info(f"Successfully sent push notification: {r.json()}")
        except Exception as e:
            logger.error(f"Failed to send Expo push to token {token}: {e}")

async def check_and_send_daily_reminders():
    db: Session = SessionLocal()
    try:
        # Часовой пояс Минск/Москва (UTC+3)
        minsk_tz = timezone(timedelta(hours=3))
        now_minsk = datetime.now(minsk_tz)
        current_hm = now_minsk.strftime("%H:%M")
        current_date_str = now_minsk.strftime("%Y-%m-%d")

        # Выбираем всех частных лиц с push-токенами
        users = db.query(User).filter(
            User.role == UserRole.private_person,
            User.expo_push_token.isnot(None)
        ).all()

        for user in users:
            settings = user.settings_json or {}
            notification_time = settings.get("notification_time")
            if not notification_time:
                continue

            # Проверяем совпадение времени и факт отправки сегодня
            if notification_time == current_hm:
                last_reminder_date = settings.get("last_reminder_date")
                if last_reminder_date == current_date_str:
                    # Уже отправляли сегодня
                    continue

                # Вычисляем диапазон сегодняшнего дня для записей
                today_start = datetime.combine(now_minsk.date(), dtime.min)
                today_end = datetime.combine(now_minsk.date(), dtime.max)

                # Выбираем некорректно не отмененные сеансы
                appts = db.query(Appointment).filter(
                    Appointment.user_id == user.id,
                    Appointment.starts_at >= today_start,
                    Appointment.starts_at <= today_end,
                    Appointment.status != AppointmentStatus.cancelled
                ).order_by(Appointment.starts_at).all()

                # Формируем текст сообщения
                if not appts:
                    body = "📅 Расписание на сегодня\n\nУ вас нет запланированных записей. Отличный повод для отдыха! ✨"
                else:
                    appts_text = []
                    for a in appts:
                        t_lbl = a.starts_at.strftime("%H:%M")
                        appts_text.append(f"🕒 {t_lbl} — {a.title}")
                    body = f"📅 У вас запланировано записей: {len(appts)}\n\n" + "\n".join(appts_text) + "\n\nWAVY желает вам хорошего дня! ✨"

                title = "WAVY: Ваше расписание"
                
                # Отправляем push-уведомление
                await send_expo_push(user.expo_push_token, title, body)

                # Сохраняем отметку об отправке
                settings["last_reminder_date"] = current_date_str
                user.settings_json = settings
                db.add(user)
                db.commit()
                logger.info(f"Registered daily notification send for user {user.email}")
    except Exception as exc:
        logger.error(f"Error checking daily reminders: {exc}", exc_info=True)
    finally:
        db.close()

async def reminder_scheduler_loop():
    logger.info("Starting background reminder scheduler loop (1m ticks)")
    while True:
        try:
            await check_and_send_daily_reminders()
        except Exception as e:
            logger.error(f"Error in scheduler tick: {e}", exc_info=True)
        # Ждем 60 секунд
        await asyncio.sleep(60)
