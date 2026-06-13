import os
import random
import urllib.parse
from datetime import datetime, timedelta

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

from app.config import settings
from app.models import User, Client, Service, Appointment, AppointmentStatus, UserRole

db_url = settings.database_url

# Фикс для Windows (SSL сертификаты)
if "ssl_ca=/etc/ssl" in db_url and os.name == "nt":
    import certifi
    db_url = db_url.split("?")[0] + "?ssl_ca=" + urllib.parse.quote(certifi.where())

engine = create_engine(db_url)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def seed_data():
    print("Начинаем генерацию масштабных тестовых данных...")
    
    masters_data = [
        {"email": "maria@wavy.com", "name": "Мария (Ноготочки)", "service_title": "Маникюр с покрытием", "price": 1500, "duration": 120},
        {"email": "alex@wavy.com", "name": "Алексей (Барбер)", "service_title": "Мужская стрижка", "price": 1200, "duration": 60},
        {"email": "elena@wavy.com", "name": "Елена (Массаж)", "service_title": "Расслабляющий массаж", "price": 3000, "duration": 90},
        {"email": "ivan@wavy.com", "name": "Иван (Тату)", "service_title": "Мини-татуировка", "price": 5000, "duration": 180},
    ]

    masters = []
    for m in masters_data:
        user = db.query(User).filter(User.email == m["email"]).first()
        if not user:
            user = User(
                email=m["email"],
                password_hash=hash_password("password123"),
                full_name=m["name"],
                role=UserRole.private_person
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            service = Service(
                user_id=user.id,
                title=m["service_title"],
                duration_minutes=m["duration"],
                price=m["price"],
                is_active=True
            )
            db.add(service)
            db.commit()
        masters.append(user)

    client_names = [
        "Анна Смирнова", "Екатерина Иванова", "Дмитрий Петров", "Олег Сидоров", 
        "Виктория Кузнецова", "Максим Попов", "Юлия Соколова", "Артем Лебедев", 
        "Марина Козлова", "Сергей Новиков", "Алиса Морозова", "Денис Волков",
        "Алина Алексеева", "Кирилл Жуков", "Ольга Ильина", "Роман Васильев"
    ]
    
    client_users = []
    for i, name in enumerate(client_names):
        email = f"client_{i}@wavy.com"
        c_user = db.query(User).filter(User.email == email).first()
        if not c_user:
            c_user = User(
                email=email,
                password_hash=hash_password("password123"),
                full_name=name,
                role=UserRole.client
            )
            db.add(c_user)
            db.commit()
            db.refresh(c_user)
        client_users.append(c_user)

    # Очистим старые тестовые записи для чистоты
    for cu in client_users:
        db.query(Appointment).filter(Appointment.client_user_id == cu.id).delete()
    db.commit()

    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    
    for master in masters:
        service = db.query(Service).filter(Service.user_id == master.id).first()
        master_clients = random.sample(client_users, random.randint(8, 12))
        
        for c_user in master_clients:
            lc = db.query(Client).filter(Client.user_id == master.id, Client.email == c_user.email).first()
            if not lc:
                lc = Client(
                    user_id=master.id,
                    full_name=c_user.full_name,
                    email=c_user.email,
                    phone=f"+7999{random.randint(1000000, 9999999)}"
                )
                db.add(lc)
                db.commit()
                db.refresh(lc)
            
            num_appts = random.randint(2, 4)
            for _ in range(num_appts):
                days_offset = random.randint(-20, 15)
                hour = random.randint(9, 18)
                
                starts_at = now + timedelta(days=days_offset)
                starts_at = starts_at.replace(hour=hour)
                ends_at = starts_at + timedelta(minutes=service.duration_minutes)
                
                # Используем только статус confirmed, так как функционал отмены не используется
                status = AppointmentStatus.confirmed

                appt = Appointment(
                    user_id=master.id,
                    client_id=lc.id,
                    client_user_id=c_user.id,
                    service_id=service.id,
                    title=f"{service.title}",
                    starts_at=starts_at,
                    ends_at=ends_at,
                    status=status,
                    notes=random.choice(["", "", "Опаздывает на 5 минут", "Просил позвонить за час", ""])
                )
                db.add(appt)
                
    db.commit()
    print("Готово!")
    print(f"Создано {len(client_users)} уникальных клиентов.")
